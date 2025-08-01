import { logger } from '../utils/logger.js';
import { AutoDataExtractor } from './auto-data-extractor.js';

/**
 * Phase 4.8 Checkpoint 3: Schema-Based Response Validator
 * Validates API responses against OpenAPI schemas
 */
export class SchemaResponseValidator {
  constructor() {
    this.autoExtractor = new AutoDataExtractor();
    logger.info('SchemaResponseValidator initialized with automatic data extraction');
  }

  /**
   * Validate response against OpenAPI operation schema
   */
  validateResponse(operation, responseData, statusCode = 200) {
    try {
      const result = {
        valid: false,
        errors: [],
        extractedData: null,
        rawData: responseData
      };

      // Get response schema for status code
      const responseSchema = this.getResponseSchema(operation, statusCode);
      if (!responseSchema) {
        result.errors.push(`No schema defined for status code ${statusCode}`);
        return result;
      }

      // Validate response structure
      const validation = this.validateAgainstSchema(responseData, responseSchema, 'response');
      result.valid = validation.valid;
      result.errors = validation.errors;

      // Extract data if validation passes or even if it doesn't (intelligent extraction)
      // Phase 4.8 Checkpoint 4: Use automatic data extraction
      const extraction = this.autoExtractor.extractData(responseData, operation, { statusCode });
      result.extractedData = extraction.extracted;
      result.extractionConfidence = extraction.confidence;
      result.extractionRules = extraction.rules;
      result.extractionMetadata = extraction.metadata;

      logger.debug('Response validation complete', {
        operationId: operation.operationId,
        statusCode,
        valid: result.valid,
        errorCount: result.errors.length
      });

      return result;

    } catch (error) {
      logger.error('Response validation failed', {
        operationId: operation?.operationId,
        error: error.message
      });

      return {
        valid: false,
        errors: [`Validation error: ${error.message}`],
        extractedData: null,
        rawData: responseData
      };
    }
  }

  /**
   * Get response schema for specific status code
   */
  getResponseSchema(operation, statusCode) {
    const responses = operation.responses;
    if (!responses) return null;

    // Try exact status code match first
    let response = responses[statusCode.toString()];
    
    // Try default if no exact match
    if (!response) {
      response = responses.default;
    }

    // Try wildcard patterns (2XX, 4XX, etc.)
    if (!response) {
      const statusPattern = `${Math.floor(statusCode / 100)}XX`;
      response = responses[statusPattern];
    }

    if (!response || !response.content) return null;

    // Get first content type (usually application/json)
    const contentType = Object.keys(response.content)[0];
    return response.content[contentType]?.schema;
  }

  /**
   * Validate data against OpenAPI schema
   */
  validateAgainstSchema(data, schema, path = 'root') {
    const errors = [];

    if (!schema) {
      return { valid: true, errors };
    }

    // Handle different schema types
    switch (schema.type) {
      case 'object':
        return this.validateObject(data, schema, path);
      case 'array':
        return this.validateArray(data, schema, path);
      case 'string':
        return this.validateString(data, schema, path);
      case 'number':
      case 'integer':
        return this.validateNumber(data, schema, path);
      case 'boolean':
        return this.validateBoolean(data, schema, path);
      default:
        // Allow any type if not specified
        return { valid: true, errors };
    }
  }

  /**
   * Validate object against schema
   */
  validateObject(data, schema, path) {
    const errors = [];

    if (data === null || data === undefined) {
      if (schema.required || schema.nullable === false) {
        errors.push(`${path}: object is required but got ${data}`);
      }
      return { valid: errors.length === 0, errors };
    }

    if (typeof data !== 'object' || Array.isArray(data)) {
      errors.push(`${path}: expected object but got ${typeof data}`);
      return { valid: false, errors };
    }

    // Validate required properties
    if (schema.required) {
      for (const prop of schema.required) {
        if (!(prop in data)) {
          errors.push(`${path}.${prop}: required property missing`);
        }
      }
    }

    // Validate properties
    if (schema.properties) {
      for (const [prop, propSchema] of Object.entries(schema.properties)) {
        if (prop in data) {
          const propValidation = this.validateAgainstSchema(data[prop], propSchema, `${path}.${prop}`);
          errors.push(...propValidation.errors);
        }
      }
    }

    return { valid: errors.length === 0, errors };
  }

  /**
   * Validate array against schema
   */
  validateArray(data, schema, path) {
    const errors = [];

    if (!Array.isArray(data)) {
      errors.push(`${path}: expected array but got ${typeof data}`);
      return { valid: false, errors };
    }

    // Validate array items
    if (schema.items) {
      data.forEach((item, index) => {
        const itemValidation = this.validateAgainstSchema(item, schema.items, `${path}[${index}]`);
        errors.push(...itemValidation.errors);
      });
    }

    // Validate array constraints
    if (schema.minItems && data.length < schema.minItems) {
      errors.push(`${path}: array has ${data.length} items but minimum is ${schema.minItems}`);
    }

    if (schema.maxItems && data.length > schema.maxItems) {
      errors.push(`${path}: array has ${data.length} items but maximum is ${schema.maxItems}`);
    }

    return { valid: errors.length === 0, errors };
  }

  /**
   * Validate string against schema
   */
  validateString(data, schema, path) {
    const errors = [];

    if (typeof data !== 'string') {
      errors.push(`${path}: expected string but got ${typeof data}`);
      return { valid: false, errors };
    }

    // Validate string constraints
    if (schema.minLength && data.length < schema.minLength) {
      errors.push(`${path}: string length ${data.length} is less than minimum ${schema.minLength}`);
    }

    if (schema.maxLength && data.length > schema.maxLength) {
      errors.push(`${path}: string length ${data.length} exceeds maximum ${schema.maxLength}`);
    }

    if (schema.pattern) {
      const regex = new RegExp(schema.pattern);
      if (!regex.test(data)) {
        errors.push(`${path}: string does not match pattern ${schema.pattern}`);
      }
    }

    if (schema.enum && !schema.enum.includes(data)) {
      errors.push(`${path}: value "${data}" is not in allowed values: ${schema.enum.join(', ')}`);
    }

    return { valid: errors.length === 0, errors };
  }

  /**
   * Validate number/integer against schema
   */
  validateNumber(data, schema, path) {
    const errors = [];

    if (typeof data !== 'number') {
      errors.push(`${path}: expected number but got ${typeof data}`);
      return { valid: false, errors };
    }

    if (schema.type === 'integer' && !Number.isInteger(data)) {
      errors.push(`${path}: expected integer but got ${data}`);
    }

    if (schema.minimum !== undefined && data < schema.minimum) {
      errors.push(`${path}: value ${data} is less than minimum ${schema.minimum}`);
    }

    if (schema.maximum !== undefined && data > schema.maximum) {
      errors.push(`${path}: value ${data} exceeds maximum ${schema.maximum}`);
    }

    return { valid: errors.length === 0, errors };
  }

  /**
   * Validate boolean against schema
   */
  validateBoolean(data, schema, path) {
    const errors = [];

    if (typeof data !== 'boolean') {
      errors.push(`${path}: expected boolean but got ${typeof data}`);
    }

    return { valid: errors.length === 0, errors };
  }

  /**
   * Extract meaningful data from validated response
   */
  extractData(responseData, schema, operationId) {
    try {
      // Basic extraction - return the response as-is if valid
      let extractedData = responseData;

      // Operation-specific extraction rules
      if (operationId) {
        extractedData = this.applyOperationSpecificExtraction(responseData, operationId);
      }

      // Schema-based extraction
      if (schema && schema.properties) {
        const schemaBasedData = {};
        
        // Extract based on schema properties
        for (const [key, propSchema] of Object.entries(schema.properties)) {
          if (key in responseData) {
            schemaBasedData[key] = responseData[key];
          }
        }

        // Merge schema-based with operation-specific
        extractedData = { ...schemaBasedData, ...extractedData };
      }

      return extractedData;

    } catch (error) {
      logger.error('Data extraction failed', {
        operationId,
        error: error.message
      });
      return responseData; // Return raw data if extraction fails
    }
  }

  /**
   * Apply operation-specific data extraction rules
   */
  applyOperationSpecificExtraction(responseData, operationId) {
    const extracted = {};

    switch (operationId) {
      case 'get_banking_getBalance':
        if (responseData.result) {
          extracted.balance = responseData.result.balance;
          extracted.currentBalance = responseData.result.currentBalance;
          extracted.accountName = responseData.result.name;
          extracted.accountCode = responseData.result.code;
        }
        break;

      case 'get_banking_summary':
        if (responseData.result) {
          extracted.accountCount = responseData.result.accountListings?.length || 0;
          extracted.totalBalance = responseData.result.total;
          extracted.accounts = responseData.result.accountListings;
        }
        break;

      case 'get_payment_favList_1':
        if (responseData.result) {
          extracted.favoriteCount = responseData.result.favList?.length || 0;
          extracted.favorites = responseData.result.favList;
          extracted.paymentTypes = responseData.result.favList?.map(fav => fav.paymentType);
        }
        break;

      case 'post_bill_getBillsTxnHistory':
        if (responseData.statusCode === "0000") {
          extracted.transactionHistory = responseData.lastThreePayment || [];
          extracted.effectiveDates = responseData.populateEffectiveDateList || [];
          extracted.companyInfo = responseData.ebppData?.companyHeader;
        }
        break;

      default:
        // Return original data for unknown operations
        return responseData;
    }

    return extracted;
  }

  /**
   * Create validation report
   */
  createValidationReport(operation, responseData, statusCode, validationResult) {
    return {
      operationId: operation.operationId,
      statusCode,
      timestamp: new Date().toISOString(),
      validation: {
        valid: validationResult.valid,
        errorCount: validationResult.errors.length,
        errors: validationResult.errors
      },
      data: {
        hasExtractedData: !!validationResult.extractedData,
        extractedKeys: validationResult.extractedData ? Object.keys(validationResult.extractedData) : [],
        rawDataSize: JSON.stringify(responseData).length
      },
      schema: {
        hasResponseSchema: !!this.getResponseSchema(operation, statusCode),
        responseSchemaKeys: this.getResponseSchemaKeys(operation, statusCode)
      }
    };
  }

  /**
   * Get response schema property keys for reporting
   */
  getResponseSchemaKeys(operation, statusCode) {
    const schema = this.getResponseSchema(operation, statusCode);
    if (!schema || !schema.properties) return [];
    return Object.keys(schema.properties);
  }
}

export default SchemaResponseValidator;