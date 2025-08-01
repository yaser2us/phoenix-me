import { logger } from '../utils/logger.js';

/**
 * Usage Analytics - Phase 4.9 Checkpoint 5
 * Tracks workflow usage, analyzes patterns, and measures innovation impact
 */
export class UsageAnalytics {
  constructor() {
    this.usageData = new Map(); // workflowId -> usage records
    this.userBehavior = new Map(); // userId -> behavior patterns
    this.systemMetrics = {
      totalExecutions: 0,
      totalUsers: 0,
      totalWorkflows: 0,
      averageExecutionTime: 0,
      successRate: 0,
      satisfactionScore: 0
    };
    this.analyticsState = {
      lastAnalysis: null,
      analysisVersion: '1.0.0',
      dataRetentionDays: 90
    };
    
    this.initializeAnalytics();
    
    logger.info('Usage Analytics initialized');
  }

  /**
   * Track workflow usage and performance metrics
   */
  async trackUsage(usageEvent) {
    try {
      logger.debug('Tracking usage event', {
        workflowId: usageEvent.workflowId,
        userId: usageEvent.userId,
        success: usageEvent.success
      });

      const workflowId = usageEvent.workflowId;
      const userId = usageEvent.userId;
      const timestamp = usageEvent.timestamp || Date.now();

      // Store usage record
      if (!this.usageData.has(workflowId)) {
        this.usageData.set(workflowId, []);
      }
      
      const usageRecord = {
        ...usageEvent,
        timestamp,
        recordedAt: new Date().toISOString(),
        sessionId: this.generateSessionId(userId, timestamp)
      };
      
      this.usageData.get(workflowId).push(usageRecord);

      // Update user behavior tracking
      await this.updateUserBehavior(userId, usageEvent);

      // Update system metrics
      await this.updateSystemMetrics(usageEvent);

      // Clean old data periodically
      if (Math.random() < 0.01) { // 1% chance to trigger cleanup
        await this.cleanupOldData();
      }

      logger.info('Usage tracked successfully', {
        workflowId,
        userId,
        totalExecutions: this.systemMetrics.totalExecutions
      });

    } catch (error) {
      logger.error('Usage tracking failed', { error: error.message });
      throw error;
    }
  }

  /**
   * Analyze workflow popularity and usage patterns
   */
  async analyzePopularity(options = {}) {
    try {
      logger.debug('Analyzing workflow popularity', {
        timeframe: options.timeframe || '7d',
        groupBy: options.groupBy || 'workflow'
      });

      const timeframe = options.timeframe || '7d';
      const groupBy = options.groupBy || 'workflow';
      const cutoffTime = this.calculateCutoffTime(timeframe);

      const popularityData = {
        timeframe,
        groupBy,
        analyzedAt: new Date().toISOString(),
        rankings: [],
        insights: [],
        trends: {}
      };

      // Collect usage data within timeframe
      const recentUsage = this.collectRecentUsage(cutoffTime);

      // Group and rank by the specified criteria
      if (groupBy === 'workflow') {
        popularityData.rankings = this.rankByWorkflow(recentUsage);
      } else if (groupBy === 'user') {
        popularityData.rankings = this.rankByUser(recentUsage);
      } else if (groupBy === 'pattern') {
        popularityData.rankings = this.rankByPattern(recentUsage);
      }

      // Generate insights
      popularityData.insights = this.generatePopularityInsights(popularityData.rankings, recentUsage);

      // Analyze trends
      popularityData.trends = await this.analyzeTrends(recentUsage, timeframe);

      logger.info('Popularity analysis completed', {
        timeframe,
        rankingsCount: popularityData.rankings.length,
        insightsCount: popularityData.insights.length
      });

      return popularityData;

    } catch (error) {
      logger.error('Popularity analysis failed', { error: error.message });
      throw error;
    }
  }

  /**
   * Generate insights about user behavior patterns
   */
  async generateBehaviorInsights(userId) {
    try {
      logger.debug('Generating behavior insights', { userId });

      const userBehavior = this.userBehavior.get(userId) || {
        totalSessions: 0,
        workflows: new Map(),
        patterns: [],
        preferences: {}
      };

      const insights = {
        userId,
        analyzedAt: new Date().toISOString(),
        patterns: [],
        preferences: userBehavior.preferences,
        recommendations: [],
        engagement: this.calculateEngagementScore(userBehavior)
      };

      // Analyze usage patterns
      insights.patterns = this.analyzeUserPatterns(userBehavior);

      // Generate personalized recommendations
      insights.recommendations = await this.generatePersonalizedRecommendations(userBehavior);

      // Identify behavioral trends
      insights.trends = this.identifyBehavioralTrends(userBehavior);

      logger.info('Behavior insights generated', {
        userId,
        patterns: insights.patterns.length,
        recommendations: insights.recommendations.length
      });

      return insights;

    } catch (error) {
      logger.error('Behavior insights generation failed', { error: error.message });
      throw error;
    }
  }

  /**
   * Analyze success rates across workflows and patterns
   */
  async analyzeSuccessRates(options = {}) {
    try {
      logger.debug('Analyzing success rates', {
        groupBy: options.groupBy || 'workflow',
        minExecutions: options.minExecutions || 5
      });

      const groupBy = options.groupBy || 'workflow';
      const minExecutions = options.minExecutions || 5;

      const successAnalysis = {
        groupBy,
        minExecutions,
        analyzedAt: new Date().toISOString(),
        workflows: {},
        patterns: {},
        overall: {
          totalExecutions: 0,
          successfulExecutions: 0,
          successRate: 0
        }
      };

      let totalExecutions = 0;
      let successfulExecutions = 0;

      // Analyze by workflow
      for (const [workflowId, usageRecords] of this.usageData) {
        if (usageRecords.length >= minExecutions) {
          const workflowSuccesses = usageRecords.filter(r => r.success).length;
          const workflowTotal = usageRecords.length;
          const successRate = workflowTotal > 0 ? workflowSuccesses / workflowTotal : 0;

          successAnalysis.workflows[workflowId] = {
            executions: workflowTotal,
            successes: workflowSuccesses,
            successRate,
            averageExecutionTime: this.calculateAverageExecutionTime(usageRecords),
            averageSatisfaction: this.calculateAverageSatisfaction(usageRecords)
          };

          totalExecutions += workflowTotal;
          successfulExecutions += workflowSuccesses;
        }
      }

      // Analyze by pattern if requested
      if (groupBy === 'pattern' || groupBy === 'both') {
        successAnalysis.patterns = this.analyzeSuccessByPattern();
      }

      // Calculate overall metrics
      successAnalysis.overall.totalExecutions = totalExecutions;
      successAnalysis.overall.successfulExecutions = successfulExecutions;
      successAnalysis.overall.successRate = totalExecutions > 0 ? successfulExecutions / totalExecutions : 0;

      logger.info('Success rate analysis completed', {
        workflowsAnalyzed: Object.keys(successAnalysis.workflows).length,
        overallSuccessRate: (successAnalysis.overall.successRate * 100).toFixed(1) + '%'
      });

      return successAnalysis;

    } catch (error) {
      logger.error('Success rate analysis failed', { error: error.message });
      throw error;
    }
  }

  /**
   * Measure the impact of innovative workflows
   */
  async measureInnovationImpact(innovativeWorkflows, options = {}) {
    try {
      logger.debug('Measuring innovation impact', {
        innovationsCount: innovativeWorkflows.length,
        compareWith: options.compareWith || 'baseline'
      });

      const compareWith = options.compareWith || 'baseline';
      const timeframe = options.timeframe || '30d';
      const cutoffTime = this.calculateCutoffTime(timeframe);

      const impactMetrics = {
        timeframe,
        compareWith,
        analyzedAt: new Date().toISOString(),
        innovations: [],
        comparison: {},
        insights: []
      };

      // Analyze each innovative workflow
      for (const workflowId of innovativeWorkflows) {
        const usageRecords = this.usageData.get(workflowId) || [];
        const recentUsage = usageRecords.filter(r => r.timestamp >= cutoffTime);

        if (recentUsage.length > 0) {
          const innovation = {
            workflowId,
            metrics: {
              executions: recentUsage.length,
              successRate: recentUsage.filter(r => r.success).length / recentUsage.length,
              averageExecutionTime: this.calculateAverageExecutionTime(recentUsage),
              averageSatisfaction: this.calculateAverageSatisfaction(recentUsage),
              uniqueUsers: new Set(recentUsage.map(r => r.userId)).size
            },
            impact: {}
          };

          // Calculate impact scores
          innovation.impact = await this.calculateInnovationImpact(innovation.metrics, compareWith);

          impactMetrics.innovations.push(innovation);
        }
      }

      // Generate comparison with baseline
      if (compareWith === 'baseline') {
        impactMetrics.comparison = await this.compareWithBaseline(impactMetrics.innovations);
      }

      // Generate insights
      impactMetrics.insights = this.generateInnovationInsights(impactMetrics.innovations);

      logger.info('Innovation impact measured', {
        innovationsAnalyzed: impactMetrics.innovations.length,
        averageImpactScore: this.calculateAverageImpactScore(impactMetrics.innovations)
      });

      return impactMetrics;

    } catch (error) {
      logger.error('Innovation impact measurement failed', { error: error.message });
      throw error;
    }
  }

  /**
   * Generate comprehensive usage report
   */
  async generateUsageReport(options = {}) {
    try {
      logger.debug('Generating usage report', {
        period: options.period || '7d',
        includeCharts: options.includeCharts || false
      });

      const period = options.period || '7d';
      const includeCharts = options.includeCharts || false;
      const includeRecommendations = options.includeRecommendations || false;

      const report = {
        period,
        generatedAt: new Date().toISOString(),
        summary: {},
        details: {},
        recommendations: [],
        charts: []
      };

      // Generate summary
      report.summary = await this.generateReportSummary(period);

      // Generate detailed metrics
      report.details = await this.generateDetailedMetrics(period);

      // Generate recommendations if requested
      if (includeRecommendations) {
        report.recommendations = await this.generateUsageRecommendations(report.summary, report.details);
      }

      // Generate charts if requested
      if (includeCharts) {
        report.charts = await this.generateUsageCharts(period);
      }

      logger.info('Usage report generated', {
        period,
        totalExecutions: report.summary.totalExecutions,
        activeUsers: report.summary.activeUsers
      });

      return report;

    } catch (error) {
      logger.error('Usage report generation failed', { error: error.message });
      throw error;
    }
  }

  /**
   * Analyze the innovation ecosystem
   */
  async analyzeInnovationEcosystem() {
    try {
      logger.debug('Analyzing innovation ecosystem');

      const ecosystem = {
        analyzedAt: new Date().toISOString(),
        totalInnovations: 0,
        activeUsers: 0,
        innovationCategories: {},
        evolutionTrends: {},
        collaborationPatterns: {},
        impactDistribution: {}
      };

      // Count innovations by analyzing workflow patterns
      const innovativePatterns = this.identifyInnovativePatterns();
      ecosystem.totalInnovations = innovativePatterns.length;

      // Analyze user participation in innovation
      ecosystem.activeUsers = this.countActiveInnovators();

      // Categorize innovations
      ecosystem.innovationCategories = this.categorizeInnovations(innovativePatterns);

      // Analyze evolution trends
      ecosystem.evolutionTrends = this.analyzeEvolutionTrends();

      // Identify collaboration patterns
      ecosystem.collaborationPatterns = this.identifyCollaborationPatterns();

      // Analyze impact distribution
      ecosystem.impactDistribution = this.analyzeImpactDistribution();

      logger.info('Innovation ecosystem analyzed', {
        totalInnovations: ecosystem.totalInnovations,
        activeUsers: ecosystem.activeUsers,
        categories: Object.keys(ecosystem.innovationCategories).length
      });

      return ecosystem;

    } catch (error) {
      logger.error('Innovation ecosystem analysis failed', { error: error.message });
      throw error;
    }
  }

  /**
   * Generate innovation performance report
   */
  async generateInnovationReport(options = {}) {
    try {
      logger.debug('Generating innovation report', {
        timeframe: options.timeframe || '30d',
        includeComparisons: options.includeComparisons || false
      });

      const timeframe = options.timeframe || '30d';
      const includeComparisons = options.includeComparisons || false;
      const includeProjections = options.includeProjections || false;

      const report = {
        timeframe,
        generatedAt: new Date().toISOString(),
        summary: {},
        innovations: {},
        performance: {},
        comparisons: {},
        projections: {}
      };

      // Generate innovation summary
      report.summary = {
        totalInnovations: this.countInnovations(timeframe),
        newInnovations: this.countNewInnovations(timeframe),
        activeInnovations: this.countActiveInnovations(timeframe),
        averageInnovationScore: this.calculateAverageInnovationScore(timeframe)
      };

      // Analyze innovation performance
      report.performance = await this.analyzeInnovationPerformance(timeframe);

      // Generate comparisons if requested
      if (includeComparisons) {
        report.comparisons = await this.generateInnovationComparisons(timeframe);
      }

      // Generate projections if requested
      if (includeProjections) {
        report.projections = await this.generateInnovationProjections(report);
      }

      logger.info('Innovation report generated', {
        timeframe,
        totalInnovations: report.summary.totalInnovations,
        newInnovations: report.summary.newInnovations
      });

      return report;

    } catch (error) {
      logger.error('Innovation report generation failed', { error: error.message });
      throw error;
    }
  }

  /**
   * Initialize analytics system
   */
  initializeAnalytics() {
    // Set up periodic analytics tasks
    this.analyticsState.lastAnalysis = new Date().toISOString();
    
    // Initialize system metrics
    this.systemMetrics = {
      totalExecutions: 0,
      totalUsers: 0,
      totalWorkflows: 0,
      averageExecutionTime: 0,
      successRate: 0,
      satisfactionScore: 0
    };
  }

  /**
   * Helper methods for analytics processing
   */
  generateSessionId(userId, timestamp) {
    const datePrefix = new Date(timestamp).toISOString().substring(0, 10);
    return `${userId}_${datePrefix}_${Math.random().toString(36).substr(2, 8)}`;
  }

  calculateCutoffTime(timeframe) {
    const now = Date.now();
    const timeframeMap = {
      '1h': 60 * 60 * 1000,
      '1d': 24 * 60 * 60 * 1000,
      '7d': 7 * 24 * 60 * 60 * 1000,
      '30d': 30 * 24 * 60 * 60 * 1000,
      '90d': 90 * 24 * 60 * 60 * 1000
    };
    
    return now - (timeframeMap[timeframe] || timeframeMap['7d']);
  }

  collectRecentUsage(cutoffTime) {
    const recentUsage = [];
    
    for (const [workflowId, usageRecords] of this.usageData) {
      const recentRecords = usageRecords.filter(r => r.timestamp >= cutoffTime);
      for (const record of recentRecords) {
        recentUsage.push({ ...record, workflowId });
      }
    }
    
    return recentUsage;
  }

  rankByWorkflow(usageData) {
    const workflowStats = new Map();
    
    for (const usage of usageData) {
      const workflowId = usage.workflowId;
      if (!workflowStats.has(workflowId)) {
        workflowStats.set(workflowId, {
          id: workflowId,
          executions: 0,
          uniqueUsers: new Set(),
          totalExecutionTime: 0,
          successCount: 0,
          totalSatisfaction: 0,
          satisfactionCount: 0
        });
      }
      
      const stats = workflowStats.get(workflowId);
      stats.executions++;
      stats.uniqueUsers.add(usage.userId);
      stats.totalExecutionTime += usage.executionTime || 0;
      if (usage.success) stats.successCount++;
      if (usage.satisfaction) {
        stats.totalSatisfaction += usage.satisfaction;
        stats.satisfactionCount++;
      }
    }
    
    return Array.from(workflowStats.values())
      .map(stats => ({
        id: stats.id,
        executions: stats.executions,
        uniqueUsers: stats.uniqueUsers.size,
        averageExecutionTime: stats.totalExecutionTime / stats.executions,
        successRate: stats.successCount / stats.executions,
        averageSatisfaction: stats.satisfactionCount > 0 ? stats.totalSatisfaction / stats.satisfactionCount : null,
        popularityScore: this.calculatePopularityScore(stats)
      }))
      .sort((a, b) => b.popularityScore - a.popularityScore);
  }

  rankByUser(usageData) {
    const userStats = new Map();
    
    for (const usage of usageData) {
      const userId = usage.userId;
      if (!userStats.has(userId)) {
        userStats.set(userId, {
          id: userId,
          executions: 0,
          uniqueWorkflows: new Set(),
          totalExecutionTime: 0,
          successCount: 0
        });
      }
      
      const stats = userStats.get(userId);
      stats.executions++;
      stats.uniqueWorkflows.add(usage.workflowId);
      stats.totalExecutionTime += usage.executionTime || 0;
      if (usage.success) stats.successCount++;
    }
    
    return Array.from(userStats.values())
      .map(stats => ({
        id: stats.id,
        executions: stats.executions,
        uniqueWorkflows: stats.uniqueWorkflows.size,
        averageExecutionTime: stats.totalExecutionTime / stats.executions,
        successRate: stats.successCount / stats.executions,
        engagementScore: this.calculateUserEngagementScore(stats)
      }))
      .sort((a, b) => b.engagementScore - a.engagementScore);
  }

  rankByPattern(usageData) {
    const patternStats = new Map();
    
    for (const usage of usageData) {
      const pattern = usage.pattern || this.inferPatternFromIntent(usage.intent);
      if (!patternStats.has(pattern)) {
        patternStats.set(pattern, {
          pattern,
          executions: 0,
          uniqueUsers: new Set(),
          uniqueWorkflows: new Set(),
          successCount: 0
        });
      }
      
      const stats = patternStats.get(pattern);
      stats.executions++;
      stats.uniqueUsers.add(usage.userId);
      stats.uniqueWorkflows.add(usage.workflowId);
      if (usage.success) stats.successCount++;
    }
    
    return Array.from(patternStats.values())
      .map(stats => ({
        pattern: stats.pattern,
        executions: stats.executions,
        uniqueUsers: stats.uniqueUsers.size,
        uniqueWorkflows: stats.uniqueWorkflows.size,
        successRate: stats.successCount / stats.executions,
        diversityScore: stats.uniqueWorkflows.size / stats.executions
      }))
      .sort((a, b) => b.executions - a.executions);
  }

  generatePopularityInsights(rankings, usageData) {
    const insights = [];
    
    // Top performer insight
    if (rankings.length > 0) {
      const topWorkflow = rankings[0];
      insights.push({
        type: 'top_performer',
        title: 'Most Popular Workflow',
        description: `Workflow ${topWorkflow.id} leads with ${topWorkflow.executions} executions`,
        impact: 'high',
        data: topWorkflow
      });
    }
    
    // Usage trend insight
    const trend = this.calculateUsageTrend(usageData);
    insights.push({
      type: 'usage_trend',
      title: `Usage ${trend.direction}`,
      description: `Workflow usage is ${trend.direction} by ${trend.percentage}%`,
      impact: trend.direction === 'increasing' ? 'positive' : 'negative',
      data: trend
    });
    
    // Diversity insight
    const uniqueWorkflows = new Set(usageData.map(u => u.workflowId)).size;
    insights.push({
      type: 'diversity',
      title: 'Workflow Diversity',
      description: `${uniqueWorkflows} different workflows used in this period`,
      impact: 'informational',
      data: { uniqueWorkflows, totalUsage: usageData.length }
    });
    
    return insights;
  }

  async analyzeTrends(usageData, timeframe) {
    const trends = {
      overall: 'stable',
      byDay: {},
      byHour: {},
      patterns: []
    };
    
    // Group usage by day
    const dailyUsage = new Map();
    for (const usage of usageData) {
      const day = new Date(usage.timestamp).toISOString().substring(0, 10);
      dailyUsage.set(day, (dailyUsage.get(day) || 0) + 1);
    }
    
    trends.byDay = Object.fromEntries(dailyUsage);
    
    // Calculate overall trend
    const days = Array.from(dailyUsage.keys()).sort();
    if (days.length >= 2) {
      const firstHalf = days.slice(0, Math.floor(days.length / 2));
      const secondHalf = days.slice(Math.floor(days.length / 2));
      
      const firstHalfAvg = firstHalf.reduce((sum, day) => sum + dailyUsage.get(day), 0) / firstHalf.length;
      const secondHalfAvg = secondHalf.reduce((sum, day) => sum + dailyUsage.get(day), 0) / secondHalf.length;
      
      if (secondHalfAvg > firstHalfAvg * 1.1) trends.overall = 'increasing';
      else if (secondHalfAvg < firstHalfAvg * 0.9) trends.overall = 'decreasing';
    }
    
    return trends;
  }

  async updateUserBehavior(userId, usageEvent) {
    if (!this.userBehavior.has(userId)) {
      this.userBehavior.set(userId, {
        totalSessions: 0,
        workflows: new Map(),
        patterns: [],
        preferences: {},
        lastActivity: null
      });
    }
    
    const behavior = this.userBehavior.get(userId);
    behavior.totalSessions++;
    behavior.lastActivity = usageEvent.timestamp;
    
    // Track workflow usage
    const workflowId = usageEvent.workflowId;
    if (!behavior.workflows.has(workflowId)) {
      behavior.workflows.set(workflowId, { count: 0, lastUsed: null });
    }
    behavior.workflows.get(workflowId).count++;
    behavior.workflows.get(workflowId).lastUsed = usageEvent.timestamp;
    
    // Update preferences based on usage patterns
    this.updateUserPreferences(behavior, usageEvent);
  }

  updateUserPreferences(behavior, usageEvent) {
    // Simple preference learning based on satisfaction
    if (usageEvent.satisfaction >= 4) {
      if (usageEvent.executionTime < 2000) {
        behavior.preferences.speed = (behavior.preferences.speed || 0) + 0.1;
      }
      if (usageEvent.success) {
        behavior.preferences.reliability = (behavior.preferences.reliability || 0) + 0.1;
      }
    }
  }

  async updateSystemMetrics(usageEvent) {
    this.systemMetrics.totalExecutions++;
    
    // Update average execution time
    if (usageEvent.executionTime) {
      const totalTime = this.systemMetrics.averageExecutionTime * (this.systemMetrics.totalExecutions - 1);
      this.systemMetrics.averageExecutionTime = (totalTime + usageEvent.executionTime) / this.systemMetrics.totalExecutions;
    }
    
    // Update success rate
    const totalSuccesses = this.systemMetrics.successRate * (this.systemMetrics.totalExecutions - 1);
    const newSuccesses = totalSuccesses + (usageEvent.success ? 1 : 0);
    this.systemMetrics.successRate = newSuccesses / this.systemMetrics.totalExecutions;
    
    // Update satisfaction score
    if (usageEvent.satisfaction) {
      const totalSatisfaction = this.systemMetrics.satisfactionScore * (this.systemMetrics.totalExecutions - 1);
      this.systemMetrics.satisfactionScore = (totalSatisfaction + usageEvent.satisfaction) / this.systemMetrics.totalExecutions;
    }
  }

  async cleanupOldData() {
    const cutoffTime = Date.now() - (this.analyticsState.dataRetentionDays * 24 * 60 * 60 * 1000);
    let cleanedRecords = 0;
    
    for (const [workflowId, records] of this.usageData) {
      const filteredRecords = records.filter(r => r.timestamp >= cutoffTime);
      if (filteredRecords.length !== records.length) {
        this.usageData.set(workflowId, filteredRecords);
        cleanedRecords += records.length - filteredRecords.length;
      }
      
      // Remove empty entries
      if (filteredRecords.length === 0) {
        this.usageData.delete(workflowId);
      }
    }
    
    if (cleanedRecords > 0) {
      logger.info('Cleaned up old usage data', { cleanedRecords });
    }
  }

  // Additional helper methods for analytics calculations
  calculateAverageExecutionTime(usageRecords) {
    const times = usageRecords.map(r => r.executionTime).filter(t => t > 0);
    return times.length > 0 ? times.reduce((a, b) => a + b, 0) / times.length : 0;
  }

  calculateAverageSatisfaction(usageRecords) {
    const satisfactions = usageRecords.map(r => r.satisfaction).filter(s => s > 0);
    return satisfactions.length > 0 ? satisfactions.reduce((a, b) => a + b, 0) / satisfactions.length : 0;
  }

  calculatePopularityScore(stats) {
    // Combine execution count, unique users, and success rate
    return (
      stats.executions * 0.4 +
      stats.uniqueUsers.size * 0.3 +
      (stats.successCount / stats.executions) * 0.3
    );
  }

  calculateUserEngagementScore(stats) {
    // Combine activity diversity and consistency
    return (
      stats.executions * 0.3 +
      stats.uniqueWorkflows.size * 0.4 +
      (stats.successCount / stats.executions) * 0.3
    );
  }

  calculateEngagementScore(userBehavior) {
    const sessionScore = Math.min(userBehavior.totalSessions / 10, 1); // Max 1 at 10+ sessions  
    const diversityScore = Math.min(userBehavior.workflows.size / 5, 1); // Max 1 at 5+ workflows
    const recencyScore = this.calculateRecencyScore(userBehavior.lastActivity);
    
    return (sessionScore + diversityScore + recencyScore) / 3;
  }

  calculateRecencyScore(lastActivity) {
    if (!lastActivity) return 0;
    
    const daysSinceActivity = (Date.now() - lastActivity) / (24 * 60 * 60 * 1000);
    return Math.max(0, 1 - daysSinceActivity / 30); // Decay over 30 days
  }

  analyzeUserPatterns(userBehavior) {
    const patterns = [];
    
    // Identify most used workflow
    let maxUsage = 0;
    let favoriteWorkflow = null;
    for (const [workflowId, data] of userBehavior.workflows) {
      if (data.count > maxUsage) {
        maxUsage = data.count;
        favoriteWorkflow = workflowId;
      }
    }
    
    if (favoriteWorkflow) {
      patterns.push({
        type: 'favorite_workflow',
        workflow: favoriteWorkflow,
        usage: maxUsage,
        confidence: 0.9
      });
    }
    
    // Identify usage frequency
    if (userBehavior.totalSessions > 20) {
      patterns.push({
        type: 'heavy_user',
        description: 'User shows high engagement with the system',
        confidence: 0.8
      });
    } else if (userBehavior.totalSessions > 5) {
      patterns.push({
        type: 'regular_user',
        description: 'User has consistent but moderate usage',
        confidence: 0.7
      });
    }
    
    return patterns;
  }

  async generatePersonalizedRecommendations(userBehavior) {
    const recommendations = [];
    
    // Recommend similar workflows
    if (userBehavior.workflows.size > 0) {
      recommendations.push({
        type: 'similar_workflows',
        title: 'Explore Similar Workflows',
        description: 'Based on your usage patterns, you might like these workflows',
        priority: 'medium'
      });
    }
    
    // Recommend optimization if user prefers speed
    if (userBehavior.preferences.speed > 0.5) {
      recommendations.push({
        type: 'speed_optimization',
        title: 'Enable Fast Mode',
        description: 'Optimize workflows for faster execution based on your preferences',
        priority: 'high'
      });
    }
    
    return recommendations;
  }

  identifyBehavioralTrends(userBehavior) {
    const trends = {
      activity: 'stable',
      diversity: 'stable',
      preferences: 'learning'
    };
    
    // Simple trend analysis based on available data
    if (userBehavior.workflows.size > 3) {
      trends.diversity = 'expanding';
    }
    
    return trends;
  }

  analyzeSuccessByPattern() {
    const patternStats = new Map();
    
    for (const [workflowId, usageRecords] of this.usageData) {
      for (const record of usageRecords) {
        const pattern = record.pattern || this.inferPatternFromIntent(record.intent);
        if (!patternStats.has(pattern)) {
          patternStats.set(pattern, { total: 0, successes: 0 });
        }
        patternStats.get(pattern).total++;
        if (record.success) patternStats.get(pattern).successes++;
      }
    }
    
    const result = {};
    for (const [pattern, stats] of patternStats) {
      result[pattern] = {
        executions: stats.total,
        successes: stats.successes,
        successRate: stats.total > 0 ? stats.successes / stats.total : 0
      };
    }
    
    return result;
  }

  inferPatternFromIntent(intent) {
    if (!intent) return 'unknown';
    
    const text = intent.toLowerCase();
    if (text.includes('balance') && text.includes('weather')) return 'financial_weather';
    if (text.includes('balance')) return 'financial';
    if (text.includes('weather')) return 'weather';
    if (text.includes('currency')) return 'currency';
    
    return 'general';
  }

  calculateUsageTrend(usageData) {
    if (usageData.length < 2) {
      return { direction: 'stable', percentage: 0 };
    }
    
    // Simple trend calculation based on first half vs second half
    const sortedData = usageData.sort((a, b) => a.timestamp - b.timestamp);
    const midpoint = Math.floor(sortedData.length / 2);
    const firstHalf = sortedData.slice(0, midpoint).length;
    const secondHalf = sortedData.slice(midpoint).length;
    
    if (secondHalf > firstHalf * 1.1) {
      return { direction: 'increasing', percentage: Math.round(((secondHalf - firstHalf) / firstHalf) * 100) };
    } else if (secondHalf < firstHalf * 0.9) {
      return { direction: 'decreasing', percentage: Math.round(((firstHalf - secondHalf) / firstHalf) * 100) };
    }
    
    return { direction: 'stable', percentage: 0 };
  }

  async calculateInnovationImpact(metrics, compareWith) {
    // Simple impact calculation - in real implementation would be more sophisticated
    const impact = {
      adoptionRate: metrics.executions > 10 ? 'high' : metrics.executions > 5 ? 'medium' : 'low',
      satisfactionImpact: metrics.averageSatisfaction > 4 ? 'positive' : 'neutral',
      performanceImpact: metrics.averageExecutionTime < 2000 ? 'positive' : 'neutral',
      overallScore: (metrics.successRate * 0.4 + (metrics.averageSatisfaction / 5) * 0.3 + 
                    (metrics.executions / 20) * 0.3)
    };
    
    return impact;
  }

  async compareWithBaseline(innovations) {
    const baseline = {
      averageSuccessRate: this.systemMetrics.successRate,
      averageExecutionTime: this.systemMetrics.averageExecutionTime,
      averageSatisfaction: this.systemMetrics.satisfactionScore
    };
    
    const comparison = {
      baseline,
      innovations: {
        averageSuccessRate: innovations.reduce((sum, i) => sum + i.metrics.successRate, 0) / innovations.length,
        averageExecutionTime: innovations.reduce((sum, i) => sum + i.metrics.averageExecutionTime, 0) / innovations.length,
        averageSatisfaction: innovations.reduce((sum, i) => sum + i.metrics.averageSatisfaction, 0) / innovations.length
      }
    };
    
    comparison.improvements = {
      successRate: comparison.innovations.averageSuccessRate - baseline.averageSuccessRate,
      executionTime: baseline.averageExecutionTime - comparison.innovations.averageExecutionTime,
      satisfaction: comparison.innovations.averageSatisfaction - baseline.averageSatisfaction
    };
    
    return comparison;
  }

  generateInnovationInsights(innovations) {
    const insights = [];
    
    if (innovations.length > 0) {
      const topInnovation = innovations.sort((a, b) => b.impact.overallScore - a.impact.overallScore)[0];
      insights.push({
        type: 'top_innovation',
        title: 'Most Impactful Innovation',
        description: `Workflow ${topInnovation.workflowId} shows the highest innovation impact`,
        data: topInnovation
      });
    }
    
    const highAdoption = innovations.filter(i => i.impact.adoptionRate === 'high');
    if (highAdoption.length > 0) {
      insights.push({
        type: 'high_adoption',
        title: 'High Adoption Innovations',
        description: `${highAdoption.length} innovations show high user adoption`,
        data: { count: highAdoption.length, innovations: highAdoption }
      });
    }
    
    return insights;
  }

  calculateAverageImpactScore(innovations) {
    if (innovations.length === 0) return 0;
    return innovations.reduce((sum, i) => sum + i.impact.overallScore, 0) / innovations.length;
  }

  // Report generation helper methods
  async generateReportSummary(period) {
    const cutoffTime = this.calculateCutoffTime(period);
    const recentUsage = this.collectRecentUsage(cutoffTime);
    
    return {
      totalExecutions: recentUsage.length,
      activeUsers: new Set(recentUsage.map(u => u.userId)).size,
      activeWorkflows: new Set(recentUsage.map(u => u.workflowId)).size,
      successRate: recentUsage.filter(u => u.success).length / recentUsage.length,
      averageExecutionTime: this.calculateAverageExecutionTime(recentUsage),
      averageSatisfaction: this.calculateAverageSatisfaction(recentUsage)
    };
  }

  async generateDetailedMetrics(period) {
    const cutoffTime = this.calculateCutoffTime(period);
    const recentUsage = this.collectRecentUsage(cutoffTime);
    
    return {
      dailyBreakdown: this.generateDailyBreakdown(recentUsage),
      workflowBreakdown: this.generateWorkflowBreakdown(recentUsage),
      userSegmentation: this.generateUserSegmentation(recentUsage),
      performanceMetrics: this.generatePerformanceMetrics(recentUsage)
    };
  }

  async generateUsageRecommendations(summary, details) {
    const recommendations = [];
    
    if (summary.successRate < 0.8) {
      recommendations.push({
        type: 'improve_reliability',
        priority: 'high',
        description: 'Focus on improving workflow reliability',
        target: 'success_rate',
        currentValue: summary.successRate,
        targetValue: 0.9
      });
    }
    
    if (summary.averageExecutionTime > 3000) {
      recommendations.push({
        type: 'optimize_performance',
        priority: 'medium',
        description: 'Optimize workflow execution times',
        target: 'execution_time',
        currentValue: summary.averageExecutionTime,
        targetValue: 2000
      });
    }
    
    return recommendations;
  }

  async generateUsageCharts(period) {
    // Return chart configuration data - actual chart rendering would be done by frontend
    return [
      {
        type: 'line',
        title: 'Daily Usage Trend',
        data: this.generateDailyUsageData(period)
      },
      {
        type: 'pie',
        title: 'Workflow Distribution',
        data: this.generateWorkflowDistributionData(period)
      },
      {
        type: 'bar',
        title: 'Success Rate by Workflow',
        data: this.generateSuccessRateData(period)
      }
    ];
  }

  // Additional helper methods for ecosystem analysis
  identifyInnovativePatterns() {
    const patterns = [];
    
    for (const [workflowId, usageRecords] of this.usageData) {
      const uniqueUsers = new Set(usageRecords.map(r => r.userId)).size;
      const avgSatisfaction = this.calculateAverageSatisfaction(usageRecords);
      const successRate = usageRecords.filter(r => r.success).length / usageRecords.length;
      
      // Consider as innovative if high satisfaction + good adoption
      if (avgSatisfaction > 4.2 && uniqueUsers > 3 && successRate > 0.8) {
        patterns.push({
          workflowId,
          innovationScore: (avgSatisfaction / 5) * 0.4 + (uniqueUsers / 10) * 0.3 + successRate * 0.3,
          metrics: { uniqueUsers, avgSatisfaction, successRate }
        });
      }
    }
    
    return patterns.sort((a, b) => b.innovationScore - a.innovationScore);
  }

  countActiveInnovators() {
    const innovators = new Set();
    const cutoffTime = this.calculateCutoffTime('30d');
    
    for (const [userId, behavior] of this.userBehavior) {
      if (behavior.lastActivity >= cutoffTime && behavior.workflows.size > 2) {
        innovators.add(userId);
      }
    }
    
    return innovators.size;
  }

  categorizeInnovations(innovativePatterns) {
    const categories = {
      'high_impact': innovativePatterns.filter(p => p.innovationScore > 0.8).length,
      'medium_impact': innovativePatterns.filter(p => p.innovationScore > 0.6 && p.innovationScore <= 0.8).length,
      'emerging': innovativePatterns.filter(p => p.innovationScore <= 0.6).length
    };
    
    return categories;
  }

  analyzeEvolutionTrends() {
    return {
      trend: 'growing',
      growthRate: 15, // Placeholder - would calculate from historical data
      emergingPatterns: ['cross_domain_fusion', 'ai_enhanced_workflows']
    };
  }

  identifyCollaborationPatterns() {
    return {
      sharedWorkflows: 0, // Placeholder for future collaboration features
      knowledgeSharing: 0,
      communityContributions: 0
    };
  }

  analyzeImpactDistribution() {
    const innovativePatterns = this.identifyInnovativePatterns();
    return {
      highImpact: innovativePatterns.filter(p => p.innovationScore > 0.8).length,
      mediumImpact: innovativePatterns.filter(p => p.innovationScore > 0.6 && p.innovationScore <= 0.8).length,
      lowImpact: innovativePatterns.filter(p => p.innovationScore <= 0.6).length
    };
  }

  // Innovation report helper methods
  countInnovations(timeframe) {
    return this.identifyInnovativePatterns().length;
  }

  countNewInnovations(timeframe) {
    const cutoffTime = this.calculateCutoffTime(timeframe);
    let newInnovations = 0;
    
    for (const [workflowId, usageRecords] of this.usageData) {
      const firstUsage = Math.min(...usageRecords.map(r => r.timestamp));
      if (firstUsage >= cutoffTime) {
        newInnovations++;
      }
    }
    
    return newInnovations;
  }

  countActiveInnovations(timeframe) {
    const cutoffTime = this.calculateCutoffTime(timeframe);
    const innovativePatterns = this.identifyInnovativePatterns();
    
    return innovativePatterns.filter(pattern => {
      const workflowUsage = this.usageData.get(pattern.workflowId) || [];
      return workflowUsage.some(r => r.timestamp >= cutoffTime);
    }).length;
  }

  calculateAverageInnovationScore(timeframe) {
    const innovations = this.identifyInnovativePatterns();
    if (innovations.length === 0) return 0;
    
    return innovations.reduce((sum, i) => sum + i.innovationScore, 0) / innovations.length;
  }

  async analyzeInnovationPerformance(timeframe) {
    const cutoffTime = this.calculateCutoffTime(timeframe);
    const innovations = this.identifyInnovativePatterns();
    
    const performance = {
      totalInnovations: innovations.length,
      performanceMetrics: {},
      topPerformers: innovations.slice(0, 5),
      trends: this.analyzeInnovationTrends(innovations, cutoffTime)
    };
    
    return performance;
  }

  async generateInnovationComparisons(timeframe) {
    return {
      vsBaseline: await this.compareWithBaseline(this.identifyInnovativePatterns()),
      vsPreviousPeriod: this.compareWithPreviousPeriod(timeframe),
      industryBenchmark: this.generateIndustryComparison()
    };
  }

  async generateInnovationProjections(report) {
    return {
      nextPeriodProjection: {
        expectedInnovations: Math.round(report.summary.newInnovations * 1.2),
        confidenceLevel: 0.7
      },
      trendProjection: 'positive',
      recommendedActions: [
        'Continue supporting high-impact innovations',
        'Invest in emerging patterns',
        'Expand user engagement programs'
      ]
    };
  }

  // Additional utility methods for chart data generation
  generateDailyUsageData(period) {
    const cutoffTime = this.calculateCutoffTime(period);
    const usage = this.collectRecentUsage(cutoffTime);
    const dailyData = new Map();
    
    for (const record of usage) {
      const day = new Date(record.timestamp).toISOString().substring(0, 10);
      dailyData.set(day, (dailyData.get(day) || 0) + 1);
    }
    
    return Array.from(dailyData.entries()).map(([date, count]) => ({ date, count }));
  }

  generateWorkflowDistributionData(period) {
    const cutoffTime = this.calculateCutoffTime(period);
    const usage = this.collectRecentUsage(cutoffTime);
    const distribution = new Map();
    
    for (const record of usage) {
      distribution.set(record.workflowId, (distribution.get(record.workflowId) || 0) + 1);
    }
    
    return Array.from(distribution.entries()).map(([workflow, count]) => ({ workflow, count }));
  }

  generateSuccessRateData(period) {
    const cutoffTime = this.calculateCutoffTime(period);
    const usage = this.collectRecentUsage(cutoffTime);
    const workflowStats = new Map();
    
    for (const record of usage) {
      if (!workflowStats.has(record.workflowId)) {
        workflowStats.set(record.workflowId, { total: 0, successes: 0 });
      }
      workflowStats.get(record.workflowId).total++;
      if (record.success) workflowStats.get(record.workflowId).successes++;
    }
    
    return Array.from(workflowStats.entries()).map(([workflow, stats]) => ({
      workflow,
      successRate: stats.successes / stats.total
    }));
  }

  generateDailyBreakdown(recentUsage) {
    const breakdown = new Map();
    
    for (const usage of recentUsage) {
      const day = new Date(usage.timestamp).toISOString().substring(0, 10);
      if (!breakdown.has(day)) {
        breakdown.set(day, { executions: 0, successes: 0, users: new Set() });
      }
      breakdown.get(day).executions++;
      if (usage.success) breakdown.get(day).successes++;
      breakdown.get(day).users.add(usage.userId);
    }
    
    return Object.fromEntries(
      Array.from(breakdown.entries()).map(([day, stats]) => [
        day,
        {
          executions: stats.executions,
          successes: stats.successes,
          uniqueUsers: stats.users.size,
          successRate: stats.successes / stats.executions
        }
      ])
    );
  }

  generateWorkflowBreakdown(recentUsage) {
    return this.rankByWorkflow(recentUsage);
  }

  generateUserSegmentation(recentUsage) {
    const userStats = this.rankByUser(recentUsage);
    
    return {
      heavyUsers: userStats.filter(u => u.executions > 10).length,
      regularUsers: userStats.filter(u => u.executions > 3 && u.executions <= 10).length,
      lightUsers: userStats.filter(u => u.executions <= 3).length,
      totalUsers: userStats.length
    };
  }

  generatePerformanceMetrics(recentUsage) {
    return {
      averageExecutionTime: this.calculateAverageExecutionTime(recentUsage),
      medianExecutionTime: this.calculateMedianExecutionTime(recentUsage),
      p95ExecutionTime: this.calculatePercentileExecutionTime(recentUsage, 95),
      successRate: recentUsage.filter(u => u.success).length / recentUsage.length,
      errorRate: recentUsage.filter(u => !u.success).length / recentUsage.length
    };
  }

  calculateMedianExecutionTime(usageRecords) {
    const times = usageRecords.map(r => r.executionTime).filter(t => t > 0).sort((a, b) => a - b);
    if (times.length === 0) return 0;
    
    const mid = Math.floor(times.length / 2);
    return times.length % 2 === 0 ? (times[mid - 1] + times[mid]) / 2 : times[mid];
  }

  calculatePercentileExecutionTime(usageRecords, percentile) {
    const times = usageRecords.map(r => r.executionTime).filter(t => t > 0).sort((a, b) => a - b);
    if (times.length === 0) return 0;
    
    const index = Math.ceil((percentile / 100) * times.length) - 1;
    return times[Math.max(0, Math.min(index, times.length - 1))];
  }

  analyzeInnovationTrends(innovations, cutoffTime) {
    return {
      overall: 'positive',
      growthRate: 15,
      emergingCategories: ['ai_enhanced', 'cross_domain']
    };
  }

  compareWithPreviousPeriod(timeframe) {
    // Placeholder for comparison with previous period
    return {
      innovationGrowth: 20,
      adoptionImprovement: 15,
      satisfactionChange: 0.2
    };
  }

  generateIndustryComparison() {
    // Placeholder for industry benchmark comparison
    return {
      innovationRate: 'above_average',
      adoptionSpeed: 'high',
      userSatisfaction: 'excellent'
    };
  }
}