import { logger } from '../utils/logger.js';

/**
 * Context Resolver for Phase 4 Checkpoint 3
 * Provides advanced context-aware parameter resolution with:
 * - Ambiguity resolution using conversation context
 * - Multi-source context integration
 * - Confidence-based parameter selection
 * - Context expiration and relevance scoring
 * - Smart defaults and fallback resolution
 */
export class ContextResolver {
  constructor() {
    // Context storage with TTL and priority
    this.contextStore = new Map();
    
    // Context types with their resolution priorities and TTL
    this.contextTypes = new Map([
      ['mentioned_locations', { 
        priority: 90, 
        ttl: 300000, // 5 minutes
        resolver: this.resolveLocationContext.bind(this)
      }],
      ['current_focus', { 
        priority: 95, 
        ttl: 180000, // 3 minutes
        resolver: this.resolveFocusContext.bind(this)
      }],
      ['user_preferences', { 
        priority: 70, 
        ttl: 1800000, // 30 minutes
        resolver: this.resolvePreferenceContext.bind(this)
      }],
      ['conversation_entities', { 
        priority: 80, 
        ttl: 600000, // 10 minutes
        resolver: this.resolveEntityContext.bind(this)
      }],
      ['temporal_context', { 
        priority: 85, 
        ttl: 120000, // 2 minutes
        resolver: this.resolveTemporalContext.bind(this)
      }],
      ['session_data', { 
        priority: 60, 
        ttl: 3600000, // 1 hour
        resolver: this.resolveSessionContext.bind(this)
      }]
    ]);

    // Ambiguity resolution strategies
    this.resolutionStrategies = new Map([
      ['priority_based', this.priorityBasedResolution.bind(this)],
      ['confidence_weighted', this.confidenceWeightedResolution.bind(this)],
      ['temporal_preference', this.temporalPreferenceResolution.bind(this)],
      ['user_preference', this.userPreferenceResolution.bind(this)],
      ['frequency_based', this.frequencyBasedResolution.bind(this)]
    ]);

    // Parameter resolution patterns
    this.parameterPatterns = new Map([
      ['location', {
        identifiers: ['where', 'location', 'place', 'city', 'country'],
        ambiguousReferences: ['there', 'here', 'that place', 'this location'],
        extractionPattern: /(?:in|at|from|to|near)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/g,
        defaultStrategy: 'priority_based'
      }],
      ['time', {
        identifiers: ['when', 'time', 'date', 'schedule'],
        ambiguousReferences: ['then', 'that time', 'this time', 'later'],
        extractionPattern: /(?:at|on|during)\s+([\w\s]+)/g,
        defaultStrategy: 'temporal_preference'
      }],
      ['topic', {
        identifiers: ['what', 'topic', 'subject', 'about'],
        ambiguousReferences: ['that', 'this', 'it', 'same thing'],
        extractionPattern: /(?:about|regarding)\s+([\w\s]+)/g,
        defaultStrategy: 'confidence_weighted'
      }]
    ]);

    this.initialized = true;
  }

  /**
   * Add context information with type and value
   * @param {string} contextType - Type of context
   * @param {*} contextValue - Context value
   * @param {string} source - Source of context (optional)
   * @returns {Promise<void>}
   */
  async addContext(contextType, contextValue, source = 'unknown') {
    try {
      const contextConfig = this.contextTypes.get(contextType);
      if (!contextConfig) {
        logger.warn('Unknown context type', { contextType });
        // Still store it with default settings
      }

      const contextEntry = {
        type: contextType,
        value: contextValue,
        source: source,
        timestamp: Date.now(),
        ttl: contextConfig?.ttl || 300000, // Default 5 minutes
        priority: contextConfig?.priority || 50,
        accessCount: 0,
        lastAccessed: Date.now(),
        confidence: 1.0
      };

      // Handle array values (like mentioned_locations)
      if (this.contextStore.has(contextType)) {
        const existing = this.contextStore.get(contextType);
        if (Array.isArray(existing.value) && Array.isArray(contextValue)) {
          // Merge arrays, avoiding duplicates
          const mergedValue = [...new Set([...existing.value, ...contextValue])];
          contextEntry.value = mergedValue;
          contextEntry.accessCount = existing.accessCount;
        } else if (Array.isArray(existing.value) && !Array.isArray(contextValue)) {
          // Add single value to existing array
          if (!existing.value.includes(contextValue)) {
            existing.value.push(contextValue);
          }
          contextEntry.value = existing.value;
        }
      }

      this.contextStore.set(contextType, contextEntry);

      logger.debug('Context added', { 
        contextType, 
        source, 
        valueType: Array.isArray(contextValue) ? 'array' : typeof contextValue 
      });

    } catch (error) {
      logger.error('Failed to add context', { error: error.message, contextType });
      throw error;
    }
  }

  /**
   * Resolve ambiguous query parameters using context
   * @param {string} query - Ambiguous query
   * @param {Object} options - Resolution options
   * @returns {Object} Resolution result with resolved parameters
   */
  async resolveAmbiguity(query, options = {}) {
    try {
      logger.debug('Resolving query ambiguity', { query });

      const startTime = Date.now();

      // Clean expired context
      await this.cleanExpiredContext();

      // Identify ambiguous parameters in query
      const ambiguousParams = this.identifyAmbiguousParameters(query);
      
      if (ambiguousParams.length === 0) {
        return {
          originalQuery: query,
          resolvedQuery: query,
          resolvedParameters: {},
          ambiguityResolved: false,
          reason: 'No ambiguous parameters detected',
          processingTime: Date.now() - startTime
        };
      }

      // Resolve each ambiguous parameter
      const resolvedParameters = {};
      const resolutionDetails = [];

      for (const param of ambiguousParams) {
        const resolution = await this.resolveParameter(param, options);
        if (resolution.resolved) {
          resolvedParameters[param.type] = resolution.value;
          resolutionDetails.push({
            parameter: param.type,
            originalReference: param.reference,
            resolvedValue: resolution.value,
            strategy: resolution.strategy,
            confidence: resolution.confidence,
            contextSource: resolution.contextSource
          });
        }
      }

      // Apply resolved parameters to query
      const resolvedQuery = this.applyResolvedParameters(query, resolvedParameters);

      const result = {
        originalQuery: query,
        resolvedQuery: resolvedQuery,
        resolvedParameters: resolvedParameters,
        ambiguityResolved: Object.keys(resolvedParameters).length > 0,
        resolutionDetails: resolutionDetails,
        availableContext: this.getAvailableContextSummary(),
        processingTime: Date.now() - startTime,
        confidence: this.calculateOverallConfidence(resolutionDetails)
      };

      logger.debug('Ambiguity resolution completed', {
        parametersResolved: Object.keys(resolvedParameters).length,
        overallConfidence: result.confidence
      });

      return result;

    } catch (error) {
      logger.error('Ambiguity resolution failed', { error: error.message, query });
      return {
        originalQuery: query,
        resolvedQuery: query,
        resolvedParameters: {},
        ambiguityResolved: false,
        error: error.message,
        processingTime: Date.now() - Date.now()
      };
    }
  }

  /**
   * Identify ambiguous parameters in query
   * @param {string} query - Input query
   * @returns {Array} List of ambiguous parameters
   */
  identifyAmbiguousParameters(query) {
    const ambiguousParams = [];
    const lowerQuery = query.toLowerCase();

    for (const [paramType, config] of this.parameterPatterns) {
      // Check for ambiguous references
      for (const reference of config.ambiguousReferences) {
        if (lowerQuery.includes(reference.toLowerCase())) {
          ambiguousParams.push({
            type: paramType,
            reference: reference,
            position: lowerQuery.indexOf(reference.toLowerCase()),
            strategy: config.defaultStrategy
          });
        }
      }

      // Check for implicit parameters (questions without explicit parameters)
      if (config.identifiers.some(id => lowerQuery.includes(id))) {
        const hasExplicitValue = config.extractionPattern.test(query);
        if (!hasExplicitValue) {
          ambiguousParams.push({
            type: paramType,
            reference: 'implicit',
            position: -1,
            strategy: config.defaultStrategy
          });
        }
      }

      // Special case for weather questions - should be treated as location parameters
      if (lowerQuery.includes('weather') && !lowerQuery.match(/\bin\s+\w+/)) {
        ambiguousParams.push({
          type: 'location',
          reference: 'implicit_weather',
          position: -1,
          strategy: 'priority_based'
        });
      }
    }

    return ambiguousParams;
  }

  /**
   * Resolve a specific parameter using appropriate strategy
   * @param {Object} param - Parameter to resolve
   * @param {Object} options - Resolution options
   * @returns {Object} Resolution result
   */
  async resolveParameter(param, options = {}) {
    try {
      const strategy = options.strategy || param.strategy || 'priority_based';
      const resolver = this.resolutionStrategies.get(strategy);

      if (!resolver) {
        logger.warn('Unknown resolution strategy', { strategy });
        return { resolved: false, reason: 'Unknown strategy' };
      }

      const resolution = await resolver(param, options);

      // Update context access statistics
      if (resolution.resolved && resolution.contextSource) {
        this.updateContextAccess(resolution.contextSource);
      }

      return resolution;

    } catch (error) {
      logger.error('Parameter resolution failed', { error: error.message, param });
      return { resolved: false, reason: error.message };
    }
  }

  /**
   * Priority-based resolution strategy
   * @param {Object} param - Parameter to resolve
   * @param {Object} options - Options
   * @returns {Object} Resolution result
   */
  async priorityBasedResolution(param, options) {
    const relevantContexts = this.getRelevantContext(param.type);
    
    if (relevantContexts.length === 0) {
      return { resolved: false, reason: 'No relevant context available' };
    }

    // Sort by priority and recency
    relevantContexts.sort((a, b) => {
      const priorityDiff = b.priority - a.priority;
      if (priorityDiff !== 0) return priorityDiff;
      return b.timestamp - a.timestamp; // More recent first
    });

    const selectedContext = relevantContexts[0];
    let resolvedValue;

    if (param.type === 'location' && selectedContext.type === 'current_focus') {
      resolvedValue = selectedContext.value;
    } else if (param.type === 'location' && selectedContext.type === 'mentioned_locations') {
      // For mentioned locations array, pick the most recent/relevant one
      const locations = Array.isArray(selectedContext.value) ? selectedContext.value : [selectedContext.value];
      resolvedValue = locations[0]; // Default to first
    } else {
      resolvedValue = selectedContext.value;
    }

    return {
      resolved: true,
      value: resolvedValue,
      strategy: 'priority_based',
      confidence: selectedContext.confidence || 0.8,
      contextSource: selectedContext.type,
      reason: `Selected based on highest priority context (${selectedContext.type})`
    };
  }

  /**
   * Confidence-weighted resolution strategy
   * @param {Object} param - Parameter to resolve
   * @param {Object} options - Options
   * @returns {Object} Resolution result
   */
  async confidenceWeightedResolution(param, options) {
    const relevantContexts = this.getRelevantContext(param.type);
    
    if (relevantContexts.length === 0) {
      return { resolved: false, reason: 'No relevant context available' };
    }

    // Calculate weighted scores based on confidence, recency, and access frequency
    const scoredContexts = relevantContexts.map(context => {
      const confidence = context.confidence || 0.5;
      const recency = Math.max(0, 1 - (Date.now() - context.timestamp) / context.ttl);
      const frequency = Math.min(1, context.accessCount / 10); // Normalize access count
      
      const weightedScore = (confidence * 0.5) + (recency * 0.3) + (frequency * 0.2);
      
      return { ...context, weightedScore };
    });

    scoredContexts.sort((a, b) => b.weightedScore - a.weightedScore);
    const selectedContext = scoredContexts[0];

    let resolvedValue = selectedContext.value;
    if (Array.isArray(resolvedValue)) {
      resolvedValue = resolvedValue[0]; // Pick first from array
    }

    return {
      resolved: true,
      value: resolvedValue,
      strategy: 'confidence_weighted',
      confidence: selectedContext.weightedScore,
      contextSource: selectedContext.type,
      reason: `Selected based on weighted confidence score (${selectedContext.weightedScore.toFixed(2)})`
    };
  }

  /**
   * Temporal preference resolution strategy
   * @param {Object} param - Parameter to resolve
   * @param {Object} options - Options
   * @returns {Object} Resolution result
   */
  async temporalPreferenceResolution(param, options) {
    const relevantContexts = this.getRelevantContext(param.type);
    
    if (relevantContexts.length === 0) {
      return { resolved: false, reason: 'No relevant context available' };
    }

    // Prefer more recent context
    relevantContexts.sort((a, b) => b.timestamp - a.timestamp);
    const selectedContext = relevantContexts[0];

    let resolvedValue = selectedContext.value;
    if (Array.isArray(resolvedValue)) {
      resolvedValue = resolvedValue[resolvedValue.length - 1]; // Pick most recent from array
    }

    return {
      resolved: true,
      value: resolvedValue,
      strategy: 'temporal_preference',
      confidence: 0.85,
      contextSource: selectedContext.type,
      reason: 'Selected most recent context'
    };
  }

  /**
   * User preference resolution strategy
   * @param {Object} param - Parameter to resolve
   * @param {Object} options - Options
   * @returns {Object} Resolution result
   */
  async userPreferenceResolution(param, options) {
    // Look for user preferences first
    const preferenceContext = this.contextStore.get('user_preferences');
    
    if (preferenceContext && preferenceContext.value[param.type]) {
      return {
        resolved: true,
        value: preferenceContext.value[param.type],
        strategy: 'user_preference',
        confidence: 0.95,
        contextSource: 'user_preferences',
        reason: 'Resolved using stored user preference'
      };
    }

    // Fallback to priority-based resolution
    return await this.priorityBasedResolution(param, options);
  }

  /**
   * Frequency-based resolution strategy
   * @param {Object} param - Parameter to resolve
   * @param {Object} options - Options
   * @returns {Object} Resolution result
   */
  async frequencyBasedResolution(param, options) {
    const relevantContexts = this.getRelevantContext(param.type);
    
    if (relevantContexts.length === 0) {
      return { resolved: false, reason: 'No relevant context available' };
    }

    // Sort by access frequency (most accessed first)
    relevantContexts.sort((a, b) => b.accessCount - a.accessCount);
    const selectedContext = relevantContexts[0];

    let resolvedValue = selectedContext.value;
    if (Array.isArray(resolvedValue)) {
      // For arrays, could implement frequency tracking within the array
      resolvedValue = resolvedValue[0];
    }

    return {
      resolved: true,
      value: resolvedValue,
      strategy: 'frequency_based',
      confidence: 0.75,
      contextSource: selectedContext.type,
      reason: `Selected most frequently accessed context (${selectedContext.accessCount} times)`
    };
  }

  /**
   * Apply resolved parameters to original query
   * @param {string} query - Original query
   * @param {Object} resolvedParameters - Resolved parameters
   * @returns {string} Updated query
   */
  applyResolvedParameters(query, resolvedParameters) {
    let resolvedQuery = query;

    // Replace ambiguous location references
    if (resolvedParameters.location) {
      resolvedQuery = resolvedQuery.replace(
        /\b(there|here|that place|this location)\b/gi,
        resolvedParameters.location
      );
    }

    // Replace ambiguous time references
    if (resolvedParameters.time) {
      resolvedQuery = resolvedQuery.replace(
        /\b(then|that time|this time)\b/gi,
        resolvedParameters.time
      );
    }

    // Replace ambiguous topic references
    if (resolvedParameters.topic) {
      resolvedQuery = resolvedQuery.replace(
        /\b(that|this|it)\b/gi,
        resolvedParameters.topic
      );
    }

    return resolvedQuery;
  }

  /**
   * Get relevant context for parameter type
   * @param {string} paramType - Parameter type
   * @returns {Array} Relevant context entries
   */
  getRelevantContext(paramType) {
    const relevant = [];

    for (const [contextType, contextEntry] of this.contextStore) {
      // Check if context is relevant to parameter type
      if (this.isContextRelevant(contextType, paramType, contextEntry)) {
        relevant.push({ type: contextType, ...contextEntry });
      }
    }

    return relevant;
  }

  /**
   * Check if context is relevant to parameter type
   * @param {string} contextType - Context type
   * @param {string} paramType - Parameter type
   * @param {Object} contextEntry - Context entry
   * @returns {boolean} True if relevant
   */
  isContextRelevant(contextType, paramType, contextEntry) {
    // Location parameter relevance
    if (paramType === 'location') {
      return ['mentioned_locations', 'current_focus', 'user_preferences'].includes(contextType) ||
             (contextType === 'conversation_entities' && 
              (Array.isArray(contextEntry.value) ? 
               contextEntry.value.some(v => typeof v === 'string') :
               typeof contextEntry.value === 'string'));
    }

    // Time parameter relevance
    if (paramType === 'time') {
      return ['temporal_context', 'conversation_entities', 'user_preferences'].includes(contextType);
    }

    // Topic parameter relevance
    if (paramType === 'topic') {
      return ['current_focus', 'conversation_entities', 'user_preferences'].includes(contextType);
    }

    return false;
  }

  /**
   * Clean expired context entries
   * @returns {Promise<void>}
   */
  async cleanExpiredContext() {
    const now = Date.now();
    const expiredKeys = [];

    for (const [key, context] of this.contextStore) {
      if (now - context.timestamp > context.ttl) {
        expiredKeys.push(key);
      }
    }

    for (const key of expiredKeys) {
      this.contextStore.delete(key);
      logger.debug('Expired context removed', { contextType: key });
    }
  }

  /**
   * Update context access statistics
   * @param {string} contextType - Context type that was accessed
   */
  updateContextAccess(contextType) {
    const context = this.contextStore.get(contextType);
    if (context) {
      context.accessCount++;
      context.lastAccessed = Date.now();
    }
  }

  /**
   * Get available context summary
   * @returns {Object} Context summary
   */
  getAvailableContextSummary() {
    const summary = {};
    
    for (const [type, context] of this.contextStore) {
      summary[type] = {
        hasValue: !!context.value,
        valueType: Array.isArray(context.value) ? 'array' : typeof context.value,
        arrayLength: Array.isArray(context.value) ? context.value.length : null,
        age: Date.now() - context.timestamp,
        accessCount: context.accessCount
      };
    }

    return summary;
  }

  /**
   * Calculate overall confidence for resolution result
   * @param {Array} resolutionDetails - Details of parameter resolutions
   * @returns {number} Overall confidence score
   */
  calculateOverallConfidence(resolutionDetails) {
    if (resolutionDetails.length === 0) return 0;

    const avgConfidence = resolutionDetails.reduce((sum, detail) => 
      sum + detail.confidence, 0) / resolutionDetails.length;

    return Math.round(avgConfidence * 100) / 100;
  }

  /**
   * Get current context state
   * @returns {Object} Current context state
   */
  getCurrentContext() {
    const context = {};
    for (const [type, entry] of this.contextStore) {
      context[type] = {
        value: entry.value,
        timestamp: entry.timestamp,
        source: entry.source,
        accessCount: entry.accessCount
      };
    }
    return context;
  }

  /**
   * Clear all context
   * @returns {Promise<void>}
   */
  async clearContext() {
    this.contextStore.clear();
    logger.debug('All context cleared');
  }

  // Context type-specific resolvers
  async resolveLocationContext(param, context) {
    // Implementation for location-specific context resolution
    return context.value;
  }

  async resolveFocusContext(param, context) {
    // Implementation for focus-specific context resolution
    return context.value;
  }

  async resolvePreferenceContext(param, context) {
    // Implementation for preference-specific context resolution
    return context.value[param.type] || null;
  }

  async resolveEntityContext(param, context) {
    // Implementation for entity-specific context resolution
    if (Array.isArray(context.value)) {
      return context.value.find(entity => entity.type === param.type)?.value || null;
    }
    return context.value;
  }

  async resolveTemporalContext(param, context) {
    // Implementation for temporal-specific context resolution
    return context.value;
  }

  async resolveSessionContext(param, context) {
    // Implementation for session-specific context resolution
    return context.value[param.type] || null;
  }
}