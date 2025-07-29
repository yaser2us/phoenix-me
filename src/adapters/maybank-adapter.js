import { logger } from '../utils/logger.js';
import crypto from 'crypto';

/**
 * Maybank API Adapter - Phase 4.2 Checkpoint 1
 * Handles Maybank-specific headers, authentication, and request formatting
 */
export class MaybankAdapter {
  constructor(config = {}) {
    this.config = {
      platform: 'IOS',
      appVersion: '0.9.38',
      environment: '',
      buildNo: '1203',
      releaseNo: '25.5.0',
      ...config
    };
    
    // Maybank-specific constants
    this.MAYBANK_SERVER = 'maya.maybank2u.com.my';
    this.API_BASE_PATH = '/banking/v1';
    
    // Hardcoded JWT token for testing (temporary)
    // TODO: Remove this hardcoded token in production
    this.DEFAULT_JWT_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJjdXNfa2V5IjoiVTJGc2RHVmtYMThoTlRIT1g3cmIwSDJKQUY0YmNIckp5d0dNSG5CZHZDU0F6cFhIanY0RHVHQmQyWUtuUk5LaEZRZWVCc1BLMWt2aGVOdkk2RDcrUGc9PSIsImF1ZCI6WyJ6dXVsR2F0ZXdheSJdLCJ1c2VyX25hbWUiOiJZYXNlcjJ1cyIsImN1c1R5cGUiOiIxMCIsInNjb3BlIjpbIkVESVRfTk9OX0JBTktJTkciLCJSRUFEX0JBTktJTkciLCJSRUFEX05PTl9CQU5LSU5HIl0sIm1heWFfc2Vzc2lvbl9pZCI6IkBAQEAyMDI1MDcyOTE1LjAwNTk3NTU5MTdAQEBAIiwibTJ1X3VzZXJfaWQiOjE3ODI3NzEzLCJwYW4iOiJlRk9YT1ZmUTlaRjA3TVozSXNHaGU5UDVaY0JYUUN5R1dEd1lWUlp2aDh1Q3NhYmFXeVRsbkdCbjdwZHFrcjZ3a2xORGZTbjhrZDYwRlZKYmVzT1hnSm5GcGFLYWpuU1JxemNzb2RscmdVNktZM2h4ZnFwS05IWVFHcnlqY0FaVXR3TktMVlgyL0kwQVpUUnQrVFB1cDI3Y0ErWGswNFAwQnp5WVdSL3Z6bFU9IiwiZXhwIjoxNzg1MzQ1NTYxLCJ1c2VySWQiOjUxMjYxMDksImp0aSI6ImZiMmJlOTNjLTNkZDAtNGJlNi1hOTI0LTJkNWUzYjIwNjBkOSIsImNsaWVudF9pZCI6Ik0yVUdBVEVXQVkifQ.hMEH-zzCSV7tHYphdwEezQbSL6kbZCODVuydbKredqA';
    
    logger.info('Maybank adapter initialized', { config: this.config });
  }

  /**
   * Prepare request with Maybank-specific headers
   */
  async prepareRequest(requestData) {
    try {
      const { operation, jwtToken, parameters = {} } = requestData;
      
      // Use provided token or fall back to default hardcoded token
      const tokenToUse = jwtToken || this.DEFAULT_JWT_TOKEN;
      
      if (!tokenToUse) {
        throw new Error('JWT token is required for Maybank API calls');
      }
      
      logger.debug('Using JWT token', { 
        isDefault: !jwtToken, 
        tokenLength: tokenToUse.length 
      });

      // Build request headers with all required Maybank headers
      const headers = await this.buildMaybankHeaders(tokenToUse);
      
      // Build the complete URL
      const url = await this.buildURL(operation, parameters);
      
      const preparedRequest = {
        url,
        method: 'GET',
        headers,
        timeout: 30000, // 30 seconds for banking operations
        validateStatus: (status) => status < 500 // Accept 4xx as valid responses to handle properly
      };

      logger.debug('Maybank request prepared', {
        operation,
        url,
        hasJWT: !!tokenToUse,
        headerCount: Object.keys(headers).length
      });

      return preparedRequest;

    } catch (error) {
      logger.error('Failed to prepare Maybank request', {
        operation: requestData.operation,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Build Maybank-specific headers
   */
  async buildMaybankHeaders(jwtToken) {
    const sessionTraceId = await this.generateSessionTraceId();
    
    const headers = {
      'Accept': 'application/json',
      'authorization': `bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJjdXNfa2V5IjoiVTJGc2RHVmtYMThoTlRIT1g3cmIwSDJKQUY0YmNIckp5d0dNSG5CZHZDU0F6cFhIanY0RHVHQmQyWUtuUk5LaEZRZWVCc1BLMWt2aGVOdkk2RDcrUGc9PSIsImF1ZCI6WyJ6dXVsR2F0ZXdheSJdLCJ1c2VyX25hbWUiOiJZYXNlcjJ1cyIsImN1c1R5cGUiOiIxMCIsInNjb3BlIjpbIkVESVRfTk9OX0JBTktJTkciLCJSRUFEX0JBTktJTkciLCJSRUFEX05PTl9CQU5LSU5HIl0sIm1heWFfc2Vzc2lvbl9pZCI6IkBAQEAyMDI1MDcyOTE1LjAwNTk3NTU5MTdAQEBAIiwibTJ1X3VzZXJfaWQiOjE3ODI3NzEzLCJwYW4iOiJlRk9YT1ZmUTlaRjA3TVozSXNHaGU5UDVaY0JYUUN5R1dEd1lWUlp2aDh1Q3NhYmFXeVRsbkdCbjdwZHFrcjZ3a2xORGZTbjhrZDYwRlZKYmVzT1hnSm5GcGFLYWpuU1JxemNzb2RscmdVNktZM2h4ZnFwS05IWVFHcnlqY0FaVXR3TktMVlgyL0kwQVpUUnQrVFB1cDI3Y0ErWGswNFAwQnp5WVdSL3Z6bFU9IiwiZXhwIjoxNzg1MzQ1NTYxLCJ1c2VySWQiOjUxMjYxMDksImp0aSI6ImZiMmJlOTNjLTNkZDAtNGJlNi1hOTI0LTJkNWUzYjIwNjBkOSIsImNsaWVudF9pZCI6Ik0yVUdBVEVXQVkifQ.hMEH-zzCSV7tHYphdwEezQbSL6kbZCODVuydbKredqA`, // ${jwtToken} lowercase 'authorization' and 'bearer' to match cURL
      'maya-authorization': `bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJjdXNfa2V5IjoiVTJGc2RHVmtYMThoTlRIT1g3cmIwSDJKQUY0YmNIckp5d0dNSG5CZHZDU0F6cFhIanY0RHVHQmQyWUtuUk5LaEZRZWVCc1BLMWt2aGVOdkk2RDcrUGc9PSIsImF1ZCI6WyJ6dXVsR2F0ZXdheSJdLCJ1c2VyX25hbWUiOiJZYXNlcjJ1cyIsImN1c1R5cGUiOiIxMCIsInNjb3BlIjpbIkVESVRfTk9OX0JBTktJTkciLCJSRUFEX0JBTktJTkciLCJSRUFEX05PTl9CQU5LSU5HIl0sIm1heWFfc2Vzc2lvbl9pZCI6IkBAQEAyMDI1MDcyOTE1LjAwNTk3NTU5MTdAQEBAIiwibTJ1X3VzZXJfaWQiOjE3ODI3NzEzLCJwYW4iOiJlRk9YT1ZmUTlaRjA3TVozSXNHaGU5UDVaY0JYUUN5R1dEd1lWUlp2aDh1Q3NhYmFXeVRsbkdCbjdwZHFrcjZ3a2xORGZTbjhrZDYwRlZKYmVzT1hnSm5GcGFLYWpuU1JxemNzb2RscmdVNktZM2h4ZnFwS05IWVFHcnlqY0FaVXR3TktMVlgyL0kwQVpUUnQrVFB1cDI3Y0ErWGswNFAwQnp5WVdSL3Z6bFU9IiwiZXhwIjoxNzg1MzQ1NTYxLCJ1c2VySWQiOjUxMjYxMDksImp0aSI6ImZiMmJlOTNjLTNkZDAtNGJlNi1hOTI0LTJkNWUzYjIwNjBkOSIsImNsaWVudF9pZCI6Ik0yVUdBVEVXQVkifQ.hMEH-zzCSV7tHYphdwEezQbSL6kbZCODVuydbKredqA`, // ${jwtToken}Additional maya-authorization header required by Maybank API
      'X-APP-PLATFORM': this.config.platform,
      'X-APP-VERSION': this.config.appVersion,
      'X-APP-ENVIRONMENT': this.config.environment, // empty value like in cURL
      'X-APP-BUILD-NO': this.config.buildNo,
      'X-APP-RELEASE-NO': this.config.releaseNo,
      'X-APP-SESSION-TRACE-ID': sessionTraceId,
      // Remove Content-Type for GET requests to exactly match cURL
      // Remove User-Agent to exactly match cURL
    };

    logger.debug('Built Maybank headers', {
      headerKeys: Object.keys(headers),
      hasAuth: headers.authorization && headers.authorization.startsWith('bearer '),
      hasMayaAuth: headers['maya-authorization'] && headers['maya-authorization'].startsWith('bearer '),
      sessionTraceLength: sessionTraceId.length
    });

    return headers;
  }

  /**
   * Build URL for Maybank operations
   */
  async buildURL(operationId, parameters = {}) {
    try {
      let path = '';
      
      // Map operation IDs to endpoints
      switch (operationId) {
        case 'get_banking_getBalance':
          path = '/banking/v1/summary/getBalance';
          break;
        case 'get_banking_summary':
          path = '/banking/v1/summary';
          break;
        case 'get_banking_all':
          path = '/banking/v1/accounts/all';
          break;
        default:
          throw new Error(`Unknown Maybank operation: ${operationId}`);
      }

      // Build query parameters
      const queryParams = new URLSearchParams();
      
      // Add operation-specific parameters
      if (operationId === 'get_banking_getBalance' && parameters.isFirstLoad) {
        queryParams.append('isFirstLoad', parameters.isFirstLoad);
      }
      
      if (operationId === 'get_banking_summary' && parameters.type) {
        queryParams.append('type', parameters.type);
      }

      // Construct full URL
      const baseUrl = `https://${this.MAYBANK_SERVER}${path}`;
      const queryString = queryParams.toString();
      const fullUrl = queryString ? `${baseUrl}?${queryString}` : baseUrl;

      logger.debug('Built Maybank URL', {
        operationId,
        path,
        queryParams: Object.fromEntries(queryParams),
        fullUrl
      });

      return fullUrl;

    } catch (error) {
      logger.error('Failed to build Maybank URL', {
        operationId,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Generate session trace ID (Base64 encoded random string)
   */
  async generateSessionTraceId() {
    try {
      // Generate a random 32-byte buffer
      const randomBytes = crypto.randomBytes(32);
      
      // Convert to base64
      const sessionTraceId = randomBytes.toString('base64');
      
      logger.debug('Generated session trace ID', {
        length: sessionTraceId.length,
        sample: sessionTraceId.substring(0, 10) + '...'
      });

      return sessionTraceId;

    } catch (error) {
      logger.error('Failed to generate session trace ID', { error: error.message });
      
      // Fallback to default if generation fails
      return 'amI4ZUo4czNQQ1RjbnM3TVE0VGtHWVlubUZDWWtNdkI=';
    }
  }

  /**
   * Validate Maybank API response
   */
  async validateResponse(responseData, operationId) {
    try {
      // Check basic response structure
      if (!responseData || typeof responseData !== 'object') {
        return {
          isValid: false,
          error: 'Invalid response format - not an object'
        };
      }

      // Check for authentication error format (401 responses)
      if (responseData.error && responseData.error_description) {
        logger.error('Maybank authentication error', {
          error: responseData.error,
          error_description: responseData.error_description,
          fullResponse: responseData
        });
        
        return {
          isValid: false,
          error: `Maybank authentication error: ${responseData.error_description || responseData.error}`
        };
      }

      // Check for Maybank standard response format
      if (responseData.message !== 'success' || responseData.code !== 0) {
        // Log the actual response for debugging
        logger.error('Maybank API returned error response', {
          message: responseData.message,
          code: responseData.code,
          fullResponse: responseData
        });
        
        return {
          isValid: false,
          error: `Maybank API error: ${responseData.message || 'Unknown error'} (code: ${responseData.code || 'Unknown'})`
        };
      }

      // Extract data based on operation
      let extractedData = {};
      
      switch (operationId) {
        case 'get_banking_getBalance':
          if (responseData.result && responseData.result.balance) {
            extractedData = {
              balance: responseData.result.balance,
              currentBalance: responseData.result.currentBalance,
              accountName: responseData.result.name,
              accountCode: responseData.result.code,
              value: responseData.result.value
            };
          }
          break;
          
        case 'get_banking_summary':
          if (responseData.result && responseData.result.accountListings) {
            extractedData = {
              total: responseData.result.total,
              accountCount: responseData.result.accountListings.length,
              accounts: responseData.result.accountListings,
              maeAvailable: responseData.result.maeAvailable
            };
          }
          break;
          
        case 'get_banking_all':
          if (Array.isArray(responseData)) {
            extractedData = {
              accounts: responseData,
              accountCount: responseData.length
            };
          }
          break;
      }

      const isValid = Object.keys(extractedData).length > 0;
      
      logger.debug('Validated Maybank response', {
        operationId,
        isValid,
        dataKeys: Object.keys(extractedData)
      });

      return {
        isValid,
        extractedData,
        rawData: responseData
      };

    } catch (error) {
      logger.error('Failed to validate Maybank response', {
        operationId,
        error: error.message
      });
      
      return {
        isValid: false,
        error: `Response validation failed: ${error.message}`
      };
    }
  }

  /**
   * Handle Maybank-specific errors with detailed information
   */
  handleMaybankError(error, operationId) {
    const timestamp = new Date().toISOString();
    const startTime = Date.now();
    
    logger.error('Maybank API error', {
      operationId,
      error: error.message,
      status: error.response?.status,
      data: error.response?.data
    });

    // Capture detailed error information
    const baseErrorInfo = {
      success: false,
      operationId,
      timestamp,
      duration: Date.now() - startTime
    };

    // Map common Maybank errors with detailed information
    if (error.response) {
      const { status, statusText, data, headers } = error.response;
      
      // Add detailed HTTP error information
      const detailedErrorInfo = {
        ...baseErrorInfo,
        httpStatus: status,
        httpStatusText: statusText,
        responseBody: data,
        responseHeaders: headers
      };
      
      switch (status) {
        case 400:
          return {
            ...detailedErrorInfo,
            error: 'Bad Request - Check request format and parameters',
            errorType: 'BAD_REQUEST_ERROR',
            retryable: false
          };
          
        case 401:
          return {
            ...detailedErrorInfo,
            error: 'Authentication failed - JWT token may be expired',
            errorType: 'AUTHENTICATION_ERROR',
            retryable: false
          };
          
        case 403:
          return {
            ...detailedErrorInfo,
            error: 'Access forbidden - insufficient permissions',
            errorType: 'AUTHORIZATION_ERROR',
            retryable: false
          };
          
        case 404:
          return {
            ...detailedErrorInfo,
            error: 'Resource not found - endpoint may not exist',
            errorType: 'NOT_FOUND_ERROR',
            retryable: false
          };
          
        case 429:
          return {
            ...detailedErrorInfo,
            error: 'Rate limit exceeded - too many requests',
            errorType: 'RATE_LIMIT_ERROR',
            retryable: true
          };
          
        case 500:
        case 502:
        case 503:
        case 504:
          return {
            ...detailedErrorInfo,
            error: 'Maybank server error - please try again later',
            errorType: 'SERVER_ERROR',
            retryable: true
          };
          
        default:
          return {
            ...detailedErrorInfo,
            error: `Maybank API error: ${data?.message || error.message}`,
            errorType: 'API_ERROR',
            retryable: false
          };
      }
    }

    // Handle timeout errors specifically
    if (error.code === 'ECONNABORTED') {
      return {
        ...baseErrorInfo,
        error: 'API request timeout - service may be down',
        errorType: 'TIMEOUT_ERROR',
        retryable: true,
        networkError: true
      };
    }

    // Network or other errors
    return {
      ...baseErrorInfo,
      error: `Network error: ${error.message}`,
      errorType: 'NETWORK_ERROR',
      retryable: true,
      networkError: true,
      errorCode: error.code
    };
  }

  /**
   * Get adapter status and configuration
   */
  getStatus() {
    return {
      adapterType: 'maybank',
      server: this.MAYBANK_SERVER,
      config: this.config,
      supportedOperations: [
        'get_banking_getBalance',
        'get_banking_summary',
        'get_banking_all'
      ],
      initialized: true
    };
  }
}

export default MaybankAdapter;