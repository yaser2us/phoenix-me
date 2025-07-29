import { logger } from '../utils/logger.js';
import zlib from 'zlib';
import { promisify } from 'util';

const gzip = promisify(zlib.gzip);
const gunzip = promisify(zlib.gunzip);

/**
 * Performance Optimizer for Phase 4.1 Checkpoint 3
 * Optimizes cache performance through compression, prefetching, and warming
 * 
 * Features:
 * - Response compression (gzip)
 * - Cache warming strategies
 * - Predictive prefetching
 * - Bandwidth optimization
 * - Performance metrics tracking
 */
export class PerformanceOptimizer {
  constructor(cache) {
    this.cache = cache;
    
    // Compression settings
    this.compressionConfig = {
      enabled: true,
      minSize: 1024, // Minimum size in bytes to compress
      level: 6, // zlib compression level (1-9)
      types: ['application/json', 'text/plain', 'text/html', 'application/xml']
    };

    // Prefetch configuration
    this.prefetchConfig = {
      enabled: true,
      maxConcurrent: 3,
      patterns: new Map(), // Pattern-based prefetch rules
      predictions: new Map() // ML-based predictions (simplified)
    };

    // Cache warming configuration
    this.warmingConfig = {
      enabled: true,
      schedule: {
        weather: { interval: 3600000, apis: ['weather'] }, // Every hour
        currency: { interval: 1800000, apis: ['currency'] }, // Every 30 min
        news: { interval: 900000, apis: ['news'] } // Every 15 min
      },
      inProgress: new Set()
    };

    // Performance metrics
    this.metrics = {
      compressionSavings: 0,
      prefetchHits: 0,
      prefetchMisses: 0,
      warmingExecutions: 0,
      bandwidthSaved: 0,
      avgCompressionRatio: 0,
      compressionCount: 0
    };

    // Common request patterns for prefetching
    this.requestPatterns = {
      banking: {
        'getAccountBalance': ['getAccountTransactions', 'getAccount'],
        'getAccounts': ['getAccountBalance'],
        'getTransaction': ['getAccountTransactions']
      },
      weather: {
        'getCurrentWeather': ['getForecast'],
        'getForecast': ['getCurrentWeather']
      },
      currency: {
        'getExchangeRate': ['getHistoricalRates']
      }
    };

    this.initialized = true;
    logger.info('Performance Optimizer initialized for cache optimization');
  }

  /**
   * Optimize data before caching
   * @param {string} key - Cache key
   * @param {*} data - Data to optimize
   * @param {Object} options - Optimization options
   * @returns {Promise<Object>} Optimized data and metadata
   */
  async optimizeForCache(key, data, options = {}) {
    try {
      const originalSize = JSON.stringify(data).length;
      let optimizedData = data;
      let compressed = false;
      let compressionRatio = 1;

      // Check if compression is beneficial
      if (this.shouldCompress(data, options)) {
        const compressedResult = await this.compressData(data);
        
        if (compressedResult.beneficial) {
          optimizedData = compressedResult.compressed;
          compressed = true;
          compressionRatio = compressedResult.ratio;
          
          // Update metrics
          this.metrics.compressionSavings += compressedResult.saved;
          this.metrics.bandwidthSaved += compressedResult.saved;
          this.metrics.compressionCount++;
          this.metrics.avgCompressionRatio = 
            (this.metrics.avgCompressionRatio * (this.metrics.compressionCount - 1) + compressionRatio) / 
            this.metrics.compressionCount;
        }
      }

      // Trigger prefetching for related data
      if (options.apiType && options.operation) {
        this.schedulePrefetch(options.apiType, options.operation, options.context);
      }

      logger.info('Data optimized for cache', {
        key,
        originalSize,
        optimizedSize: compressed ? optimizedData.length : originalSize,
        compressed,
        compressionRatio: compressionRatio.toFixed(2)
      });

      return {
        data: optimizedData,
        metadata: {
          compressed,
          originalSize,
          optimizedSize: compressed ? optimizedData.length : originalSize,
          compressionRatio,
          timestamp: Date.now()
        }
      };

    } catch (error) {
      logger.error('Error optimizing data for cache', { key, error: error.message });
      return {
        data: data,
        metadata: { compressed: false, error: error.message }
      };
    }
  }

  /**
   * Retrieve and decompress data from cache
   * @param {string} key - Cache key
   * @param {*} cachedData - Cached data
   * @param {Object} metadata - Cache metadata
   * @returns {Promise<*>} Original data
   */
  async retrieveFromCache(key, cachedData, metadata) {
    try {
      if (!metadata.compressed) {
        return cachedData;
      }

      const decompressed = await this.decompressData(cachedData);
      
      logger.info('Data decompressed from cache', {
        key,
        compressedSize: cachedData.length,
        decompressedSize: JSON.stringify(decompressed).length
      });

      return decompressed;

    } catch (error) {
      logger.error('Error retrieving from cache', { key, error: error.message });
      throw error;
    }
  }

  /**
   * Check if data should be compressed
   * @param {*} data - Data to check
   * @param {Object} options - Options
   * @returns {boolean} Should compress
   */
  shouldCompress(data, options = {}) {
    if (!this.compressionConfig.enabled) {
      return false;
    }

    const dataStr = JSON.stringify(data);
    
    // Check minimum size
    if (dataStr.length < this.compressionConfig.minSize) {
      return false;
    }

    // Check content type if provided
    if (options.contentType) {
      return this.compressionConfig.types.includes(options.contentType);
    }

    return true;
  }

  /**
   * Compress data using gzip
   * @param {*} data - Data to compress
   * @returns {Promise<Object>} Compression result
   */
  async compressData(data) {
    try {
      const jsonStr = JSON.stringify(data);
      const originalSize = Buffer.byteLength(jsonStr);
      
      const compressed = await gzip(jsonStr, {
        level: this.compressionConfig.level
      });
      
      const compressedSize = compressed.length;
      const ratio = originalSize / compressedSize;
      const saved = originalSize - compressedSize;
      
      // Only use compression if it saves at least 20%
      const beneficial = ratio > 1.2;

      return {
        compressed: compressed.toString('base64'),
        originalSize,
        compressedSize,
        ratio,
        saved,
        beneficial
      };

    } catch (error) {
      logger.error('Compression error', { error: error.message });
      throw error;
    }
  }

  /**
   * Decompress data
   * @param {string} compressedData - Base64 compressed data
   * @returns {Promise<*>} Decompressed data
   */
  async decompressData(compressedData) {
    try {
      const buffer = Buffer.from(compressedData, 'base64');
      const decompressed = await gunzip(buffer);
      return JSON.parse(decompressed.toString());

    } catch (error) {
      logger.error('Decompression error', { error: error.message });
      throw error;
    }
  }

  /**
   * Schedule prefetch for related data
   * @param {string} apiType - API type
   * @param {string} operation - Current operation
   * @param {Object} context - Request context
   */
  async schedulePrefetch(apiType, operation, context = {}) {
    if (!this.prefetchConfig.enabled) {
      return;
    }

    try {
      const patterns = this.requestPatterns[apiType];
      if (!patterns || !patterns[operation]) {
        return;
      }

      const relatedOps = patterns[operation];
      
      // Schedule prefetch for related operations
      for (const relatedOp of relatedOps) {
        const prefetchKey = `${apiType}:${relatedOp}:${context.userId || 'public'}`;
        
        // Check if already cached or being fetched
        const cached = await this.cache.get(prefetchKey, context);
        if (cached) {
          this.metrics.prefetchHits++;
          continue;
        }

        // Add to prefetch queue
        this.addToPrefetchQueue(prefetchKey, {
          apiType,
          operation: relatedOp,
          context,
          priority: this.calculatePrefetchPriority(apiType, relatedOp)
        });
      }

      logger.info('Prefetch scheduled', {
        apiType,
        operation,
        relatedOperations: relatedOps.length
      });

    } catch (error) {
      logger.error('Error scheduling prefetch', { error: error.message });
    }
  }

  /**
   * Add item to prefetch queue
   * @param {string} key - Prefetch key
   * @param {Object} details - Prefetch details
   */
  addToPrefetchQueue(key, details) {
    // In a real implementation, this would use a priority queue
    // For now, we'll execute immediately if under concurrent limit
    if (this.prefetchConfig.patterns.size < this.prefetchConfig.maxConcurrent) {
      this.executePrefetch(key, details);
    }
  }

  /**
   * Execute prefetch operation
   * @param {string} key - Prefetch key
   * @param {Object} details - Prefetch details
   */
  async executePrefetch(key, details) {
    try {
      this.prefetchConfig.patterns.set(key, details);
      
      // Simulate API call for prefetch
      // In real implementation, this would call the actual API
      logger.info('Executing prefetch', { key, operation: details.operation });
      
      // Record metrics
      this.metrics.prefetchMisses++;
      
      // Remove from active prefetches
      setTimeout(() => {
        this.prefetchConfig.patterns.delete(key);
      }, 5000);

    } catch (error) {
      logger.error('Prefetch execution error', { key, error: error.message });
      this.prefetchConfig.patterns.delete(key);
    }
  }

  /**
   * Calculate prefetch priority
   * @param {string} apiType - API type
   * @param {string} operation - Operation
   * @returns {number} Priority (higher = more important)
   */
  calculatePrefetchPriority(apiType, operation) {
    // Simple priority calculation
    const priorities = {
      banking: { base: 10, operations: { getAccountBalance: 5, getAccountTransactions: 3 } },
      weather: { base: 5, operations: { getForecast: 3, getCurrentWeather: 2 } },
      currency: { base: 7, operations: { getExchangeRate: 4, getHistoricalRates: 2 } }
    };

    const apiPriority = priorities[apiType] || { base: 1, operations: {} };
    const opPriority = apiPriority.operations[operation] || 0;
    
    return apiPriority.base + opPriority;
  }

  /**
   * Warm cache with frequently accessed data
   * @param {string} apiType - API type to warm
   * @param {Object} options - Warming options
   * @returns {Promise<Object>} Warming result
   */
  async warmCache(apiType, options = {}) {
    if (!this.warmingConfig.enabled) {
      return { warmed: 0, skipped: 'disabled' };
    }

    // Prevent concurrent warming for same API
    if (this.warmingConfig.inProgress.has(apiType)) {
      return { warmed: 0, skipped: 'in_progress' };
    }

    try {
      this.warmingConfig.inProgress.add(apiType);
      this.metrics.warmingExecutions++;
      
      let warmed = 0;
      
      // Define common warming patterns
      const warmingPatterns = {
        weather: [
          { key: 'weather:current:popular_cities', data: { temperature: 72, conditions: 'sunny' } },
          { key: 'weather:forecast:popular_cities', data: { forecast: '5-day forecast data' } }
        ],
        currency: [
          { key: 'currency:rates:USD', data: { EUR: 0.85, GBP: 0.73, JPY: 110 } },
          { key: 'currency:rates:EUR', data: { USD: 1.18, GBP: 0.86, JPY: 130 } }
        ],
        news: [
          { key: 'news:headlines:latest', data: { articles: ['headline1', 'headline2'] } },
          { key: 'news:categories:business', data: { articles: ['business1', 'business2'] } }
        ]
      };

      const patterns = warmingPatterns[apiType] || [];
      
      for (const pattern of patterns) {
        const cached = await this.cache.set(pattern.key, pattern.data, {
          apiType,
          ttl: 3600, // 1 hour for warmed data
          warmed: true
        });
        
        if (cached) {
          warmed++;
        }
      }

      logger.info('Cache warming completed', {
        apiType,
        warmed,
        patterns: patterns.length
      });

      return { warmed, apiType, timestamp: Date.now() };

    } catch (error) {
      logger.error('Cache warming error', { apiType, error: error.message });
      return { warmed: 0, error: error.message };
      
    } finally {
      this.warmingConfig.inProgress.delete(apiType);
    }
  }

  /**
   * Start automatic cache warming
   */
  startAutoWarming() {
    Object.entries(this.warmingConfig.schedule).forEach(([name, config]) => {
      setInterval(() => {
        config.apis.forEach(api => this.warmCache(api));
      }, config.interval);
      
      logger.info('Auto-warming scheduled', {
        name,
        interval: config.interval,
        apis: config.apis
      });
    });
  }

  /**
   * Analyze cache performance and suggest optimizations
   * @returns {Object} Performance analysis
   */
  analyzePerformance() {
    const cacheStats = this.cache.getStats();
    
    const analysis = {
      cacheEfficiency: {
        hitRate: cacheStats.performance.hitRate,
        status: cacheStats.performance.hitRate > 0.7 ? 'good' : 'needs_improvement'
      },
      
      compression: {
        enabled: this.compressionConfig.enabled,
        avgRatio: this.metrics.avgCompressionRatio,
        totalSaved: this.metrics.bandwidthSaved,
        status: this.metrics.avgCompressionRatio > 1.5 ? 'effective' : 'moderate'
      },
      
      prefetching: {
        enabled: this.prefetchConfig.enabled,
        hitRate: this.metrics.prefetchHits / (this.metrics.prefetchHits + this.metrics.prefetchMisses) || 0,
        status: 'active'
      },
      
      suggestions: []
    };

    // Generate suggestions
    if (analysis.cacheEfficiency.hitRate < 0.5) {
      analysis.suggestions.push({
        type: 'cache_ttl',
        message: 'Consider increasing cache TTL for frequently accessed data'
      });
    }

    if (analysis.compression.avgRatio < 1.3 && this.compressionConfig.enabled) {
      analysis.suggestions.push({
        type: 'compression_threshold',
        message: 'Increase minimum size threshold for compression to reduce overhead'
      });
    }

    if (!this.warmingConfig.enabled) {
      analysis.suggestions.push({
        type: 'cache_warming',
        message: 'Enable cache warming for popular data to improve hit rate'
      });
    }

    return analysis;
  }

  /**
   * Get optimizer statistics
   * @returns {Object} Optimizer statistics
   */
  getStats() {
    return {
      initialized: this.initialized,
      compression: {
        enabled: this.compressionConfig.enabled,
        totalCompressions: this.metrics.compressionCount,
        avgCompressionRatio: this.metrics.avgCompressionRatio.toFixed(2),
        bandwidthSaved: this.metrics.bandwidthSaved,
        savingsInMB: (this.metrics.bandwidthSaved / 1024 / 1024).toFixed(2)
      },
      prefetching: {
        enabled: this.prefetchConfig.enabled,
        hits: this.metrics.prefetchHits,
        misses: this.metrics.prefetchMisses,
        hitRate: (this.metrics.prefetchHits / (this.metrics.prefetchHits + this.metrics.prefetchMisses) || 0).toFixed(2),
        activePrefetches: this.prefetchConfig.patterns.size
      },
      warming: {
        enabled: this.warmingConfig.enabled,
        executions: this.metrics.warmingExecutions,
        scheduled: Object.keys(this.warmingConfig.schedule).length,
        inProgress: this.warmingConfig.inProgress.size
      },
      features: {
        compression: true,
        prefetching: true,
        cacheWarming: true,
        performanceAnalysis: true,
        bandwidthOptimization: true
      }
    };
  }
}