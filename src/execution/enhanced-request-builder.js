import { RequestBodyValidator } from '../validation/request-body-validator.js';
import { logger } from '../utils/logger.js';

/**
 * Enhanced Request Builder - Builds HTTP requests with comprehensive validation
 * Includes support for request body validation and missing field detection
 */
export class EnhancedRequestBuilder {
  constructor() {
    this.bodyValidator = new RequestBodyValidator();
    this.logger = logger;
  }

  /**
   * Builds a request with enhanced validation
   * @param {Object} operationDetails - OpenAPI operation details
   * @param {Object} userParameters - User-provided parameters
   * @param {Object} authConfig - Authentication configuration
   * @param {Object} components - OpenAPI components (for schema resolution)
   * @returns {Object} Build result with validation status
   */
  async buildRequest(operationDetails, userParameters, authConfig, components = {}) {
    try {
      // Extract server URL from OpenAPI spec
      const baseUrl = this.extractServerUrl(operationDetails);
      
      // Separate body parameters from other parameters
      const { bodyData, otherParams } = this.separateBodyAndParams(userParameters);
      
      // Map user parameters to OpenAPI parameters
      const mappedParams = this.mapParameters(otherParams, operationDetails.parameters || []);
      
      // Add authentication parameters to mapped params
      this.addAuthParametersToMapped(mappedParams, operationDetails, authConfig);
      
      // Validate all required parameters are present (including auth)
      const paramValidation = this.validateParameters(mappedParams, operationDetails.parameters || []);
      
      // Build the request configuration
      const requestConfig = {
        method: operationDetails.method.toLowerCase(),
        url: baseUrl + operationDetails.path,
        params: {},
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'MCP-Gateway/1.0.0'
        },
        timeout: 10000
      };
      
      // Add parameters based on their location (query, path, header)
      for (const [paramName, paramValue] of Object.entries(mappedParams)) {
        const paramDef = (operationDetails.parameters || []).find(p => p.name === paramName);
        if (!paramDef) continue;
        
        switch (paramDef.in) {
          case 'query':
            requestConfig.params[paramName] = paramValue;
            break;
          case 'path':
            requestConfig.url = requestConfig.url.replace(`{${paramName}}`, encodeURIComponent(paramValue));
            break;
          case 'header':
            requestConfig.headers[paramName] = paramValue;
            break;
        }
      }
      
      // Handle request body for POST/PUT/PATCH requests
      let bodyValidation = { valid: true, errors: [], missingFields: [] };
      if (operationDetails.requestBody) {
        // Validate request body
        bodyValidation = await this.bodyValidator.validateRequestBody(
          bodyData,
          operationDetails,
          components
        );
        
        if (bodyValidation.valid && bodyData) {
          requestConfig.data = bodyData;
          requestConfig.headers['Content-Type'] = 'application/json';
        }
      }
      
      // Add authentication to request config
      this.addAuthentication(requestConfig, operationDetails, authConfig);
      
      // Combine validation results
      const allErrors = [...paramValidation.errors, ...bodyValidation.errors];
      const allMissingFields = [
        ...this.getMissingParameterFields(paramValidation, operationDetails.parameters || []),
        ...bodyValidation.missingFields
      ];
      
      if (allErrors.length > 0 || allMissingFields.length > 0) {
        return {
          success: false,
          errors: allErrors,
          missingFields: allMissingFields,
          needsUserInput: allMissingFields.length > 0,
          requestConfig: requestConfig,
          validation: {
            parameters: paramValidation,
            body: bodyValidation
          }
        };
      }
      
      return {
        success: true,
        requestConfig: requestConfig,
        validation: {
          parameters: paramValidation,
          body: bodyValidation
        }
      };
      
    } catch (error) {
      this.logger.error(`Failed to build request: ${error.message}`);
      return {
        success: false,
        errors: [error.message],
        missingFields: [],
        needsUserInput: false
      };
    }
  }

  /**
   * Separates body data from other parameters
   * @private
   */
  separateBodyAndParams(userParameters) {
    const bodyKeys = ['body', 'data', 'payload', 'requestBody'];
    let bodyData = null;
    const otherParams = {};
    
    for (const [key, value] of Object.entries(userParameters)) {
      if (bodyKeys.includes(key)) {
        bodyData = value;
      } else {
        otherParams[key] = value;
      }
    }
    
    // If no explicit body key but we have object data that doesn't match params
    // it might be the body
    if (!bodyData && typeof userParameters === 'object') {
      // Check if this looks like a request body (has properties not in param list)
      const hasNonParamKeys = Object.keys(userParameters).some(key => 
        !['q', 'units', 'appid', 'location', 'currency', 'from', 'to'].includes(key)
      );
      
      if (hasNonParamKeys) {
        // Assume the entire object is the body for POST requests
        bodyData = userParameters;
      }
    }
    
    return { bodyData, otherParams };
  }

  /**
   * Gets missing parameter fields from validation
   * @private
   */
  getMissingParameterFields(paramValidation, parameterDefs) {
    const missingFields = [];
    
    if (!paramValidation.valid) {
      // Extract parameter names from error messages
      for (const error of paramValidation.errors) {
        const match = error.match(/Required parameter '([^']+)' is missing/);
        if (match) {
          missingFields.push(match[1]);
        }
      }
    }
    
    return missingFields;
  }

  // Delegate to existing RequestBuilder methods
  extractServerUrl(operationDetails) {
    // Same implementation as original
    if (!operationDetails.servers || operationDetails.servers.length === 0) {
      throw new Error('No servers defined in OpenAPI spec');
    }
    
    const serverUrl = operationDetails.servers[0].url;
    if (!serverUrl) {
      throw new Error('Server URL is empty');
    }
    
    return serverUrl;
  }

  mapParameters(userParams, operationParams) {
    const mapped = {};
    
    // Direct mapping for exact parameter names
    for (const paramDef of operationParams) {
      const paramName = paramDef.name;
      
      if (userParams.hasOwnProperty(paramName)) {
        mapped[paramName] = userParams[paramName];
      } else {
        // Handle common parameter aliases
        const aliases = this.getParameterAliases(paramName);
        for (const alias of aliases) {
          if (userParams.hasOwnProperty(alias)) {
            mapped[paramName] = userParams[alias];
            break;
          }
        }
      }
      
      // Apply default values if parameter not provided and default exists
      if (!mapped.hasOwnProperty(paramName) && paramDef.schema && paramDef.schema.default !== undefined) {
        mapped[paramName] = paramDef.schema.default;
      }
    }
    
    return mapped;
  }

  getParameterAliases(paramName) {
    const aliasMap = {
      'q': ['location', 'city', 'place', 'query'],
      'appid': ['apikey', 'api_key', 'key'],
      'units': ['unit', 'temperature_unit', 'temp_unit']
    };
    
    return aliasMap[paramName] || [];
  }

  validateParameters(userParams, operationParams) {
    const errors = [];
    
    // Check all required parameters are present
    for (const paramDef of operationParams) {
      if (paramDef.required && !userParams.hasOwnProperty(paramDef.name)) {
        errors.push(`Required parameter '${paramDef.name}' is missing`);
        continue;
      }
      
      const paramValue = userParams[paramDef.name];
      if (paramValue === undefined || paramValue === null) {
        continue;
      }
      
      // Validate parameter types against OpenAPI schemas
      if (paramDef.schema) {
        const typeValidation = this.validateParameterType(paramValue, paramDef.schema, paramDef.name);
        if (!typeValidation.valid) {
          errors.push(typeValidation.error);
        }
      }
    }
    
    return {
      valid: errors.length === 0,
      errors: errors
    };
  }

  validateParameterType(value, schema, paramName) {
    try {
      switch (schema.type) {
        case 'string':
          if (typeof value !== 'string') {
            return { valid: false, error: `Parameter '${paramName}' must be a string` };
          }
          break;
        case 'number':
        case 'integer':
          if (typeof value !== 'number' && isNaN(Number(value))) {
            return { valid: false, error: `Parameter '${paramName}' must be a number` };
          }
          break;
        case 'boolean':
          if (typeof value !== 'boolean' && !['true', 'false'].includes(String(value).toLowerCase())) {
            return { valid: false, error: `Parameter '${paramName}' must be a boolean` };
          }
          break;
        case 'array':
          if (!Array.isArray(value)) {
            return { valid: false, error: `Parameter '${paramName}' must be an array` };
          }
          break;
      }
      
      return { valid: true };
    } catch (error) {
      return { valid: false, error: `Parameter '${paramName}' validation error: ${error.message}` };
    }
  }

  addAuthParametersToMapped(mappedParams, operationDetails, authConfig) {
    // Handle API key authentication
    if (operationDetails.security) {
      for (const securityReq of operationDetails.security) {
        for (const [schemeName, scopes] of Object.entries(securityReq)) {
          const scheme = operationDetails.securitySchemes?.[schemeName];
          
          if (scheme && scheme.type === 'apiKey') {
            const apiKey = authConfig[schemeName] || authConfig.apiKey;
            if (apiKey) {
              if (scheme.in === 'query') {
                mappedParams[scheme.name] = apiKey;
              }
              // Header auth is handled separately in addAuthentication
            }
          }
        }
      }
    }
  }

  addAuthentication(requestConfig, operationDetails, authConfig) {
    if (!operationDetails.security || !authConfig) return;
    
    for (const securityReq of operationDetails.security) {
      for (const [schemeName, scopes] of Object.entries(securityReq)) {
        const scheme = operationDetails.securitySchemes?.[schemeName];
        
        if (scheme) {
          switch (scheme.type) {
            case 'apiKey':
              if (scheme.in === 'header') {
                const apiKey = authConfig[schemeName] || authConfig.apiKey;
                if (apiKey) {
                  requestConfig.headers[scheme.name] = apiKey;
                }
              }
              break;
              
            case 'http':
              if (scheme.scheme === 'bearer') {
                const token = authConfig.bearerToken || authConfig.token;
                if (token) {
                  requestConfig.headers['Authorization'] = `Bearer ${token}`;
                }
              } else if (scheme.scheme === 'basic') {
                const username = authConfig.username;
                const password = authConfig.password;
                if (username && password) {
                  const credentials = Buffer.from(`${username}:${password}`).toString('base64');
                  requestConfig.headers['Authorization'] = `Basic ${credentials}`;
                }
              }
              break;
          }
        }
      }
    }
  }
}