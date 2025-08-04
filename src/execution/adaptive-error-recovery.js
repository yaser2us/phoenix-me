import { logger } from '../utils/logger.js';

/**
 * Adaptive Error Recovery - Phase 4.9 Checkpoint 2
 * Handles intelligent error recovery and graceful degradation
 */
export class AdaptiveErrorRecovery {
  constructor() {
    this.retryStrategies = this.initializeRetryStrategies();
    this.circuitBreakers = new Map();
    this.errorPatterns = new Map();
    this.failureHistory = [];
    
    logger.info('Adaptive Error Recovery initialized');
  }

  /**
   * Determine retry strategy for a failed operation
   */
  async determineRetryStrategy(error) {
    try {
      logger.debug('Determining retry strategy', { 
        errorCode: error.code,
        errorMessage: error.message?.substring(0, 100) 
      });
      
      // Analyze error type
      const errorType = this.classifyError(error);
      
      // Get base strategy for error type
      const baseStrategy = this.retryStrategies[errorType] || this.retryStrategies.default;
      
      // Check circuit breaker status
      const circuitBreakerOpen = await this.shouldCircuitBreak(error.operation || 'unknown');
      
      if (circuitBreakerOpen) {
        return {
          shouldRetry: false,
          reason: 'Circuit breaker open',
          strategy: 'circuit_breaker',
          maxRetries: 0
        };
      }
      
      // Apply adaptive modifications based on history
      const adaptedStrategy = this.adaptStrategyBasedOnHistory(baseStrategy, error);
      
      logger.info('Retry strategy determined', {
        errorType,
        shouldRetry: adaptedStrategy.shouldRetry,
        maxRetries: adaptedStrategy.maxRetries,
        strategy: adaptedStrategy.strategy
      });
      
      return adaptedStrategy;
      
    } catch (strategyError) {
      logger.error('Retry strategy determination failed', { error: strategyError.message });
      
      // Return conservative default strategy
      return {
        shouldRetry: false,
        reason: 'Strategy determination failed',
        strategy: 'conservative',
        maxRetries: 0
      };
    }
  }

  /**
   * Execute error recovery
   */
  async executeRecovery(stepId, stepResults, workflowPlan) {
    try {
      logger.info('Executing error recovery', { stepId });
      
      const failedResult = stepResults.get(stepId);
      if (!failedResult) {
        throw new Error(`No result found for step ${stepId}`);
      }
      
      // Record failure in history
      this.recordFailure(stepId, failedResult.error, failedResult.operation);
      
      // Determine recovery approach
      const recoveryApproach = await this.selectRecoveryApproach(
        stepId, 
        failedResult, 
        workflowPlan
      );
      
      switch (recoveryApproach.type) {
        case 'retry':
          return await this.executeRetryRecovery(stepId, failedResult, recoveryApproach);
          
        case 'fallback':
          return await this.executeFallbackRecovery(stepId, failedResult, recoveryApproach);
          
        case 'alternative':
          return await this.executeAlternativeRecovery(stepId, failedResult, recoveryApproach);
          
        case 'graceful_degradation':
          return await this.executeGracefulDegradation(stepId, failedResult, workflowPlan);
          
        default:
          return {
            recovered: false,
            reason: `Unknown recovery approach: ${recoveryApproach.type}`
          };
      }
      
    } catch (error) {
      logger.error('Error recovery execution failed', { 
        stepId, 
        error: error.message 
      });
      
      return {
        recovered: false,
        reason: error.message,
        executedAt: new Date().toISOString()
      };
    }
  }

  /**
   * Plan graceful degradation for failed workflow
   */
  async planGracefulDegradation(failedStep, workflow) {
    try {
      logger.debug('Planning graceful degradation', { 
        failedStepId: failedStep.id,
        operation: failedStep.operation 
      });
      
      // Analyze impact of failure
      const impact = this.analyzeFailureImpact(failedStep, workflow);
      
      // Determine degradation strategy
      let strategy = 'continue_without';
      
      if (impact.criticalStep) {
        strategy = 'partial_results';
      }
      
      if (impact.blocksDependents > 2) {
        strategy = 'alternative_workflow';
      }
      
      const degradationPlan = {
        strategy,
        impact,
        recommendations: this.generateDegradationRecommendations(impact, workflow),
        fallbackData: this.generateFallbackData(failedStep),
        createdAt: new Date().toISOString()
      };
      
      logger.info('Graceful degradation planned', {
        strategy,
        criticalStep: impact.criticalStep,
        blockedSteps: impact.blocksDependents
      });
      
      return degradationPlan;
      
    } catch (error) {
      logger.error('Graceful degradation planning failed', { error: error.message });
      
      return {
        strategy: 'continue_without',
        impact: { criticalStep: false, blocksDependents: 0 },
        recommendations: ['Continue with available data'],
        fallbackData: null
      };
    }
  }

  /**
   * Check if circuit breaker should be opened
   */
  async shouldCircuitBreak(operationId) {
    try {
      const breaker = this.circuitBreakers.get(operationId);
      
      if (!breaker) {
        // Initialize circuit breaker for this operation
        this.circuitBreakers.set(operationId, {
          failures: 0,
          lastFailure: null,
          state: 'closed', // closed, open, half-open
          threshold: 5, // failures before opening
          timeout: 60000 // 1 minute timeout
        });
        return false;
      }
      
      // Check current state
      if (breaker.state === 'closed') {
        return false;
      }
      
      if (breaker.state === 'open') {
        // Check if timeout has passed
        const timeSinceLastFailure = Date.now() - breaker.lastFailure;
        if (timeSinceLastFailure > breaker.timeout) {
          breaker.state = 'half-open';
          logger.info('Circuit breaker moving to half-open', { operationId });
          return false;
        }
        return true;
      }
      
      // Half-open state - allow one attempt
      return false;
      
    } catch (error) {
      logger.error('Circuit breaker check failed', { operationId, error: error.message });
      return false; // Fail open
    }
  }

  /**
   * Update circuit breaker after operation result
   */
  updateCircuitBreaker(operationId, success) {
    try {
      const breaker = this.circuitBreakers.get(operationId);
      if (!breaker) return;
      
      if (success) {
        // Reset on success
        breaker.failures = 0;
        breaker.state = 'closed';
        logger.debug('Circuit breaker reset to closed', { operationId });
        
      } else {
        // Increment failures
        breaker.failures++;
        breaker.lastFailure = Date.now();
        
        if (breaker.failures >= breaker.threshold) {
          breaker.state = 'open';
          logger.warn('Circuit breaker opened', { 
            operationId, 
            failures: breaker.failures 
          });
        }
      }
      
    } catch (error) {
      logger.error('Circuit breaker update failed', { operationId, error: error.message });
    }
  }

  /**
   * Classify error type for strategy selection
   */
  classifyError(error) {
    const errorMsg = (error.message || '').toLowerCase();
    const errorCode = error.code || '';
    
    // Network errors
    if (errorCode === 'ECONNABORTED' || errorCode === 'ENOTFOUND' || 
        errorCode === 'ECONNREFUSED' || errorMsg.includes('timeout')) {
      return 'network';
    }
    
    // Authentication errors
    if (error.status === 401 || errorMsg.includes('authentication') || 
        errorMsg.includes('unauthorized')) {
      return 'authentication';
    }
    
    // Rate limiting
    if (error.status === 429 || errorMsg.includes('rate limit')) {
      return 'rate_limit';
    }
    
    // Server errors
    if (error.status >= 500 || errorMsg.includes('server error')) {
      return 'server';
    }
    
    // Client errors
    if (error.status >= 400 && error.status < 500) {
      return 'client';
    }
    
    return 'unknown';
  }

  /**
   * Adapt strategy based on historical patterns
   */
  adaptStrategyBasedOnHistory(baseStrategy, error) {
    try {
      const operation = error.operation || 'unknown';
      const recentFailures = this.getRecentFailures(operation, 5); // Last 5 failures
      
      // If operation has been failing frequently, reduce retry attempts
      if (recentFailures.length >= 3) {
        return {
          ...baseStrategy,
          maxRetries: Math.max(1, baseStrategy.maxRetries - 1),
          reason: 'Adapted due to frequent failures'
        };
      }
      
      // If this is a new type of error, be more conservative
      const errorPattern = `${error.code}-${error.status}`;
      if (!this.errorPatterns.has(errorPattern)) {
        this.errorPatterns.set(errorPattern, 1);
        return {
          ...baseStrategy,
          maxRetries: Math.max(1, Math.floor(baseStrategy.maxRetries / 2)),
          reason: 'Adapted for new error pattern'
        };
      }
      
      return baseStrategy;
      
    } catch (error) {
      logger.warn('Strategy adaptation failed', { error: error.message });
      return baseStrategy;
    }
  }

  /**
   * Select appropriate recovery approach
   */
  async selectRecoveryApproach(stepId, failedResult, workflowPlan) {
    const errorType = this.classifyError(failedResult);
    
    // Retry for transient errors
    if (['network', 'server', 'rate_limit'].includes(errorType)) {
      return { type: 'retry', strategy: errorType };
    }
    
    // Fallback for authentication errors
    if (errorType === 'authentication') {
      return { type: 'fallback', strategy: 'mock_data' };
    }
    
    // Alternative approach for client errors
    if (errorType === 'client') {
      return { type: 'alternative', strategy: 'different_operation' };
    }
    
    // Graceful degradation for unknown errors
    return { type: 'graceful_degradation', strategy: 'continue_partial' };
  }

  /**
   * Execute retry recovery
   */
  async executeRetryRecovery(stepId, failedResult, recoveryApproach) {
    logger.info('Executing retry recovery', { stepId, strategy: recoveryApproach.strategy });
    
    // Simulate retry attempt (in real implementation, would re-execute step)
    const retrySuccessful = Math.random() > 0.7; // 30% retry success rate
    
    if (retrySuccessful) {
      return {
        recovered: true,
        result: {
          success: true,
          data: { retried: true, originalError: failedResult.error },
          recoveryMethod: 'retry'
        }
      };
    }
    
    return {
      recovered: false,
      reason: 'Retry unsuccessful',
      attempts: 1
    };
  }

  /**
   * Execute fallback recovery
   */
  async executeFallbackRecovery(stepId, failedResult, recoveryApproach) {
    logger.info('Executing fallback recovery', { stepId, strategy: recoveryApproach.strategy });
    
    // Generate fallback data based on operation type
    const fallbackData = this.generateFallbackData(failedResult);
    
    return {
      recovered: true,
      result: {
        success: true,
        data: fallbackData,
        recoveryMethod: 'fallback',
        note: 'Using fallback data due to operation failure'
      }
    };
  }

  /**
   * Execute alternative recovery
   */
  async executeAlternativeRecovery(stepId, failedResult, recoveryApproach) {
    logger.info('Executing alternative recovery', { stepId, strategy: recoveryApproach.strategy });
    
    // Simulate finding alternative approach
    return {
      recovered: true,
      result: {
        success: true,
        data: { alternative: true, originalOperation: failedResult.operation },
        recoveryMethod: 'alternative',
        note: 'Used alternative approach'
      }
    };
  }

  /**
   * Execute graceful degradation
   */
  async executeGracefulDegradation(stepId, failedResult, workflowPlan) {
    logger.info('Executing graceful degradation', { stepId });
    
    return {
      recovered: true,
      result: {
        success: false, // Still failed, but gracefully handled
        data: null,
        recoveryMethod: 'graceful_degradation',
        note: 'Step failed but workflow can continue with degraded functionality'
      }
    };
  }

  /**
   * Generate fallback data for failed operation
   */
  generateFallbackData(failedResult) {
    const operation = failedResult.operation || 'unknown';
    
    if (operation.includes('balance') || operation.includes('banking')) {
      return {
        balance: { amount: 0, currency: 'MYR', note: 'Fallback data' },
        fallback: true
      };
    }
    
    if (operation.includes('weather')) {
      return {
        weather: { temperature: 28, condition: 'unknown', note: 'Fallback data' },
        fallback: true
      };
    }
    
    if (operation.includes('currency') || operation.includes('exchange')) {
      return {
        rates: { USD: 0.21, note: 'Fallback data' },
        fallback: true
      };
    }
    
    return {
      message: 'Fallback data for failed operation',
      operation,
      fallback: true,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Analyze failure impact on workflow
   */
  analyzeFailureImpact(failedStep, workflow) {
    let blocksDependents = 0;
    const criticalOperations = ['banking', 'balance', 'payment'];
    
    // Count how many steps depend on this failed step
    for (const step of workflow.steps) {
      if (step.dependencies && step.dependencies.includes(failedStep.id)) {
        blocksDependents++;
      }
    }
    
    // Check if this is a critical operation
    const criticalStep = criticalOperations.some(op => 
      failedStep.operation?.toLowerCase().includes(op)
    );
    
    return {
      criticalStep,
      blocksDependents,
      affectedSteps: blocksDependents,
      workflowCompletable: !criticalStep && blocksDependents < workflow.steps.length / 2
    };
  }

  /**
   * Generate degradation recommendations
   */
  generateDegradationRecommendations(impact, workflow) {
    const recommendations = [];
    
    if (impact.criticalStep) {
      recommendations.push('Consider retrying with different parameters');
      recommendations.push('Use cached data if available');
    }
    
    if (impact.blocksDependents > 0) {
      recommendations.push(`${impact.blocksDependents} dependent steps will be affected`);
      recommendations.push('Consider alternative data sources');
    }
    
    if (impact.workflowCompletable) {
      recommendations.push('Workflow can continue with partial results');
    } else {
      recommendations.push('Consider stopping workflow execution');
    }
    
    return recommendations;
  }

  /**
   * Record failure in history
   */
  recordFailure(stepId, error, operation) {
    const failureRecord = {
      stepId,
      operation,
      error: typeof error === 'string' ? error : error.message,
      errorCode: error.code,
      errorStatus: error.status,
      timestamp: new Date().toISOString()
    };
    
    this.failureHistory.push(failureRecord);
    
    // Keep only last 100 failures
    if (this.failureHistory.length > 100) {
      this.failureHistory.shift();
    }
    
    // Update circuit breaker
    this.updateCircuitBreaker(operation, false);
  }

  /**
   * Get recent failures for operation
   */
  getRecentFailures(operation, limit = 5) {
    return this.failureHistory
      .filter(f => f.operation === operation)
      .slice(-limit);
  }

  /**
   * Initialize retry strategies
   */
  initializeRetryStrategies() {
    return {
      network: {
        shouldRetry: true,
        maxRetries: 3,
        backoffMultiplier: 2,
        initialDelay: 1000,
        strategy: 'exponential_backoff'
      },
      
      server: {
        shouldRetry: true,
        maxRetries: 2,
        backoffMultiplier: 1.5,
        initialDelay: 2000,
        strategy: 'linear_backoff'
      },
      
      rate_limit: {
        shouldRetry: true,
        maxRetries: 3,
        backoffMultiplier: 3,
        initialDelay: 5000,
        strategy: 'exponential_backoff'
      },
      
      authentication: {
        shouldRetry: false,
        maxRetries: 0,
        strategy: 'fallback'
      },
      
      client: {
        shouldRetry: false,
        maxRetries: 0,
        strategy: 'alternative'
      },
      
      default: {
        shouldRetry: true,
        maxRetries: 1,
        backoffMultiplier: 1,
        initialDelay: 1000,
        strategy: 'simple_retry'
      }
    };
  }

  /**
   * Get error recovery metrics
   */
  getRecoveryMetrics() {
    const totalFailures = this.failureHistory.length;
    const recentFailures = this.failureHistory.filter(f => 
      Date.now() - new Date(f.timestamp).getTime() < 3600000 // Last hour
    ).length;
    
    const circuitBreakerStates = {};
    for (const [operation, breaker] of this.circuitBreakers) {
      circuitBreakerStates[operation] = breaker.state;
    }
    
    return {
      totalFailures,
      recentFailures,
      circuitBreakers: this.circuitBreakers.size,
      circuitBreakerStates,
      retryStrategies: Object.keys(this.retryStrategies),
      errorPatterns: this.errorPatterns.size
    };
  }

  /**
   * Clear failure history
   */
  clearHistory() {
    this.failureHistory = [];
    this.circuitBreakers.clear();
    this.errorPatterns.clear();
    logger.info('Error recovery history cleared');
  }
}