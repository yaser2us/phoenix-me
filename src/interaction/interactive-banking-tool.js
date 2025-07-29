import { logger } from '../utils/logger.js';
import { ParameterCollector } from './parameter-collector.js';
import { UserPrompter } from './user-prompter.js';
import { ValidationEngine } from './validation-engine.js';
import { BankingAPIAdapter } from '../adapters/banking-api-adapter.js';

/**
 * Interactive Banking Tool for Phase 4.1 Checkpoint 2
 * Provides interactive parameter collection and execution for banking operations
 * 
 * Features:
 * - Interactive parameter collection workflows
 * - Context-aware user prompting
 * - Real-time parameter validation
 * - Sensitive data handling
 * - Multi-step operation support
 */
export class InteractiveBankingTool {
  constructor(registry) {
    this.registry = registry;
    this.parameterCollector = new ParameterCollector(registry);
    this.userPrompter = new UserPrompter();
    this.validationEngine = new ValidationEngine();
    this.bankingAdapter = new BankingAPIAdapter(registry);

    // Active sessions for multi-step interactions
    this.activeSessions = new Map();

    // Tool definition for MCP
    this.toolDefinition = {
      name: 'interactive_banking',
      description: 'Execute banking operations with interactive parameter collection',
      inputSchema: {
        type: 'object',
        properties: {
          request: {
            type: 'string',
            description: 'Banking operation request in natural language'
          },
          operation: {
            type: 'string',
            description: 'Specific banking operation (optional if using natural language)',
            enum: [
              'getAccounts',
              'getAccount', 
              'getAccountBalance',
              'getAccountTransactions',
              'getTransaction',
              'createTransfer',
              'getUserProfile'
            ]
          },
          parameters: {
            type: 'object',
            description: 'Known parameters for the operation',
            properties: {
              jwtToken: {
                type: 'string',
                description: 'Banking JWT authentication token'
              },
              accountId: {
                type: 'string',
                description: 'Account identifier'
              },
              transactionId: {
                type: 'string',
                description: 'Transaction identifier'
              },
              amount: {
                type: 'number',
                description: 'Transfer amount'
              },
              fromAccountId: {
                type: 'string',
                description: 'Source account for transfer'
              },
              toAccountId: {
                type: 'string',
                description: 'Destination account for transfer'
              }
            }
          },
          sessionId: {
            type: 'string',
            description: 'Session ID for multi-step interactions'
          },
          providedValue: {
            type: 'string',
            description: 'User-provided value for requested parameter'
          },
          userId: {
            type: 'string',
            description: 'User identifier for token management'
          }
        },
        required: ['request']
      }
    };

    this.initialized = true;
    logger.info('Interactive Banking Tool initialized for MCP integration');
  }

  /**
   * Execute interactive banking tool
   * @param {Object} input - Tool input parameters
   * @returns {Promise<Object>} Tool execution result
   */
  async execute(input) {
    try {
      const { 
        request, 
        operation, 
        parameters = {}, 
        sessionId, 
        providedValue, 
        userId 
      } = input;

      // Check if this is a continuation of an existing session
      if (sessionId && this.activeSessions.has(sessionId)) {
        return await this.continueSession(sessionId, providedValue, userId);
      }

      // Start new interactive session
      return await this.startNewSession(request, operation, parameters, userId);

    } catch (error) {
      logger.error('Interactive banking tool execution failed', { error: error.message });
      return {
        isError: true,
        content: [{
          type: 'text',
          text: `❌ Banking operation failed: ${error.message}`
        }]
      };
    }
  }

  /**
   * Start a new interactive banking session
   * @param {string} request - User request
   * @param {string} operation - Specific operation
   * @param {Object} parameters - Known parameters
   * @param {string} userId - User ID
   * @returns {Promise<Object>} Session start result
   */
  async startNewSession(request, operation, parameters, userId) {
    // Determine operation from request if not provided
    const determinedOperation = operation || await this.determineOperation(request);
    
    if (!determinedOperation) {
      return {
        isError: true,
        content: [{
          type: 'text',
          text: '❌ Could not determine the banking operation from your request. Please specify what you would like to do.'
        }]
      };
    }

    // Create session
    const sessionId = this.generateSessionId();
    const session = {
      sessionId: sessionId,
      operation: determinedOperation,
      originalRequest: request,
      userId: userId,
      providedParameters: { ...parameters },
      collectedParameters: {},
      currentStep: 0,
      workflow: null,
      createdAt: new Date().toISOString(),
      lastActivity: new Date().toISOString()
    };

    // Identify missing parameters
    const missingParameters = await this.parameterCollector.identifyMissingParameters({
      operation: determinedOperation,
      providedParams: parameters
    });

    if (missingParameters.length === 0) {
      // All parameters provided, execute immediately
      return await this.executeOperation(session);
    }

    // Generate parameter collection workflow
    const workflow = await this.parameterCollector.generateCollectionWorkflow(
      missingParameters, 
      determinedOperation
    );

    session.workflow = workflow;
    session.missingParameters = missingParameters;
    
    // Store session
    this.activeSessions.set(sessionId, session);

    // Generate initial prompt for first missing parameter
    const nextParam = this.parameterCollector.getNextParameter(workflow, session.collectedParameters);
    
    if (!nextParam) {
      return {
        isError: true,
        content: [{
          type: 'text',
          text: '❌ No parameters can be collected at this time due to unresolved dependencies.'
        }]
      };
    }

    const prompt = await this.userPrompter.generateParameterPrompt(
      nextParam.step,
      'banking',
      {
        progress: nextParam.progress,
        sessionId: sessionId
      }
    );

    return {
      content: [{
        type: 'text',
        text: this.formatInteractivePrompt(prompt, session, nextParam)
      }]
    };
  }

  /**
   * Continue an existing interactive session
   * @param {string} sessionId - Session ID
   * @param {string} providedValue - User-provided value
   * @param {string} userId - User ID
   * @returns {Promise<Object>} Session continuation result
   */
  async continueSession(sessionId, providedValue, userId) {
    const session = this.activeSessions.get(sessionId);
    
    if (!session) {
      return {
        isError: true,
        content: [{
          type: 'text',
          text: '❌ Session not found or expired. Please start a new request.'
        }]
      };
    }

    // Update session activity
    session.lastActivity = new Date().toISOString();

    // Get current parameter being collected
    const nextParam = this.parameterCollector.getNextParameter(
      session.workflow, 
      session.collectedParameters
    );

    if (!nextParam) {
      return {
        isError: true,
        content: [{
          type: 'text',
          text: '❌ No parameter expected at this time. Session may be complete or have errors.'
        }]
      };
    }

    const currentParameter = nextParam.step.parameter;

    // Validate provided value
    const validation = await this.validationEngine.validateParameter(
      currentParameter,
      providedValue,
      'banking',
      { 
        operation: session.operation,
        userId: userId 
      }
    );

    if (!validation.isValid) {
      // Generate error prompt
      const errorPrompt = this.userPrompter.generateErrorPrompt(
        currentParameter,
        validation,
        { operation: session.operation }
      );

      return {
        content: [{
          type: 'text',
          text: this.formatErrorPrompt(errorPrompt, session)
        }]
      };
    }

    // Store validated parameter
    session.collectedParameters[currentParameter] = validation.sanitizedValue || providedValue;
    session.currentStep++;

    logger.info('Parameter collected successfully', {
      sessionId: sessionId,
      parameter: currentParameter,
      step: session.currentStep,
      operation: session.operation
    });

    // Check if all parameters are collected
    const remainingParam = this.parameterCollector.getNextParameter(
      session.workflow,
      session.collectedParameters
    );

    if (!remainingParam) {
      // All parameters collected, execute operation
      const result = await this.executeOperation(session);
      
      // Clean up session
      this.activeSessions.delete(sessionId);
      
      return result;
    }

    // Generate prompt for next parameter
    const nextPrompt = await this.userPrompter.generateParameterPrompt(
      remainingParam.step,
      'banking',
      {
        progress: remainingParam.progress,
        sessionId: sessionId
      }
    );

    return {
      content: [{
        type: 'text',
        text: this.formatInteractivePrompt(nextPrompt, session, remainingParam)
      }]
    };
  }

  /**
   * Execute the banking operation with collected parameters
   * @param {Object} session - Session object
   * @returns {Promise<Object>} Execution result
   */
  async executeOperation(session) {
    try {
      // Combine all parameters
      const allParameters = {
        ...session.providedParameters,
        ...session.collectedParameters
      };

      // Prepare request using banking adapter
      const preparedRequest = await this.bankingAdapter.prepareRequest({
        operation: session.operation,
        jwtToken: allParameters.jwtToken,
        parameters: allParameters,
        userId: session.userId
      });

      if (!preparedRequest.success) {
        return {
          isError: true,
          content: [{
            type: 'text',
            text: `❌ Failed to prepare banking request: ${preparedRequest.message || 'Unknown error'}`
          }]
        };
      }

      // Generate success message
      const summary = this.userPrompter.generateWorkflowSummary(
        session.workflow,
        session.collectedParameters
      );

      return {
        content: [{
          type: 'text',
          text: this.formatSuccessResult(session, preparedRequest, summary)
        }]
      };

    } catch (error) {
      logger.error('Banking operation execution failed', { 
        sessionId: session.sessionId,
        operation: session.operation,
        error: error.message 
      });

      return {
        isError: true,
        content: [{
          type: 'text',
          text: `❌ Banking operation execution failed: ${error.message}`
        }]
      };
    }
  }

  /**
   * Determine banking operation from natural language request
   * @param {string} request - User request
   * @returns {Promise<string|null>} Determined operation
   */
  async determineOperation(request) {
    const lowerRequest = request.toLowerCase();

    // Simple pattern matching for common operations
    if (lowerRequest.includes('account') && lowerRequest.includes('balance')) {
      return 'getAccountBalance';
    }
    
    if (lowerRequest.includes('transfer') || lowerRequest.includes('send money')) {
      return 'createTransfer';
    }
    
    if (lowerRequest.includes('transaction') && lowerRequest.includes('history')) {
      return 'getAccountTransactions';
    }
    
    if (lowerRequest.includes('account') && (lowerRequest.includes('list') || lowerRequest.includes('show'))) {
      return 'getAccounts';
    }
    
    if (lowerRequest.includes('profile') || lowerRequest.includes('user info')) {
      return 'getUserProfile';
    }

    if (lowerRequest.includes('transaction') && !lowerRequest.includes('history')) {
      return 'getTransaction';
    }

    // Default to account listing if unclear
    if (lowerRequest.includes('account')) {
      return 'getAccounts';
    }

    return null;
  }

  /**
   * Format interactive prompt for display
   * @param {Object} prompt - Generated prompt
   * @param {Object} session - Session object
   * @param {Object} nextParam - Next parameter info
   * @returns {string} Formatted prompt
   */
  formatInteractivePrompt(prompt, session, nextParam) {
    let formatted = `🏦 **Banking Operation: ${session.operation}**\n\n`;
    
    // Add progress
    formatted += `📋 **Step ${nextParam.progress.current} of ${nextParam.progress.total}**\n\n`;
    
    // Add main prompt
    formatted += `${prompt.fullPrompt}\n\n`;

    // Add session info
    formatted += `*Session ID: ${session.sessionId}*\n`;
    formatted += `*Provide your response to continue with this banking operation.*`;

    return formatted;
  }

  /**
   * Format error prompt for display
   * @param {Object} errorPrompt - Error prompt
   * @param {Object} session - Session object
   * @returns {string} Formatted error prompt
   */
  formatErrorPrompt(errorPrompt, session) {
    let formatted = `🏦 **Banking Operation: ${session.operation}** - Error\n\n`;
    
    formatted += `${errorPrompt.fullPrompt}\n\n`;
    
    formatted += `*Session ID: ${session.sessionId}*\n`;
    formatted += `*Please provide the correct value to continue.*`;

    return formatted;
  }

  /**
   * Format success result for display
   * @param {Object} session - Session object
   * @param {Object} preparedRequest - Prepared request
   * @param {Object} summary - Workflow summary
   * @returns {string} Formatted success result
   */
  formatSuccessResult(session, preparedRequest, summary) {
    let formatted = `🏦 **Banking Operation Completed: ${session.operation}**\n\n`;
    
    formatted += `✅ **Request Successfully Prepared**\n\n`;
    
    // Add collected parameters summary
    formatted += `**Parameters Collected:**\n`;
    Object.keys(session.collectedParameters).forEach(param => {
      const value = session.collectedParameters[param];
      const displayValue = this.getSafeDisplayValue(param, value);
      formatted += `• ${param}: ${displayValue}\n`;
    });
    
    formatted += '\n';
    formatted += `**Security Level:** ${preparedRequest.securityLevel}\n`;
    formatted += `**Request prepared with banking-grade security headers**\n`;
    
    if (preparedRequest.auditId) {
      formatted += `**Audit ID:** ${preparedRequest.auditId}\n`;
    }

    formatted += '\n*This request would now be sent to the banking API for execution.*';

    return formatted;
  }

  /**
   * Generate unique session ID
   * @returns {string} Session ID
   */
  generateSessionId() {
    return `banking_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get safe display value (hide sensitive data)
   * @param {string} parameter - Parameter name
   * @param {*} value - Parameter value
   * @returns {string} Safe display value
   */
  getSafeDisplayValue(parameter, value) {
    const sensitiveParams = ['jwtToken', 'token', 'password', 'pin'];
    
    if (sensitiveParams.includes(parameter)) {
      return '[PROVIDED]';
    }

    if (parameter === 'amount') {
      return `$${value}`;
    }

    return String(value);
  }

  /**
   * Clean up expired sessions
   * @param {number} maxAgeMs - Maximum age in milliseconds
   * @returns {number} Number of sessions cleaned
   */
  cleanupExpiredSessions(maxAgeMs = 30 * 60 * 1000) { // 30 minutes default
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
      logger.info('Cleaned up expired interactive banking sessions', { 
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
        userPrompter: this.userPrompter.getStats(),
        validationEngine: this.validationEngine.getStats()
      },
      features: {
        interactiveParameterCollection: true,
        multiStepWorkflows: true,
        contextAwarePrompting: true,
        realTimeValidation: true,
        sensitiveDataHandling: true,
        sessionManagement: true
      }
    };
  }
}