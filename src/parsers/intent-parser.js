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
}