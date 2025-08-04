import { logger } from '../utils/logger.js';
import crypto from 'crypto';
import { debugLogger } from '../utils/debug-logger.js';
import { SchemaRequestBuilder } from '../builders/schema-request-builder.js';
import { SchemaResponseValidator } from '../builders/schema-response-validator.js';

/**
 * Maybank API Adapter - Phase 4.2 Checkpoint 1
 * Handles Maybank-specific headers, authentication, and request formatting
 */
export class MaybankAdapter {
  constructor(registry = null, config = {}) {
    this.registry = registry;
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
    this.DEFAULT_JWT_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJjdXNfa2V5IjoiVTJGc2RHVmtYMThoTlRIT1g3cmIwSDJKQUY0YmNIckp5d0dNSG5CZHZDU0F6cFhIanY0RHVHQmQyWUtuUk5LaEZRZWVCc1BLMWt2aGVOdkk2RDcrUGc9PSIsImF1ZCI6WyJ6dXVsR2F0ZXdheSJdLCJ1c2VyX25hbWUiOiJZYXNlcjJ1cyIsImN1c1R5cGUiOiIxMCIsInNjb3BlIjpbIkVESVRfQkFOS0lORyIsIkVESVRfTk9OX0JBTktJTkciLCJSRUFEX0JBTktJTkciLCJSRUFEX05PTl9CQU5LSU5HIl0sIm1heWFfc2Vzc2lvbl9pZCI6IkBAQEAyMDI1MDgwMTIzLjU3MDg4OTg2ODFAQEBAIiwibTJ1X3VzZXJfaWQiOjE3ODI3NzEzLCJwYW4iOiJ0OUdmc0NSbithSG0xaXJ4V3FkYzJDQVlJMUFjdCt4aUNyKy94eGtUbEsrNm1sclM5MFdYTS9UNnd6ZldxSXZtTnhVODd4NldZMDU5YzNWSndhYkZ5aE9YUVJKbStpZjVpRDh5cWV6a1h6MXplMDVhVzNsWm9MZDg2WGNlR24yU1NheUF2NzNmaW5iUFM1ckNSYlVaVTNEY0syOUlvejRoRmM4VXRRbHRqN2c9IiwiZXhwIjoxNzg1NjM0MjE4LCJ1c2VySWQiOjUxMjYxMDksImp0aSI6IjFjNWZhM2UxLWVlN2UtNGZjMC1iYTRjLTViYTQ5YzFlZTg4OCIsImNsaWVudF9pZCI6Ik0yVUdBVEVXQVkifQ.vFbTUFFPyo34iWiGFLOWfPVfdv4YRiPNvu3RQAFxJTo'
    // this.DEFAULT_JWT_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJjdXNfa2V5IjoiVTJGc2RHVmtYMThoTlRIT1g3cmIwSDJKQUY0YmNIckp5d0dNSG5CZHZDU0F6cFhIanY0RHVHQmQyWUtuUk5LaEZRZWVCc1BLMWt2aGVOdkk2RDcrUGc9PSIsImF1ZCI6WyJ6dXVsR2F0ZXdheSJdLCJ1c2VyX25hbWUiOiJZYXNlcjJ1cyIsImN1c1R5cGUiOiIxMCIsInNjb3BlIjpbIkVESVRfTk9OX0JBTktJTkciLCJSRUFEX0JBTktJTkciLCJSRUFEX05PTl9CQU5LSU5HIl0sIm1heWFfc2Vzc2lvbl9pZCI6IkBAQEAyMDI1MDcyOTE1LjAwNTk3NTU5MTdAQEBAIiwibTJ1X3VzZXJfaWQiOjE3ODI3NzEzLCJwYW4iOiJlRk9YT1ZmUTlaRjA3TVozSXNHaGU5UDVaY0JYUUN5R1dEd1lWUlp2aDh1Q3NhYmFXeVRsbkdCbjdwZHFrcjZ3a2xORGZTbjhrZDYwRlZKYmVzT1hnSm5GcGFLYWpuU1JxemNzb2RscmdVNktZM2h4ZnFwS05IWVFHcnlqY0FaVXR3TktMVlgyL0kwQVpUUnQrVFB1cDI3Y0ErWGswNFAwQnp5WVdSL3Z6bFU9IiwiZXhwIjoxNzg1MzQ1NTYxLCJ1c2VySWQiOjUxMjYxMDksImp0aSI6ImZiMmJlOTNjLTNkZDAtNGJlNi1hOTI0LTJkNWUzYjIwNjBkOSIsImNsaWVudF9pZCI6Ik0yVUdBVEVXQVkifQ.hMEH-zzCSV7tHYphdwEezQbSL6kbZCODVuydbKredqA';
    
    // Initialize schema builders
    this.requestBuilder = new SchemaRequestBuilder();
    this.responseValidator = new SchemaResponseValidator();
    
    logger.info('Maybank adapter initialized', { config: this.config });
  }

  /**
   * Prepare request with Maybank-specific headers
   */
  async prepareRequest(requestData) {
    try {
      const { operation, jwtToken, parameters = {} } = requestData;
      
      // PHASE 5 FIX: No fallback to hardcoded token - force proper JWT management
      if (!jwtToken) {
        throw new Error('JWT token is required for Maybank API calls. No token provided and hardcoded fallback disabled for security.');
      }
      
      const tokenToUse = jwtToken;
      
      logger.debug('Using JWT token', { 
        isDefault: !jwtToken, 
        tokenLength: tokenToUse.length 
      });

      // Build request headers with all required Maybank headers
      let headers = await this.buildMaybankHeaders(tokenToUse, operation);
      
      // Declare these variables early so they're available for buildURL
      let queryParams = {};
      
      // Build the complete URL (will be updated with query params later)
      let url = await this.buildURL(operation, parameters);
      
      // Phase 4.8 Checkpoint 2: Use schema-based request builder
      let method = 'GET';
      let body = null;
      
      if (this.registry && this.requestBuilder) {
        const operationDetails = this.registry.getOperation(operation);
        if (operationDetails) {
          // Build complete request from schema
          const schemaRequest = this.requestBuilder.buildRequest(operationDetails, parameters);
          
          method = schemaRequest.method;
          body = schemaRequest.body;
          queryParams = schemaRequest.queryParams;
          
          // Merge schema headers with Maybank headers (Maybank headers take precedence)
          headers = { ...schemaRequest.headers, ...headers };
          
          logger.info('Phase 4.8: Request built from schema', { 
            operation, 
            method,
            hasBody: !!body,
            queryParamCount: Object.keys(queryParams).length,
            headerCount: Object.keys(headers).length
          });
          
          // Rebuild URL with query parameters if needed
          if (Object.keys(queryParams).length > 0) {
            url = await this.buildURL(operation, parameters, queryParams);
          }
        }
      }
      
      // Fallback to hardcoded logic if registry not available
      if (!this.registry || !this.registry.getOperation(operation)) {
        if (operation === 'post_bill_getBillsTxnHistory') {
          method = 'POST';
          // Extract request body from parameters
          body = {
            payeeCode: parameters.payeeCode || "1111",
            billAcctNo: parameters.billAcctNo || "210027549604", 
            favBillPaymentStep2: parameters.favBillPaymentStep2 || "17",
            gstNotesFavPaymentStep2: parameters.gstNotesFavPaymentStep2 || "gstnotesfavpaystep2",
            fullName: parameters.fullName || "Tenaga Nasional Berhad",
            shortName: parameters.shortName || "Tenaga Nasional Berhad"
          };
          // Add Content-Type for POST requests
          headers['Content-Type'] = 'application/json';
        }
      }
      
      const preparedRequest = {
        url,
        method,
        headers,
        timeout: 30000, // 30 seconds for banking operations
        validateStatus: (status) => status < 500 // Accept 4xx as valid responses to handle properly
      };
      
      if (body) {
        preparedRequest.data = body;
      }

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
  async buildMaybankHeaders(jwtToken, operationId = null) {
    // Use provided token first, fallback to default only if no token provided
    const token = jwtToken || this.DEFAULT_JWT_TOKEN;
    
    // Debug logging for payment operations
    if (operationId === 'get_payment_favList_1') {
      debugLogger.log('MAYBANK_HEADER_BUILD', {
        providedToken: !!jwtToken,
        usingDefaultToken: !jwtToken,
        tokenUsed: debugLogger.sanitizeData({ token }),
        tokenLength: token?.length,
        operationId
      });
    }
    
    // Use the working session trace ID from your curl command
    const sessionTraceId = 'T0h2a0s5WXA3eG5xZHBkanUyR3JqNEdzS0xBemhZeWc=';

    const headers = {
      'Accept': 'application/json',
      'X-APP-PLATFORM': this.config.platform,
      'X-APP-VERSION': this.config.appVersion,
      'X-APP-ENVIRONMENT': '', // Note: empty value with semicolon in your curl
      'X-APP-BUILD-NO': this.config.buildNo,
      'X-APP-RELEASE-NO': this.config.releaseNo,
      'X-APP-SESSION-TRACE-ID': sessionTraceId,
      'x-mb-client-adapter': 'mae-favorites-bill-payment-inquiry',
      'X-MB-E2E-Id': sessionTraceId,
      'X-MB-Timestamp': Date.now().toString(),
      'X-MB-ENV': 'S',
      'X-MB-Client-Id': 'mae-fe-iv5p7',
      'authorization': `bearer ${token}`, // lowercase to match working curl
      'maya-authorization': `bearer ${token}`,
    };

    logger.debug('Built Maybank headers', {
      headerKeys: Object.keys(headers),
      hasAuth: headers.authorization && headers.authorization.startsWith('bearer '),
      hasMayaAuth: headers['maya-authorization'] && headers['maya-authorization'].startsWith('bearer '),
      sessionTraceLength: sessionTraceId.length,
      operationId: operationId
    });

    return headers;
  }

  /**
   * Build URL for Maybank operations
   */
  async buildURL(operationId, parameters = {}, queryParams = {}) {
    try {
      let path = '';
      
      // Phase 4.8: Dynamic URL resolution from registry
      if (this.registry) {
        const operation = this.registry.getOperation(operationId);
        if (operation) {
          path = operation.path;
          logger.info('Phase 4.8: URL resolved from registry', { operationId, path, method: operation.method });
        }
      }
      
      // Fallback to hardcoded mapping if registry not available
      if (!path) {
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
          case 'get_payment_favList_1':
            path = '/payment/v1/pay/bill/favList';
            break;
          case 'post_bill_getBillsTxnHistory':
            path = '/bill/v2/bills/getBillsTxnHistory';
            break;
          default:
            throw new Error(`Unknown Maybank operation: ${operationId}`);
        }
      }

      // Build query parameters
      const urlParams = new URLSearchParams();
      
      // Phase 4.8: Use provided queryParams if available
      if (queryParams && Object.keys(queryParams).length > 0) {
        for (const [key, value] of Object.entries(queryParams)) {
          urlParams.append(key, value);
        }
      } else {
        // Fallback to hardcoded operation-specific parameters
        if (operationId === 'get_banking_getBalance' && parameters.isFirstLoad) {
          urlParams.append('isFirstLoad', parameters.isFirstLoad);
        }
        
        if (operationId === 'get_banking_summary' && parameters.type) {
          urlParams.append('type', parameters.type);
        }
      }

      // Construct full URL
      const baseUrl = `https://${this.MAYBANK_SERVER}${path}`;
      const queryString = urlParams.toString();
      const fullUrl = queryString ? `${baseUrl}?${queryString}` : baseUrl;

      logger.debug('Built Maybank URL', {
        operationId,
        path,
        queryParams: queryParams,
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
   * Validate Maybank API response using schema-based validation
   */
  async validateResponse(responseData, operationId, statusCode = 200) {
    try {
      // Phase 4.8 Checkpoint 3: Use schema-based validation
      if (this.registry && this.responseValidator) {
        const operation = this.registry.getOperation(operationId);
        if (operation) {
          const validation = this.responseValidator.validateResponse(operation, responseData, statusCode);
          
          logger.info('Phase 4.8: Response validated with schema', {
            operationId,
            valid: validation.valid,
            errorCount: validation.errors.length,
            hasExtractedData: !!validation.extractedData
          });
          
          return {
            isValid: validation.valid,
            extractedData: validation.extractedData,
            rawData: validation.rawData,
            error: validation.errors.length > 0 ? validation.errors.join('; ') : null,
            validationErrors: validation.errors
          };
        }
      }

      // Fallback to hardcoded validation logic
      logger.debug('Falling back to hardcoded response validation', { operationId });

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
      const isPaymentApi = responseData.message !== undefined && responseData.code !== undefined;
      const isBillApi = responseData.statusCode !== undefined && responseData.statusDesc !== undefined;
      
      if (isPaymentApi && (responseData.message !== 'success' || responseData.code !== 0)) {
        return {
          isValid: false,
          error: `Maybank API error: ${responseData.message || 'Unknown error'} (code: ${responseData.code || 'Unknown'})`
        };
      }
      
      if (isBillApi && (responseData.statusCode !== "0000" || responseData.statusDesc !== "Successful")) {
        return {
          isValid: false,
          error: `Maybank Bill API error: ${responseData.statusDesc || 'Unknown error'} (code: ${responseData.statusCode || 'Unknown'})`
        };
      }

      // Fallback data extraction (minimal)
      const isValid = true;
      
      return {
        isValid,
        extractedData: responseData,
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