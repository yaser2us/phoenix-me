import { logger } from '../utils/logger.js';

/**
 * Follow-up Handler for Phase 4 Checkpoint 3
 * Provides sophisticated follow-up question recognition and handling with:
 * - Context-aware follow-up detection
 * - Query expansion based on previous context
 * - Temporal reference resolution
 * - Action continuation patterns
 * - Ambiguity resolution through context
 */
export class FollowupHandler {
  constructor() {
    // Follow-up patterns for different types of questions
    this.followupPatterns = new Map([
      ['temporal', {
        patterns: [
          /what about (tomorrow|yesterday|next \w+|last \w+)/i,
          /and (tomorrow|yesterday|next \w+|last \w+)\?/i,
          /(tomorrow|yesterday|next \w+|last \w+) too\?/i,
          /how about (tomorrow|yesterday|next \w+|last \w+)/i
        ],
        expansion: (match, context) => this.expandTemporalFollowup(match, context),
        confidence: 0.9
      }],
      ['location', {
        patterns: [
          /what about (there|here|that place)/i,
          /and (there|here|that place)\?/i,
          /(there|here|that place) too\?/i,
          /how about (there|here|that place)/i,
          /what about in (\w+(?:\s+\w+)*)/i
        ],
        expansion: (match, context) => this.expandLocationFollowup(match, context),
        confidence: 0.85
      }],
      ['action_continuation', {
        patterns: [
          /what about (\w+(?:\s+\w+)*)\?/i,
          /and (\w+(?:\s+\w+)*)\?/i,
          /how about (\w+(?:\s+\w+)*)\?/i,
          /also (\w+(?:\s+\w+)*)\?/i,
          /(\w+(?:\s+\w+)*) too\?/i
        ],
        expansion: (match, context) => this.expandActionFollowup(match, context),
        confidence: 0.80
      }],
      ['repetition', {
        patterns: [
          /again\?/i,
          /once more\?/i,
          /repeat that\?/i,
          /same thing\?/i,
          /do it again/i
        ],
        expansion: (match, context) => this.expandRepetitionFollowup(match, context),
        confidence: 0.95
      }],
      ['elaboration', {
        patterns: [
          /more details?\?/i,
          /tell me more/i,
          /what else\?/i,
          /anything else\?/i,
          /more information/i
        ],
        expansion: (match, context) => this.expandElaborationFollowup(match, context),
        confidence: 0.75
      }],
      ['comparison', {
        patterns: [
          /compared to (\w+(?:\s+\w+)*)/i,
          /versus (\w+(?:\s+\w+)*)/i,
          /vs (\w+(?:\s+\w+)*)/i,
          /how does it compare/i,
          /difference between/i
        ],
        expansion: (match, context) => this.expandComparisonFollowup(match, context),
        confidence: 0.80
      }]
    ]);

    // Context requirements for different follow-up types
    this.contextRequirements = new Map([
      ['temporal', ['lastAction', 'location']],
      ['location', ['lastAction']],
      ['action_continuation', ['location']],
      ['repetition', ['lastAction', 'location']],
      ['elaboration', ['lastAction', 'location']],
      ['comparison', ['lastAction']]
    ]);

    // Current context state
    this.currentContext = {
      lastAction: null,
      location: null,
      timeframe: null,
      parameters: new Map(),
      conversationHistory: [],
      lastQuery: null,
      lastResponse: null
    };

    this.initialized = true;
  }

  /**
   * Set context for follow-up handling
   * @param {Object} context - Context information
   * @returns {Promise<void>}
   */
  async setContext(context) {
    try {
      // Update current context with provided information
      Object.assign(this.currentContext, context);
      
      // Store in conversation history
      this.currentContext.conversationHistory.push({
        timestamp: new Date().toISOString(),
        context: { ...context }
      });

      // Limit history to last 10 entries
      if (this.currentContext.conversationHistory.length > 10) {
        this.currentContext.conversationHistory = this.currentContext.conversationHistory.slice(-10);
      }

      logger.debug('Follow-up context updated', { 
        lastAction: this.currentContext.lastAction,
        location: this.currentContext.location 
      });

    } catch (error) {
      logger.error('Failed to set follow-up context', { error: error.message });
      throw error;
    }
  }

  /**
   * Handle follow-up question with context expansion
   * @param {string} input - User follow-up input
   * @param {Object} additionalContext - Additional context if available
   * @returns {Object} Expanded follow-up result
   */
  async handleFollowup(input, additionalContext = {}) {
    try {
      logger.debug('Handling follow-up question', { input });

      const startTime = Date.now();

      // Merge additional context
      const workingContext = { ...this.currentContext, ...additionalContext };

      // Detect follow-up pattern
      const detectionResult = await this.detectFollowupPattern(input);
      
      if (!detectionResult.isFollowup) {
        return {
          isFollowup: false,
          originalQuery: input,
          expandedQuery: input,
          confidence: 0,
          reason: 'No follow-up pattern detected',
          processingTime: Date.now() - startTime
        };
      }

      // Validate context availability
      const contextValidation = this.validateContextForFollowup(
        detectionResult.type, 
        workingContext
      );

      if (!contextValidation.valid) {
        return {
          isFollowup: true,
          originalQuery: input,
          expandedQuery: input,
          confidence: 0.3,
          type: detectionResult.type,
          reason: `Missing required context: ${contextValidation.missing.join(', ')}`,
          requiresClarification: true,
          missingContext: contextValidation.missing,
          processingTime: Date.now() - startTime
        };
      }

      // Expand query using detected pattern
      const expandedQuery = await detectionResult.expansionFunction(
        detectionResult.match,
        workingContext
      );

      // Generate explanation
      const explanation = this.generateFollowupExplanation(
        input,
        expandedQuery,
        detectionResult.type,
        workingContext
      );

      const result = {
        isFollowup: true,
        originalQuery: input,
        expandedQuery: expandedQuery,
        confidence: detectionResult.confidence,
        type: detectionResult.type,
        contextUsed: this.extractUsedContext(detectionResult.type, workingContext),
        explanation: explanation,
        processingTime: Date.now() - startTime,
        matchedPattern: detectionResult.patternDescription
      };

      // Update context with this follow-up
      await this.updateContextWithFollowup(input, result);

      logger.debug('Follow-up handled successfully', {
        type: result.type,
        confidence: result.confidence,
        expandedLength: expandedQuery.length
      });

      return result;

    } catch (error) {
      logger.error('Follow-up handling failed', { error: error.message, input });
      return {
        isFollowup: false,
        originalQuery: input,
        expandedQuery: input,
        confidence: 0,
        error: error.message,
        processingTime: Date.now() - Date.now()
      };
    }
  }

  /**
   * Detect follow-up pattern in user input
   * @param {string} input - User input
   * @returns {Object} Detection result
   */
  async detectFollowupPattern(input) {
    for (const [type, config] of this.followupPatterns) {
      for (const pattern of config.patterns) {
        const match = pattern.exec(input);
        if (match) {
          return {
            isFollowup: true,
            type: type,
            match: match,
            confidence: config.confidence,
            expansionFunction: config.expansion,
            patternDescription: pattern.toString()
          };
        }
      }
    }

    return { isFollowup: false };
  }

  /**
   * Validate that required context is available for follow-up type
   * @param {string} followupType - Type of follow-up
   * @param {Object} context - Available context
   * @returns {Object} Validation result  
   */
  validateContextForFollowup(followupType, context) {
    const requirements = this.contextRequirements.get(followupType) || [];
    const missing = [];

    for (const requirement of requirements) {
      if (!context[requirement]) {
        missing.push(requirement);
      }
    }

    return {
      valid: missing.length === 0,
      missing: missing,
      available: requirements.filter(req => context[req])
    };
  }

  /**
   * Expand temporal follow-up questions
   * @param {Array} match - Regex match result
   * @param {Object} context - Context information
   * @returns {string} Expanded query
   */
  expandTemporalFollowup(match, context) {
    const timeReference = match[1];
    const baseAction = context.lastAction || 'information';
    const location = context.location || 'current location';

    return `Get ${baseAction} for ${location} ${timeReference}`;
  }

  /**
   * Expand location-based follow-up questions
   * @param {Array} match - Regex match result
   * @param {Object} context - Context information
   * @returns {string} Expanded query
   */
  expandLocationFollowup(match, context) {
    const locationReference = match[1];
    const baseAction = context.lastAction || 'information';
    
    let resolvedLocation;
    if (locationReference && locationReference.toLowerCase() !== 'there' && 
        locationReference.toLowerCase() !== 'here' && 
        locationReference.toLowerCase() !== 'that place') {
      resolvedLocation = locationReference;
    } else {
      resolvedLocation = context.location || 'current location';
    }

    return `Get ${baseAction} for ${resolvedLocation}`;
  }

  /**
   * Expand action continuation follow-up questions
   * @param {Array} match - Regex match result
   * @param {Object} context - Context information
   * @returns {string} Expanded query
   */
  expandActionFollowup(match, context) {
    const newAction = match[1];
    const location = context.location || 'current location';
    const timeframe = context.timeframe || 'current';

    return `Get ${newAction} for ${location} ${timeframe}`;
  }

  /**
   * Expand repetition follow-up questions
   * @param {Array} match - Regex match result
   * @param {Object} context - Context information
   * @returns {string} Expanded query
   */
  expandRepetitionFollowup(match, context) {
    if (context.lastQuery) {
      return context.lastQuery;
    }

    const action = context.lastAction || 'information';
    const location = context.location || 'current location';
    return `Get ${action} for ${location}`;
  }

  /**
   * Expand elaboration follow-up questions  
   * @param {Array} match - Regex match result
   * @param {Object} context - Context information
   * @returns {string} Expanded query
   */
  expandElaborationFollowup(match, context) {
    const action = context.lastAction || 'information';
    const location = context.location || 'current location';
    
    return `Get comprehensive ${action} and additional details for ${location}`;
  }

  /**
   * Expand comparison follow-up questions
   * @param {Array} match - Regex match result  
   * @param {Object} context - Context information
   * @returns {string} Expanded query
   */
  expandComparisonFollowup(match, context) {
    const comparisonTarget = match[1] || 'alternative';
    const action = context.lastAction || 'information';
    const originalLocation = context.location || 'current location';

    return `Compare ${action} between ${originalLocation} and ${comparisonTarget}`;
  }

  /**
   * Generate explanation for follow-up expansion
   * @param {string} originalInput - Original follow-up input
   * @param {string} expandedQuery - Expanded query
   * @param {string} type - Follow-up type
   * @param {Object} context - Context used
   * @returns {string} Human-readable explanation
   */
  generateFollowupExplanation(originalInput, expandedQuery, type, context) {
    const explanations = {
      temporal: `I understood "${originalInput}" as a request for the same information (${context.lastAction}) for ${context.location} but for a different time period.`,
      location: `I interpreted "${originalInput}" as asking for ${context.lastAction} information for the location we were discussing (${context.location}).`,
      action_continuation: `I understood "${originalInput}" as a request for additional information about ${context.location}.`,
      repetition: `I interpreted "${originalInput}" as a request to repeat the previous action.`,
      elaboration: `I understood "${originalInput}" as a request for more detailed information about our previous topic.`,
      comparison: `I interpreted "${originalInput}" as a request to compare information across different options.`
    };

    return explanations[type] || `I expanded your follow-up question using context from our conversation.`;
  }

  /**
   * Extract which context was used for expansion
   * @param {string} type - Follow-up type
   * @param {Object} context - Available context
   * @returns {Object} Used context information
   */
  extractUsedContext(type, context) {
    const requirements = this.contextRequirements.get(type) || [];
    const used = {};

    for (const requirement of requirements) {
      if (context[requirement]) {
        used[requirement] = context[requirement];
      }
    }

    return used;
  }

  /**
   * Update context with information from this follow-up
   * @param {string} input - Original input  
   * @param {Object} result - Follow-up result
   * @returns {Promise<void>}
   */
  async updateContextWithFollowup(input, result) {
    // Update last query
    this.currentContext.lastQuery = result.expandedQuery;
    
    // Add to conversation history
    this.currentContext.conversationHistory.push({
      timestamp: new Date().toISOString(),
      type: 'followup',
      original: input,
      expanded: result.expandedQuery,
      followupType: result.type
    });

    // Limit history
    if (this.currentContext.conversationHistory.length > 10) {
      this.currentContext.conversationHistory = this.currentContext.conversationHistory.slice(-10);
    }
  }

  /**
   * Get current context state
   * @returns {Object} Current context
   */
  getCurrentContext() {
    return { ...this.currentContext };
  }

  /**
   * Clear context (start fresh conversation)
   * @returns {Promise<void>}
   */
  async clearContext() {
    this.currentContext = {
      lastAction: null,
      location: null,
      timeframe: null,
      parameters: new Map(),
      conversationHistory: [],
      lastQuery: null,
      lastResponse: null
    };

    logger.debug('Follow-up context cleared');
  }

  /**
   * Check if input looks like a follow-up question
   * @param {string} input - User input
   * @returns {boolean} True if likely a follow-up
   */
  isLikelyFollowup(input) {
    const followupIndicators = [
      /^(what about|how about|and|also|too|again|more|else)/i,
      /\b(there|here|that|this|it|then|tomorrow|yesterday)\b/i,
      /\?$/,
      /^(what|how|when|where)\b/i
    ];

    const isShort = input.split(/\s+/).length <= 5;
    const hasIndicator = followupIndicators.some(pattern => pattern.test(input));

    return isShort && hasIndicator;
  }

  /**
   * Get follow-up suggestions based on current context
   * @returns {Array} Array of suggested follow-up questions
   */
  getFollowupSuggestions() {
    const suggestions = [];
    
    if (this.currentContext.lastAction && this.currentContext.location) {
      suggestions.push(`What about tomorrow?`);
      suggestions.push(`How about the news there?`);
      suggestions.push(`Tell me more details`);
    }

    if (this.currentContext.location) {
      suggestions.push(`What about weather there?`);
      suggestions.push(`Any other information?`);
    }

    return suggestions.slice(0, 3); // Limit to 3 suggestions
  }
}