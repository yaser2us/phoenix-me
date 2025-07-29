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
    this.MAYBANK_SERVER = 'staging.maya.maybank2u.com.my';
    this.API_BASE_PATH = '/banking/v1';
    
    logger.info('Maybank adapter initialized', { config: this.config });
  }

  /**
   * Prepare request with Maybank-specific headers
   */
  async prepareRequest(requestData) {
    try {
      const { operation, jwtToken, parameters = {} } = requestData;
      
      if (!jwtToken) {
        throw new Error('JWT token is required for Maybank API calls');
      }

      // Build request headers with all required Maybank headers
      const headers = await this.buildMaybankHeaders(jwtToken);
      
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
        hasJWT: !!jwtToken,
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
      'Authorization': `Bearer ${jwtToken}`,
      'X-APP-PLATFORM': this.config.platform,
      'X-APP-VERSION': this.config.appVersion,
      'X-APP-ENVIRONMENT': this.config.environment,
      'X-APP-BUILD-NO': this.config.buildNo,
      'X-APP-RELEASE-NO': this.config.releaseNo,
      'X-APP-SESSION-TRACE-ID': sessionTraceId,
      'Content-Type': 'application/json',
      'User-Agent': `Maybank2u/${this.config.appVersion} (iOS; Build ${this.config.buildNo})`
    };

    logger.debug('Built Maybank headers', {
      headerKeys: Object.keys(headers),
      hasAuth: headers.Authorization.startsWith('Bearer '),
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

      return { url: fullUrl, path, queryParams: Object.fromEntries(queryParams) };

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

      // Check for Maybank standard response format
      if (responseData.message !== 'success' || responseData.code !== 0) {
        return {
          isValid: false,
          error: `Maybank API error: ${responseData.message} (code: ${responseData.code})`
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
   * Handle Maybank-specific errors
   */
  handleMaybankError(error, operationId) {
    logger.error('Maybank API error', {
      operationId,
      error: error.message,
      status: error.response?.status,
      data: error.response?.data
    });

    // Map common Maybank errors
    if (error.response) {
      const { status, data } = error.response;
      
      switch (status) {
        case 401:
          return {
            success: false,
            error: 'Authentication failed - JWT token may be expired',
            errorType: 'AUTHENTICATION_ERROR',
            retryable: false
          };
          
        case 403:
          return {
            success: false,
            error: 'Access forbidden - insufficient permissions',
            errorType: 'AUTHORIZATION_ERROR',
            retryable: false
          };
          
        case 429:
          return {
            success: false,
            error: 'Rate limit exceeded - too many requests',
            errorType: 'RATE_LIMIT_ERROR',
            retryable: true
          };
          
        case 500:
        case 502:
        case 503:
          return {
            success: false,
            error: 'Maybank server error - please try again later',
            errorType: 'SERVER_ERROR',
            retryable: true
          };
          
        default:
          return {
            success: false,
            error: `Maybank API error: ${data?.message || error.message}`,
            errorType: 'API_ERROR',
            retryable: false
          };
      }
    }

    // Network or other errors
    return {
      success: false,
      error: `Network error: ${error.message}`,
      errorType: 'NETWORK_ERROR',
      retryable: true
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