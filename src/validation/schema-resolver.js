import { logger } from '../utils/logger.js';

/**
 * Schema Resolver - Resolves $ref references in OpenAPI schemas
 * Handles both local (#/components/schemas/X) and nested references
 */
export class SchemaResolver {
  constructor() {
    this.logger = logger;
    this.resolvedSchemas = new Map(); // Cache for resolved schemas
  }

  /**
   * Resolves a schema that may contain $ref references
   * @param {Object} schema - The schema object that may contain $ref
   * @param {Object} components - The components object containing schema definitions
   * @returns {Object} Fully resolved schema with all $ref replaced
   */
  resolveSchema(schema, components) {
    if (!schema) return schema;

    // Check cache first
    const cacheKey = JSON.stringify(schema);
    if (this.resolvedSchemas.has(cacheKey)) {
      return this.resolvedSchemas.get(cacheKey);
    }

    try {
      const resolved = this._resolveRecursive(schema, components, new Set());
      this.resolvedSchemas.set(cacheKey, resolved);
      return resolved;
    } catch (error) {
      this.logger.error('Schema resolution failed:', error);
      throw new Error(`Failed to resolve schema: ${error.message}`);
    }
  }

  /**
   * Recursively resolves schema references
   * @private
   */
  _resolveRecursive(schema, components, visitedRefs) {
    if (!schema || typeof schema !== 'object') {
      return schema;
    }

    // Handle $ref
    if (schema.$ref) {
      const refPath = schema.$ref;
      
      // Check for circular references
      if (visitedRefs.has(refPath)) {
        throw new Error(`Circular reference detected: ${refPath}`);
      }

      const resolvedSchema = this._resolveReference(refPath, components);
      if (!resolvedSchema) {
        throw new Error(`Unable to resolve reference: ${refPath}`);
      }

      // Add to visited set for circular reference detection
      const newVisitedRefs = new Set(visitedRefs);
      newVisitedRefs.add(refPath);

      // Recursively resolve the referenced schema
      return this._resolveRecursive(resolvedSchema, components, newVisitedRefs);
    }

    // Handle arrays
    if (Array.isArray(schema)) {
      return schema.map(item => this._resolveRecursive(item, components, visitedRefs));
    }

    // Handle objects - resolve each property
    const resolved = {};
    for (const [key, value] of Object.entries(schema)) {
      if (key === 'properties' && typeof value === 'object') {
        // Resolve each property in the properties object
        resolved.properties = {};
        for (const [propName, propSchema] of Object.entries(value)) {
          resolved.properties[propName] = this._resolveRecursive(propSchema, components, visitedRefs);
        }
      } else if (key === 'items' && typeof value === 'object') {
        // Resolve array items schema
        resolved.items = this._resolveRecursive(value, components, visitedRefs);
      } else if (key === 'allOf' || key === 'oneOf' || key === 'anyOf') {
        // Resolve composition schemas
        resolved[key] = value.map(subSchema => 
          this._resolveRecursive(subSchema, components, visitedRefs)
        );
      } else if (typeof value === 'object' && value !== null) {
        // Recursively resolve nested objects
        resolved[key] = this._resolveRecursive(value, components, visitedRefs);
      } else {
        // Copy primitive values as-is
        resolved[key] = value;
      }
    }

    return resolved;
  }

  /**
   * Resolves a $ref reference path
   * @private
   */
  _resolveReference(refPath, components) {
    // Handle local references (#/components/schemas/SchemaNam)
    if (refPath.startsWith('#/')) {
      const pathParts = refPath.substring(2).split('/');
      let current = { components };

      for (const part of pathParts) {
        if (!current || typeof current !== 'object') {
          return null;
        }
        current = current[part];
      }

      return current;
    }

    // Handle external references (not implemented in this version)
    throw new Error(`External references not supported: ${refPath}`);
  }

  /**
   * Merges multiple schemas (for allOf support)
   * @param {Array} schemas - Array of schemas to merge
   * @param {Object} components - Components for reference resolution
   * @returns {Object} Merged schema
   */
  mergeSchemas(schemas, components) {
    if (!Array.isArray(schemas) || schemas.length === 0) {
      return {};
    }

    const merged = {
      type: 'object',
      properties: {},
      required: []
    };

    for (const schema of schemas) {
      const resolved = this.resolveSchema(schema, components);
      
      // Merge type
      if (resolved.type) {
        merged.type = resolved.type;
      }

      // Merge properties
      if (resolved.properties) {
        Object.assign(merged.properties, resolved.properties);
      }

      // Merge required fields
      if (resolved.required && Array.isArray(resolved.required)) {
        merged.required = [...new Set([...merged.required, ...resolved.required])];
      }

      // Merge other constraints
      for (const key of ['minimum', 'maximum', 'minLength', 'maxLength', 'pattern', 'enum']) {
        if (resolved[key] !== undefined) {
          merged[key] = resolved[key];
        }
      }
    }

    return merged;
  }

  /**
   * Extracts schema from requestBody definition
   * @param {Object} requestBody - OpenAPI requestBody definition
   * @param {Object} components - Components for reference resolution
   * @returns {Object} Resolved schema for the request body
   */
  extractRequestBodySchema(requestBody, components) {
    if (!requestBody || !requestBody.content) {
      return null;
    }

    // Prioritize application/json
    const contentType = requestBody.content['application/json'] || 
                       requestBody.content['application/x-www-form-urlencoded'] ||
                       Object.values(requestBody.content)[0];

    if (!contentType || !contentType.schema) {
      return null;
    }

    return this.resolveSchema(contentType.schema, components);
  }

  /**
   * Clears the resolved schema cache
   */
  clearCache() {
    this.resolvedSchemas.clear();
  }
}