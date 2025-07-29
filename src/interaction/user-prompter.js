import { logger } from '../utils/logger.js';

/**
 * User Prompter for Phase 4.1 Checkpoint 2
 * Generates intelligent, context-aware prompts for collecting missing parameters
 * 
 * Features:
 * - Context-aware prompt generation
 * - Banking-specific prompt templates
 * - Sensitive data handling prompts
 * - Multi-step workflow prompts
 * - User-friendly error messaging
 */
export class UserPrompter {
  constructor() {
    // Banking-specific prompt templates
    this.promptTemplates = {
      // JWT Token prompts
      jwtToken: {
        initial: "I need your banking JWT token to access your account information. Please provide your authentication token.",
        missing: "To access your banking information, I need your JWT token. Please provide it to continue.",
        invalid: "The JWT token you provided is invalid. Please check the format and try again with a valid banking authentication token.",
        expired: "Your JWT token has expired. Please provide a new authentication token to continue with banking operations.",
        security: "🔒 Your JWT token will be encrypted and stored securely in memory for this session only."
      },

      // Account ID prompts
      accountId: {
        initial: "Which account would you like to use? Please provide the account ID (8-16 alphanumeric characters).",
        missing: "I need an account ID to proceed. Please specify which account you'd like to access.",
        invalid: "The account ID format is invalid. Please provide an 8-16 character alphanumeric account ID.",
        selection: "Please select from your available accounts or provide a specific account ID.",
        help: "💡 Account IDs are typically found on your banking statements or in your online banking portal."
      },

      // Transaction ID prompts
      transactionId: {
        initial: "Which transaction would you like to view? Please provide the transaction ID (12-24 alphanumeric characters).",
        missing: "I need a transaction ID to retrieve the specific transaction details.",
        invalid: "The transaction ID format is invalid. Please provide a 12-24 character alphanumeric transaction ID.",
        help: "💡 Transaction IDs can be found in your transaction history or receipts."
      },

      // Transfer-specific prompts
      fromAccountId: {
        initial: "Which account would you like to transfer money FROM? Please provide the source account ID.",
        missing: "I need to know which account to transfer money from. Please provide the source account ID.",
        invalid: "Invalid source account ID format. Please provide a valid 8-16 character account ID.",
        selection: "Please select the account you want to transfer money from."
      },

      toAccountId: {
        initial: "Which account would you like to transfer money TO? Please provide the destination account ID.",
        missing: "I need to know which account to transfer money to. Please provide the destination account ID.",
        invalid: "Invalid destination account ID format. Please provide a valid 8-16 character account ID.",
        selection: "Please select the account you want to transfer money to.",
        warning: "⚠️ Please double-check the destination account ID before confirming the transfer."
      },

      // Amount prompts
      amount: {
        initial: "How much would you like to transfer? Please provide the amount (e.g., 100.50).",
        missing: "I need to know the transfer amount. Please specify how much you'd like to transfer.",
        invalid: "Invalid amount format. Please provide a positive number (e.g., 100.50).",
        tooHigh: "The amount exceeds the maximum transfer limit of $50,000 per transaction.",
        tooLow: "The minimum transfer amount is $0.01.",
        confirmation: "💰 Transfer amount: ${amount}"
      },

      // Date prompts
      startDate: {
        initial: "What start date would you like for the transaction history? Please provide in YYYY-MM-DD format.",
        missing: "I need a start date for the transaction history. Please provide it in YYYY-MM-DD format.",
        invalid: "Invalid date format. Please use YYYY-MM-DD format (e.g., 2024-01-15).",
        futureDate: "Start date cannot be in the future. Please provide a past date.",
        tooOld: "Start date cannot be more than 2 years ago. Please provide a more recent date."
      },

      endDate: {
        initial: "What end date would you like for the transaction history? Please provide in YYYY-MM-DD format.",
        missing: "I need an end date for the transaction history. Please provide it in YYYY-MM-DD format.",
        invalid: "Invalid date format. Please use YYYY-MM-DD format (e.g., 2024-01-15).",
        futureDate: "End date cannot be in the future. Please provide a past date.",
        tooOld: "End date cannot be more than 2 years ago. Please provide a more recent date."
      },

      // Optional parameters
      currency: {
        initial: "What currency should be used for the transfer? (Leave blank for USD)",
        missing: "Please specify the currency for the transfer, or leave blank for USD.",
        invalid: "Invalid currency code. Please provide a 3-letter currency code (e.g., USD, EUR)."
      },

      description: {
        initial: "Would you like to add a description for this transfer? (Optional)",
        missing: "Please provide a description for the transfer, or leave blank to skip.",
        tooLong: "Description is too long. Please keep it under 200 characters."
      }
    };

    // Contextual prompt modifiers
    this.contextModifiers = {
      multiStep: {
        progress: "Step {current} of {total}:",
        remaining: "({remaining} more steps to complete)"
      },
      
      dependency: {
        blocked: "I need the following information first: {dependencies}",
        prerequisite: "Before I can ask for {parameter}, I need: {prerequisites}"
      },

      security: {
        sensitive: "🔒 This information will be handled securely and not stored permanently.",
        encryption: "🛡️ Your data will be encrypted during transmission and processing."
      },

      banking: {
        compliance: "📋 This request is required for banking compliance and security.",
        verification: "✅ This helps us verify your identity and protect your account."
      }
    };

    // Error message templates
    this.errorTemplates = {
      validation: {
        required: "This field is required to continue with the {operation} operation.",
        format: "The format is incorrect. {expectedFormat}",
        businessRule: "This value doesn't meet banking requirements: {reason}",
        dependency: "This parameter depends on: {dependencies}. Please provide those first."
      },

      technical: {
        timeout: "The request timed out. Please try again.",
        network: "There was a network issue. Please check your connection and try again.",
        server: "There was a server error. Please try again in a moment."
      },

      security: {
        unauthorized: "You don't have permission to access this information.",
        forbidden: "This operation is not allowed with your current permissions.",
        tokenExpired: "Your session has expired. Please provide a new JWT token."
      }
    };

    this.initialized = true;
    logger.info('User Prompter initialized for interactive banking operations');
  }

  /**
   * Generate prompts for missing parameters
   * @param {Array} missingParams - Array of missing parameter details
   * @param {string} context - Context (e.g., 'banking', 'transfer')
   * @param {Object} options - Additional prompt options
   * @returns {Promise<Object>} Generated prompts for each missing parameter
   */
  async generatePrompts(missingParams, context = 'banking', options = {}) {
    try {
      const prompts = {};

      for (const param of missingParams) {
        const prompt = await this.generateParameterPrompt(param, context, options);
        prompts[param] = prompt;
      }

      logger.info('User prompts generated', {
        context: context,
        parameterCount: Object.keys(prompts).length,
        parameters: Object.keys(prompts)
      });

      return prompts;

    } catch (error) {
      logger.error('Failed to generate user prompts', { error: error.message });
      throw error;
    }
  }

  /**
   * Generate a prompt for a specific parameter
   * @param {string|Object} param - Parameter name or parameter detail object
   * @param {string} context - Context for the prompt
   * @param {Object} options - Prompt generation options
   * @returns {Promise<Object>} Generated prompt object
   */
  async generateParameterPrompt(param, context, options = {}) {
    const paramName = typeof param === 'string' ? param : param.parameter || param;
    const paramDetails = typeof param === 'object' ? param : { parameter: paramName };
    
    const template = this.promptTemplates[paramName];
    
    if (!template) {
      return this.generateGenericPrompt(paramName, paramDetails, context, options);
    }

    // Build the main prompt
    let mainPrompt = template.initial;
    
    // Apply context-specific modifications
    if (options.isRetry && template.invalid) {
      mainPrompt = template.invalid;
    } else if (options.isMissing && template.missing) {
      mainPrompt = template.missing;
    }

    // Build additional context
    const contextElements = [];
    
    // Add progress information for multi-step workflows
    if (options.progress) {
      const progressText = this.contextModifiers.multiStep.progress
        .replace('{current}', options.progress.current)
        .replace('{total}', options.progress.total);
      contextElements.push(progressText);
    }

    // Add dependency information
    if (paramDetails.dependency && paramDetails.dependency.dependsOn) {
      const dependencyText = this.contextModifiers.dependency.blocked
        .replace('{dependencies}', paramDetails.dependency.dependsOn.join(', '));
      contextElements.push(dependencyText);
    }

    // Add security context for sensitive parameters
    if (paramDetails.sensitive || paramName === 'jwtToken') {
      contextElements.push(this.contextModifiers.security.sensitive);
      if (template.security) {
        contextElements.push(template.security);
      }
    }

    // Add banking compliance context
    if (context === 'banking') {
      contextElements.push(this.contextModifiers.banking.compliance);
    }

    // Add help information
    if (template.help && options.includeHelp !== false) {
      contextElements.push(template.help);
    }

    return {
      parameter: paramName,
      prompt: mainPrompt,
      context: contextElements,
      fullPrompt: this.combinePromptElements(mainPrompt, contextElements),
      type: paramDetails.type || 'string',
      sensitive: paramDetails.sensitive || false,
      required: paramDetails.required !== false,
      validation: paramDetails.validation || null,
      example: this.getParameterExample(paramName),
      template: template
    };
  }

  /**
   * Generate a generic prompt for unknown parameters
   * @param {string} paramName - Parameter name
   * @param {Object} paramDetails - Parameter details
   * @param {string} context - Context
   * @param {Object} options - Options
   * @returns {Object} Generic prompt object
   */
  generateGenericPrompt(paramName, paramDetails, context, options) {
    const humanReadableName = paramName
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, str => str.toUpperCase())
      .trim();

    const mainPrompt = `Please provide the ${humanReadableName.toLowerCase()}.`;
    const contextElements = [];

    if (paramDetails.required) {
      contextElements.push(`This field is required for the ${context} operation.`);
    }

    if (paramDetails.type) {
      const typeHint = this.getTypeHint(paramDetails.type);
      if (typeHint) {
        contextElements.push(typeHint);
      }
    }

    return {
      parameter: paramName,
      prompt: mainPrompt,
      context: contextElements,
      fullPrompt: this.combinePromptElements(mainPrompt, contextElements),
      type: paramDetails.type || 'string',
      sensitive: paramDetails.sensitive || false,
      required: paramDetails.required !== false,
      validation: paramDetails.validation || null,
      example: this.getParameterExample(paramName),
      template: null
    };
  }

  /**
   * Generate an error prompt for validation failures
   * @param {string} parameter - Parameter name
   * @param {Object} validationError - Validation error details
   * @param {Object} options - Prompt options
   * @returns {Object} Error prompt object
   */
  generateErrorPrompt(parameter, validationError, options = {}) {
    const template = this.promptTemplates[parameter];
    let errorPrompt;

    // Use specific error template if available
    if (template && template[validationError.error]) {
      errorPrompt = template[validationError.error];
    } else {
      // Use generic error template
      const errorCategory = this.categorizeError(validationError.error);
      const errorTemplate = this.errorTemplates[errorCategory.category][errorCategory.type];
      
      errorPrompt = errorTemplate
        .replace('{operation}', options.operation || 'banking')
        .replace('{reason}', validationError.message || 'unknown error')
        .replace('{dependencies}', validationError.dependencies?.join(', ') || '')
        .replace('{expectedFormat}', this.getExpectedFormat(parameter));
    }

    const contextElements = [
      "❌ " + errorPrompt,
      "Please try again with the correct format."
    ];

    // Add help information for retry
    if (template && template.help) {
      contextElements.push(template.help);
    }

    return {
      parameter: parameter,
      prompt: errorPrompt,
      context: contextElements,
      fullPrompt: this.combinePromptElements(errorPrompt, contextElements),
      isError: true,
      error: validationError,
      retryable: true
    };
  }

  /**
   * Generate a workflow summary prompt
   * @param {Object} workflow - Parameter collection workflow
   * @param {Object} collectedParams - Already collected parameters
   * @returns {Object} Workflow summary prompt
   */
  generateWorkflowSummary(workflow, collectedParams = {}) {
    const totalSteps = workflow.totalSteps;
    const completedSteps = Object.keys(collectedParams).length;
    const remainingSteps = totalSteps - completedSteps;

    let summary = `📋 Banking Operation: ${workflow.operation}\n\n`;
    
    if (completedSteps > 0) {
      summary += `✅ Collected (${completedSteps}/${totalSteps}):\n`;
      Object.keys(collectedParams).forEach(param => {
        const value = collectedParams[param];
        const displayValue = this.getSafeDisplayValue(param, value);
        summary += `   • ${this.getParameterDisplayName(param)}: ${displayValue}\n`;
      });
      summary += '\n';
    }

    if (remainingSteps > 0) {
      summary += `⏳ Still needed (${remainingSteps}):\n`;
      workflow.steps
        .filter(step => !collectedParams.hasOwnProperty(step.parameter))
        .forEach(step => {
          const status = step.canExecuteNow ? '📝' : '⏸️';
          summary += `   ${status} ${this.getParameterDisplayName(step.parameter)}\n`;
        });
    }

    return {
      summary: summary,
      progress: {
        completed: completedSteps,
        total: totalSteps,
        percentage: Math.round((completedSteps / totalSteps) * 100)
      },
      canProceed: workflow.canProceed,
      nextParameter: remainingSteps > 0 ? workflow.steps.find(s => !collectedParams.hasOwnProperty(s.parameter))?.parameter : null
    };
  }

  /**
   * Combine prompt elements into a full prompt
   * @param {string} mainPrompt - Main prompt text
   * @param {Array} contextElements - Additional context elements
   * @returns {string} Combined full prompt
   */
  combinePromptElements(mainPrompt, contextElements) {
    let fullPrompt = mainPrompt;
    
    if (contextElements && contextElements.length > 0) {
      fullPrompt += '\n\n' + contextElements.join('\n');
    }

    return fullPrompt;
  }

  /**
   * Get parameter example for help
   * @param {string} paramName - Parameter name
   * @returns {string|null} Example value
   */
  getParameterExample(paramName) {
    const examples = {
      jwtToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
      accountId: 'ACC123456789',
      transactionId: 'TXN20240101ABC12345',
      amount: '100.50',
      startDate: '2024-01-01',
      endDate: '2024-01-31',
      currency: 'USD',
      description: 'Monthly transfer to savings'
    };

    return examples[paramName] || null;
  }

  /**
   * Get type hint for parameter types
   * @param {string} type - Parameter type
   * @returns {string|null} Type hint
   */
  getTypeHint(type) {
    const hints = {
      number: 'Please enter a numeric value.',
      date: 'Please use YYYY-MM-DD format.',
      jwt: 'Please provide a valid JWT token.',
      string: 'Please enter text.'
    };

    return hints[type] || null;
  }

  /**
   * Get expected format description for parameter
   * @param {string} parameter - Parameter name
   * @returns {string} Expected format description
   */
  getExpectedFormat(parameter) {
    const formats = {
      jwtToken: 'JWT format: header.payload.signature',
      accountId: '8-16 alphanumeric characters',
      transactionId: '12-24 alphanumeric characters',
      amount: 'Positive number (e.g., 100.50)',
      startDate: 'Date in YYYY-MM-DD format',
      endDate: 'Date in YYYY-MM-DD format'
    };

    return formats[parameter] || 'Valid format required';
  }

  /**
   * Categorize error for template selection
   * @param {string} errorCode - Error code
   * @returns {Object} Error category
   */
  categorizeError(errorCode) {
    const errorMap = {
      required: { category: 'validation', type: 'required' },
      format_invalid: { category: 'validation', type: 'format' },
      invalid_number: { category: 'validation', type: 'format' },
      invalid_date: { category: 'validation', type: 'format' },
      invalid_jwt: { category: 'validation', type: 'format' },
      amount_too_high: { category: 'validation', type: 'businessRule' },
      amount_too_low: { category: 'validation', type: 'businessRule' },
      unauthorized: { category: 'security', type: 'unauthorized' },
      forbidden: { category: 'security', type: 'forbidden' },
      expired: { category: 'security', type: 'tokenExpired' }
    };

    return errorMap[errorCode] || { category: 'validation', type: 'format' };
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
      return '[SECURED]';
    }

    if (parameter === 'amount') {
      return `$${value}`;
    }

    return String(value);
  }

  /**
   * Get human-readable parameter display name
   * @param {string} paramName - Parameter name
   * @returns {string} Display name
   */
  getParameterDisplayName(paramName) {
    const displayNames = {
      jwtToken: 'Authentication Token',
      accountId: 'Account ID',
      fromAccountId: 'Source Account',
      toAccountId: 'Destination Account',
      transactionId: 'Transaction ID',
      amount: 'Transfer Amount',
      startDate: 'Start Date',
      endDate: 'End Date',
      currency: 'Currency',
      description: 'Description'
    };

    return displayNames[paramName] || paramName
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, str => str.toUpperCase())
      .trim();
  }

  /**
   * Get prompter statistics
   * @returns {Object} Prompter statistics
   */
  getStats() {
    return {
      initialized: this.initialized,
      promptTemplates: Object.keys(this.promptTemplates).length,
      contextModifiers: Object.keys(this.contextModifiers).length,
      errorTemplates: Object.keys(this.errorTemplates).reduce((total, category) => 
        total + Object.keys(this.errorTemplates[category]).length, 0),
      features: {
        contextAwarePrompts: true,
        bankingSpecificTemplates: true,
        sensitiveDataHandling: true,
        multiStepWorkflows: true,
        errorRecovery: true
      }
    };
  }
}