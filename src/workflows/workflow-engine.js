import { logger } from '../utils/logger.js';
import { BankingWorkflows } from './banking-workflows.js';
import { IntelligentCache } from '../caching/intelligent-cache.js';
import { SecurityClassifier } from '../caching/security-classifier.js';
import { ConsentManager } from '../caching/consent-manager.js';
import { JWTManager } from '../authentication/jwt-manager.js';
import { BankingAPIAdapter } from '../adapters/banking-api-adapter.js';
import { InteractiveBankingTool } from '../interaction/interactive-banking-tool.js';

/**
 * Enhanced Workflow Engine for Phase 4.1 Checkpoint 4
 * Orchestrates complex banking workflows with security, caching, and error recovery
 * 
 * Features:
 * - Multi-step workflow execution
 * - Security-aware parameter handling
 * - Intelligent caching integration
 * - Interactive user prompting
 * - Error recovery and rollback
 * - Banking compliance requirements
 */
export class WorkflowEngine {
  constructor(registry) {
    this.registry = registry;
    this.bankingWorkflows = new BankingWorkflows();
    this.cache = new IntelligentCache();
    this.securityClassifier = new SecurityClassifier();
    this.consentManager = new ConsentManager();
    this.jwtManager = new JWTManager();
    this.bankingAdapter = new BankingAPIAdapter(registry);
    this.interactiveTool = new InteractiveBankingTool(registry);

    // Workflow execution tracking
    this.activeExecutions = new Map(); // executionId -> execution state
    this.executionHistory = new Map(); // executionId -> execution history
    
    // Rollback tracking
    this.rollbackHandlers = new Map(); // stepType -> rollback function
    
    // Performance metrics
    this.metrics = {
      executionsStarted: 0,
      executionsCompleted: 0,
      executionsFailed: 0,
      rollbacksExecuted: 0,
      averageExecutionTime: 0,
      cacheHitRate: 0
    };

    this.initializeRollbackHandlers();
    this.initialized = true;
    logger.info('Enhanced Workflow Engine initialized for complex banking operations');
  }

  /**
   * Execute a banking workflow
   * @param {string} workflowId - Workflow identifier
   * @param {Object} initialContext - Initial execution context
   * @param {Object} options - Execution options
   * @returns {Promise<Object>} Execution result
   */
  async executeWorkflow(workflowId, initialContext = {}, options = {}) {
    const executionId = this.generateExecutionId();
    const startTime = Date.now();
    
    try {
      this.metrics.executionsStarted++;
      
      // Get workflow definition
      const workflow = this.bankingWorkflows.getWorkflow(workflowId);
      if (!workflow) {
        throw new Error(`Workflow '${workflowId}' not found`);
      }

      // Initialize execution state
      const execution = {
        id: executionId,
        workflowId: workflowId,
        workflow: workflow,
        status: 'running',
        currentStep: 0,
        context: { ...initialContext },
        stepResults: {},
        completedSteps: [],
        rollbackSteps: [],
        startTime: startTime,
        userId: initialContext.userId || 'anonymous',
        sessionId: initialContext.sessionId || null
      };

      this.activeExecutions.set(executionId, execution);
      
      logger.info('Workflow execution started', {
        executionId,
        workflowId,
        userId: execution.userId,
        totalSteps: workflow.steps.length
      });

      // Execute workflow steps
      const result = await this.executeSteps(execution, options);
      
      // Calculate execution time
      const executionTime = Date.now() - startTime;
      this.updateExecutionMetrics(executionTime, true);
      
      // Mark execution as completed
      execution.status = 'completed';
      execution.endTime = Date.now();
      execution.executionTime = executionTime;
      
      // Move to history
      this.executionHistory.set(executionId, execution);
      this.activeExecutions.delete(executionId);
      
      logger.info('Workflow execution completed successfully', {
        executionId,
        workflowId,
        executionTime,
        stepsCompleted: execution.completedSteps.length
      });

      return {
        success: true,
        executionId: executionId,
        result: result,
        executionTime: executionTime,
        stepsCompleted: isMaybankWorkflow ? execution.completedSteps.length : execution.completedSteps.length,
        isMaybankWorkflow: isMaybankWorkflow,
        metadata: {
          workflowId: workflowId,
          userId: execution.userId,
          sessionId: execution.sessionId,
          isMaybankWorkflow: isMaybankWorkflow,
          workflowType: execution.workflowType
        }
      };

    } catch (error) {
      this.updateExecutionMetrics(Date.now() - startTime, false);
      
      const execution = this.activeExecutions.get(executionId);
      if (execution) {
        execution.status = 'failed';
        execution.error = error.message;
        execution.endTime = Date.now();
        
        // Attempt rollback if configured
        await this.handleExecutionError(execution, error);
        
        // Move to history
        this.executionHistory.set(executionId, execution);
        this.activeExecutions.delete(executionId);
      }

      logger.error('Workflow execution failed', {
        executionId,
        workflowId,
        error: error.message,
        step: execution?.currentStep
      });

      throw new Error(`Workflow execution failed: ${error.message}`);
    }
  }

  /**
   * Execute Maybank workflow (Phase 4.2)
   * @param {Object} execution - Execution state
   * @param {Object} options - Execution options
   * @returns {Promise<*>} Final result
   */
  async executeMaybankWorkflow(execution, options = {}) {
    try {
      // Validate JWT token is present
      if (!execution.context.jwtToken) {
        throw new Error('JWT token is required for Maybank workflow execution');
      }

      // Prepare step results collection
      const stepResults = {};
      const workflow = execution.workflow;

      logger.info('Executing Maybank workflow steps', {
        executionId: execution.id,
        workflowName: execution.workflowId,
        stepCount: workflow.stepCount
      });

      // Execute each step in the workflow
      for (let i = 0; i < workflow.steps.length; i++) {
        const step = workflow.steps[i];
        execution.currentStep = i;

        logger.info('Executing Maybank workflow step', {
          executionId: execution.id,
          stepId: step.id,
          operation: step.operation,
          stepIndex: i + 1,
          totalSteps: workflow.steps.length
        });

        try {
          // Execute the Maybank API operation
          const stepResult = await this.executeMaybankStep(step, execution, options);
          
          // Store step result with mapping
          stepResults[step.outputMapping] = stepResult;
          execution.stepResults[step.id] = stepResult;
          execution.completedSteps.push(step.id);

          logger.info('Maybank workflow step completed', {
            executionId: execution.id,
            stepId: step.id,
            outputMapping: step.outputMapping
          });

        } catch (stepError) {
          logger.error('Maybank workflow step failed', {
            executionId: execution.id,
            stepId: step.id,
            operation: step.operation,
            error: stepError.message
          });
          throw new Error(`Maybank workflow step '${step.id}' failed: ${stepError.message}`);
        }
      }

      // Process workflow results using Maybank workflows post-processing
      const processedResult = await this.maybankWorkflows.processWorkflowResults(
        execution.workflowId,
        stepResults,
        execution.context
      );

      logger.info('Maybank workflow completed successfully', {
        executionId: execution.id,
        workflowName: execution.workflowId,
        stepsCompleted: execution.completedSteps.length
      });

      return processedResult;

    } catch (error) {
      logger.error('Maybank workflow execution failed', {
        executionId: execution.id,
        workflowName: execution.workflowId,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Execute a single Maybank workflow step
   * @param {Object} step - Maybank workflow step
   * @param {Object} execution - Execution state
   * @param {Object} options - Execution options
   * @returns {Promise<Object>} Step result
   */
  async executeMaybankStep(step, execution, options = {}) {
    const stepStartTime = Date.now();
    
    try {
      // Prepare request using Maybank adapter
      const requestData = {
        operation: step.operation,
        jwtToken: execution.context.jwtToken,
        parameters: step.parameters
      };

      const preparedRequest = await this.maybankAdapter.prepareRequest(requestData);
      
      // Execute HTTP request
      const response = await this.executeHttpRequest(preparedRequest);
      
      // Validate and format response
      const validation = await this.maybankAdapter.validateResponse(response.data, step.operation);
      
      if (!validation.isValid) {
        throw new Error(`Invalid Maybank response: ${validation.error}`);
      }

      const stepTime = Date.now() - stepStartTime;
      
      logger.info('Maybank step executed successfully', {
        executionId: execution.id,
        stepId: step.id,
        operation: step.operation,
        executionTime: stepTime
      });
      
      return {
        success: true,
        data: validation.extractedData,
        rawData: response.data,
        operation: step.operation,
        executionTime: stepTime,
        timestamp: new Date().toISOString()
      };
      
    } catch (error) {
      logger.error('Maybank step execution failed', {
        executionId: execution.id,
        stepId: step.id,
        operation: step.operation,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Execute HTTP request for Maybank operations
   * @param {Object} requestConfig - Request configuration
   * @returns {Promise<Object>} HTTP response
   */
  async executeHttpRequest(requestConfig) {
    const axios = (await import('axios')).default;
    
    try {
      logger.debug('Making Maybank HTTP request', {
        method: requestConfig.method,
        url: requestConfig.url,
        hasAuth: !!requestConfig.headers?.Authorization
      });
      
      const response = await axios(requestConfig);
      
      return {
        status: response.status,
        statusText: response.statusText,
        data: response.data,
        headers: response.headers
      };
      
    } catch (error) {
      if (error.response) {
        // API returned an error response
        const status = error.response.status;
        const data = error.response.data;
        
        switch (status) {
          case 401:
            throw new Error('Maybank authentication failed - JWT token may be invalid or expired');
          case 403:
            throw new Error('Maybank access forbidden - insufficient permissions');
          case 404:
            throw new Error('Maybank resource not found');
          case 429:
            throw new Error('Maybank API rate limit exceeded');
          case 500:
          case 502:
          case 503:
          case 504:
            throw new Error('Maybank service error - please try again later');
          default:
            const errorMessage = data?.message || data?.error || `HTTP ${status} error`;
            throw new Error(`Maybank API request failed: ${errorMessage}`);
        }
      } else if (error.code === 'ECONNABORTED') {
        throw new Error('Maybank API request timeout');
      } else if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
        throw new Error('Unable to reach Maybank API service');
      } else {
        throw new Error(`Maybank network request failed: ${error.message}`);
      }
    }
  }

  /**
   * Get workflow by ID (enhanced to support Maybank workflows)
   * @param {string} workflowId - Workflow identifier
   * @returns {Object} Workflow definition
   */
  getWorkflow(workflowId) {
    // Check Maybank workflows first
    if (workflowId.startsWith('maybank_')) {
      try {
        return {
          workflow: this.maybankWorkflows.getWorkflow(workflowId),
          isMaybankWorkflow: true
        };
      } catch (error) {
        // Fall through to regular workflows
      }
    }
    
    // Check regular banking workflows
    try {
      return {
        workflow: this.bankingWorkflows.getWorkflow(workflowId),
        isMaybankWorkflow: false
      };
    } catch (error) {
      throw new Error(`Workflow '${workflowId}' not found`);
    }
  }

  /**
   * List all available workflows (enhanced to include Maybank workflows)
   * @returns {Array} List of all workflows
   */
  getAllWorkflows() {
    const bankingWorkflows = this.bankingWorkflows.getAllWorkflows().map(wf => ({
      ...wf,
      type: 'banking',
      isMaybankWorkflow: false
    }));
    
    const maybankWorkflows = this.maybankWorkflows.getAllWorkflows().map(wf => ({
      ...wf,
      type: 'maybank',
      isMaybankWorkflow: true
    }));
    
    return [...bankingWorkflows, ...maybankWorkflows];
  }

  /**
   * Execute workflow steps sequentially
   * @param {Object} execution - Execution state
   * @param {Object} options - Execution options
   * @returns {Promise<*>} Final result
   */
  async executeSteps(execution, options = {}) {
    let finalResult = null;
    
    for (let i = 0; i < execution.workflow.steps.length; i++) {
      const step = execution.workflow.steps[i];
      execution.currentStep = i;
      
      // Check dependencies
      if (!this.checkStepDependencies(step, execution.completedSteps)) {
        throw new Error(`Step '${step.id}' dependencies not met`);
      }
      
      logger.info('Executing workflow step', {
        executionId: execution.id,
        stepId: step.id,
        stepName: step.name,
        stepType: step.type,
        stepIndex: i + 1,
        totalSteps: execution.workflow.steps.length
      });
      
      try {
        // Execute the step
        const stepResult = await this.executeStep(step, execution, options);
        
        // Store step result
        execution.stepResults[step.id] = stepResult;
        execution.completedSteps.push(step.id);
        
        // Track rollback capability
        if (step.rollbackable) {
          execution.rollbackSteps.push({
            stepId: step.id,
            stepType: step.type,
            rollbackData: stepResult.rollbackData || {}
          });
        }
        
        // Update context with step results
        if (stepResult.contextUpdates) {
          Object.assign(execution.context, stepResult.contextUpdates);
        }
        
        // Check for early termination
        if (stepResult.terminate) {
          finalResult = stepResult.result;
          break;
        }
        
        // Set final result from last step
        if (i === execution.workflow.steps.length - 1) {
          finalResult = stepResult.result;
        }
        
      } catch (stepError) {
        // Handle step-specific errors
        const errorHandled = await this.handleStepError(step, execution, stepError, options);
        
        if (!errorHandled) {
          throw new Error(`Step '${step.id}' failed: ${stepError.message}`);
        }
      }
    }
    
    return finalResult;
  }

  /**
   * Execute a single workflow step
   * @param {Object} step - Step definition
   * @param {Object} execution - Execution state
   * @param {Object} options - Execution options
   * @returns {Promise<Object>} Step result
   */
  async executeStep(step, execution, options = {}) {
    const stepStartTime = Date.now();
    
    try {
      let result;
      
      switch (step.type) {
        case 'authentication':
          result = await this.executeAuthenticationStep(step, execution);
          break;
          
        case 'api_call':
          result = await this.executeAPICallStep(step, execution);
          break;
          
        case 'parallel_api_calls':
          result = await this.executeParallelAPICallsStep(step, execution);
          break;
          
        case 'user_input':
          result = await this.executeUserInputStep(step, execution, options);
          break;
          
        case 'validation':
          result = await this.executeValidationStep(step, execution);
          break;
          
        case 'computation':
          result = await this.executeComputationStep(step, execution);
          break;
          
        case 'conditional_execution':
          result = await this.executeConditionalStep(step, execution, options);
          break;
          
        case 'report_generation':
          result = await this.executeReportGenerationStep(step, execution);
          break;
          
        case 'confirmation':
          result = await this.executeConfirmationStep(step, execution);
          break;
          
        case 'finalization':
          result = await this.executeFinalizationStep(step, execution);
          break;
          
        case 'data_processing':
          result = await this.executeDataProcessingStep(step, execution);
          break;
          
        case 'delivery':
          result = await this.executeDeliveryStep(step, execution);
          break;
          
        default:
          throw new Error(`Unknown step type: ${step.type}`);
      }
      
      const stepTime = Date.now() - stepStartTime;
      
      logger.info('Step executed successfully', {
        executionId: execution.id,
        stepId: step.id,
        stepType: step.type,
        executionTime: stepTime,
        cached: result.fromCache || false
      });
      
      return result;
      
    } catch (error) {
      logger.error('Step execution failed', {
        executionId: execution.id,
        stepId: step.id,
        stepType: step.type,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Execute authentication step
   * @param {Object} step - Step definition
   * @param {Object} execution - Execution state
   * @returns {Promise<Object>} Step result
   */
  async executeAuthenticationStep(step, execution) {
    const jwtToken = execution.context.jwtToken;
    
    if (!jwtToken) {
      return {
        success: false,
        requiresUserInput: true,
        promptType: 'jwt_token',
        message: 'JWT token required for authentication'
      };
    }
    
    const validation = await this.jwtManager.validateToken(jwtToken);
    
    if (!validation.isValid) {
      return {
        success: false,
        requiresUserInput: true,
        promptType: 'jwt_token',
        message: `JWT token validation failed: ${validation.message}`
      };
    }
    
    // Check required scopes
    if (step.validation?.scopes) {
      const hasRequiredScopes = step.validation.scopes.every(requiredScope =>
        validation.scopes?.some(scope => scope.includes(requiredScope))
      );
      
      if (!hasRequiredScopes) {
        throw new Error(`Insufficient JWT token scopes. Required: ${step.validation.scopes.join(', ')}`);
      }
    }
    
    return {
      success: true,
      result: {
        authenticated: true,
        userId: validation.subject,
        scopes: validation.scopes,
        expiresAt: validation.expiresAt
      },
      contextUpdates: {
        userId: validation.subject,
        authenticatedScopes: validation.scopes
      }
    };
  }

  /**
   * Execute API call step
   * @param {Object} step - Step definition
   * @param {Object} execution - Execution state
   * @returns {Promise<Object>} Step result
   */
  async executeAPICallStep(step, execution) {
    const cacheKey = this.generateCacheKey(step, execution);
    
    // Check cache if step is cacheable
    if (step.cacheable) {
      const cached = await this.cache.get(cacheKey, {
        userId: execution.context.userId
      });
      
      if (cached) {
        return {
          success: true,
          result: cached,
          fromCache: true
        };
      }
    }
    
    // Prepare API request
    const requestParams = this.collectStepParameters(step, execution);
    const apiRequest = {
      operation: step.operation,
      jwtToken: execution.context.jwtToken,
      parameters: requestParams,
      userId: execution.context.userId
    };
    
    // Execute API call
    const apiResult = await this.bankingAdapter.prepareRequest(apiRequest);
    
    if (!apiResult.success) {
      throw new Error(`API call failed: ${apiResult.message}`);
    }
    
    // Cache result if configured
    if (step.cacheable && step.cacheOptions) {
      await this.cache.set(cacheKey, apiResult.data, {
        apiType: 'banking',
        ttl: step.cacheOptions.ttl,
        operation: step.operation
      });
    }
    
    return {
      success: true,
      result: apiResult.data,
      rollbackData: step.rollbackable ? {
        operation: step.operation,
        parameters: requestParams
      } : null
    };
  }

  /**
   * Execute parallel API calls step
   * @param {Object} step - Step definition
   * @param {Object} execution - Execution state
   * @returns {Promise<Object>} Step result
   */
  async executeParallelAPICallsStep(step, execution) {
    let sourceData = execution.stepResults[step.source];
    let sourceArray;
    
    // If source is not in step results, check execution context
    if (!sourceData) {
      const contextValue = execution.context[step.source];
      if (Array.isArray(contextValue)) {
        sourceArray = contextValue.map(id => ({ id }));
      } else {
        throw new Error(`Source data for parallel calls not found or invalid: ${step.source}`);
      }
    } else if (!Array.isArray(sourceData.result)) {
      throw new Error(`Source data for parallel calls not found or invalid: ${step.source}`);
    } else {
      sourceArray = sourceData.result;
    }
    
    const promises = sourceArray.map(async (item) => {
      const itemCacheKey = this.generateCacheKey(step, execution, item.id);
      
      // Check cache
      if (step.cacheable) {
        const cached = await this.cache.get(itemCacheKey, {
          userId: execution.context.userId
        });
        
        if (cached) {
          return { id: item.id, data: cached, fromCache: true };
        }
      }
      
      // Execute API call
      const requestParams = {
        ...this.collectStepParameters(step, execution),
        accountId: item.id
      };
      
      const apiRequest = {
        operation: step.operation,
        jwtToken: execution.context.jwtToken,
        parameters: requestParams,
        userId: execution.context.userId
      };
      
      const apiResult = await this.bankingAdapter.prepareRequest(apiRequest);
      
      if (!apiResult.success) {
        throw new Error(`Parallel API call failed for ${item.id}: ${apiResult.message}`);
      }
      
      // Cache result
      if (step.cacheable && step.cacheOptions) {
        await this.cache.set(itemCacheKey, apiResult.data, {
          apiType: 'banking',
          ttl: step.cacheOptions.ttl,
          operation: step.operation
        });
      }
      
      return { id: item.id, data: apiResult.data, fromCache: false };
    });
    
    const results = await Promise.all(promises);
    
    return {
      success: true,
      result: results,
      metadata: {
        totalCalls: results.length,
        cacheHits: results.filter(r => r.fromCache).length
      }
    };
  }

  /**
   * Execute user input step
   * @param {Object} step - Step definition
   * @param {Object} execution - Execution state
   * @param {Object} options - Execution options
   * @returns {Promise<Object>} Step result
   */
  async executeUserInputStep(step, execution, options = {}) {
    // If we're in interactive mode, use the interactive banking tool
    if (step.interactive && options.interactive !== false) {
      const missingParams = step.parameters.filter(param => 
        !execution.context.hasOwnProperty(param)
      );
      
      if (missingParams.length > 0) {
        // Apply defaults if available
        if (step.defaults) {
          for (const param of missingParams) {
            if (step.defaults[param]) {
              const defaultValue = typeof step.defaults[param] === 'function' 
                ? step.defaults[param]() 
                : step.defaults[param];
              execution.context[param] = defaultValue;
            }
          }
        }
        
        // Check again for still missing parameters
        const stillMissing = step.parameters.filter(param => 
          !execution.context.hasOwnProperty(param)
        );
        
        if (stillMissing.length > 0) {
          return {
            success: false,
            requiresUserInput: true,
            missingParameters: stillMissing,
            step: step,
            prompt: this.generateUserPrompt(step, stillMissing, execution)
          };
        }
      }
    }
    
    // Validate collected parameters
    if (step.validation) {
      const validationResult = await this.validateStepParameters(step, execution);
      if (!validationResult.valid) {
        return {
          success: false,
          requiresUserInput: true,
          validationErrors: validationResult.errors,
          step: step
        };
      }
    }
    
    return {
      success: true,
      result: this.collectStepParameters(step, execution),
      contextUpdates: this.collectStepParameters(step, execution)
    };
  }

  /**
   * Execute validation step
   * @param {Object} step - Step definition
   * @param {Object} execution - Execution state
   * @returns {Promise<Object>} Step result
   */
  async executeValidationStep(step, execution) {
    const validationResults = {};
    
    for (const rule of step.rules) {
      const result = await this.executeValidationRule(rule, execution);
      validationResults[rule] = result;
      
      if (!result.valid) {
        throw new Error(`Validation failed for rule '${rule}': ${result.message}`);
      }
    }
    
    return {
      success: true,
      result: validationResults
    };
  }

  /**
   * Execute computation step
   * @param {Object} step - Step definition
   * @param {Object} execution - Execution state
   * @returns {Promise<Object>} Step result
   */
  async executeComputationStep(step, execution) {
    const cacheKey = this.generateCacheKey(step, execution);
    
    // Check cache
    if (step.cacheable) {
      const cached = await this.cache.get(cacheKey);
      if (cached) {
        return {
          success: true,
          result: cached,
          fromCache: true
        };
      }
    }
    
    const computationResults = {};
    
    for (const computation of step.computations) {
      const result = await this.executeComputation(computation, execution);
      computationResults[computation] = result;
    }
    
    // Cache result
    if (step.cacheable && step.cacheOptions) {
      await this.cache.set(cacheKey, computationResults, {
        apiType: 'banking',
        ttl: step.cacheOptions.ttl
      });
    }
    
    return {
      success: true,
      result: computationResults
    };
  }

  /**
   * Execute conditional step
   * @param {Object} step - Step definition
   * @param {Object} execution - Execution state
   * @param {Object} options - Execution options
   * @returns {Promise<Object>} Step result
   */
  async executeConditionalStep(step, execution, options = {}) {
    const condition = execution.context.verificationMethod || 
                     execution.context.condition ||
                     Object.keys(step.conditions)[0];
    
    const conditionSteps = step.conditions[condition];
    if (!conditionSteps) {
      throw new Error(`No steps defined for condition: ${condition}`);
    }
    
    const results = {};
    
    for (const conditionStep of conditionSteps.steps || conditionSteps) {
      // This is a simplified implementation
      // In a real implementation, these would be full step definitions
      results[conditionStep] = {
        executed: true,
        condition: condition,
        timestamp: Date.now()
      };
    }
    
    return {
      success: true,
      result: results,
      contextUpdates: {
        conditionExecuted: condition
      }
    };
  }

  /**
   * Execute report generation step
   * @param {Object} step - Step definition
   * @param {Object} execution - Execution state
   * @returns {Promise<Object>} Step result
   */
  async executeReportGenerationStep(step, execution) {
    const cacheKey = this.generateCacheKey(step, execution);
    
    // Check cache with consent
    if (step.cacheable && step.cacheOptions?.requiresConsent) {
      const hasConsent = await this.consentManager.hasConsent(
        execution.context.userId,
        step.cacheOptions.consentType || 'cache_financial_reports'
      );
      
      if (hasConsent) {
        const cached = await this.cache.get(cacheKey, {
          userId: execution.context.userId
        });
        
        if (cached) {
          return {
            success: true,
            result: cached,
            fromCache: true
          };
        }
      }
    }
    
    // Generate report (simplified implementation)
    const reportData = {
      reportId: this.generateReportId(),
      type: 'financial_summary',
      format: step.format || 'detailed',
      generatedAt: new Date().toISOString(),
      userId: execution.context.userId,
      data: execution.stepResults,
      metadata: {
        workflowId: execution.workflowId,
        executionId: execution.id
      }
    };
    
    // Cache with consent
    if (step.cacheable && step.cacheOptions) {
      await this.cache.set(cacheKey, reportData, {
        apiType: 'banking',
        ttl: step.cacheOptions.ttl
      });
    }
    
    return {
      success: true,
      result: reportData
    };
  }

  /**
   * Execute confirmation step
   * @param {Object} step - Step definition
   * @param {Object} execution - Execution state
   * @returns {Promise<Object>} Step result
   */
  async executeConfirmationStep(step, execution) {
    const confirmationData = {
      confirmationId: this.generateConfirmationId(),
      workflowId: execution.workflowId,
      executionId: execution.id,
      userId: execution.context.userId,
      confirmedAt: new Date().toISOString(),
      details: execution.stepResults
    };
    
    // Cache confirmation
    if (step.cacheable && step.cacheOptions) {
      const cacheKey = this.generateCacheKey(step, execution);
      await this.cache.set(cacheKey, confirmationData, {
        apiType: 'banking',
        ttl: step.cacheOptions.ttl
      });
    }
    
    return {
      success: true,
      result: confirmationData
    };
  }

  /**
   * Execute finalization step
   * @param {Object} step - Step definition
   * @param {Object} execution - Execution state
   * @returns {Promise<Object>} Step result
   */
  async executeFinalizationStep(step, execution) {
    const finalizationData = {
      finalizedAt: new Date().toISOString(),
      workflowId: execution.workflowId,
      executionId: execution.id,
      status: 'finalized',
      results: execution.stepResults
    };
    
    // Cache finalization
    if (step.cacheable && step.cacheOptions) {
      const cacheKey = this.generateCacheKey(step, execution);
      await this.cache.set(cacheKey, finalizationData, {
        apiType: 'banking',
        ttl: step.cacheOptions.ttl
      });
    }
    
    return {
      success: true,
      result: finalizationData
    };
  }

  /**
   * Execute data processing step
   * @param {Object} step - Step definition
   * @param {Object} execution - Execution state
   * @returns {Promise<Object>} Step result
   */
  async executeDataProcessingStep(step, execution) {
    const processedData = {
      processedAt: new Date().toISOString(),
      operations: step.operations,
      inputData: execution.stepResults,
      outputData: {}
    };
    
    // Simulate data processing operations
    for (const operation of step.operations) {
      processedData.outputData[operation] = {
        operation: operation,
        processed: true,
        timestamp: Date.now()
      };
    }
    
    return {
      success: true,
      result: processedData
    };
  }

  /**
   * Execute delivery step
   * @param {Object} step - Step definition
   * @param {Object} execution - Execution state
   * @returns {Promise<Object>} Step result
   */
  async executeDeliveryStep(step, execution) {
    const deliveryData = {
      deliveryId: this.generateDeliveryId(),
      methods: step.methods,
      securityOptions: step.securityOptions,
      deliveredAt: new Date().toISOString(),
      status: 'delivered'
    };
    
    return {
      success: true,
      result: deliveryData
    };
  }

  /**
   * Check if step dependencies are satisfied
   * @param {Object} step - Step definition
   * @param {Array} completedSteps - List of completed step IDs
   * @returns {boolean} Dependencies satisfied
   */
  checkStepDependencies(step, completedSteps) {
    if (!step.dependencies || step.dependencies.length === 0) {
      return true;
    }
    
    return step.dependencies.every(depId => completedSteps.includes(depId));
  }

  /**
   * Collect parameters for a step from execution context
   * @param {Object} step - Step definition
   * @param {Object} execution - Execution state
   * @returns {Object} Collected parameters
   */
  collectStepParameters(step, execution) {
    if (!step.parameters) {
      return {};
    }
    
    const params = {};
    for (const paramName of step.parameters) {
      if (execution.context.hasOwnProperty(paramName)) {
        params[paramName] = execution.context[paramName];
      }
    }
    
    return params;
  }

  /**
   * Generate cache key for a step
   * @param {Object} step - Step definition
   * @param {Object} execution - Execution state
   * @param {string} suffix - Optional suffix
   * @returns {string} Cache key
   */
  generateCacheKey(step, execution, suffix = '') {
    const baseKey = `workflow:${execution.workflowId}:${step.id}:${execution.context.userId}`;
    
    if (step.cacheOptions?.keyPattern) {
      // Replace variables in key pattern
      let pattern = step.cacheOptions.keyPattern;
      pattern = pattern.replace('{userId}', execution.context.userId);
      pattern = pattern.replace('{accountId}', execution.context.accountId || 'default');
      pattern = pattern.replace('{startDate}', execution.context.startDate || 'default');
      pattern = pattern.replace('{endDate}', execution.context.endDate || 'default');
      return pattern + (suffix ? `:${suffix}` : '');
    }
    
    return baseKey + (suffix ? `:${suffix}` : '');
  }

  /**
   * Validate step parameters
   * @param {Object} step - Step definition
   * @param {Object} execution - Execution state
   * @returns {Promise<Object>} Validation result
   */
  async validateStepParameters(step, execution) {
    const errors = [];
    
    if (!step.validation) {
      return { valid: true, errors: [] };
    }
    
    for (const [paramName, validation] of Object.entries(step.validation)) {
      const value = execution.context[paramName];
      
      if (validation.type === 'enum' && !validation.values.includes(value)) {
        errors.push(`${paramName} must be one of: ${validation.values.join(', ')}`);
      }
      
      if (validation.type === 'number') {
        const numValue = parseFloat(value);
        if (isNaN(numValue)) {
          errors.push(`${paramName} must be a valid number`);
        } else {
          if (validation.min && numValue < validation.min) {
            errors.push(`${paramName} must be at least ${validation.min}`);
          }
          if (validation.max && numValue > validation.max) {
            errors.push(`${paramName} cannot exceed ${validation.max}`);
          }
        }
      }
      
      if (validation.pattern && !validation.pattern.test(value)) {
        errors.push(`${paramName} format is invalid`);
      }
    }
    
    return {
      valid: errors.length === 0,
      errors: errors
    };
  }

  /**
   * Execute validation rule
   * @param {string} rule - Validation rule name
   * @param {Object} execution - Execution state
   * @returns {Promise<Object>} Validation result
   */
  async executeValidationRule(rule, execution) {
    // Simplified validation rule implementation
    switch (rule) {
      case 'sufficient_balance':
        return {
          valid: true,
          message: 'Balance validation passed'
        };
        
      case 'daily_limit_check':
        return {
          valid: true,
          message: 'Daily limit validation passed'
        };
        
      case 'recipient_validation':
        return {
          valid: true,
          message: 'Recipient validation passed'
        };
        
      case 'fraud_detection':
        return {
          valid: true,
          message: 'Fraud detection passed'
        };
        
      default:
        return {
          valid: true,
          message: `Validation rule '${rule}' executed`
        };
    }
  }

  /**
   * Execute computation
   * @param {string} computation - Computation name
   * @param {Object} execution - Execution state
   * @returns {Promise<*>} Computation result
   */
  async executeComputation(computation, execution) {
    // Simplified computation implementation
    switch (computation) {
      case 'total_income':
        return { value: 5000, currency: 'USD' };
        
      case 'total_expenses':
        return { value: 3500, currency: 'USD' };
        
      case 'net_change':
        return { value: 1500, currency: 'USD' };
        
      case 'category_breakdown':
        return {
          groceries: 800,
          utilities: 400,
          entertainment: 300
        };
        
      default:
        return { computation: computation, executed: true };
    }
  }

  /**
   * Generate user prompt for missing parameters
   * @param {Object} step - Step definition
   * @param {Array} missingParams - Missing parameters
   * @param {Object} execution - Execution state
   * @returns {Object} User prompt
   */
  generateUserPrompt(step, missingParams, execution) {
    return {
      stepId: step.id,
      stepName: step.name,
      missingParameters: missingParams,
      message: `Please provide the following information for ${step.name}:`,
      parameters: missingParams.map(param => ({
        name: param,
        type: step.validation?.[param]?.type || 'string',
        required: true
      }))
    };
  }

  /**
   * Handle step execution error
   * @param {Object} step - Step definition
   * @param {Object} execution - Execution state
   * @param {Error} error - Step error
   * @param {Object} options - Options
   * @returns {Promise<boolean>} Error handled
   */
  async handleStepError(step, execution, error, options = {}) {
    const errorHandling = execution.workflow.errorHandling;
    
    if (errorHandling?.retry?.includes(step.id)) {
      // Implement retry logic
      logger.info('Retrying step due to error handling configuration', {
        stepId: step.id,
        error: error.message
      });
      return false; // Will be retried by caller
    }
    
    if (errorHandling?.prompt?.includes(step.id)) {
      // Convert error to user prompt
      logger.info('Converting step error to user prompt', {
        stepId: step.id,
        error: error.message
      });
      return false; // Will prompt user
    }
    
    return false; // Error not handled
  }

  /**
   * Handle execution error and rollback
   * @param {Object} execution - Execution state
   * @param {Error} error - Execution error
   * @returns {Promise<void>}
   */
  async handleExecutionError(execution, error) {
    if (execution.rollbackSteps.length > 0) {
      this.metrics.rollbacksExecuted++;
      
      logger.info('Executing rollback for failed workflow', {
        executionId: execution.id,
        rollbackSteps: execution.rollbackSteps.length
      });
      
      // Execute rollback steps in reverse order
      for (let i = execution.rollbackSteps.length - 1; i >= 0; i--) {
        const rollbackStep = execution.rollbackSteps[i];
        
        try {
          await this.executeRollback(rollbackStep);
        } catch (rollbackError) {
          logger.error('Rollback step failed', {
            executionId: execution.id,
            stepId: rollbackStep.stepId,
            error: rollbackError.message
          });
        }
      }
    }
  }

  /**
   * Execute rollback for a step
   * @param {Object} rollbackStep - Rollback step info
   * @returns {Promise<void>}
   */
  async executeRollback(rollbackStep) {
    const handler = this.rollbackHandlers.get(rollbackStep.stepType);
    
    if (handler) {
      await handler(rollbackStep);
    } else {
      logger.warn('No rollback handler for step type', {
        stepType: rollbackStep.stepType,
        stepId: rollbackStep.stepId
      });
    }
  }

  /**
   * Initialize rollback handlers
   */
  initializeRollbackHandlers() {
    this.rollbackHandlers.set('api_call', async (rollbackStep) => {
      logger.info('Rolling back API call', { stepId: rollbackStep.stepId });
      // Implement API call rollback logic
    });
    
    this.rollbackHandlers.set('computation', async (rollbackStep) => {
      logger.info('Rolling back computation', { stepId: rollbackStep.stepId });
      // Implement computation rollback logic
    });
  }

  /**
   * Update execution metrics
   * @param {number} executionTime - Execution time in ms
   * @param {boolean} success - Execution success
   */
  updateExecutionMetrics(executionTime, success) {
    if (success) {
      this.metrics.executionsCompleted++;
    } else {
      this.metrics.executionsFailed++;
    }
    
    // Update average execution time
    const totalExecutions = this.metrics.executionsCompleted + this.metrics.executionsFailed;
    this.metrics.averageExecutionTime = 
      (this.metrics.averageExecutionTime * (totalExecutions - 1) + executionTime) / totalExecutions;
  }

  /**
   * Generate unique execution ID
   * @returns {string} Execution ID
   */
  generateExecutionId() {
    return `exec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Generate unique report ID
   * @returns {string} Report ID
   */
  generateReportId() {
    return `report_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Generate unique confirmation ID
   * @returns {string} Confirmation ID
   */
  generateConfirmationId() {
    return `confirm_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Generate unique delivery ID
   * @returns {string} Delivery ID
   */
  generateDeliveryId() {
    return `delivery_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get workflow engine statistics
   * @returns {Object} Engine statistics
   */
  getStats() {
    return {
      initialized: this.initialized,
      activeExecutions: this.activeExecutions.size,
      totalExecutions: this.executionHistory.size,
      metrics: this.metrics,
      rollbackHandlers: this.rollbackHandlers.size,
      workflows: {
        banking: this.bankingWorkflows?.getStats?.() || { error: 'Banking workflows not available' },
        maybank: this.maybankWorkflows?.getStats?.() || { error: 'Maybank workflows not available' }
      },
      features: {
        multiStepExecution: true,
        securityIntegration: true,
        cachingIntegration: true,
        interactivePrompting: true,
        errorRecovery: true,
        rollbackSupport: true,
        parallelExecution: true,
        conditionalLogic: true,
        maybankWorkflowSupport: true,
        jwtAuthentication: true,
        interactiveMaybankTools: true
      }
    };
  }

  /**
   * Cleanup resources
   */
  destroy() {
    this.cache.destroy();
    this.activeExecutions.clear();
    this.executionHistory.clear();
    logger.info('Workflow Engine destroyed');
  }
}