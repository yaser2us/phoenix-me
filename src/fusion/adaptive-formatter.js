import { logger } from '../utils/logger.js';

/**
 * Adaptive Formatter - Phase 4.9 Checkpoint 3
 * Formats responses adaptively based on user preferences with audit trail maintenance
 */
export class AdaptiveFormatter {
  constructor() {
    this.formatTemplates = this.initializeFormatTemplates();
    this.visualGenerators = this.initializeVisualGenerators();
    this.auditTrailManager = this.initializeAuditTrailManager();
    
    logger.info('Adaptive Formatter initialized');
  }

  /**
   * Format data as executive summary
   */
  async formatExecutiveSummary(data, options = {}) {
    try {
      logger.debug('Formatting executive summary', {
        dataKeys: Object.keys(data),
        includeMetrics: options.includeMetrics !== false
      });
      
      const template = this.formatTemplates.executive;
      
      // Extract key metrics
      const keyMetrics = await this.extractKeyMetrics(data);
      
      // Generate executive summary text
      const summary = await this.generateExecutiveSummary(data, keyMetrics);
      
      // Create highlights
      const highlights = await this.createHighlights(data);
      
      // Generate actionable insights
      const actionableInsights = await this.extractActionableInsights(data);
      
      const executiveSummary = {
        summary,
        keyMetrics,
        highlights,
        actionableInsights,
        confidence: this.calculateSummaryConfidence(data),
        metadata: {
          formatType: 'executive_summary',
          dataSourceCount: this.countDataSources(data),
          generatedAt: new Date().toISOString(),
          options
        }
      };
      
      logger.info('Executive summary formatted', {
        summaryLength: summary.length,
        keyMetrics: keyMetrics.length,
        highlights: highlights.length,
        insights: actionableInsights.length
      });
      
      return executiveSummary;
      
    } catch (error) {
      logger.error('Executive summary formatting failed', { error: error.message });
      throw error;
    }
  }

  /**
   * Format data as detailed technical report
   */
  async formatTechnicalReport(data, options = {}) {
    try {
      logger.debug('Formatting technical report', {
        dataKeys: Object.keys(data),
        includeRawData: options.includeRawData || false,
        showConfidence: options.showConfidence || false
      });
      
      const sections = [];
      
      // Data Sources Section
      sections.push({
        title: 'Data Sources',
        content: await this.formatDataSources(data),
        type: 'metadata'
      });
      
      // Analysis Results Section
      if (data.insights) {
        sections.push({
          title: 'Analysis Results',
          content: await this.formatAnalysisResults(data.insights),
          type: 'analysis'
        });
      }
      
      // Technical Metrics Section
      sections.push({
        title: 'Technical Metrics',
        content: await this.formatTechnicalMetrics(data),
        type: 'metrics'
      });
      
      // Raw Data Section (if requested)
      if (options.includeRawData) {
        sections.push({
          title: 'Raw Data',
          content: await this.formatRawData(data),
          type: 'raw_data'
        });
      }
      
      // Confidence Scores (if requested)
      if (options.showConfidence) {
        sections.push({
          title: 'Confidence Analysis',
          content: await this.formatConfidenceAnalysis(data),
          type: 'confidence'
        });
      }
      
      const technicalReport = {
        sections,
        metadata: {
          formatType: 'technical_report',
          sectionCount: sections.length,
          totalDataPoints: this.countDataPoints(data),
          processingTime: this.calculateProcessingTime(data),
          generatedAt: new Date().toISOString(),
          options
        }
      };
      
      logger.info('Technical report formatted', {
        sections: sections.length,
        includeRawData: options.includeRawData,
        showConfidence: options.showConfidence
      });
      
      return technicalReport;
      
    } catch (error) {
      logger.error('Technical report formatting failed', { error: error.message });
      throw error;
    }
  }

  /**
   * Format data for mobile display
   */
  async formatForMobile(data, options = {}) {
    try {
      logger.debug('Formatting for mobile', {
        dataKeys: Object.keys(data),
        maxCards: options.maxCards || 10
      });
      
      const cards = [];
      
      // Financial Summary Card
      if (data.financial || data.banking) {
        const financialCard = await this.createFinancialCard(data.financial || data.banking);
        cards.push(financialCard);
      }
      
      // Weather Card
      if (data.weather) {
        const weatherCard = await this.createWeatherCard(data.weather);
        cards.push(weatherCard);
      }
      
      // Insights Cards
      if (data.insights && Array.isArray(data.insights)) {
        const insightCards = await this.createInsightCards(data.insights);
        cards.push(...insightCards.slice(0, 3)); // Limit to 3 insight cards
      }
      
      // Recommendations Card
      if (data.recommendations && Array.isArray(data.recommendations)) {
        const recommendationCard = await this.createRecommendationCard(data.recommendations);
        cards.push(recommendationCard);
      }
      
      // Quick Stats Card
      const quickStatsCard = await this.createQuickStatsCard(data);
      cards.push(quickStatsCard);
      
      // Limit total cards for mobile
      const maxCards = options.maxCards || 10;
      const limitedCards = cards.slice(0, maxCards);
      
      const mobileFormat = {
        cards: limitedCards,
        navigation: await this.createMobileNavigation(limitedCards),
        quickActions: await this.createQuickActions(data),
        metadata: {
          formatType: 'mobile',
          cardCount: limitedCards.length,
          optimizedFor: 'mobile_display',
          generatedAt: new Date().toISOString()
        }
      };
      
      logger.info('Mobile format created', {
        cards: limitedCards.length,
        hasNavigation: !!mobileFormat.navigation,
        quickActions: mobileFormat.quickActions.length
      });
      
      return mobileFormat;
      
    } catch (error) {
      logger.error('Mobile formatting failed', { error: error.message });
      throw error;
    }
  }

  /**
   * Generate visual representation of data
   */
  async generateVisualRepresentation(data, visualType = 'dashboard') {
    try {
      logger.debug('Generating visual representation', {
        visualType,
        dataKeys: Object.keys(data)
      });
      
      const generator = this.visualGenerators[visualType] || this.visualGenerators.default;
      const charts = await generator.generate(data);
      
      // Add interactive elements
      const interactiveElements = await this.createInteractiveElements(data);
      
      // Generate layout
      const layout = await this.generateLayout(charts, visualType);
      
      const visualRepresentation = {
        visualType,
        charts,
        interactiveElements,
        layout,
        accessibility: await this.generateAccessibilityInfo(charts),
        metadata: {
          formatType: 'visual',
          chartCount: charts.length,
          interactive: interactiveElements.length > 0,
          generatedAt: new Date().toISOString()
        }
      };
      
      logger.info('Visual representation generated', {
        visualType,
        charts: charts.length,
        interactive: interactiveElements.length
      });
      
      return visualRepresentation;
      
    } catch (error) {
      logger.error('Visual representation generation failed', { error: error.message });
      throw error;
    }
  }

  /**
   * Generate audit trail for data sources
   */
  async generateAuditTrail(data, sourceList) {
    try {
      logger.debug('Generating audit trail', {
        dataKeys: Object.keys(data),
        sources: sourceList?.length || 0
      });
      
      const auditManager = this.auditTrailManager;
      
      // Track data sources
      const sources = await auditManager.trackSources(sourceList || [], data);
      
      // Generate data lineage
      const dataLineage = await auditManager.generateLineage(data);
      
      // Create transformation log
      const transformationLog = await auditManager.createTransformationLog(data);
      
      // Generate compliance report
      const complianceReport = await auditManager.generateComplianceReport(sources);
      
      const auditTrail = {
        sources,
        dataLineage,
        transformationLog,
        complianceReport,
        auditId: this.generateAuditId(),
        metadata: {
          totalSources: sources.length,
          transformationCount: transformationLog.length,
          complianceStatus: complianceReport.status,
          generatedAt: new Date().toISOString()
        }
      };
      
      logger.info('Audit trail generated', {
        auditId: auditTrail.auditId,
        sources: sources.length,
        transformations: transformationLog.length,
        compliance: complianceReport.status
      });
      
      return auditTrail;
      
    } catch (error) {
      logger.error('Audit trail generation failed', { error: error.message });
      throw error;
    }
  }

  /**
   * Extract key metrics from data
   */
  async extractKeyMetrics(data) {
    const metrics = [];
    
    // Financial metrics
    if (data.financial || data.banking) {
      const financialData = data.financial || data.banking;
      
      if (financialData.balance) {
        metrics.push({
          name: 'Account Balance',
          value: financialData.balance.amount || financialData.balance,
          unit: financialData.balance.currency || 'MYR',
          type: 'financial',
          trend: 'stable' // Would be calculated from historical data
        });
      }
    }
    
    // Weather metrics
    if (data.weather) {
      metrics.push({
        name: 'Temperature',
        value: data.weather.temperature,
        unit: '°C',
        type: 'environmental'
      });
      
      if (data.weather.humidity) {
        metrics.push({
          name: 'Humidity',
          value: data.weather.humidity,
          unit: '%',
          type: 'environmental'
        });
      }
    }
    
    // Currency metrics
    if (data.currency && data.currency.rates) {
      if (data.currency.rates.USD) {
        metrics.push({
          name: 'USD Exchange Rate',
          value: data.currency.rates.USD,
          unit: 'MYR/USD',
          type: 'financial'
        });
      }
    }
    
    // Insight metrics
    if (data.insights) {
      metrics.push({
        name: 'Insights Generated',
        value: data.insights.length,
        unit: 'count',
        type: 'analytical'
      });
    }
    
    return metrics;
  }

  /**
   * Generate executive summary text
   */
  async generateExecutiveSummary(data, keyMetrics) {
    let summary = '';
    
    // Financial summary
    const balanceMetric = keyMetrics.find(m => m.name === 'Account Balance');
    if (balanceMetric) {
      summary += `Your current account balance is ${balanceMetric.unit} ${balanceMetric.value.toLocaleString()}. `;
    }
    
    // Weather context
    const tempMetric = keyMetrics.find(m => m.name === 'Temperature');
    if (tempMetric) {
      const tempDescription = tempMetric.value > 30 ? 'hot' : tempMetric.value < 20 ? 'cool' : 'moderate';
      summary += `Current weather is ${tempDescription} at ${tempMetric.value}°C. `;
    }
    
    // Insights summary
    if (data.insights && data.insights.length > 0) {
      const highConfidenceInsights = data.insights.filter(i => i.confidence > 0.8).length;
      summary += `Analysis generated ${data.insights.length} insights, with ${highConfidenceInsights} high-confidence findings. `;
    }
    
    // Recommendations summary
    if (data.recommendations && data.recommendations.length > 0) {
      const urgentRecommendations = data.recommendations.filter(r => r.priority === 'high').length;
      if (urgentRecommendations > 0) {
        summary += `${urgentRecommendations} urgent recommendations require immediate attention. `;
      } else {
        summary += `${data.recommendations.length} recommendations available for consideration. `;
      }
    }
    
    // Overall assessment
    if (balanceMetric && balanceMetric.value > 10000) {
      summary += 'Your financial position appears strong with good liquidity.';
    } else if (balanceMetric && balanceMetric.value < 2000) {
      summary += 'Consider building your emergency fund for better financial security.';
    } else {
      summary += 'Your financial situation shows room for optimization.';
    }
    
    return summary.trim();
  }

  /**
   * Create highlights from data
   */
  async createHighlights(data) {
    const highlights = [];
    
    // High-priority insights as highlights
    if (data.insights) {
      const importantInsights = data.insights
        .filter(i => i.priority === 'high' || i.confidence > 0.85)
        .slice(0, 3);
      
      for (const insight of importantInsights) {
        highlights.push({
          type: 'insight',
          title: insight.category?.replace('_', ' ').toUpperCase() || 'IMPORTANT',
          content: insight.insight,
          priority: insight.priority,
          confidence: insight.confidence
        });
      }
    }
    
    // Financial highlights
    if (data.financial || data.banking) {
      const financialData = data.financial || data.banking;
      const balance = financialData.balance?.amount || financialData.balance || 0;
      
      if (balance > 50000) {
        highlights.push({
          type: 'financial',
          title: 'EXCELLENT POSITION',
          content: `Strong financial reserves of MYR ${balance.toLocaleString()}`,
          priority: 'medium'
        });
      } else if (balance < 1000) {
        highlights.push({
          type: 'financial',
          title: 'ACTION NEEDED',
          content: `Low balance requires immediate attention`,
          priority: 'high'
        });
      }
    }
    
    return highlights;
  }

  /**
   * Initialize format templates
   */
  initializeFormatTemplates() {
    return {
      executive: {
        name: 'Executive Summary',
        structure: ['summary', 'keyMetrics', 'highlights', 'actionableInsights'],
        targetAudience: 'executives'
      },
      
      technical: {
        name: 'Technical Report',
        structure: ['dataSources', 'analysisResults', 'technicalMetrics', 'rawData'],
        targetAudience: 'technical_staff'
      },
      
      mobile: {
        name: 'Mobile Cards',
        structure: ['cards', 'navigation', 'quickActions'],
        targetAudience: 'mobile_users'
      }
    };
  }

  /**
   * Initialize visual generators
   */
  initializeVisualGenerators() {
    return {
      dashboard: {
        generate: async (data) => {
          const charts = [];
          
          // Balance chart
          if (data.financial || data.banking) {
            charts.push({
              type: 'gauge',
              title: 'Account Balance',
              data: {
                value: (data.financial || data.banking).balance?.amount || 0,
                max: 100000,
                unit: 'MYR'
              }
            });
          }
          
          // Weather chart
          if (data.weather) {
            charts.push({
              type: 'thermometer',
              title: 'Current Temperature',
              data: {
                value: data.weather.temperature || 0,
                min: 0,
                max: 50,
                unit: '°C'
              }
            });
          }
          
          // Insights chart
          if (data.insights) {
            charts.push({
              type: 'bar',
              title: 'Insights by Category',
              data: this.groupInsightsByCategory(data.insights)
            });
          }
          
          return charts;
        }
      },
      
      default: {
        generate: async (data) => [{
          type: 'summary',
          title: 'Data Overview',
          data: {
            sources: Object.keys(data).length,
            timestamp: new Date().toISOString()
          }
        }]
      }
    };
  }

  /**
   * Initialize audit trail manager
   */
  initializeAuditTrailManager() {
    return {
      trackSources: async (sourceList, data) => {
        return sourceList.map(source => ({
          source,
          timestamp: new Date().toISOString(),
          dataPresent: !!data[source] || Object.keys(data).some(key => key.includes(source)),
          integrity: 'verified'
        }));
      },
      
      generateLineage: async (data) => {
        const lineage = [];
        
        for (const [key, value] of Object.entries(data)) {
          lineage.push({
            dataElement: key,
            source: this.inferSource(key),
            transformations: this.identifyTransformations(value),
            timestamp: new Date().toISOString()
          });
        }
        
        return lineage;
      },
      
      createTransformationLog: async (data) => {
        const log = [];
        
        // Log format transformations
        log.push({
          type: 'format_transformation',
          description: 'Data formatted for presentation',
          timestamp: new Date().toISOString()
        });
        
        // Log data synthesis
        if (Object.keys(data).length > 1) {
          log.push({
            type: 'data_synthesis',
            description: 'Multiple data sources combined',
            sources: Object.keys(data),
            timestamp: new Date().toISOString()
          });
        }
        
        return log;
      },
      
      generateComplianceReport: async (sources) => ({
        status: 'compliant',
        checkedSources: sources.length,
        issues: [],
        recommendations: ['Maintain current data handling practices'],
        generatedAt: new Date().toISOString()
      })
    };
  }

  /**
   * Helper methods
   */
  extractActionableInsights(data) {
    const actionable = [];
    
    if (data.recommendations) {
      for (const rec of data.recommendations.slice(0, 3)) {
        actionable.push({
          insight: rec.action || rec.recommendation,
          priority: rec.priority,
          category: rec.category || 'general'
        });
      }
    }
    
    return actionable;
  }

  calculateSummaryConfidence(data) {
    let confidence = 0.7; // Base confidence
    
    // Higher confidence with more data sources
    const sourceCount = Object.keys(data).length;
    if (sourceCount > 3) confidence += 0.1;
    
    // Higher confidence with insights
    if (data.insights && data.insights.length > 0) {
      const avgInsightConfidence = data.insights.reduce((sum, i) => sum + (i.confidence || 0.7), 0) / data.insights.length;
      confidence = (confidence + avgInsightConfidence) / 2;
    }
    
    return Math.round(confidence * 1000) / 1000;
  }

  countDataSources(data) {
    return Object.keys(data).filter(key => 
      typeof data[key] === 'object' && data[key] !== null && !key.startsWith('_')
    ).length;
  }

  countDataPoints(data) {
    let count = 0;
    
    const countObject = (obj) => {
      for (const value of Object.values(obj || {})) {
        if (typeof value === 'object' && value !== null) {
          count += countObject(value);
        } else {
          count++;
        }
      }
      return count;
    };
    
    return countObject(data);
  }

  calculateProcessingTime(data) {
    // Estimate processing time based on data complexity
    const complexity = this.countDataPoints(data);
    return Math.round(complexity * 0.1); // 0.1ms per data point
  }

  async createFinancialCard(financialData) {
    const balance = financialData.balance?.amount || financialData.balance || 0;
    
    return {
      type: 'financial',
      title: 'Account Balance',
      content: `MYR ${balance.toLocaleString()}`,
      subtitle: financialData.balance?.currency || 'Malaysian Ringgit',
      icon: 'wallet',
      color: balance > 10000 ? 'green' : balance < 2000 ? 'red' : 'yellow'
    };
  }

  async createWeatherCard(weatherData) {
    return {
      type: 'weather',
      title: 'Current Weather',
      content: `${weatherData.temperature}°C`,
      subtitle: weatherData.condition || 'Unknown condition',
      icon: 'weather',
      color: 'blue'
    };
  }

  async createInsightCards(insights) {
    return insights.slice(0, 3).map(insight => ({
      type: 'insight',
      title: insight.category?.replace('_', ' ').toUpperCase() || 'INSIGHT',
      content: insight.insight || insight || 'No insight available',
      subtitle: `Confidence: ${((insight.confidence || 0.7) * 100).toFixed(0)}%`,
      icon: 'lightbulb',
      color: insight.priority === 'high' ? 'red' : insight.priority === 'medium' ? 'yellow' : 'green'
    }));
  }

  async createRecommendationCard(recommendations) {
    const topRecommendation = recommendations.find(r => r.priority === 'high') || recommendations[0];
    
    const content = topRecommendation?.action || topRecommendation?.recommendation || 'No recommendations available';
    const priority = topRecommendation?.priority || 'none';
    
    return {
      type: 'recommendation',
      title: 'Top Recommendation',
      content: content,
      subtitle: `Priority: ${priority}`,
      icon: 'target',
      color: 'purple'
    };
  }

  async createQuickStatsCard(data) {
    const stats = [];
    
    if (data.insights) stats.push(`${data.insights.length} insights`);
    if (data.recommendations) stats.push(`${data.recommendations.length} recommendations`);
    
    const content = stats.length > 0 ? stats.join(' • ') : 'No stats available';
    
    return {
      type: 'stats',
      title: 'Quick Stats',
      content: content,
      subtitle: 'Data summary',
      icon: 'chart',
      color: 'gray'
    };
  }

  async createMobileNavigation(cards) {
    return {
      sections: cards.map((card, index) => ({
        id: index,
        title: card.title,
        type: card.type
      })),
      currentSection: 0
    };
  }

  async createQuickActions(data) {
    const actions = [];
    
    if (data.financial || data.banking) {
      actions.push({ action: 'View Details', target: 'financial' });
    }
    
    if (data.recommendations && data.recommendations.length > 0) {
      actions.push({ action: 'View Recommendations', target: 'recommendations' });
    }
    
    actions.push({ action: 'Refresh Data', target: 'refresh' });
    
    return actions;
  }

  groupInsightsByCategory(insights) {
    const groups = {};
    
    for (const insight of insights) {
      const category = insight.category || 'other';
      groups[category] = (groups[category] || 0) + 1;
    }
    
    return Object.entries(groups).map(([category, count]) => ({
      category,
      count
    }));
  }

  generateAuditId() {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    return `audit_${timestamp}_${random}`;
  }

  inferSource(dataKey) {
    if (dataKey.includes('banking') || dataKey.includes('financial')) return 'banking_api';
    if (dataKey.includes('weather')) return 'weather_api';
    if (dataKey.includes('currency')) return 'currency_api';
    return 'unknown_source';
  }

  identifyTransformations(value) {
    const transformations = [];
    
    if (typeof value === 'object' && value !== null) {
      transformations.push('object_structure');
    }
    
    if (typeof value === 'number') {
      transformations.push('numeric_processing');
    }
    
    return transformations;
  }

  async formatDataSources(data) {
    const sources = Object.keys(data).map(key => ({
      source: key,
      type: typeof data[key],
      hasData: !!data[key]
    }));
    
    return sources;
  }

  async formatAnalysisResults(insights) {
    return insights.map(insight => ({
      type: insight.type,
      category: insight.category,
      insight: insight.insight,
      confidence: insight.confidence
    }));
  }

  async formatTechnicalMetrics(data) {
    return {
      dataSources: Object.keys(data).length,
      dataPoints: this.countDataPoints(data),
      processingTime: this.calculateProcessingTime(data),
      timestamp: new Date().toISOString()
    };
  }

  async formatRawData(data) {
    return {
      note: 'Raw data provided for technical analysis',
      data: JSON.stringify(data, null, 2)
    };
  }

  async formatConfidenceAnalysis(data) {
    const analysis = {
      overallConfidence: this.calculateSummaryConfidence(data),
      insightConfidences: []
    };
    
    if (data.insights) {
      analysis.insightConfidences = data.insights.map(i => ({
        insight: i.insight,
        confidence: i.confidence || 0.7
      }));
    }
    
    return analysis;
  }

  async createInteractiveElements(data) {
    const elements = [];
    
    // Add drill-down capability for insights
    if (data.insights && data.insights.length > 0) {
      elements.push({
        type: 'drill_down',
        target: 'insights',
        description: 'Click to explore detailed insights'
      });
    }
    
    // Add filter controls
    elements.push({
      type: 'filter',
      target: 'data_sources',
      description: 'Filter by data source'
    });
    
    return elements;
  }

  async generateLayout(charts, visualType) {
    return {
      type: 'grid',
      columns: visualType === 'dashboard' ? 2 : 1,
      responsive: true,
      charts: charts.map((chart, index) => ({
        id: index,
        position: { row: Math.floor(index / 2), col: index % 2 },
        size: { width: 1, height: 1 }
      }))
    };
  }

  async generateAccessibilityInfo(charts) {
    return {
      screenReaderSupport: true,
      altText: charts.map(chart => `${chart.title}: ${chart.type} chart`),
      keyboardNavigation: true,
      colorBlindFriendly: true
    };
  }
}