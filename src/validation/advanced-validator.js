import { logger } from '../utils/logger.js';

/**
 * Advanced Validator - Handles complex OpenAPI validation scenarios
 * Supports oneOf/anyOf/allOf, conditional validation, format validation, and more
 */
export class AdvancedValidator {
  constructor() {
    this.logger = logger;
    
    // Format validators
    this.formatValidators = {
      'date': this.validateDate.bind(this),
      'date-time': this.validateDateTime.bind(this),
      'time': this.validateTime.bind(this),
      'email': this.validateEmail.bind(this),
      'uri': this.validateUri.bind(this),
      'uuid': this.validateUuid.bind(this),
      'ipv4': this.validateIPv4.bind(this),
      'ipv6': this.validateIPv6.bind(this),
      'hostname': this.validateHostname.bind(this),
      'phone': this.validatePhone.bind(this),
      'credit-card': this.validateCreditCard.bind(this),
      'currency': this.validateCurrency.bind(this)
    };
    
    // Custom validation rules
    this.customRules = new Map();
  }

  /**
   * Validates a value against an advanced schema
   * @param {*} value - The value to validate
   * @param {Object} schema - The OpenAPI schema with advanced features
   * @param {String} path - The field path for error reporting
   * @returns {Object} Validation result
   */
  async validateAdvanced(value, schema, path = '') {
    const errors = [];
    const warnings = [];
    
    if (!schema) {
      return { valid: true, errors, warnings };
    }

    try {
      // Handle composition schemas
      if (schema.oneOf) {
        const oneOfResult = await this.validateOneOf(value, schema.oneOf, path);
        errors.push(...oneOfResult.errors);
        warnings.push(...oneOfResult.warnings);
      } else if (schema.anyOf) {
        const anyOfResult = await this.validateAnyOf(value, schema.anyOf, path);
        errors.push(...anyOfResult.errors);
        warnings.push(...anyOfResult.warnings);
      } else if (schema.allOf) {
        const allOfResult = await this.validateAllOf(value, schema.allOf, path);
        errors.push(...allOfResult.errors);
        warnings.push(...allOfResult.warnings);
      } else {
        // Standard validation
        const standardResult = await this.validateStandard(value, schema, path);
        errors.push(...standardResult.errors);
        warnings.push(...standardResult.warnings);
      }

      // Conditional validation (if/then/else)
      if (schema.if && schema.then) {
        const conditionalResult = await this.validateConditional(value, schema, path);
        errors.push(...conditionalResult.errors);
        warnings.push(...conditionalResult.warnings);
      }

      // Custom validation rules
      if (schema['x-custom-validation']) {
        const customResult = await this.validateCustom(value, schema['x-custom-validation'], path);
        errors.push(...customResult.errors);
        warnings.push(...customResult.warnings);
      }

      return {
        valid: errors.length === 0,
        errors,
        warnings
      };

    } catch (error) {
      this.logger.error(`Advanced validation failed for path ${path}:`, error);
      return {
        valid: false,
        errors: [`Validation error at ${path}: ${error.message}`],
        warnings
      };
    }
  }

  /**
   * Validates oneOf schemas - exactly one must match
   * @private
   */
  async validateOneOf(value, schemas, path) {
    const errors = [];
    const warnings = [];
    const results = [];

    for (let i = 0; i < schemas.length; i++) {
      const result = await this.validateAdvanced(value, schemas[i], `${path}[oneOf:${i}]`);
      results.push(result);
    }

    const validResults = results.filter(r => r.valid);

    if (validResults.length === 0) {
      errors.push(`${path || 'Value'} must match one of the schemas (none matched)`);
      // Include specific errors from each schema
      results.forEach((result, index) => {
        if (result.errors.length > 0) {
          errors.push(`Schema ${index + 1}: ${result.errors.join(', ')}`);
        }
      });
    } else if (validResults.length > 1) {
      warnings.push(`${path || 'Value'} matches multiple schemas in oneOf (${validResults.length} matches)`);
    }

    return { errors, warnings };
  }

  /**
   * Validates anyOf schemas - at least one must match
   * @private
   */
  async validateAnyOf(value, schemas, path) {
    const errors = [];
    const warnings = [];
    const results = [];

    for (let i = 0; i < schemas.length; i++) {
      const result = await this.validateAdvanced(value, schemas[i], `${path}[anyOf:${i}]`);
      results.push(result);
    }

    const validResults = results.filter(r => r.valid);

    if (validResults.length === 0) {
      errors.push(`${path || 'Value'} must match at least one of the schemas (none matched)`);
      // Include specific errors from each schema
      results.forEach((result, index) => {
        if (result.errors.length > 0) {
          errors.push(`Schema ${index + 1}: ${result.errors.join(', ')}`);
        }
      });
    }

    return { errors, warnings };
  }

  /**
   * Validates allOf schemas - all must match
   * @private
   */
  async validateAllOf(value, schemas, path) {
    const errors = [];
    const warnings = [];

    for (let i = 0; i < schemas.length; i++) {
      const result = await this.validateAdvanced(value, schemas[i], `${path}[allOf:${i}]`);
      errors.push(...result.errors);
      warnings.push(...result.warnings);
    }

    return { errors, warnings };
  }

  /**
   * Validates conditional schemas (if/then/else)
   * @private
   */
  async validateConditional(value, schema, path) {
    const errors = [];
    const warnings = [];

    try {
      // Check if condition matches
      const conditionResult = await this.validateAdvanced(value, schema.if, `${path}[if]`);

      if (conditionResult.valid && schema.then) {
        // Condition matches, validate against 'then' schema
        // Merge the 'then' schema with the base schema for validation
        const mergedSchema = this.mergeSchemas([schema, schema.then]);
        const thenResult = await this.validateStandard(value, mergedSchema, path);
        errors.push(...thenResult.errors);
        warnings.push(...thenResult.warnings);
      } else if (!conditionResult.valid && schema.else) {
        // Condition doesn't match, validate against 'else' schema
        // Merge the 'else' schema with the base schema for validation
        const mergedSchema = this.mergeSchemas([schema, schema.else]);
        const elseResult = await this.validateStandard(value, mergedSchema, path);
        errors.push(...elseResult.errors);
        warnings.push(...elseResult.warnings);
      }
    } catch (error) {
      errors.push(`Conditional validation error at ${path}: ${error.message}`);
    }

    return { errors, warnings };
  }

  /**
   * Standard validation for basic types and constraints
   * @private
   */
  async validateStandard(value, schema, path) {
    const errors = [];
    const warnings = [];

    // Null check
    if (value === null || value === undefined) {
      if (schema.nullable === true || (schema.type && schema.type.includes('null'))) {
        return { errors, warnings };
      } else if (schema.required !== false) {
        errors.push(`${path || 'Value'} is required but was null/undefined`);
        return { errors, warnings };
      }
    }

    // Type validation
    if (schema.type && !this.validateType(value, schema.type)) {
      errors.push(`${path || 'Value'} must be of type ${schema.type}, got ${this.getValueType(value)}`);
    }

    // String validation
    if (schema.type === 'string' && typeof value === 'string') {
      const stringResult = this.validateString(value, schema, path);
      errors.push(...stringResult.errors);
      warnings.push(...stringResult.warnings);
    }

    // Number validation
    if ((schema.type === 'number' || schema.type === 'integer') && typeof value === 'number') {
      const numberResult = this.validateNumber(value, schema, path);
      errors.push(...numberResult.errors);
      warnings.push(...numberResult.warnings);
    }

    // Array validation
    if (schema.type === 'array' && Array.isArray(value)) {
      const arrayResult = await this.validateArray(value, schema, path);
      errors.push(...arrayResult.errors);
      warnings.push(...arrayResult.warnings);
    }

    // Object validation
    if (schema.type === 'object' && typeof value === 'object' && value !== null && !Array.isArray(value)) {
      const objectResult = await this.validateObject(value, schema, path);
      errors.push(...objectResult.errors);
      warnings.push(...objectResult.warnings);
    }

    return { errors, warnings };
  }

  /**
   * Validates string values with format, pattern, and length constraints
   * @private
   */
  validateString(value, schema, path) {
    const errors = [];
    const warnings = [];

    // Length validation
    if (schema.minLength !== undefined && value.length < schema.minLength) {
      errors.push(`${path || 'String'} must be at least ${schema.minLength} characters (got ${value.length})`);
    }
    if (schema.maxLength !== undefined && value.length > schema.maxLength) {
      errors.push(`${path || 'String'} must be at most ${schema.maxLength} characters (got ${value.length})`);
    }

    // Pattern validation
    if (schema.pattern) {
      try {
        const regex = new RegExp(schema.pattern);
        if (!regex.test(value)) {
          errors.push(`${path || 'String'} does not match required pattern: ${schema.pattern}`);
        }
      } catch (error) {
        warnings.push(`Invalid regex pattern in schema: ${schema.pattern}`);
      }
    }

    // Enum validation
    if (schema.enum && !schema.enum.includes(value)) {
      errors.push(`${path || 'Value'} must be one of: ${schema.enum.join(', ')} (got "${value}")`);
    }
    
    // Const validation (single value)
    if (schema.const !== undefined && value !== schema.const) {
      errors.push(`${path || 'Value'} must equal ${JSON.stringify(schema.const)} (got ${JSON.stringify(value)})`);
    }

    // Format validation
    if (schema.format) {
      const formatResult = this.validateFormat(value, schema.format, path);
      errors.push(...formatResult.errors);
      warnings.push(...formatResult.warnings);
    }

    return { errors, warnings };
  }

  /**
   * Validates number values with range and multiple constraints
   * @private
   */
  validateNumber(value, schema, path) {
    const errors = [];
    const warnings = [];

    // Integer check
    if (schema.type === 'integer' && !Number.isInteger(value)) {
      errors.push(`${path || 'Value'} must be an integer (got ${value})`);
    }

    // Range validation
    if (schema.minimum !== undefined && value < schema.minimum) {
      errors.push(`${path || 'Value'} must be >= ${schema.minimum} (got ${value})`);
    }
    if (schema.maximum !== undefined && value > schema.maximum) {
      errors.push(`${path || 'Value'} must be <= ${schema.maximum} (got ${value})`);
    }
    if (schema.exclusiveMinimum !== undefined && value <= schema.exclusiveMinimum) {
      errors.push(`${path || 'Value'} must be > ${schema.exclusiveMinimum} (got ${value})`);
    }
    if (schema.exclusiveMaximum !== undefined && value >= schema.exclusiveMaximum) {
      errors.push(`${path || 'Value'} must be < ${schema.exclusiveMaximum} (got ${value})`);
    }

    // Multiple validation
    if (schema.multipleOf !== undefined && value % schema.multipleOf !== 0) {
      errors.push(`${path || 'Value'} must be a multiple of ${schema.multipleOf} (got ${value})`);
    }

    return { errors, warnings };
  }

  /**
   * Validates array values with items, length, and uniqueness constraints
   * @private
   */
  async validateArray(value, schema, path) {
    const errors = [];
    const warnings = [];

    // Length validation
    if (schema.minItems !== undefined && value.length < schema.minItems) {
      errors.push(`${path || 'Array'} must have at least ${schema.minItems} items (got ${value.length})`);
    }
    if (schema.maxItems !== undefined && value.length > schema.maxItems) {
      errors.push(`${path || 'Array'} must have at most ${schema.maxItems} items (got ${value.length})`);
    }

    // Unique items validation
    if (schema.uniqueItems === true) {
      const seen = new Set();
      const duplicates = [];
      
      for (let i = 0; i < value.length; i++) {
        const itemKey = JSON.stringify(value[i]);
        if (seen.has(itemKey)) {
          duplicates.push(i);
        } else {
          seen.add(itemKey);
        }
      }
      
      if (duplicates.length > 0) {
        errors.push(`${path || 'Array'} must have unique items (duplicates at indices: ${duplicates.join(', ')})`);
      }
    }

    // Items validation
    if (schema.items) {
      for (let i = 0; i < value.length; i++) {
        const itemResult = await this.validateAdvanced(value[i], schema.items, `${path}[${i}]`);
        errors.push(...itemResult.errors);
        warnings.push(...itemResult.warnings);
      }
    }

    return { errors, warnings };
  }

  /**
   * Validates object values with properties, required fields, and additional properties
   * @private
   */
  async validateObject(value, schema, path) {
    const errors = [];
    const warnings = [];

    // Required properties validation
    if (schema.required && Array.isArray(schema.required)) {
      for (const requiredProp of schema.required) {
        if (!(requiredProp in value) || value[requiredProp] === undefined) {
          errors.push(`Required property '${path ? path + '.' : ''}${requiredProp}' is missing`);
        }
      }
    }

    // Properties validation
    if (schema.properties) {
      for (const [propName, propSchema] of Object.entries(schema.properties)) {
        if (propName in value) {
          const propPath = path ? `${path}.${propName}` : propName;
          const propResult = await this.validateAdvanced(value[propName], propSchema, propPath);
          errors.push(...propResult.errors);
          warnings.push(...propResult.warnings);
        }
      }
    }

    // Additional properties validation
    if (schema.additionalProperties === false) {
      const allowedProps = new Set(Object.keys(schema.properties || {}));
      const extraProps = Object.keys(value).filter(prop => !allowedProps.has(prop));
      
      if (extraProps.length > 0) {
        errors.push(`${path || 'Object'} has unexpected properties: ${extraProps.join(', ')}`);
      }
    } else if (typeof schema.additionalProperties === 'object') {
      // Validate additional properties against schema
      const allowedProps = new Set(Object.keys(schema.properties || {}));
      const extraProps = Object.keys(value).filter(prop => !allowedProps.has(prop));
      
      for (const extraProp of extraProps) {
        const propPath = path ? `${path}.${extraProp}` : extraProp;
        const propResult = await this.validateAdvanced(value[extraProp], schema.additionalProperties, propPath);
        errors.push(...propResult.errors);
        warnings.push(...propResult.warnings);
      }
    }

    // Min/max properties validation
    const propCount = Object.keys(value).length;
    if (schema.minProperties !== undefined && propCount < schema.minProperties) {
      errors.push(`${path || 'Object'} must have at least ${schema.minProperties} properties (got ${propCount})`);
    }
    if (schema.maxProperties !== undefined && propCount > schema.maxProperties) {
      errors.push(`${path || 'Object'} must have at most ${schema.maxProperties} properties (got ${propCount})`);
    }

    return { errors, warnings };
  }

  /**
   * Validates format constraints
   * @private
   */
  validateFormat(value, format, path) {
    const errors = [];
    const warnings = [];

    const validator = this.formatValidators[format];
    
    if (validator) {
      const isValid = validator(value);
      if (!isValid) {
        errors.push(`${path || 'Value'} must be a valid ${format} (got "${value}")`);
      }
    } else {
      warnings.push(`Unknown format '${format}' - validation skipped`);
    }

    return { errors, warnings };
  }

  /**
   * Custom validation handler
   * @private
   */
  async validateCustom(value, customRule, path) {
    const errors = [];
    const warnings = [];

    if (typeof customRule === 'string' && this.customRules.has(customRule)) {
      const validator = this.customRules.get(customRule);
      try {
        const result = await validator(value, path);
        if (!result.valid) {
          errors.push(...result.errors);
        }
        if (result.warnings) {
          warnings.push(...result.warnings);
        }
      } catch (error) {
        errors.push(`Custom validation '${customRule}' failed: ${error.message}`);
      }
    }

    return { errors, warnings };
  }

  // Format validation methods
  validateDate(value) {
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(value)) return false;
    
    const date = new Date(value + 'T00:00:00.000Z');
    return date.toISOString().substr(0, 10) === value;
  }

  validateDateTime(value) {
    try {
      const date = new Date(value);
      return !isNaN(date.getTime()) && date.toISOString() === value;
    } catch {
      return false;
    }
  }

  validateTime(value) {
    const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9](\.[0-9]{3})?$/;
    return timeRegex.test(value);
  }

  validateEmail(value) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(value);
  }

  validateUri(value) {
    try {
      new URL(value);
      return true;
    } catch {
      return false;
    }
  }

  validateUuid(value) {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(value);
  }

  validateIPv4(value) {
    const ipv4Regex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
    return ipv4Regex.test(value);
  }

  validateIPv6(value) {
    const ipv6Regex = /^(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$/;
    return ipv6Regex.test(value);
  }

  validateHostname(value) {
    const hostnameRegex = /^(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)*[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?$/;
    return hostnameRegex.test(value) && value.length <= 253;
  }

  validatePhone(value) {
    const phoneRegex = /^\+?[1-9]\d{1,14}$/;
    return phoneRegex.test(value.replace(/[\s\-\(\)]/g, ''));
  }

  validateCreditCard(value) {
    const cardRegex = /^[0-9]{13,19}$/;
    return cardRegex.test(value.replace(/[\s\-]/g, ''));
  }

  validateCurrency(value) {
    const currencyRegex = /^[A-Z]{3}$/;
    return currencyRegex.test(value);
  }

  // Utility methods
  validateType(value, expectedType) {
    const actualType = this.getValueType(value);
    
    if (Array.isArray(expectedType)) {
      return expectedType.includes(actualType);
    }
    
    if (expectedType === 'integer') {
      return typeof value === 'number' && Number.isInteger(value);
    }
    
    return actualType === expectedType;
  }

  getValueType(value) {
    if (value === null) return 'null';
    if (Array.isArray(value)) return 'array';
    return typeof value;
  }

  /**
   * Merges multiple schemas for conditional validation
   * @private
   */
  mergeSchemas(schemas) {
    const merged = {
      type: 'object',
      properties: {},
      required: []
    };

    for (const schema of schemas) {
      if (schema.type) merged.type = schema.type;
      
      if (schema.properties) {
        merged.properties = { ...merged.properties, ...schema.properties };
      }
      
      if (schema.required && Array.isArray(schema.required)) {
        merged.required = [...new Set([...merged.required, ...schema.required])];
      }
    }

    return merged;
  }

  /**
   * Registers a custom validation rule
   * @param {String} name - Rule name
   * @param {Function} validator - Validator function
   */
  registerCustomRule(name, validator) {
    this.customRules.set(name, validator);
  }
}