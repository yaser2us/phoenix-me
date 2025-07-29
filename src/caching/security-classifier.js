import { logger } from '../utils/logger.js';

/**
 * Security Classifier for Phase 4.1 Checkpoint 3
 * Classifies data for intelligent caching decisions based on security sensitivity
 * 
 * Features:
 * - Pattern-based data classification
 * - Banking-grade security levels
 * - Privacy-preserving analysis
 * - Regulatory compliance awareness
 * - Dynamic classification rules
 */
export class SecurityClassifier {
  constructor() {
    // Security classification levels (from least to most sensitive)
    this.securityLevels = {
      PUBLIC: 'public',          // Can be cached without restrictions
      PERSONAL: 'personal',      // Cache with user consent only
      SENSITIVE: 'sensitive',    // Cache with encryption and short TTL
      SECRET: 'secret'          // Never cache
    };

    // Pattern-based classification rules
    this.classificationRules = {
      // SECRET - Never cache these
      secret: [
        // Authentication tokens
        { pattern: /jwt|token|bearer|auth/i, field: 'any' },
        { pattern: /^[A-Za-z0-9\-_]+\.[A-Za-z0-9\-_]+\.[A-Za-z0-9\-_]+$/, field: 'value' }, // JWT pattern
        
        // Credentials
        { pattern: /password|pin|cvv|secret/i, field: 'any' },
        { pattern: /private[_-]?key/i, field: 'any' },
        
        // Security codes
        { pattern: /\b\d{3,4}\b/, field: 'cvv' },
        { pattern: /\b\d{4,6}\b/, field: 'pin' }
      ],

      // PERSONAL - Cache with consent
      personal: [
        // User information
        { pattern: /name|email|phone|address/i, field: 'any' },
        { pattern: /user[_-]?id|customer[_-]?id/i, field: 'any' },
        
        // Masked account data
        { pattern: /\*{3,}[\d\w]{2,4}/, field: 'value' }, // Masked numbers
        
        // Personal preferences
        { pattern: /preference|setting|profile/i, field: 'any' }
      ],

      // SENSITIVE - Cache with extreme caution
      sensitive: [
        // Financial data
        { pattern: /balance|amount|transaction/i, field: 'any' },
        { pattern: /\$[\d,]+\.?\d*/, field: 'value' }, // Currency amounts
        { pattern: /\b\d+\.\d{2}\b/, field: 'amount' },
        
        // Account details
        { pattern: /account[_-]?number|routing[_-]?number/i, field: 'any' },
        { pattern: /\b\d{8,16}\b/, field: 'accountNumber' },
        
        // Transaction data
        { pattern: /transfer|payment|withdraw|deposit/i, field: 'any' },
        { pattern: /transaction[_-]?id/i, field: 'any' }
      ],

      // PUBLIC - Safe to cache
      public: [
        // Market data
        { pattern: /exchange[_-]?rate|currency|market/i, field: 'any' },
        { pattern: /weather|temperature|forecast/i, field: 'any' },
        
        // General information
        { pattern: /news|article|headline/i, field: 'any' },
        { pattern: /location|city|country/i, field: 'any' },
        
        // API metadata
        { pattern: /version|status|health/i, field: 'any' },
        { pattern: /documentation|spec|schema/i, field: 'any' }
      ]
    };

    // Context-specific overrides
    this.contextOverrides = {
      banking: {
        // Banking context increases sensitivity
        sensitivityBoost: 1,
        neverCache: ['balance', 'accountNumber', 'routingNumber', 'transactionId']
      },
      
      weather: {
        // Weather context is generally public
        sensitivityBoost: -1,
        alwaysPublic: ['temperature', 'conditions', 'forecast']
      },
      
      currency: {
        // Currency rates are public but time-sensitive
        sensitivityBoost: 0,
        alwaysPublic: ['rate', 'exchangeRate']
      }
    };

    // Regulatory compliance markers
    this.complianceMarkers = {
      pci: ['cardNumber', 'cvv', 'expirationDate'],
      gdpr: ['email', 'name', 'address', 'phone'],
      pii: ['ssn', 'dob', 'driverLicense'],
      phi: ['diagnosis', 'prescription', 'medicalRecord']
    };

    this.initialized = true;
    logger.info('Security Classifier initialized for intelligent caching decisions');
  }

  /**
   * Classify data based on security sensitivity
   * @param {*} data - Data to classify
   * @param {Object} context - Additional context (apiType, operation, etc.)
   * @returns {Promise<Object>} Classification result
   */
  async classifyData(data, context = {}) {
    try {
      // Flatten data for analysis
      const flatData = this.flattenData(data);
      
      // Perform classification
      let classification = this.performClassification(flatData);
      
      // Apply context overrides
      if (context.apiType) {
        classification = this.applyContextOverrides(classification, flatData, context.apiType);
      }
      
      // Check compliance requirements
      const complianceFlags = this.checkCompliance(flatData);
      
      // Generate caching recommendation
      const recommendation = this.generateCachingRecommendation(
        classification.securityLevel,
        complianceFlags,
        context
      );

      logger.info('Data classified for caching', {
        securityLevel: classification.securityLevel,
        hasComplianceFlags: Object.keys(complianceFlags).length > 0,
        cacheable: recommendation.cacheable
      });

      return {
        securityLevel: classification.securityLevel,
        classification: classification,
        complianceFlags: complianceFlags,
        recommendation: recommendation,
        metadata: {
          analyzedFields: flatData.length,
          matchedPatterns: classification.matchedPatterns,
          contextApplied: context.apiType || 'none'
        }
      };

    } catch (error) {
      logger.error('Data classification failed', { error: error.message });
      
      // Default to most restrictive classification on error
      return {
        securityLevel: this.securityLevels.SECRET,
        classification: { securityLevel: this.securityLevels.SECRET, reason: 'classification_error' },
        complianceFlags: {},
        recommendation: { cacheable: false, reason: 'classification_error' },
        error: error.message
      };
    }
  }

  /**
   * Flatten nested data structure for analysis
   * @param {*} data - Data to flatten
   * @returns {Array} Flattened field-value pairs
   */
  flattenData(data) {
    const flattened = [];
    
    const flatten = (obj, prefix = '') => {
      if (obj === null || obj === undefined) return;
      
      if (typeof obj === 'object' && !Array.isArray(obj)) {
        Object.keys(obj).forEach(key => {
          const fullKey = prefix ? `${prefix}.${key}` : key;
          flatten(obj[key], fullKey);
          flattened.push({ field: key, value: obj[key], path: fullKey });
        });
      } else if (Array.isArray(obj)) {
        obj.forEach((item, index) => {
          flatten(item, `${prefix}[${index}]`);
        });
      } else {
        flattened.push({ field: prefix, value: obj, path: prefix });
      }
    };
    
    flatten(data);
    return flattened;
  }

  /**
   * Perform pattern-based classification
   * @param {Array} flatData - Flattened data
   * @returns {Object} Classification result
   */
  performClassification(flatData) {
    let highestLevel = this.securityLevels.PUBLIC;
    const matchedPatterns = [];
    
    // Check each security level (from most to least restrictive)
    const levels = ['secret', 'sensitive', 'personal', 'public'];
    
    // First pass: Check for specific patterns (value-based)
    for (const item of flatData) {
      // Check for masked values first (personal level)
      if (item.value && /\*{3,}[\d\w]{2,4}/.test(String(item.value))) {
        matchedPatterns.push({
          level: 'personal',
          pattern: '/\\*{3,}[\\d\\w]{2,4}/',
          field: item.field,
          path: item.path,
          reason: 'masked_value'
        });
        
        if (levels.indexOf('personal') < levels.indexOf(highestLevel)) {
          highestLevel = this.securityLevels.PERSONAL;
        }
        continue; // Skip other checks for this item
      }
    }
    
    // Second pass: Regular pattern matching
    for (const level of levels) {
      const rules = this.classificationRules[level];
      
      for (const rule of rules) {
        for (const item of flatData) {
          // Skip if already classified as personal due to masked value
          if (matchedPatterns.some(p => p.path === item.path && p.reason === 'masked_value')) {
            continue;
          }
          
          let matches = false;
          
          // Check field name match
          if (rule.field === 'any' || item.field.toLowerCase() === rule.field.toLowerCase()) {
            // Check pattern match
            if (rule.pattern.test(item.field) || 
                (item.value && rule.pattern.test(String(item.value)))) {
              matches = true;
            }
          }
          
          if (matches) {
            matchedPatterns.push({
              level: level,
              pattern: rule.pattern.toString(),
              field: item.field,
              path: item.path
            });
            
            // Update highest level if this is more restrictive
            if (levels.indexOf(level) < levels.indexOf(highestLevel)) {
              highestLevel = this.securityLevels[level.toUpperCase()];
            }
          }
        }
      }
    }
    
    return {
      securityLevel: highestLevel,
      matchedPatterns: matchedPatterns
    };
  }

  /**
   * Apply context-specific overrides
   * @param {Object} classification - Initial classification
   * @param {Array} flatData - Flattened data
   * @param {string} apiType - API type context
   * @returns {Object} Updated classification
   */
  applyContextOverrides(classification, flatData, apiType) {
    const override = this.contextOverrides[apiType];
    
    if (!override) {
      return classification;
    }
    
    // Check for never cache fields
    if (override.neverCache) {
      for (const field of flatData) {
        if (override.neverCache.includes(field.field.toLowerCase())) {
          classification.securityLevel = this.securityLevels.SECRET;
          classification.overrideReason = `Field '${field.field}' is marked as never cache in ${apiType} context`;
          return classification;
        }
      }
    }
    
    // Check for always public fields
    if (override.alwaysPublic) {
      let allFieldsPublic = true;
      for (const field of flatData) {
        if (!override.alwaysPublic.includes(field.field.toLowerCase())) {
          allFieldsPublic = false;
          break;
        }
      }
      
      if (allFieldsPublic && flatData.length > 0) {
        classification.securityLevel = this.securityLevels.PUBLIC;
        classification.overrideReason = `All fields are marked as public in ${apiType} context`;
      }
    }
    
    // Apply sensitivity boost
    if (override.sensitivityBoost !== 0) {
      const levels = [
        this.securityLevels.PUBLIC,
        this.securityLevels.PERSONAL,
        this.securityLevels.SENSITIVE,
        this.securityLevels.SECRET
      ];
      
      const currentIndex = levels.indexOf(classification.securityLevel);
      const newIndex = Math.max(0, Math.min(levels.length - 1, currentIndex + override.sensitivityBoost));
      
      if (newIndex !== currentIndex) {
        classification.securityLevel = levels[newIndex];
        classification.boostApplied = override.sensitivityBoost;
      }
    }
    
    return classification;
  }

  /**
   * Check compliance requirements
   * @param {Array} flatData - Flattened data
   * @returns {Object} Compliance flags
   */
  checkCompliance(flatData) {
    const flags = {};
    
    Object.keys(this.complianceMarkers).forEach(compliance => {
      const markers = this.complianceMarkers[compliance];
      
      for (const field of flatData) {
        if (markers.some(marker => 
          field.field.toLowerCase().includes(marker.toLowerCase()))) {
          flags[compliance] = true;
          break;
        }
      }
    });
    
    return flags;
  }

  /**
   * Generate caching recommendation based on classification
   * @param {string} securityLevel - Security level
   * @param {Object} complianceFlags - Compliance flags
   * @param {Object} context - Additional context
   * @returns {Object} Caching recommendation
   */
  generateCachingRecommendation(securityLevel, complianceFlags, context) {
    const recommendation = {
      cacheable: false,
      ttl: 0,
      requiresEncryption: false,
      requiresConsent: false,
      reason: '',
      conditions: []
    };
    
    // Apply security level rules
    switch (securityLevel) {
      case this.securityLevels.PUBLIC:
        recommendation.cacheable = true;
        recommendation.ttl = 3600; // 1 hour default
        recommendation.reason = 'Public data safe to cache';
        break;
        
      case this.securityLevels.PERSONAL:
        recommendation.cacheable = true;
        recommendation.ttl = 900; // 15 minutes
        recommendation.requiresConsent = true;
        recommendation.requiresEncryption = true;
        recommendation.reason = 'Personal data requires user consent to cache';
        recommendation.conditions.push('user_consent_required');
        break;
        
      case this.securityLevels.SENSITIVE:
        recommendation.cacheable = true;
        recommendation.ttl = 300; // 5 minutes
        recommendation.requiresEncryption = true;
        recommendation.requiresConsent = true;
        recommendation.reason = 'Sensitive data requires encryption and short TTL';
        recommendation.conditions.push('encryption_required', 'short_ttl');
        break;
        
      case this.securityLevels.SECRET:
        recommendation.cacheable = false;
        recommendation.ttl = 0;
        recommendation.reason = 'Secret data must never be cached';
        break;
    }
    
    // Apply compliance overrides
    if (complianceFlags.pci) {
      recommendation.cacheable = false;
      recommendation.reason = 'PCI compliance prohibits caching';
      recommendation.conditions.push('pci_compliance');
    }
    
    if (complianceFlags.phi) {
      recommendation.cacheable = false;
      recommendation.reason = 'PHI data cannot be cached';
      recommendation.conditions.push('hipaa_compliance');
    }
    
    // Context-specific TTL adjustments
    if (recommendation.cacheable && context.apiType) {
      switch (context.apiType) {
        case 'weather':
          recommendation.ttl = Math.max(recommendation.ttl, 3600); // Min 1 hour
          break;
        case 'currency':
          recommendation.ttl = Math.min(recommendation.ttl, 1800); // Max 30 minutes
          break;
        case 'banking':
          recommendation.ttl = Math.min(recommendation.ttl, 300); // Max 5 minutes
          break;
      }
    }
    
    return recommendation;
  }

  /**
   * Get classifier statistics
   * @returns {Object} Classifier statistics
   */
  getStats() {
    const totalRules = Object.values(this.classificationRules)
      .reduce((sum, rules) => sum + rules.length, 0);
    
    return {
      initialized: this.initialized,
      securityLevels: Object.keys(this.securityLevels).length,
      classificationRules: totalRules,
      contextOverrides: Object.keys(this.contextOverrides).length,
      complianceTypes: Object.keys(this.complianceMarkers).length,
      features: {
        patternBasedClassification: true,
        contextAwareOverrides: true,
        complianceChecking: true,
        cachingRecommendations: true,
        privacyPreserving: true
      }
    };
  }
}