import { logger } from '../utils/logger.js';
import { JWTManager } from '../authentication/jwt-manager.js';

/**
 * Validation Engine for Phase 4.1 Checkpoint 2
 * Provides comprehensive parameter validation and sanitization for banking operations
 * 
 * Features:
 * - Multi-layer validation (format, type, business rules)
 * - Banking-specific validation rules
 * - Input sanitization and normalization
 * - Security validation for sensitive parameters
 * - Context-aware validation based on operation type
 */
export class ValidationEngine {
  constructor() {
    this.jwtManager = new JWTManager();
    
    // Validation rules for different parameter types
    this.validationRules = {
      // JWT Token validation
      jwtToken: {
        required: true,
        type: 'jwt',
        sensitive: true,
        validators: [
          this.validateJWTStructure.bind(this),
          this.validateJWTContent.bind(this),
          this.validateJWTBankingScopes.bind(this)
        ],
        sanitizers: [
          this.sanitizeJWT.bind(this)
        ]
      },

      // Account ID validation
      accountId: {
        required: true,
        type: 'string',
        sensitive: false,
        pattern: /^[A-Za-z0-9]{8,16}$/,
        validators: [
          this.validateAccountIdFormat.bind(this),
          this.validateAccountIdBusinessRules.bind(this)
        ],
        sanitizers: [
          this.sanitizeAccountId.bind(this)
        ]
      },

      // Transaction ID validation
      transactionId: {
        required: true,
        type: 'string',
        sensitive: false,
        pattern: /^[A-Za-z0-9]{12,24}$/,
        validators: [
          this.validateTransactionIdFormat.bind(this)
        ],
        sanitizers: [
          this.sanitizeTransactionId.bind(this)
        ]
      },

      // Transfer amount validation
      amount: {
        required: true,
        type: 'number',
        sensitive: false,
        min: 0.01,
        max: 50000.00,
        precision: 2,
        validators: [
          this.validateAmountFormat.bind(this),
          this.validateAmountLimits.bind(this),
          this.validateAmountBusinessRules.bind(this)
        ],
        sanitizers: [
          this.sanitizeAmount.bind(this)
        ]
      },

      // Date validation
      startDate: {
        required: false,
        type: 'date',
        sensitive: false,
        validators: [
          this.validateDateFormat.bind(this),
          this.validateDateRange.bind(this)
        ],
        sanitizers: [
          this.sanitizeDate.bind(this)
        ]
      },

      endDate: {
        required: false,
        type: 'date',
        sensitive: false,
        validators: [
          this.validateDateFormat.bind(this),
          this.validateDateRange.bind(this)
        ],
        sanitizers: [
          this.sanitizeDate.bind(this)
        ]
      },

      // Currency validation
      currency: {
        required: false,
        type: 'string',
        sensitive: false,
        pattern: /^[A-Z]{3}$/,
        allowedValues: ['USD', 'EUR', 'GBP', 'CAD', 'JPY', 'AUD'],
        validators: [
          this.validateCurrencyCode.bind(this)
        ],
        sanitizers: [
          this.sanitizeCurrency.bind(this)
        ]
      },

      // Description validation
      description: {
        required: false,
        type: 'string',
        sensitive: false,
        maxLength: 200,
        validators: [
          this.validateDescriptionLength.bind(this),
          this.validateDescriptionContent.bind(this)
        ],
        sanitizers: [
          this.sanitizeDescription.bind(this)
        ]
      },

      // Boolean parameters
      includeBalances: {
        required: false,
        type: 'boolean',
        sensitive: false,
        validators: [
          this.validateBoolean.bind(this)
        ],
        sanitizers: [
          this.sanitizeBoolean.bind(this)
        ]
      },

      // Pagination parameters
      limit: {
        required: false,
        type: 'integer',
        sensitive: false,
        min: 1,
        max: 100,
        default: 50,
        validators: [
          this.validateInteger.bind(this),
          this.validateIntegerRange.bind(this)
        ],
        sanitizers: [
          this.sanitizeInteger.bind(this)
        ]
      },

      offset: {
        required: false,
        type: 'integer',
        sensitive: false,
        min: 0,
        max: 10000,
        default: 0,
        validators: [
          this.validateInteger.bind(this),
          this.validateIntegerRange.bind(this)
        ],
        sanitizers: [
          this.sanitizeInteger.bind(this)
        ]
      }
    };

    // Context-specific validation rules
    this.contextRules = {
      banking: {
        requiredFields: ['jwtToken'],
        securityLevel: 'high',
        auditRequired: true
      },
      
      transfer: {
        requiredFields: ['jwtToken', 'fromAccountId', 'toAccountId', 'amount'],
        businessRules: ['validateTransferEligibility'],
        securityLevel: 'critical',
        auditRequired: true
      },

      inquiry: {
        requiredFields: ['jwtToken'],
        securityLevel: 'medium',
        auditRequired: true
      }
    };

    this.initialized = true;
    logger.info('Validation Engine initialized for banking parameter validation');
  }

  /**
   * Validate a parameter with full validation pipeline
   * @param {string} parameter - Parameter name
   * @param {*} value - Parameter value
   * @param {string} context - Validation context (e.g., 'banking', 'transfer')
   * @param {Object} options - Additional validation options
   * @returns {Promise<Object>} Validation result
   */
  async validateParameter(parameter, value, context = 'banking', options = {}) {
    try {
      const rule = this.validationRules[parameter];
      
      if (!rule) {
        return {
          isValid: true,
          parameter: parameter,
          value: value,
          sanitizedValue: value,
          message: 'No specific validation rules - accepted as-is',
          warnings: ['No validation rules defined for this parameter']
        };
      }

      // Step 1: Basic validation (required, type, format)
      const basicValidation = await this.performBasicValidation(parameter, value, rule, context);
      if (!basicValidation.isValid) {
        return basicValidation;
      }

      // Step 2: Sanitization
      const sanitizedValue = await this.sanitizeValue(parameter, basicValidation.sanitizedValue || value, rule);

      // Step 3: Advanced validation (business rules, context-specific)
      const advancedValidation = await this.performAdvancedValidation(
        parameter, 
        sanitizedValue, 
        rule, 
        context, 
        options
      );
      
      if (!advancedValidation.isValid) {
        return {
          ...advancedValidation,
          sanitizedValue: sanitizedValue
        };
      }

      // Step 4: Context validation
      const contextValidation = await this.performContextValidation(
        parameter,
        sanitizedValue,
        context,
        options
      );

      if (!contextValidation.isValid) {
        return {
          ...contextValidation,
          sanitizedValue: sanitizedValue
        };
      }

      // All validations passed
      return {
        isValid: true,
        parameter: parameter,
        value: value,
        sanitizedValue: sanitizedValue,
        type: rule.type,
        sensitive: rule.sensitive || false,
        message: 'Parameter validation passed',
        validationSteps: [
          'basic_validation',
          'sanitization',
          'advanced_validation',
          'context_validation'
        ]
      };

    } catch (error) {
      logger.error('Parameter validation error', { 
        parameter: parameter, 
        error: error.message 
      });
      
      return {
        isValid: false,
        parameter: parameter,
        value: this.getSafeLogValue(parameter, value),
        error: 'validation_error',
        message: 'Internal validation error occurred',
        details: error.message
      };
    }
  }

  /**
   * Perform basic validation (required, type, format)
   * @param {string} parameter - Parameter name
   * @param {*} value - Parameter value
   * @param {Object} rule - Validation rule
   * @param {string} context - Context
   * @returns {Promise<Object>} Basic validation result
   */
  async performBasicValidation(parameter, value, rule, context) {
    // Check if required
    if (rule.required && (value === null || value === undefined || value === '')) {
      return {
        isValid: false,
        parameter: parameter,
        value: value,
        error: 'required',
        message: `${parameter} is required for ${context} operations`
      };
    }

    // If not required and empty, it's valid
    if (!rule.required && (value === null || value === undefined || value === '')) {
      return {
        isValid: true,
        parameter: parameter,
        value: value,
        sanitizedValue: value
      };
    }

    // Type validation
    const typeValidation = await this.validateType(parameter, value, rule.type);
    if (!typeValidation.isValid) {
      return typeValidation;
    }

    // Pattern validation
    if (rule.pattern) {
      const stringValue = String(value);
      if (!rule.pattern.test(stringValue)) {
        return {
          isValid: false,
          parameter: parameter,
          value: this.getSafeLogValue(parameter, value),
          error: 'pattern_mismatch',
          message: `${parameter} format is invalid`,
          expectedPattern: rule.pattern.toString()
        };
      }
    }

    return {
      isValid: true,
      parameter: parameter,
      value: value,
      sanitizedValue: value
    };
  }

  /**
   * Perform advanced validation using custom validators
   * @param {string} parameter - Parameter name
   * @param {*} value - Sanitized parameter value
   * @param {Object} rule - Validation rule
   * @param {string} context - Context
   * @param {Object} options - Options
   * @returns {Promise<Object>} Advanced validation result
   */
  async performAdvancedValidation(parameter, value, rule, context, options) {
    if (!rule.validators || rule.validators.length === 0) {
      return { isValid: true };
    }

    for (const validator of rule.validators) {
      const result = await validator(parameter, value, context, options);
      if (!result.isValid) {
        return result;
      }
    }

    return { isValid: true };
  }

  /**
   * Perform context-specific validation
   * @param {string} parameter - Parameter name
   * @param {*} value - Sanitized value
   * @param {string} context - Context
   * @param {Object} options - Options
   * @returns {Promise<Object>} Context validation result
   */
  async performContextValidation(parameter, value, context, options) {
    const contextRule = this.contextRules[context];
    
    if (!contextRule) {
      return { isValid: true };
    }

    // Check context-specific business rules
    if (contextRule.businessRules) {
      for (const businessRule of contextRule.businessRules) {
        const ruleMethod = this[businessRule];
        if (ruleMethod) {
          const result = await ruleMethod.call(this, parameter, value, options);
          if (!result.isValid) {
            return result;
          }
        }
      }
    }

    return { isValid: true };
  }

  /**
   * Sanitize parameter value
   * @param {string} parameter - Parameter name
   * @param {*} value - Parameter value
   * @param {Object} rule - Validation rule
   * @returns {Promise<*>} Sanitized value
   */
  async sanitizeValue(parameter, value, rule) {
    if (!rule.sanitizers || rule.sanitizers.length === 0) {
      return value;
    }

    let sanitizedValue = value;
    
    for (const sanitizer of rule.sanitizers) {
      sanitizedValue = await sanitizer(sanitizedValue);
    }

    return sanitizedValue;
  }

  /**
   * Validate parameter type
   * @param {string} parameter - Parameter name
   * @param {*} value - Parameter value
   * @param {string} expectedType - Expected type
   * @returns {Promise<Object>} Type validation result
   */
  async validateType(parameter, value, expectedType) {
    switch (expectedType) {
      case 'string':
        if (typeof value !== 'string') {
          return {
            isValid: false,
            parameter: parameter,
            value: value,
            error: 'invalid_type',
            message: `${parameter} must be a string`,
            expectedType: 'string',
            actualType: typeof value
          };
        }
        break;

      case 'number':
        const numValue = parseFloat(value);
        if (isNaN(numValue)) {
          return {
            isValid: false,
            parameter: parameter,
            value: value,
            error: 'invalid_number',
            message: `${parameter} must be a valid number`
          };
        }
        break;

      case 'integer':
        const intValue = parseInt(value);
        if (isNaN(intValue) || intValue !== parseFloat(value)) {
          return {
            isValid: false,
            parameter: parameter,
            value: value,
            error: 'invalid_integer',
            message: `${parameter} must be a valid integer`
          };
        }
        break;

      case 'boolean':
        if (typeof value !== 'boolean' && value !== 'true' && value !== 'false' && value !== '1' && value !== '0') {
          return {
            isValid: false,
            parameter: parameter,
            value: value,
            error: 'invalid_boolean',
            message: `${parameter} must be a boolean value`
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
            message: `${parameter} must be a valid date`
          };
        }
        break;

      case 'jwt':
        // JWT validation is handled by specific validators
        break;
    }

    return { isValid: true };
  }

  // ===== SPECIFIC VALIDATORS =====

  /**
   * Validate JWT structure
   */
  async validateJWTStructure(parameter, value, context, options) {
    if (typeof value !== 'string') {
      return {
        isValid: false,
        parameter: parameter,
        value: '[REDACTED]',
        error: 'invalid_jwt_type',
        message: 'JWT token must be a string'
      };
    }

    const parts = value.split('.');
    if (parts.length !== 3) {
      return {
        isValid: false,
        parameter: parameter,
        value: '[REDACTED]',
        error: 'invalid_jwt_structure',
        message: 'JWT token must have exactly 3 parts separated by dots'
      };
    }

    return { isValid: true };
  }

  /**
   * Validate JWT content using JWT Manager
   */
  async validateJWTContent(parameter, value, context, options) {
    const validation = await this.jwtManager.validateToken(value);
    
    if (!validation.isValid) {
      return {
        isValid: false,
        parameter: parameter,
        value: '[REDACTED]',
        error: validation.reason || 'invalid_jwt',
        message: validation.message || 'JWT token validation failed'
      };
    }

    return { isValid: true };
  }

  /**
   * Validate JWT banking scopes
   */
  async validateJWTBankingScopes(parameter, value, context, options) {
    const validation = await this.jwtManager.validateToken(value);
    
    if (!validation.isValid) {
      return { isValid: false }; // Already handled by validateJWTContent
    }

    const requiredScopes = ['banking:read', 'accounts:read'];
    const tokenScopes = validation.scopes || [];

    const hasRequiredScopes = requiredScopes.some(required =>
      tokenScopes.some(scope => scope.includes(required) || scope === 'banking:*')
    );

    if (!hasRequiredScopes) {
      return {
        isValid: false,
        parameter: parameter,
        value: '[REDACTED]',
        error: 'insufficient_scope',
        message: 'JWT token lacks required banking permissions',
        requiredScopes: requiredScopes,
        tokenScopes: tokenScopes
      };
    }

    return { isValid: true };
  }

  /**
   * Validate account ID format
   */
  async validateAccountIdFormat(parameter, value, context, options) {
    const pattern = /^[A-Za-z0-9]{8,16}$/;
    
    if (!pattern.test(value)) {
      return {
        isValid: false,
        parameter: parameter,
        value: value,
        error: 'invalid_account_id_format',
        message: 'Account ID must be 8-16 alphanumeric characters'
      };
    }

    return { isValid: true };
  }

  /**
   * Validate account ID business rules
   */
  async validateAccountIdBusinessRules(parameter, value, context, options) {
    // Check for reserved account IDs
    const reservedIds = ['00000000', '99999999', 'TEST1234'];
    
    if (reservedIds.includes(value.toUpperCase())) {
      return {
        isValid: false,
        parameter: parameter,
        value: value,
        error: 'reserved_account_id',
        message: 'This account ID is reserved and cannot be used'
      };
    }

    return { isValid: true };
  }

  /**
   * Validate transaction ID format
   */
  async validateTransactionIdFormat(parameter, value, context, options) {
    const pattern = /^[A-Za-z0-9]{12,24}$/;
    
    if (!pattern.test(value)) {
      return {
        isValid: false,
        parameter: parameter,
        value: value,
        error: 'invalid_transaction_id_format',
        message: 'Transaction ID must be 12-24 alphanumeric characters'
      };
    }

    return { isValid: true };
  }

  /**
   * Validate amount format
   */
  async validateAmountFormat(parameter, value, context, options) {
    const numValue = parseFloat(value);
    
    if (isNaN(numValue)) {
      return {
        isValid: false,
        parameter: parameter,
        value: value,
        error: 'invalid_amount_format',
        message: 'Amount must be a valid number'
      };
    }

    // Check decimal places
    const decimalPlaces = (value.toString().split('.')[1] || '').length;
    if (decimalPlaces > 2) {
      return {
        isValid: false,
        parameter: parameter,
        value: value,
        error: 'too_many_decimal_places',
        message: 'Amount cannot have more than 2 decimal places'
      };
    }

    return { isValid: true };
  }

  /**
   * Validate amount limits
   */
  async validateAmountLimits(parameter, value, context, options) {
    const numValue = parseFloat(value);
    const rule = this.validationRules[parameter];

    if (numValue < rule.min) {
      return {
        isValid: false,
        parameter: parameter,
        value: value,
        error: 'amount_too_low',
        message: `Amount must be at least $${rule.min}`,
        minAmount: rule.min
      };
    }

    if (numValue > rule.max) {
      return {
        isValid: false,
        parameter: parameter,
        value: value,
        error: 'amount_too_high',
        message: `Amount cannot exceed $${rule.max}`,
        maxAmount: rule.max
      };
    }

    return { isValid: true };
  }

  /**
   * Validate amount business rules
   */
  async validateAmountBusinessRules(parameter, value, context, options) {
    const numValue = parseFloat(value);

    // Suspicious amount patterns
    if (numValue === 0.01) {
      return {
        isValid: true,
        parameter: parameter,
        value: value,
        warnings: ['Very small amount detected - please confirm this is correct']
      };
    }

    // Round number validation for large amounts
    if (numValue >= 10000 && numValue % 1000 === 0) {
      return {
        isValid: true,
        parameter: parameter,
        value: value,
        warnings: ['Large round amount detected - please confirm this is correct']
      };
    }

    return { isValid: true };
  }

  /**
   * Validate date format and range
   */
  async validateDateFormat(parameter, value, context, options) {
    const datePattern = /^\d{4}-\d{2}-\d{2}$/;
    
    if (!datePattern.test(value)) {
      return {
        isValid: false,
        parameter: parameter,
        value: value,
        error: 'invalid_date_format',
        message: 'Date must be in YYYY-MM-DD format'
      };
    }

    return { isValid: true };
  }

  /**
   * Validate date range
   */
  async validateDateRange(parameter, value, context, options) {
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

    return { isValid: true };
  }

  /**
   * Validate currency code
   */
  async validateCurrencyCode(parameter, value, context, options) {
    const rule = this.validationRules[parameter];
    
    if (rule.allowedValues && !rule.allowedValues.includes(value.toUpperCase())) {
      return {
        isValid: false,
        parameter: parameter,
        value: value,
        error: 'unsupported_currency',
        message: 'Unsupported currency code',
        allowedValues: rule.allowedValues
      };
    }

    return { isValid: true };
  }

  /**
   * Validate description length and content
   */
  async validateDescriptionLength(parameter, value, context, options) {
    const rule = this.validationRules[parameter];
    
    if (value.length > rule.maxLength) {
      return {
        isValid: false,
        parameter: parameter,
        value: value,
        error: 'description_too_long',
        message: `Description cannot exceed ${rule.maxLength} characters`,
        maxLength: rule.maxLength,
        currentLength: value.length
      };
    }

    return { isValid: true };
  }

  /**
   * Validate description content
   */
  async validateDescriptionContent(parameter, value, context, options) {
    // Check for potentially harmful content
    const suspiciousPatterns = [
      /<script/i,
      /javascript:/i,
      /vbscript:/i,
      /onload=/i,
      /onclick=/i
    ];

    for (const pattern of suspiciousPatterns) {
      if (pattern.test(value)) {
        return {
          isValid: false,
          parameter: parameter,
          value: value,
          error: 'suspicious_content',
          message: 'Description contains potentially harmful content'
        };
      }
    }

    return { isValid: true };
  }

  /**
   * Validate boolean values
   */
  async validateBoolean(parameter, value, context, options) {
    // Boolean validation is handled in type validation
    return { isValid: true };
  }

  /**
   * Validate integer values
   */
  async validateInteger(parameter, value, context, options) {
    // Integer validation is handled in type validation
    return { isValid: true };
  }

  /**
   * Validate integer range
   */
  async validateIntegerRange(parameter, value, context, options) {
    const intValue = parseInt(value);
    const rule = this.validationRules[parameter];

    if (rule.min !== undefined && intValue < rule.min) {
      return {
        isValid: false,
        parameter: parameter,
        value: value,
        error: 'integer_too_low',
        message: `${parameter} must be at least ${rule.min}`,
        minValue: rule.min
      };
    }

    if (rule.max !== undefined && intValue > rule.max) {
      return {
        isValid: false,
        parameter: parameter,
        value: value,
        error: 'integer_too_high',
        message: `${parameter} cannot exceed ${rule.max}`,
        maxValue: rule.max
      };
    }

    return { isValid: true };
  }

  // ===== SANITIZERS =====

  /**
   * Sanitize JWT token
   */
  async sanitizeJWT(value) {
    return String(value).trim();
  }

  /**
   * Sanitize account ID
   */
  async sanitizeAccountId(value) {
    return String(value).trim().toUpperCase();
  }

  /**
   * Sanitize transaction ID
   */
  async sanitizeTransactionId(value) {
    return String(value).trim().toUpperCase();
  }

  /**
   * Sanitize amount
   */
  async sanitizeAmount(value) {
    const numValue = parseFloat(value);
    return Math.round(numValue * 100) / 100; // Round to 2 decimal places
  }

  /**
   * Sanitize date
   */
  async sanitizeDate(value) {
    const date = new Date(value);
    return date.toISOString().split('T')[0]; // Return YYYY-MM-DD format
  }

  /**
   * Sanitize currency
   */
  async sanitizeCurrency(value) {
    return String(value).trim().toUpperCase();
  }

  /**
   * Sanitize description
   */
  async sanitizeDescription(value) {
    return String(value).trim();
  }

  /**
   * Sanitize boolean
   */
  async sanitizeBoolean(value) {
    if (typeof value === 'boolean') return value;
    if (value === 'true' || value === '1') return true;
    if (value === 'false' || value === '0') return false;
    return Boolean(value);
  }

  /**
   * Sanitize integer
   */
  async sanitizeInteger(value) {
    return parseInt(value);
  }

  // ===== BUSINESS RULE VALIDATORS =====

  /**
   * Validate transfer eligibility
   */
  async validateTransferEligibility(parameter, value, options) {
    // This would normally check against business rules
    // For now, return valid
    return { isValid: true };
  }

  // ===== UTILITY METHODS =====

  /**
   * Get safe log value (hide sensitive data)
   */
  getSafeLogValue(parameter, value) {
    const sensitiveParams = ['jwtToken', 'token', 'password', 'pin'];
    
    if (sensitiveParams.includes(parameter)) {
      return '[REDACTED]';
    }

    return value;
  }

  /**
   * Get validation engine statistics
   */
  getStats() {
    return {
      initialized: this.initialized,
      validationRules: Object.keys(this.validationRules).length,
      contextRules: Object.keys(this.contextRules).length,
      totalValidators: Object.values(this.validationRules)
        .reduce((total, rule) => total + (rule.validators?.length || 0), 0),
      totalSanitizers: Object.values(this.validationRules)
        .reduce((total, rule) => total + (rule.sanitizers?.length || 0), 0),
      features: {
        multiLayerValidation: true,
        bankingSpecificRules: true,
        contextAwareValidation: true,
        inputSanitization: true,
        businessRuleValidation: true
      }
    };
  }
}