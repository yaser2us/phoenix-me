import { logger } from '../utils/logger.js';

/**
 * Success Metrics Tracker - Phase 4.9 Checkpoint 4
 * Tracks and analyzes success metrics to identify improvement opportunities
 */
export class SuccessMetricsTracker {
  constructor() {
    this.executionMetrics = [];
    this.satisfactionData = [];
    this.performanceBenchmarks = new Map();
    this.trendAnalysis = {
      successRate: [],
      executionTime: [],
      userSatisfaction: []
    };
    
    logger.info('Success Metrics Tracker initialized');
  }

  /**
   * Track workflow execution metrics
   */
  async trackExecution(metrics) {
    try {
      logger.debug('Tracking execution metrics', {
        workflowId: metrics.workflowId,
        success: metrics.success,
        duration: metrics.endTime - metrics.startTime
      });

      const executionRecord = {
        ...metrics,
        duration: metrics.endTime - metrics.startTime,
        timestamp: Date.now(),
        id: `exec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      };

      this.executionMetrics.push(executionRecord);

      // Update trend analysis
      this.updateTrendAnalysis(executionRecord);

      // Update performance benchmarks
      await this.updateBenchmarks(executionRecord);

      logger.info('Execution metrics tracked', {
        id: executionRecord.id,
        success: executionRecord.success,
        totalRecords: this.executionMetrics.length
      });

    } catch (error) {
      logger.error('Execution tracking failed', { error: error.message });
      throw error;
    }
  }

  /**
   * Calculate success rates with various groupings
   */
  async calculateSuccessRates(options = {}) {
    try {
      logger.debug('Calculating success rates', options);

      const timeframe = options.timeframe || '30d';
      const groupBy = options.groupBy || null;

      // Filter by timeframe
      const cutoffTime = this.getTimeframeCutoff(timeframe);
      const filteredMetrics = this.executionMetrics.filter(m => m.timestamp >= cutoffTime);

      if (filteredMetrics.length === 0) {
        return {
          overall: 0,
          total: 0,
          successful: 0,
          failed: 0,
          groups: {}
        };
      }

      // Calculate overall success rate
      const successful = filteredMetrics.filter(m => m.success).length;
      const total = filteredMetrics.length;
      const overall = successful / total;

      const result = {
        overall,
        total,
        successful,
        failed: total - successful,
        timeframe,
        groups: {}
      };

      // Group by specified criteria
      if (groupBy) {
        result.groups = await this.calculateGroupedSuccessRates(filteredMetrics, groupBy);
      }

      logger.info('Success rates calculated', {
        overall: (overall * 100).toFixed(1) + '%',
        total,
        timeframe
      });

      return result;

    } catch (error) {
      logger.error('Success rate calculation failed', { error: error.message });
      throw error;
    }
  }

  /**
   * Get performance benchmarks
   */
  async getBenchmarks() {
    try {
      logger.debug('Generating performance benchmarks');

      if (this.executionMetrics.length === 0) {
        return {
          avgExecutionTime: 0,
          medianExecutionTime: 0,
          successRate: 0,
          avgApiCalls: 0,
          avgDataPoints: 0,
          percentiles: {},
          trends: {}
        };
      }

      const durations = this.executionMetrics.map(m => m.duration).filter(d => d > 0);
      const apiCalls = this.executionMetrics.map(m => m.apiCalls || 0).filter(c => c > 0);
      const dataPoints = this.executionMetrics.map(m => m.dataPoints || 0).filter(d => d > 0);
      const successCount = this.executionMetrics.filter(m => m.success).length;

      const benchmarks = {
        avgExecutionTime: this.calculateAverage(durations),
        medianExecutionTime: this.calculateMedian(durations),
        successRate: successCount / this.executionMetrics.length,
        avgApiCalls: this.calculateAverage(apiCalls),
        avgDataPoints: this.calculateAverage(dataPoints),
        percentiles: {
          p50: this.calculatePercentile(durations, 50),
          p90: this.calculatePercentile(durations, 90),
          p95: this.calculatePercentile(durations, 95),
          p99: this.calculatePercentile(durations, 99)
        },
        trends: await this.calculatePerformanceTrends(),
        totalExecutions: this.executionMetrics.length,
        generatedAt: new Date().toISOString()
      };

      // Store current benchmarks
      this.performanceBenchmarks.set('current', benchmarks);

      logger.info('Performance benchmarks generated', {
        avgExecutionTime: Math.round(benchmarks.avgExecutionTime),
        successRate: (benchmarks.successRate * 100).toFixed(1) + '%',
        totalExecutions: benchmarks.totalExecutions
      });

      return benchmarks;

    } catch (error) {
      logger.error('Benchmark generation failed', { error: error.message });
      throw error;
    }
  }

  /**
   * Track user satisfaction
   */
  async trackUserSatisfaction(satisfactionData) {
    try {
      logger.debug('Tracking user satisfaction', {
        workflowId: satisfactionData.workflowId,
        rating: satisfactionData.rating
      });

      const satisfactionRecord = {
        ...satisfactionData,
        timestamp: Date.now(),
        id: `satisfaction_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      };

      this.satisfactionData.push(satisfactionRecord);

      // Update satisfaction trends
      this.trendAnalysis.userSatisfaction.push({
        timestamp: satisfactionRecord.timestamp,
        value: satisfactionRecord.rating
      });

      logger.info('User satisfaction tracked', {
        id: satisfactionRecord.id,
        rating: satisfactionRecord.rating,
        totalRecords: this.satisfactionData.length
      });

    } catch (error) {
      logger.error('Satisfaction tracking failed', { error: error.message });
      throw error;
    }
  }

  /**
   * Analyze user satisfaction patterns
   */
  async analyzeSatisfaction(options = {}) {
    try {
      logger.debug('Analyzing user satisfaction', options);

      if (this.satisfactionData.length === 0) {
        return {
          avgRating: 0,
          totalResponses: 0,
          distribution: {},
          trends: []
        };
      }

      const timeframe = options.timeframe || '30d';
      const cutoffTime = this.getTimeframeCutoff(timeframe);
      const filteredData = this.satisfactionData.filter(s => s.timestamp >= cutoffTime);

      const ratings = filteredData.map(s => s.rating);
      const avgRating = this.calculateAverage(ratings);

      // Rating distribution
      const distribution = {};
      for (let i = 1; i <= 5; i++) {
        distribution[i] = filteredData.filter(s => s.rating === i).length;
      }

      // Satisfaction trends
      const trends = this.calculateSatisfactionTrends(filteredData);

      // Analyze feedback sentiment
      const sentimentAnalysis = await this.analyzeFeedbackSentiment(filteredData);

      // Identify satisfaction drivers
      const drivers = await this.identifySatisfactionDrivers(filteredData);

      const result = {
        avgRating,
        totalResponses: filteredData.length,
        distribution,
        trends,
        sentimentAnalysis,
        drivers,
        timeframe,
        analyzedAt: new Date().toISOString()
      };

      logger.info('Satisfaction analysis completed', {
        avgRating: avgRating.toFixed(1),
        totalResponses: filteredData.length,
        highSatisfaction: distribution[5] + distribution[4]
      });

      return result;

    } catch (error) {
      logger.error('Satisfaction analysis failed', { error: error.message });
      throw error;
    }
  }

  /**
   * Generate improvement recommendations based on metrics
   */
  async generateImprovementRecommendations() {
    try {
      logger.debug('Generating improvement recommendations');

      const recommendations = [];
      const benchmarks = await this.getBenchmarks();
      const satisfactionAnalysis = await this.analyzeSatisfaction();

      // Performance recommendations
      if (benchmarks.avgExecutionTime > 3000) {
        recommendations.push({
          type: 'performance',
          priority: 'high',
          issue: 'High execution time',
          recommendation: 'Optimize workflow execution by implementing parallel processing or caching',
          metric: `Average execution time: ${Math.round(benchmarks.avgExecutionTime)}ms`,
          target: 'Reduce to under 2000ms'
        });
      }

      if (benchmarks.successRate < 0.9) {
        recommendations.push({
          type: 'reliability',
          priority: 'high',
          issue: 'Low success rate',
          recommendation: 'Improve error handling and API reliability',
          metric: `Success rate: ${(benchmarks.successRate * 100).toFixed(1)}%`,
          target: 'Achieve 95%+ success rate'
        });
      }

      // User satisfaction recommendations
      if (satisfactionAnalysis.avgRating < 4.0) {
        recommendations.push({
          type: 'user_experience',
          priority: 'medium',
          issue: 'Low user satisfaction',
          recommendation: 'Analyze user feedback and improve response quality',
          metric: `Average rating: ${satisfactionAnalysis.avgRating.toFixed(1)}/5`,
          target: 'Achieve 4.5+ average rating'
        });
      }

      // Trend-based recommendations
      const trendRecommendations = await this.generateTrendBasedRecommendations();
      recommendations.push(...trendRecommendations);

      // API usage recommendations
      const apiRecommendations = await this.generateApiUsageRecommendations();
      recommendations.push(...apiRecommendations);

      logger.info('Improvement recommendations generated', {
        totalRecommendations: recommendations.length,
        highPriority: recommendations.filter(r => r.priority === 'high').length
      });

      return recommendations;

    } catch (error) {
      logger.error('Recommendation generation failed', { error: error.message });
      throw error;
    }
  }

  /**
   * Update trend analysis with new execution data
   */
  updateTrendAnalysis(executionRecord) {
    const timestamp = executionRecord.timestamp;

    // Success rate trend
    this.trendAnalysis.successRate.push({
      timestamp,
      value: executionRecord.success ? 1 : 0
    });

    // Execution time trend
    if (executionRecord.duration > 0) {
      this.trendAnalysis.executionTime.push({
        timestamp,
        value: executionRecord.duration
      });
    }

    // Keep only recent data (last 1000 points)
    const maxPoints = 1000;
    Object.keys(this.trendAnalysis).forEach(key => {
      if (this.trendAnalysis[key].length > maxPoints) {
        this.trendAnalysis[key] = this.trendAnalysis[key].slice(-maxPoints);
      }
    });
  }

  /**
   * Update performance benchmarks
   */
  async updateBenchmarks(executionRecord) {
    const now = Date.now();
    const hourlyKey = `hour_${Math.floor(now / (60 * 60 * 1000))}`;
    
    if (!this.performanceBenchmarks.has(hourlyKey)) {
      this.performanceBenchmarks.set(hourlyKey, {
        executions: [],
        startTime: now
      });
    }

    const hourlyBenchmark = this.performanceBenchmarks.get(hourlyKey);
    hourlyBenchmark.executions.push(executionRecord);

    // Clean up old benchmarks (keep last 24 hours)
    const cutoffTime = now - (24 * 60 * 60 * 1000);
    for (const [key, benchmark] of this.performanceBenchmarks) {
      if (benchmark.startTime < cutoffTime && key !== 'current') {
        this.performanceBenchmarks.delete(key);
      }
    }
  }

  /**
   * Calculate grouped success rates
   */
  async calculateGroupedSuccessRates(metrics, groupBy) {
    const groups = {};

    for (const metric of metrics) {
      let groupKey;
      
      switch (groupBy) {
        case 'pattern':
          groupKey = metric.pattern || 'unknown';
          break;
        case 'hour':
          groupKey = new Date(metric.timestamp).getHours();
          break;
        case 'day':
          groupKey = new Date(metric.timestamp).getDay();
          break;
        case 'api_count':
          groupKey = `${metric.apiCalls || 0}_apis`;
          break;
        default:
          groupKey = 'default';
      }

      if (!groups[groupKey]) {
        groups[groupKey] = { total: 0, successful: 0 };
      }

      groups[groupKey].total++;
      if (metric.success) {
        groups[groupKey].successful++;
      }
    }

    // Calculate success rates for each group
    for (const groupKey of Object.keys(groups)) {
      const group = groups[groupKey];
      group.successRate = group.successful / group.total;
    }

    return groups;
  }

  /**
   * Calculate performance trends
   */
  async calculatePerformanceTrends() {
    const trends = {};

    // Calculate success rate trend (last 30 data points)
    const recentSuccessData = this.trendAnalysis.successRate.slice(-30);
    if (recentSuccessData.length > 5) {
      trends.successRate = this.calculateTrendDirection(recentSuccessData);
    }

    // Calculate execution time trend
    const recentTimeData = this.trendAnalysis.executionTime.slice(-30);
    if (recentTimeData.length > 5) {
      trends.executionTime = this.calculateTrendDirection(recentTimeData);
    }

    return trends;
  }

  /**
   * Calculate satisfaction trends
   */
  calculateSatisfactionTrends(satisfactionData) {
    if (satisfactionData.length < 5) return [];

    const trends = [];
    const sortedData = satisfactionData.sort((a, b) => a.timestamp - b.timestamp);
    
    // Calculate moving average
    const windowSize = Math.min(5, Math.floor(sortedData.length / 2));
    for (let i = windowSize; i < sortedData.length; i++) {
      const window = sortedData.slice(i - windowSize, i);
      const avgRating = this.calculateAverage(window.map(s => s.rating));
      trends.push({
        timestamp: sortedData[i].timestamp,
        movingAverage: avgRating
      });
    }

    return trends;
  }

  /**
   * Analyze feedback sentiment
   */
  async analyzeFeedbackSentiment(satisfactionData) {
    const sentiment = {
      positive: 0,
      neutral: 0,
      negative: 0,
      keywords: new Map()
    };

    for (const data of satisfactionData) {
      // Simple sentiment based on rating
      if (data.rating >= 4) sentiment.positive++;
      else if (data.rating === 3) sentiment.neutral++;
      else sentiment.negative++;

      // Extract keywords from feedback text
      if (data.feedback) {
        const words = data.feedback.toLowerCase()
          .replace(/[^\w\s]/g, '')
          .split(/\s+/)
          .filter(word => word.length > 3);
        
        for (const word of words) {
          sentiment.keywords.set(word, (sentiment.keywords.get(word) || 0) + 1);
        }
      }
    }

    // Convert keywords map to array of top keywords
    const topKeywords = Array.from(sentiment.keywords.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([word, count]) => ({ word, count }));

    return {
      distribution: sentiment,
      topKeywords
    };
  }

  /**
   * Identify satisfaction drivers
   */
  async identifySatisfactionDrivers(satisfactionData) {
    const drivers = [];

    // Analyze correlation between execution metrics and satisfaction
    const correlations = new Map();
    
    for (const satisfaction of satisfactionData) {
      const execution = this.executionMetrics.find(e => e.workflowId === satisfaction.workflowId);
      if (execution) {
        // Check correlations
        if (execution.duration < 2000 && satisfaction.rating >= 4) {
          correlations.set('fast_execution', (correlations.get('fast_execution') || 0) + 1);
        }
        if (execution.success && satisfaction.rating >= 4) {
          correlations.set('successful_execution', (correlations.get('successful_execution') || 0) + 1);
        }
        if (execution.dataPoints > 10 && satisfaction.rating >= 4) {
          correlations.set('rich_data', (correlations.get('rich_data') || 0) + 1);
        }
      }
    }

    // Convert correlations to drivers
    for (const [driver, count] of correlations) {
      const strength = count / satisfactionData.length;
      if (strength > 0.6) {
        drivers.push({
          factor: driver,
          strength,
          description: this.getDriverDescription(driver)
        });
      }
    }

    return drivers;
  }

  /**
   * Generate trend-based recommendations
   */
  async generateTrendBasedRecommendations() {
    const recommendations = [];
    const trends = await this.calculatePerformanceTrends();

    if (trends.successRate === 'declining') {
      recommendations.push({
        type: 'trend',
        priority: 'high',
        issue: 'Declining success rate trend',
        recommendation: 'Investigate recent changes and improve error handling',
        metric: 'Success rate trending downward',
        target: 'Reverse the trend and stabilize success rate'
      });
    }

    if (trends.executionTime === 'increasing') {
      recommendations.push({
        type: 'trend',
        priority: 'medium',
        issue: 'Increasing execution time trend',
        recommendation: 'Profile and optimize slow operations',
        metric: 'Execution time trending upward',
        target: 'Reduce and stabilize execution times'
      });
    }

    return recommendations;
  }

  /**
   * Generate API usage recommendations
   */
  async generateApiUsageRecommendations() {
    const recommendations = [];
    
    // Analyze API call patterns
    const apiCallData = this.executionMetrics.map(m => m.apiCalls || 0).filter(c => c > 0);
    if (apiCallData.length > 0) {
      const avgApiCalls = this.calculateAverage(apiCallData);
      
      if (avgApiCalls > 5) {
        recommendations.push({
          type: 'efficiency',
          priority: 'medium',
          issue: 'High API call count',
          recommendation: 'Optimize workflows to reduce redundant API calls',
          metric: `Average API calls: ${avgApiCalls.toFixed(1)}`,
          target: 'Reduce to under 4 calls per workflow'
        });
      }
    }

    return recommendations;
  }

  /**
   * Utility methods
   */
  getTimeframeCutoff(timeframe) {
    const now = Date.now();
    const timeframes = {
      '1h': 60 * 60 * 1000,
      '1d': 24 * 60 * 60 * 1000,
      '7d': 7 * 24 * 60 * 60 * 1000,
      '30d': 30 * 24 * 60 * 60 * 1000,
      '90d': 90 * 24 * 60 * 60 * 1000
    };
    
    const duration = timeframes[timeframe] || timeframes['30d'];
    return now - duration;
  }

  calculateAverage(values) {
    if (values.length === 0) return 0;
    return values.reduce((sum, val) => sum + val, 0) / values.length;
  }

  calculateMedian(values) {
    if (values.length === 0) return 0;
    const sorted = [...values].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
  }

  calculatePercentile(values, percentile) {
    if (values.length === 0) return 0;
    const sorted = [...values].sort((a, b) => a - b);
    const index = Math.ceil((percentile / 100) * sorted.length) - 1;
    return sorted[Math.max(0, index)];
  }

  calculateTrendDirection(dataPoints) {
    if (dataPoints.length < 5) return 'insufficient_data';
    
    const recentValues = dataPoints.slice(-10).map(point => point.value);
    const earlierValues = dataPoints.slice(-20, -10).map(point => point.value);
    
    if (earlierValues.length === 0) return 'insufficient_data';
    
    const recentAvg = this.calculateAverage(recentValues);
    const earlierAvg = this.calculateAverage(earlierValues);
    
    const changePercent = (recentAvg - earlierAvg) / earlierAvg;
    
    if (changePercent > 0.1) return 'increasing';
    if (changePercent < -0.1) return 'declining';
    return 'stable';
  }

  getDriverDescription(driver) {
    const descriptions = {
      'fast_execution': 'Fast execution times correlate with higher user satisfaction',
      'successful_execution': 'Successful workflows lead to better user ratings',
      'rich_data': 'Comprehensive data responses improve user satisfaction'
    };
    
    return descriptions[driver] || 'Correlation identified between this factor and satisfaction';
  }
}