import { logger } from '../utils/logger.js';

/**
 * Consent Manager for Phase 4.1 Checkpoint 3
 * Manages user consent for caching personal and sensitive data
 * 
 * Features:
 * - GDPR-compliant consent tracking
 * - Granular consent types
 * - Consent expiration and renewal
 * - Audit trail for consent changes
 * - Privacy-first design
 */
export class ConsentManager {
  constructor() {
    // In-memory consent storage (in production, this would be persistent)
    this.consents = new Map(); // userId -> consent details
    this.consentHistory = new Map(); // userId -> consent history
    
    // Consent types
    this.consentTypes = {
      CACHE_PERSONAL_DATA: 'cache_personal_data',
      CACHE_FINANCIAL_DATA: 'cache_financial_data',
      CACHE_LOCATION_DATA: 'cache_location_data',
      CACHE_PREFERENCES: 'cache_preferences',
      ANALYTICS: 'analytics',
      MARKETING: 'marketing'
    };

    // Consent scopes
    this.consentScopes = {
      banking: [
        this.consentTypes.CACHE_PERSONAL_DATA,
        this.consentTypes.CACHE_FINANCIAL_DATA
      ],
      weather: [
        this.consentTypes.CACHE_LOCATION_DATA
      ],
      preferences: [
        this.consentTypes.CACHE_PREFERENCES
      ]
    };

    // Default consent settings
    this.defaults = {
      duration: 365 * 24 * 60 * 60 * 1000, // 1 year in milliseconds
      renewable: true,
      explicit: true, // Require explicit consent
      granular: true  // Allow granular consent choices
    };

    // Privacy regulations
    this.regulations = {
      gdpr: {
        requiresExplicit: true,
        allowsImplied: false,
        rightToErasure: true,
        dataPortability: true,
        maxDuration: 365 * 24 * 60 * 60 * 1000 // 1 year
      },
      ccpa: {
        requiresExplicit: false,
        allowsImplied: true,
        rightToOptOut: true,
        rightToKnow: true,
        maxDuration: null // No specific limit
      }
    };

    this.initialized = true;
    logger.info('Consent Manager initialized for privacy-compliant caching');
  }

  /**
   * Check if user has given consent for specific type
   * @param {string} userId - User identifier
   * @param {string} consentType - Type of consent to check
   * @param {Object} options - Additional options
   * @returns {Promise<boolean>} Has consent
   */
  async hasConsent(userId, consentType, options = {}) {
    try {
      if (!userId || !consentType) {
        return false;
      }

      const userConsents = this.consents.get(userId);
      if (!userConsents) {
        return false;
      }

      const consent = userConsents[consentType];
      if (!consent) {
        return false;
      }

      // Check if consent is still valid
      if (!this.isConsentValid(consent)) {
        // Remove expired consent
        delete userConsents[consentType];
        this.recordConsentChange(userId, consentType, 'expired', consent);
        return false;
      }

      // Check scope if provided
      if (options.scope && consent.scopes && !consent.scopes.includes(options.scope)) {
        return false;
      }

      return consent.granted === true;

    } catch (error) {
      logger.error('Error checking consent', { userId, consentType, error: error.message });
      return false;
    }
  }

  /**
   * Record user consent
   * @param {string} userId - User identifier
   * @param {string|Array} consentTypes - Consent type(s)
   * @param {Object} options - Consent options
   * @returns {Promise<Object>} Consent record
   */
  async grantConsent(userId, consentTypes, options = {}) {
    try {
      if (!userId) {
        throw new Error('User ID is required');
      }

      const types = Array.isArray(consentTypes) ? consentTypes : [consentTypes];
      const timestamp = Date.now();
      
      // Get or create user consent record
      let userConsents = this.consents.get(userId) || {};
      
      const consentRecords = {};
      
      for (const type of types) {
        const consent = {
          type: type,
          granted: true,
          timestamp: timestamp,
          expiresAt: timestamp + (options.duration || this.defaults.duration),
          method: options.method || 'explicit', // explicit, implied, opt-out
          version: options.version || '1.0',
          scopes: options.scopes || [],
          metadata: {
            ip: options.ip || null,
            userAgent: options.userAgent || null,
            source: options.source || 'api',
            regulation: options.regulation || 'gdpr'
          }
        };

        userConsents[type] = consent;
        consentRecords[type] = consent;
        
        // Record in history
        this.recordConsentChange(userId, type, 'granted', consent);
      }

      // Save consents
      this.consents.set(userId, userConsents);

      logger.info('Consent granted', {
        userId,
        types,
        method: options.method || 'explicit'
      });

      return {
        success: true,
        userId: userId,
        consents: consentRecords,
        timestamp: timestamp
      };

    } catch (error) {
      logger.error('Error granting consent', { userId, error: error.message });
      throw error;
    }
  }

  /**
   * Revoke user consent
   * @param {string} userId - User identifier
   * @param {string|Array} consentTypes - Consent type(s) to revoke
   * @param {Object} options - Revocation options
   * @returns {Promise<Object>} Revocation record
   */
  async revokeConsent(userId, consentTypes, options = {}) {
    try {
      if (!userId) {
        throw new Error('User ID is required');
      }

      const types = Array.isArray(consentTypes) ? consentTypes : [consentTypes];
      const timestamp = Date.now();
      
      const userConsents = this.consents.get(userId);
      if (!userConsents) {
        return {
          success: false,
          reason: 'No consent records found',
          userId: userId
        };
      }

      const revokedConsents = {};
      
      for (const type of types) {
        if (userConsents[type]) {
          const previousConsent = { ...userConsents[type] };
          
          // Mark as revoked
          userConsents[type] = {
            ...previousConsent,
            granted: false,
            revokedAt: timestamp,
            revocationReason: options.reason || 'user_request',
            revocationMethod: options.method || 'explicit'
          };
          
          revokedConsents[type] = userConsents[type];
          
          // Record in history
          this.recordConsentChange(userId, type, 'revoked', userConsents[type]);
        }
      }

      // Update consents
      this.consents.set(userId, userConsents);

      // Trigger cache invalidation for revoked consents
      if (options.invalidateCache) {
        await this.triggerCacheInvalidation(userId, types);
      }

      logger.info('Consent revoked', {
        userId,
        types,
        reason: options.reason || 'user_request'
      });

      return {
        success: true,
        userId: userId,
        revokedConsents: revokedConsents,
        timestamp: timestamp
      };

    } catch (error) {
      logger.error('Error revoking consent', { userId, error: error.message });
      throw error;
    }
  }

  /**
   * Get all consents for a user
   * @param {string} userId - User identifier
   * @returns {Promise<Object>} User consents
   */
  async getUserConsents(userId) {
    try {
      const userConsents = this.consents.get(userId) || {};
      const activeConsents = {};
      const expiredConsents = {};
      
      // Separate active and expired consents
      for (const [type, consent] of Object.entries(userConsents)) {
        if (this.isConsentValid(consent)) {
          activeConsents[type] = consent;
        } else {
          expiredConsents[type] = consent;
        }
      }

      return {
        userId: userId,
        activeConsents: activeConsents,
        expiredConsents: expiredConsents,
        hasAnyConsent: Object.keys(activeConsents).length > 0
      };

    } catch (error) {
      logger.error('Error getting user consents', { userId, error: error.message });
      return {
        userId: userId,
        activeConsents: {},
        expiredConsents: {},
        hasAnyConsent: false,
        error: error.message
      };
    }
  }

  /**
   * Get consent history for audit purposes
   * @param {string} userId - User identifier
   * @param {Object} options - History options
   * @returns {Promise<Array>} Consent history
   */
  async getConsentHistory(userId, options = {}) {
    try {
      const history = this.consentHistory.get(userId) || [];
      
      // Filter by date range if provided
      let filteredHistory = history;
      if (options.startDate || options.endDate) {
        filteredHistory = history.filter(entry => {
          const entryDate = entry.timestamp;
          if (options.startDate && entryDate < options.startDate) return false;
          if (options.endDate && entryDate > options.endDate) return false;
          return true;
        });
      }

      // Filter by consent type if provided
      if (options.consentType) {
        filteredHistory = filteredHistory.filter(entry => 
          entry.consentType === options.consentType
        );
      }

      // Sort by timestamp (newest first)
      filteredHistory.sort((a, b) => b.timestamp - a.timestamp);

      return filteredHistory;

    } catch (error) {
      logger.error('Error getting consent history', { userId, error: error.message });
      return [];
    }
  }

  /**
   * Check if consent is valid (not expired or revoked)
   * @param {Object} consent - Consent object
   * @returns {boolean} Is valid
   */
  isConsentValid(consent) {
    if (!consent || consent.granted !== true) {
      return false;
    }

    if (consent.revokedAt) {
      return false;
    }

    if (consent.expiresAt && Date.now() > consent.expiresAt) {
      return false;
    }

    return true;
  }

  /**
   * Record consent change in history
   * @param {string} userId - User identifier
   * @param {string} consentType - Consent type
   * @param {string} action - Action taken
   * @param {Object} details - Change details
   */
  recordConsentChange(userId, consentType, action, details) {
    const history = this.consentHistory.get(userId) || [];
    
    history.push({
      timestamp: Date.now(),
      consentType: consentType,
      action: action,
      details: details,
      regulation: details.metadata?.regulation || 'gdpr'
    });

    // Keep only last 100 entries per user
    if (history.length > 100) {
      history.splice(0, history.length - 100);
    }

    this.consentHistory.set(userId, history);
  }

  /**
   * Check consent requirements for an API operation
   * @param {string} apiType - API type
   * @param {string} operation - Operation name
   * @returns {Array} Required consent types
   */
  getRequiredConsents(apiType, operation) {
    const apiConsents = this.consentScopes[apiType] || [];
    
    // Add operation-specific consents
    const operationConsents = [];
    if (operation && operation.includes('transaction')) {
      operationConsents.push(this.consentTypes.CACHE_FINANCIAL_DATA);
    }
    if (operation && operation.includes('location')) {
      operationConsents.push(this.consentTypes.CACHE_LOCATION_DATA);
    }

    // Combine and deduplicate
    return [...new Set([...apiConsents, ...operationConsents])];
  }

  /**
   * Prompt for consent (returns prompt text)
   * @param {string} consentType - Type of consent needed
   * @param {Object} context - Context for prompt
   * @returns {Object} Consent prompt
   */
  generateConsentPrompt(consentType, context = {}) {
    const prompts = {
      [this.consentTypes.CACHE_PERSONAL_DATA]: {
        title: 'Personal Data Caching',
        message: 'We would like to temporarily cache your personal data to improve performance. Your data will be encrypted and automatically deleted after 15 minutes.',
        benefits: ['Faster response times', 'Reduced API calls', 'Better user experience'],
        risks: ['Data stored temporarily in memory', 'Cleared on session end']
      },
      
      [this.consentTypes.CACHE_FINANCIAL_DATA]: {
        title: 'Financial Data Caching',
        message: 'For improved performance, we can temporarily cache some of your financial data (excluding sensitive information like full account numbers). This data will be encrypted and stored for a maximum of 5 minutes.',
        benefits: ['Instant access to recent data', 'Reduced server load', 'Smoother navigation'],
        risks: ['Encrypted data in memory', 'Auto-cleared after 5 minutes']
      },
      
      [this.consentTypes.CACHE_LOCATION_DATA]: {
        title: 'Location Data Caching',
        message: 'To provide accurate weather and location-based services, we need to cache your location data temporarily.',
        benefits: ['Accurate local information', 'Faster location services'],
        risks: ['Location stored temporarily', 'Used only for service delivery']
      }
    };

    const prompt = prompts[consentType] || {
      title: 'Data Caching Consent',
      message: 'We would like to cache some data to improve your experience.',
      benefits: ['Better performance'],
      risks: ['Temporary data storage']
    };

    return {
      type: consentType,
      prompt: prompt,
      requiresExplicit: true,
      options: [
        { value: 'grant', label: 'Yes, I consent', primary: true },
        { value: 'deny', label: 'No, do not cache', primary: false },
        { value: 'learn_more', label: 'Learn more', primary: false }
      ]
    };
  }

  /**
   * Trigger cache invalidation for revoked consents
   * @param {string} userId - User identifier
   * @param {Array} consentTypes - Revoked consent types
   */
  async triggerCacheInvalidation(userId, consentTypes) {
    // This would integrate with the cache manager to clear relevant entries
    logger.info('Cache invalidation triggered for revoked consents', {
      userId,
      consentTypes
    });
  }

  /**
   * Export user consent data (GDPR data portability)
   * @param {string} userId - User identifier
   * @returns {Promise<Object>} Exportable consent data
   */
  async exportUserData(userId) {
    try {
      const consents = await this.getUserConsents(userId);
      const history = await this.getConsentHistory(userId);

      return {
        exportDate: new Date().toISOString(),
        userId: userId,
        consents: consents,
        history: history,
        metadata: {
          version: '1.0',
          regulation: 'GDPR Article 20 - Data Portability'
        }
      };

    } catch (error) {
      logger.error('Error exporting user data', { userId, error: error.message });
      throw error;
    }
  }

  /**
   * Delete all user consent data (GDPR right to erasure)
   * @param {string} userId - User identifier
   * @returns {Promise<Object>} Deletion confirmation
   */
  async deleteUserData(userId) {
    try {
      const hadData = this.consents.has(userId) || this.consentHistory.has(userId);
      
      this.consents.delete(userId);
      this.consentHistory.delete(userId);
      
      logger.info('User consent data deleted', { userId, hadData });

      return {
        success: true,
        userId: userId,
        deletedAt: new Date().toISOString(),
        hadData: hadData
      };

    } catch (error) {
      logger.error('Error deleting user data', { userId, error: error.message });
      throw error;
    }
  }

  /**
   * Get consent manager statistics
   * @returns {Object} Manager statistics
   */
  getStats() {
    let totalConsents = 0;
    let activeConsents = 0;
    let expiredConsents = 0;
    
    for (const userConsents of this.consents.values()) {
      for (const consent of Object.values(userConsents)) {
        totalConsents++;
        if (this.isConsentValid(consent)) {
          activeConsents++;
        } else {
          expiredConsents++;
        }
      }
    }

    return {
      initialized: this.initialized,
      users: this.consents.size,
      totalConsents,
      activeConsents,
      expiredConsents,
      consentTypes: Object.keys(this.consentTypes).length,
      regulations: Object.keys(this.regulations).length,
      features: {
        gdprCompliant: true,
        ccpaCompliant: true,
        granularConsent: true,
        consentHistory: true,
        dataPortability: true,
        rightToErasure: true
      }
    };
  }
}