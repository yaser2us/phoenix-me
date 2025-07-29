import { logger } from '../utils/logger.js';

/**
 * Performance Monitor for Phase 4 Checkpoint 4
 * Provides comprehensive API performance tracking and analytics with:
 * - Real-time performance metrics collection
 * - Response time trend analysis
 * - Success rate monitoring and alerting
 * - API reliability scoring
 * - Performance-based optimization recommendations
 */
export class PerformanceMonitor {
  constructor() {
    // Performance metrics storage
    this.metrics = new Map();
    
    // Metrics configuration
    this.config = {
      maxHistorySize: 1000,        // Max records per API
      alertThresholds: {
        responseTime: 5000,        // Alert if response time > 5s
        errorRate: 0.20,           // Alert if error rate > 20%
        successRate: 0.80          // Alert if success rate < 80%
      },
      aggregationWindows: {
        recent: 50,                // Last 50 calls
        shortTerm: 200,            // Last 200 calls
        longTerm: 500              // Last 500 calls
      },
      performanceCategories: {
        excellent: { responseTime: 500, successRate: 0.98 },
        good: { responseTime: 1000, successRate: 0.95 },
        acceptable: { responseTime: 2000, successRate: 0.90 },
        poor: { responseTime: 5000, successRate: 0.80 }
      }
    };

    // Real-time monitoring state
    this.monitoringState = {
      activeAlerts: new Map(),
      lastAnalysis: null,
      trendAnalysis: new Map(),
      performanceInsights: new Map()
    };

    this.initialized = true;
  }

  /**
   * Record API call performance metrics
   * @param {string} apiId - API identifier
   * @param {number} responseTime - Response time in milliseconds
   * @param {boolean} success - Whether the call was successful
   * @param {Object} metadata - Additional call metadata
   * @returns {Object} Recorded metric entry
   */
  async recordAPICall(apiId, responseTime, success, metadata = {}) {
    try {
      const timestamp = Date.now();
      
      const record = {
        apiId: apiId,
        responseTime: responseTime,
        success: success,
        timestamp: timestamp,
        metadata: {
          operation: metadata.operation || 'unknown',
          domain: metadata.domain || 'unknown',
          userAgent: metadata.userAgent,
          region: metadata.region,
          cached: metadata.cached || false,
          retryAttempt: metadata.retryAttempt || 0,
          ...metadata
        }
      };

      // Initialize metrics for new API
      if (!this.metrics.has(apiId)) {
        this.metrics.set(apiId, {
          apiId: apiId,
          totalCalls: 0,
          successfulCalls: 0,
          failedCalls: 0,
          totalResponseTime: 0,
          minResponseTime: Infinity,
          maxResponseTime: 0,
          lastCall: null,
          firstCall: null,
          callHistory: [],
          dailyStats: new Map(),
          operationStats: new Map()
        });
      }

      // Update metrics
      await this.updateMetrics(apiId, record);
      
      // Perform real-time analysis
      await this.performRealtimeAnalysis(apiId, record);

      logger.debug('API call recorded', {
        apiId: apiId,
        responseTime: responseTime,
        success: success,
        operation: metadata.operation
      });

      return record;

    } catch (error) {
      logger.error('Failed to record API call', { error: error.message, apiId });
      throw error;
    }
  }

  /**
   * Update metrics for an API
   * @param {string} apiId - API identifier
   * @param {Object} record - Call record
   */
  async updateMetrics(apiId, record) {
    const metrics = this.metrics.get(apiId);
    
    // Update basic counters
    metrics.totalCalls++;
    if (record.success) {
      metrics.successfulCalls++;
    } else {
      metrics.failedCalls++;
    }

    // Update response time statistics
    metrics.totalResponseTime += record.responseTime;
    metrics.minResponseTime = Math.min(metrics.minResponseTime, record.responseTime);
    metrics.maxResponseTime = Math.max(metrics.maxResponseTime, record.responseTime);

    // Update timestamps
    if (!metrics.firstCall) {
      metrics.firstCall = record.timestamp;
    }
    metrics.lastCall = record.timestamp;

    // Add to call history
    metrics.callHistory.push(record);
    
    // Maintain history size limit
    if (metrics.callHistory.length > this.config.maxHistorySize) {
      metrics.callHistory.shift();
    }

    // Update daily statistics
    const dateKey = new Date(record.timestamp).toDateString();
    if (!metrics.dailyStats.has(dateKey)) {
      metrics.dailyStats.set(dateKey, {
        date: dateKey,
        calls: 0,
        successes: 0,
        totalResponseTime: 0,
        minResponseTime: Infinity,
        maxResponseTime: 0
      });
    }
    
    const dailyStat = metrics.dailyStats.get(dateKey);
    dailyStat.calls++;
    if (record.success) dailyStat.successes++;
    dailyStat.totalResponseTime += record.responseTime;
    dailyStat.minResponseTime = Math.min(dailyStat.minResponseTime, record.responseTime);
    dailyStat.maxResponseTime = Math.max(dailyStat.maxResponseTime, record.responseTime);

    // Update operation-specific statistics
    const operation = record.metadata.operation;
    if (!metrics.operationStats.has(operation)) {
      metrics.operationStats.set(operation, {
        operation: operation,
        calls: 0,
        successes: 0,
        totalResponseTime: 0,
        avgResponseTime: 0
      });
    }
    
    const opStat = metrics.operationStats.get(operation);
    opStat.calls++;
    if (record.success) opStat.successes++;
    opStat.totalResponseTime += record.responseTime;
    opStat.avgResponseTime = opStat.totalResponseTime / opStat.calls;
  }

  /**
   * Perform real-time analysis on new call
   * @param {string} apiId - API identifier
   * @param {Object} record - Call record
   */
  async performRealtimeAnalysis(apiId, record) {
    // Check for performance alerts
    await this.checkPerformanceAlerts(apiId, record);
    
    // Update trend analysis
    await this.updateTrendAnalysis(apiId);
    
    // Generate performance insights
    await this.generatePerformanceInsights(apiId);
  }

  /**
   * Check for performance alerts
   * @param {string} apiId - API identifier
   * @param {Object} record - Call record
   */
  async checkPerformanceAlerts(apiId, record) {
    const alerts = [];
    
    // Response time alert
    if (record.responseTime > this.config.alertThresholds.responseTime) {
      alerts.push({
        type: 'high_response_time',
        severity: 'warning',
        message: `High response time: ${record.responseTime}ms`,
        threshold: this.config.alertThresholds.responseTime,
        value: record.responseTime
      });
    }

    // Check recent error rate
    const recentStats = await this.getRecentStats(apiId, this.config.aggregationWindows.recent);
    if (recentStats.errorRate > this.config.alertThresholds.errorRate) {
      alerts.push({
        type: 'high_error_rate',
        severity: 'critical',
        message: `High error rate: ${(recentStats.errorRate * 100).toFixed(1)}%`,
        threshold: this.config.alertThresholds.errorRate,
        value: recentStats.errorRate
      });
    }

    // Check success rate
    if (recentStats.successRate < this.config.alertThresholds.successRate) {
      alerts.push({
        type: 'low_success_rate',
        severity: 'warning',
        message: `Low success rate: ${(recentStats.successRate * 100).toFixed(1)}%`,
        threshold: this.config.alertThresholds.successRate,
        value: recentStats.successRate
      });
    }

    // Store active alerts
    if (alerts.length > 0) {
      this.monitoringState.activeAlerts.set(apiId, {
        apiId: apiId,
        alerts: alerts,
        timestamp: Date.now()
      });
      
      logger.warn('Performance alerts triggered', { apiId, alertCount: alerts.length });
    }
  }

  /**
   * Update trend analysis for an API
   * @param {string} apiId - API identifier
   */
  async updateTrendAnalysis(apiId) {
    const metrics = this.metrics.get(apiId);
    if (!metrics || metrics.callHistory.length < 10) {
      return; // Need minimum data for trend analysis
    }

    const recentCalls = metrics.callHistory.slice(-50); // Last 50 calls
    const olderCalls = metrics.callHistory.slice(-100, -50); // Previous 50 calls

    if (olderCalls.length < 10) {
      return; // Not enough historical data
    }

    // Calculate trend metrics
    const recentAvgResponseTime = recentCalls.reduce((sum, call) => sum + call.responseTime, 0) / recentCalls.length;
    const olderAvgResponseTime = olderCalls.reduce((sum, call) => sum + call.responseTime, 0) / olderCalls.length;
    
    const recentSuccessRate = recentCalls.filter(call => call.success).length / recentCalls.length;
    const olderSuccessRate = olderCalls.filter(call => call.success).length / olderCalls.length;

    // Calculate trends
    const responseTimeTrend = ((recentAvgResponseTime - olderAvgResponseTime) / olderAvgResponseTime) * 100;
    const successRateTrend = ((recentSuccessRate - olderSuccessRate) / olderSuccessRate) * 100;

    const trendAnalysis = {
      apiId: apiId,
      timestamp: Date.now(),
      responseTime: {
        current: recentAvgResponseTime,
        previous: olderAvgResponseTime,
        trend: responseTimeTrend,
        direction: responseTimeTrend > 5 ? 'degrading' : responseTimeTrend < -5 ? 'improving' : 'stable'
      },
      successRate: {
        current: recentSuccessRate,
        previous: olderSuccessRate,
        trend: successRateTrend,
        direction: successRateTrend > 2 ? 'improving' : successRateTrend < -2 ? 'degrading' : 'stable'
      },
      overallTrend: this.calculateOverallTrend(responseTimeTrend, successRateTrend)
    };

    this.monitoringState.trendAnalysis.set(apiId, trendAnalysis);
  }

  /**
   * Generate performance insights for an API
   * @param {string} apiId - API identifier
   */
  async generatePerformanceInsights(apiId) {
    const metrics = this.metrics.get(apiId);
    if (!metrics || metrics.totalCalls < 20) {
      return; // Need sufficient data for insights
    }

    const insights = [];
    const stats = await this.getAPIStats(apiId);

    // Performance category analysis
    const category = this.categorizePerformance(stats.avgResponseTime, stats.successRate);
    insights.push({
      type: 'performance_category',
      category: category,
      message: `API performance is ${category}`,
      details: {
        avgResponseTime: stats.avgResponseTime,
        successRate: stats.successRate
      }
    });

    // Peak performance times analysis
    const hourlyStats = this.analyzeHourlyPerformance(metrics.callHistory);
    const bestHour = hourlyStats.reduce((best, hour) => 
      hour.avgResponseTime < best.avgResponseTime ? hour : best
    );
    const worstHour = hourlyStats.reduce((worst, hour) => 
      hour.avgResponseTime > worst.avgResponseTime ? hour : worst
    );

    if (bestHour.hour !== worstHour.hour) {
      insights.push({
        type: 'peak_performance',
        message: `Best performance at ${bestHour.hour}:00, worst at ${worstHour.hour}:00`,
        details: {
          bestHour: bestHour.hour,
          bestAvgTime: bestHour.avgResponseTime,
          worstHour: worstHour.hour,
          worstAvgTime: worstHour.avgResponseTime
        }
      });
    }

    // Cache effectiveness analysis
    const cachedCalls = metrics.callHistory.filter(call => call.metadata.cached);
    if (cachedCalls.length > 0) {
      const cacheHitRate = cachedCalls.length / metrics.callHistory.length;
      const cachedAvgTime = cachedCalls.reduce((sum, call) => sum + call.responseTime, 0) / cachedCalls.length;
      const uncachedCalls = metrics.callHistory.filter(call => !call.metadata.cached);
      const uncachedAvgTime = uncachedCalls.length > 0 ? 
        uncachedCalls.reduce((sum, call) => sum + call.responseTime, 0) / uncachedCalls.length : 0;

      insights.push({
        type: 'cache_effectiveness',
        message: `Cache hit rate: ${(cacheHitRate * 100).toFixed(1)}%`,
        details: {
          cacheHitRate: cacheHitRate,
          cachedAvgTime: cachedAvgTime,
          uncachedAvgTime: uncachedAvgTime,
          speedImprovement: uncachedAvgTime > 0 ? ((uncachedAvgTime - cachedAvgTime) / uncachedAvgTime) * 100 : 0
        }
      });
    }

    // Operation-specific insights
    const operationStats = Array.from(metrics.operationStats.values())
      .filter(op => op.calls >= 5) // Only operations with sufficient data
      .sort((a, b) => b.avgResponseTime - a.avgResponseTime);

    if (operationStats.length > 1) {
      const slowestOp = operationStats[0];
      const fastestOp = operationStats[operationStats.length - 1];
      
      insights.push({
        type: 'operation_performance',
        message: `${slowestOp.operation} is slowest operation, ${fastestOp.operation} is fastest`,
        details: {
          slowestOperation: slowestOp.operation,
          slowestAvgTime: slowestOp.avgResponseTime,
          fastestOperation: fastestOp.operation,
          fastestAvgTime: fastestOp.avgResponseTime
        }
      });
    }

    this.monitoringState.performanceInsights.set(apiId, {
      apiId: apiId,
      timestamp: Date.now(),
      insights: insights
    });
  }

  /**
   * Get comprehensive API statistics
   * @param {string} apiId - API identifier
   * @returns {Object} API statistics
   */
  async getAPIStats(apiId) {
    const metrics = this.metrics.get(apiId);
    if (!metrics) {
      return {
        apiId: apiId,
        totalCalls: 0,
        successRate: 0,
        errorRate: 0,
        avgResponseTime: 0,
        medianResponseTime: 0,
        p95ResponseTime: 0,
        minResponseTime: 0,
        maxResponseTime: 0
      };
    }

    // Calculate response time percentiles
    const responseTimes = metrics.callHistory.map(call => call.responseTime).sort((a, b) => a - b);
    const medianIndex = Math.floor(responseTimes.length / 2);
    const p95Index = Math.floor(responseTimes.length * 0.95);

    const stats = {
      apiId: apiId,
      totalCalls: metrics.totalCalls,
      successfulCalls: metrics.successfulCalls,
      failedCalls: metrics.failedCalls,
      successRate: metrics.totalCalls > 0 ? metrics.successfulCalls / metrics.totalCalls : 0,
      errorRate: metrics.totalCalls > 0 ? metrics.failedCalls / metrics.totalCalls : 0,
      avgResponseTime: metrics.totalCalls > 0 ? metrics.totalResponseTime / metrics.totalCalls : 0,
      medianResponseTime: responseTimes.length > 0 ? responseTimes[medianIndex] : 0,
      p95ResponseTime: responseTimes.length > 0 ? responseTimes[p95Index] : 0,
      minResponseTime: metrics.minResponseTime === Infinity ? 0 : metrics.minResponseTime,
      maxResponseTime: metrics.maxResponseTime,
      firstCall: metrics.firstCall,
      lastCall: metrics.lastCall,
      callsPerDay: this.calculateCallsPerDay(metrics),
      recentPerformance: await this.getRecentStats(apiId, this.config.aggregationWindows.recent)
    };

    return stats;
  }

  /**
   * Get recent performance statistics
   * @param {string} apiId - API identifier
   * @param {number} windowSize - Number of recent calls to analyze
   * @returns {Object} Recent statistics
   */
  async getRecentStats(apiId, windowSize = 50) {
    const metrics = this.metrics.get(apiId);
    if (!metrics || metrics.callHistory.length === 0) {
      return {
        calls: 0,
        successRate: 0,
        errorRate: 0,
        avgResponseTime: 0
      };
    }

    const recentCalls = metrics.callHistory.slice(-windowSize);
    const successfulCalls = recentCalls.filter(call => call.success).length;
    const totalResponseTime = recentCalls.reduce((sum, call) => sum + call.responseTime, 0);

    return {
      calls: recentCalls.length,
      successfulCalls: successfulCalls,
      failedCalls: recentCalls.length - successfulCalls,
      successRate: recentCalls.length > 0 ? successfulCalls / recentCalls.length : 0,
      errorRate: recentCalls.length > 0 ? (recentCalls.length - successfulCalls) / recentCalls.length : 0,
      avgResponseTime: recentCalls.length > 0 ? totalResponseTime / recentCalls.length : 0,
      timeWindow: windowSize
    };
  }

  /**
   * Get performance comparison between APIs
   * @param {Array} apiIds - List of API identifiers to compare
   * @returns {Object} Comparison results
   */
  async compareAPIs(apiIds) {
    const comparisons = [];
    
    for (const apiId of apiIds) {
      const stats = await this.getAPIStats(apiId);
      const category = this.categorizePerformance(stats.avgResponseTime, stats.successRate);
      
      comparisons.push({
        apiId: apiId,
        stats: stats,
        category: category,
        score: this.calculatePerformanceScore(stats.avgResponseTime, stats.successRate)
      });
    }

    // Sort by performance score (highest first)
    comparisons.sort((a, b) => b.score - a.score);

    return {
      comparisons: comparisons,
      bestPerforming: comparisons[0],
      worstPerforming: comparisons[comparisons.length - 1],
      averageResponseTime: comparisons.reduce((sum, comp) => sum + comp.stats.avgResponseTime, 0) / comparisons.length,
      averageSuccessRate: comparisons.reduce((sum, comp) => sum + comp.stats.successRate, 0) / comparisons.length
    };
  }

  /**
   * Get monitoring dashboard data
   * @returns {Object} Dashboard data
   */
  getMonitoringDashboard() {
    const dashboard = {
      timestamp: Date.now(),
      totalAPIs: this.metrics.size,
      activeAlerts: this.monitoringState.activeAlerts.size,
      apiOverview: [],
      systemHealth: 'healthy'
    };

    // API overview
    for (const [apiId, metrics] of this.metrics) {
      const successRate = metrics.totalCalls > 0 ? metrics.successfulCalls / metrics.totalCalls : 0;
      const avgResponseTime = metrics.totalCalls > 0 ? metrics.totalResponseTime / metrics.totalCalls : 0;
      const category = this.categorizePerformance(avgResponseTime, successRate);
      
      dashboard.apiOverview.push({
        apiId: apiId,
        totalCalls: metrics.totalCalls,
        successRate: successRate,
        avgResponseTime: avgResponseTime,
        category: category,
        lastCall: metrics.lastCall,
        hasAlerts: this.monitoringState.activeAlerts.has(apiId)
      });
    }

    // Determine system health
    const criticalAlerts = Array.from(this.monitoringState.activeAlerts.values())
      .filter(alert => alert.alerts.some(a => a.severity === 'critical'));
    
    if (criticalAlerts.length > 0) {
      dashboard.systemHealth = 'critical';
    } else if (this.monitoringState.activeAlerts.size > 0) {
      dashboard.systemHealth = 'warning';
    }

    return dashboard;
  }

  // Helper methods
  calculateOverallTrend(responseTimeTrend, successRateTrend) {
    if (responseTimeTrend > 10 || successRateTrend < -5) {
      return 'degrading';
    } else if (responseTimeTrend < -10 || successRateTrend > 5) {
      return 'improving';
    } else {
      return 'stable';
    }
  }

  categorizePerformance(avgResponseTime, successRate) {
    const categories = this.config.performanceCategories;
    
    if (avgResponseTime <= categories.excellent.responseTime && successRate >= categories.excellent.successRate) {
      return 'excellent';
    } else if (avgResponseTime <= categories.good.responseTime && successRate >= categories.good.successRate) {
      return 'good';
    } else if (avgResponseTime <= categories.acceptable.responseTime && successRate >= categories.acceptable.successRate) {
      return 'acceptable';
    } else {
      return 'poor';
    }
  }

  calculatePerformanceScore(avgResponseTime, successRate) {
    // Weighted score: 60% success rate, 40% speed (inverted response time)
    const successScore = successRate * 10;
    const speedScore = Math.max(0, 10 - (avgResponseTime / 1000)); // 10 points for <1s, decreasing linearly
    
    return (successScore * 0.6) + (speedScore * 0.4);
  }

  analyzeHourlyPerformance(callHistory) {
    const hourlyStats = new Map();
    
    for (const call of callHistory) {
      const hour = new Date(call.timestamp).getHours();
      
      if (!hourlyStats.has(hour)) {
        hourlyStats.set(hour, {
          hour: hour,
          calls: 0,
          totalResponseTime: 0,
          successes: 0
        });
      }
      
      const stat = hourlyStats.get(hour);
      stat.calls++;
      stat.totalResponseTime += call.responseTime;
      if (call.success) stat.successes++;
    }
    
    // Calculate averages
    const hourlyArray = Array.from(hourlyStats.values()).map(stat => ({
      ...stat,
      avgResponseTime: stat.calls > 0 ? stat.totalResponseTime / stat.calls : 0,
      successRate: stat.calls > 0 ? stat.successes / stat.calls : 0
    }));
    
    return hourlyArray;
  }

  calculateCallsPerDay(metrics) {
    if (!metrics.firstCall || !metrics.lastCall) return 0;
    
    const daysDiff = (metrics.lastCall - metrics.firstCall) / (1000 * 60 * 60 * 24);
    return daysDiff > 0 ? metrics.totalCalls / daysDiff : metrics.totalCalls;
  }

  /**
   * Clear performance data
   * @param {string} apiId - Optional API to clear (clears all if not specified)
   */
  clearPerformanceData(apiId = null) {
    if (apiId) {
      this.metrics.delete(apiId);
      this.monitoringState.activeAlerts.delete(apiId);
      this.monitoringState.trendAnalysis.delete(apiId);
      this.monitoringState.performanceInsights.delete(apiId);
    } else {
      this.metrics.clear();
      this.monitoringState.activeAlerts.clear();
      this.monitoringState.trendAnalysis.clear();
      this.monitoringState.performanceInsights.clear();
    }
    
    logger.debug('Performance data cleared', { apiId: apiId || 'all' });
  }
}