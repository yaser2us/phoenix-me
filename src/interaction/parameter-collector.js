import { logger } from '../utils/logger.js';

/**
 * Parameter Collector for Phase 4.1 Checkpoint 2
 * Handles intelligent detection and collection of missing parameters for banking operations
 * 
 * Features:
 * - Missing parameter detection and analysis
 * - Context-aware parameter mapping
 * - Banking-specific parameter requirements
 * - Interactive parameter collection workflows
 * - Parameter dependency resolution
 */
export class ParameterCollector {
  constructor(registry) {
    this.registry = registry;
    
    // Banking-specific parameter mappings and requirements
    this.bankingParameterMap = {
      // Account operations
      'getAccounts': {
        required: ['jwtToken'],
        optional: ['includeBalances', 'accountType']
      },
      'getAccount': {
        required: ['jwtToken', 'accountId'],
        optional: []
      },
      'getAccountBalance': {
        required: ['jwtToken', 'accountId'],
        optional: []
      },
      'getAccountTransactions': {
        required: ['jwtToken', 'accountId'],
        optional: ['startDate', 'endDate', 'limit', 'offset']
      },
      'getTransaction': {
        required: ['jwtToken', 'transactionId'],
        optional: []
      },
      'createTransfer': {
        required: ['jwtToken', 'fromAccountId', 'toAccountId', 'amount'],
        optional: ['currency', 'description', 'scheduledDate']
      },
      'getUserProfile': {
        required: ['jwtToken'],
        optional: []
      }
    };

    // Parameter dependencies - parameters that depend on others
    this.parameterDependencies = {
      'accountId': {
        dependsOn: ['jwtToken'],
        requiresUserSelection: true,
        selectionPrompt: 'Which account would you like to use?'
      },
      'fromAccountId': {
        dependsOn: ['jwtToken'],
        requiresUserSelection: true,
        selectionPrompt: 'Which account would you like to transfer from?'
      },
      'toAccountId': {
        dependsOn: ['jwtToken', 'fromAccountId'],
        requiresUserSelection: true,
        selectionPrompt: 'Which account would you like to transfer to?'
      },
      'transactionId': {
        dependsOn: ['jwtToken', 'accountId'],
        requiresUserSelection: true,
        selectionPrompt: 'Which transaction would you like to view?'
      }
    };

    // Parameter types and validation rules
    this.parameterTypes = {
      'jwtToken': {
        type: 'jwt',
        sensitive: true,
        validation: /^[A-Za-z0-9\-_]+\.[A-Za-z0-9\-_]+\.[A-Za-z0-9\-_]+$/,
        prompt: 'Please provide your banking JWT token'
      },
      'accountId': {
        type: 'string',
        sensitive: false,
        validation: /^[A-Za-z0-9]{8,16}$/,
        prompt: 'Please provide the account ID (8-16 alphanumeric characters)'
      },
      'transactionId': {
        type: 'string',
        sensitive: false,
        validation: /^[A-Za-z0-9]{12,24}$/,
        prompt: 'Please provide the transaction ID (12-24 alphanumeric characters)'
      },
      'amount': {
        type: 'number',
        sensitive: false,
        validation: /^\d+(\.\d{1,2})?$/,
        prompt: 'Please provide the transfer amount (e.g., 100.50)'
      },
      'startDate': {
        type: 'date',
        sensitive: false,
        validation: /^\d{4}-\d{2}-\d{2}$/,
        prompt: 'Please provide the start date (YYYY-MM-DD format)'
      },
      'endDate': {
        type: 'date',
        sensitive: false,
        validation: /^\d{4}-\d{2}-\d{2}$/,
        prompt: 'Please provide the end date (YYYY-MM-DD format)'
      }
    };

    this.initialized = true;
    logger.info('Parameter Collector initialized for banking operations');
  }

  /**
   * Identify missing parameters for a banking operation
   * @param {Object} request - Request object with operation and provided parameters
   * @returns {Promise<Array>} Array of missing parameter details
   */
  async identifyMissingParameters(request) {
    try {
      const { intent, operation, providedParams = {}, requiredParams = [] } = request;
      
      // Get operation-specific requirements
      const operationRequirements = this.bankingParameterMap[operation] || {
        required: requiredParams,
        optional: []
      };

      // Identify missing required parameters
      const missingRequired = operationRequirements.required.filter(param => 
        !providedParams.hasOwnProperty(param) || 
        providedParams[param] === null || 
        providedParams[param] === undefined ||
        providedParams[param] === ''
      );

      // Analyze parameter dependencies
      const dependencyAnalysis = await this.analyzeDependencies(operation, providedParams, missingRequired);

      // Build detailed missing parameter information
      const missingDetails = await this.buildMissingParameterDetails(
        missingRequired, 
        operationRequirements.optional,
        providedParams,
        dependencyAnalysis
      );

      logger.info('Missing parameters identified', {
        operation: operation,
        missingCount: missingRequired.length,
        missingParams: missingRequired,
        hasDependencies: dependencyAnalysis.hasDependencies
      });

      return missingDetails;

    } catch (error) {
      logger.error('Failed to identify missing parameters', { error: error.message });
      throw error;
    }
  }

  /**
   * Analyze parameter dependencies and requirements
   * @param {string} operation - Banking operation
   * @param {Object} providedParams - Already provided parameters
   * @param {Array} missingRequired - Missing required parameters
   * @returns {Promise<Object>} Dependency analysis result
   */
  async analyzeDependencies(operation, providedParams, missingRequired) {
    const analysis = {
      hasDependencies: false,
      dependencyChain: [],
      blockedParameters: [],
      resolvableParameters: []
    };

    for (const missingParam of missingRequired) {
      const dependency = this.parameterDependencies[missingParam];
      
      if (dependency) {
        analysis.hasDependencies = true;
        
        // Check if dependencies are satisfied
        const dependenciesSatisfied = dependency.dependsOn.every(dep => 
          providedParams.hasOwnProperty(dep) && providedParams[dep]
        );

        if (dependenciesSatisfied) {
          analysis.resolvableParameters.push({
            parameter: missingParam,
            dependency: dependency,
            canResolve: true
          });
        } else {
          analysis.blockedParameters.push({
            parameter: missingParam,
            dependency: dependency,
            missingDependencies: dependency.dependsOn.filter(dep => 
              !providedParams.hasOwnProperty(dep) || !providedParams[dep]
            )
          });
        }

        analysis.dependencyChain.push({
          parameter: missingParam,
          dependsOn: dependency.dependsOn,
          satisfied: dependenciesSatisfied
        });
      } else {
        // No dependencies, can be resolved directly
        analysis.resolvableParameters.push({
          parameter: missingParam,
          dependency: null,
          canResolve: true
        });
      }
    }

    return analysis;
  }

  /**
   * Build detailed information for missing parameters
   * @param {Array} missingRequired - Missing required parameters
   * @param {Array} optional - Optional parameters
   * @param {Object} providedParams - Already provided parameters
   * @param {Object} dependencyAnalysis - Dependency analysis result
   * @returns {Promise<Array>} Detailed missing parameter information
   */
  async buildMissingParameterDetails(missingRequired, optional, providedParams, dependencyAnalysis) {
    const details = [];

    for (const param of missingRequired) {
      const paramType = this.parameterTypes[param] || {
        type: 'string',
        sensitive: false,
        validation: null,
        prompt: `Please provide the ${param}`
      };

      const dependency = dependencyAnalysis.dependencyChain.find(dep => dep.parameter === param);
      const resolvable = dependencyAnalysis.resolvableParameters.find(res => res.parameter === param);

      details.push({
        parameter: param,
        type: paramType.type,
        required: true,
        sensitive: paramType.sensitive,
        prompt: paramType.prompt,
        validation: paramType.validation,
        dependency: dependency || null,
        canResolveNow: resolvable ? resolvable.canResolve : false,
        priority: this.calculateParameterPriority(param, dependency, resolvable)
      });
    }

    // Sort by priority (highest first)
    details.sort((a, b) => b.priority - a.priority);

    return details;
  }

  /**
   * Calculate priority for parameter collection order
   * @param {string} param - Parameter name
   * @param {Object} dependency - Dependency information
   * @param {Object} resolvable - Resolvable information
   * @returns {number} Priority score (higher = more urgent)
   */
  calculateParameterPriority(param, dependency, resolvable) {
    let priority = 5; // Base priority

    // JWT tokens are highest priority
    if (param === 'jwtToken') {
      priority += 10;
    }

    // Parameters without dependencies get higher priority
    if (!dependency) {
      priority += 5;
    }

    // Parameters that can be resolved now get higher priority
    if (resolvable && resolvable.canResolve) {
      priority += 3;
    }

    // Account IDs are important for banking operations
    if (param.includes('accountId') || param.includes('Account')) {
      priority += 2;
    }

    // Sensitive parameters get higher priority
    const paramType = this.parameterTypes[param];
    if (paramType && paramType.sensitive) {
      priority += 1;
    }

    return priority;
  }

  /**
   * Generate parameter collection workflow
   * @param {Array} missingDetails - Detailed missing parameter information
   * @param {string} operation - Banking operation
   * @returns {Promise<Object>} Parameter collection workflow
   */
  async generateCollectionWorkflow(missingDetails, operation) {
    const workflow = {
      operation: operation,
      totalSteps: missingDetails.length,
      currentStep: 0,
      steps: [],
      canProceed: false,
      blockedBy: []
    };

    // Group parameters by dependency levels
    const noDependencies = missingDetails.filter(detail => !detail.dependency);
    const hasDependencies = missingDetails.filter(detail => detail.dependency);

    // Add independent parameters first
    noDependencies.forEach((detail, index) => {
      workflow.steps.push({
        stepNumber: index + 1,
        parameter: detail.parameter,
        type: detail.type,
        prompt: detail.prompt,
        sensitive: detail.sensitive,
        validation: detail.validation,
        dependencies: [],
        canExecuteNow: true
      });
    });

    // Add dependent parameters in order
    let stepNumber = noDependencies.length + 1;
    hasDependencies.forEach(detail => {
      workflow.steps.push({
        stepNumber: stepNumber++,
        parameter: detail.parameter,
        type: detail.type,
        prompt: detail.prompt,
        sensitive: detail.sensitive,
        validation: detail.validation,
        dependencies: detail.dependency ? detail.dependency.dependsOn : [],
        canExecuteNow: detail.canResolveNow
      });
    });

    // Determine if workflow can proceed
    workflow.canProceed = workflow.steps.some(step => step.canExecuteNow);
    workflow.blockedBy = workflow.steps
      .filter(step => !step.canExecuteNow)
      .map(step => step.dependencies)
      .flat()
      .filter((dep, index, arr) => arr.indexOf(dep) === index);

    logger.info('Parameter collection workflow generated', {
      operation: operation,
      totalSteps: workflow.totalSteps,
      canProceed: workflow.canProceed,
      blockedBy: workflow.blockedBy
    });

    return workflow;
  }

  /**
   * Validate collected parameter against banking requirements
   * @param {string} parameter - Parameter name
   * @param {*} value - Parameter value
   * @param {string} operation - Banking operation
   * @returns {Promise<Object>} Validation result
   */
  async validateCollectedParameter(parameter, value, operation) {
    const paramType = this.parameterTypes[parameter];
    
    if (!paramType) {
      return {
        isValid: true,
        parameter: parameter,
        value: value,
        message: 'No specific validation rules for this parameter'
      };
    }

    // Check if value is provided
    if (value === null || value === undefined || value === '') {
      return {
        isValid: false,
        parameter: parameter,
        value: value,
        error: 'required',
        message: `${parameter} is required for ${operation} operation`
      };
    }

    // Type-specific validation
    const validationResult = await this.performTypeValidation(parameter, value, paramType);
    if (!validationResult.isValid) {
      return validationResult;
    }

    // Banking-specific validation
    const bankingValidation = await this.performBankingValidation(parameter, value, operation);
    if (!bankingValidation.isValid) {
      return bankingValidation;
    }

    return {
      isValid: true,
      parameter: parameter,
      value: value,
      type: paramType.type,
      message: 'Parameter validation passed'
    };
  }

  /**
   * Perform type-specific validation
   * @param {string} parameter - Parameter name
   * @param {*} value - Parameter value
   * @param {Object} paramType - Parameter type definition
   * @returns {Promise<Object>} Validation result
   */
  async performTypeValidation(parameter, value, paramType) {
    const stringValue = String(value);

    // Regex validation if provided
    if (paramType.validation && !paramType.validation.test(stringValue)) {
      return {
        isValid: false,
        parameter: parameter,
        value: value,
        error: 'format_invalid',
        message: `Invalid format for ${parameter}. ${paramType.prompt}`
      };
    }

    // Type-specific checks
    switch (paramType.type) {
      case 'number':
        const numValue = parseFloat(value);
        if (isNaN(numValue) || numValue <= 0) {
          return {
            isValid: false,
            parameter: parameter,
            value: value,
            error: 'invalid_number',
            message: `${parameter} must be a positive number`
          };
        }
        break;

      case 'date':
        const dateValue = new Date(value);
        if (isNaN(dateValue.getTime())) {
          return {
            isValid: false,
            parameter: parameter,
            value: value,
            error: 'invalid_date',
            message: `${parameter} must be a valid date in YYYY-MM-DD format`
          };
        }
        break;

      case 'jwt':
        const jwtParts = stringValue.split('.');
        if (jwtParts.length !== 3) {
          return {
            isValid: false,
            parameter: parameter,
            value: '[REDACTED]',
            error: 'invalid_jwt',
            message: 'JWT token must have 3 parts separated by dots'
          };
        }
        break;
    }

    return { isValid: true };
  }

  /**
   * Perform banking-specific validation
   * @param {string} parameter - Parameter name
   * @param {*} value - Parameter value
   * @param {string} operation - Banking operation
   * @returns {Promise<Object>} Validation result
   */
  async performBankingValidation(parameter, value, operation) {
    // Banking-specific business rules
    switch (parameter) {
      case 'amount':
        const amount = parseFloat(value);
        
        // Maximum transfer limit check
        if (amount > 50000) {
          return {
            isValid: false,
            parameter: parameter,
            value: value,
            error: 'amount_too_high',
            message: 'Transfer amount cannot exceed $50,000 per transaction'
          };
        }

        // Minimum transfer amount
        if (amount < 0.01) {
          return {
            isValid: false,
            parameter: parameter,
            value: value,
            error: 'amount_too_low',
            message: 'Transfer amount must be at least $0.01'
          };
        }
        break;

      case 'startDate':
      case 'endDate':
        const date = new Date(value);
        const now = new Date();
        
        // Cannot be in the future
        if (date > now) {
          return {
            isValid: false,
            parameter: parameter,
            value: value,
            error: 'future_date',
            message: 'Date cannot be in the future'
          };
        }

        // Cannot be more than 2 years ago
        const twoYearsAgo = new Date();
        twoYearsAgo.setFullYear(now.getFullYear() - 2);
        
        if (date < twoYearsAgo) {
          return {
            isValid: false,
            parameter: parameter,
            value: value,
            error: 'date_too_old',
            message: 'Date cannot be more than 2 years ago'
          };
        }
        break;
    }

    return { isValid: true };
  }

  /**
   * Get next parameter to collect in workflow
   * @param {Object} workflow - Parameter collection workflow
   * @param {Object} collectedParams - Already collected parameters
   * @returns {Object|null} Next parameter to collect or null if complete
   */
  getNextParameter(workflow, collectedParams = {}) {
    for (const step of workflow.steps) {
      // Skip if already collected
      if (collectedParams.hasOwnProperty(step.parameter)) {
        continue;
      }

      // Check if dependencies are satisfied
      const dependenciesSatisfied = step.dependencies.every(dep => 
        collectedParams.hasOwnProperty(dep) && collectedParams[dep]
      );

      if (dependenciesSatisfied) {
        return {
          step: step,
          progress: {
            current: Object.keys(collectedParams).length + 1,
            total: workflow.totalSteps
          }
        };
      }
    }

    return null; // All parameters collected or blocked
  }

  /**
   * Get collector statistics
   * @returns {Object} Collector statistics
   */
  getStats() {
    return {
      initialized: this.initialized,
      supportedOperations: Object.keys(this.bankingParameterMap).length,
      parameterTypes: Object.keys(this.parameterTypes).length,
      dependencyRules: Object.keys(this.parameterDependencies).length,
      features: {
        missingParameterDetection: true,
        dependencyAnalysis: true,
        workflowGeneration: true,
        bankingValidation: true,
        sensitiveDataHandling: true
      }
    };
  }
}