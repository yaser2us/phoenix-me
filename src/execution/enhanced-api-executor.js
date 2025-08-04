import { logger } from '../utils/logger.js';
import { EnhancedRequestBuilder } from './enhanced-request-builder.js';
import { InteractiveParameterCollector } from '../interaction/interactive-parameter-collector.js';
import { RetryManager } from './retry-manager.js';

/**
 * Enhanced API Executor - Executes APIs with validation, collection, and retry
 * Provides a complete end-to-end API execution experience
 */
export class EnhancedApiExecutor {
  constructor(baseExecutor) {
    this.baseExecutor = baseExecutor; // Original ApiExecutor
    this.requestBuilder = new EnhancedRequestBuilder();
    this.parameterCollector = new InteractiveParameterCollector();
    this.retryManager = new RetryManager();
    this.logger = logger;
    
    // Create retry orchestrator
    this.retryOrchestrator = this.retryManager.createRetryOrchestrator(
      this.requestBuilder,
      this.parameterCollector,
      this.baseExecutor
    );
  }

  /**
   * Executes an API operation with enhanced validation and retry
   * @param {Object} operation - The API operation specification
   * @param {Object} userParameters - User-provided parameters
   * @param {Object} authConfig - Authentication configuration
   * @param {Object} components - OpenAPI components
   * @param {Object} options - Execution options
   * @returns {Object} Execution result or collection prompt
   */
  async executeWithValidation(operation, userParameters, authConfig = {}, components = {}, options = {}) {
    try {
      this.logger.debug(`Starting enhanced execution for ${operation.operationId || operation.method + ' ' + operation.path}`);
      
      // Use retry orchestrator for execution
      const result = await this.retryOrchestrator.executeWithRetry(
        operation,
        userParameters,
        authConfig,
        components
      );
      
      // If result needs user input, return collection prompt
      if (result.needsUserInput) {
        return {
          success: true,
          requiresUserInput: true,
          sessionId: result.sessionId,
          collectionId: result.collectionId,
          message: result.message,
          currentField: result.currentField,
          progress: result.progress,
          type: 'collection_prompt'
        };
      }
      
      // If execution completed successfully
      if (result.success && result.executionResult) {
        return {
          success: true,
          sessionId: result.sessionId,
          attempts: result.attempts,
          duration: result.duration,
          data: result.executionResult,
          progressSteps: result.progressSteps,
          type: 'execution_success'
        };
      }
      
      // If execution failed
      return {
        success: false,
        error: result.error,
        sessionId: result.sessionId,
        attempts: result.attempts,
        canRetry: result.canRetry,
        type: 'execution_failed'
      };
      
    } catch (error) {
      this.logger.error('Enhanced execution failed:', error);
      return {
        success: false,
        error: error.message,
        type: 'execution_error'
      };
    }
  }

  /**
   * Continues execution after user provides collected data
   * @param {String} sessionId - The retry session ID
   * @param {String} collectionId - The collection session ID
   * @param {String} userInput - User's input for the current field
   * @returns {Object} Continuation result
   */
  async continueAfterUserInput(sessionId, collectionId, userInput) {
    try {
      // Process user input through parameter collector
      const inputResult = await this.parameterCollector.processUserInput(collectionId, userInput);
      
      if (!inputResult.success) {
        return {
          success: false,
          error: inputResult.error,
          type: 'input_processing_failed'
        };
      }
      
      // If collection is complete, continue with retry
      if (inputResult.complete) {
        const retryResult = await this.retryOrchestrator.continueWithCollectedData(
          sessionId,
          inputResult.data
        );
        
        // Check if API execution succeeded
        if (retryResult.success && retryResult.executionResult) {
          return {
            success: true,
            sessionId: sessionId,
            data: retryResult.executionResult,
            attempts: retryResult.attempts,
            duration: retryResult.duration,
            type: 'execution_success'
          };
        }
        
        // Check if more data is needed
        if (retryResult.needsUserInput) {
          return {
            success: true,
            requiresUserInput: true,
            sessionId: sessionId,
            collectionId: retryResult.collectionId,
            message: retryResult.message,
            currentField: retryResult.currentField,
            progress: retryResult.progress,
            type: 'collection_prompt'
          };
        }
        
        // Execution failed
        return {
          success: false,
          error: retryResult.error,
          sessionId: sessionId,
          type: 'execution_failed'
        };
        
      } else if (inputResult.needsInput) {
        // Still collecting data, return next prompt
        return {
          success: true,
          requiresUserInput: true,
          sessionId: sessionId,
          collectionId: collectionId,
          message: inputResult.message,
          currentField: inputResult.currentField,
          progress: inputResult.progress,
          error: inputResult.error, // Validation error if any
          attempts: inputResult.attempts,
          type: 'collection_prompt'
        };
      }
      
      return {
        success: false,
        error: 'Unexpected collection state',
        type: 'collection_error'
      };
      
    } catch (error) {
      this.logger.error('Continue after user input failed:', error);
      return {
        success: false,
        error: error.message,
        type: 'continuation_error'
      };
    }
  }

  /**
   * Gets the status of an active execution session
   * @param {String} sessionId - The session ID
   * @returns {Object} Session status
   */
  getExecutionStatus(sessionId) {
    return this.retryOrchestrator.getStatus(sessionId);
  }

  /**
   * Cancels an active execution session
   * @param {String} sessionId - The session ID
   * @returns {Object} Cancellation result
   */
  cancelExecution(sessionId) {
    return this.retryOrchestrator.cancel(sessionId);
  }

  /**
   * Executes a simple API call without enhanced features (backward compatibility)
   * @param {Object} requestConfig - HTTP request configuration
   * @returns {Object} Execution result
   */
  async execute(requestConfig) {
    return await this.baseExecutor.execute(requestConfig);
  }

  /**
   * Creates a conversational API execution interface
   * @returns {Object} Conversational interface
   */
  createConversationalInterface() {
    return {
      /**
       * Starts a conversational API execution
       */
      startExecution: async (operation, userParameters, authConfig, components) => {
        const result = await this.executeWithValidation(operation, userParameters, authConfig, components);
        
        return this.formatConversationalResponse(result);
      },
      
      /**
       * Continues a conversational execution
       */
      continueExecution: async (sessionId, collectionId, userInput) => {
        const result = await this.continueAfterUserInput(sessionId, collectionId, userInput);
        
        return this.formatConversationalResponse(result);
      },
      
      /**
       * Gets execution status in conversational format
       */
      getStatus: (sessionId) => {
        const status = this.getExecutionStatus(sessionId);
        return this.formatStatusResponse(status);
      }
    };
  }

  /**
   * Formats results for conversational interaction
   * @private
   */
  formatConversationalResponse(result) {
    switch (result.type) {
      case 'collection_prompt':
        return {
          needsInput: true,
          message: result.message,
          sessionId: result.sessionId,
          collectionId: result.collectionId,
          currentField: result.currentField,
          progress: result.progress,
          error: result.error
        };
        
      case 'execution_success':
        return {
          completed: true,
          message: '✅ API call completed successfully!',
          data: result.data,
          sessionId: result.sessionId,
          attempts: result.attempts,
          duration: result.duration
        };
        
      case 'execution_failed':
        return {
          failed: true,
          message: `❌ API call failed: ${result.error}`,
          error: result.error,
          sessionId: result.sessionId,
          canRetry: result.canRetry
        };
        
      case 'execution_error':
        return {
          error: true,
          message: `❌ Execution error: ${result.error}`,
          error: result.error
        };
        
      default:
        return result;
    }
  }

  /**
   * Formats status for conversational display
   * @private
   */
  formatStatusResponse(status) {
    if (!status.exists) {
      return {
        error: true,
        message: 'Session not found or expired'
      };
    }
    
    const statusMessages = {
      collecting: 'Validating request parameters',
      collecting_data: 'Collecting missing information from user',
      executing: 'Executing API call',
      completed: 'Execution completed successfully',
      failed: 'Execution failed',
      cancelled: 'Execution was cancelled'
    };
    
    return {
      sessionId: status.sessionId,
      status: status.status,
      message: statusMessages[status.status] || status.status,
      attempts: status.attempts,
      maxRetries: status.maxRetries,
      progressSteps: status.progressSteps
    };
  }

  /**
   * Gets executor statistics
   * @returns {Object} Statistics
   */
  getStats() {
    return {
      retry: this.retryManager.getSessionStats(),
      collection: {
        activeSessions: this.parameterCollector.activeCollections.size
      }
    };
  }
}