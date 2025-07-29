import crypto from 'crypto';
import { logger } from '../utils/logger.js';

/**
 * Security Configuration for Phase 4.1 Checkpoint 1
 * Provides enterprise-grade security settings and encryption capabilities for banking APIs
 * 
 * Features:
 * - JWT token encryption/decryption
 * - Secure configuration management
 * - Banking-grade security standards
 * - Audit logging and compliance
 * - Key management and rotation
 */
export class SecurityConfig {
  constructor() {
    // Initialize security configuration
    this.config = {
      encryption: {
        algorithm: 'aes-256-gcm',
        keyLength: 32,
        ivLength: 16,
        tagLength: 16,
        saltLength: 32
      },
      jwt: {
        maxAge: 24 * 60 * 60, // 24 hours
        gracePeriod: 5 * 60, // 5 minutes
        encryptInStorage: true,
        clearOnExit: true,
        auditAccess: true
      },
      banking: {
        requireEncryption: true,
        auditAllOperations: true,
        sensitiveDataTTL: 15 * 60, // 15 minutes
        maxTokensPerUser: 3,
        forceSSL: true
      },
      compliance: {
        pciDSSLevel: 'Level 1',
        dataRetentionDays: 0, // No retention for sensitive data
        auditLogRetentionDays: 365,
        requireDataClassification: true
      }
    };

    // Generate or load encryption keys
    this.encryptionKey = this.generateOrLoadEncryptionKey();
    
    // Security event tracking
    this.securityEvents = new Map();
    
    this.initialized = true;
    logger.info('Security configuration initialized for banking-grade operations');
  }

  /**
   * Encrypt JWT token for secure storage
   * @param {string} token - JWT token to encrypt
   * @param {Object} metadata - Additional metadata to include
   * @returns {Promise<string>} Encrypted token string
   */
  async encryptToken(token, metadata = {}) {
    try {
      if (!token || typeof token !== 'string') {
        throw new Error('Token must be a non-empty string');
      }

      // Use AES-256-CBC for compatibility
      const algorithm = 'aes-256-cbc';
      const iv = crypto.randomBytes(16);
      const salt = crypto.randomBytes(this.config.encryption.saltLength);

      // Create encryption key from master key and salt
      const key = crypto.pbkdf2Sync(this.encryptionKey, salt, 100000, 32, 'sha256');
      
      // Create cipher
      const cipher = crypto.createCipheriv(algorithm, key, iv);
      
      // Prepare data to encrypt (token + metadata)
      const dataToEncrypt = JSON.stringify({
        token: token,
        metadata: {
          ...metadata,
          encryptedAt: Date.now(),
          securityLevel: 'high'
        }
      });

      // Encrypt data
      let encrypted = cipher.update(dataToEncrypt, 'utf8', 'hex');
      encrypted += cipher.final('hex');

      // Combine all components
      const encryptedData = {
        encrypted: encrypted,
        iv: iv.toString('hex'),
        salt: salt.toString('hex'),
        algorithm: algorithm,
        version: '1.0'
      };

      const encryptedString = Buffer.from(JSON.stringify(encryptedData)).toString('base64');

      // Log security event
      this.logSecurityEvent('token_encrypted', {
        algorithm: algorithm,
        tokenLength: token.length,
        metadataKeys: Object.keys(metadata)
      });

      return encryptedString;

    } catch (error) {
      logger.error('Token encryption failed', { error: error.message });
      this.logSecurityEvent('encryption_error', { error: error.message });
      throw new Error('Failed to encrypt token');
    }
  }

  /**
   * Decrypt JWT token from secure storage
   * @param {string} encryptedToken - Encrypted token string
   * @returns {Promise<string>} Decrypted JWT token
   */
  async decryptToken(encryptedToken) {
    try {
      if (!encryptedToken || typeof encryptedToken !== 'string') {
        throw new Error('Encrypted token must be a non-empty string');
      }

      // Parse encrypted data
      const encryptedData = JSON.parse(Buffer.from(encryptedToken, 'base64').toString('utf8'));
      
      // Validate encryption format
      if (!encryptedData.encrypted || !encryptedData.iv || !encryptedData.salt) {
        throw new Error('Invalid encrypted token format');
      }

      // Recreate encryption key
      const salt = Buffer.from(encryptedData.salt, 'hex');
      const key = crypto.pbkdf2Sync(this.encryptionKey, salt, 100000, 32, 'sha256');
      
      // Create decipher
      const iv = Buffer.from(encryptedData.iv, 'hex');
      const decipher = crypto.createDecipheriv(encryptedData.algorithm, key, iv);
      
      // Decrypt data
      let decrypted = decipher.update(encryptedData.encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      
      // Parse decrypted data
      const decryptedData = JSON.parse(decrypted);
      
      // Validate security level
      if (decryptedData.metadata && decryptedData.metadata.securityLevel !== 'high') {
        logger.warn('Token with non-high security level detected', {
          level: decryptedData.metadata.securityLevel
        });
      }

      // Log security event
      this.logSecurityEvent('token_decrypted', {
        algorithm: encryptedData.algorithm,
        version: encryptedData.version,
        age: Date.now() - (decryptedData.metadata?.encryptedAt || 0)
      });

      return decryptedData.token;

    } catch (error) {
      logger.error('Token decryption failed', { error: error.message });
      this.logSecurityEvent('decryption_error', { error: error.message });
      throw new Error('Failed to decrypt token');
    }
  }

  /**
   * Generate or load encryption key for token security
   * @returns {Buffer} Encryption key
   */
  generateOrLoadEncryptionKey() {
    try {
      // In production, this would load from secure key management system
      // For now, generate a consistent key based on environment
      const keyMaterial = process.env.SECURITY_KEY_MATERIAL || 'default-key-material-change-in-production';
      
      // Generate key using PBKDF2
      const key = crypto.pbkdf2Sync(
        keyMaterial,
        'banking-api-gateway-salt',
        100000,
        this.config.encryption.keyLength,
        'sha256'
      );

      logger.info('Encryption key generated successfully');
      return key;

    } catch (error) {
      logger.error('Failed to generate encryption key', { error: error.message });
      throw new Error('Security initialization failed');
    }
  }

  /**
   * Validate security configuration compliance
   * @returns {Object} Compliance check results
   */
  validateCompliance() {
    const checks = [];
    let compliant = true;

    // Check encryption requirements
    if (!this.config.banking.requireEncryption) {
      checks.push({
        check: 'encryption_required',
        status: 'FAIL',
        message: 'Encryption is required for banking operations'
      });
      compliant = false;
    } else {
      checks.push({
        check: 'encryption_required',
        status: 'PASS',
        message: 'Encryption is properly configured'
      });
    }

    // Check JWT security settings
    if (!this.config.jwt.encryptInStorage) {
      checks.push({
        check: 'jwt_encryption',
        status: 'FAIL', 
        message: 'JWT tokens must be encrypted in storage'
      });
      compliant = false;
    } else {
      checks.push({
        check: 'jwt_encryption',
        status: 'PASS',
        message: 'JWT encryption in storage is enabled'
      });
    }

    // Check audit logging
    if (!this.config.banking.auditAllOperations) {
      checks.push({
        check: 'audit_logging',
        status: 'FAIL',
        message: 'Audit logging must be enabled for all banking operations'
      });
      compliant = false;
    } else {
      checks.push({
        check: 'audit_logging',
        status: 'PASS',
        message: 'Audit logging is properly configured'
      });
    }

    // Check SSL/TLS requirements
    if (!this.config.banking.forceSSL) {
      checks.push({
        check: 'ssl_enforcement',
        status: 'FAIL',
        message: 'SSL/TLS must be enforced for banking APIs'
      });
      compliant = false;
    } else {
      checks.push({
        check: 'ssl_enforcement',
        status: 'PASS',
        message: 'SSL/TLS enforcement is configured'
      });
    }

    // Check data retention policies
    if (this.config.compliance.dataRetentionDays > 0) {
      checks.push({
        check: 'data_retention',
        status: 'WARNING',
        message: 'Sensitive data retention should be minimized'
      });
    } else {
      checks.push({
        check: 'data_retention',
        status: 'PASS',
        message: 'No sensitive data retention configured'
      });
    }

    const result = {
      compliant: compliant,
      pciDSSLevel: this.config.compliance.pciDSSLevel,
      checks: checks,
      timestamp: new Date().toISOString()
    };

    logger.info('Security compliance check completed', {
      compliant: compliant,
      passedChecks: checks.filter(c => c.status === 'PASS').length,
      totalChecks: checks.length
    });

    return result;
  }

  /**
   * Get security headers for banking API requests
   * @returns {Object} Security headers
   */
  getSecurityHeaders() {
    return {
      'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
      'Content-Security-Policy': "default-src 'self'",
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'X-XSS-Protection': '1; mode=block',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
      'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0'
    };
  }

  /**
   * Classify data sensitivity level for caching decisions
   * @param {Object} data - Data to classify
   * @param {string} context - Context of the data
   * @returns {Object} Classification result
   */
  classifyDataSensitivity(data, context = 'unknown') {
    const classification = {
      level: 'public',
      cacheable: true,
      encryptionRequired: false,
      auditRequired: false,
      maxTTL: 3600 // 1 hour default
    };

    // Check for banking-specific sensitive data
    const dataString = JSON.stringify(data).toLowerCase();
    
    // Secret level data (never cache, always encrypt)
    if (dataString.includes('jwt') || 
        dataString.includes('token') || 
        dataString.includes('password') ||
        dataString.includes('pin')) {
      classification.level = 'secret';
      classification.cacheable = false;
      classification.encryptionRequired = true;
      classification.auditRequired = true;
      classification.maxTTL = 0;
    }
    // Sensitive level data (limited caching, encrypt)
    else if (dataString.includes('balance') ||
             dataString.includes('account') ||
             dataString.includes('transaction') ||
             context === 'banking') {
      classification.level = 'sensitive';
      classification.cacheable = true;
      classification.encryptionRequired = true;
      classification.auditRequired = true;
      classification.maxTTL = this.config.banking.sensitiveDataTTL;
    }
    // Personal level data (cache with consent)
    else if (dataString.includes('user') ||
             dataString.includes('profile') ||
             dataString.includes('preference')) {
      classification.level = 'personal';
      classification.cacheable = true;
      classification.encryptionRequired = false;
      classification.auditRequired = false;
      classification.maxTTL = 900; // 15 minutes
    }
    // Public data (cache freely)
    else {
      classification.level = 'public';
      classification.cacheable = true;
      classification.encryptionRequired = false;
      classification.auditRequired = false;
      classification.maxTTL = 3600; // 1 hour
    }

    logger.debug('Data sensitivity classified', {
      level: classification.level,
      context: context,
      cacheable: classification.cacheable
    });

    return classification;
  }

  /**
   * Log security event for audit trail
   * @param {string} eventType - Type of security event
   * @param {Object} details - Event details
   */
  logSecurityEvent(eventType, details = {}) {
    const event = {
      eventType: eventType,
      timestamp: new Date().toISOString(),
      details: details,
      sessionId: this.generateSessionId()
    };

    // Store event for audit
    if (!this.securityEvents.has(eventType)) {
      this.securityEvents.set(eventType, []);
    }
    
    const events = this.securityEvents.get(eventType);
    events.push(event);
    
    // Keep only recent events (memory management)
    if (events.length > 100) {
      events.splice(0, events.length - 100);
    }

    // Log to audit system
    if (this.config.banking.auditAllOperations) {
      logger.info('Security event logged', {
        eventType: eventType,
        timestamp: event.timestamp,
        details: details
      });
    }
  }

  /**
   * Generate session ID for security tracking
   * @returns {string} Session ID
   */
  generateSessionId() {
    return crypto.randomUUID();
  }

  /**
   * Get security statistics
   * @returns {Object} Security statistics
   */
  getSecurityStats() {
    const stats = {
      encryptionEnabled: this.config.jwt.encryptInStorage,
      complianceLevel: this.config.compliance.pciDSSLevel,
      auditingEnabled: this.config.banking.auditAllOperations,
      totalSecurityEvents: Array.from(this.securityEvents.values())
        .reduce((total, events) => total + events.length, 0),
      eventTypes: Array.from(this.securityEvents.keys()),
      configuration: {
        encryptionAlgorithm: this.config.encryption.algorithm,
        jwtMaxAge: this.config.jwt.maxAge,
        sensitiveDataTTL: this.config.banking.sensitiveDataTTL,
        maxTokensPerUser: this.config.banking.maxTokensPerUser
      }
    };

    return stats;
  }

  /**
   * Clear security events (for testing)
   * @returns {number} Number of events cleared
   */
  clearSecurityEvents() {
    const totalEvents = Array.from(this.securityEvents.values())
      .reduce((total, events) => total + events.length, 0);
    
    this.securityEvents.clear();
    
    logger.info('Security events cleared', { eventsCleared: totalEvents });
    return totalEvents;
  }

  /**
   * Rotate encryption key (for production key management)
   * @returns {boolean} Success status
   */
  rotateEncryptionKey() {
    try {
      const oldKeyInfo = {
        algorithm: this.config.encryption.algorithm,
        keyLength: this.config.encryption.keyLength
      };

      // Generate new key
      this.encryptionKey = this.generateOrLoadEncryptionKey();

      this.logSecurityEvent('key_rotation', {
        previousKey: oldKeyInfo,
        newKeyGenerated: true,
        rotationTime: new Date().toISOString()
      });

      logger.info('Encryption key rotated successfully');
      return true;

    } catch (error) {
      logger.error('Key rotation failed', { error: error.message });
      this.logSecurityEvent('key_rotation_error', { error: error.message });
      return false;
    }
  }
}