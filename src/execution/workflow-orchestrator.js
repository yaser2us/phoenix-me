import { logger } from '../utils/logger.js';

/**
 * Workflow Orchestrator - Phase 4.9 Checkpoint 2
 * Orchestrates parallel/sequential execution and handles dependencies
 */
export class WorkflowOrchestrator {
  constructor(dataFlowManager, errorRecovery) {
    this.dataFlowManager = dataFlowManager;
    this.errorRecovery = errorRecovery;
    this.executionStrategies = this.initializeExecutionStrategies();
    
    logger.info('Workflow Orchestrator initialized');
  }

  /**
   * Plan execution strategy for workflow steps
   */
  async planExecution(steps) {
    try {
      logger.debug('Planning execution strategy', { stepCount: steps.length });
      
      // Analyze dependencies
      const dependencyGraph = this.buildDependencyGraph(steps);
      
      // Determine execution strategy
      const strategy = this.determineExecutionStrategy(dependencyGraph, steps);
      
      // Create execution batches
      const batches = this.createExecutionBatches(steps, dependencyGraph, strategy);
      
      // Estimate execution time
      const estimatedTime = await this.estimateExecutionTime(steps, strategy);
      
      const executionPlan = {
        strategy,
        batches,
        estimatedTime,
        dependencyGraph,
        parallelizable: strategy === 'parallel' || strategy === 'mixed',
        createdAt: new Date().toISOString()
      };
      
      logger.info('Execution plan created', {
        strategy,
        batchCount: batches.length,
        estimatedTime,
        parallelizable: executionPlan.parallelizable
      });
      
      return executionPlan;
      
    } catch (error) {
      logger.error('Execution planning failed', { error: error.message });
      throw error;
    }
  }

  /**
   * Build dependency graph from steps
   */
  buildDependencyGraph(steps) {
    const graph = new Map();
    
    // Initialize graph with all steps
    for (const step of steps) {
      graph.set(step.id, {
        step,
        dependencies: step.dependencies || [],
        dependents: []
      });
    }
    
    // Build reverse dependencies (dependents)
    for (const [stepId, node] of graph) {
      for (const depId of node.dependencies) {
        const depNode = graph.get(depId);
        if (depNode) {
          depNode.dependents.push(stepId);
        }
      }
    }
    
    return graph;
  }

  /**
   * Determine optimal execution strategy
   */
  determineExecutionStrategy(dependencyGraph, steps) {
    const hasDependencies = Array.from(dependencyGraph.values())
      .some(node => node.dependencies.length > 0);
    
    if (!hasDependencies) {
      return steps.length > 1 ? 'parallel' : 'sequential';
    }
    
    // Check if it's purely sequential
    const isSequential = this.isSequentialExecution(dependencyGraph);
    if (isSequential) {
      return 'sequential';
    }
    
    // Mixed strategy - some parallel, some sequential
    return 'mixed';
  }

  /**
   * Check if execution must be purely sequential
   */
  isSequentialExecution(dependencyGraph) {
    const steps = Array.from(dependencyGraph.values());
    
    // Sort by dependency count
    steps.sort((a, b) => a.dependencies.length - b.dependencies.length);
    
    // Check if each step depends on the previous one
    for (let i = 1; i < steps.length; i++) {
      const currentStep = steps[i];
      const previousStep = steps[i - 1];
      
      if (!currentStep.dependencies.includes(previousStep.step.id)) {
        return false;
      }
    }
    
    return true;
  }

  /**
   * Create execution batches based on dependencies
   */
  createExecutionBatches(steps, dependencyGraph, strategy) {
    if (strategy === 'parallel') {
      return [steps]; // All steps in one batch
    }
    
    if (strategy === 'sequential') {
      return steps.map(step => [step]); // One step per batch
    }
    
    // Mixed strategy - topological sort with batching
    return this.createMixedExecutionBatches(steps, dependencyGraph);
  }

  /**
   * Create mixed execution batches using topological sorting
   */
  createMixedExecutionBatches(steps, dependencyGraph) {
    const batches = [];
    const processed = new Set();
    const stepMap = new Map(steps.map(step => [step.id, step]));
    
    while (processed.size < steps.length) {
      const currentBatch = [];
      
      // Find steps with no unprocessed dependencies
      for (const step of steps) {
        if (processed.has(step.id)) continue;
        
        const node = dependencyGraph.get(step.id);
        const unprocessedDeps = node.dependencies.filter(depId => !processed.has(depId));
        
        if (unprocessedDeps.length === 0) {
          currentBatch.push(step);
        }
      }
      
      if (currentBatch.length === 0) {
        // Circular dependency or error - add remaining steps
        const remaining = steps.filter(step => !processed.has(step.id));
        batches.push(remaining);
        break;
      }
      
      batches.push(currentBatch);
      
      // Mark steps as processed
      for (const step of currentBatch) {
        processed.add(step.id);
      }
    }
    
    return batches;
  }

  /**
   * Estimate execution time for workflow
   */
  async estimateExecutionTime(steps, strategy = 'sequential') {
    try {
      let totalTime = 0;
      
      for (const step of steps) {
        const stepTime = this.estimateStepTime(step);
        
        if (strategy === 'parallel') {
          // Parallel execution - max time of all steps
          totalTime = Math.max(totalTime, stepTime);
        } else {
          // Sequential or mixed - sum of all times
          totalTime += stepTime;
        }
      }
      
      // Add orchestration overhead
      const orchestrationOverhead = steps.length * 0.1; // 100ms per step
      totalTime += orchestrationOverhead;
      
      return Math.round(totalTime * 100) / 100; // Round to 2 decimal places
      
    } catch (error) {
      logger.warn('Time estimation failed, using default', { error: error.message });
      return steps.length * 2; // Default 2 seconds per step
    }
  }

  /**
   * Estimate execution time for individual step
   */
  estimateStepTime(step) {
    const baseTime = 1; // 1 second base
    
    // Domain-based timing
    if (step.operation) {
      const opLower = step.operation.toLowerCase();
      
      if (opLower.includes('banking') || opLower.includes('maybank')) {
        return baseTime + 3; // Banking operations take longer
      }
      
      if (opLower.includes('synthesize') || opLower.includes('analyze')) {
        return baseTime + 2; // Processing operations
      }
      
      if (opLower.includes('weather') || opLower.includes('currency')) {
        return baseTime + 0.5; // External API calls
      }
    }
    
    // Parameter complexity
    const paramCount = step.parameters ? Object.keys(step.parameters).length : 0;
    if (paramCount > 3) {
      return baseTime + 0.5;
    }
    
    return baseTime;
  }

  /**
   * Handle step failure during execution
   */
  async handleStepFailure(step, stepResult, executionContext) {
    try {
      logger.warn('Handling step failure', { 
        stepId: step.id, 
        operation: step.operation,
        error: stepResult.error 
      });
      
      // Determine if recovery is possible
      const recoveryStrategy = await this.errorRecovery.determineRetryStrategy(stepResult);
      
      if (recoveryStrategy.shouldRetry) {
        logger.info('Attempting step recovery', { 
          stepId: step.id,
          strategy: recoveryStrategy.strategy,
          attempts: recoveryStrategy.maxRetries
        });
        
        // Attempt recovery
        const recovery = await this.errorRecovery.executeRecovery(
          step.id,
          executionContext.stepResults,
          executionContext.plan
        );
        
        return recovery;
      }
      
      // No recovery possible
      return { recovered: false, reason: 'No recovery strategy available' };
      
    } catch (error) {
      logger.error('Step failure handling failed', { 
        stepId: step.id, 
        error: error.message 
      });
      
      return { recovered: false, reason: error.message };
    }
  }

  /**
   * Determine if execution should continue after failures
   */
  async shouldContinueAfterFailure(stepResults, workflowPlan) {
    try {
      const failedSteps = stepResults.filter(result => !result.success);
      const totalSteps = stepResults.length;
      const failureRate = failedSteps.length / totalSteps;
      
      // Stop if more than 50% of steps failed
      if (failureRate > 0.5) {
        logger.warn('High failure rate, stopping execution', { 
          failureRate: (failureRate * 100).toFixed(1) + '%',
          failedSteps: failedSteps.length,
          totalSteps
        });
        return false;
      }
      
      // Check if any critical steps failed
      const criticalSteps = this.identifyCriticalSteps(workflowPlan);
      const criticalFailures = failedSteps.filter(result => 
        criticalSteps.includes(result.operation)
      );
      
      if (criticalFailures.length > 0) {
        logger.warn('Critical step failed, stopping execution', {
          criticalFailures: criticalFailures.map(f => f.operation)
        });
        return false;
      }
      
      return true;
      
    } catch (error) {
      logger.error('Continue decision failed', { error: error.message });
      return false; // Conservative approach
    }
  }

  /**
   * Identify critical steps in workflow
   */
  identifyCriticalSteps(workflowPlan) {
    const criticalSteps = [];
    
    // Banking operations are typically critical
    for (const step of workflowPlan.steps) {
      if (step.operation && step.operation.includes('banking')) {
        criticalSteps.push(step.operation);
      }
      
      // Steps with many dependents are critical
      if (step.dependencies && step.dependencies.length > 2) {
        criticalSteps.push(step.operation);
      }
    }
    
    return criticalSteps;
  }

  /**
   * Initialize execution strategies
   */
  initializeExecutionStrategies() {
    return {
      sequential: {
        name: 'Sequential',
        description: 'Execute steps one after another',
        parallelism: 1,
        suitable: (steps) => steps.some(s => s.dependencies && s.dependencies.length > 0)
      },
      
      parallel: {
        name: 'Parallel',
        description: 'Execute all steps simultaneously',
        parallelism: -1, // Unlimited
        suitable: (steps) => steps.every(s => !s.dependencies || s.dependencies.length === 0)
      },
      
      mixed: {
        name: 'Mixed',
        description: 'Execute independent steps in parallel, dependent steps sequentially',
        parallelism: 0, // Variable
        suitable: (steps) => true // Always suitable as fallback
      }
    };
  }

  /**
   * Get orchestration metrics
   */
  getOrchestrationMetrics() {
    return {
      availableStrategies: Object.keys(this.executionStrategies),
      dataFlowCapable: !!this.dataFlowManager,
      errorRecoveryCapable: !!this.errorRecovery
    };
  }

  /**
   * Optimize execution plan
   */
  async optimizeExecutionPlan(executionPlan) {
    try {
      // Look for optimization opportunities
      const optimizations = [];
      
      // Batch consolidation
      if (executionPlan.batches.length > 1) {
        const consolidatable = this.findConsolidatableBatches(executionPlan.batches);
        if (consolidatable.length > 0) {
          optimizations.push({
            type: 'batch_consolidation',
            description: `Can consolidate ${consolidatable.length} batches`,
            impact: 'Reduced orchestration overhead'
          });
        }
      }
      
      // Parallel opportunity detection
      const parallelOpportunities = this.findParallelOpportunities(executionPlan);
      if (parallelOpportunities > 0) {
        optimizations.push({
          type: 'parallelization',
          description: `${parallelOpportunities} steps can run in parallel`,
          impact: 'Reduced execution time'
        });
      }
      
      return {
        originalPlan: executionPlan,
        optimizations,
        optimizable: optimizations.length > 0
      };
      
    } catch (error) {
      logger.error('Execution plan optimization failed', { error: error.message });
      return { originalPlan: executionPlan, optimizations: [], optimizable: false };
    }
  }

  /**
   * Find batches that can be consolidated
   */
  findConsolidatableBatches(batches) {
    const consolidatable = [];
    
    for (let i = 0; i < batches.length - 1; i++) {
      const currentBatch = batches[i];
      const nextBatch = batches[i + 1];
      
      // Check if next batch steps have no dependencies on current batch
      const canConsolidate = nextBatch.every(step => 
        !step.dependencies || 
        !step.dependencies.some(depId => 
          currentBatch.some(currentStep => currentStep.id === depId)
        )
      );
      
      if (canConsolidate) {
        consolidatable.push(i);
      }
    }
    
    return consolidatable;
  }

  /**
   * Find parallel execution opportunities
   */
  findParallelOpportunities(executionPlan) {
    let opportunities = 0;
    
    for (const batch of executionPlan.batches) {
      if (batch.length === 1) {
        // Single step batches might be parallelizable
        opportunities++;
      }
    }
    
    return Math.max(0, opportunities - 1); // At least 2 steps needed for parallel
  }
}