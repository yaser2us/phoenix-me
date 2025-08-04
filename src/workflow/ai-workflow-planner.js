import { logger } from '../utils/logger.js';
import { IntentParser } from '../parsers/intent-parser.js';

/**
 * AI Workflow Planner - Decomposes complex intents into executable workflows
 * Handles multi-operation planning, dependency analysis, and optimization
 */
export class AIWorkflowPlanner {
  constructor(apiRegistry) {
    this.apiRegistry = apiRegistry;
    this.intentParser = new IntentParser(apiRegistry);
    this.logger = logger;
  }

  /**
   * Plans a complete workflow from user intent
   * @param {string} userIntent - Natural language request
   * @param {Object} userContext - User context (location, auth, preferences)
   * @returns {Object} Workflow specification
   */
  async planFromIntent(userIntent, userContext = {}) {
    try {
      // 1. Decompose complex intent into sub-goals
      const subGoals = await this.decomposeIntent(userIntent);
      
      // 2. Map sub-goals to available operations
      const operationMappings = await this.mapSubGoalsToOperations(subGoals);
      
      // 3. Analyze parameter dependencies
      const dependencies = this.analyzeParameterDependencies(operationMappings);
      
      // 4. Plan optimal execution sequence
      const executionPlan = this.planExecutionSequence(operationMappings, dependencies);
      
      // 5. Generate workflow specification
      const workflowSpec = this.generateWorkflowSpec(executionPlan, userIntent);
      
      // 6. Optimize workflow for performance
      const optimizedWorkflow = await this.optimizeWorkflow(workflowSpec);
      
      return optimizedWorkflow;
    } catch (error) {
      this.logger.error('Workflow planning failed:', error);
      throw error;
    }
  }

  /**
   * Decomposes complex intent into actionable sub-goals
   */
  async decomposeIntent(userIntent) {
    const subGoals = [];
    
    // Banking-related patterns
    const bankingPatterns = [
      { pattern: /check.*balance|balance.*check|account.*status|my.*balance/i, goal: 'check_balance' },
      { pattern: /transfer.*money|send.*money|pay.*to|transfer.*\$\d+/i, goal: 'transfer_money' },
      { pattern: /account.*summary|banking.*summary|my.*account/i, goal: 'account_summary' }
    ];
    
    // Weather-related patterns
    const weatherPatterns = [
      { pattern: /weather|temperature|forecast|rain/i, goal: 'check_weather' },
      { pattern: /weather.*location|weather.*for/i, goal: 'location_weather' }
    ];
    
    // Location-related patterns
    const locationPatterns = [
      { pattern: /restaurant|food|eat|dining/i, goal: 'find_restaurants' },
      { pattern: /atm|cash|withdraw/i, goal: 'find_atms' },
      { pattern: /nearby|around|close|near/i, goal: 'location_search' },
      { pattern: /find.*atm|atm.*near/i, goal: 'find_atms' }
    ];
    
    // Special patterns for ambiguous words
    const ambiguousPatterns = {
      'money': { goal: 'check_balance', domain: 'banking', confidence: 0.7 },
      'food': { goal: 'find_restaurants', domain: 'location', confidence: 0.7 }
    };
    
    // Currency-related patterns
    const currencyPatterns = [
      { pattern: /exchange.*rate|currency|convert/i, goal: 'currency_exchange' }
    ];
    
    // Check each pattern group
    for (const pattern of bankingPatterns) {
      if (pattern.pattern.test(userIntent)) {
        subGoals.push({
          goal: pattern.goal,
          domain: 'banking',
          confidence: 0.9
        });
      }
    }
    
    for (const pattern of weatherPatterns) {
      if (pattern.pattern.test(userIntent)) {
        subGoals.push({
          goal: pattern.goal,
          domain: 'weather',
          confidence: 0.85
        });
      }
    }
    
    for (const pattern of locationPatterns) {
      if (pattern.pattern.test(userIntent)) {
        subGoals.push({
          goal: pattern.goal,
          domain: 'location',
          confidence: 0.8
        });
      }
    }
    
    for (const pattern of currencyPatterns) {
      if (pattern.pattern.test(userIntent)) {
        subGoals.push({
          goal: pattern.goal,
          domain: 'currency',
          confidence: 0.85
        });
      }
    }
    
    // Check for ambiguous words if no patterns matched
    if (subGoals.length === 0) {
      const words = userIntent.toLowerCase().split(/\s+/);
      for (const word of words) {
        if (ambiguousPatterns[word]) {
          subGoals.push(ambiguousPatterns[word]);
        }
      }
    }
    
    // If still no matches, try general intent parsing
    if (subGoals.length === 0) {
      const generalIntent = await this.intentParser.parseIntent(userIntent);
      if (generalIntent.operation) {
        subGoals.push({
          goal: generalIntent.operation,
          domain: generalIntent.apiId || 'general',
          confidence: generalIntent.confidence || 0.7
        });
      }
    }
    
    this.logger.debug('Decomposed intent into sub-goals:', subGoals);
    return subGoals;
  }

  /**
   * Maps sub-goals to available API operations
   */
  async mapSubGoalsToOperations(subGoals) {
    const mappings = [];
    
    // Define goal-to-operation mappings
    const goalMappings = {
      'check_balance': 'get_banking_getBalance',
      'account_summary': 'get_banking_summary',
      'transfer_money': 'post_banking_transfer',
      'check_weather': 'getCurrentWeather',
      'location_weather': 'getCurrentWeather',
      'find_restaurants': 'getCurrentLocation',  // Use location as placeholder
      'find_atms': 'getCurrentLocation',  // Use location as placeholder
      'currency_exchange': 'getExchangeRates'
    };
    
    for (const subGoal of subGoals) {
      // First try direct mapping
      const directOperationId = goalMappings[subGoal.goal];
      
      if (directOperationId) {
        // Find the operation in registry
        const operation = this.apiRegistry.getOperation(directOperationId);
        if (operation) {
          mappings.push({
            subGoal: subGoal.goal,
            domain: subGoal.domain,
            operation: operation,
            apiId: operation.apiId,
            confidence: subGoal.confidence,
            requiredParams: operation.parameters || []
          });
          continue;
        }
      }
      
      // Otherwise try to find matching operations
      const operations = this.apiRegistry.findOperationsByIntent(subGoal.goal);
      
      if (operations.length > 0) {
        // Use the best matching operation
        const bestMatch = operations[0];
        mappings.push({
          subGoal: subGoal.goal,
          domain: subGoal.domain,
          operation: bestMatch.operation,
          apiId: bestMatch.apiId,
          confidence: subGoal.confidence * (bestMatch.confidence || 1),
          requiredParams: bestMatch.operation.parameters || []
        });
      } else {
        // Try fuzzy matching
        const fuzzyMatch = await this.findFuzzyOperationMatch(subGoal);
        if (fuzzyMatch) {
          mappings.push({
            subGoal: subGoal.goal,
            domain: subGoal.domain,
            operation: fuzzyMatch.operation,
            apiId: fuzzyMatch.apiId,
            confidence: subGoal.confidence * 0.7,
            requiredParams: fuzzyMatch.operation.parameters || []
          });
        }
      }
    }
    
    return mappings;
  }

  /**
   * Analyzes parameter dependencies between operations
   */
  analyzeParameterDependencies(operationMappings) {
    const dependencies = {
      parameterFlow: [],
      sharedParams: {},
      requiredOrder: []
    };
    
    // Common parameter mappings between operations
    const parameterMappings = {
      location: ['location', 'city', 'latitude', 'longitude', 'coordinates'],
      authentication: ['jwt', 'token', 'apiKey', 'authorization'],
      amount: ['amount', 'value', 'sum', 'total'],
      currency: ['currency', 'fromCurrency', 'toCurrency', 'currencyCode'],
      account: ['accountId', 'accountNumber', 'account']
    };
    
    // Check for parameter dependencies
    for (let i = 0; i < operationMappings.length; i++) {
      const current = operationMappings[i];
      
      for (let j = i + 1; j < operationMappings.length; j++) {
        const next = operationMappings[j];
        
        // Check if operations share parameter types
        for (const [paramType, paramNames] of Object.entries(parameterMappings)) {
          const currentHasParam = current.requiredParams.some(p => 
            paramNames.includes(p.name?.toLowerCase())
          );
          const nextHasParam = next.requiredParams.some(p => 
            paramNames.includes(p.name?.toLowerCase())
          );
          
          if (currentHasParam && nextHasParam) {
            if (!dependencies.sharedParams[paramType]) {
              dependencies.sharedParams[paramType] = [];
            }
            dependencies.sharedParams[paramType].push({
              operations: [current.subGoal, next.subGoal],
              canShare: true
            });
          }
        }
        
        // Check if one operation's output can be another's input
        if (current.domain === 'location' && next.domain === 'weather') {
          dependencies.parameterFlow.push({
            from: current.subGoal,
            to: next.subGoal,
            parameter: 'location',
            required: true
          });
          dependencies.requiredOrder.push([current.subGoal, next.subGoal]);
        }
      }
    }
    
    return dependencies;
  }

  /**
   * Plans optimal execution sequence considering dependencies
   */
  planExecutionSequence(operationMappings, dependencies) {
    const executionPlan = {
      sequential: [],
      parallel: [],
      steps: []
    };
    
    // Sort operations by confidence and dependencies
    const sortedOps = [...operationMappings].sort((a, b) => {
      // Check if there's a required order dependency
      for (const order of dependencies.requiredOrder) {
        if (order[0] === a.subGoal && order[1] === b.subGoal) return -1;
        if (order[0] === b.subGoal && order[1] === a.subGoal) return 1;
      }
      // Otherwise sort by confidence
      return b.confidence - a.confidence;
    });
    
    // Group operations that can run in parallel
    const processed = new Set();
    let stepIndex = 0;
    
    while (processed.size < sortedOps.length) {
      const parallelGroup = [];
      
      for (const op of sortedOps) {
        if (processed.has(op.subGoal)) continue;
        
        // Check if this operation has unmet dependencies
        const hasDependency = dependencies.parameterFlow.some(flow => 
          flow.to === op.subGoal && !processed.has(flow.from)
        );
        
        if (!hasDependency) {
          parallelGroup.push(op);
          processed.add(op.subGoal);
        }
      }
      
      if (parallelGroup.length > 0) {
        executionPlan.steps.push({
          index: stepIndex++,
          operations: parallelGroup,
          parallel: parallelGroup.length > 1
        });
      }
    }
    
    return executionPlan;
  }

  /**
   * Generates complete workflow specification
   */
  generateWorkflowSpec(executionPlan, userIntent) {
    const workflowId = `workflow_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    return {
      id: workflowId,
      name: `Dynamic workflow for: ${userIntent.substring(0, 50)}...`,
      intent: userIntent,
      created: new Date().toISOString(),
      executionPlan: executionPlan,
      parameters: this.extractWorkflowParameters(executionPlan),
      estimatedDuration: this.estimateWorkflowDuration(executionPlan),
      metadata: {
        totalOperations: executionPlan.steps.reduce((sum, step) => 
          sum + step.operations.length, 0
        ),
        parallelSteps: executionPlan.steps.filter(s => s.parallel).length,
        sequentialSteps: executionPlan.steps.filter(s => !s.parallel).length
      }
    };
  }

  /**
   * Optimizes workflow for performance
   */
  async optimizeWorkflow(workflowSpec) {
    const optimized = { ...workflowSpec };
    
    // Optimization strategies
    optimized.optimizations = {
      caching: this.identifyCachingOpportunities(workflowSpec),
      batching: this.identifyBatchingOpportunities(workflowSpec),
      parallelization: this.maximizeParallelization(workflowSpec)
    };
    
    // Add performance hints
    optimized.performanceHints = {
      estimatedLatency: this.calculateEstimatedLatency(workflowSpec),
      criticalPath: this.identifyCriticalPath(workflowSpec),
      bottlenecks: this.identifyBottlenecks(workflowSpec)
    };
    
    return optimized;
  }

  /**
   * Finds fuzzy operation matches for unmatched sub-goals
   */
  async findFuzzyOperationMatch(subGoal) {
    // Simple fuzzy matching based on goal keywords
    const allOperations = this.apiRegistry.getAllOperations();
    let bestMatch = null;
    let bestScore = 0;
    
    // Expanded keyword mappings for better fuzzy matching
    const keywordMappings = {
      'money': ['balance', 'account', 'banking', 'transfer'],
      'food': ['restaurant', 'dining', 'eat', 'places'],
      'weather': ['weather', 'temperature', 'forecast', 'rain'],
      'location': ['nearby', 'places', 'find', 'search'],
      'cash': ['atm', 'withdraw', 'money'],
      'exchange': ['currency', 'convert', 'rate']
    };
    
    // Extract keywords from the goal
    const goalWords = subGoal.goal.toLowerCase().split(/[\s_]+/);
    const expandedKeywords = [];
    
    for (const word of goalWords) {
      expandedKeywords.push(word);
      if (keywordMappings[word]) {
        expandedKeywords.push(...keywordMappings[word]);
      }
    }
    
    for (const [apiId, operations] of Object.entries(allOperations)) {
      for (const [operationId, operation] of Object.entries(operations)) {
        const score = this.calculateFuzzyScore(expandedKeywords.join(' '), operationId, operation);
        if (score > bestScore && score > 0.3) {
          bestScore = score;
          bestMatch = {
            apiId,
            operation: { ...operation, operationId },
            confidence: score
          };
        }
      }
    }
    
    return bestMatch;
  }

  /**
   * Calculates fuzzy matching score
   */
  calculateFuzzyScore(goal, operationId, operation) {
    const goalWords = goal.toLowerCase().split(/[_\s]+/);
    const opWords = operationId.toLowerCase().split(/[_\s]+/);
    const descWords = (operation.summary || '').toLowerCase().split(/\s+/);
    
    let score = 0;
    let matches = 0;
    
    for (const goalWord of goalWords) {
      if (opWords.some(w => w.includes(goalWord) || goalWord.includes(w))) {
        matches++;
      }
      if (descWords.some(w => w.includes(goalWord) || goalWord.includes(w))) {
        matches += 0.5;
      }
    }
    
    score = matches / (goalWords.length + 1);
    return Math.min(score, 1);
  }

  /**
   * Extracts all required parameters for the workflow
   */
  extractWorkflowParameters(executionPlan) {
    const parameters = new Map();
    
    for (const step of executionPlan.steps) {
      for (const op of step.operations) {
        for (const param of op.requiredParams) {
          const paramKey = `${param.name}_${param.in || 'query'}`;
          if (!parameters.has(paramKey)) {
            parameters.set(paramKey, {
              name: param.name,
              type: param.schema?.type || 'string',
              required: param.required !== false,
              operations: [op.subGoal],
              description: param.description
            });
          } else {
            parameters.get(paramKey).operations.push(op.subGoal);
          }
        }
      }
    }
    
    return Array.from(parameters.values());
  }

  /**
   * Estimates workflow duration based on operations
   */
  estimateWorkflowDuration(executionPlan) {
    const avgOperationTime = 1000; // 1 second average
    let totalTime = 0;
    
    for (const step of executionPlan.steps) {
      if (step.parallel) {
        // Parallel operations take as long as the slowest one
        totalTime += avgOperationTime;
      } else {
        // Sequential operations add up
        totalTime += step.operations.length * avgOperationTime;
      }
    }
    
    return totalTime;
  }

  /**
   * Identifies caching opportunities
   */
  identifyCachingOpportunities(workflowSpec) {
    const cacheable = [];
    
    // Weather data is highly cacheable
    workflowSpec.executionPlan.steps.forEach(step => {
      step.operations.forEach(op => {
        if (op.domain === 'weather' || op.subGoal.includes('exchange_rate')) {
          cacheable.push({
            operation: op.subGoal,
            ttl: op.domain === 'weather' ? 3600000 : 300000, // 1 hour for weather, 5 min for rates
            key: `${op.apiId}_${op.operation.operationId}`
          });
        }
      });
    });
    
    return cacheable;
  }

  /**
   * Identifies batching opportunities
   */
  identifyBatchingOpportunities(workflowSpec) {
    const batchable = [];
    
    // Group operations by API to reduce connection overhead
    const apiGroups = {};
    workflowSpec.executionPlan.steps.forEach(step => {
      step.operations.forEach(op => {
        if (!apiGroups[op.apiId]) {
          apiGroups[op.apiId] = [];
        }
        apiGroups[op.apiId].push(op);
      });
    });
    
    for (const [apiId, ops] of Object.entries(apiGroups)) {
      if (ops.length > 1) {
        batchable.push({
          apiId,
          operations: ops.map(o => o.subGoal),
          potential: 'connection_reuse'
        });
      }
    }
    
    return batchable;
  }

  /**
   * Maximizes parallelization opportunities
   */
  maximizeParallelization(workflowSpec) {
    const suggestions = [];
    
    // Check if sequential steps could be parallelized
    for (let i = 0; i < workflowSpec.executionPlan.steps.length - 1; i++) {
      const current = workflowSpec.executionPlan.steps[i];
      const next = workflowSpec.executionPlan.steps[i + 1];
      
      if (!current.parallel && !next.parallel) {
        // Check if they have parameter dependencies
        const hasDepedency = workflowSpec.parameters.some(p => 
          p.operations.includes(current.operations[0].subGoal) &&
          p.operations.includes(next.operations[0].subGoal)
        );
        
        if (!hasDepedency) {
          suggestions.push({
            steps: [i, i + 1],
            reason: 'no_parameter_dependency',
            improvement: 'parallel_execution'
          });
        }
      }
    }
    
    return suggestions;
  }

  /**
   * Calculates estimated latency
   */
  calculateEstimatedLatency(workflowSpec) {
    const networkLatency = 50; // 50ms average network latency
    const processingTime = 100; // 100ms average processing
    
    const totalOps = workflowSpec.metadata.totalOperations;
    const parallelReduction = workflowSpec.metadata.parallelSteps * 0.7;
    
    return (totalOps * (networkLatency + processingTime)) - 
           (parallelReduction * networkLatency);
  }

  /**
   * Identifies critical path in workflow
   */
  identifyCriticalPath(workflowSpec) {
    const path = [];
    
    // Find longest sequential chain
    for (const step of workflowSpec.executionPlan.steps) {
      if (!step.parallel || step.operations.length === 1) {
        path.push({
          step: step.index,
          operations: step.operations.map(o => o.subGoal),
          impact: 'blocking'
        });
      }
    }
    
    return path;
  }

  /**
   * Identifies potential bottlenecks
   */
  identifyBottlenecks(workflowSpec) {
    const bottlenecks = [];
    
    // Operations requiring authentication are potential bottlenecks
    workflowSpec.parameters.forEach(param => {
      if (param.name.toLowerCase().includes('token') || 
          param.name.toLowerCase().includes('auth')) {
        bottlenecks.push({
          type: 'authentication',
          operations: param.operations,
          mitigation: 'pre_authenticate'
        });
      }
    });
    
    // Large parameter lists can be bottlenecks
    workflowSpec.executionPlan.steps.forEach(step => {
      step.operations.forEach(op => {
        if (op.requiredParams.length > 5) {
          bottlenecks.push({
            type: 'parameter_collection',
            operation: op.subGoal,
            paramCount: op.requiredParams.length,
            mitigation: 'batch_collection'
          });
        }
      });
    });
    
    return bottlenecks;
  }
}