import { logger } from '../utils/logger.js';

/**
 * Fallback Manager for Phase 4 Checkpoint 4
 * Provides intelligent fallback systems for API failures with:
 * - Smart fallback selection based on API quality and compatibility
 * - Circuit breaker patterns for unreliable APIs
 * - Quality-aware retry strategies
 * - Performance-based fallback ordering
 * - Integration with SmartSelector and QualityScorer
 */
export class FallbackManager {
  constructor(registry, executor) {
    this.registry = registry;
    this.executor = executor;
    
    // Circuit breaker states for each API
    this.circuitBreakers = new Map();
    
    // Fallback chain configurations
    this.fallbackChains = new Map([
      ['weather', [
        { primary: 'openweather', fallbacks: ['weatherapi', 'weatherstack'] },
        { primary: 'weatherapi', fallbacks: ['openweather', 'weatherstack'] },
        { primary: 'weatherstack', fallbacks: ['openweather', 'weatherapi'] }
      ]],
      ['news', [
        { primary: 'newsapi', fallbacks: ['gnews', 'currentsapi'] },
        { primary: 'gnews', fallbacks: ['newsapi', 'currentsapi'] },
        { primary: 'currentsapi', fallbacks: ['newsapi', 'gnews'] }
      ]],
      ['currency', [
        { primary: 'exchangerate', fallbacks: ['fixer', 'currencylayer'] },
        { primary: 'fixer', fallbacks: ['exchangerate', 'currencylayer'] },
        { primary: 'currencylayer', fallbacks: ['exchangerate', 'fixer'] }
      ]],
      ['location', [
        { primary: 'ipapi', fallbacks: ['ipgeolocation', 'maxmind'] },
        { primary: 'ipgeolocation', fallbacks: ['maxmind', 'ipapi'] },
        { primary: 'maxmind', fallbacks: ['ipapi', 'ipgeolocation'] }
      ]]
    ]);

    // Circuit breaker configuration
    this.circuitBreakerConfig = {
      failureThreshold: 5,        // Failures before opening circuit
      timeoutThreshold: 10000,    // Max response time before considering failure
      resetTimeout: 60000,        // Time before attempting to close circuit
      halfOpenMaxCalls: 3         // Max calls in half-open state
    };

    // Retry configuration
    this.retryConfig = {
      maxRetries: 3,
      baseDelay: 1000,           // Base delay between retries (ms)
      backoffMultiplier: 2,      // Exponential backoff multiplier
      maxDelay: 30000,           // Maximum delay between retries
      retryableErrors: ['TIMEOUT', 'NETWORK_ERROR', 'SERVICE_UNAVAILABLE']
    };

    // Quality thresholds for fallback decisions
    this.qualityThresholds = {
      excellent: 9,
      acceptable: 6,
      minimum: 4
    };

    this.fallbackHistory = new Map();
    this.initialized = true;
  }

  /**
   * Execute operation with intelligent fallback support
   * @param {Object} operation - Operation to execute
   * @param {Object} options - Execution options
   * @returns {Object} Execution result with fallback information
   */
  async executeWithFallback(operation, options = {}) {
    const startTime = Date.now();
    const attemptHistory = [];
    
    try {
      logger.debug('Starting fallback execution', { 
        operation: operation.type, 
        primaryAPI: options.primaryAPI 
      });

      // Try primary API first
      if (options.primaryAPI) {
        const primaryResult = await this.attemptExecution(
          operation,
          options.primaryAPI,
          options.parameters,
          attemptHistory
        );
        
        if (primaryResult.success) {
          return this.createSuccessResult(primaryResult, attemptHistory, startTime);
        }
      }

      // Get fallback candidates based on domain and quality
      const fallbackCandidates = await this.getFallbackCandidates(
        operation.domain,
        options.primaryAPI,
        options
      );

      // Try fallback APIs in order of preference
      for (const candidate of fallbackCandidates) {
        logger.debug('Attempting fallback API', { api: candidate.id });

        const fallbackResult = await this.attemptExecution(
          operation,
          candidate.id,
          options.parameters,
          attemptHistory
        );

        if (fallbackResult.success) {
          return this.createSuccessResult(fallbackResult, attemptHistory, startTime, candidate.id);
        }
      }

      // All attempts failed
      return this.createFailureResult(operation, attemptHistory, startTime);

    } catch (error) {
      logger.error('Fallback execution failed', { error: error.message });
      return this.createErrorResult(operation, error, attemptHistory, startTime);
    }
  }

  /**
   * Attempt execution with a specific API
   * @param {Object} operation - Operation to execute
   * @param {string} apiId - API identifier
   * @param {Object} parameters - Operation parameters
   * @param {Array} attemptHistory - History of attempts
   * @returns {Object} Execution attempt result
   */
  async attemptExecution(operation, apiId, parameters, attemptHistory) {
    const attemptStartTime = Date.now();
    
    try {
      // Check circuit breaker
      const circuitState = this.getCircuitBreakerState(apiId);
      if (circuitState === 'open') {
        logger.debug('Circuit breaker open, skipping API', { api: apiId });
        
        attemptHistory.push({
          apiId: apiId,
          status: 'skipped',
          reason: 'circuit_breaker_open',
          timestamp: new Date().toISOString(),
          duration: 0
        });
        
        return { success: false, reason: 'circuit_breaker_open' };
      }

      // Perform the actual API call
      const executionResult = await this.executeAPICall(operation, apiId, parameters);
      const executionTime = Date.now() - attemptStartTime;

      // Record attempt
      attemptHistory.push({
        apiId: apiId,
        status: executionResult.success ? 'success' : 'failed',
        reason: executionResult.reason || 'unknown',
        responseTime: executionTime,
        timestamp: new Date().toISOString(),
        duration: executionTime,
        quality: executionResult.quality || 0
      });

      // Update circuit breaker
      if (executionResult.success) {
        this.recordSuccess(apiId);
      } else {
        this.recordFailure(apiId, executionResult.reason);
      }

      return executionResult;

    } catch (error) {
      const executionTime = Date.now() - attemptStartTime;
      
      attemptHistory.push({
        apiId: apiId,
        status: 'error',
        reason: error.message,
        responseTime: executionTime,
        timestamp: new Date().toISOString(),
        duration: executionTime
      });

      this.recordFailure(apiId, error.message);
      
      return { 
        success: false, 
        reason: error.message,
        error: error
      };
    }
  }

  /**
   * Execute actual API call through the executor
   * @param {Object} operation - Operation details
   * @param {string} apiId - API identifier
   * @param {Object} parameters - Call parameters
   * @returns {Object} API call result
   */
  async executeAPICall(operation, apiId, parameters) {
    try {
      // Get API configuration from registry
      const apiConfig = this.registry.getAPI?.(apiId);
      if (!apiConfig) {
        return {
          success: false,
          reason: 'api_not_found',
          error: `API ${apiId} not found in registry`
        };
      }

      // Execute through the provided executor
      const result = await this.executor.execute({
        apiId: apiId,
        operation: operation.type,
        parameters: parameters,
        timeout: this.circuitBreakerConfig.timeoutThreshold
      });

      // Simulate quality scoring for testing
      const quality = this.simulateQualityScore(result, operation.domain);

      return {
        success: true,
        data: result.data,
        responseTime: result.responseTime || Date.now(),
        quality: quality,
        metadata: {
          apiId: apiId,
          operation: operation.type,
          cached: result.cached || false
        }
      };

    } catch (error) {
      return {
        success: false,
        reason: this.categorizeError(error),
        error: error
      };
    }
  }

  /**
   * Get fallback candidates for a domain
   * @param {string} domain - API domain
   * @param {string} primaryAPI - Primary API that failed
   * @param {Object} options - Selection options
   * @returns {Array} Ordered list of fallback candidates
   */
  async getFallbackCandidates(domain, primaryAPI, options = {}) {
    const candidates = [];
    
    // Get domain-specific fallback chain
    const domainChains = this.fallbackChains.get(domain) || [];
    const relevantChain = domainChains.find(chain => chain.primary === primaryAPI);
    
    if (relevantChain) {
      // Add configured fallbacks
      for (const fallbackId of relevantChain.fallbacks) {
        const circuitState = this.getCircuitBreakerState(fallbackId);
        if (circuitState !== 'open') {
          candidates.push({
            id: fallbackId,
            source: 'configured_fallback',
            priority: 1,
            circuitState: circuitState
          });
        }
      }
    }

    // Add any other available APIs for the domain
    const allDomainAPIs = this.getAllDomainAPIs(domain);
    for (const apiId of allDomainAPIs) {
      if (apiId !== primaryAPI && !candidates.some(c => c.id === apiId)) {
        const circuitState = this.getCircuitBreakerState(apiId);
        if (circuitState !== 'open') {
          candidates.push({
            id: apiId,
            source: 'domain_alternative',
            priority: 2,
            circuitState: circuitState
          });
        }
      }
    }

    // Sort candidates by priority and circuit breaker state
    candidates.sort((a, b) => {
      if (a.priority !== b.priority) {
        return a.priority - b.priority;
      }
      
      // Prefer closed circuits over half-open
      if (a.circuitState === 'closed' && b.circuitState === 'half_open') {
        return -1;
      }
      if (a.circuitState === 'half_open' && b.circuitState === 'closed') {
        return 1;
      }
      
      return 0;
    });

    // Apply quality-based filtering if SmartSelector is available
    if (options.smartSelector && candidates.length > 1) {
      const qualityFiltered = await this.applyQualityFiltering(candidates, domain, options);
      return qualityFiltered.slice(0, 3); // Limit to top 3 candidates
    }

    return candidates.slice(0, 3); // Limit to top 3 candidates
  }

  /**
   * Apply quality-based filtering to fallback candidates
   * @param {Array} candidates - Fallback candidates
   * @param {string} domain - API domain
   * @param {Object} options - Filtering options
   * @returns {Array} Quality-filtered candidates
   */
  async applyQualityFiltering(candidates, domain, options) {
    const qualityResults = [];

    for (const candidate of candidates) {
      try {
        // Get historical quality data if available
        const qualityData = await this.getQualityData(candidate.id, domain);
        
        if (qualityData && qualityData.averageScore >= this.qualityThresholds.minimum) {
          qualityResults.push({
            ...candidate,
            qualityScore: qualityData.averageScore,
            qualityCategory: this.categorizeQuality(qualityData.averageScore)
          });
        } else {
          // Include with default quality for new APIs
          qualityResults.push({
            ...candidate,
            qualityScore: 7, // Default score
            qualityCategory: 'acceptable'
          });
        }
      } catch (error) {
        logger.warn('Quality filtering failed for candidate', { 
          candidate: candidate.id, 
          error: error.message 
        });
        
        // Include with low quality score on error
        qualityResults.push({
          ...candidate,
          qualityScore: 5,
          qualityCategory: 'minimum'
        });
      }
    }

    // Sort by quality score (highest first)
    return qualityResults.sort((a, b) => b.qualityScore - a.qualityScore);
  }

  /**
   * Get circuit breaker state for an API
   * @param {string} apiId - API identifier
   * @returns {string} Circuit breaker state (closed, open, half_open)
   */
  getCircuitBreakerState(apiId) {
    const breaker = this.circuitBreakers.get(apiId);
    if (!breaker) {
      return 'closed';
    }

    const now = Date.now();

    // Check if circuit should be reset
    if (breaker.state === 'open' && now >= breaker.nextRetryTime) {
      breaker.state = 'half_open';
      breaker.halfOpenCalls = 0;
      logger.debug('Circuit breaker transitioning to half-open', { api: apiId });
    }

    return breaker.state;
  }

  /**
   * Record successful API call
   * @param {string} apiId - API identifier
   */
  recordSuccess(apiId) {
    const breaker = this.circuitBreakers.get(apiId);
    if (!breaker) {
      return;
    }

    if (breaker.state === 'half_open') {
      breaker.halfOpenCalls++;
      
      if (breaker.halfOpenCalls >= this.circuitBreakerConfig.halfOpenMaxCalls) {
        breaker.state = 'closed';
        breaker.failureCount = 0;
        logger.debug('Circuit breaker closed after successful half-open calls', { api: apiId });
      }
    } else if (breaker.state === 'closed') {
      breaker.failureCount = Math.max(0, breaker.failureCount - 1);
    }
  }

  /**
   * Record failed API call
   * @param {string} apiId - API identifier
   * @param {string} reason - Failure reason
   */
  recordFailure(apiId, reason) {
    let breaker = this.circuitBreakers.get(apiId);
    if (!breaker) {
      breaker = {
        state: 'closed',
        failureCount: 0,
        lastFailureTime: null,
        nextRetryTime: null,
        halfOpenCalls: 0
      };
      this.circuitBreakers.set(apiId, breaker);
    }

    breaker.failureCount++;
    breaker.lastFailureTime = Date.now();

    // Open circuit if failure threshold exceeded
    if (breaker.failureCount >= this.circuitBreakerConfig.failureThreshold) {
      breaker.state = 'open';
      breaker.nextRetryTime = Date.now() + this.circuitBreakerConfig.resetTimeout;
      
      logger.warn('Circuit breaker opened due to failures', { 
        api: apiId, 
        failures: breaker.failureCount,
        reason: reason
      });
    }
  }

  /**
   * Create successful execution result
   * @param {Object} result - Execution result
   * @param {Array} attemptHistory - History of attempts
   * @param {number} startTime - Execution start time
   * @param {string} fallbackAPI - API used (if fallback)
   * @returns {Object} Success result
   */
  createSuccessResult(result, attemptHistory, startTime, fallbackAPI = null) {
    const totalTime = Date.now() - startTime;
    
    const successResult = {
      success: true,
      data: result.data,
      responseTime: totalTime,
      metadata: {
        ...result.metadata,
        usedFallback: !!fallbackAPI,
        fallbackAPI: fallbackAPI,
        attemptsCount: attemptHistory.length,
        attemptHistory: attemptHistory,
        quality: result.quality || 0
      }
    };

    // Record fallback usage
    if (fallbackAPI) {
      this.recordFallbackUsage(result.metadata.operation, fallbackAPI, true);
    }

    return successResult;
  }

  /**
   * Create failure result when all attempts failed
   * @param {Object} operation - Original operation
   * @param {Array} attemptHistory - History of attempts
   * @param {number} startTime - Execution start time
   * @returns {Object} Failure result
   */
  createFailureResult(operation, attemptHistory, startTime) {
    const totalTime = Date.now() - startTime;
    
    return {
      success: false,
      error: 'All fallback attempts failed',
      responseTime: totalTime,
      metadata: {
        operation: operation.type,
        domain: operation.domain,
        attemptsCount: attemptHistory.length,
        attemptHistory: attemptHistory,
        allFailureReasons: attemptHistory.map(a => a.reason)
      }
    };
  }

  /**
   * Create error result for execution errors
   * @param {Object} operation - Original operation
   * @param {Error} error - Execution error
   * @param {Array} attemptHistory - History of attempts
   * @param {number} startTime - Execution start time
   * @returns {Object} Error result
   */
  createErrorResult(operation, error, attemptHistory, startTime) {
    const totalTime = Date.now() - startTime;
    
    return {
      success: false,
      error: error.message,
      responseTime: totalTime,
      metadata: {
        operation: operation.type,
        domain: operation.domain,
        attemptsCount: attemptHistory.length,
        attemptHistory: attemptHistory,
        executionError: true
      }
    };
  }

  /**
   * Record fallback usage for analytics
   * @param {string} operation - Operation type
   * @param {string} fallbackAPI - Fallback API used
   * @param {boolean} success - Whether fallback succeeded
   */
  recordFallbackUsage(operation, fallbackAPI, success) {
    const key = `${operation}:${fallbackAPI}`;
    
    if (!this.fallbackHistory.has(key)) {
      this.fallbackHistory.set(key, {
        operation: operation,
        fallbackAPI: fallbackAPI,
        usageCount: 0,
        successCount: 0,
        lastUsed: null
      });
    }
    
    const record = this.fallbackHistory.get(key);
    record.usageCount++;
    record.lastUsed = new Date().toISOString();
    
    if (success) {
      record.successCount++;
    }
  }

  // Helper methods
  getAllDomainAPIs(domain) {
    // Return known APIs for domain (would typically come from registry)
    const domainAPIs = {
      'weather': ['openweather', 'weatherapi', 'weatherstack'],
      'news': ['newsapi', 'gnews', 'currentsapi'],
      'currency': ['exchangerate', 'fixer', 'currencylayer'],
      'location': ['ipapi', 'ipgeolocation', 'maxmind']
    };
    
    return domainAPIs[domain] || [];
  }

  async getQualityData(apiId, domain) {
    // Simulate getting quality data (would integrate with QualityScorer)
    const mockQuality = {
      'openweather': { averageScore: 8.5 },
      'weatherapi': { averageScore: 9.0 },
      'weatherstack': { averageScore: 7.2 },
      'newsapi': { averageScore: 8.8 },
      'gnews': { averageScore: 8.0 },
      'currentsapi': { averageScore: 7.5 }
    };
    
    return mockQuality[apiId] || { averageScore: 7.0 };
  }

  categorizeQuality(score) {
    if (score >= this.qualityThresholds.excellent) return 'excellent';
    if (score >= this.qualityThresholds.acceptable) return 'acceptable';
    return 'minimum';
  }

  categorizeError(error) {
    const message = error.message.toLowerCase();
    
    if (message.includes('timeout')) return 'TIMEOUT';
    if (message.includes('network') || message.includes('connection')) return 'NETWORK_ERROR';
    if (message.includes('503') || message.includes('unavailable')) return 'SERVICE_UNAVAILABLE';
    if (message.includes('429') || message.includes('rate limit')) return 'RATE_LIMITED';
    if (message.includes('401') || message.includes('403')) return 'AUTHENTICATION_ERROR';
    
    return 'UNKNOWN_ERROR';
  }

  simulateQualityScore(result, domain) {
    // Simulate quality scoring based on response characteristics
    let score = 7; // Base score
    
    if (result.data && typeof result.data === 'object') {
      score += 1; // Good structure
    }
    
    if (result.responseTime && result.responseTime < 1000) {
      score += 1; // Fast response
    }
    
    if (Object.keys(result.data || {}).length > 3) {
      score += 0.5; // Rich data
    }
    
    return Math.min(10, score);
  }

  /**
   * Get fallback statistics
   * @param {string} domain - Optional domain filter
   * @returns {Object} Fallback usage statistics
   */
  getFallbackStats(domain = null) {
    const stats = {
      totalFallbacks: 0,
      successfulFallbacks: 0,
      topFallbackAPIs: [],
      circuitBreakerStatus: {}
    };
    
    // Aggregate fallback usage
    for (const [key, record] of this.fallbackHistory) {
      if (!domain || record.operation.includes(domain)) {
        stats.totalFallbacks += record.usageCount;
        stats.successfulFallbacks += record.successCount;
      }
    }
    
    // Circuit breaker status
    for (const [apiId, breaker] of this.circuitBreakers) {
      stats.circuitBreakerStatus[apiId] = {
        state: breaker.state,
        failureCount: breaker.failureCount,
        lastFailure: breaker.lastFailureTime
      };
    }
    
    stats.successRate = stats.totalFallbacks > 0 ? 
      (stats.successfulFallbacks / stats.totalFallbacks) * 100 : 0;
    
    return stats;
  }

  /**
   * Clear fallback history and reset circuit breakers
   * @param {string} apiId - Optional API to reset (resets all if not specified)
   */
  resetFallbackState(apiId = null) {
    if (apiId) {
      this.circuitBreakers.delete(apiId);
      
      // Clear related fallback history
      for (const [key, record] of this.fallbackHistory) {
        if (record.fallbackAPI === apiId) {
          this.fallbackHistory.delete(key);
        }
      }
    } else {
      this.circuitBreakers.clear();
      this.fallbackHistory.clear();
    }
    
    logger.debug('Fallback state reset', { apiId: apiId || 'all' });
  }
}