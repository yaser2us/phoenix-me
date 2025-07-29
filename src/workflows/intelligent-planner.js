import { logger } from '../utils/logger.js';

/**
 * Intelligent Workflow Planner for Phase 4
 * Provides AI-powered workflow planning with:
 * - Dynamic workflow generation from complex requests
 * - Cost and time optimization
 * - Dependency analysis and parallel execution planning
 * - Human-readable explanations
 * - Alternative workflow suggestions
 */
export class IntelligentPlanner {
  constructor(registry, workflowEngine, performanceMonitor = null) {
    this.registry = registry;
    this.workflowEngine = workflowEngine;
    this.performanceMonitor = performanceMonitor;
    
    // Domain mapping for intelligent planning
    this.domainAPIs = new Map([
      ['location', ['getCurrentLocation', 'getLocationByIP']],
      ['weather', ['getCurrentWeather']],
      ['currency', ['getExchangeRates']],
      ['news', ['getTopHeadlines', 'searchNews']],
      ['facts', ['getRandomFact']],
      ['financial', ['getExchangeRates', 'getTopHeadlines']],
      ['travel', ['getCurrentLocation', 'getCurrentWeather', 'getExchangeRates']],
      ['market', ['getExchangeRates', 'getTopHeadlines', 'getRandomFact']]
    ]);

    // API execution costs (estimated in ms and relative cost units)
    this.apiCosts = new Map([
      ['getCurrentLocation', { time: 800, cost: 1, reliability: 0.95 }],
      ['getCurrentWeather', { time: 1200, cost: 2, reliability: 0.90 }],
      ['getExchangeRates', { time: 600, cost: 1, reliability: 0.95 }],
      ['getTopHeadlines', { time: 1500, cost: 3, reliability: 0.85 }],
      ['searchNews', { time: 1800, cost: 4, reliability: 0.80 }],
      ['getRandomFact', { time: 400, cost: 1, reliability: 0.98 }],
      ['getLocationByIP', { time: 500, cost: 1, reliability: 0.90 }]
    ]);

    // Dependency rules for API sequencing
    this.dependencies = new Map([
      ['getCurrentWeather', ['getCurrentLocation']], // Weather needs location
      ['searchNews', ['getCurrentLocation']], // Local news needs location
      ['getTopHeadlines', []], // Global news has no dependencies
      ['getExchangeRates', []], // Currency rates are independent
      ['getRandomFact', []], // Facts are independent
      ['getCurrentLocation', []], // Location is foundational
      ['getLocationByIP', []] // IP location is independent
    ]);

    this.optimizationStrategies = new Map([
      ['speed', { priority: 'time', parallelization: 'aggressive' }],
      ['cost', { priority: 'cost', parallelization: 'conservative' }],
      ['reliability', { priority: 'reliability', parallelization: 'moderate' }],
      ['balanced', { priority: 'balanced', parallelization: 'moderate' }]
    ]);

    this.initialized = true;
  }

  /**
   * Main workflow planning method
   * @param {string} userIntent - Natural language user intent
   * @param {Object} context - Optional conversation context
   * @param {Object} preferences - User preferences for planning
   * @returns {Object} Comprehensive workflow plan
   */
  async planWorkflow(userIntent, context = null, preferences = {}) {
    try {
      logger.debug('Intelligent workflow planning started', { intent: userIntent });
      
      const startTime = Date.now();
      
      // 1. Analyze intent requirements and extract information domains
      const intentAnalysis = await this.analyzeIntentRequirements(userIntent, context);
      
      // 2. Identify required APIs and information domains
      const requiredDomains = this.identifyInformationDomains(intentAnalysis);
      
      // 3. Map domains to available APIs
      const candidateAPIs = this.mapDomainsToAPIs(requiredDomains);
      
      // 4. Plan optimal execution sequence with dependency analysis
      const executionPlan = await this.planExecutionSequence(candidateAPIs, preferences);
      
      // 5. Estimate costs, time, and reliability
      const costEstimate = this.estimateWorkflowCost(executionPlan);
      
      // 6. Generate human-readable explanation
      const explanation = await this.generateWorkflowExplanation(
        userIntent, 
        intentAnalysis, 
        executionPlan, 
        costEstimate
      );
      
      // 7. Generate alternative plans
      const alternatives = await this.generateAlternativePlans(
        intentAnalysis, 
        requiredDomains, 
        preferences
      );
      
      const planningDuration = Date.now() - startTime;
      
      const plan = {
        id: this.generatePlanId(),
        userIntent: userIntent,
        intentAnalysis: intentAnalysis,
        requiredDomains: requiredDomains,
        steps: executionPlan.steps,
        parallelSteps: executionPlan.parallelGroups,
        dependencies: executionPlan.dependencies,
        estimatedTime: costEstimate.totalTime,
        estimatedCost: costEstimate.totalCost,
        reliability: costEstimate.averageReliability,
        explanation: explanation,
        reasoning: this.generatePlanningReasoning(intentAnalysis, executionPlan),
        alternatives: alternatives,
        optimizationStrategy: preferences.strategy || 'balanced',
        planningTime: planningDuration,
        confidence: this.calculatePlanConfidence(intentAnalysis, executionPlan),
        metadata: {
          createdAt: new Date().toISOString(),
          domains: requiredDomains,
          apiCount: executionPlan.steps.length,
          parallelizable: executionPlan.parallelGroups.length > 0
        }
      };
      
      logger.debug('Intelligent workflow planning completed', { 
        planId: plan.id,
        steps: plan.steps.length,
        estimatedTime: plan.estimatedTime
      });
      
      return plan;
      
    } catch (error) {
      logger.error('Workflow planning failed', { error: error.message, intent: userIntent });
      return this.createFallbackPlan(userIntent, error);
    }
  }

  /**
   * Analyze intent to understand information requirements
   * @param {string} userIntent - User's natural language intent
   * @param {Object} context - Conversation context
   * @returns {Object} Intent analysis
   */
  async analyzeIntentRequirements(userIntent, context) {
    const analysis = {
      originalIntent: userIntent,
      complexity: 'simple',
      informationTypes: [],
      urgency: 'normal',
      scope: 'specific',
      emotionalContext: null,
      temporalContext: null,
      locationContext: null,
      domains: []
    };

    const lowerIntent = userIntent.toLowerCase();

    // Analyze complexity
    const complexityIndicators = [
      { pattern: /everything|comprehensive|complete|full|detailed/, level: 'complex' },
      { pattern: /compare|versus|vs|difference|options/, level: 'complex' },
      { pattern: /multiple|several|various|different/, level: 'moderate' },
      { pattern: /prepare|planning|research|analysis/, level: 'moderate' }
    ];

    for (const indicator of complexityIndicators) {
      if (indicator.pattern.test(lowerIntent)) {
        analysis.complexity = indicator.level;
        break;
      }
    }

    // Identify information domains
    const domainPatterns = {
      location: /location|where|place|city|area|region|here|there/,
      weather: /weather|temperature|climate|forecast|conditions|rain|snow|sunny/,
      currency: /currency|exchange|rates|money|dollar|euro|financial|forex/,
      news: /news|current|events|happening|updates|breaking|headlines/,
      facts: /facts|information|details|about|trivia|interesting/,
      travel: /travel|trip|visit|vacation|journey|go to|planning/,
      market: /market|stocks|economy|business|financial.*news/,
      culture: /culture|local|lifestyle|food|dining|entertainment/
    };

    for (const [domain, pattern] of Object.entries(domainPatterns)) {
      if (pattern.test(lowerIntent)) {
        analysis.domains.push(domain);
      }
    }

    // Analyze urgency
    if (/urgent|asap|quickly|right now|immediately|soon/.test(lowerIntent)) {
      analysis.urgency = 'high';
    } else if (/later|eventually|sometime|when convenient/.test(lowerIntent)) {
      analysis.urgency = 'low';
    }

    // Analyze scope
    if (/everything|all|comprehensive|complete/.test(lowerIntent)) {
      analysis.scope = 'comprehensive';
    } else if (/specific|particular|exact|precise/.test(lowerIntent)) {
      analysis.scope = 'specific';
    } else {
      analysis.scope = 'general';
    }

    // Extract emotional context
    if (/anxious|worried|stressed|overwhelmed|nervous/.test(lowerIntent)) {
      analysis.emotionalContext = 'anxious';
    } else if (/excited|thrilled|eager|looking forward/.test(lowerIntent)) {
      analysis.emotionalContext = 'positive';
    } else if (/confused|uncertain|unsure/.test(lowerIntent)) {
      analysis.emotionalContext = 'uncertain';
    }

    // Use context if available
    if (context) {
      if (context.user_location && !analysis.domains.includes('location')) {
        analysis.locationContext = context.user_location;
      }
      if (context.user_interest) {
        analysis.domains.push(context.user_interest);
      }
    }

    return analysis;
  }

  /**
   * Identify required information domains
   * @param {Object} intentAnalysis - Analyzed intent
   * @returns {Array} Required information domains
   */
  identifyInformationDomains(intentAnalysis) {
    let domains = [...intentAnalysis.domains];

    // Add implied domains based on complexity and scope
    if (intentAnalysis.scope === 'comprehensive') {
      // Comprehensive requests usually need location as a base
      if (!domains.includes('location') && !intentAnalysis.locationContext) {
        domains.unshift('location');
      }
      
      // Add contextual information for comprehensive requests
      if (domains.includes('travel')) {
        domains.push('weather', 'currency');
      }
      
      if (domains.includes('market')) {
        domains.push('currency', 'news');
      }
    }

    // Handle complex requests with multiple requirements
    if (intentAnalysis.complexity === 'complex') {
      if (domains.includes('location') && !domains.includes('weather')) {
        domains.push('facts'); // Add general information about the location
      }
    }

    // Remove duplicates and ensure logical order
    domains = [...new Set(domains)];
    
    // Sort domains by dependency order
    const domainOrder = ['location', 'weather', 'currency', 'news', 'facts', 'travel', 'market', 'culture'];
    domains.sort((a, b) => {
      const aIndex = domainOrder.indexOf(a);
      const bIndex = domainOrder.indexOf(b);
      return (aIndex === -1 ? 999 : aIndex) - (bIndex === -1 ? 999 : bIndex);
    });

    return domains;
  }

  /**
   * Map information domains to available APIs
   * @param {Array} domains - Required information domains
   * @returns {Array} Candidate API operations
   */
  mapDomainsToAPIs(domains) {
    const candidateAPIs = [];
    const usedAPIs = new Set();

    for (const domain of domains) {
      const apis = this.domainAPIs.get(domain) || [];
      
      for (const api of apis) {
        if (!usedAPIs.has(api)) {
          candidateAPIs.push({
            operation: api,
            domain: domain,
            priority: this.calculateAPIPriority(api, domain),
            cost: this.apiCosts.get(api) || { time: 1000, cost: 2, reliability: 0.8 }
          });
          usedAPIs.add(api);
        }
      }
    }

    // Sort by priority
    candidateAPIs.sort((a, b) => b.priority - a.priority);

    return candidateAPIs;
  }

  /**
   * Plan optimal execution sequence with dependency analysis
   * @param {Array} candidateAPIs - Available API operations
   * @param {Object} preferences - User preferences
   * @returns {Object} Execution plan
   */
  async planExecutionSequence(candidateAPIs, preferences = {}) {
    const strategy = this.optimizationStrategies.get(preferences.strategy || 'balanced');
    
    // Build dependency graph
    const dependencyGraph = this.buildDependencyGraph(candidateAPIs);
    
    // Plan execution order based on strategy
    const executionOrder = this.optimizeExecutionOrder(dependencyGraph, strategy);
    
    // Identify parallelization opportunities
    const parallelGroups = this.identifyParallelExecutionGroups(executionOrder, dependencyGraph);
    
    return {
      steps: executionOrder,
      parallelGroups: parallelGroups,
      dependencies: dependencyGraph,
      strategy: strategy,
      optimizationApplied: true
    };
  }

  /**
   * Calculate API priority for domain mapping
   * @param {string} api - API operation name
   * @param {string} domain - Information domain
   * @returns {number} Priority score
   */
  calculateAPIPriority(api, domain) {
    let priority = 50; // Base priority

    // Domain-specific priority adjustments
    const domainPriorities = {
      location: { getCurrentLocation: 90, getLocationByIP: 70 },
      weather: { getCurrentWeather: 95 },
      currency: { getExchangeRates: 90 },
      news: { getTopHeadlines: 85, searchNews: 75 },
      facts: { getRandomFact: 80 }
    };

    const domainPriority = domainPriorities[domain];
    if (domainPriority && domainPriority[api]) {
      priority = domainPriority[api];
    }

    // Adjust based on performance metrics if available
    if (this.performanceMonitor) {
      const stats = this.performanceMonitor.getAPIStats?.(api);
      if (stats) {
        priority += (stats.successRate - 0.5) * 20; // Boost reliable APIs
        priority -= Math.max(0, (stats.averageResponseTime - 1000) / 100); // Penalize slow APIs
      }
    }

    return Math.max(10, Math.min(100, priority));
  }

  /**
   * Build dependency graph for API operations
   * @param {Array} candidateAPIs - Candidate API operations
   * @returns {Map} Dependency graph
   */
  buildDependencyGraph(candidateAPIs) {
    const graph = new Map();
    
    for (const apiCandidate of candidateAPIs) {
      const operation = apiCandidate.operation;
      const dependencies = this.dependencies.get(operation) || [];
      
      graph.set(operation, {
        dependencies: dependencies.filter(dep => 
          candidateAPIs.some(candidate => candidate.operation === dep)
        ),
        dependents: [],
        cost: apiCandidate.cost,
        domain: apiCandidate.domain,
        priority: apiCandidate.priority
      });
    }

    // Build dependents lists
    for (const [operation, info] of graph) {
      for (const dependency of info.dependencies) {
        if (graph.has(dependency)) {
          graph.get(dependency).dependents.push(operation);
        }
      }
    }

    return graph;
  }

  /**
   * Optimize execution order based on strategy
   * @param {Map} dependencyGraph - Dependency graph
   * @param {Object} strategy - Optimization strategy
   * @returns {Array} Optimized execution order
   */
  optimizeExecutionOrder(dependencyGraph, strategy) {
    const executionOrder = [];
    const completed = new Set();
    const operations = Array.from(dependencyGraph.keys());

    // Topological sort with strategy-based prioritization
    while (completed.size < operations.length) {
      const candidates = operations.filter(op => 
        !completed.has(op) && 
        dependencyGraph.get(op).dependencies.every(dep => completed.has(dep))
      );

      if (candidates.length === 0) {
        // Circular dependency or error - add remaining operations
        const remaining = operations.filter(op => !completed.has(op));
        executionOrder.push(...remaining);
        break;
      }

      // Sort candidates by strategy priority
      candidates.sort((a, b) => {
        const aInfo = dependencyGraph.get(a);
        const bInfo = dependencyGraph.get(b);

        switch (strategy.priority) {
          case 'time':
            return aInfo.cost.time - bInfo.cost.time;
          case 'cost':
            return aInfo.cost.cost - bInfo.cost.cost;
          case 'reliability':
            return bInfo.cost.reliability - aInfo.cost.reliability;
          default: // balanced
            const aScore = aInfo.priority + (aInfo.cost.reliability * 10) - (aInfo.cost.time / 100);
            const bScore = bInfo.priority + (bInfo.cost.reliability * 10) - (bInfo.cost.time / 100);
            return bScore - aScore;
        }
      });

      // Add the best candidate
      const selectedOperation = candidates[0];
      executionOrder.push(selectedOperation);
      completed.add(selectedOperation);
    }

    return executionOrder;
  }

  /**
   * Identify parallel execution opportunities
   * @param {Array} executionOrder - Sequential execution order
   * @param {Map} dependencyGraph - Dependency graph
   * @returns {Array} Parallel execution groups
   */
  identifyParallelExecutionGroups(executionOrder, dependencyGraph) {
    const parallelGroups = [];
    const processed = new Set();

    for (let i = 0; i < executionOrder.length; i++) {
      if (processed.has(executionOrder[i])) continue;

      const group = [executionOrder[i]];
      processed.add(executionOrder[i]);

      // Find operations that can run in parallel
      for (let j = i + 1; j < executionOrder.length; j++) {
        const candidate = executionOrder[j];
        if (processed.has(candidate)) continue;

        // Check if candidate can run in parallel with all operations in current group
        const canRunInParallel = group.every(groupOp => {
          const candidateInfo = dependencyGraph.get(candidate);
          const groupOpInfo = dependencyGraph.get(groupOp);
          
          // Can't run in parallel if there's a dependency relationship
          return !candidateInfo.dependencies.includes(groupOp) &&
                 !groupOpInfo.dependencies.includes(candidate) &&
                 !candidateInfo.dependents.includes(groupOp) &&
                 !groupOpInfo.dependents.includes(candidate);
        });

        if (canRunInParallel) {
          group.push(candidate);
          processed.add(candidate);
        }
      }

      if (group.length > 1) {
        parallelGroups.push({
          operations: group,
          estimatedTime: Math.max(...group.map(op => dependencyGraph.get(op).cost.time)),
          parallelismBenefit: group.reduce((sum, op) => sum + dependencyGraph.get(op).cost.time, 0) -
                             Math.max(...group.map(op => dependencyGraph.get(op).cost.time))
        });
      }
    }

    return parallelGroups;
  }

  /**
   * Estimate workflow cost and performance
   * @param {Object} executionPlan - Execution plan
   * @returns {Object} Cost estimate
   */
  estimateWorkflowCost(executionPlan) {
    let totalTime = 0;
    let totalCost = 0;
    let reliabilityProduct = 1;
    let stepCount = 0;

    // Calculate sequential time
    for (const step of executionPlan.steps) {
      const cost = this.apiCosts.get(step) || { time: 1000, cost: 2, reliability: 0.8 };
      totalTime += cost.time;
      totalCost += cost.cost;
      reliabilityProduct *= cost.reliability;
      stepCount++;
    }

    // Adjust for parallelization benefits
    let parallelTimeSaving = 0;
    for (const group of executionPlan.parallelGroups) {
      parallelTimeSaving += group.parallelismBenefit;
    }

    const optimizedTime = Math.max(1000, totalTime - parallelTimeSaving);
    const averageReliability = Math.pow(reliabilityProduct, 1 / stepCount);

    return {
      totalTime: optimizedTime,
      totalCost: totalCost,
      averageReliability: averageReliability,
      parallelTimeSaving: parallelTimeSaving,
      stepCount: stepCount,
      breakdown: {
        sequentialTime: totalTime,
        parallelizedTime: optimizedTime,
        costPerStep: totalCost / stepCount
      }
    };
  }

  /**
   * Generate human-readable workflow explanation
   * @param {string} userIntent - Original user intent
   * @param {Object} intentAnalysis - Intent analysis
   * @param {Object} executionPlan - Execution plan
   * @param {Object} costEstimate - Cost estimate
   * @returns {string} Human-readable explanation
   */
  async generateWorkflowExplanation(userIntent, intentAnalysis, executionPlan, costEstimate) {
    const explanation = [];

    // Opening statement
    explanation.push(
      `To fulfill your request "${userIntent}", I'll execute a ${intentAnalysis.complexity} workflow ` +
      `with ${executionPlan.steps.length} steps.`
    );

    // Domain explanation
    if (intentAnalysis.domains.length > 1) {
      explanation.push(
        `This involves gathering information from ${intentAnalysis.domains.length} different domains: ` +
        `${intentAnalysis.domains.join(', ')}.`
      );
    }

    // Execution strategy
    if (executionPlan.parallelGroups.length > 0) {
      explanation.push(
        `I'll optimize execution by running ${executionPlan.parallelGroups.length} groups of operations in parallel, ` +
        `saving approximately ${Math.round(costEstimate.parallelTimeSaving / 1000)} seconds.`
      );
    }

    // Step-by-step breakdown
    explanation.push("Here's what I'll do:");
    
    const stepDescriptions = this.generateStepDescriptions(executionPlan.steps);
    stepDescriptions.forEach((desc, index) => {
      explanation.push(`${index + 1}. ${desc}`);
    });

    // Performance summary
    explanation.push(
      `Expected completion time: ~${Math.round(costEstimate.totalTime / 1000)} seconds ` +
      `with ${Math.round(costEstimate.averageReliability * 100)}% reliability.`
    );

    return explanation.join(' ');
  }

  /**
   * Generate step descriptions for explanation
   * @param {Array} steps - Workflow steps
   * @returns {Array} Human-readable step descriptions
   */
  generateStepDescriptions(steps) {
    const descriptions = {
      getCurrentLocation: "First, I'll determine your current location",
      getCurrentWeather: "Then get the current weather conditions", 
      getExchangeRates: "Fetch current currency exchange rates",
      getTopHeadlines: "Gather the latest news headlines",
      searchNews: "Search for relevant news articles",
      getRandomFact: "Find interesting facts and information",
      getLocationByIP: "Identify your location using your IP address"
    };

    return steps.map((step, index) => {
      const baseDescription = descriptions[step] || `Execute ${step} operation`;
      
      // Add contextual modifiers
      if (index === 0) {
        return baseDescription.replace(/^(Then|Next)/, 'First');
      } else if (index === steps.length - 1 && steps.length > 2) {
        return baseDescription.replace(/^(First|Then)/, 'Finally');
      } else if (index > 0) {
        return baseDescription.replace(/^First/, 'Then');
      }
      
      return baseDescription;
    });
  }

  /**
   * Generate planning reasoning
   * @param {Object} intentAnalysis - Intent analysis
   * @param {Object} executionPlan - Execution plan
   * @returns {Array} Reasoning steps
   */
  generatePlanningReasoning(intentAnalysis, executionPlan) {
    const reasoning = [];

    reasoning.push(`Analyzed request complexity as "${intentAnalysis.complexity}"`);
    reasoning.push(`Identified ${intentAnalysis.domains.length} information domains needed`);
    
    if (executionPlan.parallelGroups.length > 0) {
      reasoning.push(`Optimized for parallel execution with ${executionPlan.parallelGroups.length} parallel groups`);
    }
    
    reasoning.push(`Selected ${executionPlan.steps.length} APIs based on domain requirements and performance`);
    
    if (intentAnalysis.urgency === 'high') {
      reasoning.push('Prioritized speed due to urgency indicators');
    }
    
    if (intentAnalysis.scope === 'comprehensive') {
      reasoning.push('Included comprehensive information gathering for thorough response');
    }

    return reasoning;
  }

  /**
   * Generate alternative workflow plans
   * @param {Object} intentAnalysis - Intent analysis
   * @param {Array} requiredDomains - Required domains
   * @param {Object} preferences - User preferences
   * @returns {Array} Alternative plans
   */
  async generateAlternativePlans(intentAnalysis, requiredDomains, preferences) {
    const alternatives = [];

    // Speed-optimized alternative
    if (preferences.strategy !== 'speed') {
      const speedPlan = await this.createAlternativePlan(
        intentAnalysis, 
        requiredDomains, 
        'speed',
        'Fastest execution (may sacrifice some information completeness)'
      );
      if (speedPlan) alternatives.push(speedPlan);
    }

    // Cost-optimized alternative
    if (preferences.strategy !== 'cost') {
      const costPlan = await this.createAlternativePlan(
        intentAnalysis, 
        requiredDomains, 
        'cost',
        'Most cost-effective (uses free APIs where possible)'
      );
      if (costPlan) alternatives.push(costPlan);
    }

    // Comprehensive alternative
    if (intentAnalysis.scope !== 'comprehensive') {
      const comprehensivePlan = await this.createAlternativePlan(
        intentAnalysis, 
        [...requiredDomains, 'facts', 'culture'], 
        'balanced',
        'Comprehensive information gathering (more detailed results)'
      );
      if (comprehensivePlan) alternatives.push(comprehensivePlan);
    }

    return alternatives.slice(0, 3); // Limit to 3 alternatives
  }

  /**
   * Create alternative workflow plan
   * @param {Object} intentAnalysis - Intent analysis
   * @param {Array} domains - Domains for alternative
   * @param {string} strategy - Optimization strategy
   * @param {string} description - Alternative description
   * @returns {Object} Alternative plan
   */
  async createAlternativePlan(intentAnalysis, domains, strategy, description) {
    try {
      const candidateAPIs = this.mapDomainsToAPIs(domains);
      const executionPlan = await this.planExecutionSequence(candidateAPIs, { strategy });
      const costEstimate = this.estimateWorkflowCost(executionPlan);

      return {
        strategy: strategy,
        description: description,
        steps: executionPlan.steps,
        estimatedTime: costEstimate.totalTime,
        estimatedCost: costEstimate.totalCost,
        reliability: costEstimate.averageReliability,
        domains: domains,
        stepCount: executionPlan.steps.length
      };
    } catch (error) {
      logger.warn('Failed to create alternative plan', { strategy, error: error.message });
      return null;
    }
  }

  /**
   * Calculate confidence in the workflow plan
   * @param {Object} intentAnalysis - Intent analysis
   * @param {Object} executionPlan - Execution plan
   * @returns {number} Confidence score (0-1)
   */
  calculatePlanConfidence(intentAnalysis, executionPlan) {
    let confidence = 0.7; // Base confidence

    // Boost confidence for well-understood domains
    const wellKnownDomains = ['location', 'weather', 'currency', 'facts'];
    const knownDomainRatio = intentAnalysis.domains.filter(d => wellKnownDomains.includes(d)).length / 
                           intentAnalysis.domains.length;
    confidence += knownDomainRatio * 0.15;

    // Adjust for complexity
    switch (intentAnalysis.complexity) {
      case 'simple':
        confidence += 0.1;
        break;
      case 'complex':
        confidence -= 0.05;
        break;
    }

    // Boost confidence if we have good API coverage
    if (executionPlan.steps.length >= intentAnalysis.domains.length) {
      confidence += 0.1;
    }

    // Reduce confidence for highly parallel plans (more complexity)
    if (executionPlan.parallelGroups.length > 2) {
      confidence -= 0.05;
    }

    return Math.max(0.1, Math.min(0.95, confidence));
  }

  /**
   * Generate unique plan ID
   * @returns {string} Unique plan identifier
   */
  generatePlanId() {
    return `plan_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Create fallback plan for errors
   * @param {string} userIntent - Original user intent
   * @param {Error} error - Planning error
   * @returns {Object} Fallback plan
   */
  createFallbackPlan(userIntent, error) {
    return {
      id: this.generatePlanId(),
      userIntent: userIntent,
      steps: ['getCurrentLocation', 'getCurrentWeather'], // Safe fallback
      estimatedTime: 3000,
      estimatedCost: 3,
      reliability: 0.8,
      explanation: `Unable to create optimal plan due to: ${error.message}. Using basic location and weather workflow as fallback.`,
      reasoning: ['Planning error occurred', 'Fell back to basic workflow', 'Ensures some functionality'],
      alternatives: [],
      confidence: 0.3,
      fallback: true,
      error: error.message
    };
  }
}