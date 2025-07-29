import { logger } from '../utils/logger.js';

/**
 * Context Manager for Phase 4
 * Manages conversation context and state with:
 * - Context persistence and retrieval
 * - Reference resolution
 * - Context-aware parameter resolution
 * - Conversation state management
 */
export class ContextManager {
  constructor() {
    this.contexts = new Map();
    this.globalContext = new Map();
    this.contextRetentionTime = 3600000; // 1 hour
    this.maxContextEntries = 50;
    this.contextTypes = {
      USER_LOCATION: 'user_location',
      USER_INTEREST: 'user_interest',
      LAST_ACTION: 'last_action',
      MENTIONED_ENTITIES: 'mentioned_entities',
      CONVERSATION_TOPIC: 'conversation_topic',
      TEMPORAL_CONTEXT: 'temporal_context',
      EMOTIONAL_STATE: 'emotional_state'
    };

    // Set up context cleanup interval
    this.setupContextCleanup();
    this.initialized = true;
  }

  /**
   * Add context entry to global or conversation-specific context
   * @param {string} key - Context key
   * @param {*} value - Context value
   * @param {string} conversationId - Optional conversation ID
   * @param {number} ttl - Time to live in milliseconds
   */
  async addContext(key, value, conversationId = null, ttl = null) {
    try {
      const timestamp = Date.now();
      const expiresAt = ttl ? timestamp + ttl : timestamp + this.contextRetentionTime;
      
      const contextEntry = {
        key,
        value,
        timestamp,
        expiresAt,
        conversationId,
        type: this.inferContextType(key, value)
      };

      if (conversationId) {
        // Add to conversation-specific context
        if (!this.contexts.has(conversationId)) {
          this.contexts.set(conversationId, new Map());
        }
        
        const conversationContext = this.contexts.get(conversationId);
        conversationContext.set(key, contextEntry);
        
        // Maintain context size limit
        if (conversationContext.size > this.maxContextEntries) {
          this.pruneOldestContext(conversationContext);
        }
      } else {
        // Add to global context
        this.globalContext.set(key, contextEntry);
      }

      logger.debug('Context added', { 
        key, 
        conversationId: conversationId || 'global',
        type: contextEntry.type 
      });
      
    } catch (error) {
      logger.error('Failed to add context', { error: error.message, key });
    }
  }

  /**
   * Get context value
   * @param {string} key - Context key
   * @param {string} conversationId - Optional conversation ID
   * @returns {*} Context value or null
   */
  getContext(key = null, conversationId = null) {
    try {
      if (key) {
        // Get specific key
        const context = this.getContextEntry(key, conversationId);
        return context ? context.value : null;
      } else {
        // Get all context for conversation or global
        if (conversationId && this.contexts.has(conversationId)) {
          const conversationContext = this.contexts.get(conversationId);
          const contextObj = {};
          
          for (const [k, entry] of conversationContext) {
            if (!this.isExpired(entry)) {
              contextObj[k] = entry.value;
            }
          }
          
          // Merge with relevant global context
          for (const [k, entry] of this.globalContext) {
            if (!this.isExpired(entry) && !contextObj[k]) {
              contextObj[k] = entry.value;
            }
          }
          
          return contextObj;
        } else {
          // Return global context
          const contextObj = {};
          for (const [k, entry] of this.globalContext) {
            if (!this.isExpired(entry)) {
              contextObj[k] = entry.value;
            }
          }
          return contextObj;
        }
      }
    } catch (error) {
      logger.error('Failed to get context', { error: error.message, key });
      return null;
    }
  }

  /**
   * Get context entry with metadata
   * @param {string} key - Context key
   * @param {string} conversationId - Optional conversation ID
   * @returns {Object} Context entry or null
   */
  getContextEntry(key, conversationId = null) {
    // Check conversation-specific context first
    if (conversationId && this.contexts.has(conversationId)) {
      const conversationContext = this.contexts.get(conversationId);
      const entry = conversationContext.get(key);
      
      if (entry && !this.isExpired(entry)) {
        return entry;
      }
    }

    // Check global context
    const globalEntry = this.globalContext.get(key);
    if (globalEntry && !this.isExpired(globalEntry)) {
      return globalEntry;
    }

    return null;
  }

  /**
   * Update existing context or create new
   * @param {string} key - Context key
   * @param {*} value - New context value
   * @param {string} conversationId - Optional conversation ID
   */
  async updateContext(key, value, conversationId = null) {
    const existingEntry = this.getContextEntry(key, conversationId);
    
    if (existingEntry) {
      // Update existing entry
      existingEntry.value = value;
      existingEntry.timestamp = Date.now();
      logger.debug('Context updated', { key, conversationId });
    } else {
      // Create new entry
      await this.addContext(key, value, conversationId);
    }
  }

  /**
   * Remove context entry
   * @param {string} key - Context key to remove
   * @param {string} conversationId - Optional conversation ID
   */
  removeContext(key, conversationId = null) {
    try {
      if (conversationId && this.contexts.has(conversationId)) {
        const conversationContext = this.contexts.get(conversationId);
        conversationContext.delete(key);
      } else {
        this.globalContext.delete(key);
      }
      
      logger.debug('Context removed', { key, conversationId });
    } catch (error) {
      logger.error('Failed to remove context', { error: error.message, key });
    }
  }

  /**
   * Clear all context for a conversation
   * @param {string} conversationId - Conversation ID to clear
   */
  clearConversationContext(conversationId) {
    if (this.contexts.has(conversationId)) {
      this.contexts.delete(conversationId);
      logger.debug('Conversation context cleared', { conversationId });
    }
  }

  /**
   * Get conversation history and context summary
   * @param {string} conversationId - Conversation ID
   * @returns {Object} Context summary
   */
  getConversationSummary(conversationId) {
    if (!this.contexts.has(conversationId)) {
      return { exists: false };
    }

    const conversationContext = this.contexts.get(conversationId);
    const summary = {
      exists: true,
      conversationId,
      totalEntries: conversationContext.size,
      lastUpdated: 0,
      contextTypes: new Set(),
      keyEntities: {},
      activeTopics: []
    };

    // Analyze context entries
    for (const [key, entry] of conversationContext) {
      if (!this.isExpired(entry)) {
        summary.lastUpdated = Math.max(summary.lastUpdated, entry.timestamp);
        summary.contextTypes.add(entry.type);
        
        // Extract key entities
        if (entry.type === this.contextTypes.USER_LOCATION) {
          summary.keyEntities.location = entry.value;
        } else if (entry.type === this.contextTypes.USER_INTEREST) {
          summary.keyEntities.interest = entry.value;
        } else if (entry.type === this.contextTypes.LAST_ACTION) {
          summary.keyEntities.lastAction = entry.value;
        }
        
        // Track topics
        if (entry.type === this.contextTypes.CONVERSATION_TOPIC) {
          summary.activeTopics.push(entry.value);
        }
      }
    }

    summary.contextTypes = Array.from(summary.contextTypes);
    return summary;
  }

  /**
   * Resolve contextual references in text
   * @param {string} text - Input text
   * @param {string} conversationId - Conversation ID
   * @returns {Object} Resolution result
   */
  async resolveContextualReferences(text, conversationId = null) {
    try {
      let resolvedText = text;
      const resolutions = [];
      const context = this.getContext(null, conversationId);
      
      if (!context) {
        return { 
          resolvedText, 
          resolutions, 
          contextUsed: false 
        };
      }

      // Resolve location references
      if (context.user_location) {
        const locationRefs = ['there', 'that place', 'this city', 'this location', 'here'];
        for (const ref of locationRefs) {
          const regex = new RegExp(`\\b${ref}\\b`, 'gi');
          if (regex.test(resolvedText)) {
            resolvedText = resolvedText.replace(regex, context.user_location);
            resolutions.push({
              type: 'location',
              original: ref,
              resolved: context.user_location,
              confidence: 0.9
            });
          }
        }
      }

      // Resolve topic references
      if (context.user_interest || context.conversation_topic) {
        const topicRefs = ['that', 'it', 'this topic', 'the subject'];
        const topic = context.user_interest || context.conversation_topic;
        
        for (const ref of topicRefs) {
          const regex = new RegExp(`\\b${ref}\\b`, 'gi');
          if (regex.test(resolvedText)) {
            resolvedText = resolvedText.replace(regex, topic);
            resolutions.push({
              type: 'topic',
              original: ref,
              resolved: topic,
              confidence: 0.8
            });
          }
        }
      }

      // Resolve temporal references
      if (context.temporal_context) {
        const timeRefs = ['then', 'at that time', 'when we discussed'];
        for (const ref of timeRefs) {
          if (resolvedText.includes(ref)) {
            resolutions.push({
              type: 'temporal',
              original: ref,
              resolved: context.temporal_context,
              confidence: 0.7
            });
          }
        }
      }

      return {
        resolvedText,
        resolutions,
        contextUsed: resolutions.length > 0,
        originalText: text
      };
      
    } catch (error) {
      logger.error('Context resolution failed', { error: error.message });
      return { 
        resolvedText: text, 
        resolutions: [], 
        contextUsed: false,
        error: error.message
      };
    }
  }

  /**
   * Extract and store context from user input
   * @param {string} text - User input
   * @param {Array} entities - Extracted entities
   * @param {string} conversationId - Conversation ID
   */
  async extractAndStoreContext(text, entities = [], conversationId = null) {
    try {
      // Store location entities
      const locations = entities.filter(e => e.type === 'location');
      if (locations.length > 0) {
        await this.addContext(
          this.contextTypes.USER_LOCATION, 
          locations[0].value, 
          conversationId
        );
      }

      // Store topic/interest entities
      const topics = entities.filter(e => e.type === 'topic');
      if (topics.length > 0) {
        await this.addContext(
          this.contextTypes.USER_INTEREST, 
          topics[0].value, 
          conversationId
        );
      }

      // Store emotional context
      const emotions = entities.filter(e => e.type === 'emotion');
      if (emotions.length > 0) {
        await this.addContext(
          this.contextTypes.EMOTIONAL_STATE, 
          emotions[0].value, 
          conversationId
        );
      }

      // Store temporal context
      const timeEntities = entities.filter(e => e.type === 'time');
      if (timeEntities.length > 0) {
        await this.addContext(
          this.contextTypes.TEMPORAL_CONTEXT, 
          timeEntities[0].value, 
          conversationId
        );
      }

      // Infer conversation topic from text
      const topic = this.inferConversationTopic(text);
      if (topic) {
        await this.addContext(
          this.contextTypes.CONVERSATION_TOPIC, 
          topic, 
          conversationId
        );
      }

      logger.debug('Context extracted and stored', { conversationId });
      
    } catch (error) {
      logger.error('Failed to extract context', { error: error.message });
    }
  }

  /**
   * Record last action for context continuity
   * @param {string} action - Action taken
   * @param {Object} result - Action result
   * @param {string} conversationId - Conversation ID
   */
  async recordLastAction(action, result, conversationId = null) {
    const actionContext = {
      action,
      result: result ? { success: result.success, type: result.type } : null,
      timestamp: Date.now()
    };

    await this.addContext(
      this.contextTypes.LAST_ACTION, 
      actionContext, 
      conversationId
    );
  }

  /**
   * Infer context type from key and value
   * @param {string} key - Context key
   * @param {*} value - Context value
   * @returns {string} Context type
   */
  inferContextType(key, value) {
    if (key.includes('location') || key.includes('place')) {
      return this.contextTypes.USER_LOCATION;
    } else if (key.includes('interest') || key.includes('topic')) {
      return this.contextTypes.USER_INTEREST;
    } else if (key.includes('action')) {
      return this.contextTypes.LAST_ACTION;
    } else if (key.includes('emotion') || key.includes('feeling')) {
      return this.contextTypes.EMOTIONAL_STATE;
    } else if (key.includes('time') || key.includes('temporal')) {
      return this.contextTypes.TEMPORAL_CONTEXT;
    }
    
    return 'general';
  }

  /**
   * Infer conversation topic from text
   * @param {string} text - Input text
   * @returns {string} Inferred topic or null
   */
  inferConversationTopic(text) {
    const topicKeywords = {
      travel: ['trip', 'travel', 'visit', 'vacation', 'journey'],
      weather: ['weather', 'temperature', 'climate', 'forecast'],
      finance: ['currency', 'exchange', 'money', 'financial', 'rates'],
      news: ['news', 'current events', 'happening', 'updates'],
      location: ['city', 'place', 'location', 'area', 'region']
    };

    const lowerText = text.toLowerCase();
    
    for (const [topic, keywords] of Object.entries(topicKeywords)) {
      if (keywords.some(keyword => lowerText.includes(keyword))) {
        return topic;
      }
    }

    return null;
  }

  /**
   * Check if context entry has expired
   * @param {Object} entry - Context entry
   * @returns {boolean} True if expired
   */
  isExpired(entry) {
    return Date.now() > entry.expiresAt;
  }

  /**
   * Prune oldest context entries
   * @param {Map} contextMap - Context map to prune
   */
  pruneOldestContext(contextMap) {
    const entries = Array.from(contextMap.entries());
    entries.sort((a, b) => a[1].timestamp - b[1].timestamp);
    
    // Remove oldest entries until we're under the limit
    while (contextMap.size >= this.maxContextEntries) {
      const [oldestKey] = entries.shift();
      contextMap.delete(oldestKey);
    }
  }

  /**
   * Set up periodic context cleanup
   */
  setupContextCleanup() {
    setInterval(() => {
      this.cleanupExpiredContext();
    }, 300000); // Clean every 5 minutes
  }

  /**
   * Clean up expired context entries
   */
  cleanupExpiredContext() {
    let cleanedCount = 0;

    // Clean global context
    for (const [key, entry] of this.globalContext) {
      if (this.isExpired(entry)) {
        this.globalContext.delete(key);
        cleanedCount++;
      }
    }

    // Clean conversation contexts
    for (const [conversationId, contextMap] of this.contexts) {
      for (const [key, entry] of contextMap) {
        if (this.isExpired(entry)) {
          contextMap.delete(key);
          cleanedCount++;
        }
      }
      
      // Remove empty conversation contexts
      if (contextMap.size === 0) {
        this.contexts.delete(conversationId);
      }
    }

    if (cleanedCount > 0) {
      logger.debug('Context cleanup completed', { cleanedEntries: cleanedCount });
    }
  }

  /**
   * Get context statistics
   * @returns {Object} Context statistics
   */
  getStatistics() {
    let totalEntries = this.globalContext.size;
    let activeConversations = 0;
    let expiredEntries = 0;

    // Count conversation contexts
    for (const contextMap of this.contexts.values()) {
      totalEntries += contextMap.size;
      activeConversations++;
      
      for (const entry of contextMap.values()) {
        if (this.isExpired(entry)) {
          expiredEntries++;
        }
      }
    }

    // Count expired global entries
    for (const entry of this.globalContext.values()) {
      if (this.isExpired(entry)) {
        expiredEntries++;
      }
    }

    return {
      totalEntries,
      activeConversations,
      expiredEntries,
      globalContextSize: this.globalContext.size,
      memoryUsage: process.memoryUsage().heapUsed
    };
  }
}