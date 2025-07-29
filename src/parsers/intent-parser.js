import { NLPIntentParser } from './nlp-intent-parser.js';
import { ContextManager } from './context-manager.js';
import { MaybankWorkflows } from '../workflows/maybank-workflows.js';

export class IntentParser {
  constructor(registry) {
    this.registry = registry;
    this.intentMap = new Map(); // Cache intent patterns
    this.buildIntentPatterns();
    
    // Phase 4: Initialize advanced NLP components
    this.contextManager = new ContextManager();
    this.nlpParser = new NLPIntentParser(registry, this.contextManager);
    this.phase4Enabled = true;
    
    // Phase 4.2: Initialize Maybank workflows
    this.maybankWorkflows = new MaybankWorkflows();
    this.phase42Enabled = true;
  }

  parseIntent(userInput) {
    try {
      const normalizedInput = this.normalizeInput(userInput);
      console.error(`Parsing intent: "${userInput}" -> "${normalizedInput}"`);
      
      // Phase 4.2: Check for Maybank-specific requests first
      if (this.phase42Enabled) {
        const maybankIntent = this.parseMaybankIntent(normalizedInput, userInput);
        if (maybankIntent.success) {
          return maybankIntent;
        }
      }
      
      // Find matching operation
      const operationId = this.registry.findOperationByIntent(normalizedInput);
      if (!operationId) {
        return {
          success: false,
          error: 'Could not understand the request. Try asking for weather information or Maybank banking operations.',
          suggestions: [
            'Get weather for London',
            'What\'s the weather in Tokyo?',
            'Check my MAE balance',
            'Show my Maybank account summary'
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

  // PHASE 4: Advanced NLP-powered intent analysis
  async analyzeAdvancedIntent(userInput, conversationId = null) {
    try {
      if (!this.phase4Enabled) {
        return this.parseIntent(userInput);
      }

      console.error(`Advanced NLP analysis: "${userInput}"`);
      
      // Get conversation context
      const context = conversationId ? this.contextManager.getContext(null, conversationId) : null;
      
      // Perform advanced NLP analysis
      const nlpAnalysis = await this.nlpParser.analyzeIntent(userInput, context);
      
      // Extract and store context for future use
      if (conversationId) {
        await this.contextManager.extractAndStoreContext(
          userInput, 
          nlpAnalysis.extractedEntities, 
          conversationId
        );
      }

      // Convert NLP analysis to workflow-compatible format
      const workflowResult = this.convertNLPToWorkflow(nlpAnalysis);
      
      return {
        success: true,
        ...workflowResult,
        nlpAnalysis: nlpAnalysis,  // Include full NLP analysis
        phase4: true,
        originalInput: userInput
      };
      
    } catch (error) {
      console.error('Advanced NLP analysis failed, falling back to basic parsing:', error.message);
      
      // Fallback to Phase 3 parsing
      return {
        ...this.parseIntent(userInput),
        phase4Fallback: true,
        phase4Error: error.message
      };
    }
  }

  // PHASE 4: Context-aware intent analysis with conversation continuity
  async analyzeIntentWithContext(userInput, conversationId) {
    try {
      // Use context manager to resolve references
      const contextResolution = await this.contextManager.resolveContextualReferences(
        userInput, 
        conversationId
      );
      
      // Analyze the resolved input
      const analysis = await this.analyzeAdvancedIntent(
        contextResolution.resolvedText, 
        conversationId
      );
      
      // Add context resolution information
      analysis.contextResolution = contextResolution;
      analysis.contextUsed = contextResolution.contextUsed;
      
      return analysis;
      
    } catch (error) {
      console.error('Context-aware analysis failed:', error.message);
      return this.analyzeAdvancedIntent(userInput, conversationId);
    }
  }

  // PHASE 4: Convert NLP analysis to workflow format
  convertNLPToWorkflow(nlpAnalysis) {
    const result = {
      intendedAction: nlpAnalysis.intendedAction,
      confidence: nlpAnalysis.confidence,
      complexity: nlpAnalysis.complexity,
      parameters: nlpAnalysis.suggestedParameters || {},
      entities: nlpAnalysis.extractedEntities
    };

    // Determine if this should be a workflow or single API call
    if (nlpAnalysis.matchedWorkflow) {
      result.isWorkflow = true;
      result.workflowName = nlpAnalysis.matchedWorkflow;
      result.plannedSteps = this.getWorkflowSteps(nlpAnalysis.matchedWorkflow);
    } else if (nlpAnalysis.requiresCustomWorkflow) {
      result.isWorkflow = true;
      result.requiresCustomWorkflow = true;
      result.suggestedSteps = this.suggestWorkflowSteps(nlpAnalysis);
    } else {
      result.isWorkflow = false;
      result.operationId = this.mapToSingleOperation(nlpAnalysis);
    }

    return result;
  }

  // PHASE 4: Get predefined workflow steps
  getWorkflowSteps(workflowName) {
    const workflowStepsMap = {
      'location_weather': ['getCurrentLocation', 'getCurrentWeather'],
      'trip_planning': ['getCurrentLocation', 'getExchangeRates', 'getCurrentWeather', 'getTopHeadlines'],
      'market_overview': ['getExchangeRates', 'getTopHeadlines', 'getRandomFact'],
      'comprehensive_location_info': ['getCurrentLocation', 'getCurrentWeather', 'getTopHeadlines', 'getRandomFact']
    };
    
    return workflowStepsMap[workflowName] || [];
  }

  // PHASE 4: Suggest workflow steps for custom workflows
  suggestWorkflowSteps(nlpAnalysis) {
    const steps = [];
    const domains = nlpAnalysis.complexity === 'complex' ? 
      nlpAnalysis.extractedEntities.map(e => e.type) : [];

    // Add location step if location entity found or needed
    if (domains.includes('location') || nlpAnalysis.intendedAction.includes('location')) {
      steps.push('getCurrentLocation');
    }

    // Add weather step if weather context detected
    if (nlpAnalysis.originalInput.toLowerCase().includes('weather') || 
        nlpAnalysis.intendedAction.includes('weather')) {
      steps.push('getCurrentWeather');
    }

    // Add currency step if financial context detected
    if (domains.includes('currency') || nlpAnalysis.intendedAction.includes('financial')) {
      steps.push('getExchangeRates');
    }

    // Add news step if current events context detected
    if (nlpAnalysis.originalInput.toLowerCase().includes('news') || 
        nlpAnalysis.originalInput.toLowerCase().includes('happening')) {
      steps.push('getTopHeadlines');
    }

    // Add facts step if informational context detected
    if (nlpAnalysis.originalInput.toLowerCase().includes('everything') ||
        nlpAnalysis.originalInput.toLowerCase().includes('information')) {
      steps.push('getRandomFact');
    }

    return steps.length > 0 ? steps : ['getCurrentLocation'];
  }

  // PHASE 4: Map complex intent to single operation
  mapToSingleOperation(nlpAnalysis) {
    // Check for direct weather requests
    if (nlpAnalysis.intendedAction.includes('weather') && 
        nlpAnalysis.suggestedParameters.location) {
      return 'getCurrentWeather';
    }

    // Check for currency requests
    if (nlpAnalysis.intendedAction.includes('currency') || nlpAnalysis.intendedAction.includes('exchange')) {
      return 'getExchangeRates';
    }

    // Check for location requests
    if (nlpAnalysis.intendedAction.includes('location')) {
      return 'getCurrentLocation';
    }

    // Default fallback
    return 'getCurrentWeather';
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

  // Utility method to get parsing statistics (Enhanced for Phase 4.2)
  getStats() {
    const basicStats = {
      totalOperations: this.registry?.operations?.size || 0,
      patternsBuilt: this.intentMap.size,
      registryInitialized: this.registry?.initialized || false
    };
    
    // Add Maybank-specific stats if enabled
    if (this.phase42Enabled && this.maybankWorkflows) {
      const maybankStats = this.maybankWorkflows.getStats();
      basicStats.maybank = {
        workflowsAvailable: maybankStats.totalWorkflows,
        complexityBreakdown: maybankStats.complexityBreakdown,
        averageSteps: maybankStats.averageSteps,
        averageTime: maybankStats.averageTime,
        sensitiveWorkflows: maybankStats.sensitiveWorkflows,
        workflowTypes: maybankStats.workflowTypes
      };
    }
    
    return basicStats;
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

  // PHASE 4.2: Parse Maybank-specific intents
  parseMaybankIntent(normalizedInput, originalInput) {
    try {
      // Check for Maybank-specific keywords and patterns
      const maybankKeywords = ['maybank', 'mae', 'banking', 'balance', 'account', 'financial', 'wallet', 'summary'];
      const hasMaybankKeywords = maybankKeywords.some(keyword => normalizedInput.includes(keyword));
      
      if (!hasMaybankKeywords) {
        return { success: false };
      }
      
      // Analyze intent for Maybank workflows
      const workflowSuggestions = this.maybankWorkflows.suggestWorkflows(originalInput);
      
      if (workflowSuggestions.length > 0) {
        const bestSuggestion = workflowSuggestions[0];
        
        return {
          success: true,
          operationId: null,
          parameters: {},
          apiType: 'maybank_workflow',
          confidence: bestSuggestion.confidence,
          isWorkflow: true,
          isMaybankWorkflow: true,
          workflowName: bestSuggestion.workflow,
          workflowType: bestSuggestion.workflowType,
          reasoning: bestSuggestion.reasoning,
          allSuggestions: workflowSuggestions,
          originalInput: originalInput,
          normalizedInput: normalizedInput,
          requiresJWT: true,
          estimatedTime: this.maybankWorkflows.getWorkflow(bestSuggestion.workflow).estimatedTime
        };
      }
      
      // Check for direct Maybank API operations
      const directMaybankOps = this.detectDirectMaybankOperations(normalizedInput);
      if (directMaybankOps.operationId) {
        return {
          success: true,
          operationId: directMaybankOps.operationId,
          parameters: directMaybankOps.parameters,
          apiType: 'maybank_direct',
          confidence: directMaybankOps.confidence,
          isWorkflow: false,
          isMaybankOperation: true,
          originalInput: originalInput,
          normalizedInput: normalizedInput,
          requiresJWT: true
        };
      }
      
      return { success: false };
      
    } catch (error) {
      console.error('Maybank intent parsing failed:', error.message);
      return { success: false };
    }
  }
  
  // PHASE 4.2: Detect direct Maybank API operations
  detectDirectMaybankOperations(normalizedInput) {
    const operationPatterns = {
      'get_banking_getBalance': {
        patterns: [
          /\b(?:balance|mae\s+balance|wallet\s+balance|check\s+balance)\b/i,
          /\b(?:how\s+much|show\s+balance|current\s+balance)\b/i,
          /\bmae\s+wallet\b/i
        ],
        parameters: { isFirstLoad: 'true' },
        confidence: 0.9
      },
      'get_banking_summary': {
        patterns: [
          /\b(?:account\s+summary|banking\s+summary|all\s+accounts)\b/i,
          /\b(?:summary|overview|accounts\s+overview)\b/i,
          /\b(?:total\s+balance|account\s+totals)\b/i
        ],
        parameters: { type: 'A' },
        confidence: 0.85
      },
      'get_banking_all': {
        patterns: [
          /\b(?:all\s+accounts|account\s+details|detailed\s+accounts)\b/i,
          /\b(?:complete\s+account|full\s+account|account\s+information)\b/i,
          /\b(?:every\s+account|list\s+accounts)\b/i
        ],
        parameters: {},
        confidence: 0.8
      }
    };
    
    for (const [operationId, config] of Object.entries(operationPatterns)) {
      for (const pattern of config.patterns) {
        if (pattern.test(normalizedInput)) {
          return {
            operationId,
            parameters: config.parameters,
            confidence: config.confidence
          };
        }
      }
    }
    
    return { operationId: null };
  }
  
  // PHASE 4.2: Enhanced intent analysis with Maybank support
  async analyzeAdvancedIntentWithMaybank(userInput, conversationId = null) {
    try {
      // Check for Maybank intents first
      const normalizedInput = this.normalizeInput(userInput);
      const maybankIntent = this.parseMaybankIntent(normalizedInput, userInput);
      
      if (maybankIntent.success) {
        // Enhance with conversation context if available
        if (conversationId) {
          const context = this.contextManager.getContext(null, conversationId);
          if (context && context.lastMaybankOperation) {
            maybankIntent.contextualInfo = {
              lastOperation: context.lastMaybankOperation,
              conversationId: conversationId,
              contextUsed: true
            };
          }
        }
        
        return maybankIntent;
      }
      
      // Fallback to existing advanced NLP analysis
      return this.analyzeAdvancedIntent(userInput, conversationId);
      
    } catch (error) {
      console.error('Advanced Maybank intent analysis failed:', error.message);
      return this.analyzeAdvancedIntent(userInput, conversationId);
    }
  }
  
  // PHASE 4.2: Interactive parameter collection for Maybank operations
  getMaybankParameterRequirements(workflowName) {
    try {
      const workflow = this.maybankWorkflows.getWorkflow(workflowName);
      const parameterRequirements = {
        required: [],
        optional: [],
        interactive: false
      };
      
      // JWT token is always required for Maybank operations
      parameterRequirements.required.push({
        name: 'jwtToken',
        type: 'string',
        description: 'Valid Maybank JWT authentication token',
        validation: 'jwt',
        sensitive: true,
        prompt: 'Please provide your Maybank JWT token for authentication:'
      });
      
      // Add workflow-specific optional parameters
      if (workflow.optionalParameters) {
        for (const param of workflow.optionalParameters) {
          let paramConfig = { name: param, type: 'string' };
          
          switch (param) {
            case 'includeDetails':
              paramConfig.description = 'Include detailed financial analysis';
              paramConfig.type = 'boolean';
              paramConfig.prompt = 'Would you like detailed financial analysis? (yes/no)';
              break;
            case 'analysisType':
              paramConfig.description = 'Type of financial analysis to perform';
              paramConfig.options = ['basic', 'detailed', 'comprehensive'];
              paramConfig.prompt = 'What type of analysis would you like? (basic/detailed/comprehensive)';
              break;
            case 'period':
              paramConfig.description = 'Time period for analysis';
              paramConfig.options = ['current', 'monthly', 'quarterly'];
              paramConfig.prompt = 'What time period? (current/monthly/quarterly)';
              break;
            case 'includeRecommendations':
              paramConfig.description = 'Include financial recommendations';
              paramConfig.type = 'boolean';
              paramConfig.prompt = 'Would you like financial recommendations? (yes/no)';
              break;
            case 'comparisonType':
              paramConfig.description = 'Type of account comparison';
              paramConfig.options = ['balance', 'activity', 'performance'];
              paramConfig.prompt = 'What type of comparison? (balance/activity/performance)';
              break;
            case 'healthMetrics':
              paramConfig.description = 'Specific health metrics to analyze';
              paramConfig.options = ['basic', 'detailed', 'comprehensive'];
              paramConfig.prompt = 'Which health metrics? (basic/detailed/comprehensive)';
              break;
            case 'recommendationLevel':
              paramConfig.description = 'Level of recommendations to provide';
              paramConfig.options = ['basic', 'detailed', 'actionable'];
              paramConfig.prompt = 'What level of recommendations? (basic/detailed/actionable)';
              break;
          }
          
          parameterRequirements.optional.push(paramConfig);
        }
      }
      
      // Enable interactive mode if there are optional parameters
      parameterRequirements.interactive = parameterRequirements.optional.length > 0;
      
      return parameterRequirements;
      
    } catch (error) {
      console.error('Failed to get Maybank parameter requirements:', error.message);
      return {
        required: [{
          name: 'jwtToken',
          type: 'string',
          description: 'Valid Maybank JWT authentication token',
          validation: 'jwt',
          sensitive: true,
          prompt: 'Please provide your Maybank JWT token for authentication:'
        }],
        optional: [],
        interactive: false
      };
    }
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

  // PHASE 3: Workflow detection methods (Enhanced for Phase 4.2)
  detectWorkflowIntent(userInput) {
    const normalizedInput = this.normalizeInput(userInput);
    
    // Phase 4.2: Check for Maybank workflows first
    if (this.phase42Enabled) {
      const maybankWorkflowIntent = this.detectMaybankWorkflowIntent(normalizedInput, userInput);
      if (maybankWorkflowIntent.isWorkflow) {
        return maybankWorkflowIntent;
      }
    }
    
    // Import workflow patterns dynamically
    let workflowPatterns;
    try {
      // This is a bit of a hack since we can't import at the top level due to circular dependencies
      workflowPatterns = { patterns: [], workflowIndicators: [], singleApiIndicators: [] };
      
      // Basic patterns for Phase 3 Checkpoint 1
      const basicPatterns = [
        {
          regex: /weather\s+(at\s+my\s+location|here|current|where\s+i\s+am)/i,
          workflow: "location_weather",
          description: "Weather at current location"
        },
        {
          regex: /find\s+restaurants?\s+in\s+(\w+)/i,
          workflow: "location_weather", // Placeholder
          parameterExtraction: { location: 1 },
          description: "Find restaurants (placeholder workflow)"
        }
      ];
      
      // Check against workflow patterns
      for (const pattern of basicPatterns) {
        const match = normalizedInput.match(pattern.regex);
        if (match) {
          const parameters = {};
          if (pattern.parameterExtraction) {
            for (const [paramName, groupIndex] of Object.entries(pattern.parameterExtraction)) {
              if (match[groupIndex]) {
                parameters[paramName] = match[groupIndex];
              }
            }
          }
          
          return {
            isWorkflow: true,
            workflowName: pattern.workflow,
            confidence: 0.8,
            parameters: parameters,
            description: pattern.description
          };
        }
      }
      
      // Check for workflow indicator keywords (Enhanced for Phase 4.2)
      const workflowIndicators = [
        'at my location',
        'where i am', 
        'current location',
        'here',
        'find restaurants',
        'plan trip',
        'everything about',
        // Maybank workflow indicators
        'financial overview',
        'account analysis',
        'banking summary',
        'financial health',
        'account comparison',
        'complete banking'
      ];
      
      for (const indicator of workflowIndicators) {
        if (normalizedInput.includes(indicator)) {
          return {
            isWorkflow: true,
            workflowName: null, // Would need planning
            confidence: 0.6,
            parameters: {},
            description: "Potential workflow detected"
          };
        }
      }
      
      // Check for definite single API indicators
      const singleApiIndicators = [
        'weather in tokyo',
        'weather in london',
        'convert usd to eur',
        'latest news',
        'random fact'
      ];
      
      for (const indicator of singleApiIndicators) {
        if (normalizedInput.includes(indicator.split(' ')[0]) && 
            normalizedInput.includes(indicator.split(' ')[1])) {
          return {
            isWorkflow: false,
            workflowName: null,
            confidence: 0.9,
            parameters: {},
            description: "Single API call detected"
          };
        }
      }
      
      // Default to single API if no workflow patterns match
      return {
        isWorkflow: false,
        workflowName: null,
        confidence: 0.5,
        parameters: {},
        description: "No workflow patterns matched"
      };
      
    } catch (error) {
      console.error('Error in workflow detection:', error.message);
      return {
        isWorkflow: false,
        workflowName: null,
        confidence: 0.0,
        parameters: {},
        description: "Error in workflow detection"
      };
    }
  }

  planCustomWorkflow(userIntent) {
    const normalizedIntent = this.normalizeInput(userIntent);
    
    // Advanced workflow planning with intent analysis
    const plan = {
      steps: [],
      estimatedTime: 0,
      confidence: 0.5,
      requiredAPIs: [],
      workflowType: 'custom',
      parameters: {},
      complexity: 'simple',
      reasoning: []
    };

    // Extract semantic intent patterns
    const intentAnalysis = this.analyzeComplexIntent(normalizedIntent);
    plan.parameters = intentAnalysis.parameters;
    plan.reasoning.push(`Intent type: ${intentAnalysis.type}`);

    // Plan workflow based on intent type
    switch (intentAnalysis.type) {
      case 'travel_planning':
        plan.steps = ['getCurrentLocation', 'getExchangeRates', 'getCurrentWeather'];
        if (intentAnalysis.parameters.destination) {
          plan.steps.push('getTopHeadlines');
        }
        plan.workflowType = 'trip_planning';
        plan.complexity = 'complex';
        plan.confidence = 0.85;
        plan.estimatedTime = 6000;
        plan.reasoning.push('Travel planning requires location, currency, weather, and news');
        break;

      case 'location_analysis':
        plan.steps = ['getCurrentLocation', 'getCurrentWeather', 'getRandomFact'];
        if (intentAnalysis.comprehensive) {
          plan.steps.push('getTopHeadlines');
          plan.workflowType = 'comprehensive_location_info';
          plan.complexity = 'complex';
        }
        plan.confidence = 0.8;
        plan.estimatedTime = 5000;
        plan.reasoning.push('Location analysis requires current location and related information');
        break;

      case 'market_analysis':
        plan.steps = ['getExchangeRates', 'getTopHeadlines', 'getRandomFact'];
        plan.workflowType = 'market_overview';
        plan.complexity = 'complex';
        plan.confidence = 0.75;
        plan.estimatedTime = 4500;
        plan.reasoning.push('Market analysis requires currency, news, and economic information');
        break;

      case 'weather_location':
        plan.steps = ['getCurrentLocation', 'getCurrentWeather'];
        plan.workflowType = 'location_weather';
        plan.complexity = 'simple';
        plan.confidence = 0.9;
        plan.estimatedTime = 4000;
        plan.reasoning.push('Weather at location requires location then weather lookup');
        break;

      case 'multi_information':
        // Handle requests for multiple types of information
        const requestedAPIs = this.identifyRequestedAPIs(normalizedIntent);
        plan.steps = this.optimizeAPIOrder(requestedAPIs);
        plan.complexity = plan.steps.length > 3 ? 'complex' : 'moderate';
        plan.confidence = 0.7;
        plan.estimatedTime = plan.steps.length * 1500;
        plan.reasoning.push(`Multiple information request: ${requestedAPIs.join(', ')}`);
        break;

      default:
        // Fallback to keyword-based planning
        return this.fallbackWorkflowPlanning(normalizedIntent);
    }

    // Set required APIs based on steps
    plan.requiredAPIs = this.mapStepsToAPIs(plan.steps);
    
    // Adjust confidence based on parameter extraction success
    if (Object.keys(plan.parameters).length > 0) {
      plan.confidence = Math.min(plan.confidence + 0.1, 1.0);
    }

    return plan;
  }

  // CHECKPOINT 4: Advanced intent analysis methods
  analyzeComplexIntent(normalizedIntent) {
    const analysis = {
      type: 'unknown',
      parameters: {},
      comprehensive: false,
      confidence: 0.5
    };

    // Travel/trip planning patterns
    const travelPatterns = [
      /(?:trip|travel|visit|journey|vacation|holiday).*?(?:to|in)\s+(\w+)/i,
      /(?:plan|planning).*?(?:trip|travel|visit).*?(?:to|in)\s+(\w+)/i,
      /(?:going|travelling|traveling).*?(?:to|in)\s+(\w+)/i,
      /what.*?(?:should|need).*?know.*?(?:about|for)\s+(\w+)/i
    ];

    for (const pattern of travelPatterns) {
      const match = normalizedIntent.match(pattern);
      if (match) {
        analysis.type = 'travel_planning';
        analysis.parameters.destination = match[1];
        analysis.confidence = 0.85;
        return analysis;
      }
    }

    // Location analysis patterns
    const locationPatterns = [
      /(?:everything|all|complete|comprehensive|full).*?(?:about|info|information).*?(?:location|where|here|current)/i,
      /(?:current|my)\s+location.*?(?:info|information|analysis|details)/i,
      /what.*?(?:here|location|where.*?am)/i,
      /tell.*?me.*?about.*?(?:here|location|where)/i
    ];

    for (const pattern of locationPatterns) {
      if (pattern.test(normalizedIntent)) {
        analysis.type = 'location_analysis';
        analysis.comprehensive = /(?:everything|all|complete|comprehensive|full)/.test(normalizedIntent);
        analysis.confidence = 0.8;
        return analysis;
      }
    }

    // Market/financial analysis patterns
    const marketPatterns = [
      /(?:market|financial|economy|business).*?(?:overview|summary|analysis|report)/i,
      /(?:currency|exchange).*?(?:rates?|news|market)/i,
      /financial.*?(?:update|information|summary)/i,
      /economy.*?(?:overview|analysis|report)/i
    ];

    for (const pattern of marketPatterns) {
      if (pattern.test(normalizedIntent)) {
        analysis.type = 'market_analysis';
        analysis.confidence = 0.75;
        return analysis;
      }
    }

    // Weather at location patterns
    const weatherLocationPatterns = [
      /weather.*?(?:at|in|for).*?(?:my|current|here).*?location/i,
      /(?:current|here|my).*?(?:location|place).*?weather/i,
      /weather.*?(?:here|current)/i
    ];

    for (const pattern of weatherLocationPatterns) {
      if (pattern.test(normalizedIntent)) {
        analysis.type = 'weather_location';
        analysis.confidence = 0.9;
        return analysis;
      }
    }

    // Multi-information requests
    const infoTypes = ['weather', 'currency', 'news', 'location', 'fact'];
    const foundTypes = infoTypes.filter(type => normalizedIntent.includes(type));
    
    if (foundTypes.length >= 2) {
      analysis.type = 'multi_information';
      analysis.parameters.requestedTypes = foundTypes;
      analysis.confidence = 0.7;
      return analysis;
    }

    return analysis;
  }

  identifyRequestedAPIs(normalizedIntent) {
    const apiMap = {
      weather: ['weather', 'temperature', 'forecast', 'climate'],
      currency: ['currency', 'exchange', 'rate', 'money'],
      news: ['news', 'headlines', 'articles'],
      geolocation: ['location', 'where', 'place', 'current location'],
      facts: ['fact', 'trivia', 'information', 'random']
    };

    const requestedAPIs = [];
    
    for (const [apiType, keywords] of Object.entries(apiMap)) {
      if (keywords.some(keyword => normalizedIntent.includes(keyword))) {
        requestedAPIs.push(this.mapAPITypeToOperation(apiType));
      }
    }

    return requestedAPIs;
  }

  optimizeAPIOrder(apiOperations) {
    // Define optimal execution order based on dependencies
    const orderPriority = {
      'getCurrentLocation': 1,      // Should be first for location-dependent calls
      'getExchangeRates': 2,        // Independent, can be early
      'getRandomFact': 2,           // Independent, can be early  
      'getCurrentWeather': 3,       // Might depend on location
      'getTopHeadlines': 4,         // Can be last
      'searchNews': 4               // Can be last
    };

    return apiOperations.sort((a, b) => {
      const priorityA = orderPriority[a] || 5;
      const priorityB = orderPriority[b] || 5;
      return priorityA - priorityB;
    });
  }

  mapAPITypeToOperation(apiType) {
    const mapping = {
      weather: 'getCurrentWeather',
      currency: 'getExchangeRates',
      news: 'getTopHeadlines',
      geolocation: 'getCurrentLocation',
      facts: 'getRandomFact'
    };
    
    return mapping[apiType] || apiType;
  }

  mapStepsToAPIs(steps) {
    const stepToAPI = {
      'getCurrentLocation': 'geolocation',
      'getCurrentWeather': 'weather',
      'getExchangeRates': 'currency',
      'getTopHeadlines': 'news',
      'searchNews': 'news',
      'getRandomFact': 'facts'
    };

    return [...new Set(steps.map(step => stepToAPI[step]).filter(Boolean))];
  }

  fallbackWorkflowPlanning(normalizedIntent) {
    // Fallback to basic keyword-based planning
    const plan = {
      steps: [],
      estimatedTime: 0,
      confidence: 0.4,
      requiredAPIs: [],
      workflowType: 'custom',
      parameters: {},
      complexity: 'simple',
      reasoning: ['Fallback to keyword-based planning']
    };

    // Basic keyword detection (existing logic)
    if (normalizedIntent.includes('location') || normalizedIntent.includes('where')) {
      plan.steps.push('getCurrentLocation');
      plan.requiredAPIs.push('geolocation');
      plan.estimatedTime += 2000;
    }
    
    if (normalizedIntent.includes('weather')) {
      plan.steps.push('getCurrentWeather');
      plan.requiredAPIs.push('weather');
      plan.estimatedTime += 2000;
    }
    
    if (normalizedIntent.includes('currency') || normalizedIntent.includes('exchange')) {
      plan.steps.push('getExchangeRates');
      plan.requiredAPIs.push('currency');
      plan.estimatedTime += 1500;
    }
    
    if (normalizedIntent.includes('news')) {
      plan.steps.push('getTopHeadlines');
      plan.requiredAPIs.push('news');
      plan.estimatedTime += 2000;
    }
    
    if (normalizedIntent.includes('fact')) {
      plan.steps.push('getRandomFact');
      plan.requiredAPIs.push('facts');
      plan.estimatedTime += 1000;
    }

    // Adjust confidence and complexity
    if (plan.steps.length >= 2) {
      plan.confidence = 0.6;
      plan.complexity = plan.steps.length > 3 ? 'complex' : 'moderate';
    } else if (plan.steps.length === 1) {
      plan.confidence = 0.3;
    }

    return plan;
  }

  extractWorkflowParameters(userInput, workflowDefinition) {
    const parameters = {};
    const normalizedInput = this.normalizeInput(userInput);
    
    // Enhanced parameter extraction with multiple pattern types
    
    // 1. Destination/Location extraction
    const locationPatterns = [
      /(?:trip|travel|visit|going).*?(?:to|in)\s+([a-zA-Z\s,.-]+?)(?:\s|$|next|this|month|week|year)/i,
      /(?:plan|planning).*?(?:for|to)\s+([a-zA-Z\s,.-]+?)(?:\s|$|next|this|month|week|year)/i,
      /(?:in|for|at|to)\s+([a-zA-Z\s,.-]+?)(?:\s|$|next|this|month|week|year)/i,
      /about\s+([a-zA-Z\s,.-]+?)(?:\s|$|next|this|month|week|year)/i
    ];
    
    for (const pattern of locationPatterns) {
      const match = normalizedInput.match(pattern);
      if (match && match[1]) {
        let location = match[1].trim().replace(/[?!.,]$/, '');
        // Clean up common non-location words
        const excludeWords = ['weather', 'news', 'information', 'details', 'analysis'];
        if (!excludeWords.some(word => location.toLowerCase() === word) && location.length >= 2) {
          parameters.destination = location;
          parameters.location = location;
          break;
        }
      }
    }
    
    // 2. Time/temporal extraction  
    const timePatterns = [
      /(?:next|this)\s+(week|month|year|weekend)/i,
      /(?:in)\s+(january|february|march|april|may|june|july|august|september|october|november|december)/i,
      /(?:in)\s+(\d{1,2})\s+(days?|weeks?|months?)/i
    ];
    
    for (const pattern of timePatterns) {
      const match = normalizedInput.match(pattern);
      if (match) {
        parameters.timeframe = match[0].trim();
        break;
      }
    }
    
    // 3. Activity/purpose extraction
    const activityPatterns = [
      /(?:for)\s+(business|vacation|holiday|work|conference|meeting)/i,
      /(?:going|traveling).*?(?:for)\s+(business|vacation|holiday|work|conference|meeting)/i
    ];
    
    for (const pattern of activityPatterns) {
      const match = normalizedInput.match(pattern);
      if (match && match[1]) {
        parameters.purpose = match[1].toLowerCase();
        break;
      }
    }
    
    // 4. Information type extraction
    const infoTypes = ['weather', 'currency', 'news', 'facts', 'location'];
    const requestedTypes = infoTypes.filter(type => normalizedInput.includes(type));
    if (requestedTypes.length > 0) {
      parameters.requestedInfo = requestedTypes;
    }
    
    // 5. Comprehensiveness level
    const comprehensiveKeywords = ['everything', 'all', 'complete', 'comprehensive', 'full', 'detailed'];
    if (comprehensiveKeywords.some(keyword => normalizedInput.includes(keyword))) {
      parameters.comprehensive = true;
    }
    
    // 6. Currency extraction
    const currencyPattern = /(?:convert|exchange|rate)\s+(\w{3})\s+(?:to|for)\s+(\w{3})/i;
    const currencyMatch = normalizedInput.match(currencyPattern);
    if (currencyMatch) {
      parameters.fromCurrency = currencyMatch[1].toUpperCase();
      parameters.toCurrency = currencyMatch[2].toUpperCase();
    }
    
    // 7. Amount extraction
    const amountPattern = /(\d+)\s*(?:dollars?|euros?|pounds?|usd|eur|gbp)/i;
    const amountMatch = normalizedInput.match(amountPattern);
    if (amountMatch) {
      parameters.amount = parseInt(amountMatch[1]);
    }

    return parameters;
  }

  // CHECKPOINT 4: Workflow suggestion system
  suggestWorkflows(userInput) {
    const normalizedInput = this.normalizeInput(userInput);
    const suggestions = [];

    // Analyze user input for potential workflow triggers
    const intentAnalysis = this.analyzeComplexIntent(normalizedInput);
    const extractedParams = this.extractWorkflowParameters(userInput, null);

    // Create base suggestion from analysis
    if (intentAnalysis.type !== 'unknown') {
      const baseSuggestion = {
        workflowType: this.mapIntentTypeToWorkflow(intentAnalysis.type),
        confidence: intentAnalysis.confidence,
        reasoning: `Detected ${intentAnalysis.type} intent`,
        parameters: { ...intentAnalysis.parameters, ...extractedParams },
        estimatedTime: this.estimateWorkflowTime(intentAnalysis.type)
      };
      suggestions.push(baseSuggestion);
    }

    // Add related workflow suggestions
    const relatedSuggestions = this.generateRelatedSuggestions(normalizedInput, extractedParams);
    suggestions.push(...relatedSuggestions);

    // Sort by confidence and limit to top 3
    return suggestions
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, 3)
      .map((suggestion, index) => ({
        ...suggestion,
        rank: index + 1
      }));
  }

  mapIntentTypeToWorkflow(intentType) {
    const mapping = {
      'travel_planning': 'trip_planning',
      'location_analysis': 'comprehensive_location_info',
      'market_analysis': 'market_overview',
      'weather_location': 'location_weather',
      'multi_information': 'custom'
    };
    
    return mapping[intentType] || 'custom';
  }

  estimateWorkflowTime(intentType) {
    const timeEstimates = {
      'travel_planning': 6000,
      'location_analysis': 5000,
      'market_analysis': 4500,
      'weather_location': 4000,
      'multi_information': 5000
    };
    
    return timeEstimates[intentType] || 3000;
  }

  generateRelatedSuggestions(normalizedInput, extractedParams) {
    const suggestions = [];

    // If location is mentioned, suggest location-based workflows
    if (extractedParams.destination || extractedParams.location) {
      suggestions.push({
        workflowType: 'trip_planning',
        confidence: 0.7,
        reasoning: 'Location mentioned - trip planning might be useful',
        parameters: extractedParams,
        estimatedTime: 6000
      });

      suggestions.push({
        workflowType: 'location_weather',
        confidence: 0.6,
        reasoning: 'Location mentioned - weather information available',
        parameters: extractedParams,
        estimatedTime: 4000
      });
    }

    // If comprehensive keywords are used, suggest comprehensive analysis
    if (extractedParams.comprehensive) {
      suggestions.push({
        workflowType: 'comprehensive_location_info',
        confidence: 0.75,
        reasoning: 'Comprehensive information requested',
        parameters: extractedParams,
        estimatedTime: 5000
      });
    }

    // If multiple information types are requested
    if (extractedParams.requestedInfo && extractedParams.requestedInfo.length > 1) {
      suggestions.push({
        workflowType: 'custom',
        confidence: 0.65,
        reasoning: 'Multiple information types requested',
        parameters: extractedParams,
        estimatedTime: extractedParams.requestedInfo.length * 1500
      });
    }

    // Business/financial context suggestions
    if (normalizedInput.includes('business') || normalizedInput.includes('financial') || 
        normalizedInput.includes('market') || normalizedInput.includes('economy')) {
      suggestions.push({
        workflowType: 'market_overview',
        confidence: 0.7,
        reasoning: 'Business/financial context detected',
        parameters: extractedParams,
        estimatedTime: 4500
      });
    }

    return suggestions;
  }

  // PHASE 4.2: Detect Maybank workflow intents
  detectMaybankWorkflowIntent(normalizedInput, originalInput) {
    try {
      // Check for Maybank-specific workflow keywords
      const maybankKeywords = ['maybank', 'mae', 'banking', 'financial', 'account'];
      const hasMaybankKeywords = maybankKeywords.some(keyword => normalizedInput.includes(keyword));
      
      if (!hasMaybankKeywords) {
        return { isWorkflow: false };
      }
      
      // Get workflow suggestions from MaybankWorkflows
      const suggestions = this.maybankWorkflows.suggestWorkflows(originalInput);
      
      if (suggestions.length > 0) {
        const bestSuggestion = suggestions[0];
        
        return {
          isWorkflow: true,
          workflowName: bestSuggestion.workflow,
          workflowType: bestSuggestion.workflowType,
          confidence: bestSuggestion.confidence,
          parameters: {},
          description: bestSuggestion.reasoning,
          estimatedTime: this.maybankWorkflows.getWorkflow(bestSuggestion.workflow).estimatedTime,
          isMaybankWorkflow: true,
          requiresJWT: true,
          allSuggestions: suggestions
        };
      }
      
      // Check for general Maybank workflow indicators
      const maybankWorkflowPatterns = [
        { regex: /financial\s+overview|complete\s+financial|banking\s+overview/i, workflow: 'maybank_financial_overview' },
        { regex: /mae\s+wallet|mae\s+analysis|wallet\s+analysis/i, workflow: 'maybank_mae_focus' },
        { regex: /account\s+comparison|compare\s+accounts/i, workflow: 'maybank_account_comparison' },
        { regex: /quick\s+balance|balance\s+check/i, workflow: 'maybank_quick_balance' },
        { regex: /financial\s+health|health\s+check|financial\s+assessment/i, workflow: 'maybank_health_check' }
      ];
      
      for (const pattern of maybankWorkflowPatterns) {
        if (pattern.regex.test(normalizedInput)) {
          return {
            isWorkflow: true,
            workflowName: pattern.workflow,
            confidence: 0.85,
            parameters: {},
            description: `Detected ${pattern.workflow.replace('maybank_', '').replace('_', ' ')} workflow`,
            isMaybankWorkflow: true,
            requiresJWT: true
          };
        }
      }
      
      return { isWorkflow: false };
      
    } catch (error) {
      console.error('Maybank workflow detection failed:', error.message);
      return { isWorkflow: false };
    }
  }

  // Enhanced parseIntent method that includes workflow detection (Enhanced for Phase 4.2)
  parseIntentWithWorkflow(userInput) {
    try {
      const normalizedInput = this.normalizeInput(userInput);
      console.error(`Parsing intent with workflow detection: "${userInput}"`);
      
      // First check for workflow patterns (including Maybank)
      const workflowDetection = this.detectWorkflowIntent(userInput);
      
      if (workflowDetection.isWorkflow && workflowDetection.workflowName) {
        // Return workflow intent
        const result = {
          success: true,
          operationId: null,
          parameters: workflowDetection.parameters,
          apiType: workflowDetection.isMaybankWorkflow ? 'maybank_workflow' : 'workflow',
          confidence: workflowDetection.confidence,
          isWorkflow: true,
          workflowName: workflowDetection.workflowName,
          plannedSteps: null,
          originalInput: userInput,
          normalizedInput: normalizedInput
        };
        
        // Add Maybank-specific fields if applicable
        if (workflowDetection.isMaybankWorkflow) {
          result.isMaybankWorkflow = true;
          result.requiresJWT = workflowDetection.requiresJWT;
          result.estimatedTime = workflowDetection.estimatedTime;
          result.workflowType = workflowDetection.workflowType;
          if (workflowDetection.allSuggestions) {
            result.allSuggestions = workflowDetection.allSuggestions;
          }
        }
        
        return result;
      } else if (workflowDetection.isWorkflow && !workflowDetection.workflowName) {
        // Workflow detected but needs planning
        const workflowPlan = this.planCustomWorkflow(userInput);
        
        return {
          success: true,
          operationId: null,
          parameters: workflowDetection.parameters,
          apiType: 'workflow',
          confidence: workflowPlan.confidence,
          isWorkflow: true,
          workflowName: null,
          plannedSteps: workflowPlan.steps,
          originalInput: userInput,
          normalizedInput: normalizedInput
        };
      } else {
        // Use existing single API parsing
        const singleApiResult = this.parseIntentEnhanced ? 
          this.parseIntentEnhanced(userInput) : 
          this.parseIntent(userInput);
        
        // Add workflow fields to single API result
        return {
          ...singleApiResult,
          isWorkflow: false,
          workflowName: null,
          plannedSteps: null
        };
      }
      
    } catch (error) {
      return {
        success: false,
        error: `Failed to parse intent with workflow detection: ${error.message}`,
        originalInput: userInput,
        isWorkflow: false,
        workflowName: null,
        plannedSteps: null
      };
    }
  }
  
  // PHASE 4.2: Get comprehensive intent analysis for Maybank operations
  async getComprehensiveMaybankAnalysis(userInput, conversationId = null) {
    try {
      const normalizedInput = this.normalizeInput(userInput);
      
      // Get basic Maybank intent
      const basicIntent = this.parseMaybankIntent(normalizedInput, userInput);
      
      // Get workflow detection
      const workflowIntent = this.detectMaybankWorkflowIntent(normalizedInput, userInput);
      
      // Get parameter requirements if workflow identified
      let parameterRequirements = null;
      if (workflowIntent.isWorkflow) {
        parameterRequirements = this.getMaybankParameterRequirements(workflowIntent.workflowName);
      }
      
      // Get all workflow suggestions
      const allSuggestions = this.maybankWorkflows.suggestWorkflows(userInput);
      
      return {
        success: true,
        basicIntent: basicIntent,
        workflowIntent: workflowIntent,
        parameterRequirements: parameterRequirements,
        allSuggestions: allSuggestions,
        conversationId: conversationId,
        timestamp: new Date().toISOString(),
        phase: '4.2',
        analysisType: 'comprehensive_maybank'
      };
      
    } catch (error) {
      console.error('Comprehensive Maybank analysis failed:', error.message);
      return {
        success: false,
        error: error.message,
        analysisType: 'comprehensive_maybank'
      };
    }
  }
}