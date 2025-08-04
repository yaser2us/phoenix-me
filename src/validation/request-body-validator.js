import { logger } from '../utils/logger.js';
import { SchemaResolver } from './schema-resolver.js';
import { AdvancedValidator } from './advanced-validator.js';

/**
 * Request Body Validator - Validates request bodies against OpenAPI schemas
 * Provides detailed validation errors with paths for user-friendly messages
 */
export class RequestBodyValidator {
  constructor() {
    this.logger = logger;
    this.schemaResolver = new SchemaResolver();
    this.advancedValidator = new AdvancedValidator();
  }

  /**
   * Validates a request body against an operation's requestBody schema
   * @param {Object} body - The request body to validate
   * @param {Object} operationSpec - The OpenAPI operation specification
   * @param {Object} components - OpenAPI components (for schema resolution)
   * @returns {Object} Validation result with errors and missing fields
   */
  async validateRequestBody(body, operationSpec, components = {}) {
    try {
      // Check if operation has requestBody
      if (!operationSpec.requestBody) {
        return {
          valid: true,
          errors: [],
          missingFields: []
        };
      }

      // Extract and resolve schema
      const schema = this.schemaResolver.extractRequestBodySchema(
        operationSpec.requestBody,
        components
      );

      if (!schema) {
        this.logger.warn('No schema found for request body validation');
        return {
          valid: true,
          errors: [],
          missingFields: []
        };
      }

      // Check if body is required but missing
      if (operationSpec.requestBody.required && !body) {
        return {
          valid: false,
          errors: ['Request body is required but was not provided'],
          missingFields: ['<request body>']
        };
      }

      // Use advanced validator for comprehensive validation
      const advancedResult = await this.advancedValidator.validateAdvanced(body || {}, schema, '');
      
      // Extract missing fields and invalid fields from errors
      const missingFields = [];
      const invalidFields = [];
      
      for (const error of advancedResult.errors) {
        if (error.includes('is missing') || error.includes('Required')) {
          const fieldMatch = error.match(/(?:Required (?:field|property) '([^']+)'|'([^']+)' is (?:missing|required))/);
          if (fieldMatch) {
            const fieldName = fieldMatch[1] || fieldMatch[2];
            missingFields.push(fieldName);
          }
        } else {
          const pathMatch = error.match(/^([^\s]+)/);
          if (pathMatch && pathMatch[1] !== 'Value') {
            invalidFields.push({
              path: pathMatch[1],
              error: error
            });
          }
        }
      }
      
      return {
        valid: advancedResult.valid,
        errors: advancedResult.errors,
        warnings: advancedResult.warnings || [],
        missingFields: missingFields,
        invalidFields: invalidFields
      };

    } catch (error) {
      this.logger.error('Request body validation failed:', error);
      return {
        valid: false,
        errors: [`Validation error: ${error.message}`],
        missingFields: []
      };
    }
  }

  /**
   * Validates a value against a schema
   * @private
   */
  _validateAgainstSchema(value, schema, path) {
    const errors = [];
    const missingFields = [];
    const invalidFields = [];

    if (!schema) {
      return { errors, missingFields, invalidFields };
    }

    // Handle allOf, oneOf, anyOf
    if (schema.allOf) {
      const merged = this.schemaResolver.mergeSchemas(schema.allOf, {});
      return this._validateAgainstSchema(value, merged, path);
    }

    if (schema.oneOf) {
      const results = schema.oneOf.map(subSchema => 
        this._validateAgainstSchema(value, subSchema, path)
      );
      const validCount = results.filter(r => r.errors.length === 0).length;
      
      if (validCount !== 1) {
        errors.push(`${path || 'Value'} must match exactly one of the schemas`);
      }
      return { errors, missingFields, invalidFields };
    }

    if (schema.anyOf) {
      const results = schema.anyOf.map(subSchema => 
        this._validateAgainstSchema(value, subSchema, path)
      );
      const hasValid = results.some(r => r.errors.length === 0);
      
      if (!hasValid) {
        errors.push(`${path || 'Value'} must match at least one of the schemas`);
      }
      return { errors, missingFields, invalidFields };
    }

    // Type validation
    if (schema.type) {
      const typeResult = this._validateType(value, schema.type, path);
      if (!typeResult.valid) {
        errors.push(typeResult.error);
        invalidFields.push({ path, error: typeResult.error });
      }
    }

    // Object validation
    if (schema.type === 'object' && value !== null && typeof value === 'object') {
      // Check required properties
      if (schema.required && Array.isArray(schema.required)) {
        for (const requiredProp of schema.required) {
          if (!(requiredProp in value) || value[requiredProp] === undefined) {
            const fieldPath = path ? `${path}.${requiredProp}` : requiredProp;
            errors.push(`Required field '${fieldPath}' is missing`);
            missingFields.push(fieldPath);
          }
        }
      }

      // Validate properties
      if (schema.properties) {
        for (const [propName, propSchema] of Object.entries(schema.properties)) {
          if (propName in value) {
            const propPath = path ? `${path}.${propName}` : propName;
            const propResult = this._validateAgainstSchema(
              value[propName],
              propSchema,
              propPath
            );
            errors.push(...propResult.errors);
            missingFields.push(...propResult.missingFields);
            invalidFields.push(...propResult.invalidFields);
          }
        }
      }

      // Check for additional properties
      if (schema.additionalProperties === false) {
        const definedProps = new Set(Object.keys(schema.properties || {}));
        const extraProps = Object.keys(value).filter(k => !definedProps.has(k));
        if (extraProps.length > 0) {
          errors.push(`Unexpected properties: ${extraProps.join(', ')}`);
        }
      }
    }

    // Array validation
    if (schema.type === 'array' && Array.isArray(value)) {
      if (schema.minItems !== undefined && value.length < schema.minItems) {
        errors.push(`${path || 'Array'} must have at least ${schema.minItems} items`);
      }
      if (schema.maxItems !== undefined && value.length > schema.maxItems) {
        errors.push(`${path || 'Array'} must have at most ${schema.maxItems} items`);
      }
      if (schema.uniqueItems && !this._hasUniqueItems(value)) {
        errors.push(`${path || 'Array'} must have unique items`);
      }

      // Validate array items
      if (schema.items) {
        value.forEach((item, index) => {
          const itemPath = `${path}[${index}]`;
          const itemResult = this._validateAgainstSchema(item, schema.items, itemPath);
          errors.push(...itemResult.errors);
          missingFields.push(...itemResult.missingFields);
          invalidFields.push(...itemResult.invalidFields);
        });
      }
    }

    // String validation
    if (schema.type === 'string' && typeof value === 'string') {
      if (schema.minLength !== undefined && value.length < schema.minLength) {
        errors.push(`${path || 'String'} must be at least ${schema.minLength} characters`);
      }
      if (schema.maxLength !== undefined && value.length > schema.maxLength) {
        errors.push(`${path || 'String'} must be at most ${schema.maxLength} characters`);
      }
      if (schema.pattern) {
        const regex = new RegExp(schema.pattern);
        if (!regex.test(value)) {
          errors.push(`${path || 'String'} does not match pattern: ${schema.pattern}`);
          invalidFields.push({ path, error: `Must match pattern: ${schema.pattern}` });
        }
      }
      if (schema.enum && !schema.enum.includes(value)) {
        errors.push(`${path || 'Value'} must be one of: ${schema.enum.join(', ')}`);
        invalidFields.push({ path, error: `Must be one of: ${schema.enum.join(', ')}` });
      }
    }

    // Number validation
    if ((schema.type === 'number' || schema.type === 'integer') && typeof value === 'number') {
      if (schema.type === 'integer' && !Number.isInteger(value)) {
        errors.push(`${path || 'Value'} must be an integer`);
      }
      if (schema.minimum !== undefined && value < schema.minimum) {
        errors.push(`${path || 'Value'} must be >= ${schema.minimum}`);
      }
      if (schema.maximum !== undefined && value > schema.maximum) {
        errors.push(`${path || 'Value'} must be <= ${schema.maximum}`);
      }
      if (schema.exclusiveMinimum !== undefined && value <= schema.exclusiveMinimum) {
        errors.push(`${path || 'Value'} must be > ${schema.exclusiveMinimum}`);
      }
      if (schema.exclusiveMaximum !== undefined && value >= schema.exclusiveMaximum) {
        errors.push(`${path || 'Value'} must be < ${schema.exclusiveMaximum}`);
      }
      if (schema.multipleOf !== undefined && value % schema.multipleOf !== 0) {
        errors.push(`${path || 'Value'} must be a multiple of ${schema.multipleOf}`);
      }
    }

    return { errors, missingFields, invalidFields };
  }

  /**
   * Validates value type
   * @private
   */
  _validateType(value, expectedType, path) {
    const actualType = this._getType(value);
    
    if (expectedType === 'integer') {
      if (typeof value !== 'number' || !Number.isInteger(value)) {
        return {
          valid: false,
          error: `${path || 'Value'} must be an integer, got ${actualType}`
        };
      }
      return { valid: true };
    }

    if (actualType !== expectedType) {
      return {
        valid: false,
        error: `${path || 'Value'} must be of type ${expectedType}, got ${actualType}`
      };
    }

    return { valid: true };
  }

  /**
   * Gets the JSON Schema type of a value
   * @private
   */
  _getType(value) {
    if (value === null) return 'null';
    if (Array.isArray(value)) return 'array';
    return typeof value;
  }

  /**
   * Checks if array has unique items
   * @private
   */
  _hasUniqueItems(array) {
    const seen = new Set();
    for (const item of array) {
      const key = JSON.stringify(item);
      if (seen.has(key)) return false;
      seen.add(key);
    }
    return true;
  }

  /**
   * Builds a user-friendly error summary
   * @param {Object} validationResult - The validation result
   * @returns {String} Human-readable error summary
   */
  buildErrorSummary(validationResult) {
    if (validationResult.valid) {
      return '';
    }

    const parts = [];

    if (validationResult.missingFields.length > 0) {
      parts.push(`Missing required fields: ${validationResult.missingFields.join(', ')}`);
    }

    if (validationResult.invalidFields && validationResult.invalidFields.length > 0) {
      const invalidSummary = validationResult.invalidFields
        .map(f => `${f.path}: ${f.error}`)
        .join('; ');
      parts.push(`Invalid fields: ${invalidSummary}`);
    }

    if (validationResult.errors.length > 0 && parts.length === 0) {
      parts.push(...validationResult.errors);
    }

    return parts.join('. ');
  }
}