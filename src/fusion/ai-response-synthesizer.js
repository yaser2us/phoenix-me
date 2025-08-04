import { logger } from '../utils/logger.js';

/**
 * AI Response Synthesizer - Phase 4.9 Checkpoint 3
 * Intelligently merges data from multiple API responses into coherent insights
 */
export class AiResponseSynthesizer {
  constructor() {
    this.synthesisStrategies = this.initializeSynthesisStrategies();
    this.confidenceThresholds = {
      high: 0.8,
      medium: 0.6,
      low: 0.4
    };
    
    logger.info('AI Response Synthesizer initialized');
  }

  /**
   * Merge multiple API responses into unified data structure
   */
  async mergeResponses(responses, options = {}) {
    try {
      logger.debug('Merging responses', { 
        responseCount: responses.length,
        successfulResponses: responses.filter(r => r.success).length 
      });
      
      const successfulResponses = responses.filter(r => r.success);
      const failedResponses = responses.filter(r => !r.success);
      
      if (successfulResponses.length === 0) {
        return {
          success: false,
          error: 'No successful responses to merge',
          failedSources: failedResponses.map(r => r.source)
        };
      }
      
      // Merge data from successful responses
      const combinedData = {};
      const sourceMap = {};
      const conflictResolutions = [];
      
      for (const response of successfulResponses) {
        const source = response.source || response.operation || 'unknown';
        
        // Store original data with source attribution
        combinedData[source] = response.data;
        sourceMap[source] = {
          timestamp: response.timestamp || new Date().toISOString(),
          operation: response.operation,
          success: response.success
        };
        
        // Detect and resolve conflicts
        const conflicts = this.detectDataConflicts(combinedData, response.data, source);
        if (conflicts.length > 0) {
          const resolutions = await this.resolveConflicts(conflicts, successfulResponses);
          conflictResolutions.push(...resolutions);
        }
      }
      
      // Calculate merge confidence
      const confidence = this.calculateMergeConfidence(successfulResponses, failedResponses);
      
      const mergedResult = {
        success: true,
        combinedData,
        sourceMap,
        metadata: {
          totalSources: responses.length,
          successfulSources: successfulResponses.length,
          failedSources: failedResponses.length,
          confidence,
          conflictResolutions,
          mergedAt: new Date().toISOString()
        }
      };
      
      logger.info('Response merging completed', {
        successfulSources: successfulResponses.length,
        confidence,
        conflicts: conflictResolutions.length
      });
      
      return mergedResult;
      
    } catch (error) {
      logger.error('Response merging failed', { error: error.message });
      throw error;
    }
  }

  /**
   * Intelligently synthesize responses with domain-specific logic
   */
  async synthesizeIntelligently(responses, synthesisType) {
    try {
      logger.debug('Starting intelligent synthesis', { 
        synthesisType,
        responses: responses.length 
      });
      
      // First, merge the basic responses
      const mergedData = await this.mergeResponses(responses);
      if (!mergedData.success) {
        return mergedData;
      }
      
      // Apply synthesis strategy based on type
      const strategy = this.synthesisStrategies[synthesisType] || this.synthesisStrategies.default;
      const synthesizedResult = await strategy.synthesize(mergedData.combinedData, responses);
      
      // Generate insights based on combined data
      const insights = await this.generateSynthesisInsights(
        mergedData.combinedData, 
        synthesisType
      );
      
      // Create comprehensive result
      const result = {
        success: true,
        synthesisType,
        combinedData: mergedData.combinedData,
        insights,
        synthesizedResult,
        confidence: this.calculateSynthesisConfidence(insights, synthesizedResult),
        recommendations: await this.generateRecommendations(mergedData.combinedData, insights),
        metadata: {
          ...mergedData.metadata,
          synthesisStrategy: strategy.name,
          insightCount: insights.length,
          synthesizedAt: new Date().toISOString()
        }
      };
      
      logger.info('Intelligent synthesis completed', {
        synthesisType,
        insightCount: insights.length,
        confidence: result.confidence
      });
      
      return result;
      
    } catch (error) {
      logger.error('Intelligent synthesis failed', { 
        synthesisType, 
        error: error.message 
      });
      throw error;
    }
  }

  /**
   * Handle partial data when some responses fail
   */
  async handlePartialData(responses) {
    try {
      logger.debug('Handling partial data', { 
        totalResponses: responses.length,
        failedResponses: responses.filter(r => !r.success).length
      });
      
      const successfulResponses = responses.filter(r => r.success);
      const failedResponses = responses.filter(r => !r.success);
      
      if (successfulResponses.length === 0) {
        return {
          success: false,
          error: 'All responses failed',
          availableData: [],
          missingData: failedResponses.map(r => r.source)
        };
      }
      
      // Determine impact of missing data
      const missingDataImpact = await this.assessMissingDataImpact(
        successfulResponses,
        failedResponses
      );
      
      // Generate fallback strategies
      const fallbackStrategies = await this.generateFallbackStrategies(
        successfulResponses,
        failedResponses
      );
      
      // Synthesize available data with adjustments
      const partialSynthesis = await this.synthesizePartialData(
        successfulResponses,
        missingDataImpact
      );
      
      const result = {
        success: true,
        isPartial: true,
        availableData: successfulResponses,
        missingData: failedResponses.map(r => ({ source: r.source, error: r.error })),
        impact: missingDataImpact,
        fallbackStrategies,
        partialSynthesis,
        confidence: this.calculatePartialConfidence(successfulResponses, failedResponses),
        warnings: this.generatePartialDataWarnings(missingDataImpact)
      };
      
      logger.info('Partial data handling completed', {
        availableData: successfulResponses.length,
        missingData: failedResponses.length,
        impact: missingDataImpact.level,
        confidence: result.confidence
      });
      
      return result;
      
    } catch (error) {
      logger.error('Partial data handling failed', { error: error.message });
      throw error;
    }
  }

  /**
   * Detect conflicts between data from different sources
   */
  detectDataConflicts(existingData, newData, source) {
    const conflicts = [];
    
    // Look for overlapping fields with different values
    for (const [existingSource, existingValues] of Object.entries(existingData)) {
      if (existingSource === source) continue;
      
      const overlappingFields = this.findOverlappingFields(existingValues, newData);
      
      for (const field of overlappingFields) {
        const existingValue = this.getNestedValue(existingValues, field);
        const newValue = this.getNestedValue(newData, field);
        
        if (existingValue !== newValue) {
          conflicts.push({
            field,
            existingSource,
            newSource: source,
            existingValue,
            newValue,
            type: 'value_conflict'
          });
        }
      }
    }
    
    return conflicts;
  }

  /**
   * Resolve data conflicts using various strategies
   */
  async resolveConflicts(conflicts, allResponses) {
    const resolutions = [];
    
    for (const conflict of conflicts) {
      let resolution;
      
      // Strategy 1: Trust more recent data
      const existingResponse = allResponses.find(r => r.source === conflict.existingSource);
      const newResponse = allResponses.find(r => r.source === conflict.newSource);
      
      if (newResponse.timestamp > existingResponse.timestamp) {
        resolution = {
          ...conflict,
          resolution: 'use_newer',
          resolvedValue: conflict.newValue,
          reason: 'Newer timestamp'
        };
      }
      // Strategy 2: Trust primary source (banking over weather)
      else if (this.isPrimarySource(conflict.newSource) && !this.isPrimarySource(conflict.existingSource)) {
        resolution = {
          ...conflict,
          resolution: 'use_primary',
          resolvedValue: conflict.newValue,
          reason: 'Primary source takes precedence'
        };
      }
      // Strategy 3: Use average for numeric values
      else if (typeof conflict.existingValue === 'number' && typeof conflict.newValue === 'number') {
        resolution = {
          ...conflict,
          resolution: 'average',
          resolvedValue: (conflict.existingValue + conflict.newValue) / 2,
          reason: 'Averaged conflicting numeric values'
        };
      }
      // Strategy 4: Keep existing by default
      else {
        resolution = {
          ...conflict,
          resolution: 'keep_existing',
          resolvedValue: conflict.existingValue,
          reason: 'Default to existing value'
        };
      }
      
      resolutions.push(resolution);
    }
    
    return resolutions;
  }

  /**
   * Generate insights from synthesized data
   */
  async generateSynthesisInsights(combinedData, synthesisType) {
    const insights = [];
    
    try {
      // Cross-domain insights
      if (combinedData.banking && combinedData.weather) {
        insights.push({
          type: 'cross_domain',
          category: 'financial_weather',
          insight: `Your ${combinedData.banking.balance?.amount || 'balance'} MYR is ready for ${combinedData.weather.condition || 'current weather'} conditions`,
          confidence: 0.8,
          dataPoints: ['banking.balance', 'weather.condition']
        });
      }
      
      if (combinedData.banking && combinedData.currency) {
        const balance = combinedData.banking.balance?.amount || 0;
        const usdRate = combinedData.currency.rates?.USD || 0.21;
        const usdValue = balance * usdRate;
        
        insights.push({
          type: 'currency_conversion',
          category: 'financial',
          insight: `Your MYR ${balance} equals approximately USD ${usdValue.toFixed(2)} at current rates`,
          confidence: 0.9,
          dataPoints: ['banking.balance', 'currency.rates.USD'],
          calculatedValue: usdValue
        });
      }
      
      // Single domain insights
      if (combinedData.banking) {
        const balance = combinedData.banking.balance?.amount || 0;
        if (balance > 10000) {
          insights.push({
            type: 'financial_status',
            category: 'positive',
            insight: 'Strong financial position with substantial savings',
            confidence: 0.85,
            dataPoints: ['banking.balance']
          });
        } else if (balance < 1000) {
          insights.push({
            type: 'financial_status',
            category: 'warning',
            insight: 'Low balance - consider reviewing expenses',
            confidence: 0.9,
            dataPoints: ['banking.balance']
          });
        }
      }
      
      if (combinedData.weather) {
        const temp = combinedData.weather.temperature || 0;
        if (temp > 30) {
          insights.push({
            type: 'weather_advisory',
            category: 'lifestyle',
            insight: 'Hot weather may increase cooling costs and outdoor activity expenses',
            confidence: 0.7,
            dataPoints: ['weather.temperature']
          });
        }
      }
      
      // Synthesis-specific insights
      if (synthesisType === 'financial_weather_overview') {
        insights.push({
          type: 'comprehensive',
          category: 'overview',
          insight: 'Financial and weather data successfully integrated for comprehensive planning',
          confidence: 0.75,
          dataPoints: Object.keys(combinedData)
        });
      }
      
    } catch (error) {
      logger.warn('Insight generation encountered error', { error: error.message });
      
      // Add fallback insight
      insights.push({
        type: 'system',
        category: 'info',
        insight: 'Data successfully combined from multiple sources',
        confidence: 0.6,
        dataPoints: Object.keys(combinedData)
      });
    }
    
    return insights;
  }

  /**
   * Generate recommendations based on combined data
   */
  async generateRecommendations(combinedData, insights) {
    const recommendations = [];
    
    try {
      // Financial recommendations
      if (combinedData.banking) {
        const balance = combinedData.banking.balance?.amount || 0;
        
        if (balance > 15000) {
          recommendations.push({
            type: 'investment',
            priority: 'medium',
            action: 'Consider investment opportunities for excess funds',
            rationale: 'High balance detected',
            impact: 'potential_growth'
          });
        }
        
        if (balance < 2000) {
          recommendations.push({
            type: 'savings',
            priority: 'high',
            action: 'Build emergency fund to 3 months expenses',
            rationale: 'Low balance detected',
            impact: 'financial_security'
          });
        }
      }
      
      // Weather-based recommendations
      if (combinedData.weather && combinedData.banking) {
        const temp = combinedData.weather.temperature || 0;
        const condition = combinedData.weather.condition || '';
        
        if (temp > 32) {
          recommendations.push({
            type: 'expense_planning',
            priority: 'low',
            action: 'Budget for increased cooling costs during hot weather',
            rationale: 'High temperature detected',
            impact: 'cost_management'
          });
        }
        
        if (condition.includes('rain')) {
          recommendations.push({
            type: 'expense_planning',
            priority: 'low',
            action: 'Consider transportation alternatives during rainy weather',
            rationale: 'Rainy conditions may affect travel costs',
            impact: 'cost_optimization'
          });
        }
      }
      
      // Cross-domain recommendations from insights
      const financialWeatherInsights = insights.filter(i => i.type === 'cross_domain');
      if (financialWeatherInsights.length > 0) {
        recommendations.push({
          type: 'holistic_planning',
          priority: 'medium',
          action: 'Use integrated financial and weather data for better planning',
          rationale: 'Multiple data sources available for comprehensive analysis',
          impact: 'improved_decision_making'
        });
      }
      
    } catch (error) {
      logger.warn('Recommendation generation encountered error', { error: error.message });
    }
    
    return recommendations;
  }

  /**
   * Calculate confidence score for merged data
   */
  calculateMergeConfidence(successfulResponses, failedResponses) {
    const totalResponses = successfulResponses.length + failedResponses.length;
    const successRate = successfulResponses.length / totalResponses;
    
    // Base confidence on success rate
    let confidence = successRate;
    
    // Adjust for data quality
    const highQualityResponses = successfulResponses.filter(r => 
      r.data && typeof r.data === 'object' && Object.keys(r.data).length > 0
    );
    
    const qualityFactor = highQualityResponses.length / successfulResponses.length;
    confidence *= qualityFactor;
    
    // Penalize if critical sources failed
    const criticalSources = ['banking', 'balance', 'account'];
    const criticalFailures = failedResponses.filter(r => 
      criticalSources.some(cs => r.source?.includes(cs) || r.operation?.includes(cs))
    );
    
    if (criticalFailures.length > 0) {
      confidence *= 0.8; // 20% penalty for critical failures
    }
    
    return Math.round(confidence * 1000) / 1000; // Round to 3 decimal places
  }

  /**
   * Calculate synthesis confidence
   */
  calculateSynthesisConfidence(insights, synthesizedResult) {
    let confidence = 0.7; // Base confidence
    
    // Higher confidence with more insights
    if (insights.length > 3) confidence += 0.1;
    if (insights.length > 5) confidence += 0.1;
    
    // Higher confidence with high-confidence insights
    const highConfidenceInsights = insights.filter(i => i.confidence > 0.8);
    if (highConfidenceInsights.length > 0) {
      confidence += (highConfidenceInsights.length / insights.length) * 0.1;
    }
    
    // Adjust based on synthesis result quality
    if (synthesizedResult && synthesizedResult.success) {
      confidence += 0.1;
    }
    
    return Math.min(1.0, Math.round(confidence * 1000) / 1000);
  }

  /**
   * Calculate confidence for partial data
   */
  calculatePartialConfidence(successfulResponses, failedResponses) {
    const baseConfidence = this.calculateMergeConfidence(successfulResponses, failedResponses);
    
    // Additional penalty for partial data
    const partialPenalty = failedResponses.length * 0.1;
    
    return Math.max(0.1, baseConfidence - partialPenalty);
  }

  /**
   * Initialize synthesis strategies
   */
  initializeSynthesisStrategies() {
    return {
      financial_overview: {
        name: 'Financial Overview',
        synthesize: async (data) => ({
          success: true,
          overview: 'Comprehensive financial data analysis',
          domains: Object.keys(data)
        })
      },
      
      financial_weather_overview: {
        name: 'Financial Weather Overview',
        synthesize: async (data) => ({
          success: true,
          overview: 'Financial data combined with weather insights',
          financial: data.banking || data.financial,
          environmental: data.weather,
          correlations: ['spending_weather', 'activity_temperature']
        })
      },
      
      comprehensive_overview: {
        name: 'Comprehensive Overview',
        synthesize: async (data) => ({
          success: true,
          overview: 'All available data sources integrated',
          domains: Object.keys(data),
          dataPoints: Object.keys(data).reduce((acc, key) => acc + Object.keys(data[key] || {}).length, 0)
        })
      },
      
      default: {
        name: 'Default Synthesis',
        synthesize: async (data) => ({
          success: true,
          overview: 'Standard data synthesis applied',
          sources: Object.keys(data)
        })
      }
    };
  }

  /**
   * Helper functions
   */
  findOverlappingFields(obj1, obj2) {
    const fields1 = this.getAllFieldPaths(obj1);
    const fields2 = this.getAllFieldPaths(obj2);
    return fields1.filter(field => fields2.includes(field));
  }

  getAllFieldPaths(obj, prefix = '') {
    const paths = [];
    
    for (const [key, value] of Object.entries(obj || {})) {
      const path = prefix ? `${prefix}.${key}` : key;
      paths.push(path);
      
      if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        paths.push(...this.getAllFieldPaths(value, path));
      }
    }
    
    return paths;
  }

  getNestedValue(obj, path) {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }

  isPrimarySource(source) {
    const primarySources = ['banking', 'financial', 'account', 'balance'];
    return primarySources.some(ps => source?.toLowerCase().includes(ps));
  }

  async assessMissingDataImpact(successfulResponses, failedResponses) {
    const totalExpected = successfulResponses.length + failedResponses.length;
    const missingPercentage = (failedResponses.length / totalExpected) * 100;
    
    let level = 'low';
    if (missingPercentage > 50) level = 'high';
    else if (missingPercentage > 25) level = 'medium';
    
    return {
      level,
      percentage: Math.round(missingPercentage),
      missingSources: failedResponses.map(r => r.source),
      criticalMissing: failedResponses.some(r => this.isPrimarySource(r.source))
    };
  }

  async generateFallbackStrategies(successfulResponses, failedResponses) {
    return failedResponses.map(failed => ({
      source: failed.source,
      strategy: 'use_cached_data',
      alternative: 'manual_input',
      confidence: 0.3
    }));
  }

  async synthesizePartialData(successfulResponses, impact) {
    const adjustedData = {};
    
    for (const response of successfulResponses) {
      adjustedData[response.source] = {
        ...response.data,
        _partial: true,
        _confidence: impact.level === 'high' ? 0.4 : 0.7
      };
    }
    
    return {
      data: adjustedData,
      completeness: 1 - (impact.percentage / 100),
      adjustments: [`Synthesis adjusted for ${impact.level} impact from missing data`]
    };
  }

  generatePartialDataWarnings(impact) {
    const warnings = [];
    
    if (impact.level === 'high') {
      warnings.push('High impact: Over 50% of expected data is missing');
    }
    
    if (impact.criticalMissing) {
      warnings.push('Critical data sources are unavailable');
    }
    
    warnings.push(`${impact.percentage}% of expected data is missing`);
    
    return warnings;
  }
}