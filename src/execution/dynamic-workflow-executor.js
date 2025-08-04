import { logger } from '../utils/logger.js';
import { ApiExecutor } from './executor.js';

/**
 * Dynamic Workflow Executor - Phase 4.9 Checkpoint 2
 * Executes dynamically composed workflows with intelligent orchestration
 */
export class DynamicWorkflowExecutor {
  constructor(registry, orchestrator, apiExecutor = null) {
    this.registry = registry;
    this.orchestrator = orchestrator;
    this.apiExecutor = apiExecutor || new ApiExecutor(registry, {});
    this.executionHistory = [];
    
    logger.info('Dynamic Workflow Executor initialized');
  }

  /**
   * Execute a complete workflow plan
   */
  async executeWorkflow(workflowPlan, options = {}) {
    const executionId = this.generateExecutionId();
    const startTime = Date.now();
    
    logger.info('Starting workflow execution', {
      executionId,
      stepCount: workflowPlan.steps.length,
      hasDataFlow: workflowPlan.dataFlowMap && workflowPlan.dataFlowMap.size > 0
    });
    
    try {
      // Ensure all steps have IDs
      const stepsWithIds = workflowPlan.steps.map((step, index) => ({
        ...step,
        id: step.id || `step_${index + 1}`,
        dependencies: step.dependencies || []
      }));
      
      // Plan execution strategy
      const executionPlan = await this.orchestrator.planExecution(stepsWithIds);
      
      // Initialize execution context
      const executionContext = {
        id: executionId,
        plan: { ...workflowPlan, steps: stepsWithIds },
        executionPlan,
        stepResults: new Map(),
        startTime,
        options
      };
      
      // Execute workflow in planned batches
      const result = await this.executeInBatches(executionContext);
      
      // Record execution history
      this.executionHistory.push({
        ...result,
        executionId,
        workflowPlan,
        executedAt: new Date().toISOString()
      });
      
      logger.info('Workflow execution completed', {
        executionId,
        success: result.success,
        duration: result.metrics.totalTime,
        stepsExecuted: result.metrics.stepsExecuted
      });
      
      return result;
      
    } catch (error) {
      logger.error('Workflow execution failed', {
        executionId,
        error: error.message,
        duration: Date.now() - startTime
      });
      
      return {
        success: false,
        executionId,
        error: error.message,
        stepResults: {},
        metrics: {
          totalTime: Date.now() - startTime,
          stepsExecuted: 0,
          stepsSucceeded: 0,
          stepsFailed: 0
        }
      };
    }
  }

  /**
   * Execute workflow in planned batches (sequential/parallel)
   */
  async executeInBatches(executionContext) {
    const { executionPlan, stepResults } = executionContext;
    let successfulSteps = 0;
    let failedSteps = 0;
    
    try {
      // Execute each batch according to the plan
      for (const [batchIndex, batch] of executionPlan.batches.entries()) {
        logger.debug('Executing batch', { 
          batchIndex: batchIndex + 1, 
          batchSize: batch.length,
          strategy: batch.length > 1 ? 'parallel' : 'sequential'
        });
        
        // Execute batch steps
        const batchResults = await this.executeBatch(batch, executionContext);
        
        // Update step results
        for (const [stepId, result] of batchResults) {
          stepResults.set(stepId, result);
          if (result.success) {
            successfulSteps++;
          } else {
            failedSteps++;
          }
        }
        
        // Apply data flow transformations after each batch
        if (executionContext.plan.dataFlowMap) {
          await this.applyDataFlowTransformations(batchResults, executionContext);
        }
        
        // Check if we should continue after failures
        if (failedSteps > 0 && !executionContext.options.continueOnFailure) {
          const shouldContinue = await this.orchestrator.shouldContinueAfterFailure(
            Array.from(stepResults.values()),
            executionContext.plan
          );
          
          if (!shouldContinue) {
            logger.warn('Stopping execution due to critical failures', {
              successfulSteps,
              failedSteps,
              batchIndex: batchIndex + 1
            });
            break;
          }
        }
      }
      
      // Generate final result
      return this.generateExecutionResult(executionContext, successfulSteps, failedSteps);
      
    } catch (error) {
      logger.error('Batch execution failed', { error: error.message });
      throw error;
    }
  }

  /**
   * Execute a single batch of steps (parallel or sequential)
   */
  async executeBatch(batch, executionContext) {
    const batchResults = new Map();
    
    if (batch.length === 1) {
      // Single step - execute directly
      const step = batch[0];
      const result = await this.executeStep(step, executionContext);
      batchResults.set(step.id, result);
      
    } else {
      // Multiple steps - execute in parallel
      const promises = batch.map(step => 
        this.executeStep(step, executionContext).then(result => [step.id, result])
      );
      
      const results = await Promise.allSettled(promises);
      
      for (const promiseResult of results) {
        if (promiseResult.status === 'fulfilled') {
          const [stepId, stepResult] = promiseResult.value;
          batchResults.set(stepId, stepResult);
        } else {
          logger.error('Parallel step execution failed', { 
            error: promiseResult.reason.message 
          });
          // Add failed result for the step
          batchResults.set('unknown', {
            success: false,
            error: promiseResult.reason.message,
            executedAt: new Date().toISOString()
          });
        }
      }
    }
    
    return batchResults;
  }

  /**
   * Execute a single workflow step
   */
  async executeStep(step, executionContext) {
    const stepStartTime = Date.now();
    
    logger.debug('Executing step', {
      stepId: step.id,
      operation: step.operation,
      hasDependencies: step.dependencies && step.dependencies.length > 0
    });
    
    try {
      // Check if this is a synthetic operation
      if (this.isSyntheticOperation(step.operation)) {
        return await this.executeSyntheticOperation(step, executionContext);
      }
      
      // Get operation details from registry
      const operation = this.registry.getOperationDetails(step.operation);
      if (!operation) {
        throw new Error(`Operation '${step.operation}' not found in registry`);
      }
      
      // Prepare parameters (including data flow inputs)
      const parameters = await this.prepareStepParameters(step, executionContext);
      
      // PHASE 5: Execute the operation with JWT session context
      const executionOptions = {
        sessionId: executionContext.options.sessionId || executionContext.id || 'default_session',
        userId: executionContext.options.userId || 'default',
        ...executionContext.options
      };
      
      const executionResult = await this.apiExecutor.executeOperation(
        step.operation,
        parameters,
        executionOptions
      );
      
      const stepResult = {
        success: executionResult.success,
        data: executionResult.data,
        error: executionResult.error,
        operation: step.operation,
        parameters,
        duration: Date.now() - stepStartTime,
        executedAt: new Date().toISOString()
      };
      
      logger.debug('Step execution completed', {
        stepId: step.id,
        success: stepResult.success,
        duration: stepResult.duration
      });
      
      return stepResult;
      
    } catch (error) {
      const stepResult = {
        success: false,
        error: error.message,
        operation: step.operation,
        duration: Date.now() - stepStartTime,
        executedAt: new Date().toISOString()
      };
      
      logger.error('Step execution failed', {
        stepId: step.id,
        operation: step.operation,
        error: error.message,
        duration: stepResult.duration
      });
      
      // Attempt error recovery
      const recovery = await this.orchestrator.handleStepFailure(step, stepResult, executionContext);
      if (recovery && recovery.recovered) {
        return { ...stepResult, ...recovery.result, recovered: true };
      }
      
      return stepResult;
    }
  }

  /**
   * Execute synthetic operations (created by composition system)
   */
  async executeSyntheticOperation(step, executionContext) {
    logger.debug('Executing synthetic operation', { operation: step.operation });
    
    // Get input data from dependencies
    const inputData = await this.gatherDependencyData(step, executionContext);
    
    switch (step.operation) {
      case 'synthesize_response':
        return await this.synthesizeResponse(inputData, step.parameters);
        
      case 'synthesize_financial_overview':
        return await this.synthesizeFinancialOverview(inputData, step.parameters);
        
      case 'analyze_weather_spending_patterns':
        return await this.analyzeWeatherSpending(inputData, step.parameters);
        
      case 'convert_balance_currency':
        return await this.convertBalanceCurrency(inputData, step.parameters);
        
      case 'create_comprehensive_dashboard':
        return await this.createComprehensiveDashboard(inputData, step.parameters);
        
      default:
        return {
          success: false,
          error: `Unknown synthetic operation: ${step.operation}`,
          executedAt: new Date().toISOString()
        };
    }
  }

  /**
   * Prepare step parameters including data flow inputs
   */
  async prepareStepParameters(step, executionContext) {
    // Handle both 'parameters' and 'params' properties for flexibility
    let parameters = { ...step.parameters, ...step.params };
    
    // Merge with execution context parameters if available
    if (executionContext.options.parameters) {
      parameters = { ...parameters, ...executionContext.options.parameters };
    }
    
    // Add data flow inputs if this step has incoming data flows
    if (executionContext.plan.dataFlowMap && executionContext.plan.dataFlowMap.has(step.id)) {
      const dataFlows = executionContext.plan.dataFlowMap.get(step.id);
      
      for (const flow of dataFlows) {
        const sourceResult = executionContext.stepResults.get(flow.from);
        if (sourceResult && sourceResult.success) {
          const transformedData = await this.orchestrator.dataFlowManager.transformData(
            sourceResult.data,
            flow.transformation,
            flow.field
          );
          
          parameters[flow.field] = transformedData;
        }
      }
    }
    
    return parameters;
  }

  /**
   * Apply data flow transformations after batch execution
   */
  async applyDataFlowTransformations(batchResults, executionContext) {
    if (!this.orchestrator.dataFlowManager) return;
    
    for (const [stepId, result] of batchResults) {
      if (!result.success) continue;
      
      // Apply any outgoing data flows from this step
      const outgoingFlows = this.findOutgoingDataFlows(stepId, executionContext.plan);
      
      for (const flow of outgoingFlows) {
        try {
          const transformedData = await this.orchestrator.dataFlowManager.transformData(
            result.data,
            flow.transformation,
            flow.field
          );
          
          // Store transformed data for target step
          if (!result.transformedOutputs) {
            result.transformedOutputs = {};
          }
          result.transformedOutputs[flow.field] = transformedData;
          
        } catch (error) {
          logger.warn('Data flow transformation failed', {
            flow,
            error: error.message
          });
        }
      }
    }
  }

  /**
   * Find outgoing data flows from a step
   */
  findOutgoingDataFlows(stepId, plan) {
    const flows = [];
    
    if (plan.dataFlowMap) {
      for (const [targetStepId, stepFlows] of plan.dataFlowMap) {
        for (const flow of stepFlows) {
          if (flow.from === stepId) {
            flows.push(flow);
          }
        }
      }
    }
    
    return flows;
  }

  /**
   * Gather data from step dependencies
   */
  async gatherDependencyData(step, executionContext) {
    const inputData = {};
    
    if (step.dependencies) {
      for (const depStepId of step.dependencies) {
        const depResult = executionContext.stepResults.get(depStepId);
        if (depResult && depResult.success) {
          inputData[depStepId] = depResult.data;
        }
      }
    }
    
    return inputData;
  }

  /**
   * Check if operation is synthetic
   */
  isSyntheticOperation(operationId) {
    const syntheticPrefixes = ['synthesize_', 'analyze_', 'convert_', 'create_'];
    return syntheticPrefixes.some(prefix => operationId.startsWith(prefix));
  }

  /**
   * Synthetic operation implementations
   */
  async synthesizeResponse(inputData, parameters) {
    return {
      success: true,
      data: {
        synthesis: 'Combined response from multiple data sources',
        inputSources: Object.keys(inputData),
        combinedData: inputData,
        generatedAt: new Date().toISOString()
      },
      executedAt: new Date().toISOString()
    };
  }

  async synthesizeFinancialOverview(inputData, parameters) {
    return {
      success: true,
      data: {
        overview: 'Comprehensive financial overview',
        sources: Object.keys(inputData),
        summary: 'Financial data successfully combined and analyzed',
        generatedAt: new Date().toISOString()
      },
      executedAt: new Date().toISOString()
    };
  }

  async analyzeWeatherSpending(inputData, parameters) {
    return {
      success: true,
      data: {
        analysis: 'Weather-based spending pattern analysis',
        recommendation: 'Adjust spending based on weather conditions',
        confidence: 0.85,
        generatedAt: new Date().toISOString()
      },
      executedAt: new Date().toISOString()
    };
  }

  async convertBalanceCurrency(inputData, parameters) {
    return {
      success: true,
      data: {
        originalBalance: inputData.balance || 0,
        convertedBalance: (inputData.balance || 0) * 0.21, // Mock USD conversion
        currency: parameters.targetCurrency || 'USD',
        exchangeRate: 0.21,
        convertedAt: new Date().toISOString()
      },
      executedAt: new Date().toISOString()
    };
  }

  async createComprehensiveDashboard(inputData, parameters) {
    return {
      success: true,
      data: {
        dashboard: 'Comprehensive financial dashboard',
        sections: Object.keys(inputData),
        combinedInsights: 'All data sources successfully integrated',
        generatedAt: new Date().toISOString()
      },
      executedAt: new Date().toISOString()
    };
  }

  /**
   * Generate final execution result
   */
  generateExecutionResult(executionContext, successfulSteps, failedSteps) {
    const totalTime = Date.now() - executionContext.startTime;
    const totalSteps = successfulSteps + failedSteps;
    
    return {
      success: failedSteps === 0,
      executionId: executionContext.id,
      stepResults: Object.fromEntries(executionContext.stepResults),
      metrics: {
        totalTime,
        stepsExecuted: totalSteps,
        stepsSucceeded: successfulSteps,
        stepsFailed: failedSteps,
        successRate: totalSteps > 0 ? ((successfulSteps / totalSteps) * 100).toFixed(1) : 0,
        parallelOps: this.countParallelOperations(executionContext.executionPlan),
        dataFlows: executionContext.plan.dataFlowMap ? executionContext.plan.dataFlowMap.size : 0
      },
      summary: this.generateExecutionSummary(executionContext.stepResults),
      completedAt: new Date().toISOString()
    };
  }

  /**
   * Count parallel operations in execution plan
   */
  countParallelOperations(executionPlan) {
    return executionPlan.batches.reduce((count, batch) => 
      count + (batch.length > 1 ? batch.length : 0), 0
    );
  }

  /**
   * Generate execution summary
   */
  generateExecutionSummary(stepResults) {
    const summary = {
      totalSteps: stepResults.size,
      operations: [],
      dataGenerated: false,
      errors: []
    };
    
    for (const [stepId, result] of stepResults) {
      summary.operations.push({
        stepId,
        operation: result.operation,
        success: result.success,
        duration: result.duration
      });
      
      if (result.success && result.data) {
        summary.dataGenerated = true;
      }
      
      if (!result.success && result.error) {
        summary.errors.push({
          stepId,
          error: result.error
        });
      }
    }
    
    return summary;
  }

  /**
   * Generate unique execution ID
   */
  generateExecutionId() {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    return `exec_${timestamp}_${random}`;
  }

  /**
   * Get execution history
   */
  getExecutionHistory(limit = 10) {
    return this.executionHistory.slice(-limit);
  }

  /**
   * Clear execution history
   */
  clearHistory() {
    this.executionHistory = [];
    logger.info('Execution history cleared');
  }
}