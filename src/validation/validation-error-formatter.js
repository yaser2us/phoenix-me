import { logger } from '../utils/logger.js';

/**
 * Validation Error Formatter - Formats validation errors into user-friendly prompts
 * Generates intelligent suggestions based on schema constraints
 */
export class ValidationErrorFormatter {
  constructor() {
    this.logger = logger;
    
    // Common field descriptions for better UX
    this.fieldDescriptions = {
      payeeCode: 'The biller/merchant code',
      billAcctNo: 'Your account number with the biller',
      amount: 'The payment amount',
      currency: 'The currency for the transaction',
      fromCurrency: 'The currency to convert from',
      toCurrency: 'The currency to convert to',
      accountNumber: 'Your bank account number',
      email: 'Your email address',
      phone: 'Your phone number',
      fullName: 'Full name as registered',
      shortName: 'Display name or nickname'
    };
    
    // Known payee codes for suggestions
    this.knownPayeeCodes = {
      '1111': 'Tenaga Nasional Berhad (TNB)',
      '2222': 'Air Selangor',
      '3333': 'Indah Water (IWK)',
      '4444': 'Telekom Malaysia (TM)',
      '5555': 'Astro',
      '6666': 'SYABAS Water',
      '7777': 'Digi Postpaid',
      '8888': 'Maxis Postpaid',
      '9999': 'Celcom Postpaid'
    };
  }

  /**
   * Formats validation results into interactive prompts
   * @param {Object} validationResult - The validation result from RequestBodyValidator
   * @param {Object} schema - The OpenAPI schema for context
   * @returns {Array} Array of formatted prompts for missing/invalid fields
   */
  formatValidationPrompts(validationResult, schema) {
    const prompts = [];
    
    // Handle missing fields
    if (validationResult.missingFields && validationResult.missingFields.length > 0) {
      for (const fieldPath of validationResult.missingFields) {
        const prompt = this.createPromptForMissingField(fieldPath, schema);
        if (prompt) prompts.push(prompt);
      }
    }
    
    // Handle invalid fields
    if (validationResult.invalidFields && validationResult.invalidFields.length > 0) {
      for (const invalidField of validationResult.invalidFields) {
        const prompt = this.createPromptForInvalidField(invalidField, schema);
        if (prompt) prompts.push(prompt);
      }
    }
    
    return prompts;
  }

  /**
   * Creates a prompt for a missing required field
   * @private
   */
  createPromptForMissingField(fieldPath, schema) {
    const fieldSchema = this.getFieldSchema(fieldPath, schema);
    const fieldName = this.getFieldName(fieldPath);
    
    const prompt = {
      fieldPath: fieldPath,
      fieldName: fieldName,
      type: 'missing',
      dataType: fieldSchema?.type || 'string',
      message: this.generateMissingFieldMessage(fieldName, fieldSchema),
      suggestions: this.generateFieldSuggestions(fieldName, fieldSchema),
      validation: this.extractValidationRules(fieldSchema),
      required: true
    };
    
    // Add schema details for validation
    if (fieldSchema) {
      prompt.schema = fieldSchema;
    }
    
    return prompt;
  }

  /**
   * Creates a prompt for an invalid field
   * @private
   */
  createPromptForInvalidField(invalidField, schema) {
    const fieldSchema = this.getFieldSchema(invalidField.path, schema);
    const fieldName = this.getFieldName(invalidField.path);
    
    const prompt = {
      fieldPath: invalidField.path,
      fieldName: fieldName,
      type: 'invalid',
      dataType: fieldSchema?.type || 'string',
      message: this.generateInvalidFieldMessage(fieldName, invalidField.error, fieldSchema),
      suggestions: this.generateFieldSuggestions(fieldName, fieldSchema),
      validation: this.extractValidationRules(fieldSchema),
      currentValue: invalidField.value,
      error: invalidField.error
    };
    
    return prompt;
  }

  /**
   * Generates a user-friendly message for missing fields
   * @private
   */
  generateMissingFieldMessage(fieldName, fieldSchema) {
    // Check for custom description
    const description = this.fieldDescriptions[fieldName] || fieldSchema?.description;
    
    let message = `💡 **${this.formatFieldLabel(fieldName)}**: `;
    
    if (description) {
      message += description;
    } else {
      message += `Please provide ${this.formatFieldLabel(fieldName)}`;
    }
    
    // Add type hint
    if (fieldSchema) {
      if (fieldSchema.type === 'number' || fieldSchema.type === 'integer') {
        message += ' (number)';
      } else if (fieldSchema.enum) {
        message += ` (choose one)`;
      } else if (fieldSchema.pattern) {
        message += ' (specific format required)';
      }
    }
    
    return message;
  }

  /**
   * Generates a user-friendly message for invalid fields
   * @private
   */
  generateInvalidFieldMessage(fieldName, error, fieldSchema) {
    let message = `❌ **${this.formatFieldLabel(fieldName)}**: `;
    
    // Make error messages more user-friendly
    if (error.includes('pattern')) {
      message += this.formatPatternError(fieldName, fieldSchema);
    } else if (error.includes('enum')) {
      message += 'Please choose from the available options';
    } else if (error.includes('minimum') || error.includes('maximum')) {
      message += this.formatRangeError(error, fieldSchema);
    } else if (error.includes('type')) {
      message += this.formatTypeError(error, fieldSchema);
    } else {
      message += error;
    }
    
    return message;
  }

  /**
   * Generates intelligent suggestions based on field name and schema
   * @private
   */
  generateFieldSuggestions(fieldName, fieldSchema) {
    const suggestions = [];
    
    // Enum values
    if (fieldSchema?.enum) {
      return fieldSchema.enum;
    }
    
    // Known field suggestions
    switch (fieldName.toLowerCase()) {
      case 'payeecode':
        return Object.entries(this.knownPayeeCodes).map(([code, name]) => ({
          value: code,
          label: `${code} - ${name}`
        }));
        
      case 'currency':
      case 'fromcurrency':
      case 'tocurrency':
        return ['MYR', 'USD', 'SGD', 'EUR', 'GBP', 'THB', 'IDR'];
        
      case 'amount':
        return ['10', '50', '100', '500', '1000'];
        
      case 'units':
        return [
          { value: 'metric', label: 'Celsius (°C)' },
          { value: 'imperial', label: 'Fahrenheit (°F)' },
          { value: 'standard', label: 'Kelvin (K)' }
        ];
        
      case 'country':
        return ['Malaysia', 'Singapore', 'Thailand', 'Indonesia', 'Philippines'];
        
      case 'isfirstload':
      case 'isFirstLoad':
        return ['true', 'false'];
        
      default:
        // Generate based on examples
        if (fieldSchema?.example) {
          suggestions.push(fieldSchema.example);
        }
        if (fieldSchema?.examples) {
          suggestions.push(...fieldSchema.examples);
        }
    }
    
    return suggestions;
  }

  /**
   * Extracts validation rules from schema for display
   * @private
   */
  extractValidationRules(fieldSchema) {
    if (!fieldSchema) return {};
    
    const rules = {};
    
    if (fieldSchema.minLength) rules.minLength = fieldSchema.minLength;
    if (fieldSchema.maxLength) rules.maxLength = fieldSchema.maxLength;
    if (fieldSchema.minimum !== undefined) rules.minimum = fieldSchema.minimum;
    if (fieldSchema.maximum !== undefined) rules.maximum = fieldSchema.maximum;
    if (fieldSchema.pattern) rules.pattern = fieldSchema.pattern;
    if (fieldSchema.enum) rules.enum = fieldSchema.enum;
    if (fieldSchema.type) rules.type = fieldSchema.type;
    
    return rules;
  }

  /**
   * Gets the field schema from a path
   * @private
   */
  getFieldSchema(fieldPath, schema) {
    if (!schema || !fieldPath) return null;
    
    const parts = fieldPath.split('.');
    let current = schema;
    
    for (const part of parts) {
      if (current.properties && current.properties[part]) {
        current = current.properties[part];
      } else if (current.items) {
        // Handle array items
        current = current.items;
      } else {
        return null;
      }
    }
    
    return current;
  }

  /**
   * Gets the field name from a path
   * @private
   */
  getFieldName(fieldPath) {
    const parts = fieldPath.split('.');
    return parts[parts.length - 1];
  }

  /**
   * Formats a field name into a user-friendly label
   * @private
   */
  formatFieldLabel(fieldName) {
    // Handle camelCase and snake_case
    return fieldName
      .replace(/([A-Z])/g, ' $1')
      .replace(/_/g, ' ')
      .replace(/\b\w/g, l => l.toUpperCase())
      .trim();
  }

  /**
   * Formats pattern errors
   * @private
   */
  formatPatternError(fieldName, fieldSchema) {
    const pattern = fieldSchema?.pattern;
    
    if (fieldName.toLowerCase() === 'payeecode' && pattern === '^[0-9]{4}$') {
      return 'Must be a 4-digit code (e.g., 1111)';
    } else if (fieldName.toLowerCase() === 'email') {
      return 'Must be a valid email address';
    } else if (fieldName.toLowerCase() === 'phone') {
      return 'Must be a valid phone number';
    } else if (pattern) {
      return `Must match pattern: ${pattern}`;
    }
    
    return 'Invalid format';
  }

  /**
   * Formats range errors
   * @private
   */
  formatRangeError(error, fieldSchema) {
    if (error.includes('minimum')) {
      return `Must be at least ${fieldSchema.minimum}`;
    } else if (error.includes('maximum')) {
      return `Must be at most ${fieldSchema.maximum}`;
    }
    return error;
  }

  /**
   * Formats type errors
   * @private
   */
  formatTypeError(error, fieldSchema) {
    const type = fieldSchema?.type;
    
    if (type === 'number' || type === 'integer') {
      return 'Must be a number';
    } else if (type === 'boolean') {
      return 'Must be true or false';
    } else if (type === 'array') {
      return 'Must be a list of values';
    }
    
    return error;
  }

  /**
   * Formats all prompts into a single conversational message
   * @param {Array} prompts - Array of prompts
   * @returns {String} Formatted message for user
   */
  formatConversationalMessage(prompts) {
    if (prompts.length === 0) return '';
    
    let message = '';
    
    // Group by type
    const missingPrompts = prompts.filter(p => p.type === 'missing');
    const invalidPrompts = prompts.filter(p => p.type === 'invalid');
    
    if (missingPrompts.length > 0) {
      message += 'I need some information to proceed:\n\n';
      
      for (const prompt of missingPrompts) {
        message += `${prompt.message}\n`;
        
        if (prompt.suggestions.length > 0) {
          const suggestions = Array.isArray(prompt.suggestions[0]) && prompt.suggestions[0].label
            ? prompt.suggestions.map(s => s.label).slice(0, 3).join(', ')
            : prompt.suggestions.slice(0, 3).join(', ');
          
          message += `   Suggestions: ${suggestions}\n`;
        }
        
        message += '\n';
      }
    }
    
    if (invalidPrompts.length > 0) {
      message += 'Some values need to be corrected:\n\n';
      
      for (const prompt of invalidPrompts) {
        message += `${prompt.message}\n`;
        
        if (prompt.suggestions.length > 0) {
          message += `   Options: ${prompt.suggestions.slice(0, 3).join(', ')}\n`;
        }
        
        message += '\n';
      }
    }
    
    // Add instruction
    if (missingPrompts.length === 1) {
      message += `Please provide the ${missingPrompts[0].fieldName}:`;
    } else if (missingPrompts.length > 1) {
      message += `Let's start with the ${missingPrompts[0].fieldName}:`;
    }
    
    return message;
  }
}