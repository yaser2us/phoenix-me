import { logger } from '../utils/logger.js';
import { RequestBodyValidator } from '../validation/request-body-validator.js';
import { ValidationErrorFormatter } from '../validation/validation-error-formatter.js';

/**
 * Interactive Parameter Collector - Enhanced version with body field support
 * Collects missing parameters and body fields through conversational interaction
 */
export class InteractiveParameterCollector {
  constructor() {
    this.logger = logger;
    this.bodyValidator = new RequestBodyValidator();
    this.errorFormatter = new ValidationErrorFormatter();
    
    // Track collection state
    this.activeCollections = new Map();
  }

  /**
   * Collects missing parameters and body fields interactively
   * @param {Object} operation - The API operation specification
   * @param {Object} currentData - Current user-provided data
   * @param {Object} validationResult - Validation result with missing fields
   * @param {Object} components - OpenAPI components for schema resolution
   * @returns {Object} Collection result with prompts or collected data
   */
  async collectMissingData(operation, currentData, validationResult, components = {}) {
    try {
      const collectionId = this.generateCollectionId();
      
      // Initialize collection state
      const collectionState = {
        id: collectionId,
        operation: operation,
        currentData: { ...currentData },
        remainingFields: [...(validationResult.missingFields || [])],
        collectedFields: {},
        currentField: null,
        prompts: [],
        attempts: {}
      };
      
      this.activeCollections.set(collectionId, collectionState);
      
      // Generate prompts for all missing fields
      const schema = this.extractOperationSchema(operation, components);
      const prompts = this.errorFormatter.formatValidationPrompts(validationResult, schema);
      
      if (prompts.length === 0) {
        return {
          success: true,
          complete: true,
          data: currentData
        };
      }
      
      // Start with the first field
      collectionState.prompts = prompts;
      collectionState.currentField = prompts[0];
      
      // Generate conversational message
      const message = this.errorFormatter.formatConversationalMessage(prompts);
      
      return {
        success: true,
        complete: false,
        collectionId: collectionId,
        needsInput: true,
        currentField: prompts[0].fieldPath,
        message: message,
        prompts: prompts,
        totalFields: prompts.length,
        collectedCount: 0
      };
      
    } catch (error) {
      this.logger.error('Failed to initialize collection:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Processes user input for a field being collected
   * @param {String} collectionId - The collection session ID
   * @param {String} userInput - User's response
   * @returns {Object} Result with next prompt or completion status
   */
  async processUserInput(collectionId, userInput) {
    const collectionState = this.activeCollections.get(collectionId);
    
    if (!collectionState) {
      return {
        success: false,
        error: 'Collection session not found or expired'
      };
    }
    
    try {
      const currentPrompt = collectionState.currentField;
      
      // Validate the user input against the field schema
      const validationResult = await this.validateFieldInput(
        userInput,
        currentPrompt,
        collectionState.operation
      );
      
      if (validationResult.valid) {
        // Store the collected value
        this.setFieldValue(
          collectionState.currentData,
          currentPrompt.fieldPath,
          validationResult.value
        );
        
        collectionState.collectedFields[currentPrompt.fieldPath] = validationResult.value;
        
        // Move to next field
        const nextPromptIndex = collectionState.prompts.indexOf(currentPrompt) + 1;
        
        if (nextPromptIndex < collectionState.prompts.length) {
          // More fields to collect
          const nextPrompt = collectionState.prompts[nextPromptIndex];
          collectionState.currentField = nextPrompt;
          
          return {
            success: true,
            complete: false,
            needsInput: true,
            currentField: nextPrompt.fieldPath,
            message: this.generateFieldPrompt(nextPrompt),
            progress: {
              collected: nextPromptIndex,
              total: collectionState.prompts.length,
              percentage: Math.round((nextPromptIndex / collectionState.prompts.length) * 100)
            }
          };
        } else {
          // All fields collected
          this.activeCollections.delete(collectionId);
          
          return {
            success: true,
            complete: true,
            data: collectionState.currentData,
            message: '✅ All information collected successfully!'
          };
        }
      } else {
        // Validation failed
        collectionState.attempts[currentPrompt.fieldPath] = 
          (collectionState.attempts[currentPrompt.fieldPath] || 0) + 1;
        
        // Generate retry message
        const retryMessage = this.generateRetryMessage(
          currentPrompt,
          validationResult,
          collectionState.attempts[currentPrompt.fieldPath]
        );
        
        return {
          success: true,
          complete: false,
          needsInput: true,
          currentField: currentPrompt.fieldPath,
          message: retryMessage,
          error: validationResult.error,
          attempts: collectionState.attempts[currentPrompt.fieldPath]
        };
      }
      
    } catch (error) {
      this.logger.error('Failed to process user input:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Validates user input against field schema
   * @private
   */
  async validateFieldInput(userInput, prompt, operation) {
    try {
      const value = this.parseUserInput(userInput, prompt);
      
      // Check against validation rules
      if (prompt.validation) {
        // Type validation
        if (prompt.validation.type) {
          const typeValid = this.validateType(value, prompt.validation.type);
          if (!typeValid) {
            return {
              valid: false,
              error: `Must be a ${prompt.validation.type}`
            };
          }
        }
        
        // Enum validation
        if (prompt.validation.enum && !prompt.validation.enum.includes(value)) {
          return {
            valid: false,
            error: `Must be one of: ${prompt.validation.enum.join(', ')}`
          };
        }
        
        // Pattern validation
        if (prompt.validation.pattern) {
          const regex = new RegExp(prompt.validation.pattern);
          if (!regex.test(value)) {
            return {
              valid: false,
              error: this.getPatternErrorMessage(prompt.fieldName, prompt.validation.pattern)
            };
          }
        }
        
        // Range validation
        if (prompt.validation.type === 'number' || prompt.validation.type === 'integer') {
          const numValue = Number(value);
          
          if (prompt.validation.minimum !== undefined && numValue < prompt.validation.minimum) {
            return {
              valid: false,
              error: `Must be at least ${prompt.validation.minimum}`
            };
          }
          
          if (prompt.validation.maximum !== undefined && numValue > prompt.validation.maximum) {
            return {
              valid: false,
              error: `Must be at most ${prompt.validation.maximum}`
            };
          }
        }
        
        // String length validation
        if (prompt.validation.type === 'string') {
          if (prompt.validation.minLength && value.length < prompt.validation.minLength) {
            return {
              valid: false,
              error: `Must be at least ${prompt.validation.minLength} characters`
            };
          }
          
          if (prompt.validation.maxLength && value.length > prompt.validation.maxLength) {
            return {
              valid: false,
              error: `Must be at most ${prompt.validation.maxLength} characters`
            };
          }
        }
      }
      
      return {
        valid: true,
        value: value
      };
      
    } catch (error) {
      return {
        valid: false,
        error: error.message
      };
    }
  }

  /**
   * Parses user input based on expected type
   * @private
   */
  parseUserInput(userInput, prompt) {
    const trimmed = userInput.trim();
    
    switch (prompt.dataType) {
      case 'number':
      case 'integer':
        const num = Number(trimmed);
        if (isNaN(num)) {
          throw new Error('Invalid number format');
        }
        return prompt.dataType === 'integer' ? Math.floor(num) : num;
        
      case 'boolean':
        const lower = trimmed.toLowerCase();
        if (lower === 'true' || lower === 'yes' || lower === '1') return true;
        if (lower === 'false' || lower === 'no' || lower === '0') return false;
        throw new Error('Must be true or false');
        
      case 'array':
        // Try to parse JSON array
        if (trimmed.startsWith('[')) {
          try {
            return JSON.parse(trimmed);
          } catch (e) {
            throw new Error('Invalid array format');
          }
        }
        // Split comma-separated values
        return trimmed.split(',').map(v => v.trim());
        
      default:
        return trimmed;
    }
  }

  /**
   * Sets a field value in nested object structure
   * @private
   */
  setFieldValue(object, fieldPath, value) {
    const parts = fieldPath.split('.');
    let current = object;
    
    for (let i = 0; i < parts.length - 1; i++) {
      const part = parts[i];
      
      // Handle array indices
      if (part.includes('[')) {
        const [arrayName, indexStr] = part.split('[');
        const index = parseInt(indexStr.replace(']', ''));
        
        if (!current[arrayName]) {
          current[arrayName] = [];
        }
        
        if (!current[arrayName][index]) {
          current[arrayName][index] = {};
        }
        
        current = current[arrayName][index];
      } else {
        // Regular object property
        if (!current[part]) {
          current[part] = {};
        }
        current = current[part];
      }
    }
    
    // Set the final value
    const lastPart = parts[parts.length - 1];
    
    // Handle body parameters specially
    if (parts.length === 1 && !current.hasOwnProperty(lastPart)) {
      // Check if this should go in body
      if (this.isBodyParameter(lastPart)) {
        if (!object.body) object.body = {};
        object.body[lastPart] = value;
      } else {
        current[lastPart] = value;
      }
    } else {
      current[lastPart] = value;
    }
  }

  /**
   * Checks if a parameter should be in request body
   * @private
   */
  isBodyParameter(paramName) {
    // Parameters that typically go in request body
    const bodyParams = [
      'payeeCode', 'billAcctNo', 'amount', 'currency',
      'fullName', 'shortName', 'email', 'phone',
      'address', 'description', 'notes', 'items',
      'quantity', 'price', 'total'
    ];
    
    return bodyParams.includes(paramName);
  }

  /**
   * Generates a field-specific prompt
   * @private
   */
  generateFieldPrompt(prompt) {
    let message = prompt.message + '\n';
    
    if (prompt.suggestions && prompt.suggestions.length > 0) {
      if (typeof prompt.suggestions[0] === 'object' && prompt.suggestions[0].label) {
        const options = prompt.suggestions.map((s, i) => 
          `${i + 1}. ${s.label}`
        ).join('\n');
        message += `\nOptions:\n${options}\n`;
      } else {
        message += `Suggestions: ${prompt.suggestions.join(', ')}\n`;
      }
    }
    
    return message;
  }

  /**
   * Generates a retry message after validation failure
   * @private
   */
  generateRetryMessage(prompt, validationResult, attempts) {
    let message = `❌ ${validationResult.error}\n\n`;
    
    if (attempts === 1) {
      message += `Let's try again. ${prompt.message}\n`;
      
      // Provide more specific help
      if (prompt.validation.pattern && prompt.fieldName.toLowerCase() === 'payeecode') {
        message += '\nExample: 1111 (4 digits)\n';
      } else if (prompt.validation.type === 'number') {
        message += '\nPlease enter a number without currency symbols\n';
      }
    } else if (attempts === 2) {
      message += 'Here are some valid examples:\n';
      
      if (prompt.suggestions && prompt.suggestions.length > 0) {
        if (typeof prompt.suggestions[0] === 'object') {
          prompt.suggestions.slice(0, 3).forEach(s => {
            message += `• ${s.value} - ${s.label}\n`;
          });
        } else {
          prompt.suggestions.slice(0, 3).forEach(s => {
            message += `• ${s}\n`;
          });
        }
      }
    } else {
      message += 'Would you like to skip this field or get help?\n';
      message += 'Type "skip" to use default or "help" for more information.\n';
    }
    
    return message;
  }

  /**
   * Gets pattern error message
   * @private
   */
  getPatternErrorMessage(fieldName, pattern) {
    const patternMessages = {
      '^[0-9]{4}$': 'Must be exactly 4 digits',
      '^[0-9]+$': 'Must contain only numbers',
      '^[A-Z]{2,3}$': 'Must be 2-3 uppercase letters',
      '^[^@]+@[^@]+\\.[^@]+$': 'Must be a valid email address'
    };
    
    return patternMessages[pattern] || `Must match pattern: ${pattern}`;
  }

  /**
   * Validates value type
   * @private
   */
  validateType(value, expectedType) {
    switch (expectedType) {
      case 'string':
        return typeof value === 'string';
      case 'number':
        return typeof value === 'number' && !isNaN(value);
      case 'integer':
        return typeof value === 'number' && Number.isInteger(value);
      case 'boolean':
        return typeof value === 'boolean';
      case 'array':
        return Array.isArray(value);
      case 'object':
        return typeof value === 'object' && value !== null && !Array.isArray(value);
      default:
        return true;
    }
  }

  /**
   * Extracts the schema from operation spec
   * @private
   */
  extractOperationSchema(operation, components) {
    if (operation.requestBody) {
      return this.bodyValidator.schemaResolver.extractRequestBodySchema(
        operation.requestBody,
        components
      );
    }
    
    return null;
  }

  /**
   * Generates a unique collection ID
   * @private
   */
  generateCollectionId() {
    return `collect_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  /**
   * Cancels an active collection session
   */
  cancelCollection(collectionId) {
    this.activeCollections.delete(collectionId);
  }

  /**
   * Gets the status of a collection session
   */
  getCollectionStatus(collectionId) {
    const state = this.activeCollections.get(collectionId);
    
    if (!state) {
      return null;
    }
    
    return {
      id: collectionId,
      currentField: state.currentField?.fieldPath,
      progress: {
        collected: Object.keys(state.collectedFields).length,
        total: state.prompts.length,
        percentage: Math.round((Object.keys(state.collectedFields).length / state.prompts.length) * 100)
      }
    };
  }
}