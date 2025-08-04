import { logger } from '../utils/logger.js';

/**
 * Smart Workflow Builder - Phase 4.9 Checkpoint 5
 * Builds workflows intelligently from natural language and optimizes them using learned patterns
 */
export class SmartWorkflowBuilder {
  constructor(registry, memoryManager, patternRecognizer) {
    this.registry = registry;
    this.memoryManager = memoryManager;
    this.patternRecognizer = patternRecognizer;
    
    this.buildingRules = new Map();
    this.optimizationStrategies = new Map();
    this.parameterInferenceRules = new Map();
    
    this.initializeBuildingRules();
    this.initializeOptimizationStrategies();
    this.initializeParameterInferenceRules();
    
    logger.info('Smart Workflow Builder initialized');
  }

  /**
   * Build workflow from natural language description
   */
  async buildFromNaturalLanguage(naturalRequest) {
    try {
      logger.debug('Building workflow from natural language', {
        request: naturalRequest
      });

      // Analyze the natural language request
      const analysis = await this.analyzeNaturalLanguage(naturalRequest);
      
      // Extract intent and required operations
      const intent = this.extractIntent(analysis);
      const requiredOperations = await this.identifyRequiredOperations(analysis);
      
      // Find similar successful workflows for reference
      const similarWorkflows = await this.memoryManager.recallSimilarWorkflows(
        naturalRequest,
        { threshold: 0.5, maxResults: 3 }
      );
      
      // Build workflow steps using multiple strategies
      const workflowSteps = await this.buildWorkflowSteps(
        analysis,
        requiredOperations,
        similarWorkflows
      );
      
      // Optimize the initial workflow
      const optimizedSteps = await this.optimizeWorkflowSteps({ steps: workflowSteps });
      
      // Create the complete workflow
      const workflow = {
        id: `smart_wf_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
        name: this.generateWorkflowName(analysis),
        intent: naturalRequest,
        description: this.generateWorkflowDescription(analysis, optimizedSteps.steps),
        pattern: this.identifyWorkflowPattern(analysis, optimizedSteps.steps),
        steps: optimizedSteps.steps,
        metadata: {
          builtFrom: 'natural_language',
          buildMethod: 'smart_builder',
          analysis,
          confidence: this.calculateBuildConfidence(analysis, requiredOperations, similarWorkflows),
          estimatedPerformance: this.estimatePerformance(optimizedSteps.steps),
          builtAt: new Date().toISOString()
        }
      };

      logger.info('Workflow built from natural language', {
        intent: naturalRequest,
        steps: workflow.steps.length,
        confidence: workflow.metadata.confidence,
        pattern: workflow.pattern
      });

      return {
        workflow,
        analysis,
        confidence: workflow.metadata.confidence,
        alternativeApproaches: await this.generateAlternativeApproaches(analysis, workflow)
      };

    } catch (error) {
      logger.error('Natural language workflow building failed', { error: error.message });
      throw error;
    }
  }

  /**
   * Optimize workflow steps by removing duplicates and improving efficiency
   */
  async optimizeWorkflowSteps(workflow) {
    try {
      logger.debug('Optimizing workflow steps', {
        originalSteps: workflow.steps?.length || 0
      });

      const steps = [...(workflow.steps || [])];
      const optimizations = [];
      
      // Step 1: Remove duplicate operations
      const { deduplicatedSteps, duplicatesRemoved } = this.removeDuplicateSteps(steps);
      if (duplicatesRemoved > 0) {
        optimizations.push(`Removed ${duplicatesRemoved} duplicate operations`);
      }
      
      // Step 2: Optimize step order for better data flow
      const { reorderedSteps, reorderingBenefit } = await this.optimizeStepOrder(deduplicatedSteps);
      if (reorderingBenefit > 0) {
        optimizations.push(`Reordered steps for ${reorderingBenefit}% better efficiency`);
      }
      
      // Step 3: Identify parallel execution opportunities
      const { parallelSteps, parallelOpportunities } = this.identifyParallelExecution(reorderedSteps);
      if (parallelOpportunities > 0) {
        optimizations.push(`Identified ${parallelOpportunities} parallel execution opportunities`);
      }
      
      // Step 4: Optimize parameters based on learned patterns
      const optimizedParameters = await this.optimizeStepParameters(parallelSteps);
      
      // Step 5: Add caching hints for frequently used operations
      const cachedSteps = this.addCachingHints(optimizedParameters);

      logger.info('Workflow steps optimized', {
        originalSteps: steps.length,
        optimizedSteps: cachedSteps.length,
        optimizations: optimizations.length
      });

      return {
        steps: cachedSteps,
        optimizations,
        improvementPercentage: Math.round(((steps.length - cachedSteps.length) / steps.length) * 100)
      };

    } catch (error) {
      logger.error('Workflow step optimization failed', { error: error.message });
      throw error;
    }
  }

  /**
   * Infer parameters for workflow templates based on context
   */
  async inferParameters(workflowTemplate, context) {
    try {
      logger.debug('Inferring workflow parameters', {
        template: workflowTemplate.intent,
        contextKeys: Object.keys(context)
      });

      const inferredWorkflow = JSON.parse(JSON.stringify(workflowTemplate)); // Deep clone
      let inferencesApplied = 0;

      for (const step of inferredWorkflow.steps) {
        if (step.params) {
          for (const [paramKey, paramValue] of Object.entries(step.params)) {
            if (paramValue === '?' || paramValue === null || paramValue === undefined) {
              const inferredValue = await this.inferParameterValue(
                step.operation,
                paramKey,
                context,
                workflowTemplate.intent
              );
              
              if (inferredValue !== null) {
                step.params[paramKey] = inferredValue;
                inferencesApplied++;
                
                logger.debug('Parameter inferred', {
                  operation: step.operation,
                  parameter: paramKey,
                  value: inferredValue
                });
              }
            }
          }
        }
      }

      logger.info('Parameter inference completed', {
        template: workflowTemplate.intent,
        inferencesApplied
      });

      return {
        ...inferredWorkflow,
        metadata: {
          ...inferredWorkflow.metadata,
          parameterInferences: inferencesApplied,
          inferredAt: new Date().toISOString()
        }
      };

    } catch (error) {
      logger.error('Parameter inference failed', { error: error.message });
      throw error;
    }
  }

  /**
   * Suggest enhancements for existing workflows
   */
  async suggestEnhancements(workflow, options = {}) {
    try {
      logger.debug('Suggesting workflow enhancements', {
        workflowId: workflow.id,
        currentSteps: workflow.steps?.length || 0
      });

      const enhancements = [];
      
      // Enhancement 1: Add insights generation
      if (options.includeInsights && !this.hasInsightGeneration(workflow)) {
        enhancements.push({
          type: 'add_insights',
          title: 'Add Intelligent Insights',
          description: 'Generate contextual insights from workflow results',
          impact: 'high',
          steps: [
            { operation: 'generateInsights', params: { source: 'workflow_results' }, order: workflow.steps.length + 1 }
          ]
        });
      }
      
      // Enhancement 2: Add visualizations
      if (options.includeVisualizations && !this.hasVisualization(workflow)) {
        enhancements.push({
          type: 'add_visualization',
          title: 'Add Data Visualizations',
          description: 'Create charts and graphs for better data understanding',
          impact: 'medium',
          steps: [
            { operation: 'createVisualization', params: { type: 'auto' }, order: workflow.steps.length + 1 }
          ]
        });
      }
      
      // Enhancement 3: Add error recovery
      if (!this.hasErrorRecovery(workflow)) {
        enhancements.push({
          type: 'add_error_recovery',
          title: 'Improve Error Handling',
          description: 'Add intelligent error recovery mechanisms',
          impact: 'high',
          implementation: 'add_try_catch_blocks',
          confidence: 0.9
        });
      }
      
      // Enhancement 4: Add caching for performance
      if (!this.hasCaching(workflow) && workflow.steps.length > 3) {
        enhancements.push({
          type: 'add_caching',
          title: 'Add Smart Caching',
          description: 'Cache frequently accessed data for better performance',
          impact: 'medium',
          expectedImprovement: '30-50% faster execution'
        });
      }
      
      // Enhancement 5: Add personalization
      if (options.includePersonalization && !this.hasPersonalization(workflow)) {
        enhancements.push({
          type: 'add_personalization',
          title: 'Add User Personalization',
          description: 'Customize workflow behavior based on user preferences',
          impact: 'high',
          steps: [
            { operation: 'analyzeUserPreferences', params: {}, order: 1 },
            { operation: 'personalizeResponse', params: {}, order: workflow.steps.length + 1 }
          ]
        });
      }
      
      // Enhancement 6: Cross-domain integration opportunities
      const crossDomainOpportunities = await this.identifyCrossDomainOpportunities(workflow);
      enhancements.push(...crossDomainOpportunities);
      
      // Enhancement 7: Performance optimizations
      const performanceEnhancements = await this.identifyPerformanceEnhancements(workflow);
      enhancements.push(...performanceEnhancements);

      logger.info('Workflow enhancements suggested', {
        workflowId: workflow.id,
        enhancementsCount: enhancements.length,
        highImpact: enhancements.filter(e => e.impact === 'high').length
      });

      return enhancements;

    } catch (error) {
      logger.error('Enhancement suggestion failed', { error: error.message });
      throw error;
    }
  }

  /**
   * Fuse multiple workflows into a single integrated workflow
   */
  async fuseWorkflows(workflows, options = {}) {
    try {
      logger.debug('Fusing workflows', {
        workflowCount: workflows.length,
        fusionType: options.fusionType || 'sequential'
      });

      const fusionType = options.fusionType || 'sequential';
      const targetIntent = options.intent || this.generateFusedIntent(workflows);
      
      let fusedSteps = [];
      let fusedDomains = new Set();
      let fusedComplexity = 0;
      
      if (fusionType === 'sequential') {
        // Sequential fusion: combine workflows one after another
        fusedSteps = this.fuseSequentially(workflows);
      } else if (fusionType === 'parallel') {
        // Parallel fusion: run workflows in parallel and merge results
        fusedSteps = this.fuseInParallel(workflows);
      } else if (fusionType === 'contextual') {
        // Contextual fusion: intelligently weave workflows together
        fusedSteps = await this.fuseContextually(workflows, targetIntent);
      }
      
      // Extract domains and calculate complexity
      for (const workflow of workflows) {
        if (workflow.domain) fusedDomains.add(workflow.domain);
        fusedComplexity += workflow.steps?.length || 0;
      }
      
      // Optimize the fused workflow
      const optimizedFusion = await this.optimizeWorkflowSteps({ steps: fusedSteps });
      
      // Create the fused workflow
      const fusedWorkflow = {
        id: `fused_wf_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
        name: this.generateFusedWorkflowName(workflows, fusionType),
        intent: targetIntent,
        description: this.generateFusedDescription(workflows, fusionType),
        pattern: `fused_${Array.from(fusedDomains).join('_')}_${fusionType}`,
        steps: optimizedFusion.steps,
        domains: Array.from(fusedDomains),
        fusionMetadata: {
          sourceWorkflows: workflows.map(w => ({ id: w.id, intent: w.intent, domain: w.domain })),
          fusionType,
          originalComplexity: fusedComplexity,
          optimizedComplexity: optimizedFusion.steps.length,
          optimizations: optimizedFusion.optimizations,
          fusedAt: new Date().toISOString()
        }
      };

      logger.info('Workflows fused successfully', {
        sourceCount: workflows.length,
        fusionType,
        finalSteps: fusedWorkflow.steps.length,
        domains: fusedWorkflow.domains.length
      });

      return fusedWorkflow;

    } catch (error) {
      logger.error('Workflow fusion failed', { error: error.message });
      throw error;
    }
  }

  /**
   * Adapt existing workflow for new requirements
   */
  async adaptWorkflow(baseWorkflow, newRequirements) {
    try {
      logger.debug('Adapting workflow', {
        baseId: baseWorkflow.id,
        newRequirements: newRequirements.substring(0, 100)
      });

      // Analyze new requirements
      const newAnalysis = await this.analyzeNaturalLanguage(newRequirements);
      const baseAnalysis = baseWorkflow.metadata?.analysis || this.analyzeExistingWorkflow(baseWorkflow);
      
      // Identify adaptation strategy
      const adaptationStrategy = this.identifyAdaptationStrategy(baseAnalysis, newAnalysis);
      
      // Create adapted workflow
      let adaptedWorkflow = JSON.parse(JSON.stringify(baseWorkflow)); // Deep clone
      
      switch (adaptationStrategy.type) {
        case 'extend':
          adaptedWorkflow = await this.extendWorkflow(adaptedWorkflow, newAnalysis);
          break;
        case 'modify':
          adaptedWorkflow = await this.modifyWorkflow(adaptedWorkflow, newAnalysis);
          break;
        case 'simplify':
          adaptedWorkflow = await this.simplifyWorkflow(adaptedWorkflow, newAnalysis);
          break;
        case 'transform':
          adaptedWorkflow = await this.transformWorkflow(adaptedWorkflow, newAnalysis);
          break;
      }
      
      // Update workflow metadata
      adaptedWorkflow.id = `adapted_${baseWorkflow.id}_${Date.now()}`;
      adaptedWorkflow.intent = newRequirements;
      adaptedWorkflow.adaptationMetadata = {
        baseWorkflowId: baseWorkflow.id,
        adaptationStrategy: adaptationStrategy.type,
        adaptationReason: adaptationStrategy.reason,
        adaptedAt: new Date().toISOString(),
        confidenceScore: adaptationStrategy.confidence
      };

      logger.info('Workflow adapted successfully', {
        baseId: baseWorkflow.id,
        adaptedId: adaptedWorkflow.id,
        strategy: adaptationStrategy.type,
        confidence: adaptationStrategy.confidence
      });

      return {
        workflow: adaptedWorkflow,
        adaptationStrategy,
        confidence: adaptationStrategy.confidence
      };

    } catch (error) {
      logger.error('Workflow adaptation failed', { error: error.message });
      throw error;
    }
  }

  /**
   * Initialize building rules
   */
  initializeBuildingRules() {
    this.buildingRules.set('financial_intent', {
      keywords: ['balance', 'account', 'money', 'financial', 'bank', 'payment'],
      requiredOperations: ['getBalance'],
      suggestedOperations: ['getAccountInfo', 'generateFinancialSummary']
    });
    
    this.buildingRules.set('weather_intent', {
      keywords: ['weather', 'temperature', 'forecast', 'climate'],
      requiredOperations: ['getCurrentWeather'],
      suggestedOperations: ['getWeatherForecast', 'analyzeWeatherTrends']
    });
    
    this.buildingRules.set('currency_intent', {
      keywords: ['currency', 'exchange', 'rate', 'conversion'],
      requiredOperations: ['getExchangeRates'],
      suggestedOperations: ['analyzeCurrencyTrends', 'calculateConversion']
    });
    
    this.buildingRules.set('analytics_intent', {
      keywords: ['analyze', 'insight', 'pattern', 'trend', 'report'],
      requiredOperations: ['analyzeData'],
      suggestedOperations: ['generateInsights', 'createVisualization']
    });
  }

  /**
   * Initialize optimization strategies
   */
  initializeOptimizationStrategies() {
    this.optimizationStrategies.set('remove_duplicates', {
      detect: (steps) => this.findDuplicateOperations(steps),
      apply: (steps) => this.removeDuplicateSteps(steps)
    });
    
    this.optimizationStrategies.set('parallel_execution', {
      detect: (steps) => this.findParallelOpportunities(steps),
      apply: (steps) => this.enableParallelExecution(steps)
    });
    
    this.optimizationStrategies.set('cache_optimization', {
      detect: (steps) => this.findCachingOpportunities(steps),
      apply: (steps) => this.addCachingHints(steps)
    });
  }

  /**
   * Initialize parameter inference rules
   */
  initializeParameterInferenceRules() {
    this.parameterInferenceRules.set('category', {
      operation: 'getSpendingByCategory',
      inferFrom: ['userHistory', 'preferences'],
      logic: (context) => {
        const history = context.userHistory || [];
        const mostFrequent = history
          .filter(h => h.category)
          .reduce((acc, h) => {
            acc[h.category] = (acc[h.category] || 0) + (h.frequency === 'high' ? 3 : 1);
            return acc;
          }, {});
        
        const topCategory = Object.entries(mostFrequent)
          .sort(([,a], [,b]) => b - a)[0];
        
        return topCategory ? topCategory[0] : 'dining';
      }
    });
    
    this.parameterInferenceRules.set('timeframe', {
      operation: '*',
      inferFrom: ['preferences', 'context'],
      logic: (context) => {
        return context.preferences?.defaultTimeframe || '30days';
      }
    });
  }

  /**
   * Helper methods for workflow building and optimization
   */
  async analyzeNaturalLanguage(text) {
    const words = text.toLowerCase().split(/\s+/);
    const analysis = {
      words: new Set(words),
      domains: [],
      intents: [],
      complexity: 'medium',
      actionVerbs: [],
      entities: [],
      confidence: 0.8
    };
    
    // Identify domains
    for (const [domain, rule] of this.buildingRules) {
      if (rule.keywords.some(keyword => words.includes(keyword))) {
        analysis.domains.push(domain.replace('_intent', ''));
      }
    }
    
    // Identify action verbs
    const actionVerbs = ['get', 'show', 'check', 'analyze', 'generate', 'create', 'view', 'display'];
    analysis.actionVerbs = words.filter(word => actionVerbs.includes(word));
    
    // Assess complexity
    if (analysis.domains.length > 2 || words.length > 20) analysis.complexity = 'high';
    else if (analysis.domains.length < 2 && words.length < 10) analysis.complexity = 'low';
    
    return analysis;
  }

  extractIntent(analysis) {
    const primaryDomain = analysis.domains[0] || 'general';
    const primaryAction = analysis.actionVerbs[0] || 'get';
    
    return `${primaryAction}_${primaryDomain}_information`;
  }

  async identifyRequiredOperations(analysis) {
    const operations = [];
    
    for (const domain of analysis.domains) {
      const domainKey = `${domain}_intent`;
      const rule = this.buildingRules.get(domainKey);
      
      if (rule) {
        operations.push(...rule.requiredOperations);
        if (analysis.complexity === 'high') {
          operations.push(...rule.suggestedOperations);
        }
      }
    }
    
    // Add cross-domain operations if multiple domains
    if (analysis.domains.length > 1) {
      operations.push('fuseData', 'generateCrossInsights');
    }
    
    return [...new Set(operations)]; // Remove duplicates
  }

  async buildWorkflowSteps(analysis, requiredOperations, similarWorkflows) {
    const steps = [];
    let stepOrder = 1;
    
    // Add data gathering steps
    for (const operation of requiredOperations) {
      if (!operation.includes('generate') && !operation.includes('analyze') && !operation.includes('fuse')) {
        steps.push({
          operation,
          params: {},
          order: stepOrder++,
          dependencies: []
        });
      }
    }
    
    // Add processing steps
    for (const operation of requiredOperations) {
      if (operation.includes('analyze') || operation.includes('fuse')) {
        steps.push({
          operation,
          params: {},
          order: stepOrder++,
          dependencies: steps.slice(0, -1).map(s => s.operation)
        });
      }
    }
    
    // Add output generation steps
    for (const operation of requiredOperations) {
      if (operation.includes('generate')) {
        steps.push({
          operation,
          params: {},
          order: stepOrder++,
          dependencies: steps.map(s => s.operation)
        });
      }
    }
    
    // Add formatting step
    steps.push({
      operation: 'formatResponse',
      params: { format: analysis.complexity === 'high' ? 'detailed' : 'summary' },
      order: stepOrder++,
      dependencies: steps.map(s => s.operation)
    });
    
    return steps;
  }

  removeDuplicateSteps(steps) {
    if (!Array.isArray(steps)) {
      return { deduplicatedSteps: [], duplicatesRemoved: 0 };
    }
    
    const seen = new Set();
    const deduplicatedSteps = [];
    let duplicatesRemoved = 0;
    
    for (const step of steps) {
      if (!step || !step.operation) continue;
      
      const stepSignature = `${step.operation}_${JSON.stringify(step.params || {})}`;
      if (!seen.has(stepSignature)) {
        seen.add(stepSignature);
        deduplicatedSteps.push(step);
      } else {
        duplicatesRemoved++;
      }
    }
    
    return { deduplicatedSteps, duplicatesRemoved };
  }

  async optimizeStepOrder(steps) {
    if (!Array.isArray(steps)) {
      return { reorderedSteps: [], reorderingBenefit: 0 };
    }
    
    // Simple optimization: group by operation type
    const dataSteps = steps.filter(s => s && s.operation && !s.operation.includes('generate') && !s.operation.includes('analyze'));
    const processSteps = steps.filter(s => s && s.operation && (s.operation.includes('analyze') || s.operation.includes('fuse')));
    const outputSteps = steps.filter(s => s && s.operation && (s.operation.includes('generate') || s.operation.includes('format')));
    
    const reorderedSteps = [...dataSteps, ...processSteps, ...outputSteps];
    const reorderingBenefit = steps.length !== reorderedSteps.length ? 15 : 0;
    
    return { reorderedSteps, reorderingBenefit };
  }

  identifyParallelExecution(steps) {
    if (!Array.isArray(steps)) {
      return { parallelSteps: [], parallelOpportunities: 0 };
    }
    
    const parallelSteps = steps.map(step => ({
      ...step,
      canRunInParallel: (step.dependencies || []).length === 0
    }));
    
    const parallelOpportunities = parallelSteps.filter(s => s.canRunInParallel).length;
    
    return { parallelSteps, parallelOpportunities };
  }

  async optimizeStepParameters(steps) {
    return steps.map(step => ({
      ...step,
      params: {
        ...step.params,
        optimized: true,
        cacheEnabled: true
      }
    }));
  }

  addCachingHints(steps) {
    return steps.map(step => ({
      ...step,
      caching: {
        enabled: !step.operation.includes('generate'),
        ttl: step.operation.includes('weather') ? 300 : 3600 // 5 min for weather, 1 hour for others
      }
    }));
  }

  async inferParameterValue(operation, paramKey, context, intent) {
    const rule = this.parameterInferenceRules.get(paramKey);
    if (rule && (rule.operation === '*' || rule.operation === operation)) {
      return rule.logic(context);
    }
    
    // Default inference logic
    if (paramKey === 'timeframe') return '30days';
    if (paramKey === 'format') return 'summary';
    if (paramKey === 'includeInsights') return true;
    
    return null;
  }

  // Additional helper methods...
  generateWorkflowName(analysis) {
    const primaryDomain = analysis.domains[0] || 'General';
    const actionType = analysis.actionVerbs[0] || 'Smart';
    return `${actionType.charAt(0).toUpperCase() + actionType.slice(1)} ${primaryDomain.charAt(0).toUpperCase() + primaryDomain.slice(1)} Workflow`;
  }

  generateWorkflowDescription(analysis, steps) {
    const domains = analysis.domains.join(' and ');
    const stepCount = steps.length;
    return `Intelligent workflow that processes ${domains} data through ${stepCount} optimized steps to provide comprehensive insights.`;
  }

  identifyWorkflowPattern(analysis, steps) {
    const domains = analysis.domains.sort().join('_');
    const complexity = analysis.complexity;
    const stepTypes = steps.map(s => s.operation.split(/(?=[A-Z])/).pop().toLowerCase()).join('_');
    
    return `${domains}_${complexity}_${stepTypes}`.substring(0, 50);
  }

  calculateBuildConfidence(analysis, requiredOperations, similarWorkflows) {
    let confidence = 0.7; // Base confidence
    
    if (analysis.domains.length > 0) confidence += 0.1;
    if (requiredOperations.length > 0) confidence += 0.1;
    if (similarWorkflows.length > 0) confidence += 0.1;
    if (analysis.confidence > 0.8) confidence += 0.1;
    
    return Math.min(confidence, 1.0);
  }

  estimatePerformance(steps) {
    const baseTime = 500; // Base execution time in ms
    const stepTime = steps.length * 200; // Each step adds ~200ms
    const parallelFactor = steps.filter(s => s.canRunInParallel).length * 0.1;
    
    return {
      estimatedTime: Math.round((baseTime + stepTime) * (1 - parallelFactor)),
      estimatedSuccessRate: 0.85,
      estimatedComplexity: steps.length > 5 ? 'high' : steps.length > 3 ? 'medium' : 'low'
    };
  }

  async generateAlternativeApproaches(analysis, workflow) {
    const alternatives = [];
    
    // Fast approach
    if (workflow.steps.length > 3) {
      alternatives.push({
        type: 'fast',
        description: 'Simplified workflow optimized for speed',
        estimatedTime: Math.round(workflow.metadata.estimatedPerformance.estimatedTime * 0.6),
        tradeoffs: ['Less detailed insights', 'Fewer data sources']
      });
    }
    
    // Comprehensive approach
    alternatives.push({
      type: 'comprehensive',
      description: 'Enhanced workflow with maximum insights',
      estimatedTime: Math.round(workflow.metadata.estimatedPerformance.estimatedTime * 1.4),
      benefits: ['Deeper analysis', 'More data sources', 'Predictive insights']
    });
    
    return alternatives;
  }

  // Fusion helper methods
  fuseSequentially(workflows) {
    const fusedSteps = [];
    let stepOrder = 1;
    
    for (const workflow of workflows) {
      for (const step of workflow.steps || []) {
        fusedSteps.push({
          ...step,
          order: stepOrder++,
          sourceWorkflow: workflow.id
        });
      }
    }
    
    return fusedSteps;
  }

  fuseInParallel(workflows) {
    const fusedSteps = [];
    const maxSteps = Math.max(...workflows.map(w => (w.steps || []).length));
    
    for (let i = 0; i < maxSteps; i++) {
      for (const workflow of workflows) {
        if (workflow.steps && workflow.steps[i]) {
          fusedSteps.push({
            ...workflow.steps[i],
            order: i + 1,
            parallelGroup: i,
            sourceWorkflow: workflow.id
          });
        }
      }
    }
    
    return fusedSteps;
  }

  async fuseContextually(workflows, targetIntent) {
    // Intelligent fusion based on intent analysis
    const intentAnalysis = await this.analyzeNaturalLanguage(targetIntent);
    const fusedSteps = [];
    let stepOrder = 1;
    
    // Group steps by type
    const dataSteps = [];
    const processSteps = [];
    const outputSteps = [];
    
    for (const workflow of workflows) {
      for (const step of workflow.steps || []) {
        if (step.operation.includes('get') || step.operation.includes('fetch')) {
          dataSteps.push({ ...step, sourceWorkflow: workflow.id });
        } else if (step.operation.includes('analyze') || step.operation.includes('process')) {
          processSteps.push({ ...step, sourceWorkflow: workflow.id });
        } else {
          outputSteps.push({ ...step, sourceWorkflow: workflow.id });
        }
      }
    }
    
    // Fuse steps intelligently
    fusedSteps.push(...dataSteps.map(s => ({ ...s, order: stepOrder++ })));
    fusedSteps.push(...processSteps.map(s => ({ ...s, order: stepOrder++ })));
    fusedSteps.push(...outputSteps.map(s => ({ ...s, order: stepOrder++ })));
    
    return fusedSteps;
  }

  generateFusedIntent(workflows) {
    const intents = workflows.map(w => w.intent).join(' and ');
    return `Combined workflow: ${intents}`;
  }

  generateFusedWorkflowName(workflows, fusionType) {
    const names = workflows.map(w => w.name || w.intent.substring(0, 20));
    return `${fusionType.charAt(0).toUpperCase() + fusionType.slice(1)} Fusion: ${names.join(' + ')}`;
  }

  generateFusedDescription(workflows, fusionType) {
    return `Intelligent fusion of ${workflows.length} workflows using ${fusionType} strategy to create a comprehensive solution.`;
  }

  // Enhancement detection methods
  hasInsightGeneration(workflow) {
    return (workflow.steps || []).some(step => 
      step.operation.includes('insight') || step.operation.includes('analyze')
    );
  }

  hasVisualization(workflow) {
    return (workflow.steps || []).some(step => 
      step.operation.includes('visualization') || step.operation.includes('chart')
    );
  }

  hasErrorRecovery(workflow) {
    return (workflow.steps || []).some(step => 
      step.errorHandling || step.recovery
    );
  }

  hasCaching(workflow) {
    return (workflow.steps || []).some(step => 
      step.caching || step.cache
    );
  }

  hasPersonalization(workflow) {
    return (workflow.steps || []).some(step => 
      step.operation.includes('personalize') || step.operation.includes('preference')
    );
  }

  async identifyCrossDomainOpportunities(workflow) {
    const opportunities = [];
    const currentDomains = this.extractCurrentDomains(workflow);
    
    if (currentDomains.includes('financial') && !currentDomains.includes('weather')) {
      opportunities.push({
        type: 'cross_domain_integration',
        title: 'Add Weather Context',
        description: 'Enhance financial insights with weather-based spending patterns',
        impact: 'medium',
        newDomain: 'weather'
      });
    }
    
    return opportunities;
  }

  async identifyPerformanceEnhancements(workflow) {
    const enhancements = [];
    const steps = workflow.steps || [];
    
    if (steps.length > 5) {
      enhancements.push({
        type: 'performance_optimization',
        title: 'Enable Parallel Processing',
        description: 'Run independent operations in parallel for faster execution',
        impact: 'high',
        expectedImprovement: '40-60% faster execution'
      });
    }
    
    return enhancements;
  }

  extractCurrentDomains(workflow) {
    const domains = new Set();
    const text = (workflow.description || workflow.intent || '').toLowerCase();
    
    if (/financial|balance|account|money/i.test(text)) domains.add('financial');
    if (/weather|temperature|forecast/i.test(text)) domains.add('weather');
    if (/currency|exchange|rate/i.test(text)) domains.add('currency');
    
    return Array.from(domains);
  }

  // Workflow adaptation methods
  analyzeExistingWorkflow(workflow) {
    return {
      domains: this.extractCurrentDomains(workflow),
      complexity: (workflow.steps || []).length > 5 ? 'high' : 'medium',
      pattern: workflow.pattern || 'unknown'
    };
  }

  identifyAdaptationStrategy(baseAnalysis, newAnalysis) {
    const baseDomains = new Set(baseAnalysis.domains || []);
    const newDomains = new Set(newAnalysis.domains || []);
    
    const addedDomains = [...newDomains].filter(d => !baseDomains.has(d));
    const removedDomains = [...baseDomains].filter(d => !newDomains.has(d));
    
    if (addedDomains.length > 0 && removedDomains.length === 0) {
      return { type: 'extend', reason: 'Adding new domains', confidence: 0.8 };
    } else if (removedDomains.length > 0 && addedDomains.length === 0) {
      return { type: 'simplify', reason: 'Removing domains', confidence: 0.7 };
    } else if (addedDomains.length > 0 && removedDomains.length > 0) {
      return { type: 'transform', reason: 'Changing focus domains', confidence: 0.6 };
    } else {
      return { type: 'modify', reason: 'Refining existing approach', confidence: 0.9 };
    }
  }

  async extendWorkflow(workflow, newAnalysis) {
    // Add new steps based on new requirements
    const additionalSteps = await this.identifyRequiredOperations(newAnalysis);
    const existingOperations = new Set((workflow.steps || []).map(s => s.operation));
    
    let maxOrder = Math.max(...(workflow.steps || []).map(s => s.order || 0));
    
    for (const operation of additionalSteps) {
      if (!existingOperations.has(operation)) {
        workflow.steps.push({
          operation,
          params: {},
          order: ++maxOrder,
          addedBy: 'adaptation'
        });
      }
    }
    
    return workflow;
  }

  async modifyWorkflow(workflow, newAnalysis) {
    // Modify existing steps to match new requirements
    for (const step of workflow.steps || []) {
      if (step.params) {
        step.params.adapted = true;
        step.params.adaptationReason = 'modified_for_new_requirements';
      }
    }
    
    return workflow;
  }

  async simplifyWorkflow(workflow, newAnalysis) {
    // Remove unnecessary steps
    const requiredOperations = await this.identifyRequiredOperations(newAnalysis);
    workflow.steps = (workflow.steps || []).filter(step => 
      requiredOperations.includes(step.operation) || 
      step.operation === 'formatResponse'
    );
    
    return workflow;
  }

  async transformWorkflow(workflow, newAnalysis) {
    // Completely rebuild workflow with new focus
    const newSteps = await this.buildWorkflowSteps(newAnalysis, 
      await this.identifyRequiredOperations(newAnalysis), []);
    
    workflow.steps = newSteps;
    workflow.transformedFrom = workflow.pattern;
    workflow.pattern = this.identifyWorkflowPattern(newAnalysis, newSteps);
    
    return workflow;
  }

  // Utility methods for optimization strategies
  findDuplicateOperations(steps) {
    const operations = new Map();
    const duplicates = [];
    
    for (const step of steps) {
      const key = `${step.operation}_${JSON.stringify(step.params)}`;
      if (operations.has(key)) {
        duplicates.push(step);
      } else {
        operations.set(key, step);
      }
    }
    
    return duplicates;
  }

  findParallelOpportunities(steps) {
    return steps.filter(step => 
      (step.dependencies || []).length === 0 && 
      !step.operation.includes('generate') && 
      !step.operation.includes('format')
    );
  }

  findCachingOpportunities(steps) {
    return steps.filter(step => 
      step.operation.includes('get') || 
      step.operation.includes('fetch')
    );
  }

  enableParallelExecution(steps) {
    return steps.map(step => ({
      ...step,
      parallel: (step.dependencies || []).length === 0
    }));
  }
}