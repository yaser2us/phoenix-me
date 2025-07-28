export class IntentParser {
  constructor(registry) {
    this.registry = registry;
    this.intentMap = new Map(); // Cache intent patterns
    this.buildIntentPatterns();
  }

  parseIntent(userInput) {
    try {
      const normalizedInput = this.normalizeInput(userInput);
      console.error(`Parsing intent: "${userInput}" -> "${normalizedInput}"`);
      
      // Find matching operation
      const operationId = this.registry.findOperationByIntent(normalizedInput);
      if (!operationId) {
        return {
          success: false,
          error: 'Could not understand the request. Try asking for weather information.',
          suggestions: [
            'Get weather for London',
            'What\'s the weather in Tokyo?',
            'Check weather in New York'
          ]
        };
      }
      
      // Get operation details
      const operationDetails = this.registry.getOperationDetails(operationId);
      
      // Extract parameters from user input
      const extractedParams = this.extractParameters(normalizedInput, operationDetails);
      
      return {
        success: true,
        operationId: operationId,
        parameters: extractedParams,
        confidence: this.calculateConfidence(normalizedInput, operationDetails),
        originalInput: userInput,
        normalizedInput: normalizedInput
      };
      
    } catch (error) {
      return {
        success: false,
        error: `Failed to parse intent: ${error.message}`,
        originalInput: userInput
      };
    }
  }

  extractParameters(normalizedInput, operationDetails) {
    const parameters = {};
    
    try {
      // For weather operations, extract location information
      if (operationDetails.operationId === 'getCurrentWeather') {
        const locationParam = this.extractLocation(normalizedInput);
        if (locationParam) {
          parameters.q = locationParam;
        }
        
        // Extract temperature units if mentioned
        const unitsParam = this.extractUnits(normalizedInput);
        if (unitsParam) {
          parameters.units = unitsParam;
        } else {
          // Default to metric
          parameters.units = 'metric';
        }
      }
      
      console.error(`Extracted parameters:`, parameters);
      return parameters;
      
    } catch (error) {
      console.warn(`Parameter extraction failed: ${error.message}`);
      return {};
    }
  }

  extractLocation(normalizedInput) {
    // Location extraction patterns for Phase 1
    const locationPatterns = [
      // "what's the weather like in [location]"
      /what.*weather.*(?:like\s+)?(?:in|for|at)\s+([a-zA-Z\s,.-]+?)(?:\s*[?!.]?\s*$)/i,
      // "weather in [location]" or "weather for [location]"
      /weather\s+(?:in|for|at)\s+([a-zA-Z\s,.-]+?)(?:\s+(?:in|today|now|celsius|fahrenheit|metric|imperial|c|f)|\s*[?!.]?\s*$)/i,
      // "get/check/show weather for [location]"
      /(?:get|check|show)\s+weather\s+(?:for\s+|in\s+|at\s+)?([a-zA-Z\s,.-]+?)(?:\s+(?:in|today|now|celsius|fahrenheit|metric|imperial|c|f)|\s*[?!.]?\s*$)/i,
      // "[location] weather"
      /^([a-zA-Z\s,.-]+?)\s+weather(?:\s|$)/i,
      // "temperature in [location]"
      /temperature\s+(?:in|for|at)\s+([a-zA-Z\s,.-]+?)(?:\s+(?:in|today|now|celsius|fahrenheit|metric|imperial|c|f)|\s*[?!.]?\s*$)/i,
      // "weather [location]" (fallback)
      /weather\s+([a-zA-Z\s,.-]+?)(?:\s*[?!.]?\s*$)/i
    ];
    
    for (const pattern of locationPatterns) {
      const match = normalizedInput.match(pattern);
      if (match && match[1]) {
        let location = match[1].trim();
        
        // Clean up extracted location
        location = location.replace(/[?!.,]$/, ''); // Remove trailing punctuation
        location = location.replace(/^\s*the\s+/i, ''); // Remove leading "the"
        
        // Skip common non-location words
        const skipWords = ['weather', 'temperature', 'temp', 'current', 'today', 'now', 'like', 'is', 'what', 'how'];
        if (skipWords.some(word => location.toLowerCase() === word)) {
          continue;
        }
        
        // Must be at least 2 characters and contain letters
        if (location.length >= 2 && /[a-zA-Z]/.test(location)) {
          console.error(`Extracted location: "${location}" using pattern: ${pattern}`);
          return location;
        }
      }
    }
    
    return null;
  }

  extractUnits(normalizedInput) {
    // Temperature unit extraction
    const unitPatterns = [
      { pattern: /celsius|metric|c\b/i, unit: 'metric' },
      { pattern: /fahrenheit|imperial|f\b/i, unit: 'imperial' },
      { pattern: /kelvin|standard|k\b/i, unit: 'standard' }
    ];
    
    for (const { pattern, unit } of unitPatterns) {
      if (pattern.test(normalizedInput)) {
        console.error(`Extracted units: "${unit}"`);
        return unit;
      }
    }
    
    return null; // Will default to metric in parameter extraction
  }

  buildIntentPatterns() {
    try {
      // Build patterns from registered operations
      const operations = this.registry.getAllOperations();
      
      for (const operation of operations) {
        const patterns = [];
        
        // Create patterns from operation summary and description
        if (operation.summary) {
          patterns.push(this.createPatternFromText(operation.summary));
        }
        
        if (operation.description) {
          patterns.push(this.createPatternFromText(operation.description));
        }
        
        // Add weather-specific patterns
        if (operation.operationId === 'getCurrentWeather') {
          patterns.push(
            /weather/i,
            /temperature/i,
            /temp/i,
            /climate/i,
            /conditions/i,
            /forecast/i
          );
        }
        
        this.intentMap.set(operation.operationId, patterns);
      }
      
      console.error(`Built intent patterns for ${this.intentMap.size} operations`);
      
    } catch (error) {
      console.warn(`Failed to build intent patterns: ${error.message}`);
    }
  }

  createPatternFromText(text) {
    // Convert text to a simple regex pattern
    const cleaned = text.toLowerCase().replace(/[^\w\s]/g, '');
    const words = cleaned.split(/\s+/).filter(word => word.length > 2);
    
    if (words.length > 0) {
      // Create pattern that matches any of the significant words
      const pattern = new RegExp(words.join('|'), 'i');
      return pattern;
    }
    
    return null;
  }

  calculateConfidence(normalizedInput, operationDetails) {
    try {
      let confidence = 0.0;
      
      // Base confidence for finding the operation
      confidence += 0.3;
      
      // Boost confidence for weather-specific keywords
      const weatherKeywords = ['weather', 'temperature', 'temp', 'climate'];
      const foundKeywords = weatherKeywords.filter(keyword => 
        normalizedInput.includes(keyword)
      );
      confidence += foundKeywords.length * 0.15;
      
      // Boost confidence if location is extractable
      if (this.extractLocation(normalizedInput)) {
        confidence += 0.25;
      }
      
      // Boost confidence for complete sentences
      if (normalizedInput.includes(' ') && normalizedInput.length > 10) {
        confidence += 0.1;
      }
      
      // Cap at 1.0
      return Math.min(confidence, 1.0);
      
    } catch (error) {
      console.warn(`Confidence calculation failed: ${error.message}`);
      return 0.5; // Default confidence
    }
  }

  normalizeInput(userInput) {
    return userInput
      .toLowerCase()
      .trim()
      .replace(/[^\w\s,.-]/g, ' ')  // Keep common punctuation that might be in location names
      .replace(/\s+/g, ' ')         // Collapse multiple spaces
      .trim();
  }

  // Utility method to get parsing statistics
  getStats() {
    return {
      totalOperations: this.registry?.operations?.size || 0,
      patternsBuilt: this.intentMap.size,
      registryInitialized: this.registry?.initialized || false
    };
  }

  // Method to test intent parsing without executing
  testIntent(userInput) {
    const result = this.parseIntent(userInput);
    return {
      ...result,
      stats: this.getStats(),
      timestamp: new Date().toISOString()
    };
  }

  // PHASE 2: Multi-API support methods
  buildApiKeywords() {
    return {
      weather: ['weather', 'temperature', 'forecast', 'climate', 'rain', 'sunny', 'temp', 'conditions'],
      currency: ['currency', 'exchange', 'convert', 'rate', 'dollar', 'euro', 'money', 'usd', 'eur', 'gbp'],
      news: ['news', 'headlines', 'articles', 'breaking', 'latest', 'today', 'current events', 'journalism'],
      geolocation: ['location', 'ip', 'where', 'country', 'city', 'geolocation', 'current location', 'my location'],
      facts: ['fact', 'random', 'interesting', 'trivia', 'knowledge', 'learn', 'tell me']
    };
  }

  categorizeIntent(userInput) {
    const keywords = this.buildApiKeywords();
    const normalizedInput = userInput.toLowerCase();
    const scores = {};

    // Calculate keyword match scores for each API
    for (const [apiType, apiKeywords] of Object.entries(keywords)) {
      scores[apiType] = 0;
      for (const keyword of apiKeywords) {
        if (normalizedInput.includes(keyword)) {
          scores[apiType] += 1;
        }
      }
    }

    // Find the highest scoring API type
    let bestApi = null;
    let bestScore = 0;
    for (const [apiType, score] of Object.entries(scores)) {
      if (score > bestScore) {
        bestApi = apiType;
        bestScore = score;
      }
    }

    // Calculate confidence based on score
    const totalWords = normalizedInput.split(/\s+/).length;
    const confidence = bestScore > 0 ? Math.min(bestScore / totalWords * 2, 1.0) : 0;

    return {
      apiType: bestApi,
      confidence: confidence,
      scores: scores
    };
  }

  extractCurrencyParameters(userInput) {
    const params = {};
    const normalizedInput = userInput.toLowerCase();

    // Extract currency conversion parameters
    const conversionPattern = /convert\s+(\d+)?\s*([a-z]{3})\s+to\s+([a-z]{3})/i;
    const ratePattern = /(?:exchange\s+rate|rate)\s+(?:for\s+)?([a-z]{3})/i;
    const basePattern = /([a-z]{3})\s+(?:to|exchange|rate)/i;

    let match = normalizedInput.match(conversionPattern);
    if (match) {
      if (match[1]) params.amount = parseInt(match[1]);
      params.from = match[2].toUpperCase();
      params.to = match[3].toUpperCase();
      params.base = params.from;
      return params;
    }

    match = normalizedInput.match(ratePattern);
    if (match) {
      params.base = match[1].toUpperCase();
      return params;
    }

    match = normalizedInput.match(basePattern);
    if (match) {
      params.base = match[1].toUpperCase();
      return params;
    }

    // Default to USD if no currency specified
    params.base = 'USD';
    return params;
  }

  extractLocationParameters(userInput) {
    const params = {};
    const normalizedInput = userInput.toLowerCase();

    // Extract IP address if provided
    const ipPattern = /(?:ip\s+|location\s+of\s+)?(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})/;
    const match = normalizedInput.match(ipPattern);
    
    if (match) {
      params.ip = match[1];
      return params;
    }

    // For "where am I" or "current location", no parameters needed
    if (normalizedInput.includes('where am i') || 
        normalizedInput.includes('current location') ||
        normalizedInput.includes('my location')) {
      return {}; // Will use getCurrentLocation endpoint
    }

    return {};
  }

  extractNewsParameters(userInput) {
    const params = {};
    const normalizedInput = userInput.toLowerCase();

    // Extract country parameter
    const countryPattern = /(?:news\s+from|headlines\s+from|from)\s+([a-z]{2}|us|uk|ca|au|de|fr|jp|cn)/i;
    let match = normalizedInput.match(countryPattern);
    if (match) {
      params.country = match[1].toLowerCase();
    }

    // Extract category parameter
    const categoryPattern = /(?:about|on)\s+(business|entertainment|general|health|science|sports|technology)/i;
    match = normalizedInput.match(categoryPattern);
    if (match) {
      params.category = match[1].toLowerCase();
    }

    // Extract search query for searchNews operation
    const searchPattern = /(?:news\s+about|search\s+news|find\s+news|news\s+on)\s+(.+)/i;
    match = normalizedInput.match(searchPattern);
    if (match) {
      params.q = match[1].trim();
      return params; // This should use searchNews operation
    }

    // Default parameters for top headlines
    if (!params.country) {
      params.country = 'us';
    }

    return params;
  }

  // Enhanced parseIntent method with multi-API support
  parseIntentEnhanced(userInput) {
    try {
      const normalizedInput = this.normalizeInput(userInput);
      console.error(`Parsing intent: "${userInput}" -> "${normalizedInput}"`);
      
      // First, categorize the intent to determine API type
      const categorization = this.categorizeIntent(normalizedInput);
      
      let operationId = null;
      let extractedParams = {};
      
      // Route based on API type
      switch (categorization.apiType) {
        case 'weather':
          operationId = this.registry.findOperationByIntent(normalizedInput);
          if (operationId) {
            const operationDetails = this.registry.getOperationDetails(operationId);
            extractedParams = this.extractParameters(normalizedInput, operationDetails);
          }
          break;
          
        case 'currency':
          operationId = 'getExchangeRates';
          extractedParams = this.extractCurrencyParameters(normalizedInput);
          break;
          
        case 'news':
          const newsParams = this.extractNewsParameters(normalizedInput);
          if (newsParams.q) {
            operationId = 'searchNews';
          } else {
            operationId = 'getTopHeadlines';
          }
          extractedParams = newsParams;
          break;
          
        case 'geolocation':
          if (normalizedInput.includes('where am i') || 
              normalizedInput.includes('current location') ||
              normalizedInput.includes('my location')) {
            operationId = 'getCurrentLocation';
          } else {
            operationId = 'getLocationByIP';
          }
          extractedParams = this.extractLocationParameters(normalizedInput);
          break;
          
        case 'facts':
          operationId = 'getRandomFact';
          extractedParams = { language: 'en' };
          break;
          
        default:
          // Fallback to original weather-only logic
          operationId = this.registry.findOperationByIntent(normalizedInput);
          if (operationId) {
            const operationDetails = this.registry.getOperationDetails(operationId);
            extractedParams = this.extractParameters(normalizedInput, operationDetails);
          }
      }

      if (!operationId) {
        return {
          success: false,
          error: 'Could not understand the request. Try asking for weather, currency rates, location, or random facts.',
          suggestions: [
            'Get weather for London',
            'Convert USD to EUR', 
            'Where am I?',
            'Tell me a random fact'
          ]
        };
      }

      return {
        success: true,
        operationId: operationId,
        parameters: extractedParams,
        apiType: categorization.apiType,
        confidence: Math.max(categorization.confidence, 0.5),
        originalInput: userInput,
        normalizedInput: normalizedInput
      };
      
    } catch (error) {
      return {
        success: false,
        error: `Failed to parse intent: ${error.message}`,
        originalInput: userInput
      };
    }
  }
}