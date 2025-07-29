import { logger } from '../utils/logger.js';
import { MaybankWorkflows } from '../workflows/maybank-workflows.js';

/**
 * Maybank Parameter Collector for Phase 4.2 Checkpoint 3
 * Handles interactive parameter collection specifically for Maybank operations and workflows
 * 
 * Features:
 * - Maybank-specific parameter requirements and validation
 * - JWT token management and validation
 * - Workflow-aware parameter collection
 * - Interactive prompting for optional parameters
 * - Context-aware parameter suggestions
 * - Secure handling of banking credentials
 */
export class MaybankParameterCollector {
  constructor() {
    this.maybankWorkflows = new MaybankWorkflows();
    
    // Maybank-specific parameter types and validation
    this.maybankParameterTypes = {
      'jwtToken': {
        type: 'jwt',
        sensitive: true,
        required: true,
        validation: /^[A-Za-z0-9\-_]+\.[A-Za-z0-9\-_]+\.[A-Za-z0-9\-_]+$/,
        prompt: 'Please provide your Maybank JWT authentication token:',
        description: 'Valid Maybank JWT token required for authentication',
        securityLevel: 'high',
        storageRestrictions: {
          logInClearText: false,
          cacheAllowed: false,
          auditRequired: true
        }
      },
      'includeDetails': {
        type: 'boolean',
        sensitive: false,
        required: false,
        validation: /^(true|false|yes|no|y|n|1|0)$/i,
        prompt: 'Would you like detailed financial analysis included? (yes/no):',
        description: 'Include comprehensive financial analysis and insights',
        defaultValue: false,
        transform: (value) => ['true', 'yes', 'y', '1'].includes(String(value).toLowerCase())
      },
      'analysisType': {
        type: 'enum',
        sensitive: false,
        required: false,
        options: ['basic', 'detailed', 'comprehensive'],
        prompt: 'What type of analysis would you like? (basic/detailed/comprehensive):',
        description: 'Level of financial analysis to perform',
        defaultValue: 'basic',
        validation: /^(basic|detailed|comprehensive)$/i
      },
      'period': {
        type: 'enum',
        sensitive: false,
        required: false,
        options: ['current', 'monthly', 'quarterly'],
        prompt: 'What time period for analysis? (current/monthly/quarterly):',
        description: 'Time period for financial analysis',
        defaultValue: 'current',
        validation: /^(current|monthly|quarterly)$/i
      },
      'includeRecommendations': {
        type: 'boolean',
        sensitive: false,
        required: false,
        validation: /^(true|false|yes|no|y|n|1|0)$/i,
        prompt: 'Would you like financial recommendations? (yes/no):',
        description: 'Include personalized financial recommendations',
        defaultValue: true,
        transform: (value) => ['true', 'yes', 'y', '1'].includes(String(value).toLowerCase())
      },
      'comparisonType': {
        type: 'enum',
        sensitive: false,
        required: false,
        options: ['balance', 'activity', 'performance'],
        prompt: 'What type of account comparison? (balance/activity/performance):',
        description: 'Type of comparison analysis between accounts',
        defaultValue: 'balance',
        validation: /^(balance|activity|performance)$/i
      },
      'healthMetrics': {
        type: 'enum',
        sensitive: false,
        required: false,
        options: ['basic', 'detailed', 'comprehensive'],
        prompt: 'Which health metrics to analyze? (basic/detailed/comprehensive):',
        description: 'Level of financial health metrics to include',
        defaultValue: 'basic',
        validation: /^(basic|detailed|comprehensive)$/i
      },
      'recommendationLevel': {
        type: 'enum',
        sensitive: false,
        required: false,
        options: ['basic', 'detailed', 'actionable'],
        prompt: 'What level of recommendations? (basic/detailed/actionable):',
        description: 'Detail level of financial recommendations provided',
        defaultValue: 'detailed',
        validation: /^(basic|detailed|actionable)$/i
      }
    };

    // Maybank operation to parameter mapping
    this.maybankOperationMap = {
      'get_banking_getBalance': {
        required: ['jwtToken'],
        optional: [],
        workflowCompatible: true
      },
      'get_banking_summary': {
        required: ['jwtToken'],
        optional: [],
        workflowCompatible: true
      },
      'get_banking_all': {
        required: ['jwtToken'],
        optional: [],
        workflowCompatible: true
      }
    };

    this.initialized = true;
    logger.info('Maybank Parameter Collector initialized');
  }

  /**
   * Identify missing parameters for Maybank operation or workflow
   * @param {Object} request - Request details
   * @returns {Promise<Object>} Missing parameter analysis
   */
  async identifyMissingParameters(request) {
    try {
      const { 
        workflowName, 
        operationId, 
        providedParams = {}, 
        isWorkflow = false,
        interactiveMode = true 
      } = request;

      let analysis = {
        hasJWT: !!providedParams.jwtToken,
        missingRequired: [],
        availableOptional: [],
        interactiveParameters: [],
        securityRequirements: [],
        canProceed: false
      };

      // JWT token is always required for Maybank operations
      if (!providedParams.jwtToken) {
        analysis.missingRequired.push({
          parameter: 'jwtToken',
          config: this.maybankParameterTypes.jwtToken,
          priority: 100,
          blocking: true
        });
        analysis.securityRequirements.push('JWT authentication required');
      }

      if (isWorkflow && workflowName) {
        // Handle workflow parameter requirements
        const workflowAnalysis = await this.analyzeWorkflowParameters(workflowName, providedParams, interactiveMode);
        analysis = { ...analysis, ...workflowAnalysis };
      } else if (operationId) {
        // Handle direct operation parameter requirements
        const operationAnalysis = await this.analyzeOperationParameters(operationId, providedParams);
        analysis.availableOptional = operationAnalysis.optional || [];
      }

      // Check if we can proceed (JWT provided and no blocking parameters missing)
      analysis.canProceed = analysis.hasJWT && 
                           analysis.missingRequired.filter(req => req.blocking).length === 0;

      // Sort parameters by priority
      analysis.missingRequired.sort((a, b) => b.priority - a.priority);
      analysis.interactiveParameters.sort((a, b) => (b.recommended ? 1 : 0) - (a.recommended ? 1 : 0));

      logger.info('Maybank parameter analysis completed', {
        workflowName: workflowName,
        operationId: operationId,
        hasJWT: analysis.hasJWT,
        missingCount: analysis.missingRequired.length,
        optionalCount: analysis.availableOptional.length,
        canProceed: analysis.canProceed
      });

      return analysis;

    } catch (error) {
      logger.error('Failed to identify Maybank parameters', { error: error.message });
      throw error;
    }
  }

  /**
   * Analyze workflow-specific parameter requirements
   * @param {string} workflowName - Maybank workflow name
   * @param {Object} providedParams - Already provided parameters
   * @param {boolean} interactiveMode - Whether to include optional parameters
   * @returns {Promise<Object>} Workflow parameter analysis
   */
  async analyzeWorkflowParameters(workflowName, providedParams, interactiveMode) {
    try {
      const workflow = this.maybankWorkflows.getWorkflow(workflowName);
      const analysis = {
        workflowType: workflow.workflowType,
        complexity: workflow.complexity,
        estimatedTime: workflow.estimatedTime,
        availableOptional: [],
        interactiveParameters: []
      };

      // Process optional parameters if in interactive mode
      if (interactiveMode && workflow.optionalParameters) {
        for (const paramName of workflow.optionalParameters) {
          const paramConfig = this.maybankParameterTypes[paramName];
          
          if (paramConfig && !providedParams.hasOwnProperty(paramName)) {
            const interactiveParam = {
              parameter: paramName,
              config: paramConfig,
              workflowSpecific: true,
              recommended: this.isParameterRecommended(paramName, workflowName),
              enhancesResults: this.parameterEnhancesResults(paramName, workflowName)
            };

            analysis.availableOptional.push(paramConfig);
            analysis.interactiveParameters.push(interactiveParam);
          }
        }
      }

      return analysis;

    } catch (error) {
      logger.error('Failed to analyze workflow parameters', { 
        workflowName: workflowName, 
        error: error.message 
      });
      return { availableOptional: [], interactiveParameters: [] };
    }
  }

  /**
   * Analyze operation-specific parameter requirements
   * @param {string} operationId - Maybank operation ID
   * @param {Object} providedParams - Already provided parameters
   * @returns {Promise<Object>} Operation parameter analysis
   */
  async analyzeOperationParameters(operationId, providedParams) {
    const operationConfig = this.maybankOperationMap[operationId];
    
    if (!operationConfig) {
      return { optional: [] };
    }

    return {
      optional: operationConfig.optional.map(paramName => 
        this.maybankParameterTypes[paramName]
      ).filter(Boolean)
    };
  }

  /**
   * Generate interactive parameter collection workflow
   * @param {Object} analysis - Parameter analysis result
   * @param {Object} context - Collection context
   * @returns {Promise<Object>} Interactive collection workflow
   */
  async generateInteractiveWorkflow(analysis, context = {}) {
    try {
      const workflow = {
        sessionId: context.sessionId || this.generateSessionId(),
        workflowType: analysis.workflowType || 'parameter_collection',
        totalSteps: analysis.missingRequired.length + analysis.interactiveParameters.length,
        currentStep: 0,
        steps: [],
        securityLevel: 'high',
        canSkipOptional: true,
        contextualHelp: true
      };

      // Add required parameter steps (blocking)
      let stepNumber = 1;
      for (const reqParam of analysis.missingRequired) {
        workflow.steps.push({
          stepNumber: stepNumber++,
          type: 'required',
          parameter: reqParam.parameter,
          config: reqParam.config,
          prompt: this.generateContextualPrompt(reqParam.parameter, reqParam.config, context),
          validation: reqParam.config.validation,
          blocking: reqParam.blocking,
          securityLevel: reqParam.config.securityLevel || 'medium',
          canSkip: false
        });
      }

      // Add interactive optional parameter steps
      for (const intParam of analysis.interactiveParameters) {
        workflow.steps.push({
          stepNumber: stepNumber++,
          type: 'optional',
          parameter: intParam.parameter,
          config: intParam.config,
          prompt: this.generateContextualPrompt(intParam.parameter, intParam.config, context),
          validation: intParam.config.validation,
          blocking: false,
          recommended: intParam.recommended,
          enhancesResults: intParam.enhancesResults,
          canSkip: true,
          skipPrompt: `Skip ${intParam.parameter}? This will use default value: ${intParam.config.defaultValue}`
        });
      }

      logger.info('Interactive Maybank workflow generated', {
        sessionId: workflow.sessionId,
        totalSteps: workflow.totalSteps,
        requiredSteps: analysis.missingRequired.length,
        optionalSteps: analysis.interactiveParameters.length
      });

      return workflow;

    } catch (error) {
      logger.error('Failed to generate interactive workflow', { error: error.message });
      throw error;
    }
  }

  /**
   * Generate contextual prompt for parameter
   * @param {string} paramName - Parameter name
   * @param {Object} paramConfig - Parameter configuration
   * @param {Object} context - Collection context
   * @returns {string} Contextual prompt
   */
  generateContextualPrompt(paramName, paramConfig, context) {
    let prompt = paramConfig.prompt;

    // Add contextual information
    if (context.workflowName) {
      const workflowContext = this.getWorkflowContext(context.workflowName);
      if (workflowContext.parameterContext[paramName]) {
        prompt += `\n\n*${workflowContext.parameterContext[paramName]}*`;
      }
    }

    // Add validation hints
    if (paramConfig.options) {
      prompt += `\n\nValid options: ${paramConfig.options.join(', ')}`;
    }

    // Add default value information
    if (paramConfig.defaultValue !== undefined) {
      prompt += `\n(Default: ${paramConfig.defaultValue})`;
    }

    // Add enhancement information for optional parameters
    if (paramConfig.type !== 'jwt' && this.parameterEnhancesResults(paramName, context.workflowName)) {
      prompt += '\n\n💡 *This parameter will provide more detailed analysis and insights.*';
    }

    return prompt;
  }

  /**
   * Validate collected parameter
   * @param {string} paramName - Parameter name
   * @param {*} value - Parameter value
   * @param {Object} context - Validation context
   * @returns {Promise<Object>} Validation result
   */
  async validateParameter(paramName, value, context = {}) {
    try {
      const paramConfig = this.maybankParameterTypes[paramName];
      
      if (!paramConfig) {
        return {
          isValid: true,
          value: value,
          message: 'No specific validation rules for this parameter'
        };
      }

      // Check if value is provided for required parameters
      if (paramConfig.required && (value === null || value === undefined || value === '')) {
        return {
          isValid: false,
          error: 'required',
          message: `${paramName} is required for Maybank operations`,
          prompt: paramConfig.prompt
        };
      }

      // Skip validation for empty optional parameters
      if (!paramConfig.required && (value === null || value === undefined || value === '')) {
        return {
          isValid: true,
          value: paramConfig.defaultValue,
          skipped: true,
          message: `Using default value: ${paramConfig.defaultValue}`
        };
      }

      // Perform type-specific validation
      const validationResult = await this.performMaybankValidation(paramName, value, paramConfig, context);
      
      return validationResult;

    } catch (error) {
      logger.error('Parameter validation failed', { 
        parameter: paramName, 
        error: error.message 
      });
      
      return {
        isValid: false,
        error: 'validation_error',
        message: `Validation error for ${paramName}: ${error.message}`
      };
    }
  }

  /**
   * Perform Maybank-specific validation
   * @param {string} paramName - Parameter name
   * @param {*} value - Parameter value
   * @param {Object} paramConfig - Parameter configuration
   * @param {Object} context - Validation context
   * @returns {Promise<Object>} Validation result
   */
  async performMaybankValidation(paramName, value, paramConfig, context) {
    const stringValue = String(value).trim();

    // Regex validation if provided
    if (paramConfig.validation && !paramConfig.validation.test(stringValue)) {
      return {
        isValid: false,
        error: 'format_invalid',
        message: `Invalid format for ${paramName}. ${paramConfig.description}`,
        prompt: paramConfig.prompt
      };
    }

    // Type-specific validation
    switch (paramConfig.type) {
      case 'jwt':
        return this.validateJWTToken(stringValue, context);
        
      case 'boolean':
        const transformedValue = paramConfig.transform ? 
          paramConfig.transform(stringValue) : 
          ['true', 'yes', 'y', '1'].includes(stringValue.toLowerCase());
        
        return {
          isValid: true,
          value: transformedValue,
          transformed: true,
          message: `${paramName} set to ${transformedValue}`
        };

      case 'enum':
        const normalizedValue = stringValue.toLowerCase();
        const validOption = paramConfig.options.find(opt => 
          opt.toLowerCase() === normalizedValue
        );
        
        if (!validOption) {
          return {
            isValid: false,
            error: 'invalid_option',
            message: `Invalid option for ${paramName}. Valid options: ${paramConfig.options.join(', ')}`,
            prompt: paramConfig.prompt
          };
        }
        
        return {
          isValid: true,
          value: validOption,
          message: `${paramName} set to ${validOption}`
        };

      default:
        return {
          isValid: true,
          value: stringValue,
          message: `${paramName} validated successfully`
        };
    }
  }

  /**
   * Validate JWT token specifically for Maybank
   * @param {string} token - JWT token
   * @param {Object} context - Validation context
   * @returns {Object} JWT validation result
   */
  validateJWTToken(token, context) {
    // Basic JWT structure validation
    const parts = token.split('.');
    if (parts.length !== 3) {
      return {
        isValid: false,
        error: 'invalid_jwt_structure',
        message: 'JWT token must have 3 parts separated by dots',
        prompt: 'Please provide a valid Maybank JWT token'
      };
    }

    // Validate each part is base64 encoded
    try {
      for (let i = 0; i < 3; i++) {
        // Attempt to decode each part
        const decoded = atob(parts[i].replace(/-/g, '+').replace(/_/g, '/'));
        if (i < 2) {
          // Header and payload should be valid JSON
          JSON.parse(decoded);
        }
      }
    } catch (e) {
      return {
        isValid: false,
        error: 'invalid_jwt_encoding',
        message: 'JWT token contains invalid base64 encoding',
        prompt: 'Please provide a valid Maybank JWT token'
      };
    }

    return {
      isValid: true,
      value: token,
      sensitive: true,
      message: 'Maybank JWT token validated successfully',
      securityNote: 'Token will be handled securely and not logged'
    };
  }

  /**
   * Check if parameter is recommended for workflow
   * @param {string} paramName - Parameter name
   * @param {string} workflowName - Workflow name
   * @returns {boolean} Whether parameter is recommended
   */
  isParameterRecommended(paramName, workflowName) {
    const recommendations = {
      'maybank_financial_overview': ['includeDetails', 'includeRecommendations'],
      'maybank_mae_focus': ['includeRecommendations', 'period'],
      'maybank_account_comparison': ['comparisonType', 'includeRecommendations'],
      'maybank_quick_balance': [], // Quick balance doesn't need recommendations
      'maybank_health_check': ['healthMetrics', 'recommendationLevel', 'includeRecommendations']
    };

    return recommendations[workflowName]?.includes(paramName) || false;
  }

  /**
   * Check if parameter enhances results
   * @param {string} paramName - Parameter name
   * @param {string} workflowName - Workflow name
   * @returns {boolean} Whether parameter enhances results
   */
  parameterEnhancesResults(paramName, workflowName) {
    const enhancements = {
      'includeDetails': true,
      'includeRecommendations': true,
      'analysisType': true,
      'healthMetrics': true,
      'recommendationLevel': true,
      'comparisonType': true,
      'period': false // Time period doesn't necessarily enhance, just changes scope
    };

    return enhancements[paramName] || false;
  }

  /**
   * Get workflow-specific context for parameters
   * @param {string} workflowName - Workflow name
   * @returns {Object} Workflow context
   */
  getWorkflowContext(workflowName) {
    const contexts = {
      'maybank_financial_overview': {
        description: 'Complete financial overview combining all Maybank account data',
        parameterContext: {
          'includeDetails': 'Provides comprehensive analysis of account relationships and spending patterns',
          'analysisType': 'Determines depth of financial insights provided',
          'includeRecommendations': 'Adds personalized financial advice based on your account data'
        }
      },
      'maybank_mae_focus': {
        description: 'Detailed analysis focused on your MAE Wallet',
        parameterContext: {
          'period': 'Time frame for analyzing MAE wallet usage patterns',
          'includeRecommendations': 'Provides MAE-specific usage optimization suggestions'
        }
      },
      'maybank_account_comparison': {
        description: 'Comparative analysis of all your Maybank accounts',
        parameterContext: {
          'comparisonType': 'Determines how accounts are compared (balance distribution, activity levels, etc.)',
          'includeRecommendations': 'Provides account optimization and consolidation advice'
        }
      },
      'maybank_health_check': {
        description: 'Comprehensive financial health assessment',
        parameterContext: {
          'healthMetrics': 'Level of financial health analysis performed',
          'recommendationLevel': 'Detail level of improvement recommendations',
          'includeRecommendations': 'Whether to include actionable financial health advice'
        }
      }
    };

    return contexts[workflowName] || { parameterContext: {} };
  }

  /**
   * Generate unique session ID for interactive collection
   * @returns {string} Session ID
   */
  generateSessionId() {
    return `maybank_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get collector statistics
   * @returns {Object} Collector statistics
   */
  getStats() {
    return {
      initialized: this.initialized,
      supportedParameters: Object.keys(this.maybankParameterTypes).length,
      supportedOperations: Object.keys(this.maybankOperationMap).length,
      workflowsSupported: this.maybankWorkflows.getStats().totalWorkflows,
      features: {
        jwtValidation: true,
        interactiveCollection: true,
        contextualPrompts: true,
        workflowAware: true,
        secureParameterHandling: true,
        optionalParameterEnhancement: true
      }
    };
  }
}