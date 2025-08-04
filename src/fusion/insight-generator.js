import { logger } from '../utils/logger.js';

/**
 * Insight Generator - Phase 4.9 Checkpoint 3
 * Generates meaningful insights from combined datasets and creates actionable recommendations
 */
export class InsightGenerator {
  constructor() {
    this.insightTemplates = this.initializeInsightTemplates();
    this.trendDetectors = this.initializeTrendDetectors();
    this.riskAssessors = this.initializeRiskAssessors();
    
    logger.info('Insight Generator initialized');
  }

  /**
   * Generate financial insights from combined data
   */
  async generateFinancialInsights(combinedData) {
    try {
      logger.debug('Generating financial insights', {
        dataSources: Object.keys(combinedData)
      });
      
      const insights = [];
      let totalConfidence = 0;
      
      // Balance analysis insights
      if (combinedData.banking || combinedData.financial) {
        const balanceInsights = await this.analyzeBalance(combinedData.banking || combinedData.financial);
        insights.push(...balanceInsights);
        totalConfidence += balanceInsights.reduce((sum, insight) => sum + insight.confidence, 0);
      }
      
      // Spending pattern insights
      if (combinedData.banking?.transactions || combinedData.expenses) {
        const spendingInsights = await this.analyzeSpending(
          combinedData.banking?.transactions || combinedData.expenses
        );
        insights.push(...spendingInsights);
        totalConfidence += spendingInsights.reduce((sum, insight) => sum + insight.confidence, 0);
      }
      
      // Goals progress insights
      if (combinedData.goals) {
        const goalInsights = await this.analyzeGoalProgress(combinedData.goals);
        insights.push(...goalInsights);
        totalConfidence += goalInsights.reduce((sum, insight) => sum + insight.confidence, 0);
      }
      
      // Cross-domain financial insights
      const crossDomainInsights = await this.generateCrossDomainFinancialInsights(combinedData);
      insights.push(...crossDomainInsights);
      totalConfidence += crossDomainInsights.reduce((sum, insight) => sum + insight.confidence, 0);
      
      // Calculate overall confidence
      const overallConfidence = insights.length > 0 ? totalConfidence / insights.length : 0;
      
      // Generate recommendations based on insights
      const recommendations = await this.generateRecommendationsFromInsights(insights);
      
      const result = {
        insights,
        recommendations,
        confidence: Math.round(overallConfidence * 1000) / 1000,
        metadata: {
          insightCount: insights.length,
          dataSources: Object.keys(combinedData),
          analysisTypes: [...new Set(insights.map(i => i.type))],
          generatedAt: new Date().toISOString()
        }
      };
      
      logger.info('Financial insights generated', {
        insightCount: insights.length,
        confidence: result.confidence,
        recommendations: recommendations.length
      });
      
      return result;
      
    } catch (error) {
      logger.error('Financial insight generation failed', { error: error.message });
      throw error;
    }
  }

  /**
   * Analyze trends from historical data
   */
  async analyzeTrends(historicalData, analysisType) {
    try {
      logger.debug('Analyzing trends', {
        dataPoints: historicalData.length,
        analysisType
      });
      
      if (historicalData.length < 2) {
        return {
          trends: [],
          error: 'Insufficient data for trend analysis',
          dataPoints: historicalData.length
        };
      }
      
      const detector = this.trendDetectors[analysisType] || this.trendDetectors.default;
      const trends = await detector.analyze(historicalData);
      
      // Calculate trend strength and direction
      const enrichedTrends = trends.map(trend => ({
        ...trend,
        strength: this.calculateTrendStrength(trend, historicalData),
        direction: this.determineTrendDirection(trend, historicalData),
        reliability: this.assessTrendReliability(trend, historicalData)
      }));
      
      // Sort trends by significance
      enrichedTrends.sort((a, b) => (b.strength * b.reliability) - (a.strength * a.reliability));
      
      const result = {
        trends: enrichedTrends,
        analysisType,
        dataPoints: historicalData.length,
        timeframe: {
          start: historicalData[0]?.date,
          end: historicalData[historicalData.length - 1]?.date
        },
        analyzedAt: new Date().toISOString()
      };
      
      logger.info('Trend analysis completed', {
        analysisType,
        trendsFound: enrichedTrends.length,
        dataPoints: historicalData.length
      });
      
      return result;
      
    } catch (error) {
      logger.error('Trend analysis failed', { analysisType, error: error.message });
      throw error;
    }
  }

  /**
   * Generate actionable recommendations
   */
  async generateRecommendations(situation) {
    try {
      logger.debug('Generating recommendations', {
        situationKeys: Object.keys(situation)
      });
      
      const actions = [];
      let totalPriority = 0;
      
      // Financial recommendations
      if (situation.balance !== undefined) {
        const financialActions = await this.generateFinancialRecommendations(situation);
        actions.push(...financialActions);
        totalPriority += financialActions.reduce((sum, action) => sum + this.getPriorityScore(action.priority), 0);
      }
      
      // Goal-based recommendations
      if (situation.goals) {
        const goalActions = await this.generateGoalRecommendations(situation.goals);
        actions.push(...goalActions);
        totalPriority += goalActions.reduce((sum, action) => sum + this.getPriorityScore(action.priority), 0);
      }
      
      // Weather-influenced recommendations
      if (situation.weather) {
        const weatherActions = await this.generateWeatherRecommendations(situation);
        actions.push(...weatherActions);
        totalPriority += weatherActions.reduce((sum, action) => sum + this.getPriorityScore(action.priority), 0);
      }
      
      // Spending-based recommendations
      if (situation.spending) {
        const spendingActions = await this.generateSpendingRecommendations(situation.spending);
        actions.push(...spendingActions);
        totalPriority += spendingActions.reduce((sum, action) => sum + this.getPriorityScore(action.priority), 0);
      }
      
      // Sort actions by priority and confidence
      actions.sort((a, b) => {
        const scoreA = this.getPriorityScore(a.priority) * (a.confidence || 0.7);
        const scoreB = this.getPriorityScore(b.priority) * (b.confidence || 0.7);
        return scoreB - scoreA;
      });
      
      // Determine overall priority
      const avgPriority = actions.length > 0 ? totalPriority / actions.length : 0;
      let overallPriority = 'low';
      if (avgPriority >= 3) overallPriority = 'high';
      else if (avgPriority >= 2) overallPriority = 'medium';
      
      const result = {
        actions,
        priority: overallPriority,
        urgentActions: actions.filter(a => a.priority === 'high').length,
        totalActions: actions.length,
        generatedAt: new Date().toISOString()
      };
      
      logger.info('Recommendations generated', {
        totalActions: actions.length,
        urgentActions: result.urgentActions,
        priority: overallPriority
      });
      
      return result;
      
    } catch (error) {
      logger.error('Recommendation generation failed', { error: error.message });
      throw error;
    }
  }

  /**
   * Assess risks based on financial data and factors
   */
  async assessRisks(financialData, riskFactors) {
    try {
      logger.debug('Assessing risks', {
        hasFinancialData: !!financialData,
        riskFactorKeys: Object.keys(riskFactors)
      });
      
      const riskAssessments = [];
      
      // Assess each risk factor
      for (const [factorName, assessor] of Object.entries(this.riskAssessors)) {
        try {
          const assessment = await assessor.assess(financialData, riskFactors);
          if (assessment) {
            riskAssessments.push({
              factor: factorName,
              ...assessment
            });
          }
        } catch (assessorError) {
          logger.warn('Risk assessor failed', { 
            factor: factorName, 
            error: assessorError.message 
          });
        }
      }
      
      // Calculate overall risk score
      const riskScore = this.calculateOverallRiskScore(riskAssessments);
      const riskLevel = this.determineRiskLevel(riskScore);
      
      // Generate risk mitigation recommendations
      const mitigationRecommendations = await this.generateRiskMitigationRecommendations(
        riskAssessments,
        riskLevel
      );
      
      const result = {
        riskScore,
        riskLevel,
        assessments: riskAssessments,
        mitigations: mitigationRecommendations,
        factors: Object.keys(riskFactors),
        assessedAt: new Date().toISOString()
      };
      
      logger.info('Risk assessment completed', {
        riskScore,
        riskLevel,
        assessments: riskAssessments.length,
        mitigations: mitigationRecommendations.length
      });
      
      return result;
      
    } catch (error) {
      logger.error('Risk assessment failed', { error: error.message });
      throw error;
    }
  }

  /**
   * Analyze balance and generate balance-related insights
   */
  async analyzeBalance(bankingData) {
    const insights = [];
    
    const balance = bankingData?.balance?.amount || bankingData?.balance || 0;
    const currency = bankingData?.balance?.currency || 'MYR';
    
    if (balance > 50000) {
      insights.push({
        type: 'balance_analysis',
        category: 'high_balance',
        insight: `Excellent financial position with ${currency} ${balance.toLocaleString()}`,
        value: balance,
        confidence: 0.9,
        priority: 'medium'
      });
    } else if (balance > 20000) {
      insights.push({
        type: 'balance_analysis',
        category: 'good_balance',
        insight: `Strong financial position with ${currency} ${balance.toLocaleString()}`,
        value: balance,
        confidence: 0.85,
        priority: 'low'
      });
    } else if (balance > 5000) {
      insights.push({
        type: 'balance_analysis',
        category: 'moderate_balance',
        insight: `Moderate savings level of ${currency} ${balance.toLocaleString()}`,
        value: balance,
        confidence: 0.8,
        priority: 'medium'
      });
    } else if (balance > 1000) {
      insights.push({
        type: 'balance_analysis',
        category: 'low_balance',
        insight: `Low balance of ${currency} ${balance.toLocaleString()} - consider building emergency fund`,
        value: balance,
        confidence: 0.9,
        priority: 'high'
      });
    } else {
      insights.push({
        type: 'balance_analysis',
        category: 'critical_balance',
        insight: `Critical balance level of ${currency} ${balance.toLocaleString()} - immediate attention needed`,
        value: balance,
        confidence: 0.95,
        priority: 'high'
      });
    }
    
    return insights;
  }

  /**
   * Analyze spending patterns
   */
  async analyzeSpending(spendingData) {
    const insights = [];
    
    if (Array.isArray(spendingData)) {
      // Analyze transaction array
      const totalSpending = spendingData
        .filter(tx => tx.amount < 0)
        .reduce((sum, tx) => sum + Math.abs(tx.amount), 0);
      
      insights.push({
        type: 'spending_analysis',
        category: 'total_spending',
        insight: `Total spending: MYR ${totalSpending.toLocaleString()}`,
        value: totalSpending,
        confidence: 0.85,
        priority: 'medium'
      });
      
      // Analyze spending frequency
      if (spendingData.length > 10) {
        insights.push({
          type: 'spending_analysis',
          category: 'high_frequency',
          insight: `High transaction frequency (${spendingData.length} transactions) - monitor for unnecessary spending`,
          value: spendingData.length,
          confidence: 0.7,
          priority: 'medium'
        });
      }
    } else if (typeof spendingData === 'object') {
      // Analyze spending object
      const monthlySpending = spendingData.lastMonth || spendingData.monthly || 0;
      
      if (monthlySpending > 5000) {
        insights.push({
          type: 'spending_analysis',
          category: 'high_spending',
          insight: `High monthly spending of MYR ${monthlySpending.toLocaleString()}`,
          value: monthlySpending,
          confidence: 0.8,
          priority: 'medium'
        });
      }
      
      if (spendingData.category) {
        insights.push({
          type: 'spending_analysis',
          category: 'category_focus',
          insight: `Primary spending category: ${spendingData.category}`,
          value: spendingData.category,
          confidence: 0.75,
          priority: 'low'
        });
      }
    }
    
    return insights;
  }

  /**
   * Analyze goal progress
   */
  async analyzeGoalProgress(goalsData) {
    const insights = [];
    
    if (goalsData.target && goalsData.saved !== undefined) {
      const progress = (goalsData.saved / goalsData.target) * 100;
      
      if (progress >= 90) {
        insights.push({
          type: 'goal_analysis',
          category: 'near_completion',
          insight: `Excellent progress! ${progress.toFixed(1)}% towards your MYR ${goalsData.target.toLocaleString()} goal`,
          value: progress,
          confidence: 0.9,
          priority: 'low'
        });
      } else if (progress >= 50) {
        insights.push({
          type: 'goal_analysis',
          category: 'good_progress',
          insight: `Good progress at ${progress.toFixed(1)}% towards your savings goal`,
          value: progress,
          confidence: 0.85,
          priority: 'medium'
        });
      } else if (progress >= 25) {
        insights.push({
          type: 'goal_analysis',
          category: 'slow_progress',
          insight: `Progress is ${progress.toFixed(1)}% - consider increasing savings rate`,
          value: progress,
          confidence: 0.8,
          priority: 'medium'
        });
      } else {
        insights.push({
          type: 'goal_analysis',
          category: 'needs_attention',
          insight: `Low progress at ${progress.toFixed(1)}% - review goal strategy`,
          value: progress,
          confidence: 0.85,
          priority: 'high'
        });
      }
      
      // Timeline analysis
      if (goalsData.timeline || goalsData.deadline) {
        const remaining = goalsData.target - (goalsData.saved || 0);
        insights.push({
          type: 'goal_analysis',
          category: 'timeline',
          insight: `MYR ${remaining.toLocaleString()} remaining to reach goal by ${goalsData.timeline || goalsData.deadline}`,
          value: remaining,
          confidence: 0.8,
          priority: 'medium'
        });
      }
    }
    
    return insights;
  }

  /**
   * Generate cross-domain financial insights
   */
  async generateCrossDomainFinancialInsights(combinedData) {
    const insights = [];
    
    // Banking + Weather insights
    if (combinedData.banking && combinedData.weather) {
      const balance = combinedData.banking.balance?.amount || 0;
      const temperature = combinedData.weather.temperature || 0;
      
      if (temperature > 30 && balance > 5000) {
        insights.push({
          type: 'cross_domain',
          category: 'weather_financial',
          insight: 'Hot weather ahead - budget for cooling costs while maintaining strong savings',
          confidence: 0.65,
          priority: 'low',
          dataSources: ['banking', 'weather']
        });
      }
    }
    
    // Banking + Currency insights
    if (combinedData.banking && combinedData.currency) {
      const balance = combinedData.banking.balance?.amount || 0;
      const usdRate = combinedData.currency.rates?.USD || 0;
      
      if (balance > 10000 && usdRate > 0) {
        const usdValue = balance * usdRate;
        insights.push({
          type: 'cross_domain',
          category: 'currency_opportunity',
          insight: `Your MYR ${balance.toLocaleString()} equals USD ${usdValue.toFixed(2)} - good for international transactions`,
          confidence: 0.8,
          priority: 'low',
          dataSources: ['banking', 'currency']
        });
      }
    }
    
    // Goals + Banking insights
    if (combinedData.goals && combinedData.banking) {
      const goalTarget = combinedData.goals.target || 0;
      const currentSavings = combinedData.goals.saved || 0;
      const balance = combinedData.banking.balance?.amount || 0;
      
      if (balance > goalTarget) {
        insights.push({
          type: 'cross_domain',
          category: 'goal_achievement',
          insight: 'Your current balance exceeds your savings goal - consider setting a higher target',
          confidence: 0.9,
          priority: 'medium',
          dataSources: ['goals', 'banking']
        });
      }
    }
    
    return insights;
  }

  /**
   * Generate recommendations from insights
   */
  async generateRecommendationsFromInsights(insights) {
    const recommendations = [];
    
    for (const insight of insights) {
      const template = this.insightTemplates[insight.category] || this.insightTemplates.default;
      const recommendation = await template.generateRecommendation(insight);
      
      if (recommendation) {
        recommendations.push({
          basedOn: insight.type,
          category: insight.category,
          action: recommendation.action,
          priority: insight.priority,
          confidence: insight.confidence * 0.9, // Slightly lower confidence for derived recommendations
          rationale: recommendation.rationale || insight.insight
        });
      }
    }
    
    return recommendations;
  }

  /**
   * Initialize insight templates
   */
  initializeInsightTemplates() {
    return {
      high_balance: {
        generateRecommendation: async (insight) => ({
          action: 'Consider diversifying with investments or higher-yield savings',
          rationale: 'High balance provides opportunity for growth'
        })
      },
      
      low_balance: {
        generateRecommendation: async (insight) => ({
          action: 'Build emergency fund by reducing discretionary spending',
          rationale: 'Low balance increases financial risk'
        })
      },
      
      critical_balance: {
        generateRecommendation: async (insight) => ({
          action: 'Immediate expense review and income increase strategies needed',
          rationale: 'Critical balance requires urgent action'
        })
      },
      
      slow_progress: {
        generateRecommendation: async (insight) => ({
          action: 'Increase monthly savings rate by 20% or review goal timeline',
          rationale: 'Current progress rate may not meet goal deadline'
        })
      },
      
      high_spending: {
        generateRecommendation: async (insight) => ({
          action: 'Analyze spending categories and identify reduction opportunities',
          rationale: 'High spending may impact savings goals'
        })
      },
      
      default: {
        generateRecommendation: async (insight) => ({
          action: 'Review financial situation and consider optimization opportunities',
          rationale: 'General financial health maintenance'
        })
      }
    };
  }

  /**
   * Initialize trend detectors
   */
  initializeTrendDetectors() {
    return {
      spending_weather_correlation: {
        analyze: async (data) => {
          const trends = [];
          
          // Analyze spending vs weather correlation
          const spendingWeatherPairs = data.map(d => ({
            spending: d.spending || 0,
            temperature: d.weather === 'hot' ? 35 : d.weather === 'cold' ? 15 : 25
          }));
          
          if (spendingWeatherPairs.length >= 3) {
            // Simple correlation analysis
            const avgSpendingHot = spendingWeatherPairs
              .filter(p => p.temperature > 30)
              .reduce((sum, p, _, arr) => sum + p.spending / arr.length, 0);
            
            const avgSpendingCool = spendingWeatherPairs
              .filter(p => p.temperature < 25)
              .reduce((sum, p, _, arr) => sum + p.spending / arr.length, 0);
            
            if (avgSpendingHot > avgSpendingCool * 1.1) {
              trends.push({
                type: 'correlation',
                description: 'Spending increases during hot weather',
                factor: 'temperature',
                correlation: 'positive'
              });
            }
          }
          
          return trends;
        }
      },
      
      default: {
        analyze: async (data) => {
          const trends = [];
          
          if (data.length >= 3) {
            // Simple trend analysis - increasing/decreasing pattern
            const values = data.map(d => d.balance || d.amount || 0);
            const isIncreasing = values[values.length - 1] > values[0];
            
            trends.push({
              type: 'direction',
              description: isIncreasing ? 'Upward trend detected' : 'Downward trend detected',
              direction: isIncreasing ? 'increasing' : 'decreasing'
            });
          }
          
          return trends;
        }
      }
    };
  }

  /**
   * Initialize risk assessors
   */
  initializeRiskAssessors() {
    return {
      liquidity: {
        assess: async (financialData, riskFactors) => {
          const balance = financialData.banking?.balance?.amount || 0;
          const monthlyExpenses = riskFactors.monthlyExpenses || 3000;
          
          const monthsOfLiquidity = balance / monthlyExpenses;
          
          let riskLevel = 'low';
          let score = 0.2;
          
          if (monthsOfLiquidity < 1) {
            riskLevel = 'high';
            score = 0.8;
          } else if (monthsOfLiquidity < 3) {
            riskLevel = 'medium';
            score = 0.5;
          }
          
          return {
            riskLevel,
            score,
            description: `${monthsOfLiquidity.toFixed(1)} months of liquidity available`,
            impact: 'Cash flow and emergency preparedness'
          };
        }
      },
      
      market: {
        assess: async (financialData, riskFactors) => {
          const marketConditions = riskFactors.marketConditions || {};
          const volatility = marketConditions.volatility || 'low';
          
          let score = 0.3;
          if (volatility === 'high') score = 0.7;
          else if (volatility === 'medium') score = 0.5;
          
          return {
            riskLevel: volatility,
            score,
            description: `Market volatility is ${volatility}`,
            impact: 'Investment and currency exposure'
          };
        }
      }
    };
  }

  /**
   * Helper methods
   */
  getPriorityScore(priority) {
    const scores = { high: 3, medium: 2, low: 1 };
    return scores[priority] || 1;
  }

  calculateTrendStrength(trend, data) {
    // Simple strength calculation based on data consistency
    return data.length >= 5 ? 0.8 : 0.6;
  }

  determineTrendDirection(trend, data) {
    return trend.direction || 'stable';
  }

  assessTrendReliability(trend, data) {
    // Reliability based on data points and consistency
    if (data.length >= 10) return 0.9;
    if (data.length >= 5) return 0.7;
    return 0.5;
  }

  calculateOverallRiskScore(assessments) {
    if (assessments.length === 0) return 0;
    
    const totalScore = assessments.reduce((sum, assessment) => sum + assessment.score, 0);
    return Math.round((totalScore / assessments.length) * 1000) / 1000;
  }

  determineRiskLevel(score) {
    if (score >= 0.7) return 'high';
    if (score >= 0.4) return 'medium';
    return 'low';
  }

  async generateRiskMitigationRecommendations(assessments, riskLevel) {
    const recommendations = [];
    
    for (const assessment of assessments) {
      if (assessment.riskLevel === 'high') {
        recommendations.push({
          factor: assessment.factor,
          action: `Address ${assessment.factor} risk immediately`,
          priority: 'high',
          impact: assessment.impact
        });
      }
    }
    
    if (riskLevel === 'high') {
      recommendations.push({
        factor: 'overall',
        action: 'Implement comprehensive risk management strategy',
        priority: 'high',
        impact: 'Overall financial stability'
      });
    }
    
    return recommendations;
  }

  async generateFinancialRecommendations(situation) {
    const actions = [];
    const balance = situation.balance || 0;
    
    if (balance > 30000) {
      actions.push({
        action: 'Explore investment opportunities',
        priority: 'medium',
        confidence: 0.8,
        category: 'investment'
      });
    } else if (balance < 2000) {
      actions.push({
        action: 'Build emergency fund urgently',
        priority: 'high',
        confidence: 0.9,
        category: 'emergency_fund'
      });
    }
    
    return actions;
  }

  async generateGoalRecommendations(goals) {
    const actions = [];
    
    if (goals.target && goals.saved !== undefined) {
      const progress = (goals.saved / goals.target) * 100;
      
      if (progress < 30) {
        actions.push({
          action: 'Increase monthly savings contribution',
          priority: 'high',
          confidence: 0.85,
          category: 'goal_acceleration'
        });
      }
    }
    
    return actions;
  }

  async generateWeatherRecommendations(situation) {
    const actions = [];
    
    if (situation.weather?.temperature > 32) {
      actions.push({
        action: 'Budget for increased cooling costs',
        priority: 'low',
        confidence: 0.7,
        category: 'seasonal_budgeting'
      });
    }
    
    return actions;
  }

  async generateSpendingRecommendations(spending) {
    const actions = [];
    
    if (spending.lastMonth > 5000) {
      actions.push({
        action: 'Review and categorize monthly expenses',
        priority: 'medium',
        confidence: 0.8,
        category: 'expense_management'
      });
    }
    
    return actions;
  }
}