import { logger } from '../utils/logger.js';
import { RequestBuilder } from './request-builder.js';
import axios from 'axios';

/**
 * Universal API Executor - Executes API operations dynamically from OpenAPI specs
 * Handles authentication, validation, and response formatting
 */
export class UniversalAPIExecutor {
  constructor(apiRegistry) {
    this.apiRegistry = apiRegistry;
    this.logger = logger;
    
    // Configuration
    this.defaultTimeout = 10000;
    this.maxRetries = 2;
    this.retryDelay = 1000;
  }

  /**
   * Executes an API operation with parameters
   * @param {Object} operation - Operation definition from OpenAPI spec
   * @param {Object} parameters - Parameters for the operation
   * @param {Object} options - Execution options (timeout, retries, etc.)
   * @returns {Object} Execution result
   */
  async executeOperation(operation, parameters = {}, options = {}) {
    const startTime = Date.now();
    
    try {
      // Validate operation
      if (!operation || !operation.operationId) {
        throw new Error('Invalid operation: missing operationId');
      }

      this.logger.debug(`Executing operation: ${operation.operationId}`);
      
      // Build request configuration
      const requestConfig = await this.buildRequestConfig(operation, parameters);
      
      // Execute with retry logic
      const response = await this.executeWithRetry(requestConfig, options);
      
      // Process and format response
      const result = await this.processResponse(response, operation);
      
      const duration = Date.now() - startTime;
      this.logger.debug(`Operation ${operation.operationId} completed in ${duration}ms`);
      
      return {
        success: true,
        data: result.data,
        statusCode: response.status,
        headers: response.headers,
        duration: duration,
        metadata: {
          operationId: operation.operationId,
          requestUrl: requestConfig.url,
          method: requestConfig.method
        }
      };
      
    } catch (error) {
      const duration = Date.now() - startTime;
      this.logger.error(`Operation ${operation.operationId} failed after ${duration}ms:`, error.message);
      
      throw new Error(`API execution failed: ${error.message}`);
    }
  }

  /**
   * Builds request configuration from operation and parameters
   * @private
   */
  async buildRequestConfig(operation, parameters) {
    try {
      // Use RequestBuilder static method to build the request
      const request = RequestBuilder.buildRequest(operation, parameters);
      
      // Convert to axios config format
      const config = {
        method: request.method.toLowerCase(),
        url: request.url,
        headers: request.headers || {},
        timeout: this.defaultTimeout
      };
      
      // Add request body if present
      if (request.body) {
        config.data = request.body;
      }
      
      // Add query parameters if present
      if (request.params && Object.keys(request.params).length > 0) {
        config.params = request.params;
      }
      
      return config;
      
    } catch (error) {
      throw new Error(`Failed to build request: ${error.message}`);
    }
  }

  /**
   * Executes request with retry logic
   * @private
   */
  async executeWithRetry(requestConfig, options) {
    const maxRetries = options.maxRetries || this.maxRetries;
    const timeout = options.timeout || this.defaultTimeout;
    
    // Update timeout in config
    requestConfig.timeout = timeout;
    
    let lastError;
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        if (attempt > 0) {
          this.logger.debug(`Retry attempt ${attempt} for ${requestConfig.method.toUpperCase()} ${requestConfig.url}`);
          await this.delay(this.retryDelay * attempt);
        }
        
        // Mock execution for development - replace with actual API calls
        const response = await this.mockApiExecution(requestConfig);
        return response;
        
      } catch (error) {
        lastError = error;
        
        // Don't retry on client errors (4xx)
        if (error.response && error.response.status >= 400 && error.response.status < 500) {
          throw error;
        }
        
        // Don't retry on last attempt
        if (attempt === maxRetries) {
          throw error;
        }
        
        this.logger.warn(`Attempt ${attempt + 1} failed, retrying: ${error.message}`);
      }
    }
    
    throw lastError;
  }

  /**
   * Mock API execution for development/testing
   * @private
   */
  async mockApiExecution(requestConfig) {
    // Simulate API delay
    await this.delay(Math.random() * 500 + 200);
    
    const method = requestConfig.method.toUpperCase();
    const url = requestConfig.url;
    
    // Mock responses based on operation patterns
    if (url.includes('balance') || url.includes('getBalance')) {
      return {
        status: 200,
        headers: { 'content-type': 'application/json' },
        data: {
          accountNumber: "1234567890",
          balance: "RM 5,240.50",
          currency: "MYR",
          lastUpdated: new Date().toISOString(),
          accountType: "Savings"
        }
      };
    }
    
    if (url.includes('summary') || url.includes('account')) {
      return {
        status: 200,
        headers: { 'content-type': 'application/json' },
        data: {
          accountHolder: "John Doe",
          accounts: [
            {
              accountNumber: "1234567890",
              type: "Savings",
              balance: "RM 5,240.50",
              currency: "MYR"
            },
            {
              accountNumber: "1234567891", 
              type: "Current",
              balance: "RM 1,832.25",
              currency: "MYR"
            }
          ],
          totalBalance: "RM 7,072.75",
          lastLogin: new Date().toISOString()
        }
      };
    }
    
    if (url.includes('weather') || url.includes('current')) {
      const location = requestConfig.params?.q || 'Unknown Location';
      return {
        status: 200,
        headers: { 'content-type': 'application/json' },
        data: {
          name: location,
          main: {
            temp: 28.5,
            humidity: 75,
            pressure: 1013
          },
          weather: [
            {
              main: "Clouds",
              description: "partly cloudy",
              icon: "02d"
            }
          ],
          wind: {
            speed: 3.2,
            deg: 180
          },
          dt: Math.floor(Date.now() / 1000)
        }
      };
    }
    
    if (url.includes('exchange') || url.includes('currency')) {
      return {
        status: 200,
        headers: { 'content-type': 'application/json' },
        data: {
          base: "USD",
          date: new Date().toISOString().split('T')[0],
          rates: {
            MYR: 4.65,
            SGD: 1.35,
            EUR: 0.85,
            GBP: 0.73,
            JPY: 110.25
          }
        }
      };
    }
    
    if (url.includes('transfer') && method === 'POST') {
      return {
        status: 200,
        headers: { 'content-type': 'application/json' },
        data: {
          transactionId: `TXN${Date.now()}`,
          status: "completed",
          amount: requestConfig.data?.amount || "100.00",
          currency: "MYR",
          recipient: requestConfig.data?.recipient || "Unknown",
          timestamp: new Date().toISOString(),
          fee: "1.00"
        }
      };
    }
    
    if (url.includes('location') || url.includes('places')) {
      return {
        status: 200,
        headers: { 'content-type': 'application/json' },
        data: {
          results: [
            {
              name: "Current Location",
              latitude: 3.139,
              longitude: 101.6869,
              address: "Kuala Lumpur, Malaysia",
              accuracy: "city"
            }
          ]
        }
      };
    }
    
    // Default mock response
    return {
      status: 200,
      headers: { 'content-type': 'application/json' },
      data: {
        message: "Mock API response",
        operation: requestConfig.url,
        method: method,
        timestamp: new Date().toISOString(),
        success: true
      }
    };
  }

  /**
   * Processes and formats API response
   * @private
   */
  async processResponse(response, operation) {
    try {
      // Validate response status
      if (response.status < 200 || response.status >= 300) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      // Process response data
      let processedData = response.data;
      
      // Apply operation-specific formatting if defined
      if (operation.responses && operation.responses['200']) {
        const responseSchema = operation.responses['200'].schema;
        if (responseSchema) {
          processedData = this.formatResponseData(response.data, responseSchema);
        }
      }
      
      return {
        data: processedData,
        raw: response.data,
        formatted: true
      };
      
    } catch (error) {
      throw new Error(`Response processing failed: ${error.message}`);
    }
  }

  /**
   * Formats response data according to schema
   * @private
   */
  formatResponseData(data, schema) {
    // Basic formatting - can be extended with more sophisticated schema processing
    if (typeof data === 'object' && data !== null) {
      // Ensure data structure matches expected format
      const formatted = { ...data };
      
      // Add metadata if not present
      if (!formatted.timestamp && !formatted.lastUpdated) {
        formatted.timestamp = new Date().toISOString();
      }
      
      return formatted;
    }
    
    return data;
  }

  /**
   * Utility method for delays
   * @private
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Gets execution statistics
   */
  getExecutionStats() {
    // This would normally track real statistics
    return {
      totalExecutions: 0,
      successfulExecutions: 0,
      failedExecutions: 0,
      averageResponseTime: 0,
      lastExecution: null
    };
  }

  /**
   * Validates operation parameters against schema
   * @private
   */
  validateParameters(operation, parameters) {
    if (!operation.parameters) {
      return { valid: true, errors: [] };
    }
    
    const errors = [];
    
    for (const param of operation.parameters) {
      if (param.required && !parameters.hasOwnProperty(param.name)) {
        errors.push(`Required parameter '${param.name}' is missing`);
      }
      
      if (parameters.hasOwnProperty(param.name)) {
        const value = parameters[param.name];
        const schema = param.schema || {};
        
        // Type validation
        if (schema.type) {
          const actualType = typeof value;
          const expectedType = schema.type;
          
          if (expectedType === 'integer' && !Number.isInteger(Number(value))) {
            errors.push(`Parameter '${param.name}' must be an integer`);
          } else if (expectedType !== 'integer' && actualType !== expectedType) {
            errors.push(`Parameter '${param.name}' must be of type ${expectedType}`);
          }
        }
        
        // Enum validation
        if (schema.enum && !schema.enum.includes(value)) {
          errors.push(`Parameter '${param.name}' must be one of: ${schema.enum.join(', ')}`);
        }
      }
    }
    
    return {
      valid: errors.length === 0,
      errors: errors
    };
  }
}