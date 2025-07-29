import { logger } from '../utils/logger.js';
import { SecurityClassifier } from './security-classifier.js';
import { ConsentManager } from './consent-manager.js';
import crypto from 'crypto';

/**
 * Intelligent Cache Manager for Phase 4.1 Checkpoint 3
 * Provides Redis-like caching with banking-grade security awareness
 * 
 * Features:
 * - In-memory caching with TTL support
 * - Security-aware caching decisions
 * - Request deduplication
 * - Encryption for sensitive data
 * - LRU eviction policy
 * - Cache warming and invalidation strategies
 */
export class IntelligentCache {
  constructor(options = {}) {
    // Cache configuration
    this.config = {
      maxSize: options.maxSize || 1000, // Maximum cache entries
      maxMemory: options.maxMemory || 100 * 1024 * 1024, // 100MB default
      defaultTTL: options.defaultTTL || 3600, // 1 hour default
      checkInterval: options.checkInterval || 60000, // 1 minute cleanup interval
      encryptionKey: options.encryptionKey || this.generateEncryptionKey()
    };

    // Cache storage
    this.cache = new Map(); // Main cache storage
    this.metadata = new Map(); // Cache metadata (TTL, hits, etc.)
    this.pendingRequests = new Map(); // Request deduplication
    
    // Security and consent
    this.securityClassifier = new SecurityClassifier();
    this.consentManager = new ConsentManager();
    
    // Statistics
    this.stats = {
      hits: 0,
      misses: 0,
      evictions: 0,
      securityBlocks: 0,
      consentBlocks: 0,
      deduplicationSaves: 0
    };

    // Cache invalidation patterns
    this.invalidationPatterns = {
      banking: {
        // Banking data invalidation rules
        patterns: [
          { event: 'transaction_created', invalidates: ['balance', 'transactions'] },
          { event: 'account_updated', invalidates: ['account', 'profile'] },
          { event: 'token_refreshed', invalidates: ['*'] } // Clear all on token refresh
        ]
      },
      
      currency: {
        // Currency data invalidation rules
        patterns: [
          { event: 'rate_update', invalidates: ['rate', 'exchange'] },
          { event: 'market_close', invalidates: ['*'] }
        ]
      }
    };

    // Start cleanup interval
    this.cleanupInterval = setInterval(() => this.cleanup(), this.config.checkInterval);

    this.initialized = true;
    logger.info('Intelligent Cache initialized with security awareness');
  }

  /**
   * Get value from cache with security checks
   * @param {string} key - Cache key
   * @param {Object} context - Request context
   * @returns {Promise<Object|null>} Cached value or null
   */
  async get(key, context = {}) {
    try {
      // Check if key exists
      if (!this.cache.has(key)) {
        this.stats.misses++;
        return null;
      }

      const metadata = this.metadata.get(key);
      
      // Check TTL
      if (metadata.expiresAt && Date.now() > metadata.expiresAt) {
        await this.delete(key);
        this.stats.misses++;
        return null;
      }

      // Check user consent if required
      if (metadata.requiresConsent && context.userId) {
        const hasConsent = await this.consentManager.hasConsent(
          context.userId,
          'cache_personal_data'
        );
        
        if (!hasConsent) {
          this.stats.consentBlocks++;
          logger.info('Cache access blocked - no user consent', { key, userId: context.userId });
          return null;
        }
      }

      // Decrypt if encrypted
      let value = this.cache.get(key);
      if (metadata.encrypted) {
        value = await this.decrypt(value);
      }

      // Update statistics
      this.stats.hits++;
      metadata.hits = (metadata.hits || 0) + 1;
      metadata.lastAccessed = Date.now();

      logger.info('Cache hit', {
        key,
        hits: metadata.hits,
        encrypted: metadata.encrypted,
        ttlRemaining: metadata.expiresAt ? Math.floor((metadata.expiresAt - Date.now()) / 1000) : null
      });

      return value;

    } catch (error) {
      logger.error('Cache get error', { key, error: error.message });
      return null;
    }
  }

  /**
   * Set value in cache with intelligent security decisions
   * @param {string} key - Cache key
   * @param {*} value - Value to cache
   * @param {Object} options - Caching options
   * @returns {Promise<boolean>} Success status
   */
  async set(key, value, options = {}) {
    try {
      // Classify data for security
      const classification = await this.securityClassifier.classifyData(value, {
        apiType: options.apiType,
        operation: options.operation
      });

      // Check if data should be cached
      const decision = await this.shouldCache(value, options.apiType, classification);
      
      if (!decision.shouldCache) {
        this.stats.securityBlocks++;
        logger.info('Caching blocked by security policy', {
          key,
          reason: decision.reason,
          securityLevel: classification.securityLevel
        });
        return false;
      }

      // Check cache size limits
      if (this.cache.size >= this.config.maxSize) {
        await this.evictLRU();
      }

      // Prepare value for caching
      let cacheValue = value;
      let encrypted = false;
      
      if (classification.recommendation.requiresEncryption) {
        cacheValue = await this.encrypt(value);
        encrypted = true;
      }

      // Set cache entry
      this.cache.set(key, cacheValue);
      
      // Set metadata
      const ttl = options.ttl || classification.recommendation.ttl || this.config.defaultTTL;
      this.metadata.set(key, {
        createdAt: Date.now(),
        expiresAt: ttl > 0 ? Date.now() + (ttl * 1000) : null,
        hits: 0,
        lastAccessed: Date.now(),
        encrypted: encrypted,
        securityLevel: classification.securityLevel,
        requiresConsent: classification.recommendation.requiresConsent,
        apiType: options.apiType,
        size: JSON.stringify(cacheValue).length
      });

      logger.info('Value cached successfully', {
        key,
        ttl,
        encrypted,
        securityLevel: classification.securityLevel,
        requiresConsent: classification.recommendation.requiresConsent
      });

      return true;

    } catch (error) {
      logger.error('Cache set error', { key, error: error.message });
      return false;
    }
  }

  /**
   * Delete value from cache
   * @param {string} key - Cache key
   * @returns {Promise<boolean>} Success status
   */
  async delete(key) {
    try {
      const existed = this.cache.has(key);
      this.cache.delete(key);
      this.metadata.delete(key);
      
      if (existed) {
        logger.info('Cache entry deleted', { key });
      }
      
      return existed;

    } catch (error) {
      logger.error('Cache delete error', { key, error: error.message });
      return false;
    }
  }

  /**
   * Clear all cache entries
   * @param {Object} options - Clear options
   * @returns {Promise<number>} Number of entries cleared
   */
  async clear(options = {}) {
    try {
      let cleared = 0;
      
      if (options.pattern) {
        // Clear by pattern
        const regex = new RegExp(options.pattern);
        for (const [key, metadata] of this.metadata.entries()) {
          if (regex.test(key) || (options.apiType && metadata.apiType === options.apiType)) {
            await this.delete(key);
            cleared++;
          }
        }
      } else {
        // Clear all
        cleared = this.cache.size;
        this.cache.clear();
        this.metadata.clear();
      }

      logger.info('Cache cleared', { cleared, pattern: options.pattern });
      return cleared;

    } catch (error) {
      logger.error('Cache clear error', { error: error.message });
      return 0;
    }
  }

  /**
   * Determine if data should be cached
   * @param {*} data - Data to check
   * @param {string} apiType - API type
   * @param {Object} classification - Security classification
   * @returns {Promise<Object>} Caching decision
   */
  async shouldCache(data, apiType, classification = null) {
    try {
      // Get classification if not provided
      if (!classification) {
        classification = await this.securityClassifier.classifyData(data, { apiType });
      }

      const recommendation = classification.recommendation;
      
      // Never cache secret data
      if (classification.securityLevel === 'secret') {
        return {
          shouldCache: false,
          reason: 'Secret data cannot be cached',
          ttl: 0
        };
      }

      // Check API-specific rules
      const apiRules = this.getAPISpecificRules(apiType);
      if (apiRules.neverCache) {
        return {
          shouldCache: false,
          reason: `${apiType} API data marked as never cache`,
          ttl: 0
        };
      }

      // Apply recommendation
      return {
        shouldCache: recommendation.cacheable,
        reason: recommendation.reason,
        ttl: recommendation.ttl,
        requiresEncryption: recommendation.requiresEncryption,
        requiresConsent: recommendation.requiresConsent
      };

    } catch (error) {
      logger.error('Cache decision error', { error: error.message });
      return {
        shouldCache: false,
        reason: 'Error in cache decision',
        ttl: 0
      };
    }
  }

  /**
   * Request deduplication - prevent duplicate API calls
   * @param {string} key - Request key
   * @param {Function} requestFn - Function to execute if not cached
   * @param {Object} options - Request options
   * @returns {Promise<*>} Request result
   */
  async deduplicate(key, requestFn, options = {}) {
    try {
      // Check cache first
      const cached = await this.get(key, options.context);
      if (cached !== null) {
        return cached;
      }

      // Check if request is already pending
      if (this.pendingRequests.has(key)) {
        this.stats.deduplicationSaves++;
        logger.info('Request deduplicated - waiting for pending', { key });
        return await this.pendingRequests.get(key);
      }

      // Create pending request
      const pendingPromise = requestFn().then(async (result) => {
        // Cache the result
        await this.set(key, result, options);
        
        // Remove from pending
        this.pendingRequests.delete(key);
        
        return result;
      }).catch((error) => {
        // Remove from pending on error
        this.pendingRequests.delete(key);
        throw error;
      });

      // Store pending request BEFORE awaiting it
      this.pendingRequests.set(key, pendingPromise);
      
      return await pendingPromise;

    } catch (error) {
      logger.error('Request deduplication error', { key, error: error.message });
      // Make sure to clean up on error
      this.pendingRequests.delete(key);
      throw error;
    }
  }

  /**
   * Invalidate cache entries by event
   * @param {string} event - Event name
   * @param {Object} context - Event context
   * @returns {Promise<number>} Number of entries invalidated
   */
  async invalidateByEvent(event, context = {}) {
    try {
      let invalidated = 0;
      const apiType = context.apiType || 'general';
      
      const patterns = this.invalidationPatterns[apiType];
      if (!patterns) {
        return 0;
      }

      for (const pattern of patterns.patterns) {
        if (pattern.event === event) {
          for (const invalidatePattern of pattern.invalidates) {
            if (invalidatePattern === '*') {
              // Clear all entries for this API type
              invalidated += await this.clear({ apiType });
            } else {
              // Clear specific pattern
              invalidated += await this.clear({ pattern: invalidatePattern });
            }
          }
        }
      }

      logger.info('Cache invalidated by event', { event, apiType, invalidated });
      return invalidated;

    } catch (error) {
      logger.error('Cache invalidation error', { event, error: error.message });
      return 0;
    }
  }

  /**
   * Get API-specific caching rules
   * @param {string} apiType - API type
   * @returns {Object} API rules
   */
  getAPISpecificRules(apiType) {
    const rules = {
      banking: {
        neverCache: false,
        defaultTTL: 300, // 5 minutes
        requiresEncryption: true,
        sensitivePatterns: ['balance', 'transaction', 'account']
      },
      
      weather: {
        neverCache: false,
        defaultTTL: 3600, // 1 hour
        requiresEncryption: false,
        sensitivePatterns: []
      },
      
      currency: {
        neverCache: false,
        defaultTTL: 1800, // 30 minutes
        requiresEncryption: false,
        sensitivePatterns: []
      },
      
      news: {
        neverCache: false,
        defaultTTL: 900, // 15 minutes
        requiresEncryption: false,
        sensitivePatterns: []
      }
    };

    return rules[apiType] || {
      neverCache: false,
      defaultTTL: this.config.defaultTTL,
      requiresEncryption: false,
      sensitivePatterns: []
    };
  }

  /**
   * Evict least recently used entry
   * @returns {Promise<void>}
   */
  async evictLRU() {
    let oldestKey = null;
    let oldestTime = Date.now();
    
    for (const [key, metadata] of this.metadata.entries()) {
      if (metadata.lastAccessed < oldestTime) {
        oldestTime = metadata.lastAccessed;
        oldestKey = key;
      }
    }
    
    if (oldestKey) {
      await this.delete(oldestKey);
      this.stats.evictions++;
      logger.info('LRU eviction performed', { key: oldestKey });
    }
  }

  /**
   * Clean up expired entries
   * @returns {Promise<number>} Number of entries cleaned
   */
  async cleanup() {
    let cleaned = 0;
    const now = Date.now();
    
    for (const [key, metadata] of this.metadata.entries()) {
      if (metadata.expiresAt && metadata.expiresAt < now) {
        await this.delete(key);
        cleaned++;
      }
    }
    
    if (cleaned > 0) {
      logger.info('Cache cleanup performed', { cleaned });
    }
    
    return cleaned;
  }

  /**
   * Encrypt sensitive data
   * @param {*} data - Data to encrypt
   * @returns {Promise<string>} Encrypted data
   */
  async encrypt(data) {
    const algorithm = 'aes-256-cbc';
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(algorithm, Buffer.from(this.config.encryptionKey, 'hex'), iv);
    
    let encrypted = cipher.update(JSON.stringify(data), 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    return iv.toString('hex') + ':' + encrypted;
  }

  /**
   * Decrypt sensitive data
   * @param {string} encryptedData - Encrypted data
   * @returns {Promise<*>} Decrypted data
   */
  async decrypt(encryptedData) {
    const algorithm = 'aes-256-cbc';
    const parts = encryptedData.split(':');
    const iv = Buffer.from(parts[0], 'hex');
    const encrypted = parts[1];
    
    const decipher = crypto.createDecipheriv(algorithm, Buffer.from(this.config.encryptionKey, 'hex'), iv);
    
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return JSON.parse(decrypted);
  }

  /**
   * Generate encryption key
   * @returns {string} Encryption key
   */
  generateEncryptionKey() {
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * Get cache statistics
   * @returns {Object} Cache statistics
   */
  getStats() {
    const memoryUsed = Array.from(this.metadata.values())
      .reduce((sum, metadata) => sum + (metadata.size || 0), 0);
    
    return {
      initialized: this.initialized,
      entries: this.cache.size,
      memoryUsed,
      maxSize: this.config.maxSize,
      maxMemory: this.config.maxMemory,
      performance: {
        hits: this.stats.hits,
        misses: this.stats.misses,
        hitRate: this.stats.hits / (this.stats.hits + this.stats.misses) || 0,
        evictions: this.stats.evictions,
        securityBlocks: this.stats.securityBlocks,
        consentBlocks: this.stats.consentBlocks,
        deduplicationSaves: this.stats.deduplicationSaves
      },
      features: {
        securityAwareness: true,
        requestDeduplication: true,
        encryptionSupport: true,
        consentManagement: true,
        intelligentTTL: true,
        eventInvalidation: true
      }
    };
  }

  /**
   * Destroy cache and clean up
   */
  destroy() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    this.cache.clear();
    this.metadata.clear();
    this.pendingRequests.clear();
    logger.info('Intelligent Cache destroyed');
  }
}