import { logger } from '../utils/logger.js';

/**
 * Context Fusion Engine - Phase 4.9 Checkpoint 3
 * Understands relationships between different data types and applies business logic
 */
export class ContextFusionEngine {
  constructor() {
    this.relationshipRules = this.initializeRelationshipRules();
    this.businessRules = this.initializeBusinessRules();
    this.contextProcessors = this.initializeContextProcessors();
    
    logger.info('Context Fusion Engine initialized');
  }

  /**
   * Detect relationships between different data types
   */
  async detectRelationships(dataItems) {
    try {
      logger.debug('Detecting relationships', { 
        itemCount: dataItems.length,
        types: dataItems.map(item => item.type)
      });
      
      const relationships = [];
      
      // Compare each pair of data items
      for (let i = 0; i < dataItems.length; i++) {
        for (let j = i + 1; j < dataItems.length; j++) {
          const item1 = dataItems[i];
          const item2 = dataItems[j];
          
          const relationship = await this.analyzeRelationship(item1, item2);
          if (relationship) {
            relationships.push(relationship);
          }
        }
      }
      
      // Sort by relationship strength
      relationships.sort((a, b) => b.strength - a.strength);
      
      logger.info('Relationship detection completed', {
        relationshipsFound: relationships.length,
        strongRelationships: relationships.filter(r => r.strength > 0.7).length
      });
      
      return relationships;
      
    } catch (error) {
      logger.error('Relationship detection failed', { error: error.message });
      throw error;
    }
  }

  /**
   * Fuse data with contextual information
   */
  async fuseWithContext(dataItems, context) {
    try {
      logger.debug('Fusing data with context', {
        dataItems: dataItems.length,
        contextKeys: Object.keys(context)
      });
      
      // Analyze each data item with context
      const contextualizedItems = [];
      for (const item of dataItems) {
        const contextualItem = await this.contextualizeData(item, context);
        contextualizedItems.push(contextualItem);
      }
      
      // Generate contextual insights
      const contextualInsights = await this.generateContextualInsights(
        contextualizedItems,
        context
      );
      
      // Apply temporal context
      const temporalInsights = await this.applyTemporalContext(
        contextualizedItems,
        context.time || { hour: new Date().getHours(), dayOfWeek: new Date().getDay() }
      );
      
      // Apply location context
      const locationInsights = await this.applyLocationContext(
        contextualizedItems,
        context.location || { city: 'Unknown', country: 'Unknown' }
      );
      
      const fusedResult = {
        contextualizedData: contextualizedItems,
        contextualInsights: [
          ...contextualInsights,
          ...temporalInsights,
          ...locationInsights
        ],
        context,
        fusionMetrics: {
          dataItemsProcessed: dataItems.length,
          insightsGenerated: contextualInsights.length + temporalInsights.length + locationInsights.length,
          contextFactorsApplied: Object.keys(context).length
        },
        fusedAt: new Date().toISOString()
      };
      
      logger.info('Context fusion completed', {
        itemsProcessed: dataItems.length,
        insights: fusedResult.contextualInsights.length,
        contextFactors: Object.keys(context).length
      });
      
      return fusedResult;
      
    } catch (error) {
      logger.error('Context fusion failed', { error: error.message });
      throw error;
    }
  }

  /**
   * Apply business logic to fused data
   */
  async applyBusinessLogic(fusedData, businessRules = null) {
    try {
      logger.debug('Applying business logic', {
        rulesCount: businessRules?.length || this.businessRules.length
      });
      
      const rulesToApply = businessRules || this.businessRules;
      const recommendations = [];
      const validations = [];
      const transformations = [];
      
      for (const rule of rulesToApply) {
        try {
          const ruleResult = await this.evaluateBusinessRule(rule, fusedData);
          
          if (ruleResult.triggered) {
            switch (rule.action) {
              case 'recommend':
                recommendations.push({
                  rule: rule.rule,
                  recommendation: ruleResult.result,
                  confidence: ruleResult.confidence,
                  priority: rule.priority || 'medium'
                });
                break;
                
              case 'validate':
                validations.push({
                  rule: rule.rule,
                  validation: ruleResult.result,
                  passed: ruleResult.passed,
                  severity: rule.severity || 'warning'
                });
                break;
                
              case 'transform':
                transformations.push({
                  rule: rule.rule,
                  transformation: ruleResult.result,
                  affectedData: ruleResult.affectedData
                });
                break;
            }
          }
        } catch (ruleError) {
          logger.warn('Business rule evaluation failed', {
            rule: rule.rule,
            error: ruleError.message
          });
        }
      }
      
      const businessLogicResult = {
        recommendations,
        validations,
        transformations,
        rulesEvaluated: rulesToApply.length,
        rulesTriggered: recommendations.length + validations.length + transformations.length,
        appliedAt: new Date().toISOString()
      };
      
      logger.info('Business logic application completed', {
        rulesEvaluated: businessLogicResult.rulesEvaluated,
        rulesTriggered: businessLogicResult.rulesTriggered,
        recommendations: recommendations.length
      });
      
      return businessLogicResult;
      
    } catch (error) {
      logger.error('Business logic application failed', { error: error.message });
      throw error;
    }
  }

  /**
   * Analyze relationship between two data items
   */
  async analyzeRelationship(item1, item2) {
    const type1 = item1.type;
    const type2 = item2.type;
    
    // Check if we have a rule for this type combination
    const ruleKey = [type1, type2].sort().join('_');
    const reverseRuleKey = [type2, type1].sort().join('_');
    
    const rule = this.relationshipRules[ruleKey] || this.relationshipRules[reverseRuleKey];
    
    if (!rule) {
      return null; // No relationship rule defined
    }
    
    // Apply the relationship rule
    const relationship = await rule.analyze(item1.data, item2.data);
    
    if (relationship) {
      return {
        type1,
        type2,
        relationshipType: rule.type,
        strength: relationship.strength,
        description: relationship.description,
        connections: relationship.connections,
        bidirectional: rule.bidirectional || false
      };
    }
    
    return null;
  }

  /**
   * Contextualize individual data item
   */
  async contextualizeData(dataItem, context) {
    const processor = this.contextProcessors[dataItem.source] || this.contextProcessors.default;
    
    const contextualizedItem = {
      ...dataItem,
      contextualMetadata: {
        originalData: dataItem.data,
        contextApplied: Object.keys(context),
        processedBy: processor.name
      }
    };
    
    // Apply context-specific processing
    const processingResult = await processor.process(dataItem.data, context);
    
    contextualizedItem.contextualData = processingResult.data;
    contextualizedItem.contextualInsights = processingResult.insights;
    contextualizedItem.confidence = processingResult.confidence;
    
    return contextualizedItem;
  }

  /**
   * Generate contextual insights from data items and context
   */
  async generateContextualInsights(contextualizedItems, context) {
    const insights = [];
    
    try {
      // Time-based insights
      if (context.time) {
        const hour = context.time.hour || new Date().getHours();
        
        if (hour >= 9 && hour <= 17) {
          insights.push({
            type: 'temporal',
            category: 'business_hours',
            insight: 'Data accessed during business hours - full services available',
            relevantData: contextualizedItems.map(item => item.source),
            confidence: 0.9
          });
        }
        
        if (context.time.dayOfWeek === 'friday' || context.time.dayOfWeek === 5) {
          insights.push({
            type: 'temporal',
            category: 'weekend_planning',
            insight: 'End of week - good time for financial planning and expense review',
            relevantData: contextualizedItems.filter(item => item.source.includes('banking')).map(item => item.source),
            confidence: 0.7
          });
        }
      }
      
      // Location-based insights
      if (context.location) {
        if (context.location.city === 'Kuala Lumpur') {
          insights.push({
            type: 'location',
            category: 'local_context',
            insight: 'KL-based financial data - local banking and weather conditions apply',
            relevantData: contextualizedItems.map(item => item.source),
            confidence: 0.8
          });
        }
      }
      
      // User preference insights
      if (context.preferences) {
        if (context.preferences.currency && context.preferences.currency !== 'MYR') {
          const bankingItems = contextualizedItems.filter(item => 
            item.source.includes('banking') || item.source.includes('financial')
          );
          
          if (bankingItems.length > 0) {
            insights.push({
              type: 'preference',
              category: 'currency_preference',
              insight: `User prefers ${context.preferences.currency} - consider currency conversion for financial data`,
              relevantData: bankingItems.map(item => item.source),
              confidence: 0.85
            });
          }
        }
      }
      
      // Cross-item contextual insights
      const bankingItems = contextualizedItems.filter(item => item.source.includes('banking'));
      const weatherItems = contextualizedItems.filter(item => item.source.includes('weather'));
      
      if (bankingItems.length > 0 && weatherItems.length > 0) {
        insights.push({
          type: 'cross_domain',
          category: 'spending_weather',
          insight: 'Weather conditions may influence spending patterns - consider seasonal budgeting',
          relevantData: [...bankingItems.map(item => item.source), ...weatherItems.map(item => item.source)],
          confidence: 0.6
        });
      }
      
    } catch (error) {
      logger.warn('Contextual insight generation encountered error', { error: error.message });
    }
    
    return insights;
  }

  /**
   * Apply temporal context to data
   */
  async applyTemporalContext(contextualizedItems, timeContext) {
    const temporalInsights = [];
    
    const hour = timeContext.hour || new Date().getHours();
    const dayOfWeek = timeContext.dayOfWeek || new Date().getDay();
    
    // Morning insights (6-12)
    if (hour >= 6 && hour < 12) {
      temporalInsights.push({
        type: 'temporal',
        category: 'morning',
        insight: 'Morning data access - good time for planning daily expenses',
        timeFrame: 'morning',
        confidence: 0.7
      });
    }
    
    // Afternoon insights (12-18)
    else if (hour >= 12 && hour < 18) {
      temporalInsights.push({
        type: 'temporal',
        category: 'afternoon',
        insight: 'Afternoon review - check spending and adjust for rest of day',
        timeFrame: 'afternoon',
        confidence: 0.7
      });
    }
    
    // Evening insights (18-22)
    else if (hour >= 18 && hour < 22) {
      temporalInsights.push({
        type: 'temporal',
        category: 'evening',
        insight: 'Evening summary - review day\'s financial activities',
        timeFrame: 'evening',
        confidence: 0.8
      });
    }
    
    // Weekend insights
    if (dayOfWeek === 0 || dayOfWeek === 6) { // Sunday or Saturday
      temporalInsights.push({
        type: 'temporal',
        category: 'weekend',
        insight: 'Weekend spending patterns may differ - leisure and entertainment focus',
        timeFrame: 'weekend',
        confidence: 0.6
      });
    }
    
    return temporalInsights;
  }

  /**
   * Apply location context to data
   */
  async applyLocationContext(contextualizedItems, locationContext) {
    const locationInsights = [];
    
    const city = locationContext.city || 'Unknown';
    const country = locationContext.country || 'Unknown';
    
    // Malaysia-specific insights
    if (country === 'Malaysia') {
      locationInsights.push({
        type: 'location',
        category: 'country',
        insight: 'Malaysian financial context - MYR currency, local banking regulations apply',
        location: { city, country },
        confidence: 0.9
      });
      
      // City-specific insights
      if (city === 'Kuala Lumpur') {
        locationInsights.push({
          type: 'location',
          category: 'city',
          insight: 'KL urban context - higher cost of living, diverse spending opportunities',
          location: { city, country },
          confidence: 0.8
        });
      }
    }
    
    // Weather context based on location
    const weatherItems = contextualizedItems.filter(item => 
      item.source.includes('weather') || item.data.temperature !== undefined
    );
    
    if (weatherItems.length > 0 && city !== 'Unknown') {
      locationInsights.push({
        type: 'location',
        category: 'weather_location',
        insight: `Weather data for ${city} - local conditions affect spending and activity patterns`,
        location: { city, country },
        confidence: 0.7
      });
    }
    
    return locationInsights;
  }

  /**
   * Evaluate a business rule against fused data
   */
  async evaluateBusinessRule(rule, fusedData) {
    try {
      // Extract relevant data based on rule conditions
      const relevantData = this.extractRelevantData(fusedData, rule.dataRequired || []);
      
      // Evaluate rule condition
      const conditionMet = await this.evaluateCondition(rule.condition, relevantData);
      
      if (!conditionMet) {
        return { triggered: false };
      }
      
      // Execute rule action
      const actionResult = await this.executeRuleAction(rule, relevantData);
      
      return {
        triggered: true,
        result: actionResult.result,
        confidence: actionResult.confidence || 0.8,
        affectedData: relevantData
      };
      
    } catch (error) {
      logger.warn('Business rule evaluation failed', { 
        rule: rule.rule, 
        error: error.message 
      });
      return { triggered: false, error: error.message };
    }
  }

  /**
   * Initialize relationship rules
   */
  initializeRelationshipRules() {
    return {
      banking_weather: {
        type: 'influence',
        bidirectional: false,
        analyze: async (bankingData, weatherData) => {
          const strength = 0.6; // Medium strength relationship
          
          return {
            strength,
            description: 'Weather conditions may influence spending patterns',
            connections: [
              { from: 'weather.temperature', to: 'banking.spending', type: 'influences' },
              { from: 'weather.condition', to: 'banking.activity', type: 'affects' }
            ]
          };
        }
      },
      
      banking_currency: {
        type: 'conversion',
        bidirectional: true,
        analyze: async (bankingData, currencyData) => {
          const hasBalance = bankingData.balance !== undefined;
          const hasRates = currencyData.rates !== undefined;
          
          if (hasBalance && hasRates) {
            return {
              strength: 0.9,
              description: 'Banking amounts can be converted using currency rates',
              connections: [
                { from: 'banking.balance', to: 'currency.rates', type: 'convertible' }
              ]
            };
          }
          
          return null;
        }
      },
      
      weather_currency: {
        type: 'correlation',
        bidirectional: false,
        analyze: async (weatherData, currencyData) => {
          return {
            strength: 0.3,
            description: 'Weather may affect economic activity and currency fluctuations',
            connections: [
              { from: 'weather.condition', to: 'currency.volatility', type: 'correlates' }
            ]
          };
        }
      }
    };
  }

  /**
   * Initialize business rules
   */
  initializeBusinessRules() {
    return [
      {
        rule: 'high_balance_investment',
        condition: 'banking.balance > 20000',
        action: 'recommend',
        priority: 'medium',
        dataRequired: ['banking'],
        result: 'Consider investment opportunities for excess funds'
      },
      
      {
        rule: 'low_balance_warning',
        condition: 'banking.balance < 1000',
        action: 'validate',
        severity: 'high',
        dataRequired: ['banking'],
        result: 'Low balance detected - review expenses'
      },
      
      {
        rule: 'hot_weather_spending',
        condition: 'weather.temperature > 32',
        action: 'recommend',
        priority: 'low',
        dataRequired: ['weather', 'banking'],
        result: 'Budget for increased cooling costs during hot weather'
      },
      
      {
        rule: 'currency_conversion_opportunity',
        condition: 'banking.balance > 5000 AND currency.rates.USD > 0',
        action: 'recommend',
        priority: 'low',
        dataRequired: ['banking', 'currency'],
        result: 'Consider currency diversification with current favorable rates'
      }
    ];
  }

  /**
   * Initialize context processors
   */
  initializeContextProcessors() {
    return {
      banking: {
        name: 'Banking Context Processor',
        process: async (data, context) => ({
          data: {
            ...data,
            contextualizedBalance: this.contextualizeBalance(data.balance, context),
            timeOfAccess: context.time || {}
          },
          insights: [`Banking data accessed in ${context.location?.city || 'unknown location'}`],
          confidence: 0.9
        })
      },
      
      weather: {
        name: 'Weather Context Processor',
        process: async (data, context) => ({
          data: {
            ...data,
            localContext: `Weather for ${context.location?.city || 'unknown location'}`,
            seasonalContext: this.determineSeasonalContext(data.temperature)
          },
          insights: [`Weather data relevant for ${context.location?.city || 'current location'}`],
          confidence: 0.8
        })
      },
      
      default: {
        name: 'Default Context Processor',
        process: async (data, context) => ({
          data,
          insights: ['Standard context processing applied'],
          confidence: 0.7
        })
      }
    };
  }

  /**
   * Fuse multiple API responses with contextual intelligence
   */
  async fuseResponses(apiResponses, options = {}) {
    try {
      logger.debug('Fusing API responses', {
        responseCount: apiResponses.length,
        fusionType: options.fusionType || 'contextual'
      });

      const fusionType = options.fusionType || 'contextual';
      const context = options.context || {};

      // Normalize responses to a common format
      const normalizedData = apiResponses.map((response, index) => ({
        id: `response_${index}`,
        type: this.detectResponseType(response),
        source: response.operation || `api_${index}`,
        data: response.data || response,
        success: response.success !== false,
        metadata: {
          operation: response.operation,
          timestamp: new Date().toISOString()
        }
      }));

      // Filter out failed responses
      const validData = normalizedData.filter(item => item.success);

      if (validData.length === 0) {
        return {
          success: false,
          error: 'No valid responses to fuse',
          fusionType,
          responseCount: 0
        };
      }

      // Detect relationships between data items
      const relationships = await this.detectRelationships(validData);

      // Apply contextual processing
      const contextualizedData = [];
      for (const item of validData) {
        const processor = this.contextProcessors[item.type] || this.contextProcessors.default;
        const processed = await processor.process(item.data, context);
        
        contextualizedData.push({
          ...item,
          contextualizedData: processed.data,
          insights: processed.insights,
          confidence: processed.confidence
        });
      }

      // Generate fusion insights based on type
      let fusionInsights = [];
      switch (fusionType) {
        case 'contextual':
          fusionInsights = await this.generateContextualInsights(contextualizedData, relationships);
          break;
        case 'analytical':
          fusionInsights = await this.generateAnalyticalInsights(contextualizedData, relationships);
          break;
        case 'predictive':
          fusionInsights = await this.generatePredictiveInsights(contextualizedData, relationships);
          break;
        default:
          fusionInsights = await this.generateContextualInsights(contextualizedData, relationships);
      }

      // Apply business rules
      const businessRuleResults = [];
      for (const rule of this.businessRules) {
        const ruleResult = await this.evaluateBusinessRule(rule, {
          contextualizedData,
          relationships
        });
        if (ruleResult.triggered) {
          businessRuleResults.push(ruleResult);
        }
      }

      const fusedResult = {
        success: true,
        fusionType,
        responseCount: validData.length,
        contextualizedData,
        relationships,
        fusionInsights,
        businessRuleResults,
        metadata: {
          fusedAt: new Date().toISOString(),
          processingTime: Date.now() - Date.now(), // Will be calculated properly
          confidence: this.calculateOverallConfidence(contextualizedData, fusionInsights)
        }
      };

      logger.info('Response fusion completed', {
        fusionType,
        responseCount: validData.length,
        relationshipsFound: relationships.length,
        insightsGenerated: fusionInsights.length,
        businessRulesTriggered: businessRuleResults.length
      });

      return fusedResult;

    } catch (error) {
      logger.error('Response fusion failed', { error: error.message });
      return {
        success: false,
        error: error.message,
        fusionType: options.fusionType || 'contextual',
        responseCount: 0
      };
    }
  }

  /**
   * Detect the type of API response
   */
  detectResponseType(response) {
    const data = response.data || response;
    const operation = response.operation || '';

    // Check by operation name
    if (operation.includes('weather') || operation.includes('Weather')) return 'weather';
    if (operation.includes('balance') || operation.includes('Balance') || operation.includes('banking')) return 'banking';
    if (operation.includes('currency') || operation.includes('exchange')) return 'currency';
    if (operation.includes('expense') || operation.includes('spending')) return 'expenses';

    // Check by data structure
    if (data.temperature !== undefined || data.weather !== undefined) return 'weather';
    if (data.balance !== undefined || data.accountNumber !== undefined) return 'banking';
    if (data.rates !== undefined || data.exchange !== undefined) return 'currency';
    if (data.expenses !== undefined || data.transactions !== undefined) return 'expenses';

    return 'unknown';
  }

  /**
   * Generate contextual insights from fused data
   */
  async generateContextualInsights(contextualizedData, relationships) {
    const insights = [];

    // Add relationship-based insights
    for (const relationship of relationships) {
      if (relationship.strength > 0.6) {
        insights.push({
          type: 'relationship',
          category: relationship.type,
          insight: relationship.description,
          strength: relationship.strength,
          confidence: 0.8
        });
      }
    }

    // Add data combination insights
    const hasWeather = contextualizedData.some(item => item.type === 'weather');
    const hasBanking = contextualizedData.some(item => item.type === 'banking');
    
    if (hasWeather && hasBanking) {
      insights.push({
        type: 'combination',
        category: 'weather_financial',
        insight: 'Weather conditions may influence your spending patterns and financial decisions',
        confidence: 0.7
      });
    }

    return insights;
  }

  /**
   * Generate analytical insights
   */
  async generateAnalyticalInsights(contextualizedData, relationships) {
    const insights = [];

    // Calculate data correlations
    const correlations = this.calculateDataCorrelations(contextualizedData);
    
    for (const correlation of correlations) {
      if (correlation.strength > 0.5) {
        insights.push({
          type: 'analytical',
          category: 'correlation',
          insight: `Strong correlation detected between ${correlation.field1} and ${correlation.field2}`,
          strength: correlation.strength,
          confidence: 0.8
        });
      }
    }

    return insights;
  }

  /**
   * Generate predictive insights
   */
  async generatePredictiveInsights(contextualizedData, relationships) {
    const insights = [];

    // Simple predictive insights based on patterns
    const weatherData = contextualizedData.find(item => item.type === 'weather');
    const bankingData = contextualizedData.find(item => item.type === 'banking');

    if (weatherData && bankingData) {
      const temperature = weatherData.contextualizedData?.temperature || weatherData.data?.temperature;
      
      if (temperature > 30) {
        insights.push({
          type: 'predictive',
          category: 'spending_forecast',
          insight: 'Hot weather may increase cooling costs and outdoor activity spending in the next few days',
          confidence: 0.6
        });
      }
    }

    return insights;
  }

  /**
   * Calculate overall confidence score
   */
  calculateOverallConfidence(contextualizedData, fusionInsights) {
    const dataConfidences = contextualizedData.map(item => item.confidence || 0.7);
    const insightConfidences = fusionInsights.map(insight => insight.confidence || 0.7);
    
    const allConfidences = [...dataConfidences, ...insightConfidences];
    
    if (allConfidences.length === 0) return 0.5;
    
    return allConfidences.reduce((sum, conf) => sum + conf, 0) / allConfidences.length;
  }

  /**
   * Calculate correlations between data fields
   */
  calculateDataCorrelations(contextualizedData) {
    // Simple correlation analysis (would be more sophisticated in production)
    const correlations = [];
    
    // This is a placeholder - real correlation analysis would be more complex
    if (contextualizedData.length >= 2) {
      correlations.push({
        field1: contextualizedData[0].type,
        field2: contextualizedData[1].type,
        strength: 0.6,
        type: 'positive'
      });
    }
    
    return correlations;
  }

  /**
   * Helper methods
   */
  contextualizeBalance(balance, context) {
    if (!balance || typeof balance !== 'object') return balance;
    
    const contextualizedBalance = { ...balance };
    
    // Add purchasing power context based on location
    if (context.location?.city === 'Kuala Lumpur') {
      contextualizedBalance.purchasingPowerContext = 'Urban Malaysia - higher cost of living';
    }
    
    return contextualizedBalance;
  }

  determineSeasonalContext(temperature) {
    if (temperature > 30) return 'hot_season';
    if (temperature < 20) return 'cool_season';
    return 'moderate_season';
  }

  extractRelevantData(fusedData, requiredSources) {
    const relevantData = {};
    
    for (const source of requiredSources) {
      if (fusedData.contextualizedData) {
        const item = fusedData.contextualizedData.find(item => 
          item.source.includes(source) || item.type === source
        );
        if (item) {
          relevantData[source] = item.data;
        }
      }
    }
    
    return relevantData;
  }

  async evaluateCondition(condition, data) {
    try {
      // Simple condition evaluation (in production, use a proper expression evaluator)
      
      // Handle balance conditions
      if (condition.includes('banking.balance')) {
        const balance = data.banking?.balance?.amount || data.banking?.balance || 0;
        const conditionValue = parseFloat(condition.split(/[><]/)[1]);
        
        if (condition.includes('>')) {
          return balance > conditionValue;
        } else if (condition.includes('<')) {
          return balance < conditionValue;
        }
      }
      
      // Handle temperature conditions
      if (condition.includes('weather.temperature')) {
        const temperature = data.weather?.temperature || 0;
        const conditionValue = parseFloat(condition.split(/[><]/)[1]);
        
        if (condition.includes('>')) {
          return temperature > conditionValue;
        } else if (condition.includes('<')) {
          return temperature < conditionValue;
        }
      }
      
      // Handle AND conditions
      if (condition.includes(' AND ')) {
        const parts = condition.split(' AND ');
        const results = await Promise.all(
          parts.map(part => this.evaluateCondition(part.trim(), data))
        );
        return results.every(result => result);
      }
      
      return false;
      
    } catch (error) {
      logger.warn('Condition evaluation failed', { condition, error: error.message });
      return false;
    }
  }

  async executeRuleAction(rule, relevantData) {
    return {
      result: rule.result,
      confidence: 0.8,
      executedAt: new Date().toISOString()
    };
  }
}