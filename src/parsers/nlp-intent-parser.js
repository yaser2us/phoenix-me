import { EntityExtractor } from './entity-extractor.js';
import { logger } from '../utils/logger.js';

/**
 * Advanced NLP Intent Parser for Phase 4
 * Provides sophisticated natural language understanding with:
 * - Advanced intent classification
 * - Entity extraction and parameter mapping 
 * - Confidence scoring and ambiguity resolution
 * - Context-aware analysis
 * - Sentiment and emotion detection
 */
export class NLPIntentParser {
  constructor(registry, contextManager = null) {
    this.registry = registry;
    this.contextManager = contextManager;
    this.entityExtractor = new EntityExtractor();
    
    // Advanced intent patterns with semantic understanding
    this.intentPatterns = new Map([
      // Emotional/contextual weather requests
      ['weather_emotional', {
        patterns: [
          /feeling (cold|hot|warm|chilly|freezing)/i,
          /wondering about.*weather/i,
          /should I (go outside|wear|bring)/i,
          /(dress|clothing|outfit).*weather/i
        ],
        confidence: 0.85,
        complexity: 'contextual',
        workflow: 'location_weather',
        emotionalContext: true
      }],
      
      // Travel planning with uncertainty/anxiety
      ['travel_planning_emotional', {
        patterns: [
          /thinking about.*trip/i,
          /considering.*travel/i,
          /planning.*visit/i,
          /anxious about.*trip/i,
          /overwhelmed.*travel/i,
          /help.*preparing.*trip/i
        ],
        confidence: 0.9,
        complexity: 'complex',
        workflow: 'trip_planning',
        emotionalContext: true
      }],
      
      // Location exploration and discovery
      ['location_exploration', {
        patterns: [
          /don't know (much about|where I am)/i,
          /new (city|place|location)/i,
          /tell me about (here|this place)/i,
          /what's (happening|going on) in/i,
          /everything about.*location/i
        ],
        confidence: 0.8,
        complexity: 'comprehensive',
        workflow: 'comprehensive_location_info'
      }],
      
      // Financial/market inquiry with news correlation
      ['market_analysis', {
        patterns: [
          /what's happening.*tech news.*dollar/i,
          /how.*news.*affect.*currency/i,
          /market.*news.*impact/i,
          /financial.*current events/i
        ],
        confidence: 0.85,
        complexity: 'complex',
        workflow: 'market_overview'
      }],
      
      // Comparative analysis requests
      ['comparative_analysis', {
        patterns: [
          /compare.*cities/i,
          /difference between.*locations/i,
          /which is better/i,
          /pros and cons of/i
        ],
        confidence: 0.75,
        complexity: 'complex',
        requiresCustomWorkflow: true
      }],
      
      // Help and preparation requests
      ['assistance_request', {
        patterns: [
          /help me (prepare|understand|research)/i,
          /need help (with|preparing)/i,
          /can you help/i,
          /assist me/i
        ],
        confidence: 0.7,
        complexity: 'variable',
        requiresAnalysis: true
      }]
    ]);

    // Sentiment indicators
    this.sentimentPatterns = {
      positive: [/excited/i, /happy/i, /great/i, /wonderful/i, /looking forward/i],
      negative: [/anxious/i, /worried/i, /stressed/i, /overwhelmed/i, /nervous/i],
      neutral: [/wondering/i, /thinking/i, /considering/i, /planning/i],
      urgent: [/urgent/i, /quickly/i, /asap/i, /right now/i, /immediately/i]
    };

    // Temporal context patterns
    this.temporalPatterns = {
      immediate: [/now/i, /currently/i, /right now/i, /today/i],
      near_future: [/tomorrow/i, /next week/i, /soon/i, /upcoming/i],
      far_future: [/next month/i, /next year/i, /in spring/i, /eventually/i],
      past: [/yesterday/i, /last week/i, /before/i, /previously/i]
    };

    this.initialized = true;
  }

  /**
   * Main entry point for advanced intent analysis
   * @param {string} userInput - Raw user input text
   * @param {Object} conversationContext - Optional conversation context
   * @returns {Object} Comprehensive intent analysis
   */
  async analyzeIntent(userInput, conversationContext = null) {
    try {
      logger.debug('Advanced NLP analysis started', { input: userInput });
      
      // 1. Preprocess and normalize input
      const processedInput = this.preprocessInput(userInput);
      
      // 2. Extract entities and parameters
      const entities = await this.entityExtractor.extractEntities(processedInput);
      
      // 3. Analyze sentiment and emotional context
      const sentimentAnalysis = this.analyzeSentiment(processedInput);
      
      // 4. Detect temporal context
      const temporalContext = this.analyzeTemporalContext(processedInput);
      
      // 5. Classify intent with confidence scoring
      const intentClassification = this.classifyIntent(processedInput, entities);
      
      // 6. Resolve ambiguities using context
      const contextualResolution = await this.resolveWithContext(
        processedInput, 
        intentClassification, 
        entities, 
        conversationContext
      );
      
      // 7. Determine complexity and workflow requirements
      const complexityAnalysis = this.analyzeComplexity(
        processedInput, 
        entities, 
        intentClassification
      );
      
      // 8. Build comprehensive analysis result
      const analysis = {
        originalInput: userInput,
        processedInput: processedInput,
        intendedAction: contextualResolution.intendedAction,
        confidence: contextualResolution.confidence,
        extractedEntities: entities,
        sentiment: sentimentAnalysis,
        temporalContext: temporalContext,
        complexity: complexityAnalysis.level,
        matchedWorkflow: contextualResolution.workflow,
        requiresCustomWorkflow: complexityAnalysis.requiresCustom,
        suggestedParameters: contextualResolution.parameters,
        emotionalContext: sentimentAnalysis.hasEmotion,
        ambiguityLevel: contextualResolution.ambiguityLevel,
        contextResolution: contextualResolution.contextUsed,
        explanation: this.generateExplanation(contextualResolution, complexityAnalysis)
      };
      
      logger.debug('Advanced NLP analysis completed', { 
        action: analysis.intendedAction, 
        confidence: analysis.confidence 
      });
      
      return analysis;
      
    } catch (error) {
      logger.error('NLP intent analysis failed', { error: error.message });
      return this.createFallbackAnalysis(userInput, error);
    }
  }

  /**
   * Analyze intent with conversation context awareness
   * @param {string} userInput - User input
   * @param {Object} context - Conversation context
   * @returns {Object} Context-aware analysis
   */
  async analyzeIntentWithContext(userInput, context) {
    // Enhance input with contextual information
    const contextualInput = await this.enhanceWithContext(userInput, context);
    
    // Perform standard analysis with enhanced input
    const analysis = await this.analyzeIntent(contextualInput, context);
    
    // Add context-specific fields
    analysis.contextEnhanced = true;
    analysis.resolvedLocation = context?.user_location || null;
    analysis.contextSource = context ? 'conversation_context' : 'none';
    
    return analysis;
  }

  /**
   * Preprocess and normalize user input
   * @param {string} input - Raw user input
   * @returns {string} Processed input
   */
  preprocessInput(input) {
    return input
      .trim()
      .replace(/\s+/g, ' ')  // Normalize whitespace
      .replace(/[?!.]+$/, '') // Remove trailing punctuation
      .toLowerCase();
  }

  /**
   * Analyze sentiment and emotional context
   * @param {string} input - Processed input
   * @returns {Object} Sentiment analysis
   */
  analyzeSentiment(input) {
    const sentiment = {
      type: 'neutral',
      intensity: 0.5,
      hasEmotion: false,
      emotionalIndicators: []
    };

    // Check for sentiment patterns
    for (const [type, patterns] of Object.entries(this.sentimentPatterns)) {
      for (const pattern of patterns) {
        if (pattern.test(input)) {
          sentiment.type = type;
          sentiment.hasEmotion = true;
          sentiment.emotionalIndicators.push(pattern.source);
          sentiment.intensity = type === 'urgent' ? 0.9 : 
                               type === 'negative' ? 0.7 : 
                               type === 'positive' ? 0.8 : 0.5;
          break;
        }
      }
      if (sentiment.hasEmotion) break;
    }

    return sentiment;
  }

  /**
   * Analyze temporal context in the input
   * @param {string} input - Processed input
   * @returns {Object} Temporal analysis
   */
  analyzeTemporalContext(input) {
    const temporal = {
      timeframe: 'present',
      hasTemporalReference: false,
      temporalIndicators: []
    };

    for (const [timeframe, patterns] of Object.entries(this.temporalPatterns)) {
      for (const pattern of patterns) {
        if (pattern.test(input)) {
          temporal.timeframe = timeframe;
          temporal.hasTemporalReference = true;
          temporal.temporalIndicators.push(pattern.source);
          break;
        }
      }
      if (temporal.hasTemporalReference) break;
    }

    return temporal;
  }

  /**
   * Classify the intent using pattern matching
   * @param {string} input - Processed input
   * @param {Array} entities - Extracted entities
   * @returns {Object} Intent classification
   */
  classifyIntent(input, entities) {
    let bestMatch = {
      intentType: 'unknown',
      confidence: 0.3,
      workflow: null,
      pattern: null
    };

    // Match against advanced intent patterns
    for (const [intentType, config] of this.intentPatterns) {
      for (const pattern of config.patterns) {
        if (pattern.test(input)) {
          const confidence = config.confidence;
          
          // Boost confidence if entities support the intent
          const entityBoost = this.calculateEntityBoost(entities, intentType);
          const finalConfidence = Math.min(0.95, confidence + entityBoost);
          
          if (finalConfidence > bestMatch.confidence) {
            bestMatch = {
              intentType,
              confidence: finalConfidence,
              workflow: config.workflow,
              pattern: pattern.source,
              complexity: config.complexity,
              emotionalContext: config.emotionalContext,
              requiresCustomWorkflow: config.requiresCustomWorkflow
            };
          }
        }
      }
    }

    return bestMatch;
  }

  /**
   * Calculate confidence boost based on supporting entities
   * @param {Array} entities - Extracted entities
   * @param {string} intentType - Classified intent type
   * @returns {number} Confidence boost (0-0.2)
   */
  calculateEntityBoost(entities, intentType) {
    const entityTypes = entities.map(e => e.type);
    
    const boostMap = {
      'weather_emotional': entityTypes.includes('location') ? 0.1 : 0,
      'travel_planning_emotional': entityTypes.includes('location') || entityTypes.includes('time') ? 0.15 : 0,
      'location_exploration': entityTypes.includes('location') ? 0.1 : 0,
      'market_analysis': entityTypes.includes('currency') || entityTypes.includes('topic') ? 0.1 : 0
    };

    return boostMap[intentType] || 0;
  }

  /**
   * Resolve ambiguities using conversation context
   * @param {string} input - Processed input
   * @param {Object} classification - Intent classification
   * @param {Array} entities - Extracted entities
   * @param {Object} context - Conversation context
   * @returns {Object} Resolved intent
   */
  async resolveWithContext(input, classification, entities, context) {
    const resolution = {
      intendedAction: classification.intentType,
      confidence: classification.confidence,
      workflow: classification.workflow,
      parameters: this.mapEntitiesToParameters(entities),
      ambiguityLevel: 'low',
      contextUsed: false
    };

    // Use context to resolve ambiguities
    if (context && this.contextManager) {
      // Resolve location references
      if (!resolution.parameters.location && context.user_location) {
        resolution.parameters.location = context.user_location;
        resolution.contextUsed = true;
      }

      // Resolve pronoun references ("there", "that place")
      const resolvedInput = await this.resolvePronouns(input, context);
      if (resolvedInput !== input) {
        resolution.contextUsed = true;
        // Re-extract entities from resolved input
        const newEntities = await this.entityExtractor.extractEntities(resolvedInput);
        resolution.parameters = {
          ...resolution.parameters,
          ...this.mapEntitiesToParameters(newEntities)
        };
      }
    }

    // Assess ambiguity level
    if (!resolution.parameters.location && classification.intentType.includes('location')) {
      resolution.ambiguityLevel = 'high';
      resolution.confidence *= 0.8; // Reduce confidence for ambiguous requests
    }

    return resolution;
  }

  /**
   * Resolve pronouns and references using context
   * @param {string} text - Input text
   * @param {Object} context - Conversation context
   * @returns {string} Text with resolved references
   */
  async resolvePronouns(text, context) {
    let resolvedText = text;

    // Resolve location references
    if (context.user_location) {
      resolvedText = resolvedText.replace(/\b(there|that place|this city)\b/gi, context.user_location);
    }

    // Resolve topic references
    if (context.user_interest) {
      resolvedText = resolvedText.replace(/\b(that|it|this topic)\b/gi, context.user_interest);
    }

    return resolvedText;
  }

  /**
   * Map extracted entities to workflow parameters
   * @param {Array} entities - Extracted entities
   * @returns {Object} Parameter mapping
   */
  mapEntitiesToParameters(entities) {
    const parameters = {};

    for (const entity of entities) {
      switch (entity.type) {
        case 'location':
          parameters.location = entity.value;
          parameters.q = entity.value; // For weather API compatibility
          break;
        case 'time':
          parameters.timeframe = entity.value;
          break;
        case 'currency':
          parameters.base = entity.value;
          break;
        case 'topic':
          parameters.category = entity.value;
          break;
        case 'action':
          parameters.action = entity.value;
          break;
      }
    }

    return parameters;
  }

  /**
   * Analyze request complexity
   * @param {string} input - Processed input
   * @param {Array} entities - Extracted entities
   * @param {Object} classification - Intent classification
   * @returns {Object} Complexity analysis
   */
  analyzeComplexity(input, entities, classification) {
    const analysis = {
      level: 'simple',
      requiresCustom: false,
      estimatedSteps: 1,
      informationDomains: []
    };

    // Count information domains requested
    const domainKeywords = {
      weather: /weather|temperature|climate|rain|snow|sunny/i,
      location: /location|place|city|where|here/i,
      currency: /currency|exchange|dollar|euro|money/i,
      news: /news|happening|events|current/i,
      facts: /facts|information|about|details/i
    };

    for (const [domain, pattern] of Object.entries(domainKeywords)) {
      if (pattern.test(input)) {
        analysis.informationDomains.push(domain);
      }
    }

    // Determine complexity level
    if (analysis.informationDomains.length > 2) {
      analysis.level = 'complex';
      analysis.estimatedSteps = analysis.informationDomains.length;
    } else if (analysis.informationDomains.length === 2) {
      analysis.level = 'moderate';
      analysis.estimatedSteps = 2;
    }

    // Check if requires custom workflow
    if (classification.requiresCustomWorkflow || 
        input.includes('compare') || 
        input.includes('everything') ||
        analysis.informationDomains.length > 3) {
      analysis.requiresCustom = true;
    }

    return analysis;
  }

  /**
   * Enhance input with contextual information
   * @param {string} input - User input
   * @param {Object} context - Conversation context
   * @returns {string} Enhanced input
   */
  async enhanceWithContext(input, context) {
    let enhanced = input;

    // Add location context if missing and relevant
    if (!input.includes('location') && !input.includes('city') && context?.user_location) {
      if (input.includes('weather') || input.includes('here')) {
        enhanced = `${enhanced} in ${context.user_location}`;
      }
    }

    return enhanced;
  }

  /**
   * Generate human-readable explanation of the analysis
   * @param {Object} resolution - Intent resolution
   * @param {Object} complexity - Complexity analysis
   * @returns {string} Explanation
   */
  generateExplanation(resolution, complexity) {
    const parts = [];
    
    parts.push(`Understood as: ${resolution.intendedAction.replace(/_/g, ' ')}`);
    parts.push(`Confidence: ${(resolution.confidence * 100).toFixed(1)}%`);
    parts.push(`Complexity: ${complexity.level}`);
    
    if (resolution.contextUsed) {
      parts.push('Used conversation context for resolution');
    }
    
    if (complexity.requiresCustom) {
      parts.push('Requires custom workflow creation');
    }

    return parts.join(', ');
  }

  /**
   * Create fallback analysis for failed processing
   * @param {string} input - Original input
   * @param {Error} error - Processing error
   * @returns {Object} Fallback analysis
   */
  createFallbackAnalysis(input, error) {
    return {
      originalInput: input,
      intendedAction: 'parse_error',
      confidence: 0.1,
      extractedEntities: [],
      sentiment: { type: 'neutral', hasEmotion: false },
      complexity: 'unknown',
      matchedWorkflow: null,
      error: error.message,
      fallback: true,
      explanation: `Failed to analyze input: ${error.message}`
    };
  }

  /**
   * Check backward compatibility with Phase 3 simple intents
   * @param {string} input - User input
   * @returns {Object} Simple intent analysis for compatibility
   */
  async analyzeSimpleIntent(input) {
    // Check for simple weather pattern
    if (/weather.*in\s+([a-zA-Z\s]+)/i.test(input)) {
      const match = input.match(/weather.*in\s+([a-zA-Z\s]+)/i);
      return {
        originalInput: input,
        intendedAction: 'simple_weather',
        confidence: 0.9,
        matchedWorkflow: 'getCurrentWeather',
        extractedEntities: [{ type: 'location', value: match[1].trim() }],
        backward_compatible: true
      };
    }

    // Fallback to advanced analysis
    return await this.analyzeIntent(input);
  }
}