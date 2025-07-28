import axios from 'axios';
import { RequestBuilder } from './request-builder.js';

export class ApiExecutor {
  constructor(registry, authConfig) {
    this.registry = registry;
    this.authConfig = authConfig;
    this.httpClient = axios.create({
      timeout: 10000,  // 10 second timeout
      headers: {
        'User-Agent': 'MCP-Gateway/1.0.0'
      }
    });
  }

  async executeOperation(operationId, userParameters) {
    try {
      console.error(`Executing operation: ${operationId} with params:`, userParameters);
      
      // Get operation details from registry
      const operationDetails = this.registry.getOperationDetails(operationId);
      if (!operationDetails) {
        throw new Error(`Operation '${operationId}' not found in registry`);
      }
      
      // Build request using RequestBuilder
      const requestConfig = RequestBuilder.buildRequest(operationDetails, userParameters, this.authConfig);
      console.error(`Built request:`, {
        method: requestConfig.method,
        url: requestConfig.url,
        params: requestConfig.params
      });
      
      // Execute HTTP request with proper error handling
      const apiResponse = await this.makeHttpRequest(requestConfig);
      
      // Format response for MCP return
      const formattedResponse = this.formatResponse(apiResponse, operationDetails);
      
      return {
        success: true,
        data: formattedResponse,
        operationId: operationId,
        timestamp: new Date().toISOString()
      };
      
    } catch (error) {
      return this.handleApiError(error, operationId);
    }
  }

  async makeHttpRequest(requestConfig) {
    try {
      console.error(`Making HTTP request: ${requestConfig.method.toUpperCase()} ${requestConfig.url}`);
      
      const response = await this.httpClient.request(requestConfig);
      
      console.error(`HTTP response received: ${response.status}`);
      
      return {
        status: response.status,
        statusText: response.statusText,
        data: response.data,
        headers: response.headers
      };
      
    } catch (error) {
      // Handle different types of HTTP errors
      if (error.code === 'ECONNABORTED') {
        throw new Error('API request timeout - service may be down');
      } else if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
        throw new Error('Network error - unable to reach API service');
      } else if (error.response) {
        // API returned an error response
        const status = error.response.status;
        const data = error.response.data;
        
        switch (status) {
          case 401:
            throw new Error('API authentication failed - check API key');
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