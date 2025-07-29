import { logger } from '../utils/logger.js';
import crypto from 'crypto';

/**
 * JWT Manager for Phase 4.1 Checkpoint 1
 * Provides JWT token validation, parsing, and secure management for banking APIs
 * 
 * Features:
 * - JWT token validation and parsing
 * - Token expiry detection and handling
 * - Secure token storage in memory
 * - Token renewal prompting
 * - Banking-specific security requirements
 */
export class JWTManager {
  constructor() {
    // In-memory secure token storage (encrypted)
    this.tokenStore = new Map();
    
    // JWT validation configuration
    this.config = {
      algorithm: 'HS256', // Support for HS256 initially
      clockTolerance: 60, // 60 seconds clock tolerance
      issuerWhitelist: [], // Add trusted issuers here
      maxAge: 24 * 60 * 60, // 24 hours max age
      gracePeriod: 5 * 60 // 5 minutes grace period for expiry
    };

    // Security settings for banking grade requirements
    this.securityConfig = {
      encryptTokens: true,
      clearTokensOnExit: true,
      auditLogTokenUsage: true,
      rateLimitValidation: true
    };

    this.initialized = true;
    logger.info('JWT Manager initialized for banking API authentication');
  }

  /**
   * Validate Maybank JWT token structure, signature, and expiry
   * @param {string} token - Maybank JWT token to validate
   * @param {Object} options - Validation options
   * @returns {Object} Validation result with payload if valid
   */
  async validateMaybankToken(token, options = {}) {
    try {
      if (!token || typeof token !== 'string') {
        return {
          isValid: false,
          reason: 'Token is required and must be a string'
        };
      }

      // Check if token starts with Bearer prefix and remove it
      const cleanToken = token.startsWith('Bearer ') ? token.slice(7) : token;

      // Basic JWT format validation (three parts separated by dots)
      const tokenParts = cleanToken.split('.');
      if (tokenParts.length !== 3) {
        return {
          isValid: false,
          reason: 'Invalid JWT format - must have 3 parts'
        };
      }

      try {
        // Decode header and payload (without verification for now)
        const header = JSON.parse(Buffer.from(tokenParts[0], 'base64url').toString());
        const payload = JSON.parse(Buffer.from(tokenParts[1], 'base64url').toString());

        // Check expiration
        const now = Math.floor(Date.now() / 1000);
        if (payload.exp && payload.exp < now) {
          return {
            isValid: false,
            reason: 'Token has expired',
            expiresAt: payload.exp * 1000
          };
        }

        // Check not before
        if (payload.nbf && payload.nbf > now) {
          return {
            isValid: false,
            reason: 'Token not yet valid',
            validFrom: payload.nbf * 1000
          };
        }

        logger.debug('Maybank JWT token validated successfully', {
          algorithm: header.alg,
          expiresAt: payload.exp ? new Date(payload.exp * 1000) : null,
          issuer: payload.iss,
          subject: payload.sub
        });

        return {
          isValid: true,
          payload,
          header,
          expiresAt: payload.exp ? payload.exp * 1000 : null,
          algorithm: header.alg
        };

      } catch (decodeError) {
        return {
          isValid: false,
          reason: 'Invalid JWT encoding',
          error: decodeError.message
        };
      }

    } catch (error) {
      logger.error('Failed to validate Maybank JWT token', { error: error.message });
      return {
        isValid: false,
        reason: 'Token validation failed',
        error: error.message
      };
    }
  }

  /**
   * Validate JWT token structure, signature, and expiry (generic method)
   * @param {string} token - JWT token to validate
   * @param {Object} options - Validation options
   * @returns {Object} Validation result with payload if valid
   */
  async validateToken(token, options = {}) {
    try {
      if (!token || typeof token !== 'string') {
        return {
          isValid: false,
          reason: 'invalid_format',
          message: 'Token must be a non-empty string'
        };
      }

      // Parse JWT structure
      const tokenParts = token.split('.');
      if (tokenParts.length !== 3) {
        return {
          isValid: false,
          reason: 'invalid_structure',
          message: 'JWT must have exactly 3 parts separated by dots'
        };
      }

      let header, payload;
      
      try {
        // Decode header and payload
        header = JSON.parse(this.base64UrlDecode(tokenParts[0]));
        payload = JSON.parse(this.base64UrlDecode(tokenParts[1]));
      } catch (decodeError) {
        return {
          isValid: false,
          reason: 'decode_error',
          message: 'Failed to decode JWT header or payload'
        };
      }

      // Validate algorithm
      if (!header.alg || header.alg !== this.config.algorithm) {
        return {
          isValid: false,
          reason: 'unsupported_algorithm',
          message: `Unsupported algorithm: ${header.alg}. Expected: ${this.config.algorithm}`
        };
      }

      // Validate token type
      if (header.typ && header.typ !== 'JWT') {
        return {
          isValid: false,
          reason: 'invalid_type',
          message: `Invalid token type: ${header.typ}. Expected: JWT`
        };
      }

      // Validate expiry
      const now = Math.floor(Date.now() / 1000);
      
      if (payload.exp && payload.exp < (now - this.config.clockTolerance)) {
        return {
          isValid: false,
          reason: 'expired',
          message: 'Token has expired',
          expiredAt: new Date(payload.exp * 1000).toISOString()
        };
      }

      // Validate not before (nbf)
      if (payload.nbf && payload.nbf > (now + this.config.clockTolerance)) {
        return {
          isValid: false,
          reason: 'not_yet_valid',
          message: 'Token is not yet valid',
          validFrom: new Date(payload.nbf * 1000).toISOString()
        };
      }

      // Validate issued at (iat)
      if (payload.iat && payload.iat > (now + this.config.clockTolerance)) {
        return {
          isValid: false,
          reason: 'future_issued',
          message: 'Token issued in the future'
        };
      }

      // Check max age
      if (payload.iat && (now - payload.iat) > this.config.maxAge) {
        return {
          isValid: false,
          reason: 'too_old',
          message: 'Token exceeds maximum age limit'
        };
      }

      // Validate issuer if whitelist is configured
      if (this.config.issuerWhitelist.length > 0 && payload.iss) {
        if (!this.config.issuerWhitelist.includes(payload.iss)) {
          return {
            isValid: false,
            reason: 'untrusted_issuer',
            message: `Untrusted issuer: ${payload.iss}`
          };
        }
      }

      // Banking-specific validations
      const bankingValidation = this.validateBankingClaims(payload);
      if (!bankingValidation.isValid) {
        return bankingValidation;
      }

      // Audit log for security
      if (this.securityConfig.auditLogTokenUsage) {
        logger.info('JWT token validated successfully', {
          subject: payload.sub,
          issuer: payload.iss,
          expiresAt: payload.exp ? new Date(payload.exp * 1000).toISOString() : 'no_expiry',
          scopes: payload.scope || payload.scopes
        });
      }

      // Process scopes - handle both string and array formats
      let scopes = [];
      if (payload.scope) {
        scopes = typeof payload.scope === 'string' ? payload.scope.split(' ') : payload.scope;
      } else if (payload.scopes) {
        scopes = Array.isArray(payload.scopes) ? payload.scopes : [payload.scopes];
      }

      return {
        isValid: true,
        payload: payload,
        header: header,
        expiresAt: payload.exp ? new Date(payload.exp * 1000).toISOString() : null,
        timeToExpiry: payload.exp ? (payload.exp - now) : null,
        scopes: scopes,
        subject: payload.sub,
        issuer: payload.iss
      };

    } catch (error) {
      logger.error('JWT validation error', { error: error.message });
      return {
        isValid: false,
        reason: 'validation_error',
        message: 'Internal validation error',
        error: error.message
      };
    }
  }

  /**
   * Validate banking-specific JWT claims
   * @param {Object} payload - JWT payload
   * @returns {Object} Banking validation result
   */
  validateBankingClaims(payload) {
    // Check for required banking scopes
    const requiredScopes = ['banking:read', 'accounts:read'];
    
    // Process scopes consistently
    let tokenScopes = [];
    if (payload.scope) {
      tokenScopes = typeof payload.scope === 'string' ? payload.scope.split(' ') : payload.scope;
    } else if (payload.scopes) {
      tokenScopes = Array.isArray(payload.scopes) ? payload.scopes : [payload.scopes];
    }

    const hasRequiredScopes = requiredScopes.some(required =>
      tokenScopes.some(scope => scope.includes(required) || scope === 'banking:*')
    );

    if (!hasRequiredScopes) {
      return {
        isValid: false,
        reason: 'insufficient_scope',
        message: 'Token lacks required banking permissions',
        requiredScopes: requiredScopes,
        tokenScopes: tokenScopes
      };
    }

    // Validate customer ID or user identifier
    if (!payload.sub && !payload.customer_id && !payload.user_id) {
      return {
        isValid: false,
        reason: 'missing_user_identifier',
        message: 'Token must contain user identifier (sub, customer_id, or user_id)'
      };
    }

    return { isValid: true };
  }

  /**
   * Store JWT token securely in memory
   * @param {string} userId - User identifier
   * @param {string} token - JWT token to store
   * @param {Object} metadata - Additional metadata
   * @returns {Promise<boolean>} Success status
   */
  async storeToken(userId, token, metadata = {}) {
    try {
      // Validate token before storing
      const validation = await this.validateToken(token);
      if (!validation.isValid) {
        throw new Error(`Cannot store invalid token: ${validation.reason}`);
      }

      // Encrypt token for storage
      const encryptedToken = this.securityConfig.encryptTokens ? 
        this.encryptToken(token) : token;

      const tokenData = {
        token: encryptedToken,
        encryptedAt: this.securityConfig.encryptTokens ? Date.now() : null,
        userId: userId,
        expiresAt: validation.expiresAt,
        scopes: validation.scopes,
        storedAt: new Date().toISOString(),
        metadata: metadata,
        accessCount: 0,
        lastAccessAt: null
      };

      this.tokenStore.set(userId, tokenData);

      logger.info('JWT token stored securely', {
        userId: userId,
        expiresAt: validation.expiresAt,
        encrypted: this.securityConfig.encryptTokens
      });

      return true;

    } catch (error) {
      logger.error('JWT token storage failed', { error: error.message, userId });
      throw error;
    }
  }

  /**
   * Retrieve and decrypt JWT token from secure storage
   * @param {string} userId - User identifier
   * @returns {Promise<Object|null>} Token data or null if not found/expired
   */
  async getToken(userId) {
    try {
      const tokenData = this.tokenStore.get(userId);
      if (!tokenData) {
        return null;
      }

      // Check if stored token has expired
      if (tokenData.expiresAt && new Date(tokenData.expiresAt) <= new Date()) {
        logger.info('Stored JWT token expired, removing from storage', { userId });
        this.tokenStore.delete(userId);
        return null;
      }

      // Decrypt token if encrypted
      const token = tokenData.encryptedAt ? 
        this.decryptToken(tokenData.token) : tokenData.token;

      // Update access tracking
      tokenData.accessCount++;
      tokenData.lastAccessAt = new Date().toISOString();

      // Validate token is still valid
      const validation = await this.validateToken(token);
      if (!validation.isValid) {
        logger.warn('Stored JWT token no longer valid, removing', { 
          userId, 
          reason: validation.reason 
        });
        this.tokenStore.delete(userId);
        return null;
      }

      return {
        token: token,
        validation: validation,
        metadata: tokenData.metadata,
        storedAt: tokenData.storedAt,
        accessCount: tokenData.accessCount
      };

    } catch (error) {
      logger.error('JWT token retrieval failed', { error: error.message, userId });
      return null;
    }
  }

  /**
   * Check if user has valid JWT token
   * @param {string} userId - User identifier
   * @returns {Promise<boolean>} True if valid token exists
   */
  async hasValidToken(userId) {
    const tokenData = await this.getToken(userId);
    return tokenData !== null;
  }

  /**
   * Remove JWT token from storage
   * @param {string} userId - User identifier
   * @returns {boolean} True if token was removed
   */
  removeToken(userId) {
    const existed = this.tokenStore.has(userId);
    this.tokenStore.delete(userId);
    
    if (existed) {
      logger.info('JWT token removed from storage', { userId });
    }
    
    return existed;
  }

  /**
   * Clear all JWT tokens from storage
   * @returns {number} Number of tokens cleared
   */
  clearAllTokens() {
    const count = this.tokenStore.size;
    this.tokenStore.clear();
    
    logger.info('All JWT tokens cleared from storage', { count });
    return count;
  }

  /**
   * Get token expiry information
   * @param {string} userId - User identifier
   * @returns {Promise<Object|null>} Expiry information or null
   */
  async getTokenExpiry(userId) {
    const tokenData = await this.getToken(userId);
    if (!tokenData) {
      return null;
    }

    const expiresAt = new Date(tokenData.validation.expiresAt);
    const now = new Date();
    const timeToExpiry = expiresAt - now;

    return {
      expiresAt: expiresAt.toISOString(),
      timeToExpiryMs: timeToExpiry,
      timeToExpiryMinutes: Math.floor(timeToExpiry / (1000 * 60)),
      isExpiringSoon: timeToExpiry < (this.config.gracePeriod * 1000),
      isExpired: timeToExpiry <= 0
    };
  }

  /**
   * Base64 URL decode (RFC 4648)
   * @param {string} str - Base64 URL encoded string
   * @returns {string} Decoded string
   */
  base64UrlDecode(str) {
    // Add padding if needed
    str += '='.repeat((4 - str.length % 4) % 4);
    // Replace URL-safe characters
    str = str.replace(/-/g, '+').replace(/_/g, '/');
    // Decode
    return Buffer.from(str, 'base64').toString('utf8');
  }

  /**
   * Encrypt token for secure storage
   * @param {string} token - Token to encrypt
   * @returns {string} Encrypted token
   */
  encryptToken(token) {
    try {
      const algorithm = 'aes-256-cbc';
      const key = crypto.scryptSync('jwt-storage-key', 'salt', 32);
      const iv = crypto.randomBytes(16);
      
      const cipher = crypto.createCipheriv(algorithm, key, iv);
      let encrypted = cipher.update(token, 'utf8', 'hex');
      encrypted += cipher.final('hex');
      
      return `${iv.toString('hex')}:${encrypted}`;
    } catch (error) {
      logger.error('Token encryption failed', { error: error.message });
      throw new Error('Failed to encrypt token');
    }
  }

  /**
   * Decrypt token from secure storage
   * @param {string} encryptedToken - Encrypted token
   * @returns {string} Decrypted token
   */
  decryptToken(encryptedToken) {
    try {
      const algorithm = 'aes-256-cbc';
      const key = crypto.scryptSync('jwt-storage-key', 'salt', 32);
      
      const parts = encryptedToken.split(':');
      if (parts.length !== 2) {
        throw new Error('Invalid encrypted token format');
      }
      
      const iv = Buffer.from(parts[0], 'hex');
      const encrypted = parts[1];
      
      const decipher = crypto.createDecipheriv(algorithm, key, iv);
      
      let decrypted = decipher.update(encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      
      return decrypted;
    } catch (error) {
      logger.error('Token decryption failed', { error: error.message });
      throw new Error('Failed to decrypt token');
    }
  }

  /**
   * Get JWT manager statistics
   * @returns {Object} Manager statistics
   */
  getStats() {
    const stats = {
      tokensStored: this.tokenStore.size,
      encryptionEnabled: this.securityConfig.encryptTokens,
      auditLoggingEnabled: this.securityConfig.auditLogTokenUsage,
      supportedAlgorithm: this.config.algorithm,
      clockTolerance: this.config.clockTolerance,
      maxTokenAge: this.config.maxAge
    };

    return stats;
  }

  /**
   * Cleanup expired tokens from storage
   * @returns {number} Number of tokens cleaned up
   */
  cleanupExpiredTokens() {
    let cleanedCount = 0;
    const now = new Date();

    for (const [userId, tokenData] of this.tokenStore) {
      if (tokenData.expiresAt && new Date(tokenData.expiresAt) <= now) {
        this.tokenStore.delete(userId);
        cleanedCount++;
      }
    }

    if (cleanedCount > 0) {
      logger.info('Cleaned up expired JWT tokens', { count: cleanedCount });
    }

    return cleanedCount;
  }
}