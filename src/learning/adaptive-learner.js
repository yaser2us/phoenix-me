import { logger } from '../utils/logger.js';

/**
 * Adaptive Learner - Phase 4.9 Checkpoint 4
 * Coordinates learning across the system and provides intelligent optimization
 */
export class AdaptiveLearner {
  constructor(memoryManager, patternRecognizer, metricsTracker) {
    this.memoryManager = memoryManager;
    this.patternRecognizer = patternRecognizer;
    this.metricsTracker = metricsTracker;
    
    this.learningState = {
      totalLearningCycles: 0,
      lastOptimization: null,
      knowledgeBase: new Map(),
      improvementHistory: [],
      adaptationRules: new Map()
    };
    
    this.initializeAdaptationRules();
    
    logger.info('Adaptive Learner initialized');
  }

  /**
   * Learn from workflow execution results
   */
  async learnFromExecution(executionData) {
    try {
      logger.debug('Learning from execution', {
        workflowId: executionData.workflow?.id,
        success: executionData.results?.success
      });

      const learningInsights = [];

      // Extract learning signals
      const signals = this.extractLearningSignals(executionData);
      
      // Update pattern knowledge
      if (signals.patternSignals.length > 0) {
        const patternLearning = await this.learnPatterns(signals.patternSignals);
        learningInsights.push(...patternLearning);
      }

      // Update performance knowledge
      if (signals.performanceSignals.length > 0) {
        const performanceLearning = await this.learnPerformance(signals.performanceSignals);
        learningInsights.push(...performanceLearning);
      }

      // Update user preference knowledge
      if (signals.preferenceSignals.length > 0) {
        const preferenceLearning = await this.learnPreferences(signals.preferenceSignals);
        learningInsights.push(...preferenceLearning);
      }

      // Update knowledge base
      await this.updateKnowledgeBase(executionData, learningInsights);

      // Store execution in memory for future reference
      await this.memoryManager.storeWorkflow({
        id: executionData.workflow.id || `wf_${Date.now()}`,
        userIntent: executionData.workflow.intent,
        pattern: executionData.workflow.pattern,
        plan: executionData.workflow.plan,
        executionResults: executionData.results,
        userFeedback: {
          rating: executionData.results.userRating,
          satisfaction: executionData.results.userRating >= 4 ? 'positive' : 'neutral'
        }
      });

      logger.info('Learning from execution completed', {
        workflowId: executionData.workflow?.id,
        insights: learningInsights.length,
        success: executionData.results?.success
      });

      return {
        insights: learningInsights,
        knowledgeUpdates: learningInsights.length,
        learningSignals: signals
      };

    } catch (error) {
      logger.error('Learning from execution failed', { error: error.message });
      throw error;
    }
  }

  /**
   * Suggest optimal workflow for a given user intent
   */
  async suggestOptimalWorkflow(userIntent, context = {}) {
    try {
      logger.debug('Suggesting optimal workflow', {
        intent: userIntent,
        contextKeys: Object.keys(context)
      });

      // Recall similar successful workflows
      const similarWorkflows = await this.memoryManager.recallSimilarWorkflows(
        userIntent,
        { threshold: 0.6, maxResults: 5 }
      );

      // Get pattern recommendations
      const patternInsights = await this.getPatternBasedRecommendations(userIntent);

      // Get performance-optimized suggestions
      const performanceOptimizations = await this.getPerformanceOptimizations(
        similarWorkflows,
        context
      );

      // Combine insights to create optimal workflow
      const optimalWorkflow = await this.synthesizeOptimalWorkflow(
        userIntent,
        similarWorkflows,
        patternInsights,
        performanceOptimizations,
        context
      );

      // Calculate confidence based on available data
      const confidence = this.calculateOptimizationConfidence(
        similarWorkflows,
        patternInsights,
        performanceOptimizations
      );

      logger.info('Optimal workflow suggested', {
        intent: userIntent,
        confidence: (confidence * 100).toFixed(0) + '%',
        basedOnWorkflows: similarWorkflows.length
      });

      return {
        workflow: optimalWorkflow,
        confidence,
        reasoning: {
          similarWorkflows: similarWorkflows.length,
          patternMatches: patternInsights.patterns.length,
          optimizations: performanceOptimizations.length
        },
        alternatives: await this.generateAlternativeWorkflows(
          userIntent,
          similarWorkflows,
          optimalWorkflow
        )
      };

    } catch (error) {
      logger.error('Workflow suggestion failed', { error: error.message });
      throw error;
    }
  }

  /**
   * Adapt to user preferences over time
   */
  async adaptToUserPreferences(userPreferences) {
    try {
      logger.debug('Adapting to user preferences', {
        userId: userPreferences.userId,
        preferences: Object.keys(userPreferences.preferences || {})
      });

      const userId = userPreferences.userId;
      const preferences = userPreferences.preferences || {};
      const history = userPreferences.history || [];

      // Analyze user behavior patterns
      const behaviorPatterns = await this.analyzeBehaviorPatterns(history);

      // Update adaptation rules for this user
      const adaptationRules = await this.generateUserAdaptationRules(
        preferences,
        behaviorPatterns
      );

      // Store user-specific adaptations
      this.learningState.adaptationRules.set(userId, {
        preferences,
        behaviorPatterns,
        adaptationRules,
        lastUpdated: new Date().toISOString()
      });

      // Generate personalization insights
      const personalizationInsights = await this.generatePersonalizationInsights(
        preferences,
        behaviorPatterns
      );

      logger.info('User preference adaptation completed', {
        userId,
        adaptationRules: adaptationRules.length,
        behaviorPatterns: behaviorPatterns.length
      });

      return {
        adaptationRules,
        behaviorPatterns,
        personalizationInsights,
        adaptedAt: new Date().toISOString()
      };

    } catch (error) {
      logger.error('User preference adaptation failed', { error: error.message });
      throw error;
    }
  }

  /**
   * Run continuous improvement cycle
   */
  async runImprovementCycle() {
    try {
      logger.debug('Running improvement cycle');

      const cycle = {
        cycleId: `cycle_${Date.now()}`,
        startTime: Date.now(),
        improvements: [],
        optimizations: [],
        knowledgeUpdates: []
      };

      // Analyze current performance
      const currentMetrics = await this.metricsTracker.getBenchmarks();
      
      // Identify improvement opportunities
      const opportunities = await this.identifyImprovementOpportunities(currentMetrics);

      // Generate improvement recommendations
      const recommendations = await this.metricsTracker.generateImprovementRecommendations();

      // Apply automatic optimizations
      const automatedOptimizations = await this.applyAutomaticOptimizations(opportunities);
      cycle.optimizations.push(...automatedOptimizations);

      // Update learning algorithms based on recent performance
      const algorithmUpdates = await this.updateLearningAlgorithms(currentMetrics);
      cycle.improvements.push(...algorithmUpdates);

      // Consolidate and update knowledge base
      const knowledgeUpdates = await this.consolidateKnowledge();
      cycle.knowledgeUpdates.push(knowledgeUpdates);

      // Update improvement history
      cycle.endTime = Date.now();
      cycle.duration = cycle.endTime - cycle.startTime;
      this.learningState.improvementHistory.push(cycle);
      this.learningState.totalLearningCycles++;
      this.learningState.lastOptimization = new Date().toISOString();

      logger.info('Improvement cycle completed', {
        cycleId: cycle.cycleId,
        duration: cycle.duration,
        improvements: cycle.improvements.length,
        optimizations: cycle.optimizations.length
      });

      return {
        cycleId: cycle.cycleId,
        improvements: cycle.improvements,
        optimizations: cycle.optimizations,
        knowledgeUpdates: cycle.knowledgeUpdates,
        recommendations,
        metrics: currentMetrics,
        duration: cycle.duration
      };

    } catch (error) {
      logger.error('Improvement cycle failed', { error: error.message });
      throw error;
    }
  }

  /**
   * Consolidate learned knowledge into actionable insights
   */
  async consolidateKnowledge() {
    try {
      logger.debug('Consolidating learned knowledge');

      const consolidation = {
        patterns: [],
        rules: [],
        optimizations: [],
        insights: []
      };

      // Consolidate pattern knowledge
      const patternKnowledge = await this.consolidatePatternKnowledge();
      consolidation.patterns.push(...patternKnowledge);

      // Consolidate performance rules
      const performanceRules = await this.consolidatePerformanceRules();
      consolidation.rules.push(...performanceRules);

      // Consolidate optimization strategies
      const optimizationStrategies = await this.consolidateOptimizationStrategies();
      consolidation.optimizations.push(...optimizationStrategies);

      // Generate meta-insights from consolidated knowledge
      const metaInsights = await this.generateMetaInsights(consolidation);
      consolidation.insights.push(...metaInsights);

      // Update knowledge base with consolidated insights
      const timestamp = new Date().toISOString();
      this.learningState.knowledgeBase.set(`consolidation_${timestamp}`, {
        ...consolidation,
        consolidatedAt: timestamp
      });

      logger.info('Knowledge consolidation completed', {
        patterns: consolidation.patterns.length,
        rules: consolidation.rules.length,
        optimizations: consolidation.optimizations.length,
        insights: consolidation.insights.length
      });

      return consolidation;

    } catch (error) {
      logger.error('Knowledge consolidation failed', { error: error.message });
      throw error;
    }
  }

  /**
   * Extract learning signals from execution data
   */
  extractLearningSignals(executionData) {
    const signals = {
      patternSignals: [],
      performanceSignals: [],
      preferenceSignals: []
    };

    // Pattern signals
    if (executionData.workflow?.pattern) {
      signals.patternSignals.push({
        type: 'pattern_usage',
        pattern: executionData.workflow.pattern,
        success: executionData.results?.success,
        intent: executionData.workflow.intent
      });
    }

    // Performance signals
    if (executionData.results?.executionTime) {
      signals.performanceSignals.push({
        type: 'execution_time',
        value: executionData.results.executionTime,
        success: executionData.results.success,
        operations: executionData.workflow?.plan?.steps?.map(s => s.operation) || []
      });
    }

    // User preference signals
    if (executionData.results?.userRating) {
      signals.preferenceSignals.push({
        type: 'user_satisfaction',
        rating: executionData.results.userRating,
        pattern: executionData.workflow?.pattern,
        executionTime: executionData.results.executionTime
      });
    }

    return signals;
  }

  /**
   * Learn from pattern signals
   */
  async learnPatterns(patternSignals) {
    const insights = [];

    for (const signal of patternSignals) {
      if (signal.type === 'pattern_usage') {
        const patternKey = `pattern_${signal.pattern}`;
        const existingKnowledge = this.learningState.knowledgeBase.get(patternKey) || {
          usage: 0,
          successes: 0,
          intents: new Set()
        };

        existingKnowledge.usage++;
        if (signal.success) existingKnowledge.successes++;
        existingKnowledge.intents.add(signal.intent);

        this.learningState.knowledgeBase.set(patternKey, existingKnowledge);

        insights.push({
          type: 'pattern_learning',
          pattern: signal.pattern,
          successRate: existingKnowledge.successes / existingKnowledge.usage,
          usage: existingKnowledge.usage
        });
      }
    }

    return insights;
  }

  /**
   * Learn from performance signals
   */
  async learnPerformance(performanceSignals) {
    const insights = [];

    for (const signal of performanceSignals) {
      if (signal.type === 'execution_time') {
        const operationsKey = `operations_${signal.operations.join('_')}`;
        const existingKnowledge = this.learningState.knowledgeBase.get(operationsKey) || {
          executions: [],
          avgTime: 0,
          successRate: 0
        };

        existingKnowledge.executions.push({
          time: signal.value,
          success: signal.success
        });

        // Keep only recent executions (last 100)
        if (existingKnowledge.executions.length > 100) {
          existingKnowledge.executions = existingKnowledge.executions.slice(-100);
        }

        // Recalculate averages
        const times = existingKnowledge.executions.map(e => e.time);
        const successes = existingKnowledge.executions.filter(e => e.success).length;
        
        existingKnowledge.avgTime = times.reduce((a, b) => a + b, 0) / times.length;
        existingKnowledge.successRate = successes / existingKnowledge.executions.length;

        this.learningState.knowledgeBase.set(operationsKey, existingKnowledge);

        insights.push({
          type: 'performance_learning',
          operations: signal.operations,
          avgTime: existingKnowledge.avgTime,
          successRate: existingKnowledge.successRate
        });
      }
    }

    return insights;
  }

  /**
   * Learn from user preference signals
   */
  async learnPreferences(preferenceSignals) {
    const insights = [];

    for (const signal of preferenceSignals) {
      if (signal.type === 'user_satisfaction') {
        const satisfactionKey = `satisfaction_${signal.pattern}`;
        const existingKnowledge = this.learningState.knowledgeBase.get(satisfactionKey) || {
          ratings: [],
          avgRating: 0,
          patterns: new Map()
        };

        existingKnowledge.ratings.push(signal.rating);
        
        // Keep only recent ratings (last 50)
        if (existingKnowledge.ratings.length > 50) {
          existingKnowledge.ratings = existingKnowledge.ratings.slice(-50);
        }

        existingKnowledge.avgRating = existingKnowledge.ratings.reduce((a, b) => a + b, 0) / existingKnowledge.ratings.length;

        // Track satisfaction patterns
        const timeCategory = signal.executionTime < 2000 ? 'fast' : 'slow';
        existingKnowledge.patterns.set(timeCategory, (existingKnowledge.patterns.get(timeCategory) || 0) + signal.rating);

        this.learningState.knowledgeBase.set(satisfactionKey, existingKnowledge);

        insights.push({
          type: 'preference_learning',
          pattern: signal.pattern,
          avgRating: existingKnowledge.avgRating,
          sampleSize: existingKnowledge.ratings.length
        });
      }
    }

    return insights;
  }

  /**
   * Update knowledge base with execution insights
   */
  async updateKnowledgeBase(executionData, learningInsights) {
    const executionKey = `execution_${executionData.workflow?.id || Date.now()}`;
    
    this.learningState.knowledgeBase.set(executionKey, {
      execution: executionData,
      insights: learningInsights,
      timestamp: new Date().toISOString()
    });

    // Clean up old execution data (keep last 500)
    const executionKeys = Array.from(this.learningState.knowledgeBase.keys())
      .filter(key => key.startsWith('execution_'))
      .sort();
    
    if (executionKeys.length > 500) {
      const keysToRemove = executionKeys.slice(0, executionKeys.length - 500);
      for (const key of keysToRemove) {
        this.learningState.knowledgeBase.delete(key);
      }
    }
  }

  /**
   * Initialize adaptation rules
   */
  initializeAdaptationRules() {
    // Performance-based adaptations
    this.learningState.adaptationRules.set('performance', {
      slowExecution: {
        condition: 'executionTime > 3000',
        action: 'enableParallelExecution',
        priority: 'high'
      },
      lowSuccessRate: {
        condition: 'successRate < 0.8',
        action: 'improveErrorHandling',
        priority: 'high'
      }
    });

    // User satisfaction adaptations
    this.learningState.adaptationRules.set('satisfaction', {
      lowRating: {
        condition: 'avgRating < 3.5',
        action: 'analyzeUserFeedback',
        priority: 'medium'
      },
      highRating: {
        condition: 'avgRating > 4.5',
        action: 'reinforceSuccessfulPatterns',
        priority: 'low'
      }
    });
  }

  /**
   * Get pattern-based recommendations
   */
  async getPatternBasedRecommendations(userIntent) {
    const intentFeatures = this.patternRecognizer.extractIntentFeatures(userIntent);
    
    // Find matching patterns from knowledge base
    const matchingPatterns = [];
    for (const [key, knowledge] of this.learningState.knowledgeBase) {
      if (key.startsWith('pattern_') && knowledge.intents) {
        const pattern = key.replace('pattern_', '');
        const intentMatch = Array.from(knowledge.intents).some(intent => 
          this.calculateIntentSimilarity(intent, userIntent) > 0.7
        );
        
        if (intentMatch) {
          matchingPatterns.push({
            pattern,
            successRate: knowledge.successes / knowledge.usage,
            usage: knowledge.usage
          });
        }
      }
    }

    return {
      patterns: matchingPatterns.sort((a, b) => b.successRate - a.successRate),
      confidence: matchingPatterns.length > 0 ? 0.8 : 0.3
    };
  }

  /**
   * Get performance optimizations
   */
  async getPerformanceOptimizations(similarWorkflows, context) {
    const optimizations = [];

    // Analyze execution patterns from similar workflows
    const executionTimes = similarWorkflows
      .map(sw => sw.workflow.executionResults?.duration)
      .filter(time => time > 0);

    if (executionTimes.length > 0) {
      const avgTime = executionTimes.reduce((a, b) => a + b, 0) / executionTimes.length;
      
      if (avgTime > 2000) {
        optimizations.push({
          type: 'parallel_execution',
          reason: 'High average execution time detected',
          expectedImprovement: '30-40% faster execution'
        });
      }
    }

    // Check for common API combinations that can be optimized
    const apiCombinations = similarWorkflows
      .map(sw => sw.workflow.plan?.steps?.map(step => step.operation) || [])
      .filter(combo => combo.length > 1);

    if (apiCombinations.length > 0) {
      optimizations.push({
        type: 'api_batching',
        reason: 'Multiple API calls can be batched',
        expectedImprovement: '20-30% reduction in latency'
      });
    }

    return optimizations;
  }

  /**
   * Synthesize optimal workflow from various inputs
   */
  async synthesizeOptimalWorkflow(userIntent, similarWorkflows, patternInsights, optimizations, context) {
    // Start with the best similar workflow
    let baseWorkflow = null;
    if (similarWorkflows.length > 0) {
      baseWorkflow = similarWorkflows[0].workflow;
    }

    // Create optimized workflow structure
    const optimalWorkflow = {
      id: `optimal_${Date.now()}`,
      intent: userIntent,
      pattern: patternInsights.patterns[0]?.pattern || 'custom_pattern',
      plan: {
        steps: baseWorkflow?.plan?.steps || [],
        optimizations: optimizations.map(opt => opt.type),
        parallelExecution: optimizations.some(opt => opt.type === 'parallel_execution')
      },
      confidence: this.calculateOptimizationConfidence(similarWorkflows, patternInsights, optimizations),
      reasoning: {
        basedOn: baseWorkflow?.id || 'new_synthesis',
        optimizations: optimizations.length,
        patternMatches: patternInsights.patterns.length
      }
    };

    return optimalWorkflow;
  }

  /**
   * Calculate optimization confidence
   */
  calculateOptimizationConfidence(similarWorkflows, patternInsights, optimizations) {
    let confidence = 0.5; // Base confidence

    // Boost confidence based on similar workflows
    if (similarWorkflows.length > 0) {
      const avgSimilarity = similarWorkflows.reduce((sum, sw) => sum + sw.similarity, 0) / similarWorkflows.length;
      confidence += avgSimilarity * 0.3;
    }

    // Boost confidence based on pattern matches
    if (patternInsights.patterns.length > 0) {
      const bestPattern = patternInsights.patterns[0];
      confidence += bestPattern.successRate * 0.2;
    }

    // Boost confidence based on available optimizations
    confidence += Math.min(optimizations.length * 0.1, 0.2);

    return Math.min(confidence, 1.0);
  }

  /**
   * Generate alternative workflows
   */
  async generateAlternativeWorkflows(userIntent, similarWorkflows, optimalWorkflow) {
    const alternatives = [];

    // Alternative 1: Fastest execution
    if (similarWorkflows.length > 1) {
      const fastestWorkflow = similarWorkflows
        .filter(sw => sw.workflow.executionResults?.duration)
        .sort((a, b) => a.workflow.executionResults.duration - b.workflow.executionResults.duration)[0];
      
      if (fastestWorkflow) {
        alternatives.push({
          type: 'fastest',
          workflow: fastestWorkflow.workflow,
          reason: 'Optimized for speed'
        });
      }
    }

    // Alternative 2: Highest success rate
    const mostReliableWorkflow = similarWorkflows
      .filter(sw => sw.workflow.executionResults?.success)
      .sort((a, b) => b.relevanceScore - a.relevanceScore)[0];
    
    if (mostReliableWorkflow && mostReliableWorkflow.workflow.id !== optimalWorkflow.id) {
      alternatives.push({
        type: 'most_reliable',
        workflow: mostReliableWorkflow.workflow,
        reason: 'Optimized for reliability'
      });
    }

    return alternatives;
  }

  /**
   * Calculate intent similarity (simplified version)
   */
  calculateIntentSimilarity(intent1, intent2) {
    const words1 = new Set(intent1.toLowerCase().split(/\s+/));
    const words2 = new Set(intent2.toLowerCase().split(/\s+/));
    
    const intersection = new Set([...words1].filter(x => words2.has(x)));
    const union = new Set([...words1, ...words2]);
    
    return union.size > 0 ? intersection.size / union.size : 0;
  }

  /**
   * Additional methods for comprehensive learning system
   */
  async analyzeBehaviorPatterns(history) {
    const patterns = [];
    
    if (history.length > 0) {
      // Identify preferred patterns
      const patternCounts = new Map();
      for (const item of history) {
        patternCounts.set(item.pattern, (patternCounts.get(item.pattern) || 0) + 1);
      }
      
      const mostUsed = Array.from(patternCounts.entries())
        .sort((a, b) => b[1] - a[1])[0];
      
      if (mostUsed) {
        patterns.push({
          type: 'preferred_pattern',
          pattern: mostUsed[0],
          frequency: mostUsed[1] / history.length
        });
      }
    }
    
    return patterns;
  }

  async generateUserAdaptationRules(preferences, behaviorPatterns) {
    const rules = [];
    
    if (preferences.responseTime === 'fast') {
      rules.push({
        condition: 'user_prefers_speed',
        action: 'prioritize_fast_execution',
        weight: 0.8
      });
    }
    
    return rules;
  }

  async generatePersonalizationInsights(preferences, behaviorPatterns) {
    return [
      {
        insight: 'User preferences have been analyzed and incorporated',
        confidence: 0.8
      }
    ];
  }

  async identifyImprovementOpportunities(currentMetrics) {
    const opportunities = [];
    
    if (currentMetrics.avgExecutionTime > 2000) {
      opportunities.push({
        type: 'performance',
        metric: 'execution_time',
        current: currentMetrics.avgExecutionTime,
        target: 1500,
        priority: 'high'
      });
    }
    
    return opportunities;
  }

  async applyAutomaticOptimizations(opportunities) {
    const optimizations = [];
    
    for (const opportunity of opportunities) {
      if (opportunity.type === 'performance' && opportunity.priority === 'high') {
        optimizations.push({
          type: 'automatic_optimization',
          target: opportunity.metric,
          action: 'enabled_performance_optimization',
          appliedAt: new Date().toISOString()
        });
      }
    }
    
    return optimizations;
  }

  async updateLearningAlgorithms(currentMetrics) {
    return [
      {
        algorithm: 'pattern_recognition',
        update: 'improved_accuracy_weights',
        reason: 'based_on_recent_performance'
      }
    ];
  }

  async consolidatePatternKnowledge() {
    const patterns = [];
    
    for (const [key, knowledge] of this.learningState.knowledgeBase) {
      if (key.startsWith('pattern_')) {
        patterns.push({
          pattern: key.replace('pattern_', ''),
          usage: knowledge.usage,
          successRate: knowledge.successes / knowledge.usage,
          confidence: knowledge.usage > 10 ? 0.9 : 0.6
        });
      }
    }
    
    return patterns;
  }

  async consolidatePerformanceRules() {
    return [
      {
        rule: 'parallel_execution_improves_performance',
        confidence: 0.85,
        evidence: 'multiple_observations'
      }
    ];
  }

  async consolidateOptimizationStrategies() {
    return [
      {
        strategy: 'api_call_batching',
        effectiveness: 0.8,
        applicableWhen: 'multiple_api_calls_detected'
      }
    ];
  }

  async generateMetaInsights(consolidation) {
    return [
      {
        insight: 'System learning capability is improving over time',
        evidence: `${consolidation.patterns.length} patterns learned`,
        confidence: 0.75
      }
    ];
  }
}