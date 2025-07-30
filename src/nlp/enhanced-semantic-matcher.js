import { logger } from '../utils/logger.js';

/**
 * Enhanced Semantic Intent Matcher - Advanced NLP for multi-domain intent recognition
 * Handles complex intent classification, confidence scoring, and ambiguity resolution
 */
export class EnhancedSemanticMatcher {
  constructor(apiRegistry) {
    this.apiRegistry = apiRegistry;
    this.logger = logger;
    
    // Initialize semantic knowledge base
    this.semanticKnowledge = this.buildSemanticKnowledge();
    this.contextHistory = [];
    this.userPatterns = new Map();
  }

  /**
   * Performs advanced semantic matching for user intents
   * @param {string} userIntent - Natural language request
   * @param {Object} context - User context and conversation history
   * @returns {Object} Enhanced matching results with confidence scores
   */
  async performSemanticMatching(userIntent, context = {}) {
    try {
      const result = {
        originalIntent: userIntent,
        normalizedIntent: this.normalizeIntent(userIntent),
        matchResults: [],
        confidence: 0,
        ambiguity: {
          detected: false,
          alternatives: [],
          resolution: null
        },
        context: {
          domains: [],
          entities: [],
          sentiment: 'neutral'
        }
      };

      // 1. Extract entities and context
      const entities = this.extractEntities(userIntent);
      result.context.entities = entities;
      
      // 2. Detect domains
      const domains = this.detectDomains(userIntent, entities);
      result.context.domains = domains;
      
      // 3. Analyze sentiment
      result.context.sentiment = this.analyzeSentiment(userIntent);
      
      // 4. Perform multi-level semantic matching
      const matches = await this.performMultiLevelMatching(userIntent, entities, domains, context);
      result.matchResults = matches;
      
      // 5. Calculate overall confidence
      result.confidence = this.calculateOverallConfidence(matches);
      
      // 6. Detect and resolve ambiguity
      const ambiguityResult = this.detectAmbiguity(matches, userIntent);
      result.ambiguity = ambiguityResult;
      
      // 7. Apply context-aware improvements
      this.applyContextualImprovements(result, context);
      
      // 8. Learn from user patterns
      this.learnFromIntent(userIntent, result);
      
      return result;
      
    } catch (error) {
      this.logger.error('Semantic matching failed:', error);
      throw error;
    }
  }

  /**
   * Builds comprehensive semantic knowledge base
   * @private
   */
  buildSemanticKnowledge() {
    return {
      domains: {
        banking: {
          keywords: ['account', 'balance', 'transfer', 'money', 'bank', 'payment', 'deposit', 'withdraw', 'transaction'],
          synonyms: {
            'balance': ['amount', 'funds', 'total', 'sum'],
            'transfer': ['send', 'move', 'pay', 'remit'],
            'account': ['wallet', 'profile', 'banking']
          },
          operations: ['check_balance', 'account_summary', 'transfer_money', 'transaction_history'],
          patterns: [
            /check.*balance|balance.*check|my.*balance/i,
            /transfer.*money|send.*money|pay.*to/i,
            /account.*summary|banking.*summary/i
          ]
        },
        weather: {
          keywords: ['weather', 'temperature', 'rain', 'sunny', 'cloudy', 'forecast', 'climate'],
          synonyms: {
            'weather': ['climate', 'conditions', 'forecast'],
            'rain': ['precipitation', 'shower', 'drizzle'],
            'sunny': ['clear', 'bright', 'sunshine']
          },
          operations: ['check_weather', 'location_weather', 'weather_forecast'],
          patterns: [
            /weather|temperature|forecast|rain|sunny|cloudy/i,
            /weather.*in|weather.*for|weather.*at/i
          ]
        },
        location: {
          keywords: ['restaurant', 'food', 'eat', 'dining', 'atm', 'nearby', 'around', 'close', 'near'],
          synonyms: {
            'restaurant': ['cafe', 'diner', 'eatery', 'food place'],
            'nearby': ['close', 'around', 'local', 'adjacent'],
            'food': ['meal', 'dining', 'cuisine']
          },
          operations: ['find_restaurants', 'find_atms', 'location_search'],
          patterns: [
            /restaurant|food|eat|dining/i,
            /atm|cash|withdraw/i,
            /nearby|around|close|near/i
          ]
        },
        currency: {
          keywords: ['exchange', 'rate', 'currency', 'convert', 'usd', 'myr', 'sgd', 'eur'],
          synonyms: {
            'exchange': ['convert', 'change', 'swap'],
            'rate': ['price', 'value', 'conversion']
          },
          operations: ['currency_exchange', 'exchange_rates'],
          patterns: [
            /exchange.*rate|currency.*rate|convert.*currency/i,
            /usd.*to|myr.*to|exchange.*usd/i
          ]
        }
      },
      
      entities: {
        location: {
          patterns: [
            /in\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/g,
            /at\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/g,
            /for\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/g
          ],
          cities: ['Kuala Lumpur', 'Singapore', 'Bangkok', 'Jakarta', 'Manila']
        },
        currency: {
          patterns: [
            /\b(USD|MYR|SGD|EUR|GBP|JPY|CNY|THB|IDR|PHP)\b/gi,
            /\$([\d,]+(?:\.\d{2})?)/g
          ]
        },
        amount: {
          patterns: [
            /\$([\d,]+(?:\.\d{2})?)/g,
            /(\d+(?:,\d{3})*(?:\.\d{2})?)\s*(?:dollars?|ringgit|sgd)/gi
          ]
        },
        person: {
          patterns: [
            /to\s+([A-Z][a-z]+)/g,
            /for\s+([A-Z][a-z]+)/g
          ]
        }
      },
      
      intentModifiers: {
        urgency: {
          high: ['urgent', 'immediately', 'asap', 'now', 'quick'],
          low: ['later', 'whenever', 'eventually']
        },
        certainty: {
          high: ['definitely', 'certainly', 'sure', 'confirm'],
          low: ['maybe', 'possibly', 'perhaps', 'might']
        },
        quantity: {
          single: ['a', 'one', 'single'],
          multiple: ['all', 'every', 'multiple', 'several']
        }
      }
    };
  }

  /**
   * Extracts entities from user intent
   * @private
   */
  extractEntities(userIntent) {
    const entities = {
      locations: [],
      currencies: [],
      amounts: [],
      people: [],
      dates: [],
      times: []
    };

    const entityTypes = this.semanticKnowledge.entities;

    // Extract locations
    for (const pattern of entityTypes.location.patterns) {
      const matches = [...userIntent.matchAll(pattern)];
      matches.forEach(match => {
        if (match[1] && !entities.locations.includes(match[1])) {
          entities.locations.push(match[1]);
        }
      });
    }

    // Extract currencies
    for (const pattern of entityTypes.currency.patterns) {
      const matches = [...userIntent.matchAll(pattern)];
      matches.forEach(match => {
        const currency = match[1] || match[0];
        if (currency && !entities.currencies.includes(currency)) {
          entities.currencies.push(currency.toUpperCase());
        }
      });
    }

    // Extract amounts
    for (const pattern of entityTypes.amount.patterns) {
      const matches = [...userIntent.matchAll(pattern)];
      matches.forEach(match => {
        if (match[1] && !entities.amounts.includes(match[1])) {
          entities.amounts.push(match[1]);
        }
      });
    }

    // Extract people
    for (const pattern of entityTypes.person.patterns) {
      const matches = [...userIntent.matchAll(pattern)];
      matches.forEach(match => {
        if (match[1] && !entities.people.includes(match[1])) {
          entities.people.push(match[1]);
        }
      });
    }

    return entities;
  }

  /**
   * Detects domains present in the intent
   * @private
   */
  detectDomains(userIntent, entities) {
    const domains = [];
    const intentLower = userIntent.toLowerCase();

    for (const [domainName, domainData] of Object.entries(this.semanticKnowledge.domains)) {
      let domainScore = 0;
      let matches = [];

      // Check keywords
      for (const keyword of domainData.keywords) {
        if (intentLower.includes(keyword)) {
          domainScore += 1;
          matches.push({ type: 'keyword', value: keyword, score: 1 });
        }
      }

      // Check synonyms
      for (const [term, synonyms] of Object.entries(domainData.synonyms)) {
        if (intentLower.includes(term)) {
          domainScore += 0.8;
          matches.push({ type: 'synonym', value: term, score: 0.8 });
        }
        
        for (const synonym of synonyms) {
          if (intentLower.includes(synonym)) {
            domainScore += 0.6;
            matches.push({ type: 'synonym', value: synonym, score: 0.6 });
          }
        }
      }

      // Check pattern matches
      for (const pattern of domainData.patterns) {
        if (pattern.test(userIntent)) {
          domainScore += 1.5;
          matches.push({ type: 'pattern', value: pattern.toString(), score: 1.5 });
        }
      }

      // Entity-based domain detection
      if (domainName === 'location' && (entities.locations.length > 0)) {
        domainScore += 1;
        matches.push({ type: 'entity', value: 'location', score: 1 });
      }
      
      if (domainName === 'currency' && (entities.currencies.length > 0)) {
        domainScore += 1;
        matches.push({ type: 'entity', value: 'currency', score: 1 });
      }

      if (domainScore > 0.5) {
        domains.push({
          domain: domainName,
          confidence: Math.min(domainScore / 3, 1), // Normalize to 0-1
          matches: matches,
          operations: domainData.operations
        });
      }
    }

    // Sort by confidence
    return domains.sort((a, b) => b.confidence - a.confidence);
  }

  /**
   * Analyzes sentiment of the user intent
   * @private
   */
  analyzeSentiment(userIntent) {
    const positiveWords = ['please', 'thank', 'help', 'good', 'great', 'excellent', 'perfect'];
    const negativeWords = ['problem', 'issue', 'wrong', 'error', 'bad', 'terrible', 'awful'];
    const urgentWords = ['urgent', 'asap', 'immediately', 'quick', 'fast', 'now'];

    const intentLower = userIntent.toLowerCase();
    
    let positiveScore = 0;
    let negativeScore = 0;
    let urgencyScore = 0;

    positiveWords.forEach(word => {
      if (intentLower.includes(word)) positiveScore++;
    });

    negativeWords.forEach(word => {
      if (intentLower.includes(word)) negativeScore++;
    });

    urgentWords.forEach(word => {
      if (intentLower.includes(word)) urgencyScore++;
    });

    if (urgencyScore > 0) return 'urgent';
    if (positiveScore > negativeScore) return 'positive';
    if (negativeScore > positiveScore) return 'negative';
    return 'neutral';
  }

  /**
   * Performs multi-level semantic matching
   * @private
   */
  async performMultiLevelMatching(userIntent, entities, domains, context) {
    const matches = [];

    // Level 1: Direct API operation matching
    const directMatches = await this.performDirectMatching(userIntent);
    matches.push(...directMatches.map(m => ({ ...m, level: 'direct' })));

    // Level 2: Domain-based matching
    const domainMatches = this.performDomainMatching(domains, entities);
    matches.push(...domainMatches.map(m => ({ ...m, level: 'domain' })));

    // Level 3: Semantic similarity matching
    const semanticMatches = this.performSemanticSimilarityMatching(userIntent, entities);
    matches.push(...semanticMatches.map(m => ({ ...m, level: 'semantic' })));

    // Level 4: Context-aware matching
    const contextMatches = this.performContextAwareMatching(userIntent, context);
    matches.push(...contextMatches.map(m => ({ ...m, level: 'context' })));

    // Remove duplicates and sort by confidence
    const uniqueMatches = this.deduplicateMatches(matches);
    return uniqueMatches.sort((a, b) => b.confidence - a.confidence);
  }

  /**
   * Performs direct API operation matching
   * @private
   */
  async performDirectMatching(userIntent) {
    const matches = [];
    const operations = this.apiRegistry.findOperationsByIntent(userIntent);

    for (const operation of operations.slice(0, 5)) { // Top 5 matches
      matches.push({
        operationId: operation.operationId,
        apiId: operation.apiId,
        operation: operation.operation,
        confidence: operation.confidence,
        matchType: 'direct_api',
        reasoning: 'Direct API operation match'
      });
    }

    return matches;
  }

  /**
   * Performs domain-based matching
   * @private
   */
  performDomainMatching(domains, entities) {
    const matches = [];

    for (const domainInfo of domains) {
      for (const operationId of domainInfo.operations) {
        // Try to find the operation in the registry
        const operation = this.apiRegistry.getOperation(operationId);
        
        if (operation) {
          matches.push({
            operationId: operationId,
            apiId: operation.apiId,
            operation: operation,
            confidence: domainInfo.confidence * 0.8, // Slightly lower than direct match
            matchType: 'domain_based',
            domain: domainInfo.domain,
            reasoning: `Matched via ${domainInfo.domain} domain`
          });
        } else {
          // Create a placeholder match for operations we know about but don't have in registry
          matches.push({
            operationId: operationId,
            apiId: 'unknown',
            operation: { operationId, summary: `${domainInfo.domain} operation` },
            confidence: domainInfo.confidence * 0.6,
            matchType: 'domain_placeholder',
            domain: domainInfo.domain,
            reasoning: `Inferred ${domainInfo.domain} operation`
          });
        }
      }
    }

    return matches;
  }

  /**
   * Performs semantic similarity matching
   * @private
   */
  performSemanticSimilarityMatching(userIntent, entities) {
    const matches = [];
    const intentWords = this.tokenizeIntent(userIntent);

    // Get all available operations
    const allOperations = this.apiRegistry.getAllOperations();

    for (const [apiId, operations] of Object.entries(allOperations)) {
      for (const [operationId, operation] of Object.entries(operations)) {
        const similarity = this.calculateSemanticSimilarity(intentWords, operation, entities);
        
        if (similarity > 0.4) {
          matches.push({
            operationId: operationId,
            apiId: apiId,
            operation: operation,
            confidence: similarity,
            matchType: 'semantic_similarity',
            reasoning: `Semantic similarity: ${(similarity * 100).toFixed(0)}%`
          });
        }
      }
    }

    return matches;
  }

  /**
   * Performs context-aware matching based on conversation history
   * @private
   */
  performContextAwareMatching(userIntent, context) {
    const matches = [];

    // Check conversation history for context
    if (this.contextHistory.length > 0) {
      const lastContext = this.contextHistory[this.contextHistory.length - 1];
      
      // If previous intent was similar, boost confidence
      if (lastContext.domains) {
        for (const domain of lastContext.domains) {
          if (userIntent.toLowerCase().includes(domain)) {
            // Find operations for this domain
            const domainOps = this.semanticKnowledge.domains[domain]?.operations || [];
            
            for (const opId of domainOps) {
              const operation = this.apiRegistry.getOperation(opId);
              if (operation) {
                matches.push({
                  operationId: opId,
                  apiId: operation.apiId,
                  operation: operation,
                  confidence: 0.7,
                  matchType: 'context_continuity',
                  reasoning: `Context continuation from previous ${domain} intent`
                });
              }
            }
          }
        }
      }
    }

    // User pattern matching
    if (this.userPatterns.has(userIntent.toLowerCase())) {
      const pattern = this.userPatterns.get(userIntent.toLowerCase());
      matches.push(...pattern.operations.map(op => ({
        ...op,
        confidence: op.confidence * 1.1, // Boost for learned patterns
        matchType: 'learned_pattern',
        reasoning: 'Learned from user pattern'
      })));
    }

    return matches;
  }

  /**
   * Calculates semantic similarity between intent and operation
   * @private
   */
  calculateSemanticSimilarity(intentWords, operation, entities) {
    let similarity = 0;
    const opText = (operation.operationId + ' ' + (operation.summary || '')).toLowerCase();
    const opWords = this.tokenizeIntent(opText);

    // Word overlap score
    const commonWords = intentWords.filter(word => opWords.includes(word));
    const wordOverlap = commonWords.length / Math.max(intentWords.length, opWords.length);
    similarity += wordOverlap * 0.4;

    // Synonym matching
    for (const [domain, domainData] of Object.entries(this.semanticKnowledge.domains)) {
      for (const [term, synonyms] of Object.entries(domainData.synonyms)) {
        if (intentWords.includes(term) && opWords.some(w => synonyms.includes(w))) {
          similarity += 0.2;
        }
      }
    }

    // Entity matching bonus
    if (entities.locations.length > 0 && opText.includes('location')) {
      similarity += 0.2;
    }
    if (entities.currencies.length > 0 && opText.includes('currency')) {
      similarity += 0.2;
    }

    return Math.min(similarity, 1);
  }

  /**
   * Detects ambiguity in matching results
   * @private
   */
  detectAmbiguity(matches, userIntent) {
    const result = {
      detected: false,
      alternatives: [],
      resolution: null,
      confidence: 0
    };

    if (matches.length === 0) {
      result.detected = true;
      result.resolution = 'no_matches';
      return result;
    }

    // Check for multiple high-confidence matches
    const highConfidenceMatches = matches.filter(m => m.confidence > 0.7);
    
    if (highConfidenceMatches.length > 1) {
      const topConfidence = highConfidenceMatches[0].confidence;
      const similarConfidenceMatches = highConfidenceMatches.filter(
        m => Math.abs(m.confidence - topConfidence) < 0.1
      );

      if (similarConfidenceMatches.length > 1) {
        result.detected = true;
        result.alternatives = similarConfidenceMatches.map(m => ({
          operationId: m.operationId,
          domain: m.domain,
          confidence: m.confidence,
          reasoning: m.reasoning
        }));

        // Try to resolve ambiguity
        result.resolution = this.resolveAmbiguity(similarConfidenceMatches, userIntent);
      }
    }

    // Check for domain conflicts
    const domains = [...new Set(matches.map(m => m.domain).filter(Boolean))];
    if (domains.length > 2) {
      result.detected = true;
      result.resolution = 'domain_conflict';
    }

    return result;
  }

  /**
   * Attempts to resolve detected ambiguity
   * @private
   */
  resolveAmbiguity(ambiguousMatches, userIntent) {
    // Resolution strategies
    
    // 1. Prefer more specific operations
    const specificityScores = ambiguousMatches.map(match => {
      const paramCount = match.operation.parameters?.length || 0;
      return { match, specificity: paramCount };
    });
    
    const mostSpecific = specificityScores.reduce((max, current) => 
      current.specificity > max.specificity ? current : max
    );

    if (mostSpecific.specificity > 0) {
      return {
        strategy: 'specificity',
        chosen: mostSpecific.match,
        reason: 'Selected most specific operation'
      };
    }

    // 2. Prefer recent domain context
    if (this.contextHistory.length > 0) {
      const recentDomains = this.contextHistory.slice(-3).flatMap(h => h.domains || []);
      
      for (const match of ambiguousMatches) {
        if (match.domain && recentDomains.includes(match.domain)) {
          return {
            strategy: 'context_continuity',
            chosen: match,
            reason: `Continued from recent ${match.domain} context`
          };
        }
      }
    }

    // 3. Default to highest confidence
    return {
      strategy: 'confidence',
      chosen: ambiguousMatches[0],
      reason: 'Selected highest confidence match'
    };
  }

  /**
   * Applies contextual improvements to results
   * @private
   */
  applyContextualImprovements(result, context) {
    // Boost confidence for operations that match user's typical patterns
    if (context.userProfile) {
      result.matchResults.forEach(match => {
        if (context.userProfile.frequentOperations?.includes(match.operationId)) {
          match.confidence = Math.min(match.confidence * 1.2, 1);
          match.reasoning += ' (frequent user operation)';
        }
      });
    }

    // Time-based adjustments
    const currentHour = new Date().getHours();
    if (currentHour >= 9 && currentHour <= 17) {
      // Boost business operations during business hours
      result.matchResults.forEach(match => {
        if (match.domain === 'banking') {
          match.confidence = Math.min(match.confidence * 1.1, 1);
        }
      });
    }

    // Location-based adjustments
    if (context.userLocation) {
      result.matchResults.forEach(match => {
        if (match.domain === 'location' || match.domain === 'weather') {
          match.confidence = Math.min(match.confidence * 1.15, 1);
        }
      });
    }
  }

  /**
   * Learns from user interactions
   * @private
   */
  learnFromIntent(userIntent, result) {
    // Store in context history
    this.contextHistory.push({
      intent: userIntent,
      domains: result.context.domains.map(d => d.domain),
      timestamp: Date.now(),
      confidence: result.confidence
    });

    // Keep only recent history
    if (this.contextHistory.length > 10) {
      this.contextHistory = this.contextHistory.slice(-10);
    }

    // Learn user patterns
    const intentKey = userIntent.toLowerCase();
    if (!this.userPatterns.has(intentKey)) {
      this.userPatterns.set(intentKey, {
        count: 1,
        operations: result.matchResults.slice(0, 3),
        lastUsed: Date.now()
      });
    } else {
      const pattern = this.userPatterns.get(intentKey);
      pattern.count++;
      pattern.lastUsed = Date.now();
    }
  }

  /**
   * Helper methods
   * @private
   */
  normalizeIntent(intent) {
    return intent
      .toLowerCase()
      .trim()
      .replace(/[^\w\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  tokenizeIntent(intent) {
    return this.normalizeIntent(intent)
      .split(' ')
      .filter(word => word.length > 2)
      .filter(word => !['the', 'and', 'for', 'with', 'from', 'what', 'how', 'can', 'will'].includes(word));
  }

  calculateOverallConfidence(matches) {
    if (matches.length === 0) return 0;
    
    // Weighted average with bias toward top matches
    let totalScore = 0;
    let totalWeight = 0;
    
    matches.slice(0, 5).forEach((match, index) => {
      const weight = 1 / (index + 1); // Diminishing weight
      totalScore += match.confidence * weight;
      totalWeight += weight;
    });
    
    return totalWeight > 0 ? totalScore / totalWeight : 0;
  }

  deduplicateMatches(matches) {
    const seen = new Map();
    const unique = [];
    
    for (const match of matches) {
      const key = `${match.operationId}_${match.apiId}`;
      if (!seen.has(key) || seen.get(key).confidence < match.confidence) {
        seen.set(key, match);
      }
    }
    
    return Array.from(seen.values());
  }

  /**
   * Public methods for external use
   */
  
  /**
   * Gets learned user patterns
   */
  getUserPatterns() {
    return Array.from(this.userPatterns.entries()).map(([intent, pattern]) => ({
      intent,
      usage: pattern.count,
      lastUsed: new Date(pattern.lastUsed).toISOString(),
      operations: pattern.operations.map(op => op.operationId)
    }));
  }

  /**
   * Clears conversation history
   */
  clearHistory() {
    this.contextHistory = [];
  }

  /**
   * Gets current context history
   */
  getContextHistory() {
    return [...this.contextHistory];
  }
}