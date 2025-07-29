import { logger } from '../utils/logger.js';

/**
 * Advanced Entity Extractor for Phase 4
 * Extracts and maps entities from natural language input with:
 * - Named entity recognition
 * - Parameter type classification
 * - Contextual entity resolution
 * - Multi-format entity support
 */
export class EntityExtractor {
  constructor() {
    // Location entity patterns
    this.locationPatterns = [
      // City names with optional country/state
      /\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*),?\s*([A-Z]{2,3})?\b/g,
      // Specific location references
      /\b(here|there|this place|current location|my location)\b/gi,
      // Preposition-based location extraction
      /\b(?:in|to|at|from|near)\s+([A-Z][a-zA-Z\s]{2,30}?)(?:\s|$|,|\.|!|\?)/g,
      // Capital cities pattern
      /\b(Paris|London|Tokyo|Berlin|Rome|Madrid|Amsterdam|Vienna|Prague|Dublin|Stockholm|Copenhagen|Oslo|Helsinki|Brussels|Zurich|Geneva|Monaco|Luxembourg|Lisbon|Warsaw|Budapest|Zagreb|Ljubljana|Bratislava|Tallinn|Riga|Vilnius|Kiev|Moscow|Istanbul|Athens|Sofia|Bucharest|Belgrade|Sarajevo|Skopje|Tirana|Podgorica|Chisinau)\b/gi
    ];

    // Temporal patterns for time entity extraction
    this.temporalPatterns = [
      // Relative time
      /\b(today|tomorrow|yesterday|now|currently|right now)\b/gi,
      // Future references
      /\b(next|upcoming|soon|later|in the future)\s+(week|month|year|day)\b/gi,
      // Specific time periods
      /\b(spring|summer|fall|autumn|winter|morning|afternoon|evening|night)\b/gi,
      // Month names
      /\b(january|february|march|april|may|june|july|august|september|october|november|december)\b/gi,
      // Time expressions
      /\b(in|within|during|by)\s+(\d+\s+(?:minutes?|hours?|days?|weeks?|months?|years?))\b/gi
    ];

    // Currency patterns
    this.currencyPatterns = [
      // Currency codes
      /\b(USD|EUR|GBP|JPY|CAD|AUD|CHF|CNY|INR|KRW|BRL|MXN|RUB|SEK|NOK|DKK|PLN|CZK|HUF|SGD|HKD|NZD|ZAR|TRY|ILS|THB|PHP|MYR|IDR|VND)\b/gi,
      // Currency names
      /\b(dollar|euro|pound|yen|franc|yuan|rupee|won|real|peso|ruble|krona|krone|zloty|crown|forint)\b/gi,
      // Currency symbols in context
      /\$|€|£|¥|₹|₩|₽/g
    ];

    // Action patterns
    this.actionPatterns = [
      // Primary actions
      /\b(get|find|show|tell|give|provide|fetch|retrieve|check)\b/gi,
      // Planning actions
      /\b(plan|prepare|organize|schedule|arrange)\b/gi,
      // Analysis actions
      /\b(analyze|compare|evaluate|assess|review)\b/gi,
      // Information actions
      /\b(explain|describe|inform|brief|summarize)\b/gi,
      // Travel actions
      /\b(travel|visit|go to|trip to|journey to)\b/gi
    ];

    // Topic/category patterns
    this.topicPatterns = [
      // News categories
      /\b(business|technology|sports|entertainment|health|science|politics|world|local|breaking)\s*news\b/gi,
      // General topics
      /\b(weather|climate|temperature|forecast|conditions)\b/gi,
      /\b(currency|exchange rates?|forex|financial|economic)\b/gi,
      /\b(culture|cultural|lifestyle|food|dining|recreation)\b/gi,
      /\b(facts|trivia|information|details|insights)\b/gi
    ];

    // Quantity and measurement patterns
    this.quantityPatterns = [
      /\b(\d+)\s*(dollars?|euros?|pounds?|yen)\b/gi,
      /\b(\d+)\s*(days?|weeks?|months?|years?)\b/gi,
      /\b(\d+)\s*(people|persons?|travelers?)\b/gi
    ];

    // Sentiment and emotional state patterns
    this.emotionPatterns = [
      /\b(anxious|worried|stressed|overwhelmed|nervous|concerned)\b/gi,
      /\b(excited|happy|thrilled|eager|looking forward)\b/gi,
      /\b(confused|uncertain|unsure|wondering|thinking)\b/gi,
      /\b(tired|exhausted|feeling|mood)\b/gi
    ];

    this.initialized = true;
  }

  /**
   * Main entity extraction method
   * @param {string} text - Input text to analyze
   * @returns {Array} Array of extracted entities
   */
  async extractEntities(text) {
    try {
      logger.debug('Entity extraction started', { text });
      
      const entities = [];
      
      // Extract different types of entities
      entities.push(...this.extractLocations(text));
      entities.push(...this.extractTemporalEntities(text));
      entities.push(...this.extractCurrencies(text));
      entities.push(...this.extractActions(text));
      entities.push(...this.extractTopics(text));
      entities.push(...this.extractQuantities(text));
      entities.push(...this.extractEmotions(text));
      
      // Remove duplicates and resolve conflicts
      const cleanedEntities = this.deduplicateEntities(entities);
      
      // Add confidence scores and context
      const scoredEntities = this.scoreEntities(cleanedEntities, text);
      
      logger.debug('Entity extraction completed', { 
        count: scoredEntities.length,
        types: [...new Set(scoredEntities.map(e => e.type))]
      });
      
      return scoredEntities;
      
    } catch (error) {
      logger.error('Entity extraction failed', { error: error.message });
      return [];
    }
  }

  /**
   * Extract location entities
   * @param {string} text - Input text
   * @returns {Array} Location entities
   */
  extractLocations(text) {
    const locations = [];
    
    // Extract city/location references
    for (const pattern of this.locationPatterns) {
      let match;
      const regex = new RegExp(pattern.source, pattern.flags);
      
      while ((match = regex.exec(text)) !== null) {
        let value = match[1] || match[0];
        
        // Clean up the location value
        value = value.replace(/^(in|to|at|from|near)\s+/i, '').trim();
        
        if (value.length > 1) {
          locations.push({
            type: 'location',
            value: this.normalizeLocation(value),
            originalText: match[0],
            position: match.index,
            confidence: this.calculateLocationConfidence(value, text)
          });
        }
      }
    }
    
    return locations;
  }

  /**
   * Extract temporal entities
   * @param {string} text - Input text
   * @returns {Array} Temporal entities
   */
  extractTemporalEntities(text) {
    const timeEntities = [];
    
    for (const pattern of this.temporalPatterns) {
      let match;
      const regex = new RegExp(pattern.source, pattern.flags);
      
      while ((match = regex.exec(text)) !== null) {
        const value = match[0].toLowerCase().trim();
        
        if (value.length > 1) {
          timeEntities.push({
            type: 'time',
            value: this.normalizeTimeReference(value),
            originalText: match[0],
            position: match.index,
            confidence: 0.8
          });
        }
      }
    }
    
    return timeEntities;
  }

  /**
   * Extract currency entities
   * @param {string} text - Input text
   * @returns {Array} Currency entities
   */
  extractCurrencies(text) {
    const currencies = [];
    
    for (const pattern of this.currencyPatterns) {
      let match;
      const regex = new RegExp(pattern.source, pattern.flags);
      
      while ((match = regex.exec(text)) !== null) {
        const value = match[0].toUpperCase();
        
        currencies.push({
          type: 'currency',
          value: this.normalizeCurrency(value),
          originalText: match[0],
          position: match.index,
          confidence: 0.9
        });
      }
    }
    
    return currencies;
  }

  /**
   * Extract action entities
   * @param {string} text - Input text
   * @returns {Array} Action entities
   */
  extractActions(text) {
    const actions = [];
    
    for (const pattern of this.actionPatterns) {
      let match;
      const regex = new RegExp(pattern.source, pattern.flags);
      
      while ((match = regex.exec(text)) !== null) {
        const value = match[0].toLowerCase();
        
        actions.push({
          type: 'action',
          value: value,
          originalText: match[0],
          position: match.index,
          confidence: 0.7,
          category: this.categorizeAction(value)
        });
      }
    }
    
    return actions;
  }

  /**
   * Extract topic/category entities
   * @param {string} text - Input text
   * @returns {Array} Topic entities
   */
  extractTopics(text) {
    const topics = [];
    
    for (const pattern of this.topicPatterns) {
      let match;
      const regex = new RegExp(pattern.source, pattern.flags);
      
      while ((match = regex.exec(text)) !== null) {
        const value = match[0].toLowerCase();
        
        topics.push({
          type: 'topic',
          value: this.normalizeTopic(value),
          originalText: match[0],
          position: match.index,
          confidence: 0.8,
          category: this.categorizeTopic(value)
        });
      }
    }
    
    return topics;
  }

  /**
   * Extract quantity entities
   * @param {string} text - Input text
   * @returns {Array} Quantity entities
   */
  extractQuantities(text) {
    const quantities = [];
    
    for (const pattern of this.quantityPatterns) {
      let match;
      const regex = new RegExp(pattern.source, pattern.flags);
      
      while ((match = regex.exec(text)) !== null) {
        quantities.push({
          type: 'quantity',
          value: match[1],
          unit: match[2],
          originalText: match[0],
          position: match.index,
          confidence: 0.9
        });
      }
    }
    
    return quantities;
  }

  /**
   * Extract emotional state entities
   * @param {string} text - Input text
   * @returns {Array} Emotion entities
   */
  extractEmotions(text) {
    const emotions = [];
    
    for (const pattern of this.emotionPatterns) {
      let match;
      const regex = new RegExp(pattern.source, pattern.flags);
      
      while ((match = regex.exec(text)) !== null) {
        const value = match[0].toLowerCase();
        
        emotions.push({
          type: 'emotion',
          value: value,
          originalText: match[0],
          position: match.index,
          confidence: 0.8,
          sentiment: this.categorizeEmotion(value)
        });
      }
    }
    
    return emotions;
  }

  /**
   * Normalize location names
   * @param {string} location - Raw location string
   * @returns {string} Normalized location
   */
  normalizeLocation(location) {
    // Capitalize first letter of each word
    return location.split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ')
      .replace(/,\s*$/, ''); // Remove trailing comma
  }

  /**
   * Normalize time references
   * @param {string} timeRef - Raw time reference
   * @returns {string} Normalized time reference
   */
  normalizeTimeReference(timeRef) {
    const timeMap = {
      'now': 'current',
      'right now': 'current',
      'currently': 'current',
      'today': 'today',
      'tomorrow': 'tomorrow',
      'yesterday': 'yesterday'
    };
    
    return timeMap[timeRef.toLowerCase()] || timeRef.toLowerCase();
  }

  /**
   * Normalize currency codes
   * @param {string} currency - Raw currency string
   * @returns {string} Normalized currency code
   */
  normalizeCurrency(currency) {
    const currencyMap = {
      'DOLLAR': 'USD',
      'DOLLARS': 'USD',
      'EURO': 'EUR',
      'EUROS': 'EUR',
      'POUND': 'GBP',
      'POUNDS': 'GBP',
      'YEN': 'JPY',
      'FRANC': 'CHF',
      'YUAN': 'CNY',
      'RUPEE': 'INR',
      'WON': 'KRW'
    };
    
    return currencyMap[currency] || currency;
  }

  /**
   * Normalize topic names
   * @param {string} topic - Raw topic string
   * @returns {string} Normalized topic
   */
  normalizeTopic(topic) {
    return topic.toLowerCase().replace(/\s+/g, '_');
  }

  /**
   * Calculate location confidence based on context
   * @param {string} location - Location value
   * @param {string} text - Full text context
   * @returns {number} Confidence score
   */
  calculateLocationConfidence(location, text) {
    let confidence = 0.7;
    
    // Boost confidence for well-known cities
    const majorCities = ['paris', 'london', 'tokyo', 'new york', 'berlin', 'rome', 'madrid'];
    if (majorCities.includes(location.toLowerCase())) {
      confidence += 0.2;
    }
    
    // Boost confidence if preceded by location indicators
    if (/\b(?:in|to|at|from|near)\s+/i.test(text)) {
      confidence += 0.1;
    }
    
    // Reduce confidence for very short or common words
    if (location.length < 3 || ['me', 'my', 'it', 'and', 'the'].includes(location.toLowerCase())) {
      confidence -= 0.3;
    }
    
    return Math.max(0.1, Math.min(0.95, confidence));
  }

  /**
   * Categorize action types
   * @param {string} action - Action value
   * @returns {string} Action category
   */
  categorizeAction(action) {
    const categories = {
      information: ['get', 'find', 'show', 'tell', 'give', 'provide'],
      planning: ['plan', 'prepare', 'organize', 'schedule', 'arrange'],
      analysis: ['analyze', 'compare', 'evaluate', 'assess', 'review'],
      explanation: ['explain', 'describe', 'inform', 'brief', 'summarize']
    };
    
    for (const [category, actions] of Object.entries(categories)) {
      if (actions.includes(action)) return category;
    }
    
    return 'general';
  }

  /**
   * Categorize topic types
   * @param {string} topic - Topic value
   * @returns {string} Topic category
   */
  categorizeTopic(topic) {
    if (topic.includes('weather') || topic.includes('temperature')) return 'weather';
    if (topic.includes('news') || topic.includes('current')) return 'news';
    if (topic.includes('currency') || topic.includes('exchange')) return 'financial';
    if (topic.includes('culture') || topic.includes('food')) return 'cultural';
    if (topic.includes('fact') || topic.includes('trivia')) return 'informational';
    
    return 'general';
  }

  /**
   * Categorize emotional sentiment
   * @param {string} emotion - Emotion value
   * @returns {string} Sentiment category
   */
  categorizeEmotion(emotion) {
    const sentiments = {
      negative: ['anxious', 'worried', 'stressed', 'overwhelmed', 'nervous', 'concerned'],
      positive: ['excited', 'happy', 'thrilled', 'eager'],
      neutral: ['confused', 'uncertain', 'unsure', 'wondering', 'thinking', 'feeling']
    };
    
    for (const [sentiment, emotions] of Object.entries(sentiments)) {
      if (emotions.includes(emotion)) return sentiment;
    }
    
    return 'neutral';
  }

  /**
   * Remove duplicate entities and resolve conflicts
   * @param {Array} entities - Raw entities array
   * @returns {Array} Cleaned entities
   */
  deduplicateEntities(entities) {
    const seen = new Map();
    const cleaned = [];
    
    for (const entity of entities) {
      const key = `${entity.type}:${entity.value.toLowerCase()}`;
      
      if (!seen.has(key) || seen.get(key).confidence < entity.confidence) {
        seen.set(key, entity);
      }
    }
    
    return Array.from(seen.values());
  }

  /**
   * Add confidence scores and contextual information
   * @param {Array} entities - Cleaned entities
   * @param {string} text - Original text
   * @returns {Array} Scored entities
   */
  scoreEntities(entities, text) {
    return entities.map(entity => ({
      ...entity,
      contextualRelevance: this.calculateContextualRelevance(entity, text),
      extractionMethod: 'pattern_matching',
      validated: this.validateEntity(entity)
    })).sort((a, b) => b.confidence - a.confidence);
  }

  /**
   * Calculate contextual relevance of entity
   * @param {Object} entity - Entity object
   * @param {string} text - Full text context
   * @returns {number} Relevance score
   */
  calculateContextualRelevance(entity, text) {
    let relevance = 0.5;
    
    // Check proximity to keywords
    const keywords = {
      location: ['weather', 'travel', 'visit', 'go to', 'in', 'at'],
      time: ['when', 'schedule', 'plan', 'next', 'future'],
      currency: ['exchange', 'rate', 'convert', 'money', 'cost'],
      action: ['want', 'need', 'help', 'can you']
    };
    
    const entityKeywords = keywords[entity.type] || [];
    for (const keyword of entityKeywords) {
      if (text.toLowerCase().includes(keyword)) {
        relevance += 0.1;
      }
    }
    
    return Math.min(0.95, relevance);
  }

  /**
   * Validate entity extraction
   * @param {Object} entity - Entity to validate
   * @returns {boolean} Validation result
   */
  validateEntity(entity) {
    // Basic validation rules
    if (!entity.value || entity.value.length < 1) return false;
    if (entity.confidence < 0.3) return false;
    
    // Type-specific validation
    switch (entity.type) {
      case 'location':
        return entity.value.length > 1 && !/^\d+$/.test(entity.value);
      case 'currency':
        return /^[A-Z]{3}$/.test(entity.value) || entity.value.length > 2;
      case 'time':
        return entity.value.length > 2;
      default:
        return true;
    }
  }
}