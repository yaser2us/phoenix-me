export class RequestBuilder {
  static buildRequest(operationDetails, userParameters, authConfig) {
    try {
      // Extract server URL from OpenAPI spec
      const baseUrl = this.extractServerUrl(operationDetails);
      
      // Map user parameters to OpenAPI parameters
      const mappedParams = this.mapParameters(userParameters, operationDetails.parameters);
      
      // Add authentication parameters to mapped params
      this.addAuthParametersToMapped(mappedParams, operationDetails, authConfig);
      
      // Validate all required parameters are present (including auth)
      const validation = this.validateParameters(mappedParams, operationDetails.parameters);
      if (!validation.valid) {
        throw new Error(`Parameter validation failed: ${validation.errors.join(', ')}`);
      }
      
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
        const paramDef = operationDetails.parameters.find(p => p.name === paramName);
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
      
      // Add authentication to request config
      this.addAuthentication(requestConfig, operationDetails, authConfig);
      
      return requestConfig;
    } catch (error) {
      throw new Error(`Failed to build request: ${error.message}`);
    }
  }

  static extractServerUrl(operationDetails) {
    if (!operationDetails.servers || operationDetails.servers.length === 0) {
      throw new Error('No servers defined in OpenAPI spec');
    }
    
    // Use the first server URL
    const serverUrl = operationDetails.servers[0].url;
    if (!serverUrl) {
      throw new Error('Server URL is empty');
    }
    
    return serverUrl;
  }

  static mapParameters(userParams, operationParams) {
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

  static getParameterAliases(paramName) {
    const aliasMap = {
      'q': ['location', 'city', 'place', 'query'],
      'appid': ['apikey', 'api_key', 'key'],
      'units': ['unit', 'temperature_unit', 'temp_unit']
    };
    
    return aliasMap[paramName] || [];
  }

  static validateParameters(userParams, operationParams) {
    const errors = [];
    const provided = Object.keys(userParams);
    
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

  static validateParameterType(value, schema, paramName) {
    try {
      switch (schema.type) {
        case 'string':
          if (typeof value !== 'string') {
            return { valid: false, error: `Parameter '${paramName}' must be a string` };
          }
          
          // Check enum values if specified
          if (schema.enum && !schema.enum.includes(value)) {
            return { 
              valid: false, 
              error: `Parameter '${paramName}' must be one of: ${schema.enum.join(', ')}` 
            };
          }
          break;
          
        case 'number':
        case 'integer':
          if (typeof value !== 'number' && !(!isNaN(parseFloat(value)) && isFinite(value))) {
            return { valid: false, error: `Parameter '${paramName}' must be a number` };
          }
          break;
          
        case 'boolean':
          if (typeof value !== 'boolean' && value !== 'true' && value !== 'false') {
            return { valid: false, error: `Parameter '${paramName}' must be a boolean` };
          }
          break;
      }
      
      return { valid: true };
    } catch (error) {
      return { valid: false, error: `Parameter validation error for '${paramName}': ${error.message}` };
    }
  }

  static addAuthParametersToMapped(mappedParams, operationDetails, authConfig) {
    // Add API key to mapped parameters for weather API
    if (operationDetails.specName === 'weather' && authConfig && authConfig.weather) {
      const weatherApiKey = authConfig.weather.apiKey;
      if (weatherApiKey && !mappedParams.appid) {
        mappedParams.appid = weatherApiKey;
      }
    }
  }

  static addAuthentication(requestConfig, operationDetails, authConfig) {
    try {
      // Handle API key authentication based on OpenAPI security schemes
      const spec = operationDetails.spec;
      
      if (spec.components && spec.components.securitySchemes) {
        for (const [schemeName, scheme] of Object.entries(spec.components.securitySchemes)) {
          if (scheme.type === 'apiKey') {
            // Get API key from auth config based on spec name
            const apiKey = this.getApiKeyForSpec(operationDetails.specName, authConfig);
            
            if (apiKey) {
              if (scheme.in === 'query') {
                requestConfig.params[scheme.name] = apiKey;
              } else if (scheme.in === 'header') {
                requestConfig.headers[scheme.name] = apiKey;
              }
            }
          }
        }
      }
      
      // Fallback: if no security scheme but we know it's weather API, add appid
      if (operationDetails.specName === 'weather' && authConfig && authConfig.weather) {
        const weatherApiKey = authConfig.weather.apiKey;
        if (weatherApiKey && !requestConfig.params.appid) {
          requestConfig.params.appid = weatherApiKey;
        }
      }
    } catch (error) {
      throw new Error(`Failed to add authentication: ${error.message}`);
    }
  }

  static getApiKeyForSpec(specName, authConfig) {
    if (!authConfig) return null;
    
    switch (specName) {
      case 'weather':
        return authConfig.weather?.apiKey;
      default:
        return null;
    }
  }
}