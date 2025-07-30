import { logger } from '../utils/logger.js';

/**
 * Dynamic Parameter Collector - Intelligent parameter collection with OpenAPI schema validation
 * Handles context-aware parameter inference and interactive prompting
 */
export class DynamicParameterCollector {
  constructor(apiRegistry) {
    this.apiRegistry = apiRegistry;
    this.logger = logger;
  }

  /**
   * Collects all required parameters for a workflow
   * @param {Object} workflowSpec - Complete workflow specification
   * @param {Object} userContext - User context (location, auth, preferences)
   * @returns {Object} Collected parameters with validation results
   */
  async collectParameters(workflowSpec, userContext = {}) {
    try {
      const result = {
        collected: {},
        missing: [],
        prompts: [],
        validationErrors: [],
        sharedParameters: {}
      };

      // Extract all unique parameters from workflow
      const allParameters = this.extractWorkflowParameters(workflowSpec);
      
      // Group parameters by sharing potential
      const parameterGroups = this.groupSharedParameters(allParameters);
      
      // Collect parameters with context inference
      for (const [paramName, paramDetails] of Object.entries(parameterGroups)) {
        const collectionResult = await this.collectParameter(
          paramName, 
          paramDetails, 
          userContext
        );
        
        if (collectionResult.value !== undefined) {
          result.collected[paramName] = collectionResult.value;
          result.sharedParameters[paramName] = paramDetails.operations;
        } else {
          result.missing.push({
            name: paramName,
            details: paramDetails,
            prompt: collectionResult.prompt
          });
          result.prompts.push(collectionResult.prompt);
        }
        
        if (collectionResult.validationError) {
          result.validationErrors.push(collectionResult.validationError);
        }
      }
      
      return result;
    } catch (error) {
      this.logger.error('Parameter collection failed:', error);
      throw error;
    }
  }

  /**
   * Collects a single parameter with context awareness
   * @private
   */
  async collectParameter(paramName, paramDetails, userContext) {
    const result = {
      value: undefined,
      prompt: null,
      validationError: null
    };

    // Try context-based inference first
    const inferredValue = this.inferParameterFromContext(paramName, paramDetails, userContext);
    
    if (inferredValue !== undefined) {
      // Validate inferred value
      const validation = await this.validateParameter(inferredValue, paramDetails);
      if (validation.valid) {
        result.value = inferredValue;
        return result;
      } else {
        result.validationError = {
          parameter: paramName,
          value: inferredValue,
          error: validation.error
        };
      }
    }

    // Generate intelligent prompt for missing parameter
    result.prompt = this.generateParameterPrompt(paramName, paramDetails, userContext);
    
    return result;
  }

  /**
   * Infers parameter values from user context
   * @private
   */
  inferParameterFromContext(paramName, paramDetails, userContext) {
    const paramNameLower = paramName.toLowerCase();
    const schema = paramDetails.schema || {};
    
    // Location-related parameters
    if (this.isLocationParameter(paramNameLower)) {
      if (userContext.location) {
        return userContext.location;
      }
      if (userContext.coordinates) {
        return `${userContext.coordinates.lat},${userContext.coordinates.lon}`;
      }
    }
    
    // Authentication parameters
    if (this.isAuthParameter(paramNameLower)) {
      if (userContext.authentication) {
        if (paramNameLower.includes('jwt') || paramNameLower.includes('token')) {
          return userContext.authentication.jwt || userContext.authentication.token;
        }
        if (paramNameLower.includes('key')) {
          return userContext.authentication.apiKey;
        }
      }
    }
    
    // Currency parameters
    if (this.isCurrencyParameter(paramNameLower)) {
      if (userContext.preferredCurrency) {
        return userContext.preferredCurrency;
      }
      // Default currency based on common patterns
      if (paramNameLower.includes('from')) return 'USD';
      if (paramNameLower.includes('to')) return 'MYR';
    }
    
    // API Key parameters (weather, etc.)
    if (paramNameLower === 'appid' || paramNameLower === 'api_key') {
      return process.env.WEATHER_API_KEY || 'demo_key';
    }
    
    // Units for weather
    if (paramNameLower === 'units') {
      return userContext.preferredUnits || 'metric';
    }
    
    // Common headers with sensible defaults
    const headerDefaults = {
      'accept': 'application/json',
      'content-type': 'application/json',
      'x-app-platform': 'web',
      'x-app-version': '1.0.0',
      'x-app-environment': 'production',
      'x-app-build-no': '1',
      'x-app-release-no': '1.0',
      'x-app-session-trace-id': this.generateTraceId(),
      'isfirstload': 'true',
      // Banking API specific headers
      'isFirstLoad': 'true',
      'Accept': 'application/json',
      'X-APP-PLATFORM': 'web',
      'X-APP-VERSION': '1.0.0', 
      'X-APP-ENVIRONMENT': 'production',
      'X-APP-BUILD-NO': '1',
      'X-APP-RELEASE-NO': '1.0',
      'X-APP-SESSION-TRACE-ID': this.generateTraceId(),
      // API Keys
      'appid': process.env.WEATHER_API_KEY || 'demo_weather_key',
      'api_key': process.env.WEATHER_API_KEY || 'demo_weather_key',
      // Common query parameters
      'type': 'full',
      'base': 'USD',
      'units': 'metric'
    };
    
    const headerKey = paramNameLower.replace(/_/g, '-');
    if (headerDefaults[headerKey]) {
      return headerDefaults[headerKey];
    }
    
    // Direct parameter name matching
    if (headerDefaults[paramNameLower]) {
      return headerDefaults[paramNameLower];
    }
    
    // Amount parameters from user intent
    if (this.isAmountParameter(paramNameLower) && userContext.extractedAmount) {
      return userContext.extractedAmount;
    }
    
    return undefined;
  }

  /**
   * Validates parameter against OpenAPI schema
   */
  async validateParameter(value, paramDetails) {
    const schema = paramDetails.schema || {};
    
    try {
      // Type validation
      if (schema.type) {
        if (!this.validateType(value, schema.type)) {
          return {
            valid: false,
            error: `Expected type ${schema.type}, got ${typeof value}`
          };
        }
      }
      
      // Enum validation
      if (schema.enum && !schema.enum.includes(value)) {
        return {
          valid: false,
          error: `Value must be one of: ${schema.enum.join(', ')}`
        };
      }
      
      // Pattern validation
      if (schema.pattern) {
        const regex = new RegExp(schema.pattern);
        if (!regex.test(value)) {
          return {
            valid: false,
            error: `Value does not match required pattern: ${schema.pattern}`
          };
        }
      }
      
      // String length validation
      if (schema.type === 'string') {
        if (schema.minLength && value.length < schema.minLength) {
          return {
            valid: false,
            error: `Minimum length is ${schema.minLength}`
          };
        }
        if (schema.maxLength && value.length > schema.maxLength) {
          return {
            valid: false,
            error: `Maximum length is ${schema.maxLength}`
          };
        }
      }
      
      // Number validation
      if (schema.type === 'number' || schema.type === 'integer') {
        const numValue = Number(value);
        if (isNaN(numValue)) {
          return {
            valid: false,
            error: 'Invalid number format'
          };
        }
        
        if (schema.minimum !== undefined && numValue < schema.minimum) {
          return {
            valid: false,
            error: `Minimum value is ${schema.minimum}`
          };
        }
        
        if (schema.maximum !== undefined && numValue > schema.maximum) {
          return {
            valid: false,
            error: `Maximum value is ${schema.maximum}`
          };
        }
      }
      
      return { valid: true };
      
    } catch (error) {
      return {
        valid: false,
        error: `Validation error: ${error.message}`
      };
    }
  }

  /**
   * Generates intelligent prompts for missing parameters
   * @private
   */
  generateParameterPrompt(paramName, paramDetails, userContext) {
    const schema = paramDetails.schema || {};
    const operations = paramDetails.operations || [];
    
    let prompt = {
      parameter: paramName,
      message: '',
      type: schema.type || 'string',
      required: paramDetails.required !== false,
      operations: operations,
      suggestions: []
    };
    
    // Generate context-aware prompts
    if (this.isLocationParameter(paramName.toLowerCase())) {
      prompt.message = `I need your location for ${this.operationsToString(operations)}. Please provide a city name or coordinates.`;
      prompt.suggestions = ['Kuala Lumpur', 'Singapore', 'Bangkok', 'Current location'];
    } else if (this.isAuthParameter(paramName.toLowerCase())) {
      prompt.message = `Authentication required for ${this.operationsToString(operations)}. Please provide your ${paramName}.`;
      prompt.suggestions = ['Use saved credentials', 'Enter manually'];
    } else if (this.isCurrencyParameter(paramName.toLowerCase())) {
      prompt.message = `Which currency for ${this.operationsToString(operations)}?`;
      prompt.suggestions = ['USD', 'MYR', 'SGD', 'EUR', 'GBP'];
    } else if (this.isAmountParameter(paramName.toLowerCase())) {
      prompt.message = `How much would you like to ${operations.includes('transfer') ? 'transfer' : operations[0]}?`;
      prompt.suggestions = ['$100', '$500', '$1000', 'Custom amount'];
    } else {
      // Generic prompt
      prompt.message = `Please provide ${paramName} for ${this.operationsToString(operations)}.`;
      
      if (schema.enum) {
        prompt.suggestions = schema.enum;
      }
      
      if (schema.example) {
        prompt.suggestions.push(schema.example);
      }
    }
    
    // Add description if available
    if (paramDetails.description) {
      prompt.message += ` (${paramDetails.description})`;
    }
    
    return prompt;
  }

  /**
   * Extracts and normalizes all parameters from workflow
   * @private
   */
  extractWorkflowParameters(workflowSpec) {
    const parameters = new Map();
    
    if (!workflowSpec.executionPlan || !workflowSpec.executionPlan.steps) {
      return parameters;
    }
    
    for (const step of workflowSpec.executionPlan.steps) {
      for (const operation of step.operations) {
        if (operation.requiredParams) {
          for (const param of operation.requiredParams) {
            const paramKey = this.getParameterKey(param);
            
            if (!parameters.has(paramKey)) {
              parameters.set(paramKey, {
                name: param.name,
                in: param.in || 'query',
                schema: param.schema || {},
                required: param.required !== false,
                description: param.description,
                operations: [operation.subGoal],
                examples: []
              });
            } else {
              // Add to existing parameter
              const existing = parameters.get(paramKey);
              if (!existing.operations.includes(operation.subGoal)) {
                existing.operations.push(operation.subGoal);
              }
            }
          }
        }
      }
    }
    
    return Object.fromEntries(parameters);
  }

  /**
   * Groups parameters that can be shared between operations
   * @private
   */
  groupSharedParameters(allParameters) {
    const grouped = {};
    
    // Parameters that are commonly shared
    const sharedParameterPatterns = {
      location: /^(q|city|location|latitude|longitude|coords?)(_query|_path)?$/i,
      auth: /^(authorization|jwt|token|api_?key)(_header|_query)?$/i,
      currency: /^(currency|from_?currency|to_?currency)(_query|_path)?$/i,
      units: /^(units|unit)(_query)?$/i,
      format: /^(format|response_?format)(_query)?$/i,
      appid: /^(appid|api_key)(_query)?$/i
    };
    
    for (const [paramName, paramDetails] of Object.entries(allParameters)) {
      let groupKey = paramName;
      
      // Check if this parameter should be grouped with others
      for (const [pattern, regex] of Object.entries(sharedParameterPatterns)) {
        if (regex.test(paramName)) {
          groupKey = pattern;
          break;
        }
      }
      
      if (!grouped[groupKey]) {
        grouped[groupKey] = paramDetails;
      } else {
        // Merge operations
        grouped[groupKey].operations = [
          ...new Set([...grouped[groupKey].operations, ...paramDetails.operations])
        ];
      }
    }
    
    return grouped;
  }

  /**
   * Helper methods for parameter type detection
   * @private
   */
  isLocationParameter(paramName) {
    return /^(q|city|location|latitude|longitude|coords?|place)$/i.test(paramName);
  }

  isAuthParameter(paramName) {
    return /^(authorization|jwt|token|api_?key|auth)$/i.test(paramName);
  }

  isCurrencyParameter(paramName) {
    return /^(currency|from_?currency|to_?currency|curr)$/i.test(paramName);
  }

  isAmountParameter(paramName) {
    return /^(amount|value|sum|total|money)$/i.test(paramName);
  }

  /**
   * Validates value type against schema type
   * @private
   */
  validateType(value, expectedType) {
    switch (expectedType) {
      case 'string':
        return typeof value === 'string';
      case 'number':
        return typeof value === 'number' || !isNaN(Number(value));
      case 'integer':
        return Number.isInteger(Number(value));
      case 'boolean':
        return typeof value === 'boolean' || ['true', 'false'].includes(String(value).toLowerCase());
      case 'array':
        return Array.isArray(value);
      case 'object':
        return typeof value === 'object' && value !== null && !Array.isArray(value);
      default:
        return true; // Unknown type, assume valid
    }
  }

  /**
   * Creates a unique key for parameter identification
   * @private
   */
  getParameterKey(param) {
    return `${param.name}_${param.in || 'query'}`;
  }

  /**
   * Converts operations list to human-readable string
   * @private
   */
  operationsToString(operations) {
    if (operations.length === 1) {
      return operations[0].replace(/_/g, ' ');
    } else if (operations.length === 2) {
      return operations.map(op => op.replace(/_/g, ' ')).join(' and ');
    } else {
      const formatted = operations.map(op => op.replace(/_/g, ' '));
      return formatted.slice(0, -1).join(', ') + ', and ' + formatted[formatted.length - 1];
    }
  }

  /**
   * Generates a unique trace ID
   * @private
   */
  generateTraceId() {
    return `trace_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Interactive parameter collection with user prompts
   */
  async collectParameterInteractively(paramName, paramDetails, userResponse) {
    try {
      // Ensure paramDetails has required structure
      const safeParamDetails = paramDetails || {
        name: paramName,
        schema: { type: 'string' },
        required: true
      };
      
      // Validate user response
      const validation = await this.validateParameter(userResponse, safeParamDetails);
      
      if (!validation.valid) {
        return {
          success: false,
          error: validation.error,
          retry: true,
          suggestion: this.generateParameterPrompt(paramName, safeParamDetails, {})
        };
      }
      
      return {
        success: true,
        value: userResponse,
        parameter: paramName
      };
      
    } catch (error) {
      this.logger.error(`Interactive parameter collection failed for ${paramName}: ${error.message}`);
      
      return {
        success: true, // Accept the value to avoid blocking conversation
        value: userResponse,
        parameter: paramName
      };
    }
  }

  /**
   * Batch parameter collection for efficiency
   */
  async collectParametersBatch(parameterList, userContext) {
    const results = {
      collected: {},
      failed: [],
      prompts: []
    };
    
    // Group related parameters
    const batches = this.createParameterBatches(parameterList);
    
    for (const batch of batches) {
      const batchResult = await this.collectParameterBatch(batch, userContext);
      
      Object.assign(results.collected, batchResult.collected);
      results.failed.push(...batchResult.failed);
      results.prompts.push(...batchResult.prompts);
    }
    
    return results;
  }

  /**
   * Creates logical batches of related parameters
   * @private
   */
  createParameterBatches(parameterList) {
    const batches = [];
    const processed = new Set();
    
    // Group by operation or semantic similarity
    for (const param of parameterList) {
      if (processed.has(param.name)) continue;
      
      const batch = [param];
      processed.add(param.name);
      
      // Find related parameters
      for (const otherParam of parameterList) {
        if (processed.has(otherParam.name)) continue;
        
        if (this.areParametersRelated(param, otherParam)) {
          batch.push(otherParam);
          processed.add(otherParam.name);
        }
      }
      
      batches.push(batch);
    }
    
    return batches;
  }

  /**
   * Determines if two parameters are related and should be collected together
   * @private
   */  
  areParametersRelated(param1, param2) {
    // Same operation
    if (param1.operations && param2.operations) {
      const shared = param1.operations.filter(op => param2.operations.includes(op));
      if (shared.length > 0) return true;
    }
    
    // Same semantic category
    const categories = ['location', 'auth', 'currency', 'amount'];
    for (const category of categories) {
      const method = `is${category.charAt(0).toUpperCase() + category.slice(1)}Parameter`;
      if (this[method] && this[method](param1.name) && this[method](param2.name)) {
        return true;
      }
    }
    
    return false;
  }

  /**
   * Collects a batch of related parameters
   * @private
   */
  async collectParameterBatch(batch, userContext) {
    const results = {
      collected: {},
      failed: [],
      prompts: []
    };
    
    for (const param of batch) {
      const result = await this.collectParameter(param.name, param, userContext);
      
      if (result.value !== undefined) {
        results.collected[param.name] = result.value;
      } else {
        results.failed.push(param.name);
        if (result.prompt) {
          results.prompts.push(result.prompt);
        }
      }
    }
    
    return results;
  }
}