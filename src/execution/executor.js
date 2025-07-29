import axios from 'axios';
import { RequestBuilder } from './request-builder.js';
import { MaybankAdapter } from '../adapters/maybank-adapter.js';
import { JWTManager } from '../authentication/jwt-manager.js';
import { logger } from '../utils/logger.js';

export class ApiExecutor {
  constructor(registry, authConfig) {
    this.registry = registry;
    this.authConfig = authConfig;
    this.httpClient = axios.create({
      timeout: 30000,  // 30 second timeout for banking operations
      headers: {
        'User-Agent': 'MCP-Gateway/1.0.0'
      }
    });
    
    // Initialize Maybank adapter and JWT manager
    this.maybankAdapter = new MaybankAdapter();
    this.jwtManager = new JWTManager();
    
    logger.info('ApiExecutor initialized with Maybank support');
  }

  async executeOperation(operationId, userParameters, options = {}) {
    try {
      logger.debug('Executing operation', { operationId, userParameters });
      
      // Get operation details from registry
      const operationDetails = this.registry.getOperationDetails(operationId);
      if (!operationDetails) {
        throw new Error(`Operation '${operationId}' not found in registry`);
      }
      
      // Check if this is a Maybank operation
      const isMaybankOperation = this.isMaybankOperation(operationDetails);
      
      let requestConfig;
      
      if (isMaybankOperation) {
        // Use Maybank adapter for Maybank operations
        requestConfig = await this.prepareMaybankRequest(operationId, userParameters, options);
      } else {
        // Use standard RequestBuilder for other operations
        requestConfig = RequestBuilder.buildRequest(operationDetails, userParameters, this.authConfig);
      }
      
      logger.debug('Built request config', {
        method: requestConfig.method,
        url: requestConfig.url,
        hasAuth: !!requestConfig.headers?.Authorization
      });
      
      // Execute HTTP request with proper error handling
      const apiResponse = await this.makeHttpRequest(requestConfig);
      
      // Log raw API response using logger instead of console.log
      if (isMaybankOperation) {
        logger.debug('RAW MAYBANK API RESPONSE', {
          operationId: operationId,
          status: apiResponse.status,
          headers: apiResponse.headers,
          data: apiResponse.data
        });
      }

      // Format response for MCP return
      let formattedResponse;
      if (isMaybankOperation) {
        formattedResponse = await this.formatMaybankResponse(apiResponse, operationId);
      } else {
        formattedResponse = this.formatResponse(apiResponse, operationDetails);
      }
      
      return {
        success: true,
        data: formattedResponse,
        operationId: operationId,
        timestamp: new Date().toISOString(),
        apiType: isMaybankOperation ? 'maybank' : 'standard'
      };
      
    } catch (error) {
      // Check if this is a Maybank operation for specialized error handling
      const operationDetails = this.registry.getOperationDetails(operationId);
      const isMaybankOperation = operationDetails && this.isMaybankOperation(operationDetails);
      
      if (isMaybankOperation) {
        return this.handleMaybankError(error, operationId);
      } else {
        return this.handleApiError(error, operationId);
      }
    }
  }

  async makeHttpRequest(requestConfig) {
    try {
      logger.info('Making HTTP request', {
        method: requestConfig.method?.toUpperCase(),
        url: requestConfig.url,
        hasAuth: !!(requestConfig.headers?.Authorization || requestConfig.headers?.authorization),
        headerCount: Object.keys(requestConfig.headers || {}).length,
        hasBody: !!requestConfig.data
      });
      
      // Log full request details in debug mode
      if (process.env.LOG_LEVEL === 'debug' && process.env.FULL_DEBUG === 'true') {
        logger.debug('Full request details (DEBUG MODE)', {
          method: requestConfig.method,
          url: requestConfig.url,
          headers: requestConfig.headers,
          data: requestConfig.data,
          params: requestConfig.params
        });
      }
      
      const response = await this.httpClient.request(requestConfig);
      
      logger.info('HTTP response received', {
        status: response.status,
        statusText: response.statusText,
        contentType: response.headers?.['content-type'],
        contentLength: response.headers?.['content-length'],
        hasData: !!response.data
      });
      
      // Log response data for debugging (be careful with sensitive data)
      if (response.data) {
        logger.debug('Response data preview', {
          dataType: typeof response.data,
          dataKeys: typeof response.data === 'object' ? Object.keys(response.data) : 'non-object',
          dataLength: typeof response.data === 'string' ? response.data.length : 'non-string'
        });
        
        // If in debug mode, log the full response (be careful with sensitive data in production)
        if (process.env.LOG_LEVEL === 'debug' && process.env.FULL_DEBUG === 'true') {
          logger.debug('Full response data (DEBUG MODE)', {
            fullData: response.data
          });
        }
      }
      
      return {
        status: response.status,
        statusText: response.statusText,
        data: response.data,
        headers: response.headers
      };
      
    } catch (error) {
      // Log detailed error information
      logger.error('HTTP request failed', {
        errorCode: error.code,
        errorMessage: error.message,
        hasResponse: !!error.response,
        responseStatus: error.response?.status,
        responseStatusText: error.response?.statusText,
        responseData: error.response?.data,
        requestUrl: requestConfig.url,
        requestMethod: requestConfig.method
      });
      
      // Handle different types of HTTP errors
      if (error.code === 'ECONNABORTED') {
        throw new Error('API request timeout - service may be down');
      } else if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
        throw new Error('Network error - unable to reach API service');
      } else if (error.response) {
        // API returned an error response
        const status = error.response.status;
        const data = error.response.data;
        
        // Log the actual response data for debugging
        logger.error('Server error response', {
          status: status,
          statusText: error.response.statusText,
          headers: error.response.headers,
          data: data
        });
        
        switch (status) {
          case 401:
            throw new Error('API authentication failed - check API key or JWT token');
          case 404:
            throw new Error('Requested resource not found');
          case 429:
            throw new Error('API rate limit exceeded - try again later');
          case 500:
          case 502:
          case 503:
          case 504:
            throw new Error('API service error - try again later');
          default:
            const errorMessage = data?.message || data?.error || `HTTP ${status} error`;
            throw new Error(`API request failed: ${errorMessage}`);
        }
      } else {
        throw new Error(`Network request failed: ${error.message}`);
      }
    }
  }

  formatResponse(apiResponse, operationDetails) {
    try {
      const responseData = apiResponse.data;
      
      // For weather API, format the response in a user-friendly way
      if (operationDetails.operationId === 'getCurrentWeather') {
        return this.formatWeatherResponse(responseData);
      }
      
      // Generic formatting for other APIs
      return {
        status: apiResponse.status,
        data: responseData,
        operation: operationDetails.operationId,
        summary: operationDetails.summary
      };
      
    } catch (error) {
      throw new Error(`Failed to format response: ${error.message}`);
    }
  }

  formatWeatherResponse(weatherData) {
    try {
      const formatted = {
        location: weatherData.name || 'Unknown',
        country: weatherData.sys?.country || 'Unknown',
        coordinates: {
          latitude: weatherData.coord?.lat,
          longitude: weatherData.coord?.lon
        },
        weather: {
          condition: weatherData.weather?.[0]?.main || 'Unknown',
          description: weatherData.weather?.[0]?.description || 'No description',
          icon: weatherData.weather?.[0]?.icon
        },
        temperature: {
          current: weatherData.main?.temp,
          feels_like: weatherData.main?.feels_like,
          min: weatherData.main?.temp_min,
          max: weatherData.main?.temp_max
        },
        atmospheric: {
          pressure: weatherData.main?.pressure,
          humidity: weatherData.main?.humidity,
          visibility: weatherData.visibility
        },
        wind: weatherData.wind || {},
        timestamp: new Date().toISOString(),
        raw_data: weatherData // Include raw data for debugging
      };
      
      return formatted;
    } catch (error) {
      // If formatting fails, return raw data
      console.warn('Weather response formatting failed, returning raw data:', error.message);
      return {
        raw_data: weatherData,
        formatting_error: error.message
      };
    }
  }

  handleApiError(error, operationId) {
    try {
      // Categorize error type
      let errorType = 'unknown';
      let userMessage = error.message;
      
      if (error.message.includes('timeout')) {
        errorType = 'network';
        userMessage = 'Request timed out - the weather service may be temporarily unavailable';
      } else if (error.message.includes('authentication') || error.message.includes('API key')) {
        errorType = 'authentication';
        userMessage = 'Authentication failed - please check your API key configuration';
      } else if (error.message.includes('not found') || error.message.includes('Requested resource not found')) {
        errorType = 'not_found';
        userMessage = 'The requested location was not found - please try a different city name';
      } else if (error.message.includes('rate limit')) {
        errorType = 'rate_limit';
        userMessage = 'Too many requests - please wait a moment before trying again';
      } else if (error.message.includes('service error') || error.message.includes('HTTP 5')) {
        errorType = 'service';
        userMessage = 'The weather service is experiencing issues - please try again later';
      } else if (error.message.includes('Parameter validation failed')) {
        errorType = 'validation';
        userMessage = error.message;
      }
      
      // Log error details for debugging
      console.error(`API Error [${errorType}] for operation ${operationId}:`, error.message);
      
      return {
        success: false,
        error: userMessage,
        errorType: errorType,
        operationId: operationId,
        timestamp: new Date().toISOString(),
        debug: {
          originalError: error.message,
          stack: error.stack
        }
      };
      
    } catch (handlingError) {
      // If error handling itself fails, return basic error
      console.error('Error handling failed:', handlingError.message);
      return {
        success: false,
        error: 'An unexpected error occurred',
        errorType: 'system',
        operationId: operationId,
        timestamp: new Date().toISOString()
      };
    }
  }

  // Check if operation is a Maybank operation
  isMaybankOperation(operationDetails) {
    return operationDetails.spec && 
           operationDetails.spec.servers && 
           operationDetails.spec.servers.some(server => 
             server.url && (server.url.includes('maya.maybank2u.com.my') || server.url.includes('staging.maya.maybank2u.com.my'))
           );
  }

  // Prepare Maybank-specific request
  async prepareMaybankRequest(operationId, userParameters, options) {
    try {
      // JWT token is now optional - adapter will use default if not provided
      const jwtToken = options.jwtToken;
      
      if (!jwtToken) {
        logger.info('No JWT token provided, using default token');
      }

      // Validate JWT token format only if provided
      if (jwtToken) {
        const tokenValidation = await this.jwtManager.validateMaybankToken(jwtToken);
        if (!tokenValidation.isValid) {
          throw new Error(`Invalid JWT token: ${tokenValidation.reason}`);
        }
      }

      // Prepare request using Maybank adapter
      const requestData = {
        operation: operationId,
        jwtToken: jwtToken,
        parameters: userParameters
      };

      const preparedRequest = await this.maybankAdapter.prepareRequest(requestData);
      
      logger.debug('Maybank request prepared', {
        operationId,
        url: preparedRequest.url,
        method: preparedRequest.method,
        headerCount: Object.keys(preparedRequest.headers).length
      });

      return preparedRequest;

    } catch (error) {
      logger.error('Failed to prepare Maybank request', {
        operationId,
        error: error.message
      });
      throw error;
    }
  }

  // Format Maybank-specific response
  async formatMaybankResponse(apiResponse, operationId) {
    try {
      // Validate response using Maybank adapter
      const validation = await this.maybankAdapter.validateResponse(apiResponse.data, operationId);
      
      if (!validation.isValid) {
        throw new Error(`Invalid Maybank response: ${validation.error}`);
      }

      // Format response based on operation type
      switch (operationId) {
        case 'get_banking_getBalance':
          return this.formatMaybankBalanceResponse(validation.extractedData, apiResponse);
          
        case 'get_banking_summary':
          return this.formatMaybankSummaryResponse(validation.extractedData, apiResponse);
          
        case 'get_banking_all':
          return this.formatMaybankAccountsResponse(validation.extractedData, apiResponse);
          
        default:
          // Generic Maybank response format
          return {
            status: apiResponse.status,
            data: validation.extractedData,
            rawData: validation.rawData,
            operation: operationId,
            timestamp: new Date().toISOString()
          };
      }

    } catch (error) {
      logger.error('Failed to format Maybank response', {
        operationId,
        error: error.message
      });
      
      // Return raw data if formatting fails
      return {
        status: apiResponse.status,
        data: apiResponse.data,
        operation: operationId,
        timestamp: new Date().toISOString(),
        formatting_error: error.message
      };
    }
  }

  // Format MAE Wallet balance response
  formatMaybankBalanceResponse(extractedData, apiResponse) {
    return {
      account: {
        name: extractedData.accountName,
        code: extractedData.accountCode,
        balance: extractedData.balance,
        currentBalance: extractedData.currentBalance,
        value: extractedData.value
      },
      formatted: {
        displayText: `${extractedData.accountName}: RM ${extractedData.balance}`,
        balanceRM: `RM ${extractedData.balance}`,
        accountType: 'MAE Wallet'
      },
      status: apiResponse.status,
      timestamp: new Date().toISOString(),
      operation: 'get_banking_getBalance'
    };
  }

  // Format account summary response
  formatMaybankSummaryResponse(extractedData, apiResponse) {
    return {
      summary: {
        totalBalance: extractedData.total,
        accountCount: extractedData.accountCount,
        maeAvailable: extractedData.maeAvailable
      },
      accounts: extractedData.accounts.map(account => ({
        name: account.name,
        code: account.code,
        type: account.type,
        balance: account.balance,
        primary: account.primary
      })),
      formatted: {
        displayText: `Total Balance: RM ${extractedData.total} across ${extractedData.accountCount} accounts`,
        totalRM: `RM ${extractedData.total}`,
        accountSummary: extractedData.accounts.map(acc => `${acc.name}: RM ${acc.balance}`).join(', ')
      },
      status: apiResponse.status,
      timestamp: new Date().toISOString(),
      operation: 'get_banking_summary'
    };
  }

  // Format all accounts response
  formatMaybankAccountsResponse(extractedData, apiResponse) {
    return {
      accounts: extractedData.accounts.map(account => ({
        name: account.name,
        code: account.code,
        type: account.accountType || account.type,
        balance: account.balance,
        number: account.formattedNumber || account.number,
        primary: account.primary,
        active: account.statusCode === '00'
      })),
      summary: {
        totalAccounts: extractedData.accountCount,
        activeAccounts: extractedData.accounts.filter(acc => acc.statusCode === '00').length
      },
      formatted: {
        displayText: `Found ${extractedData.accountCount} accounts`,
        accountList: extractedData.accounts.map(acc => 
          `${acc.name} (${acc.accountType || acc.type}): RM ${acc.balance}`
        ).join('\n')
      },
      status: apiResponse.status,
      timestamp: new Date().toISOString(),
      operation: 'get_banking_all'
    };
  }

  // Enhanced error handling for Maybank operations
  handleMaybankError(error, operationId) {
    // Use Maybank adapter's error handling
    const maybankError = this.maybankAdapter.handleMaybankError(error, operationId);
    
    return {
      ...maybankError,
      operationId: operationId,
      timestamp: new Date().toISOString(),
      apiType: 'maybank'
    };
  }

  // Utility method to check if executor is properly configured
  isConfigured() {
    return this.registry && this.registry.initialized && this.authConfig;
  }

  // Get configuration status for debugging
  getStatus() {
    return {
      registryInitialized: this.registry?.initialized || false,
      operationsCount: this.registry?.operations?.size || 0,
      authConfigured: !!this.authConfig,
      httpClientConfigured: !!this.httpClient
    };
  }
}