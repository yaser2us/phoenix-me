import { logger } from '../utils/logger.js';
import { JWTManager } from './jwt-manager.js';
import { JWTPromptManager } from './jwt-prompt-manager.js';

/**
 * JWT Session Manager - Phase 5 Checkpoint 1
 * Manages JWT tokens across Claude Desktop sessions with dynamic refresh capability
 */
export class JWTSessionManager {
  constructor() {
    this.jwtManager = new JWTManager();
    this.jwtPromptManager = new JWTPromptManager();
    this.activeSessions = new Map(); // sessionId -> { token, userId, expires }
    this.pendingPrompts = new Map(); // sessionId -> { resolve, reject, context }
    
    logger.info('JWT Session Manager initialized');
  }

  /**
   * Get JWT token for session, prompt user if expired
   */
  async getValidToken(sessionId, userId = 'default', context = {}) {
    const session = this.activeSessions.get(sessionId);
    
    // Check if we have a token and if it's valid
    if (session?.token) {
      const validation = await this.jwtManager.validateMaybankToken(session.token);
      if (validation.isValid) {
        logger.debug('Using existing valid JWT token', { sessionId });
        return session.token;
      }
      
      logger.info('JWT token expired, requesting new token', { 
        sessionId, 
        expiredAt: validation.expiredAt 
      });
    }
    
    // Need new token - prompt user
    return await this.promptForNewToken(sessionId, userId, context);
  }

  /**
   * Prompt user for new JWT token (Claude Desktop integration - Phase 5 Fix)
   */
  async promptForNewToken(sessionId, userId, context) {
    // Check if we already have a pending prompt for this session
    if (this.pendingPrompts.has(sessionId)) {
      logger.debug('Waiting for existing JWT prompt', { sessionId });
      return await this.pendingPrompts.get(sessionId).promise;
    }

    // PHASE 5 FIX: Create prompt using JWT Prompt Manager for Claude Desktop integration
    const promptId = this.jwtPromptManager.createPrompt(sessionId, context);
    
    logger.info('JWT token prompt created for Claude Desktop', { 
      sessionId, 
      userId, 
      promptId,
      operation: context.operation 
    });

    // Create promise that will be resolved when Claude Desktop provides token
    const prompt = this.createTokenPromptWithPromptManager(sessionId, userId, promptId, context);
    this.pendingPrompts.set(sessionId, prompt);

    try {
      const newToken = await prompt.promise;
      
      // Validate new token
      const validation = await this.jwtManager.validateMaybankToken(newToken);
      if (!validation.isValid) {
        throw new Error(`Invalid JWT token provided: ${validation.reason}`);
      }

      // Store valid token
      this.activeSessions.set(sessionId, {
        token: newToken,
        userId,
        expires: validation.payload?.exp ? new Date(validation.payload.exp * 1000) : null,
        createdAt: new Date()
      });

      // Complete the prompt in prompt manager
      this.jwtPromptManager.completePrompt(promptId, newToken);

      logger.info('New JWT token stored successfully', { sessionId, promptId });
      return newToken;

    } finally {
      this.pendingPrompts.delete(sessionId);
    }
  }

  /**
   * Create a token prompt with Prompt Manager integration (Phase 5 Fix)
   */
  createTokenPromptWithPromptManager(sessionId, userId, promptId, context) {
    let promiseResolve, promiseReject;
    
    const promise = new Promise((resolve, reject) => {
      promiseResolve = resolve;
      promiseReject = reject;
      
      // Set timeout for prompt (10 minutes for user to provide token)
      setTimeout(() => {
        reject(new Error(`JWT token prompt timed out after 10 minutes. PromptId: ${promptId}`));
      }, 10 * 60 * 1000);
    });

    return {
      promise,
      resolve: promiseResolve,
      reject: promiseReject,
      promptId,
      context: {
        sessionId,
        userId,
        promptId,
        message: `JWT token required for ${context.operation || 'banking operation'}. Use provide_jwt_token tool with promptId: ${promptId}`,
        operation: context.operation || 'banking_operation',
        timestamp: new Date().toISOString()
      }
    };
  }

  /**
   * Create a token prompt that Claude Desktop can handle (Legacy)
   */
  createTokenPrompt(sessionId, userId, context) {
    let promiseResolve, promiseReject;
    
    const promise = new Promise((resolve, reject) => {
      promiseResolve = resolve;
      promiseReject = reject;
      
      // Set timeout for prompt (5 minutes)
      setTimeout(() => {
        reject(new Error('JWT token prompt timed out'));
      }, 5 * 60 * 1000);
    });

    return {
      promise,
      resolve: promiseResolve,
      reject: promiseReject,
      context: {
        sessionId,
        userId,
        message: 'JWT token required or expired. Please provide a valid Maybank JWT token.',
        operation: context.operation || 'banking_operation',
        timestamp: new Date().toISOString()
      }
    };
  }

  /**
   * Store a JWT token for a session (Phase 5 Checkpoint 4)
   */
  async storeToken(sessionId, token, userId = 'default') {
    try {
      // Validate token before storing
      const validation = await this.jwtManager.validateMaybankToken(token);
      if (!validation.isValid) {
        logger.warn('Attempted to store invalid JWT token', { 
          sessionId, 
          reason: validation.reason 
        });
        return false;
      }

      // Store valid token
      this.activeSessions.set(sessionId, {
        token: token,
        userId,
        expires: validation.payload?.exp ? new Date(validation.payload.exp * 1000) : null,
        createdAt: new Date()
      });

      logger.debug('JWT token stored in session', { 
        sessionId, 
        userId,
        expires: validation.payload?.exp ? new Date(validation.payload.exp * 1000).toISOString() : 'no expiry'
      });
      
      return true;
    } catch (error) {
      logger.error('Failed to store JWT token', { 
        sessionId, 
        error: error.message 
      });
      return false;
    }
  }

  /**
   * Provide token from user via prompt ID (Phase 5 Fix)
   */
  async provideTokenByPromptId(promptId, token) {
    // Find the pending prompt by promptId
    let targetPrompt = null;
    let targetSessionId = null;
    
    for (const [sessionId, prompt] of this.pendingPrompts) {
      if (prompt.promptId === promptId) {
        targetPrompt = prompt;
        targetSessionId = sessionId;
        break;
      }
    }
    
    if (!targetPrompt) {
      throw new Error(`No pending JWT prompt found for promptId: ${promptId}`);
    }

    logger.info('Resolving JWT prompt with provided token', { 
      promptId, 
      sessionId: targetSessionId,
      tokenLength: token?.length 
    });

    targetPrompt.resolve(token);
    return targetSessionId;
  }

  /**
   * Provide token from user (Legacy - called by Claude Desktop)
   */
  async provideToken(sessionId, token) {
    const prompt = this.pendingPrompts.get(sessionId);
    if (!prompt) {
      throw new Error(`No pending JWT prompt found for session: ${sessionId}`);
    }

    prompt.resolve(token);
    return true;
  }

  /**
   * Check if session needs token
   */
  isWaitingForToken(sessionId) {
    return this.pendingPrompts.has(sessionId);
  }

  /**
   * Get prompt context for Claude Desktop
   */
  getPromptContext(sessionId) {
    const prompt = this.pendingPrompts.get(sessionId);
    return prompt?.context || null;
  }

  /**
   * Clear session
   */
  clearSession(sessionId) {
    this.activeSessions.delete(sessionId);
    const prompt = this.pendingPrompts.get(sessionId);
    if (prompt) {
      prompt.reject(new Error('Session cleared'));
      this.pendingPrompts.delete(sessionId);
    }
  }
}