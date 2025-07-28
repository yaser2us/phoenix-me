// Input validation utilities for the MCP API Gateway

export class Validators {
  
  // Validate MCP tool arguments
  static validateToolArguments(args, toolSchema) {
    const errors = [];
    
    if (!args || typeof args !== 'object') {
      errors.push('Arguments must be an object');
      return { valid: false, errors };
    }
    
    if (!toolSchema || !toolSchema.properties) {
      // If no schema provided, just check basic structure
      return { valid: true, errors: [] };
    }
    
    // Check required properties
    if (toolSchema.required) {
      for (const requiredProp of toolSchema.required) {
        if (!(requiredProp in args)) {
          errors.push(`Required property '${requiredProp}' is missing`);
        }
      }
    }
    
    // Validate property types
    for (const [propName, propValue] of Object.entries(args)) {
      const propSchema = toolSchema.properties[propName];
      if (propSchema) {
        const propValidation = this.validateProperty(propValue, propSchema, propName);
        if (!propValidation.valid) {
          errors.push(...propValidation.errors);
        }
      }
    }
    
    return {
      valid: errors.length === 0,
      errors
    };
  }
  
  // Validate individual property against schema
  static validateProperty(value, schema, propertyName) {
    const errors = [];
    
    // Check type
    if (schema.type) {
      if (!this.validateType(value, schema.type)) {
        errors.push(`Property '${propertyName}' must be of type ${schema.type}`);
      }
    }
    
    // Check enum values
    if (schema.enum && !schema.enum.includes(value)) {
      errors.push(`Property '${propertyName}' must be one of: ${schema.enum.join(', ')}`);
    }
    
    // String validations
    if (schema.type === 'string' && typeof value === 'string') {
      if (schema.minLength && value.length < schema.minLength) {
        errors.push(`Property '${propertyName}' must be at least ${schema.minLength} characters long`);
      }
      
      if (schema.maxLength && value.length > schema.maxLength) {
        errors.push(`Property '${propertyName}' must be at most ${schema.maxLength} characters long`);
      }
      
      if (schema.pattern) {
        const regex = new RegExp(schema.pattern);
        if (!regex.test(value)) {
          errors.push(`Property '${propertyName}' does not match required pattern`);
        }
      }
    }
    
    // Number validations
    if ((schema.type === 'number' || schema.type === 'integer') && typeof value === 'number') {
      if (schema.minimum !== undefined && value < schema.minimum) {
        errors.push(`Property '${propertyName}' must be at least ${schema.minimum}`);
      }
      
      if (schema.maximum !== undefined && value > schema.maximum) {
        errors.push(`Property '${propertyName}' must be at most ${schema.maximum}`);
      }
      
      if (schema.type === 'integer' && !Number.isInteger(value)) {
        errors.push(`Property '${propertyName}' must be an integer`);
      }
    }
    
    return {
      valid: errors.length === 0,
      errors
    };
  }
  
  // Validate JavaScript type
  static validateType(value, expectedType) {
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
      case 'null':
        return value === null;
      default:
        return true; // Unknown type, assume valid
    }
  }
  
  // Validate API response structure
  static validateApiResponse(response) {
    const errors = [];
    
    if (!response) {
      errors.push('Response is null or undefined');
      return { valid: false, errors };
    }
    
    if (typeof response !== 'object') {
      errors.push('Response must be an object');
      return { valid: false, errors };
    }
    
    // Check for required response properties
    if (!('success' in response)) {
      errors.push('Response must have a "success" property');
    }
    
    if (response.success === true && !response.data) {
      errors.push('Successful response must have "data" property');
    }
    
    if (response.success === false && !response.error) {
      errors.push('Failed response must have "error" property');
    }
    
    return {
      valid: errors.length === 0,
      errors
    };
  }
  
  // Validate OpenAPI operation ID
  static validateOperationId(operationId) {
    const errors = [];
    
    if (!operationId) {
      errors.push('Operation ID is required');
      return { valid: false, errors };
    }
    
    if (typeof operationId !== 'string') {
      errors.push('Operation ID must be a string');
      return { valid: false, errors };
    }
    
    // Operation ID should follow naming conventions
    if (!/^[a-zA-Z][a-zA-Z0-9]*$/.test(operationId)) {
      errors.push('Operation ID must start with a letter and contain only alphanumeric characters');
    }
    
    return {
      valid: errors.length === 0,
      errors
    };
  }
  
  // Validate URL
  static validateUrl(url) {
    const errors = [];
    
    if (!url) {
      errors.push('URL is required');
      return { valid: false, errors };
    }
    
    if (typeof url !== 'string') {
      errors.push('URL must be a string');
      return { valid: false, errors };
    }
    
    try {
      new URL(url);
    } catch (error) {
      errors.push('URL format is invalid');
    }
    
    return {
      valid: errors.length === 0,
      errors
    };
  }
  
  // Validate location string for weather API
  static validateLocation(location) {
    const errors = [];
    
    if (!location) {
      errors.push('Location is required');
      return { valid: false, errors };
    }
    
    if (typeof location !== 'string') {
      errors.push('Location must be a string');
      return { valid: false, errors };
    }
    
    // Basic location validation
    location = location.trim();
    
    if (location.length < 2) {
      errors.push('Location must be at least 2 characters long');
    }
    
    if (location.length > 100) {
      errors.push('Location must be at most 100 characters long');
    }
    
    // Check for valid characters (letters, spaces, commas, periods, hyphens)
    if (!/^[a-zA-Z\s,.-]+$/.test(location)) {
      errors.push('Location contains invalid characters');
    }
    
    // Check for at least one letter
    if (!/[a-zA-Z]/.test(location)) {
      errors.push('Location must contain at least one letter');
    }
    
    return {
      valid: errors.length === 0,
      errors,
      sanitized: location
    };
  }
  
  // Validate temperature units
  static validateTemperatureUnits(units) {
    const validUnits = ['metric', 'imperial', 'standard'];
    const errors = [];
    
    if (!units) {
      // Units are optional, default to metric
      return { valid: true, errors: [], sanitized: 'metric' };
    }
    
    if (typeof units !== 'string') {
      errors.push('Temperature units must be a string');
      return { valid: false, errors };
    }
    
    const normalizedUnits = units.toLowerCase();
    
    if (!validUnits.includes(normalizedUnits)) {
      errors.push(`Temperature units must be one of: ${validUnits.join(', ')}`);
      return { valid: false, errors };
    }
    
    return {
      valid: true,
      errors: [],
      sanitized: normalizedUnits
    };
  }
  
  // Sanitize user input
  static sanitizeInput(input) {
    if (typeof input !== 'string') {
      return input;
    }
    
    return input
      .trim()
      .replace(/\s+/g, ' ')  // Collapse multiple spaces
      .slice(0, 1000);       // Limit length to prevent abuse
  }
  
  // Validate JSON structure
  static validateJson(jsonString) {
    const errors = [];
    
    if (!jsonString) {
      errors.push('JSON string is required');
      return { valid: false, errors };
    }
    
    if (typeof jsonString !== 'string') {
      errors.push('Input must be a string');
      return { valid: false, errors };
    }
    
    try {
      const parsed = JSON.parse(jsonString);
      return {
        valid: true,
        errors: [],
        parsed: parsed
      };
    } catch (error) {
      errors.push(`Invalid JSON: ${error.message}`);
      return { valid: false, errors };
    }
  }
  
  // Validate environment configuration
  static validateEnvironment(env) {
    const errors = [];
    const warnings = [];
    
    // Check Node.js version
    const nodeVersion = process.version;
    const majorVersion = parseInt(nodeVersion.slice(1).split('.')[0]);
    
    if (majorVersion < 18) {
      errors.push(`Node.js version ${nodeVersion} is not supported. Please use Node.js 18 or higher.`);
    }
    
    // Check required environment variables
    const requiredEnvVars = ['WEATHER_API_KEY'];
    
    for (const envVar of requiredEnvVars) {
      if (!process.env[envVar]) {
        errors.push(`Environment variable ${envVar} is required`);
      }
    }
    
    // Check optional environment variables
    const optionalEnvVars = {
      'LOG_LEVEL': ['error', 'warn', 'info', 'debug'],
      'DEFAULT_TIMEOUT': 'number',
      'MAX_RETRIES': 'number'
    };
    
    for (const [envVar, expectedType] of Object.entries(optionalEnvVars)) {
      const value = process.env[envVar];
      if (value) {
        if (Array.isArray(expectedType)) {
          if (!expectedType.includes(value)) {
            warnings.push(`${envVar} should be one of: ${expectedType.join(', ')}`);
          }
        } else if (expectedType === 'number') {
          if (isNaN(parseInt(value))) {
            warnings.push(`${envVar} should be a number`);
          }
        }
      }
    }
    
    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }
}