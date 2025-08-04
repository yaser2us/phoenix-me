import { logger } from '../utils/logger.js';

/**
 * Phase 4.8 Checkpoint 2: Schema-Based Request Builder
 * Builds request bodies from OpenAPI schemas
 */
export class SchemaRequestBuilder {
  constructor() {
    logger.info('SchemaRequestBuilder initialized');
  }

  /**
   * Build request structure from OpenAPI operation and parameters
   */
  buildRequest(operation, userParameters = {}) {
    const request = {
      method: operation.method || 'GET',
      path: operation.path,
      headers: {},
      queryParams: {},
      pathParams: {},
      body: null
    };

    // Process operation parameters (path, query, header)
    if (operation.parameters) {
      for (const param of operation.parameters) {
        const value = userParameters[param.name];
        
        if (value !== undefined || param.required) {
          switch (param.in) {
            case 'path':
              request.pathParams[param.name] = value || param.default || '';
              break;
            case 'query':
              if (value !== undefined) {
                request.queryParams[param.name] = value;
              }
              break;
            case 'header':
              request.headers[param.name] = value || param.default || '';
              break;
          }
        }
      }
    }

    // Process request body if present
    if (operation.requestBody && request.method !== 'GET') {
      const contentType = Object.keys(operation.requestBody.content || {})[0];
      if (contentType && operation.requestBody.content[contentType].schema) {
        request.headers['Content-Type'] = contentType;
        request.body = this.buildBodyFromSchema(
          operation.requestBody.content[contentType].schema,
          userParameters
        );
      }
    }

    return request;
  }

  /**
   * Build request body from OpenAPI schema
   */
  buildBodyFromSchema(schema, parameters = {}) {
    if (!schema) return null;

    // Handle different schema types
    switch (schema.type) {
      case 'object':
        return this.buildObjectFromSchema(schema, parameters);
      case 'array':
        return this.buildArrayFromSchema(schema, parameters);
      default:
        // For primitive types, return the value directly
        return parameters[schema.title] || parameters.value || schema.default || null;
    }
  }

  /**
   * Build object from schema properties
   */
  buildObjectFromSchema(schema, parameters = {}) {
    const obj = {};

    // Process required fields first
    if (schema.required) {
      for (const field of schema.required) {
        if (parameters[field] !== undefined) {
          obj[field] = parameters[field];
        } else if (schema.properties && schema.properties[field]) {
          // Use default value if available
          const fieldSchema = schema.properties[field];
          if (fieldSchema.default !== undefined) {
            obj[field] = fieldSchema.default;
          } else if (fieldSchema.example !== undefined) {
            // Use example as fallback for required fields
            obj[field] = fieldSchema.example;
          }
        }
      }
    }

    // Process all properties
    if (schema.properties) {
      for (const [key, propSchema] of Object.entries(schema.properties)) {
        if (parameters[key] !== undefined && obj[key] === undefined) {
          obj[key] = this.convertValue(parameters[key], propSchema);
        }
      }
    }

    // Handle additional properties
    if (schema.additionalProperties) {
      // Add any parameters not in the schema
      for (const [key, value] of Object.entries(parameters)) {
        if (!schema.properties || !schema.properties[key]) {
          obj[key] = value;
        }
      }
    }

    return obj;
  }

  /**
   * Build array from schema
   */
  buildArrayFromSchema(schema, parameters = {}) {
    // If parameters is already an array, use it
    if (Array.isArray(parameters)) {
      return parameters;
    }

    // If parameters has an 'items' property that's an array
    if (parameters.items && Array.isArray(parameters.items)) {
      return parameters.items;
    }

    // Otherwise, wrap single value in array
    if (parameters.value !== undefined) {
      return [parameters.value];
    }

    return [];
  }

  /**
   * Convert value based on schema type
   */
  convertValue(value, schema) {
    if (value === null || value === undefined) {
      return value;
    }

    switch (schema.type) {
      case 'integer':
        return parseInt(value, 10);
      case 'number':
        return parseFloat(value);
      case 'boolean':
        return value === true || value === 'true' || value === '1';
      case 'array':
        return Array.isArray(value) ? value : [value];
      case 'object':
        return typeof value === 'object' ? value : { value };
      default:
        return String(value);
    }
  }

  /**
   * Build path with parameter substitution
   */
  buildPath(pathTemplate, pathParams = {}) {
    let path = pathTemplate;
    
    // Replace path parameters
    for (const [key, value] of Object.entries(pathParams)) {
      path = path.replace(`{${key}}`, encodeURIComponent(value));
    }
    
    return path;
  }

  /**
   * Validate request against schema
   */
  validateRequest(request, operation) {
    const errors = [];

    // Validate required parameters
    if (operation.parameters) {
      for (const param of operation.parameters) {
        if (param.required) {
          let value;
          switch (param.in) {
            case 'path':
              value = request.pathParams[param.name];
              break;
            case 'query':
              value = request.queryParams[param.name];
              break;
            case 'header':
              value = request.headers[param.name];
              break;
          }
          
          if (value === undefined || value === null || value === '') {
            errors.push(`Required parameter '${param.name}' (in ${param.in}) is missing`);
          }
        }
      }
    }

    // Validate required request body fields
    if (operation.requestBody && operation.requestBody.required && !request.body) {
      errors.push('Request body is required but not provided');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }
}

export default SchemaRequestBuilder;