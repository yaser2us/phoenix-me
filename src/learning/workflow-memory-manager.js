import { logger } from '../utils/logger.js';

/**
 * Workflow Memory Manager - Phase 4.9 Checkpoint 4
 * Stores and recalls successful workflow patterns with intelligent retrieval
 */
export class WorkflowMemoryManager {
  constructor() {
    this.workflows = new Map();
    this.intentIndex = new Map(); // Index workflows by intent patterns
    this.patternIndex = new Map(); // Index workflows by execution patterns
    this.successIndex = new Map(); // Index workflows by success metrics
    this.memoryMetrics = {
      totalStored: 0,
      totalRecalled: 0,
      avgRecallTime: 0,
      storageSize: 0
    };
    
    logger.info('Workflow Memory Manager initialized');
  }

  /**
   * Store a successful workflow execution for future reference
   */
  async storeWorkflow(workflowData) {
    try {
      logger.debug('Storing workflow', {
        id: workflowData.id,
        pattern: workflowData.pattern,
        success: workflowData.executionResults?.success
      });

      const workflow = {
        ...workflowData,
        storedAt: new Date().toISOString(),
        accessCount: 0,
        lastAccessed: null,
        similarity: this.calculateSimilarityFeatures(workflowData)
      };

      // Store in main memory
      this.workflows.set(workflowData.id, workflow);

      // Build search indices
      await this.buildSearchIndices(workflow);

      // Update metrics
      this.memoryMetrics.totalStored++;
      this.memoryMetrics.storageSize = this.calculateStorageSize();

      logger.info('Workflow stored successfully', {
        id: workflowData.id,
        totalWorkflows: this.workflows.size
      });

    } catch (error) {
      logger.error('Workflow storage failed', { error: error.message });
      throw error;
    }
  }

  /**
   * Recall workflows similar to the given intent
   */
  async recallSimilarWorkflows(userIntent, options = {}) {
    try {
      const startTime = Date.now();
      logger.debug('Recalling similar workflows', {
        intent: userIntent,
        threshold: options.threshold || 0.6
      });

      const threshold = options.threshold || 0.6;
      const maxResults = options.maxResults || 10;
      const candidateWorkflows = [];

      // Extract intent features for comparison
      const intentFeatures = this.extractIntentFeatures(userIntent);

      // Find similar workflows using multiple strategies
      for (const [workflowId, workflow] of this.workflows) {
        const similarity = this.calculateIntentSimilarity(
          intentFeatures,
          workflow.similarity.intentFeatures
        );

        // Debug logging removed for performance

        if (similarity >= threshold) {
          candidateWorkflows.push({
            workflow,
            similarity,
            relevanceScore: this.calculateRelevanceScore(workflow, similarity)
          });
        }
      }

      // Sort by relevance score
      candidateWorkflows.sort((a, b) => b.relevanceScore - a.relevanceScore);

      // Update access metrics
      const results = candidateWorkflows.slice(0, maxResults);
      for (const result of results) {
        const workflow = result.workflow;
        workflow.accessCount++;
        workflow.lastAccessed = new Date().toISOString();
      }

      // Update recall metrics
      const recallTime = Date.now() - startTime;
      this.memoryMetrics.totalRecalled++;
      this.memoryMetrics.avgRecallTime = 
        (this.memoryMetrics.avgRecallTime * (this.memoryMetrics.totalRecalled - 1) + recallTime) / 
        this.memoryMetrics.totalRecalled;

      logger.info('Workflow recall completed', {
        intent: userIntent,
        foundWorkflows: results.length,
        recallTime
      });

      return results.map(r => ({
        workflow: r.workflow,
        similarity: r.similarity,
        relevanceScore: r.relevanceScore
      }));

    } catch (error) {
      logger.error('Workflow recall failed', { error: error.message });
      throw error;
    }
  }

  /**
   * Get workflow execution statistics
   */
  async getWorkflowStatistics() {
    try {
      const stats = {
        totalWorkflows: this.workflows.size,
        successfulWorkflows: 0,
        averageSuccessRate: 0,
        totalExecutions: 0,
        patternDistribution: new Map(),
        recentActivity: []
      };

      for (const [id, workflow] of this.workflows) {
        if (workflow.executionResults?.success) {
          stats.successfulWorkflows++;
        }

        stats.totalExecutions += workflow.accessCount || 0;

        // Pattern distribution
        const pattern = workflow.pattern || 'unknown';
        stats.patternDistribution.set(
          pattern, 
          (stats.patternDistribution.get(pattern) || 0) + 1
        );

        // Recent activity (last 7 days)
        if (workflow.storedAt) {
          const storedDate = new Date(workflow.storedAt);
          const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
          if (storedDate > weekAgo) {
            stats.recentActivity.push({
              id,
              pattern: workflow.pattern,
              storedAt: workflow.storedAt
            });
          }
        }
      }

      stats.averageSuccessRate = stats.totalWorkflows > 0 
        ? stats.successfulWorkflows / stats.totalWorkflows 
        : 0;

      // Convert Map to Object for JSON serialization
      stats.patternDistribution = Object.fromEntries(stats.patternDistribution);

      logger.debug('Generated workflow statistics', {
        totalWorkflows: stats.totalWorkflows,
        successRate: stats.averageSuccessRate
      });

      return stats;

    } catch (error) {
      logger.error('Statistics generation failed', { error: error.message });
      throw error;
    }
  }

  /**
   * Get memory usage information
   */
  async getMemoryUsage() {
    try {
      const usage = {
        size: this.memoryMetrics.storageSize,
        workflows: this.workflows.size,
        indices: {
          intents: this.intentIndex.size,
          patterns: this.patternIndex.size,
          success: this.successIndex.size
        },
        metrics: { ...this.memoryMetrics }
      };

      return usage;

    } catch (error) {
      logger.error('Memory usage calculation failed', { error: error.message });
      throw error;
    }
  }

  /**
   * Optimize memory by removing old or low-performing workflows
   */
  async optimizeMemory(options = {}) {
    try {
      logger.debug('Starting memory optimization', options);

      const maxAge = options.maxAge || 30; // days
      const minSuccessRate = options.minSuccessRate || 0.3;
      const minAccessCount = options.minAccessCount || 1;

      const removedWorkflows = [];
      const cutoffDate = new Date(Date.now() - maxAge * 24 * 60 * 60 * 1000);

      for (const [workflowId, workflow] of this.workflows) {
        let shouldRemove = false;

        // Remove old workflows
        if (workflow.storedAt && new Date(workflow.storedAt) < cutoffDate) {
          shouldRemove = true;
        }

        // Remove low-performing workflows
        const successRate = workflow.executionResults?.success ? 1 : 0;
        if (successRate < minSuccessRate) {
          shouldRemove = true;
        }

        // Remove rarely accessed workflows
        if ((workflow.accessCount || 0) < minAccessCount) {
          shouldRemove = true;
        }

        if (shouldRemove) {
          this.workflows.delete(workflowId);
          removedWorkflows.push(workflowId);
        }
      }

      // Rebuild indices after cleanup
      await this.rebuildIndices();

      // Update metrics
      this.memoryMetrics.storageSize = this.calculateStorageSize();

      logger.info('Memory optimization completed', {
        removedWorkflows: removedWorkflows.length,
        remainingWorkflows: this.workflows.size
      });

      return {
        removedCount: removedWorkflows.length,
        remainingCount: this.workflows.size,
        removedWorkflows
      };

    } catch (error) {
      logger.error('Memory optimization failed', { error: error.message });
      throw error;
    }
  }

  /**
   * Calculate similarity features for a workflow
   */
  calculateSimilarityFeatures(workflowData) {
    return {
      intentFeatures: this.extractIntentFeatures(workflowData.userIntent || ''),
      patternFeatures: this.extractPatternFeatures(workflowData.pattern || ''),
      stepFeatures: this.extractStepFeatures(workflowData.plan?.steps || []),
      contextFeatures: this.extractContextFeatures(workflowData)
    };
  }

  /**
   * Extract features from user intent
   */
  extractIntentFeatures(intent) {
    const words = intent.toLowerCase()
      .replace(/[^\w\s]/g, '')
      .split(/\s+/)
      .filter(word => word.length > 2);

    const features = {
      words: new Set(words),
      length: intent.length,
      hasFinancial: /balance|account|money|financial|bank/i.test(intent),
      hasWeather: /weather|temperature|condition|forecast/i.test(intent),
      hasCurrency: /currency|exchange|rate|dollar|euro/i.test(intent),
      hasGoals: /goal|target|saving|plan/i.test(intent),
      actionWords: words.filter(word => 
        ['get', 'show', 'check', 'view', 'see', 'display'].includes(word)
      )
    };

    // Debug logging removed for performance

    return features;
  }

  /**
   * Extract features from workflow pattern
   */
  extractPatternFeatures(pattern) {
    return {
      name: pattern,
      domains: pattern.split('_').filter(part => part !== 'overview' && part !== 'report'),
      complexity: pattern.split('_').length,
      isMultiDomain: pattern.includes('_')
    };
  }

  /**
   * Extract features from workflow steps
   */
  extractStepFeatures(steps) {
    return {
      count: steps.length,
      operations: steps.map(step => step.operation || ''),
      hasParallel: steps.some(step => (step.dependencies || []).length === 0),
      complexity: steps.reduce((sum, step) => sum + (step.dependencies || []).length, 0)
    };
  }

  /**
   * Extract context features
   */
  extractContextFeatures(workflowData) {
    return {
      hasUserFeedback: !!workflowData.userFeedback,
      successRate: workflowData.executionResults?.success ? 1 : 0,
      executionTime: workflowData.executionResults?.duration || 0,
      dataQuality: workflowData.executionResults?.dataQuality || 0
    };
  }

  /**
   * Calculate intent similarity between two feature sets
   */
  calculateIntentSimilarity(features1, features2) {
    let similarity = 0;
    let totalWeight = 0;

    // Word overlap similarity (weight: 0.4)
    const wordWeight = 0.4;
    const intersection = new Set([...features1.words].filter(x => features2.words.has(x)));
    const union = new Set([...features1.words, ...features2.words]);
    const wordSimilarity = union.size > 0 ? intersection.size / union.size : 0;
    similarity += wordSimilarity * wordWeight;
    totalWeight += wordWeight;

    // Domain similarity (weight: 0.3)
    const domainWeight = 0.3;
    const domainMatches = [
      features1.hasFinancial && features2.hasFinancial,
      features1.hasWeather && features2.hasWeather,
      features1.hasCurrency && features2.hasCurrency,
      features1.hasGoals && features2.hasGoals
    ].filter(match => match).length;
    
    // If both have the same domains, give high similarity
    const totalDomains = [
      features1.hasFinancial || features2.hasFinancial,
      features1.hasWeather || features2.hasWeather,
      features1.hasCurrency || features2.hasCurrency,
      features1.hasGoals || features2.hasGoals
    ].filter(domain => domain).length;
    
    const domainSimilarity = totalDomains > 0 ? domainMatches / totalDomains : 0;
    similarity += domainSimilarity * domainWeight;
    totalWeight += domainWeight;

    // Action similarity (weight: 0.2)
    const actionWeight = 0.2;
    const actionIntersection = features1.actionWords.filter(word => 
      features2.actionWords.includes(word)
    ).length;
    const actionUnion = [...new Set([...features1.actionWords, ...features2.actionWords])].length;
    const actionSimilarity = actionUnion > 0 ? actionIntersection / actionUnion : 0;
    similarity += actionSimilarity * actionWeight;
    totalWeight += actionWeight;

    // Length similarity (weight: 0.1)
    const lengthWeight = 0.1;
    const maxLength = Math.max(features1.length, features2.length);
    const lengthSimilarity = maxLength > 0 ? 
      1 - Math.abs(features1.length - features2.length) / maxLength : 1;
    similarity += lengthSimilarity * lengthWeight;
    totalWeight += lengthWeight;

    return totalWeight > 0 ? similarity / totalWeight : 0;
  }

  /**
   * Calculate relevance score combining similarity and performance metrics
   */
  calculateRelevanceScore(workflow, similarity) {
    const performanceScore = this.calculatePerformanceScore(workflow);
    const recencyScore = this.calculateRecencyScore(workflow);
    const popularityScore = this.calculatePopularityScore(workflow);

    // Weighted combination
    return (
      similarity * 0.4 +
      performanceScore * 0.3 +
      recencyScore * 0.2 +
      popularityScore * 0.1
    );
  }

  /**
   * Calculate performance score based on execution metrics
   */
  calculatePerformanceScore(workflow) {
    const success = workflow.executionResults?.success ? 1 : 0;
    const dataQuality = workflow.executionResults?.dataQuality || 0.5;
    const userRating = workflow.userFeedback?.rating || 3;
    const normalizedRating = Math.max(0, (userRating - 1) / 4); // Scale 1-5 to 0-1

    return (success * 0.4 + dataQuality * 0.3 + normalizedRating * 0.3);
  }

  /**
   * Calculate recency score (more recent = higher score)
   */
  calculateRecencyScore(workflow) {
    if (!workflow.storedAt) return 0.5;

    const now = Date.now();
    const storedTime = new Date(workflow.storedAt).getTime();
    const ageInDays = (now - storedTime) / (24 * 60 * 60 * 1000);

    // Decay function: score decreases over time
    return Math.exp(-ageInDays / 30); // 30-day half-life
  }

  /**
   * Calculate popularity score based on access count
   */
  calculatePopularityScore(workflow) {
    const accessCount = workflow.accessCount || 0;
    const maxAccess = Math.max(...Array.from(this.workflows.values())
      .map(w => w.accessCount || 0)) || 1;

    return accessCount / maxAccess;
  }

  /**
   * Build search indices for efficient retrieval
   */
  async buildSearchIndices(workflow) {
    // Intent index
    const intentFeatures = workflow.similarity.intentFeatures;
    for (const word of intentFeatures.words) {
      if (!this.intentIndex.has(word)) {
        this.intentIndex.set(word, new Set());
      }
      this.intentIndex.get(word).add(workflow.id);
    }

    // Pattern index
    const pattern = workflow.pattern;
    if (pattern) {
      if (!this.patternIndex.has(pattern)) {
        this.patternIndex.set(pattern, new Set());
      }
      this.patternIndex.get(pattern).add(workflow.id);
    }

    // Success index
    const success = workflow.executionResults?.success;
    if (success !== undefined) {
      const successKey = success ? 'successful' : 'failed';
      if (!this.successIndex.has(successKey)) {
        this.successIndex.set(successKey, new Set());
      }
      this.successIndex.get(successKey).add(workflow.id);
    }
  }

  /**
   * Rebuild all search indices
   */
  async rebuildIndices() {
    this.intentIndex.clear();
    this.patternIndex.clear();
    this.successIndex.clear();

    for (const workflow of this.workflows.values()) {
      await this.buildSearchIndices(workflow);
    }
  }

  /**
   * Calculate total storage size
   */
  calculateStorageSize() {
    let totalSize = 0;
    for (const workflow of this.workflows.values()) {
      totalSize += JSON.stringify(workflow).length;
    }
    return totalSize;
  }
}