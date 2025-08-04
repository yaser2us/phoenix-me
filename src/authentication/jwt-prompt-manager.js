import { logger } from '../utils/logger.js';

/**
 * JWT Prompt Manager - Phase 5 Checkpoint 3
 * Manages JWT token prompts for Claude Desktop integration
 */
export class JWTPromptManager {
  constructor() {
    this.activePrompts = new Map(); // promptId -> { sessionId, context, timestamp }
    logger.info('JWT Prompt Manager initialized');
  }

  /**
   * Create a JWT token prompt for Claude Desktop
   */
  createPrompt(sessionId, context = {}) {
    const promptId = `jwt_prompt_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    
    this.activePrompts.set(promptId, {
      sessionId,
      context: {
        operation: context.operation || 'banking_operation',
        message: 'JWT token required for Maybank banking operations. Please provide a valid JWT token.',
        timestamp: new Date().toISOString(),
        ...context
      },
      createdAt: new Date(),
      status: 'pending'
    });

    logger.info('JWT prompt created', { promptId, sessionId });
    return promptId;
  }

  /**
   * Get prompt details for Claude Desktop
   */
  getPrompt(promptId) {
    const prompt = this.activePrompts.get(promptId);
    if (!prompt) {
      return null;
    }

    return {
      promptId,
      sessionId: prompt.sessionId,
      message: prompt.context.message,
      operation: prompt.context.operation,
      timestamp: prompt.context.timestamp,
      status: prompt.status
    };
  }

  /**
   * Get all pending prompts for a session
   */
  getPendingPrompts(sessionId) {
    const prompts = [];
    for (const [promptId, prompt] of this.activePrompts) {
      if (prompt.sessionId === sessionId && prompt.status === 'pending') {
        prompts.push({
          promptId,
          message: prompt.context.message,
          operation: prompt.context.operation,
          timestamp: prompt.context.timestamp
        });
      }
    }
    return prompts;
  }

  /**
   * Mark prompt as completed
   */
  completePrompt(promptId, token = null) {
    const prompt = this.activePrompts.get(promptId);
    if (!prompt) {
      throw new Error(`Prompt ${promptId} not found`);
    }

    prompt.status = 'completed';
    prompt.token = token;
    prompt.completedAt = new Date();

    logger.info('JWT prompt completed', { promptId, hasToken: !!token });
    return prompt.sessionId;
  }

  /**
   * Clean up old prompts
   */
  cleanupPrompts(maxAge = 10 * 60 * 1000) { // 10 minutes
    const now = new Date();
    const toDelete = [];

    for (const [promptId, prompt] of this.activePrompts) {
      if (now - prompt.createdAt > maxAge) {
        toDelete.push(promptId);
      }
    }

    toDelete.forEach(promptId => {
      this.activePrompts.delete(promptId);
      logger.debug('Cleaned up old JWT prompt', { promptId });
    });

    return toDelete.length;
  }

  /**
   * Get statistics
   */
  getStats() {
    const stats = {
      totalPrompts: this.activePrompts.size,
      pendingPrompts: 0,
      completedPrompts: 0
    };

    for (const prompt of this.activePrompts.values()) {
      if (prompt.status === 'pending') {
        stats.pendingPrompts++;
      } else if (prompt.status === 'completed') {
        stats.completedPrompts++;
      }
    }

    return stats;
  }
}