import { logger } from '../utils/logger.js';

/**
 * Conversation Manager for Phase 4 Checkpoint 3
 * Provides persistent conversation context and multi-turn interaction capabilities with:
 * - Conversation memory and state persistence
 * - Context tracking across multiple turns
 * - Parameter extraction and resolution
 * - Conversation flow compilation
 * - Multi-user conversation support
 */
export class ConversationManager {
  constructor() {
    // Conversation storage - maps conversation ID to conversation state
    this.conversations = new Map();
    
    // Global context patterns for entity recognition
    this.contextPatterns = new Map([
      ['location', {
        keywords: ['there', 'here', 'that place', 'this city', 'same location'],
        extraction: /(?:in|at|from|to)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/g,
        priority: 90
      }],
      ['time', {
        keywords: ['then', 'later', 'tomorrow', 'yesterday', 'next week', 'last month'],
        extraction: /(?:tomorrow|yesterday|next\s+\w+|last\s+\w+|in\s+\d+\s+\w+)/g,
        priority: 80
      }],
      ['topic', {
        keywords: ['that', 'this', 'it', 'same thing', 'similar'],
        extraction: /(?:about|regarding|concerning)\s+(\w+(?:\s+\w+)*)/g,
        priority: 70
      }],
      ['action', {
        keywords: ['again', 'also', 'too', 'as well'],
        extraction: /(?:get|find|check|search|look)\s+(\w+(?:\s+\w+)*)/g,
        priority: 60
      }]
    ]);

    // Conversation flow states
    this.flowStates = new Map([
      ['initial', { allowedTransitions: ['collecting', 'processing', 'completed'] }],
      ['collecting', { allowedTransitions: ['processing', 'clarifying', 'collecting'] }],
      ['clarifying', { allowedTransitions: ['collecting', 'processing'] }],
      ['processing', { allowedTransitions: ['completed', 'follow_up'] }],
      ['follow_up', { allowedTransitions: ['processing', 'completed'] }],
      ['completed', { allowedTransitions: ['initial', 'follow_up'] }]
    ]);

    this.defaultConversationState = {
      id: null,
      userId: null,
      startTime: null,
      lastActivity: null,
      state: 'initial',
      turns: [],
      context: {
        entities: new Map(),
        parameters: new Map(),
        history: [],
        currentFocus: null,
        pendingClarifications: []
      },
      metadata: {
        totalTurns: 0,
        averageResponseTime: 0,
        userSentiment: 'neutral',
        conversationComplexity: 'simple'
      }
    };

    this.initialized = true;
  }

  /**
   * Process user input in the context of an ongoing conversation
   * @param {string} input - User input text
   * @param {string} conversationId - Conversation identifier
   * @param {string} userId - User identifier
   * @returns {Object} Processed input with context resolution
   */
  async processInput(input, conversationId = 'default', userId = 'anonymous') {
    try {
      logger.debug('Processing conversational input', { input, conversationId });

      const startTime = Date.now();
      
      // Get or create conversation state
      let conversation = this.getConversation(conversationId);
      if (!conversation) {
        conversation = this.createConversation(conversationId, userId);
      }

      // Analyze current input
      const inputAnalysis = await this.analyzeInput(input, conversation);
      
      // Resolve contextual references
      const resolvedInput = await this.resolveContextualReferences(inputAnalysis, conversation);
      
      // Extract and update entities
      const extractedEntities = await this.extractEntities(resolvedInput, conversation);
      
      // Update conversation state
      const updatedConversation = await this.updateConversationState(
        conversation,
        input,
        resolvedInput,
        extractedEntities,
        startTime
      );

      // Determine next action
      const nextAction = await this.determineNextAction(updatedConversation);

      const processingResult = {
        conversationId: conversationId,
        originalInput: input,
        resolvedInput: resolvedInput.text,
        extractedEntities: extractedEntities,
        conversationState: updatedConversation.state,
        nextAction: nextAction,
        context: {
          resolvedLocation: this.getContextValue(updatedConversation, 'location') || 
                           (resolvedInput.resolutions && resolvedInput.resolutions.find(r => r.type === 'location')?.resolved),
          resolvedTime: this.getContextValue(updatedConversation, 'time'),
          contextSource: resolvedInput.contextSource,
          pendingClarifications: updatedConversation.context.pendingClarifications
        },
        processingTime: Date.now() - startTime,
        turnNumber: updatedConversation.metadata.totalTurns
      };

      logger.debug('Conversation input processed', {
        conversationId,
        turnNumber: processingResult.turnNumber,
        resolvedEntities: extractedEntities.length
      });

      return processingResult;

    } catch (error) {
      logger.error('Conversation processing failed', { error: error.message, input });
      return this.createErrorResult(input, conversationId, error);
    }
  }

  /**
   * Record conversation context for future reference
   * @param {Object} turnResult - Result from processInput
   * @returns {Object} Updated conversation state
   */
  async recordContext(turnResult) {
    try {
      const conversation = this.getConversation(turnResult.conversationId);
      if (!conversation) {
        throw new Error(`Conversation ${turnResult.conversationId} not found`);
      }

      // Update context with new information
      for (const entity of turnResult.extractedEntities) {
        conversation.context.entities.set(entity.type, {
          value: entity.value,
          confidence: entity.confidence,
          source: 'user_input',
          turn: turnResult.turnNumber,
          timestamp: new Date().toISOString()
        });
      }

      // Update focus based on entities
      if (turnResult.extractedEntities.length > 0) {
        const highestConfidenceEntity = turnResult.extractedEntities.reduce((max, entity) => 
          entity.confidence > max.confidence ? entity : max
        );
        conversation.context.currentFocus = highestConfidenceEntity.type;
      }

      // Store conversation
      this.conversations.set(turnResult.conversationId, conversation);

      logger.debug('Context recorded', {
        conversationId: turnResult.conversationId,
        entitiesCount: turnResult.extractedEntities.length,
        currentFocus: conversation.context.currentFocus
      });

      return conversation;

    } catch (error) {
      logger.error('Context recording failed', { error: error.message });
      throw error;
    }
  }

  /**
   * Manage conversation flow across multiple turns
   * @param {Array} inputs - Array of user inputs representing conversation turns
   * @param {string} conversationId - Conversation identifier
   * @returns {Object} Compiled conversation result
   */
  async manageFlow(inputs, conversationId = 'flow_session') {
    try {
      logger.debug('Managing conversation flow', { inputCount: inputs.length, conversationId });

      const flowResult = {
        conversationId: conversationId,
        totalTurns: inputs.length,
        extractedParameters: new Map(),
        compiledRequest: '',
        conversationSummary: '',
        flowPath: [],
        success: true
      };

      // Process each input in sequence
      for (let i = 0; i < inputs.length; i++) {
        const input = inputs[i];
        const turnResult = await this.processInput(input, conversationId, 'flow_user');
        
        // Record the context
        await this.recordContext(turnResult);
        
        // Update flow result
        flowResult.flowPath.push({
          turn: i + 1,
          input: input,
          state: turnResult.conversationState,
          entities: turnResult.extractedEntities
        });

        // Accumulate parameters
        for (const entity of turnResult.extractedEntities) {
          flowResult.extractedParameters.set(entity.type, entity.value);
        }
      }

      // Compile final request
      flowResult.compiledRequest = await this.compileConversationRequest(conversationId);
      flowResult.conversationSummary = await this.generateConversationSummary(conversationId);

      // Convert Map to Object for easier testing
      flowResult.extractedParameters = Object.fromEntries(flowResult.extractedParameters);

      logger.debug('Conversation flow completed', {
        conversationId,
        totalParameters: Object.keys(flowResult.extractedParameters).length
      });

      return flowResult;

    } catch (error) {
      logger.error('Conversation flow management failed', { error: error.message });
      return {
        conversationId: conversationId,
        success: false,
        error: error.message,
        extractedParameters: {},
        compiledRequest: '',
        conversationSummary: ''
      };
    }
  }

  /**
   * Get conversation by ID
   * @param {string} conversationId - Conversation identifier
   * @returns {Object|null} Conversation state or null
   */
  getConversation(conversationId) {
    return this.conversations.get(conversationId) || null;
  }

  /**
   * Create new conversation
   * @param {string} conversationId - Conversation identifier
   * @param {string} userId - User identifier
   * @returns {Object} New conversation state
   */
  createConversation(conversationId, userId) {
    const conversation = {
      ...this.defaultConversationState,
      id: conversationId,
      userId: userId,
      startTime: new Date().toISOString(),
      lastActivity: new Date().toISOString(),
      context: {
        entities: new Map(),
        parameters: new Map(),
        history: [],
        currentFocus: null,
        pendingClarifications: []
      }
    };

    this.conversations.set(conversationId, conversation);
    
    logger.debug('New conversation created', { conversationId, userId });
    
    return conversation;
  }

  /**
   * Analyze user input for intent and content
   * @param {string} input - User input text
   * @param {Object} conversation - Current conversation state
   * @returns {Object} Input analysis
   */
  async analyzeInput(input, conversation) {
    const analysis = {
      originalInput: input,
      lowercaseInput: input.toLowerCase(),
      wordCount: input.split(/\s+/).length,
      containsQuestion: /\?/.test(input),
      containsNegation: /\b(no|not|never|none|nothing)\b/i.test(input),
      sentiment: this.analyzeSentiment(input),
      urgency: this.analyzeUrgency(input),
      contextualReferences: this.findContextualReferences(input),
      entities: [],
      intent: this.analyzeIntent(input, conversation)
    };

    return analysis;
  }

  /**
   * Resolve contextual references in user input
   * @param {Object} inputAnalysis - Analyzed input
   * @param {Object} conversation - Conversation state
   * @returns {Object} Resolved input with context
   */
  async resolveContextualReferences(inputAnalysis, conversation) {
    let resolvedText = inputAnalysis.originalInput;
    let contextSource = 'none';
    const resolutions = [];

    // Resolve location references
    if (inputAnalysis.contextualReferences.includes('location')) {
      const previousLocation = conversation.context.entities.get('location');
      if (previousLocation) {
        resolvedText = resolvedText.replace(
          /\b(there|here|that place|this city|same location)\b/gi,
          previousLocation.value
        );
        contextSource = 'previous_turn';
        resolutions.push({
          type: 'location',
          original: 'contextual_reference',
          resolved: previousLocation.value,
          confidence: previousLocation.confidence
        });
      }
    }

    // Special handling for "there" when we have a previous location
    if (resolvedText.toLowerCase().includes('there') && conversation.context.entities.has('location')) {
      const previousLocation = conversation.context.entities.get('location');
      resolvedText = resolvedText.replace(/\bthere\b/gi, previousLocation.value);
      contextSource = 'previous_turn';
      resolutions.push({
        type: 'location',
        original: 'there',
        resolved: previousLocation.value,
        confidence: previousLocation.confidence || 0.9
      });
    }

    // Resolve time references
    if (inputAnalysis.contextualReferences.includes('time')) {
      const previousTime = conversation.context.entities.get('time');
      if (previousTime) {
        resolvedText = resolvedText.replace(/\b(then|that time)\b/gi, previousTime.value);
        contextSource = 'previous_turn';
        resolutions.push({
          type: 'time',
          original: 'contextual_reference',
          resolved: previousTime.value,
          confidence: previousTime.confidence
        });
      }
    }

    // Resolve topic references
    if (inputAnalysis.contextualReferences.includes('topic')) {
      const currentFocus = conversation.context.currentFocus;
      if (currentFocus) {
        const focusEntity = conversation.context.entities.get(currentFocus);
        if (focusEntity) {
          resolvedText = resolvedText.replace(/\b(that|this|it)\b/gi, focusEntity.value);
          contextSource = 'conversation_focus';
          resolutions.push({
            type: currentFocus,
            original: 'contextual_reference',
            resolved: focusEntity.value,
            confidence: focusEntity.confidence
          });
        }
      }
    }

    return {
      text: resolvedText,
      originalText: inputAnalysis.originalInput,
      contextSource: contextSource,
      resolutions: resolutions,
      hasResolutions: resolutions.length > 0
    };
  }

  /**
   * Extract entities from resolved input
   * @param {Object} resolvedInput - Resolved input with context
   * @param {Object} conversation - Conversation state
   * @returns {Array} Extracted entities
   */
  async extractEntities(resolvedInput, conversation) {
    const entities = [];
    const text = resolvedInput.text.toLowerCase();

    // Location extraction
    const locationPatterns = [
      /(?:in|at|from|to|for)\s+([A-Z][a-z]{2,}(?:\s+[A-Z][a-z]{2,})*)/g,
      /^To\s+([A-Z][a-z]{2,}(?:\s+[A-Z][a-z]{2,})*)/gi,
      /\b([A-Z][a-z]{2,}(?:\s+[A-Z][a-z]{2,})*)\s*(?:\?|$)/gi,
      /weather\s+in\s+([A-Z][a-z]{2,}(?:\s+[A-Z][a-z]{2,})*)/gi
    ];

    // Common words to exclude from location detection
    const excludeWords = ['the', 'what', 'how', 'when', 'where', 'why', 'who', 'which', 'that', 'this', 'there', 'here', 'know', 'need', 'want', 'like', 'tell', 'get', 'have', 'can'];

    for (const pattern of locationPatterns) {
      let match;
      while ((match = pattern.exec(resolvedInput.text)) !== null) {
        const locationValue = match[1];
        if (locationValue && !excludeWords.includes(locationValue.toLowerCase()) && locationValue.length > 2) {
          entities.push({
            type: 'location',
            value: locationValue,
            confidence: 0.85,
            source: 'pattern_extraction',
            position: { start: match.index, end: match.index + match[0].length }
          });
        }
      }
    }

    // Time extraction
    const timePatterns = [
      /\b(tomorrow|yesterday|today)\b/gi,
      /\b(next|last)\s+(week|month|year)\b/gi,
      /\bin\s+(\d+\s+(?:days?|weeks?|months?))\b/gi
    ];

    for (const pattern of timePatterns) {
      let match;
      while ((match = pattern.exec(resolvedInput.text)) !== null) {
        entities.push({
          type: 'time',
          value: match[0],
          confidence: 0.90,
          source: 'pattern_extraction',
          position: { start: match.index, end: match.index + match[0].length }
        });
      }
    }

    // Action extraction
    const actionPatterns = [
      /\b(check|get|find|search|look\s+up|tell\s+me)\s+(?:about\s+)?(\w+(?:\s+\w+)*)/gi,
      /\b(?:what(?:'s)?|how)\s+(?:about|is)\s+(?:the\s+)?(\w+(?:\s+\w+)*)/gi
    ];

    for (const pattern of actionPatterns) {
      let match;
      while ((match = pattern.exec(resolvedInput.text)) !== null) {
        entities.push({
          type: 'action',
          value: match[1] || match[2],
          confidence: 0.75,
          source: 'pattern_extraction',
          position: { start: match.index, end: match.index + match[0].length }
        });
      }
    }

    // Remove duplicates and sort by confidence
    const uniqueEntities = this.deduplicateEntities(entities);
    uniqueEntities.sort((a, b) => b.confidence - a.confidence);

    return uniqueEntities.slice(0, 5); // Limit to top 5 entities
  }

  /**
   * Update conversation state with new turn information
   * @param {Object} conversation - Current conversation state
   * @param {string} originalInput - Original user input
   * @param {Object} resolvedInput - Resolved input
   * @param {Array} entities - Extracted entities
   * @param {number} startTime - Processing start time
   * @returns {Object} Updated conversation state
   */
  async updateConversationState(conversation, originalInput, resolvedInput, entities, startTime) {
    const currentTime = new Date().toISOString();
    const processingTime = Date.now() - startTime;

    // Add turn to history
    const turn = {
      turnNumber: conversation.metadata.totalTurns + 1,
      timestamp: currentTime,
      originalInput: originalInput,
      resolvedInput: resolvedInput.text,
      entities: entities,
      processingTime: processingTime,
      contextResolutions: resolvedInput.resolutions || []
    };

    conversation.turns.push(turn);
    conversation.context.history.push({
      turn: turn.turnNumber,
      summary: this.summarizeTurn(turn),
      entities: entities.map(e => ({ type: e.type, value: e.value }))
    });

    // Update metadata
    conversation.metadata.totalTurns++;
    conversation.metadata.averageResponseTime = 
      (conversation.metadata.averageResponseTime * (conversation.metadata.totalTurns - 1) + processingTime) / 
      conversation.metadata.totalTurns;

    // Update conversation state based on content
    conversation.state = this.determineConversationState(conversation, entities);
    conversation.lastActivity = currentTime;

    return conversation;
  }

  /**
   * Determine next action based on conversation state
   * @param {Object} conversation - Current conversation state  
   * @returns {Object} Next action recommendation
   */
  async determineNextAction(conversation) {
    const latestTurn = conversation.turns[conversation.turns.length - 1];
    const entities = latestTurn.entities;

    // Check if we have enough information to proceed
    const hasLocation = entities.some(e => e.type === 'location') || 
                       conversation.context.entities.has('location');
    const hasAction = entities.some(e => e.type === 'action');

    if (hasAction && hasLocation) {
      return {
        action: 'execute_workflow',
        confidence: 0.9,
        parameters: this.extractActionParameters(conversation),
        reason: 'Sufficient information available for execution'
      };
    } else if (hasAction && !hasLocation) {
      return {
        action: 'request_clarification',
        confidence: 0.8,
        missing: ['location'],
        reason: 'Action identified but location needed'
      };
    } else {
      return {
        action: 'continue_conversation',
        confidence: 0.7,
        reason: 'Gathering more information'
      };
    }
  }

  /**
   * Get context value by type
   * @param {Object} conversation - Conversation state
   * @param {string} type - Context type
   * @returns {string|null} Context value
   */
  getContextValue(conversation, type) {
    const entity = conversation.context.entities.get(type);
    return entity ? entity.value : null;
  }

  /**
   * Compile conversation into a single request
   * @param {string} conversationId - Conversation identifier
   * @returns {string} Compiled request
   */
  async compileConversationRequest(conversationId) {
    const conversation = this.getConversation(conversationId);
    if (!conversation) {
      return '';
    }

    const entities = Array.from(conversation.context.entities.entries());
    const location = entities.find(([type]) => type === 'location')?.[1]?.value;
    const action = entities.find(([type]) => type === 'action')?.[1]?.value;
    const time = entities.find(([type]) => type === 'time')?.[1]?.value;

    let compiled = '';
    if (action && location) {
      compiled = `${action} for ${location}`;
      if (time) {
        compiled += ` ${time}`;
      }
    } else if (location) {
      compiled = `Information about ${location}`;
    } else {
      compiled = 'General information request';
    }

    return compiled;
  }

  /**
   * Generate conversation summary
   * @param {string} conversationId - Conversation identifier
   * @returns {string} Conversation summary
   */
  async generateConversationSummary(conversationId) {
    const conversation = this.getConversation(conversationId);
    if (!conversation) {
      return '';
    }

    const entityCount = conversation.context.entities.size;
    const turnCount = conversation.metadata.totalTurns;
    const entityTypes = Array.from(conversation.context.entities.keys()).join(', ');

    return `Conversation with ${turnCount} turns, identified ${entityCount} entities (${entityTypes}). ` +
           `Current state: ${conversation.state}`;
  }

  // Helper methods
  findContextualReferences(input) {
    const references = [];
    const lowerInput = input.toLowerCase();

    for (const [type, pattern] of this.contextPatterns) {
      if (pattern.keywords.some(keyword => lowerInput.includes(keyword))) {
        references.push(type);
      }
    }

    return references;
  }

  analyzeSentiment(input) {
    const positiveWords = ['good', 'great', 'excellent', 'amazing', 'wonderful', 'love', 'like'];
    const negativeWords = ['bad', 'terrible', 'awful', 'hate', 'dislike', 'horrible', 'annoying'];
    
    const lowerInput = input.toLowerCase();
    const positiveCount = positiveWords.filter(word => lowerInput.includes(word)).length;
    const negativeCount = negativeWords.filter(word => lowerInput.includes(word)).length;

    if (positiveCount > negativeCount) return 'positive';
    if (negativeCount > positiveCount) return 'negative';
    return 'neutral';
  }

  analyzeUrgency(input) {
    const urgentWords = ['urgent', 'asap', 'quickly', 'immediately', 'right now', 'hurry'];
    return urgentWords.some(word => input.toLowerCase().includes(word)) ? 'high' : 'normal';
  }

  analyzeIntent(input, conversation) {
    const lowerInput = input.toLowerCase();
    
    if (lowerInput.includes('weather')) return 'weather_request';
    if (lowerInput.includes('news')) return 'news_request';
    if (lowerInput.includes('currency') || lowerInput.includes('exchange')) return 'currency_request';
    if (lowerInput.includes('location') || lowerInput.includes('where')) return 'location_request';
    
    return 'general_request';
  }

  deduplicateEntities(entities) {
    const seen = new Set();
    return entities.filter(entity => {
      const key = `${entity.type}:${entity.value.toLowerCase()}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  summarizeTurn(turn) {
    const entitySummary = turn.entities.map(e => `${e.type}:${e.value}`).join(', ');
    return `Turn ${turn.turnNumber}: "${turn.originalInput.substring(0, 50)}..." (${entitySummary})`;
  }

  determineConversationState(conversation, entities) {
    if (entities.length === 0) return 'collecting';
    if (entities.some(e => e.type === 'action') && entities.some(e => e.type === 'location')) return 'processing';
    if (conversation.context.pendingClarifications.length > 0) return 'clarifying';
    return 'collecting';
  }

  extractActionParameters(conversation) {
    const params = {};
    for (const [type, entity] of conversation.context.entities) {
      params[type] = entity.value;
    }
    return params;
  }

  createErrorResult(input, conversationId, error) {
    return {
      conversationId: conversationId,
      originalInput: input,
      resolvedInput: input,
      extractedEntities: [],
      conversationState: 'error',
      context: { error: error.message },
      processingTime: 0,
      turnNumber: 0
    };
  }
}