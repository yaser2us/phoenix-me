import { logger } from '../utils/logger.js';
import { MaybankParameterCollector } from './maybank-parameter-collector.js';
import { MaybankWorkflows } from '../workflows/maybank-workflows.js';
import fs from 'fs/promises';
import path from 'path';

/**
 * Maybank Interactive Tool for Phase 4.2 Checkpoint 3
 * Provides comprehensive interactive experience for Maybank banking operations
 * 
 * Features:
 * - Interactive workflow execution with parameter collection
 * - Context-aware prompting and guidance
 * - Secure JWT token handling
 * - Real-time parameter validation
 * - Multi-step workflow management
 * - Enhanced user experience with progress tracking
 */
export class MaybankInteractiveTool {
  constructor(registry, executor = null) {
    this.registry = registry;
    this.executor = executor;
    this.parameterCollector = new MaybankParameterCollector();
    this.maybankWorkflows = new MaybankWorkflows();
    
    // Active interactive sessions
    this.activeSessions = new Map();
    
    // Session cleanup interval (30 minutes)
    this.cleanupInterval = setInterval(() => {
      this.cleanupExpiredSessions();
    }, 30 * 60 * 1000);

    // MCP tool definition for Maybank operations
    this.toolDefinition = {
      name: 'maybank_interactive',
      description: 'Interactive Maybank banking operations with guided parameter collection',
      inputSchema: {
        type: 'object',
        properties: {
          request: {
            type: 'string',
            description: 'Maybank banking request in natural language'
          },
          workflowName: {
            type: 'string',
            description: 'Specific Maybank workflow to execute',
            enum: [
              'maybank_financial_overview',
              'maybank_mae_focus', 
              'maybank_account_comparison',
              'maybank_quick_balance',
              'maybank_health_check'
            ]
          },
          operationId: {
            type: 'string',
            description: 'Direct Maybank API operation',
            enum: [
              'get_banking_getBalance',
              'get_banking_summary',
              'get_banking_all'
            ]
          },
          parameters: {
            type: 'object',
            description: 'Known parameters (especially jwtToken)',
            properties: {
              jwtToken: {
                type: 'string',
                description: 'Maybank JWT authentication token'
              },
              includeDetails: {
                type: 'boolean',
                description: 'Include detailed analysis'
              },
              analysisType: {
                type: 'string',
                enum: ['basic', 'detailed', 'comprehensive']
              },
              includeRecommendations: {
                type: 'boolean',
                description: 'Include financial recommendations'
              }
            }
          },
          sessionId: {
            type: 'string',
            description: 'Session ID for continuing interactive collection'
          },
          providedValue: {
            type: 'string',
            description: 'User response to parameter request'
          },
          skipParameter: {
            type: 'boolean',
            description: 'Skip current optional parameter'
          }
        },
        required: ['request']
      }
    };

    this.initialized = true;
    logger.info('Maybank Interactive Tool initialized', {
      hasExecutor: !!executor
    });
  }

  /**
   * Set the API executor after initialization
   * @param {Object} executor - API executor instance
   */
  setExecutor(executor) {
    this.executor = executor;
    logger.info('API executor set for Maybank Interactive Tool');
  }

  /**
   * Execute the Maybank interactive tool
   * @param {Object} input - Tool input parameters
   * @returns {Promise<Object>} Tool execution result
   */
  async execute(input) {
    try {
      const { 
        request, 
        workflowName, 
        operationId, 
        parameters = {}, 
        sessionId, 
        providedValue, 
        skipParameter = false 
      } = input;

      // Handle session continuation
      if (sessionId) {
        if (this.activeSessions.has(sessionId)) {
          return await this.continueInteractiveSession(sessionId, providedValue, skipParameter);
        } else {
          return this.formatError('Session not found or expired. Please start a new request.');
        }
      }

      // Start new interactive session
      return await this.startNewInteractiveSession({
        request,
        workflowName,
        operationId,
        parameters
      });

    } catch (error) {
      logger.error('Maybank interactive tool execution failed', { error: error.message });
      return this.formatError(`Interactive tool failed: ${error.message}`);
    }
  }

  /**
   * Start a new interactive session
   * @param {Object} params - Session parameters
   * @returns {Promise<Object>} Session start result
   */
  async startNewInteractiveSession({ request, workflowName, operationId, parameters }) {
    try {
      // Determine what to execute (workflow vs direct operation)
      const executionPlan = await this.determineExecutionPlan(request, workflowName, operationId);
      
      if (!executionPlan.success) {
        return this.formatError(executionPlan.message);
      }

      // Create session
      const sessionId = this.generateSessionId();
      const session = {
        sessionId: sessionId,
        type: executionPlan.type, // 'workflow' or 'operation'
        workflowName: executionPlan.workflowName,
        operationId: executionPlan.operationId,
        originalRequest: request,
        providedParameters: { ...parameters },
        collectedParameters: {},
        currentStep: 0,
        workflow: null,
        parameterAnalysis: null,
        interactiveWorkflow: null,
        createdAt: new Date().toISOString(),
        lastActivity: new Date().toISOString(),
        status: 'parameter_collection'
      };

      // Analyze parameter requirements
      const parameterAnalysis = await this.parameterCollector.identifyMissingParameters({
        workflowName: session.workflowName,
        operationId: session.operationId,
        providedParams: parameters,
        isWorkflow: session.type === 'workflow',
        interactiveMode: true
      });

      session.parameterAnalysis = parameterAnalysis;

      // Check if we can proceed immediately
      if (parameterAnalysis.canProceed && parameterAnalysis.missingRequired.length === 0) {
        // No missing required parameters, check for optional enhancements
        if (parameterAnalysis.interactiveParameters.length === 0) {
          // No interactive parameters, execute immediately
          const result = await this.executeSession(session);
          return result;
        }
      }

      // Generate interactive workflow for parameter collection
      const interactiveWorkflow = await this.parameterCollector.generateInteractiveWorkflow(
        parameterAnalysis,
        { 
          sessionId: sessionId, 
          workflowName: session.workflowName,
          operationId: session.operationId
        }
      );

      session.interactiveWorkflow = interactiveWorkflow;
      
      // Store session
      this.activeSessions.set(sessionId, session);

      // Generate first prompt
      const firstPrompt = await this.generateInitialPrompt(session);
      
      return {
        content: [{
          type: 'text',
          text: firstPrompt
        }]
      };

    } catch (error) {
      logger.error('Failed to start interactive session', { error: error.message });
      return this.formatError(`Failed to start interactive session: ${error.message}`);
    }
  }

  /**
   * Continue an existing interactive session
   * @param {string} sessionId - Session ID
   * @param {string} providedValue - User-provided value
   * @param {boolean} skipParameter - Whether to skip current parameter
   * @returns {Promise<Object>} Session continuation result
   */
  async continueInteractiveSession(sessionId, providedValue, skipParameter) {
    try {
      const session = this.activeSessions.get(sessionId);
      session.lastActivity = new Date().toISOString();

      // Get current step
      const currentStep = session.interactiveWorkflow.steps[session.currentStep];
      
      if (!currentStep) {
        return this.formatError('No current step found. Session may be corrupted.');
      }

      // Handle skip request for optional parameters
      if (skipParameter && currentStep.canSkip) {
        session.collectedParameters[currentStep.parameter] = currentStep.config.defaultValue;
        session.currentStep++;
        
        logger.info('Parameter skipped', {
          sessionId: sessionId,
          parameter: currentStep.parameter,
          defaultValue: currentStep.config.defaultValue
        });

        return await this.proceedToNextStep(session);
      }

      // Validate provided value
      const validation = await this.parameterCollector.validateParameter(
        currentStep.parameter,
        providedValue,
        { 
          workflowName: session.workflowName,
          operationId: session.operationId,
          sessionId: sessionId
        }
      );

      if (!validation.isValid) {
        // Return error prompt
        return {
          content: [{
            type: 'text',
            text: this.formatValidationError(validation, currentStep, session)
          }]
        };
      }

      // Store validated parameter
      session.collectedParameters[currentStep.parameter] = validation.value;
      session.currentStep++;

      logger.info('Parameter collected successfully', {
        sessionId: sessionId,
        parameter: currentStep.parameter,
        step: session.currentStep,
        sensitive: currentStep.config.sensitive
      });

      return await this.proceedToNextStep(session);

    } catch (error) {
      logger.error('Failed to continue interactive session', { 
        sessionId: sessionId, 
        error: error.message 
      });
      return this.formatError(`Session continuation failed: ${error.message}`);
    }
  }

  /**
   * Proceed to next step in interactive workflow
   * @param {Object} session - Session object
   * @returns {Promise<Object>} Next step result
   */
  async proceedToNextStep(session) {
    // Check if we have more steps
    if (session.currentStep >= session.interactiveWorkflow.steps.length) {
      // All parameters collected, execute
      const result = await this.executeSession(session);
      
      // Clean up session
      this.activeSessions.delete(session.sessionId);
      
      return result;
    }

    // Generate prompt for next step
    const nextStep = session.interactiveWorkflow.steps[session.currentStep];
    const prompt = this.formatStepPrompt(nextStep, session);

    return {
      content: [{
        type: 'text',
        text: prompt
      }]
    };
  }

  /**
   * Execute the session with collected parameters
   * @param {Object} session - Session object
   * @returns {Promise<Object>} Execution result
   */
  async executeSession(session) {
    try {
      // Combine all parameters
      const allParameters = {
        ...session.providedParameters,
        ...session.collectedParameters
      };

      let result;

      if (session.type === 'workflow') {
        // Execute workflow
        result = await this.executeWorkflow(session.workflowName, allParameters);
      } else {
        // Execute direct operation
        result = await this.executeOperation(session.operationId, allParameters);
      }

      // Format successful result
      return await this.formatExecutionResult(result, session, allParameters);

    } catch (error) {
      logger.error('Session execution failed', { 
        sessionId: session.sessionId,
        error: error.message 
      });
      return this.formatError(`Execution failed: ${error.message}`);
    }
  }

  /**
   * Determine execution plan from request
   * @param {string} request - User request
   * @param {string} workflowName - Specified workflow
   * @param {string} operationId - Specified operation
   * @returns {Promise<Object>} Execution plan
   */
  async determineExecutionPlan(request, workflowName, operationId) {
    // Direct workflow specified
    if (workflowName) {
      try {
        this.maybankWorkflows.getWorkflow(workflowName);
        return {
          success: true,
          type: 'workflow',
          workflowName: workflowName,
          operationId: null
        };
      } catch (error) {
        return {
          success: false,
          message: `Invalid workflow: ${workflowName}`
        };
      }
    }

    // Direct operation specified
    if (operationId) {
      return {
        success: true,
        type: 'operation',
        workflowName: null,
        operationId: operationId
      };
    }

    // Analyze request to suggest workflow
    const suggestions = this.maybankWorkflows.suggestWorkflows(request);
    
    if (suggestions.length > 0) {
      return {
        success: true,
        type: 'workflow',
        workflowName: suggestions[0].workflow,
        operationId: null,
        suggested: true,
        allSuggestions: suggestions
      };
    }

    return {
      success: false,
      message: 'Could not determine appropriate Maybank operation or workflow from request.'
    };
  }

  /**
   * Generate initial prompt for session
   * @param {Object} session - Session object
   * @returns {Promise<string>} Initial prompt
   */
  async generateInitialPrompt(session) {
    let prompt = `🏦 **Maybank Interactive Banking**\n\n`;

    // Add execution plan information
    if (session.type === 'workflow') {
      const workflow = this.maybankWorkflows.getWorkflow(session.workflowName);
      prompt += `**Selected Workflow:** ${workflow.displayName}\n`;
      prompt += `**Description:** ${workflow.description}\n`;
      prompt += `**Estimated Time:** ${Math.ceil(workflow.estimatedTime / 1000)} seconds\n`;
      prompt += `**Complexity:** ${workflow.complexity}\n\n`;
    } else {
      prompt += `**Direct Operation:** ${session.operationId}\n\n`;
    }

    // Add parameter collection information
    const analysis = session.parameterAnalysis;
    
    if (analysis.missingRequired.length > 0) {
      prompt += `**Required Parameters:** ${analysis.missingRequired.length}\n`;
    }
    
    if (analysis.interactiveParameters.length > 0) {
      prompt += `**Optional Enhancements:** ${analysis.interactiveParameters.length} available\n`;
    }

    prompt += `\n`;

    // Add security notice if JWT required
    if (!analysis.hasJWT) {
      prompt += `🔐 **Security Notice:** This operation requires your Maybank JWT authentication token.\n`;
      prompt += `Your token will be handled securely and not logged or stored.\n\n`;
    }

    // Add first step prompt
    const firstStep = session.interactiveWorkflow.steps[0];
    prompt += this.formatStepPrompt(firstStep, session, true);

    return prompt;
  }

  /**
   * Format step prompt for display
   * @param {Object} step - Workflow step
   * @param {Object} session - Session object
   * @param {boolean} isFirst - Whether this is the first step
   * @returns {string} Formatted step prompt
   */
  formatStepPrompt(step, session, isFirst = false) {
    let prompt = '';

    if (!isFirst) {
      prompt += `🏦 **Maybank Interactive Banking** - Parameter Collection\n\n`;
    }

    // Add progress indicator
    const progress = `Step ${step.stepNumber} of ${session.interactiveWorkflow.totalSteps}`;
    prompt += `📋 **${progress}**\n\n`;

    // Add parameter information
    prompt += `**Parameter:** ${step.parameter}\n`;
    
    if (step.type === 'optional') {
      prompt += `**Type:** Optional Enhancement\n`;
      if (step.recommended) {
        prompt += `💡 **Recommended** - This will improve your results\n`;
      }
      if (step.enhancesResults) {
        prompt += `📈 **Enhanced Results** - Provides more detailed analysis\n`;
      }
    } else {
      prompt += `**Type:** Required\n`;
    }

    prompt += `\n`;

    // Add main prompt
    prompt += step.prompt;

    // Add skip option for optional parameters
    if (step.canSkip) {
      prompt += `\n\n*You can skip this parameter by responding with "skip" or providing a value.*`;
      if (step.config.defaultValue !== undefined) {
        prompt += `\n*Default value: ${step.config.defaultValue}*`;
      }
    }

    // Add session information
    prompt += `\n\n---\n*Session ID: ${session.sessionId}*`;
    
    return prompt;
  }

  /**
   * Format validation error
   * @param {Object} validation - Validation result
   * @param {Object} step - Current step
   * @param {Object} session - Session object
   * @returns {string} Formatted error message
   */
  formatValidationError(validation, step, session) {
    let prompt = `🏦 **Maybank Interactive Banking** - Validation Error\n\n`;
    
    prompt += `❌ **Error:** ${validation.message}\n\n`;
    
    if (validation.prompt) {
      prompt += `**Please try again:**\n${validation.prompt}\n\n`;
    }

    // Add help for JWT tokens
    if (step.parameter === 'jwtToken') {
      prompt += `💡 **JWT Token Help:**\n`;
      prompt += `• Must be a valid Maybank JWT token\n`;
      prompt += `• Should have 3 parts separated by dots (xxxxx.yyyyy.zzzzz)\n`;
      prompt += `• Obtain from your Maybank developer portal or authentication flow\n\n`;
    }

    prompt += `---\n*Session ID: ${session.sessionId}*`;
    
    return prompt;
  }

  /**
   * Format execution result
   * @param {Object} result - Execution result
   * @param {Object} session - Session object
   * @param {Object} parameters - All collected parameters
   * @returns {Promise<Object>} Formatted result
   */
  async formatExecutionResult(result, session, parameters) {
    let content = `🏦 **Maybank Operation Completed**\n\n`;
    
    if (session.type === 'workflow') {
      const workflow = this.maybankWorkflows.getWorkflow(session.workflowName);
      content += `✅ **Workflow:** ${workflow.displayName}\n`;
    } else {
      content += `✅ **Operation:** ${session.operationId}\n`;
    }

    content += `**Status:** ${result.success ? 'Success' : 'Failed'}\n`;
    content += `**Execution Time:** ${new Date().toISOString()}\n`;
    
    // Add API type if available
    if (result.apiType) {
      content += `**API Type:** ${result.apiType}\n`;
    }

    content += `\n`;

    // Add parameters summary (hide sensitive data)
    content += `**Parameters Used:**\n`;
    Object.keys(parameters).forEach(param => {
      const value = parameters[param];
      const displayValue = this.getSafeDisplayValue(param, value);
      content += `• ${param}: ${displayValue}\n`;
    });

    content += `\n`;

    // Add result data if available  
    if (result && result.data) {
      if (session.type === 'operation') {
        content += this.formatOperationResults(session.operationId, result.data);
      } else if (session.type === 'workflow') {
        content += this.formatWorkflowResults(session.workflowName, result.data);
      }
      content += `\n`;
    }

    // Add result summary if available
    if (result && result.summary) {
      content += `**Result Summary:**\n${result.summary}\n\n`;
    }

    // Add warnings if there were API failures
    if (result && result.warnings && result.warnings.length > 0) {
      content += `⚠️  **API Warnings:**\n`;
      result.warnings.forEach(warning => {
        content += `• ${warning}\n`;
      });
      content += `\n`;
    }

    // Add detailed error information for debugging
    if (result && result.detailedErrors && result.detailedErrors.length > 0) {
      content += `🔍 **Detailed API Error Information:**\n`;
      
      // Log errors to file for debugging
      await this.logErrorsToFile(result.detailedErrors, session.sessionId);
      
      result.detailedErrors.forEach((errorDetail, index) => {
        content += `\n**${index + 1}. ${errorDetail.api}**\n`;
        content += `• Endpoint: ${errorDetail.endpoint}\n`;
        content += `• HTTP Status: ${errorDetail.httpStatus} ${errorDetail.httpStatusText || ''}\n`;
        content += `• Error: ${errorDetail.error}\n`;
        content += `• Duration: ${errorDetail.duration}ms\n`;
        content += `• Timestamp: ${errorDetail.timestamp}\n`;
        
        if (errorDetail.responseBody) {
          // Limit response body to first 500 characters for readability
          const responsePreview = typeof errorDetail.responseBody === 'string' 
            ? errorDetail.responseBody.substring(0, 500)
            : JSON.stringify(errorDetail.responseBody).substring(0, 500);
          content += `• Response Body: ${responsePreview}${responsePreview.length >= 500 ? '...' : ''}\n`;
        }
        
        if (errorDetail.responseHeaders) {
          content += `• Response Headers: ${JSON.stringify(errorDetail.responseHeaders, null, 2)}\n`;
        }
      });
      
      content += `\n📁 **Error Log:** Complete API error details saved to maybank-api-errors.log\n\n`;
    }

    // Add API status information if available for workflows
    if (session.type === 'workflow' && result && result.data && result.data.apiStatus) {
      content += `**API Call Status:**\n`;
      content += `• MAE Balance: ${result.data.apiStatus.maeBalance === 'success' ? '✅' : '❌'} ${result.data.apiStatus.maeBalance}\n`;
      content += `• Account Summary: ${result.data.apiStatus.accountSummary === 'success' ? '✅' : '❌'} ${result.data.apiStatus.accountSummary}\n`;
      content += `• All Accounts: ${result.data.apiStatus.allAccounts === 'success' ? '✅' : '❌'} ${result.data.apiStatus.allAccounts}\n`;
      
      if (result.data.apiStatus.failedSteps.length > 0) {
        content += `\n⚠️  **Failed API Calls:** ${result.data.apiStatus.failedSteps.join(', ')}\n`;
      }
      content += `\n`;
    }

    content += `\n*Interactive session completed successfully.*`;

    return {
      content: [{
        type: 'text',
        text: content
      }]
    };
  }

  /**
   * Format workflow-specific results
   * @param {string} workflowName - Workflow name
   * @param {Object} data - Result data
   * @returns {string} Formatted workflow results
   */
  formatWorkflowResults(workflowName, data) {
    switch (workflowName) {
      case 'maybank_financial_overview':
        return this.formatFinancialOverview(data);
      case 'maybank_mae_focus':
        return this.formatMaeAnalysis(data);
      case 'maybank_account_comparison':
        return this.formatAccountComparison(data);
      case 'maybank_quick_balance':
        return this.formatQuickBalance(data);
      case 'maybank_health_check':
        return this.formatHealthCheck(data);
      default:
        return `**Results:**\n${JSON.stringify(data, null, 2)}`;
    }
  }

  /**
   * Format operation-specific results
   * @param {string} operationId - Operation ID
   * @param {Object} data - Result data
   * @returns {string} Formatted operation results
   */
  formatOperationResults(operationId, data) {
    let content = '';
    
    switch (operationId) {
      case 'get_banking_getBalance':
        if (data.account) {
          content += `**MAE Wallet Balance:**\n`;
          content += `• Account: ${data.account.name || 'MAE Wallet'}\n`;
          content += `• Balance: RM ${data.account.balance || '0.00'}\n`;
          if (data.account.value !== undefined) {
            content += `• Value: ${data.account.value}\n`;
          }
        } else {
          // Fallback: show raw data if expected structure not found
          content += `**MAE Wallet Balance (Raw Data):**\n`;
          content += `\`\`\`json\n${JSON.stringify(data, null, 2)}\n\`\`\`\n`;
        }
        break;
        
      case 'get_banking_summary':
        if (data.summary) {
          content += `**Account Summary:**\n`;
          content += `• Total Balance: RM ${data.summary.totalBalance || '0.00'}\n`;
          content += `• Number of Accounts: ${data.summary.accountCount || 0}\n`;
          content += `• MAE Available: ${data.summary.maeAvailable ? 'Yes' : 'No'}\n`;
        }
        if (data.accounts && data.accounts.length > 0) {
          content += `\n**Accounts:**\n`;
          data.accounts.forEach(acc => {
            content += `• ${acc.name}: RM ${acc.balance}\n`;
          });
        }
        break;
        
      case 'get_banking_all':
        if (data.accounts && data.accounts.length > 0) {
          content += `**All Accounts:**\n`;
          data.accounts.forEach(acc => {
            content += `• ${acc.name} (${acc.type || acc.accountType}): RM ${acc.balance}\n`;
            if (acc.number) {
              content += `  Account Number: ${acc.number}\n`;
            }
            content += `  Status: ${acc.active ? 'Active' : 'Inactive'}\n`;
          });
        }
        if (data.summary) {
          content += `\n**Summary:**\n`;
          content += `• Total Accounts: ${data.summary.totalAccounts || 0}\n`;
          content += `• Active Accounts: ${data.summary.activeAccounts || 0}\n`;
        }
        break;
        
      default:
        content += `**Results:**\n${JSON.stringify(data, null, 2)}`;
    }
    
    // If no content was generated, show the raw data
    if (!content.trim()) {
      content = `**Operation Results:**\n\`\`\`json\n${JSON.stringify(data, null, 2)}\n\`\`\`\n`;
    }
    
    // Always add raw response data for debugging
    content += `\n**Raw Response Data (Debug):**\n`;
    content += `\`\`\`json\n${JSON.stringify(data, null, 2)}\n\`\`\`\n`;
    
    return content;
  }

  formatFinancialOverview(data) {
    let content = `**📊 Financial Overview:**\n`;
    if (data.overview) {
      content += `• Total Balance: RM ${data.overview.totalBalance || '0.00'}\n`;
      content += `• Accounts: ${data.overview.accountCount || 0}\n`;
      content += `• MAE Available: ${data.overview.maeAvailable ? 'Yes' : 'No'}\n`;
    }
    if (data.maeWallet) {
      content += `\n**MAE Wallet:**\n`;
      content += `• Balance: RM ${data.maeWallet.balance || '0.00'}\n`;
    }
    if (data.insights && data.insights.length > 0) {
      content += `\n**Insights:**\n`;
      data.insights.forEach(insight => {
        content += `• ${insight}\n`;
      });
    }
    
    // Add raw responses for debugging
    if (data.rawResponses) {
      content += `\n**Raw API Responses (Debug):**\n`;
      content += `\`\`\`json\n${JSON.stringify(data.rawResponses, null, 2)}\n\`\`\`\n`;
    }
    
    return content;
  }

  formatMaeAnalysis(data) {
    let content = `**💳 MAE Wallet Analysis:**\n`;
    if (data.maeWallet) {
      content += `• Current Balance: RM ${data.maeWallet.currentBalance || '0.00'}\n`;
      content += `• Account: ${data.maeWallet.accountName || 'MAE Wallet'}\n`;
      if (data.maeWallet.balanceValue !== undefined) {
        content += `• Balance Value: ${data.maeWallet.balanceValue}\n`;
      }
    }
    if (data.context) {
      content += `\n**Context:**\n`;
      content += `• Total Across All Accounts: RM ${data.context.totalAcrossAllAccounts || '0.00'}\n`;
      content += `• MAE Percentage: ${data.context.maePercentage || 0}%\n`;
    }
    if (data.insights && data.insights.length > 0) {
      content += `\n**Insights:**\n`;
      data.insights.forEach(insight => {
        content += `• ${insight}\n`;
      });
    }
    return content;
  }

  formatAccountComparison(data) {
    let content = `**🔄 Account Comparison:**\n`;
    content += `• Total Accounts: ${data.accountCount}\n`;
    content += `• Total Balance: RM ${data.totalBalance}\n`;
    return content;
  }

  formatQuickBalance(data) {
    let content = `**⚡ Quick Balance:**\n`;
    if (data.balance) {
      content += `• ${data.displayText}\n`;
    }
    
    // Add raw response for debugging
    if (data.rawResponse) {
      content += `\n**Raw API Response (Debug):**\n`;
      content += `\`\`\`json\n${JSON.stringify(data.rawResponse, null, 2)}\n\`\`\`\n`;
    }
    
    return content;
  }

  formatHealthCheck(data) {
    let content = `**🏥 Financial Health:**\n`;
    content += `• Health Score: ${data.healthScore}/100\n`;
    content += `• Rating: ${data.rating}\n`;
    return content;
  }

  /**
   * Execute workflow with parameters
   * @param {string} workflowName - Workflow name
   * @param {Object} parameters - Execution parameters
   * @returns {Promise<Object>} Workflow result
   */
  async executeWorkflow(workflowName, parameters) {
    try {
      logger.info('Executing Maybank workflow', { workflowName: workflowName });
      
      // Get workflow definition
      const workflow = this.maybankWorkflows.getWorkflow(workflowName);
      
      // Execute workflow steps
      const stepResults = {};
      
      for (const step of workflow.steps) {
        logger.debug('Executing workflow step', {
          workflowName: workflowName,
          stepId: step.id,
          operation: step.operation
        });
        
        // Merge step parameters with user parameters
        const stepParams = {
          ...step.parameters,
          ...parameters
        };
        
        // Execute the operation through the API executor
        if (this.executor) {
          const result = await this.executor.executeOperation(
            step.operation, 
            stepParams,
            { jwtToken: parameters.jwtToken }
          );
          
          // Store result with output mapping
          stepResults[step.outputMapping] = result;
          
          // Check for errors
          if (!result.success) {
            throw new Error(`Step ${step.id} failed: ${result.error}`);
          }
        } else {
          // Fallback if executor not available
          logger.warn('API executor not available, using simulated results');
          stepResults[step.outputMapping] = {
            success: true,
            data: { simulated: true }
          };
        }
      }
      
      // Process workflow results
      const processedResults = await this.maybankWorkflows.processWorkflowResults(
        workflowName,
        stepResults,
        parameters
      );
      
      return processedResults;
      
    } catch (error) {
      logger.error('Workflow execution failed', { 
        workflowName: workflowName,
        error: error.message 
      });
      throw error;
    }
  }

  /**
   * Execute operation with parameters
   * @param {string} operationId - Operation ID
   * @param {Object} parameters - Execution parameters
   * @returns {Promise<Object>} Operation result
   */
  async executeOperation(operationId, parameters) {
    try {
      logger.info('Executing Maybank operation', { operationId: operationId });
      
      // Execute the operation through the API executor
      if (this.executor) {
        const result = await this.executor.executeOperation(
          operationId,
          parameters,
          { jwtToken: parameters.jwtToken }
        );
        
        return result;
      } else {
        // Fallback if executor not available
        logger.warn('API executor not available, using simulated results');
        return {
          success: true,
          operationId: operationId,
          summary: `Operation ${operationId} executed (simulated mode)`,
          data: {
            simulated: true,
            parameters: Object.keys(parameters).length
          }
        };
      }
      
    } catch (error) {
      logger.error('Operation execution failed', { 
        operationId: operationId,
        error: error.message 
      });
      throw error;
    }
  }

  /**
   * Get safe display value for parameters
   * @param {string} param - Parameter name
   * @param {*} value - Parameter value
   * @returns {string} Safe display value
   */
  getSafeDisplayValue(param, value) {
    if (param === 'jwtToken') {
      return '[JWT TOKEN PROVIDED]';
    }
    
    if (typeof value === 'boolean') {
      return value ? 'Yes' : 'No';
    }
    
    return String(value);
  }

  /**
   * Format error response
   * @param {string} message - Error message
   * @returns {Object} Formatted error response
   */
  formatError(message) {
    return {
      isError: true,
      content: [{
        type: 'text',
        text: `❌ **Maybank Interactive Error**\n\n${message}`
      }]
    };
  }

  /**
   * Generate unique session ID
   * @returns {string} Session ID
   */
  generateSessionId() {
    return `maybank_interactive_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
  }

  /**
   * Clean up expired sessions
   * @param {number} maxAgeMs - Maximum age in milliseconds
   * @returns {number} Number of sessions cleaned
   */
  cleanupExpiredSessions(maxAgeMs = 30 * 60 * 1000) {
    const now = new Date();
    let cleanedCount = 0;

    for (const [sessionId, session] of this.activeSessions) {
      const lastActivity = new Date(session.lastActivity);
      const age = now - lastActivity;

      if (age > maxAgeMs) {
        this.activeSessions.delete(sessionId);
        cleanedCount++;
      }
    }

    if (cleanedCount > 0) {
      logger.info('Cleaned up expired Maybank interactive sessions', { 
        cleanedCount: cleanedCount 
      });
    }

    return cleanedCount;
  }

  /**
   * Get tool statistics
   * @returns {Object} Tool statistics
   */
  getStats() {
    return {
      initialized: this.initialized,
      activeSessions: this.activeSessions.size,
      toolDefinition: this.toolDefinition,
      components: {
        parameterCollector: this.parameterCollector.getStats(),
        workflows: this.maybankWorkflows.getStats()
      },
      features: {
        interactiveWorkflows: true,
        parameterCollection: true,
        sessionManagement: true,
        contextualPrompting: true,
        secureTokenHandling: true,
        progressTracking: true,
        optionalEnhancements: true
      }
    };
  }

  /**
   * Log detailed API errors to file for debugging
   * @param {Array} detailedErrors - Array of detailed error objects
   * @param {string} sessionId - Session ID for context
   */
  async logErrorsToFile(detailedErrors, sessionId) {
    try {
      const logFileName = 'maybank-api-errors.log';
      const timestamp = new Date().toISOString();
      
      let logContent = `\n${'='.repeat(80)}\n`;
      logContent += `MAYBANK API ERROR LOG\n`;
      logContent += `Timestamp: ${timestamp}\n`;
      logContent += `Session ID: ${sessionId}\n`;
      logContent += `Error Count: ${detailedErrors.length}\n`;
      logContent += `${'='.repeat(80)}\n\n`;
      
      detailedErrors.forEach((errorDetail, index) => {
        logContent += `ERROR ${index + 1}: ${errorDetail.api}\n`;
        logContent += `${'-'.repeat(40)}\n`;
        logContent += `API: ${errorDetail.api}\n`;
        logContent += `Endpoint: ${errorDetail.endpoint}\n`;
        logContent += `HTTP Status: ${errorDetail.httpStatus} ${errorDetail.httpStatusText || ''}\n`;
        logContent += `Error Message: ${errorDetail.error}\n`;
        logContent += `Duration: ${errorDetail.duration}ms\n`;
        logContent += `Timestamp: ${errorDetail.timestamp}\n`;
        
        if (errorDetail.responseBody) {
          logContent += `\nResponse Body:\n`;
          logContent += typeof errorDetail.responseBody === 'string' 
            ? errorDetail.responseBody 
            : JSON.stringify(errorDetail.responseBody, null, 2);
          logContent += `\n`;
        }
        
        if (errorDetail.responseHeaders) {
          logContent += `\nResponse Headers:\n`;
          logContent += JSON.stringify(errorDetail.responseHeaders, null, 2);
          logContent += `\n`;
        }
        
        logContent += `\n`;
      });
      
      // Append to log file
      await fs.appendFile(logFileName, logContent, 'utf8');
      
      logger.info('API errors logged to file', {
        fileName: logFileName,
        errorCount: detailedErrors.length,
        sessionId
      });
      
    } catch (error) {
      logger.error('Failed to log errors to file', {
        error: error.message,
        sessionId
      });
      // Don't throw - logging failure shouldn't break the main flow
    }
  }

  /**
   * Cleanup on destruction
   */
  destroy() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    this.activeSessions.clear();
    logger.info('Maybank Interactive Tool destroyed');
  }
}