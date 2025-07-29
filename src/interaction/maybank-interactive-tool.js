import { logger } from '../utils/logger.js';
import { MaybankParameterCollector } from './maybank-parameter-collector.js';
import { MaybankWorkflows } from '../workflows/maybank-workflows.js';

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
  constructor(registry) {
    this.registry = registry;
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
    logger.info('Maybank Interactive Tool initialized');
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
      return this.formatExecutionResult(result, session, allParameters);

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
   * @returns {Object} Formatted result
   */
  formatExecutionResult(result, session, parameters) {
    let content = `🏦 **Maybank Operation Completed**\n\n`;
    
    if (session.type === 'workflow') {
      const workflow = this.maybankWorkflows.getWorkflow(session.workflowName);
      content += `✅ **Workflow:** ${workflow.displayName}\n`;
    } else {
      content += `✅ **Operation:** ${session.operationId}\n`;
    }

    content += `**Status:** Success\n`;
    content += `**Execution Time:** ${new Date().toISOString()}\n\n`;

    // Add parameters summary (hide sensitive data)
    content += `**Parameters Used:**\n`;
    Object.keys(parameters).forEach(param => {
      const value = parameters[param];
      const displayValue = this.getSafeDisplayValue(param, value);
      content += `• ${param}: ${displayValue}\n`;
    });

    content += `\n`;

    // Add result summary if available
    if (result && result.summary) {
      content += `**Result Summary:**\n${result.summary}\n\n`;
    }

    // Add workflow-specific result formatting
    if (session.type === 'workflow' && result && result.data) {
      content += this.formatWorkflowResults(session.workflowName, result.data);
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

  formatFinancialOverview(data) {
    let content = `**📊 Financial Overview:**\n`;
    if (data.overview) {
      content += `• Total Balance: RM ${data.overview.totalBalance}\n`;
      content += `• Accounts: ${data.overview.accountCount}\n`;
      content += `• MAE Available: ${data.overview.maeAvailable ? 'Yes' : 'No'}\n`;
    }
    return content;
  }

  formatMaeAnalysis(data) {
    let content = `**💳 MAE Wallet Analysis:**\n`;
    if (data.maeWallet) {
      content += `• Current Balance: ${data.maeWallet.currentBalance}\n`;
      content += `• Account: ${data.maeWallet.accountName}\n`;
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
    return content;
  }

  formatHealthCheck(data) {
    let content = `**🏥 Financial Health:**\n`;
    content += `• Health Score: ${data.healthScore}/100\n`;
    content += `• Rating: ${data.rating}\n`;
    return content;
  }

  /**
   * Execute workflow with parameters (placeholder)
   * @param {string} workflowName - Workflow name
   * @param {Object} parameters - Execution parameters
   * @returns {Promise<Object>} Workflow result
   */
  async executeWorkflow(workflowName, parameters) {
    // This would integrate with the actual workflow execution engine
    // For now, return a simulated successful result
    logger.info('Executing Maybank workflow', { workflowName: workflowName });
    
    return {
      success: true,
      workflowName: workflowName,
      summary: `Workflow ${workflowName} would be executed with provided parameters`,
      data: {
        simulated: true,
        parameters: Object.keys(parameters).length
      }
    };
  }

  /**
   * Execute operation with parameters (placeholder)
   * @param {string} operationId - Operation ID
   * @param {Object} parameters - Execution parameters
   * @returns {Promise<Object>} Operation result
   */
  async executeOperation(operationId, parameters) {
    // This would integrate with the actual API executor
    // For now, return a simulated successful result
    logger.info('Executing Maybank operation', { operationId: operationId });
    
    return {
      success: true,
      operationId: operationId,
      summary: `Operation ${operationId} would be executed with provided parameters`,
      data: {
        simulated: true,
        parameters: Object.keys(parameters).length
      }
    };
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
    return `maybank_interactive_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
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