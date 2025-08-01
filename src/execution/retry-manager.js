import { logger } from '../utils/logger.js';

/**
 * Retry Manager - Manages retry attempts after user provides missing data
 * Handles the complete validation-collection-retry-execution cycle
 */
export class RetryManager {
  constructor() {
    this.logger = logger;
    
    // Active retry sessions
    this.retrySessions = new Map();
    
    // Configuration
    this.config = {
      maxRetries: 3,
      sessionTimeout: 300000, // 5 minutes
      enableProgressTracking: true
    };
  }

  /**
   * Creates a new retry session for API execution
   * @param {Object} operation - The API operation specification
   * @param {Object} userParameters - Original user parameters
   * @param {Object} authConfig - Authentication configuration
   * @param {Object} components - OpenAPI components
   * @returns {Object} Retry session info
   */
  createRetrySession(operation, userParameters, authConfig, components = {}) {
    const sessionId = this.generateSessionId();
    
    const session = {
      id: sessionId,
      operation: operation,
      userParameters: { ...userParameters },
      authConfig: authConfig,
      components: components,
      attempts: 0,
      maxRetries: this.config.maxRetries,
      status: 'collecting',
      createdAt: Date.now(),
      lastActivity: Date.now(),
      collectionHistory: [],
      validationHistory: [],
      progressSteps: []
    };
    
    this.retrySessions.set(sessionId, session);
    
    // Set cleanup timeout
    setTimeout(() => {
      this.cleanupSession(sessionId);
    }, this.config.sessionTimeout);
    
    this.logger.debug(`Created retry session ${sessionId}`);
    
    return {
      sessionId: sessionId,
      status: 'created',
      maxRetries: this.config.maxRetries
    };
  }

  /**
   * Attempts to execute API with current data, handling validation and collection
   * @param {String} sessionId - The retry session ID
   * @param {Object} enhancedRequestBuilder - The request builder instance
   * @param {Object} interactiveCollector - The parameter collector instance
   * @param {Object} apiExecutor - The API executor instance
   * @returns {Object} Execution result or collection prompt
   */
  async attemptExecution(sessionId, enhancedRequestBuilder, interactiveCollector, apiExecutor) {
    const session = this.retrySessions.get(sessionId);
    
    if (!session) {
      return {
        success: false,
        error: 'Retry session not found or expired'
      };
    }
    
    try {
      session.lastActivity = Date.now();
      session.attempts++;
      
      this.addProgressStep(session, `Attempt ${session.attempts}: Validating request`, 'validating');
      
      // Step 1: Try to build request with current data
      const buildResult = await enhancedRequestBuilder.buildRequest(
        session.operation,
        session.userParameters,
        session.authConfig,
        session.components
      );
      
      // Store validation history
      session.validationHistory.push({
        attempt: session.attempts,
        timestamp: Date.now(),
        result: buildResult
      });
      
      if (buildResult.success) {
        // Request is valid, proceed with execution
        this.addProgressStep(session, 'Request valid, executing API call', 'executing');
        
        const executionResult = await apiExecutor.execute(buildResult.requestConfig);
        
        // Success - cleanup session
        this.addProgressStep(session, 'API call completed successfully', 'completed');
        session.status = 'completed';
        
        const finalResult = {
          success: true,
          sessionId: sessionId,
          attempts: session.attempts,
          executionResult: executionResult,
          duration: Date.now() - session.createdAt,
          progressSteps: session.progressSteps
        };
        
        // Clean up after a delay to allow final status check
        setTimeout(() => this.cleanupSession(sessionId), 5000);
        
        return finalResult;
        
      } else if (buildResult.needsUserInput) {
        // Missing data, need user interaction
        this.addProgressStep(session, `Missing ${buildResult.missingFields.length} fields, starting collection`, 'collecting');
        
        const collectionResult = await interactiveCollector.collectMissingData(
          session.operation,
          session.userParameters,
          buildResult.validation.body || buildResult.validation.parameters,
          session.components
        );
        
        if (collectionResult.success) {
          session.status = 'collecting_data';
          session.currentCollectionId = collectionResult.collectionId;
          
          return {
            success: true,
            sessionId: sessionId,
            needsUserInput: true,
            collectionId: collectionResult.collectionId,
            message: collectionResult.message,
            currentField: collectionResult.currentField,
            progress: {
              session: {
                attempt: session.attempts,
                maxRetries: session.maxRetries,
                status: session.status
              },
              collection: {
                totalFields: collectionResult.totalFields,
                collectedCount: collectionResult.collectedCount
              }
            }
          };
        } else {
          throw new Error(`Collection initialization failed: ${collectionResult.error}`);
        }
        
      } else {
        // Validation failed with non-recoverable errors
        this.addProgressStep(session, `Validation failed: ${buildResult.errors.join(', ')}`, 'failed');
        
        if (session.attempts >= session.maxRetries) {
          session.status = 'failed';
          return {
            success: false,
            sessionId: sessionId,
            error: `Max retries (${session.maxRetries}) exceeded. Validation errors: ${buildResult.errors.join(', ')}`,
            attempts: session.attempts
          };
        }
        
        return {
          success: false,
          sessionId: sessionId,
          error: buildResult.errors.join(', '),
          canRetry: true,
          attempts: session.attempts,
          maxRetries: session.maxRetries
        };
      }
      
    } catch (error) {
      this.logger.error(`Retry session ${sessionId} attempt ${session.attempts} failed:`, error);
      
      this.addProgressStep(session, `Error: ${error.message}`, 'error');
      
      if (session.attempts >= session.maxRetries) {
        session.status = 'failed';
        return {
          success: false,
          sessionId: sessionId,
          error: `Max retries exceeded. Last error: ${error.message}`,
          attempts: session.attempts
        };
      }
      
      return {
        success: false,
        sessionId: sessionId,
        error: error.message,
        canRetry: true,
        attempts: session.attempts,
        maxRetries: session.maxRetries
      };
    }
  }

  /**
   * Updates session with collected parameter data
   * @param {String} sessionId - The retry session ID
   * @param {Object} collectedData - Data collected from user interaction
   * @returns {Object} Update result
   */
  updateSessionData(sessionId, collectedData) {
    const session = this.retrySessions.get(sessionId);
    
    if (!session) {
      return {
        success: false,
        error: 'Retry session not found or expired'
      };
    }
    
    try {
      session.lastActivity = Date.now();
      
      // Merge collected data with existing parameters
      this.mergeParameters(session.userParameters, collectedData);
      
      // Record collection history
      session.collectionHistory.push({
        timestamp: Date.now(),
        collectedData: { ...collectedData }
      });
      
      this.addProgressStep(session, 'Parameter data updated, ready for retry', 'data_updated');
      
      this.logger.debug(`Updated session ${sessionId} with collected data`);
      
      return {
        success: true,
        sessionId: sessionId,
        updatedParameters: session.userParameters
      };
      
    } catch (error) {
      this.logger.error(`Failed to update session ${sessionId}:`, error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Gets the current status of a retry session
   * @param {String} sessionId - The retry session ID
   * @returns {Object} Session status
   */
  getSessionStatus(sessionId) {
    const session = this.retrySessions.get(sessionId);
    
    if (!session) {
      return {
        exists: false,
        error: 'Session not found or expired'
      };
    }
    
    return {
      exists: true,
      sessionId: sessionId,
      status: session.status,
      attempts: session.attempts,
      maxRetries: session.maxRetries,
      createdAt: session.createdAt,
      lastActivity: session.lastActivity,
      progressSteps: session.progressSteps,
      currentCollectionId: session.currentCollectionId
    };
  }

  /**
   * Cancels a retry session
   * @param {String} sessionId - The retry session ID
   * @returns {Object} Cancellation result
   */
  cancelSession(sessionId) {
    const session = this.retrySessions.get(sessionId);
    
    if (!session) {
      return {
        success: false,
        error: 'Session not found'
      };
    }
    
    session.status = 'cancelled';
    this.addProgressStep(session, 'Session cancelled by user', 'cancelled');
    
    // Clean up after a brief delay
    setTimeout(() => this.cleanupSession(sessionId), 1000);
    
    return {
      success: true,
      sessionId: sessionId,
      status: 'cancelled'
    };
  }

  /**
   * Merges collected parameters with existing ones
   * @private
   */
  mergeParameters(existing, collected) {
    for (const [key, value] of Object.entries(collected)) {
      if (key === 'body' && existing.body && typeof existing.body === 'object') {
        // Merge body objects
        Object.assign(existing.body, value);
      } else {
        // Direct assignment for other parameters
        existing[key] = value;
      }
    }
  }

  /**
   * Adds a progress step to the session
   * @private
   */
  addProgressStep(session, description, status) {
    if (!this.config.enableProgressTracking) return;
    
    session.progressSteps.push({
      timestamp: Date.now(),
      description: description,
      status: status,
      step: session.progressSteps.length + 1
    });
    
    // Keep only last 20 steps to prevent memory issues
    if (session.progressSteps.length > 20) {
      session.progressSteps = session.progressSteps.slice(-20);
    }
  }

  /**
   * Cleans up expired or completed sessions
   * @private
   */
  cleanupSession(sessionId) {
    const session = this.retrySessions.get(sessionId);
    
    if (session) {
      this.logger.debug(`Cleaning up retry session ${sessionId} (status: ${session.status})`);
      this.retrySessions.delete(sessionId);
    }
  }

  /**
   * Generates a unique session ID
   * @private
   */
  generateSessionId() {
    return `retry_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  /**
   * Gets statistics about active sessions
   * @returns {Object} Session statistics
   */
  getSessionStats() {
    const sessions = Array.from(this.retrySessions.values());
    
    return {
      totalSessions: sessions.length,
      byStatus: {
        collecting: sessions.filter(s => s.status === 'collecting').length,
        collecting_data: sessions.filter(s => s.status === 'collecting_data').length,
        executing: sessions.filter(s => s.status === 'executing').length,
        completed: sessions.filter(s => s.status === 'completed').length,
        failed: sessions.filter(s => s.status === 'failed').length,
        cancelled: sessions.filter(s => s.status === 'cancelled').length
      },
      averageAttempts: sessions.length > 0 
        ? sessions.reduce((sum, s) => sum + s.attempts, 0) / sessions.length 
        : 0
    };
  }

  /**
   * Creates a comprehensive retry flow orchestrator
   * @param {Object} requestBuilder - Enhanced request builder
   * @param {Object} collector - Interactive parameter collector
   * @param {Object} executor - API executor
   * @returns {Object} Retry orchestrator
   */
  createRetryOrchestrator(requestBuilder, collector, executor) {
    return {
      /**
       * Executes API with automatic retry and collection
       */
      executeWithRetry: async (operation, userParameters, authConfig, components = {}) => {
        // Create retry session
        const sessionInfo = this.createRetrySession(operation, userParameters, authConfig, components);
        
        // Attempt initial execution
        return await this.attemptExecution(sessionInfo.sessionId, requestBuilder, collector, executor);
      },
      
      /**
       * Continues execution after user provides data
       */
      continueWithCollectedData: async (sessionId, collectedData) => {
        // Update session with collected data
        const updateResult = this.updateSessionData(sessionId, collectedData);
        
        if (!updateResult.success) {
          return updateResult;
        }
        
        // Retry execution
        return await this.attemptExecution(sessionId, requestBuilder, collector, executor);
      },
      
      /**
       * Gets session status
       */
      getStatus: (sessionId) => this.getSessionStatus(sessionId),
      
      /**
       * Cancels session
       */
      cancel: (sessionId) => this.cancelSession(sessionId)
    };
  }
}