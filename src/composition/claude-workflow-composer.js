import { logger } from '../utils/logger.js';

/**
 * Claude Workflow Composer - Phase 4.9 Checkpoint 1
 * Interfaces with Claude Desktop's AI to analyze user intents and compose intelligent workflows
 * 
 * Note: In actual implementation, this would interface with Claude Desktop.
 * For testing, we simulate Claude's intelligent analysis capabilities.
 */
export class ClaudeWorkflowComposer {
  constructor() {
    this.analysisCache = new Map();
    logger.info('Claude Workflow Composer initialized');
  }

  /**
   * Analyze user intent and determine complexity and required APIs
   */
  async analyzeIntent(userRequest) {
    try {
      logger.debug('Analyzing user intent', { request: userRequest });
      
      // Cache check
      if (this.analysisCache.has(userRequest)) {
        return this.analysisCache.get(userRequest);
      }

      // Simulate Claude's intelligent intent analysis
      const analysis = await this.performIntentAnalysis(userRequest);
      
      // Cache result
      this.analysisCache.set(userRequest, analysis);
      
      logger.info('Intent analysis completed', {
        complexity: analysis.complexity,
        apiCount: analysis.apis.length,
        confidence: analysis.confidence
      });
      
      return analysis;
      
    } catch (error) {
      logger.error('Intent analysis failed', { request: userRequest, error: error.message });
      throw error;
    }
  }

  /**
   * Generate workflow plan based on user intent and available APIs
   */
  async generateWorkflowPlan(userRequest, apiCatalog) {
    try {
      logger.debug('Generating workflow plan', { request: userRequest });
      
      // First analyze the intent
      const intentAnalysis = await this.analyzeIntent(userRequest);
      
      // Generate workflow based on intent and available APIs
      const workflowPlan = await this.createWorkflowPlan(intentAnalysis, apiCatalog, userRequest);
      
      logger.info('Workflow plan generated', {
        stepCount: workflowPlan.steps.length,
        hasDataFlow: workflowPlan.dataFlow && workflowPlan.dataFlow.length > 0,
        complexity: workflowPlan.complexity
      });
      
      return workflowPlan;
      
    } catch (error) {
      logger.error('Workflow plan generation failed', { request: userRequest, error: error.message });
      throw error;
    }
  }

  /**
   * Perform intelligent intent analysis (simulating Claude's capabilities)
   */
  async performIntentAnalysis(request) {
    const lowerRequest = request.toLowerCase();
    
    // Detect financial keywords
    const financialKeywords = ['balance', 'account', 'money', 'transaction', 'payment', 'bill', 'expense', 'budget', 'goal', 'financial'];
    const weatherKeywords = ['weather', 'temperature', 'rain', 'sunny', 'climate', 'forecast'];
    const currencyKeywords = ['currency', 'exchange', 'rate', 'usd', 'conversion', 'forex'];
    const newsKeywords = ['news', 'update', 'headline', 'current', 'latest'];
    const paymentKeywords = ['pay', 'transfer', 'send', 'bill payment', 'favorite'];
    
    const detectedApis = [];
    let complexity = 'simple';
    let confidence = 0.8;
    
    // Detect required API domains
    if (financialKeywords.some(keyword => lowerRequest.includes(keyword))) {
      detectedApis.push('banking');
    }
    
    if (weatherKeywords.some(keyword => lowerRequest.includes(keyword))) {
      detectedApis.push('weather');
    }
    
    if (currencyKeywords.some(keyword => lowerRequest.includes(keyword))) {
      detectedApis.push('currency');
    }
    
    if (newsKeywords.some(keyword => lowerRequest.includes(keyword))) {
      detectedApis.push('news');
    }
    
    if (paymentKeywords.some(keyword => lowerRequest.includes(keyword))) {
      detectedApis.push('payment');
    }
    
    // Determine complexity based on API count and request patterns
    if (detectedApis.length > 2) {
      complexity = 'multi_api';
      confidence = 0.9;
    } else if (detectedApis.length === 2) {
      complexity = 'dual_api';
      confidence = 0.85;
    }
    
    // Detect synthesis/analysis requirements
    const analysisKeywords = ['overview', 'summary', 'analysis', 'insight', 'recommendation', 'comprehensive'];
    const needsSynthesis = analysisKeywords.some(keyword => lowerRequest.includes(keyword));
    
    if (needsSynthesis && detectedApis.length > 1) {
      complexity = 'synthesis_required';
      confidence = 0.95;
    }
    
    return {
      complexity,
      apis: detectedApis,
      confidence,
      needsSynthesis,
      intent: this.categorizeIntent(lowerRequest),
      parameters: this.extractParameters(request)
    };
  }

  /**
   * Create detailed workflow plan
   */
  async createWorkflowPlan(intentAnalysis, apiCatalog, originalRequest) {
    const steps = [];
    const dataFlow = [];
    let stepId = 1;
    
    // Generate steps based on detected APIs
    for (const apiDomain of intentAnalysis.apis) {
      const domainOps = apiCatalog.operations.filter(op => op.domain === apiDomain);
      
      logger.debug('Looking for operations in domain', { 
        domain: apiDomain, 
        foundOps: domainOps.length,
        availableDomains: [...new Set(apiCatalog.operations.map(op => op.domain))]
      });
      
      if (domainOps.length > 0) {
        // Select most appropriate operation for domain
        const selectedOp = this.selectBestOperation(domainOps, intentAnalysis.intent, originalRequest);
        
        if (selectedOp) {
          const step = {
            id: `step${stepId}`,
            operation: selectedOp.id,
            domain: apiDomain,
            description: `${selectedOp.description}`,
            method: selectedOp.method,
            parameters: this.generateParameters(selectedOp, intentAnalysis.parameters),
            dependencies: [],
            priority: this.calculatePriority(apiDomain, intentAnalysis.intent)
          };
          
          steps.push(step);
          stepId++;
        }
      }
    }
    
    // Generate data flow connections for multi-API workflows
    if (steps.length > 1) {
      dataFlow.push(...this.generateDataFlow(steps, intentAnalysis));
    }
    
    // Add synthesis step if needed
    if (intentAnalysis.needsSynthesis && steps.length > 1) {
      const synthesisStep = {
        id: `step${stepId}`,
        operation: 'synthesize_response',
        domain: 'synthesis',
        description: 'Combine and analyze data from multiple APIs to provide comprehensive insights',
        method: 'POST',
        parameters: { analysisType: 'comprehensive' },
        dependencies: steps.map(s => s.id),
        priority: 1
      };
      
      steps.push(synthesisStep);
      
      // Add data flow from all previous steps to synthesis
      for (const step of steps.slice(0, -1)) {
        dataFlow.push({
          from: step.id,
          to: synthesisStep.id,
          field: `${step.domain}_data`,
          transformation: 'extract_key_insights'
        });
      }
    }
    
    return {
      intent: originalRequest,
      complexity: intentAnalysis.complexity,
      confidence: intentAnalysis.confidence,
      steps: steps,
      dataFlow: dataFlow,
      executionStrategy: this.determineExecutionStrategy(steps),
      expectedOutput: this.generateExpectedOutput(intentAnalysis, steps),
      estimatedDuration: this.estimateDuration(steps),
      createdAt: new Date().toISOString()
    };
  }

  /**
   * Select best operation for a domain based on intent
   */
  selectBestOperation(operations, intent, originalRequest) {
    // Sort operations by relevance to intent
    const scored = operations.map(op => ({
      ...op,
      score: this.scoreOperationRelevance(op, intent, originalRequest)
    }));
    
    scored.sort((a, b) => b.score - a.score);
    return scored[0];
  }

  /**
   * Score operation relevance to intent
   */
  scoreOperationRelevance(operation, intent, request) {
    let score = 0;
    const lowerRequest = request.toLowerCase();
    const lowerDesc = operation.description.toLowerCase();
    
    // Exact matches get high scores
    if (lowerRequest.includes('balance') && lowerDesc.includes('balance')) score += 10;
    if (lowerRequest.includes('weather') && lowerDesc.includes('weather')) score += 10;
    if (lowerRequest.includes('payment') && lowerDesc.includes('payment')) score += 10;
    if (lowerRequest.includes('currency') && lowerDesc.includes('currency')) score += 10;
    
    // Intent-based scoring
    switch (intent) {
      case 'account_inquiry':
        if (operation.id.includes('balance') || operation.id.includes('summary')) score += 8;
        break;
      case 'weather_inquiry':
        if (operation.id.includes('weather') || operation.id.includes('current')) score += 8;
        break;
      case 'payment_inquiry':
        if (operation.id.includes('payment') || operation.id.includes('bill')) score += 8;
        break;
    }
    
    // Prefer GET operations for inquiries
    if (operation.method === 'GET') score += 2;
    
    return score;
  }

  /**
   * Categorize user intent
   */
  categorizeIntent(request) {
    if (request.includes('balance') || request.includes('account')) return 'account_inquiry';
    if (request.includes('weather')) return 'weather_inquiry';
    if (request.includes('payment') || request.includes('bill')) return 'payment_inquiry';
    if (request.includes('currency') || request.includes('exchange')) return 'currency_inquiry';
    if (request.includes('overview') || request.includes('summary')) return 'comprehensive_overview';
    return 'general_inquiry';
  }

  /**
   * Extract parameters from user request
   */
  extractParameters(request) {
    const params = {};
    
    // Extract location for weather
    const cityMatch = request.match(/in (\w+)/i);
    if (cityMatch) {
      params.city = cityMatch[1];
    } else if (request.toLowerCase().includes('weather')) {
      params.city = 'Kuala Lumpur'; // Default for Malaysia
    }
    
    // Extract currency codes
    const currencyMatch = request.match(/\b([A-Z]{3})\b/);
    if (currencyMatch) {
      params.currency = currencyMatch[1];
    }
    
    return params;
  }

  /**
   * Generate parameters for specific operation
   */
  generateParameters(operation, extractedParams) {
    const params = { ...extractedParams };
    
    // Banking operations
    if (operation.domain === 'banking' && operation.id.includes('Balance')) {
      params.isFirstLoad = 'true';
    }
    
    // Weather operations need location
    if (operation.domain === 'weather' && !params.city) {
      params.city = 'Kuala Lumpur';
    }
    
    return params;
  }

  /**
   * Calculate step priority
   */
  calculatePriority(domain, intent) {
    // Banking operations usually come first
    if (domain === 'banking') return 1;
    
    // Weather and currency can run in parallel
    if (domain === 'weather' || domain === 'currency') return 2;
    
    // News and synthesis come last
    if (domain === 'news') return 3;
    if (domain === 'synthesis') return 9;
    
    return 5;
  }

  /**
   * Generate data flow between steps
   */
  generateDataFlow(steps, intentAnalysis) {
    const dataFlow = [];
    
    // Find banking and currency steps for balance conversion
    const bankingStep = steps.find(s => s.domain === 'banking');
    const currencyStep = steps.find(s => s.domain === 'currency');
    
    if (bankingStep && currencyStep) {
      dataFlow.push({
        from: bankingStep.id,
        to: currencyStep.id,
        field: 'balance_amount',
        transformation: 'extract_balance_value'
      });
    }
    
    return dataFlow;
  }

  /**
   * Determine execution strategy
   */
  determineExecutionStrategy(steps) {
    if (steps.length === 1) return 'sequential';
    
    // Check for dependencies
    const hasDependencies = steps.some(step => step.dependencies.length > 0);
    if (hasDependencies) return 'dependent';
    
    // Multiple independent steps can run in parallel
    if (steps.length > 1) return 'parallel';
    
    return 'sequential';
  }

  /**
   * Generate expected output description
   */
  generateExpectedOutput(intentAnalysis, steps) {
    const domains = [...new Set(steps.map(s => s.domain))];
    
    if (domains.length === 1) {
      return `${domains[0]} information as requested`;
    }
    
    if (intentAnalysis.needsSynthesis) {
      return `Comprehensive analysis combining ${domains.join(', ')} data with intelligent insights`;
    }
    
    return `Combined information from ${domains.join(', ')} domains`;
  }

  /**
   * Estimate execution duration
   */
  estimateDuration(steps) {
    // Base time per step: 2 seconds
    let duration = steps.length * 2;
    
    // Banking operations take longer
    const bankingSteps = steps.filter(s => s.domain === 'banking').length;
    duration += bankingSteps * 3;
    
    // Synthesis adds processing time
    const synthesisSteps = steps.filter(s => s.domain === 'synthesis').length;
    duration += synthesisSteps * 5;
    
    return duration;
  }

  /**
   * Clear analysis cache
   */
  clearCache() {
    this.analysisCache.clear();
    logger.debug('Analysis cache cleared');
  }
}