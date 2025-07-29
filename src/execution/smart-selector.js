import { logger } from '../utils/logger.js';

/**
 * Smart API Selector for Phase 4 Checkpoint 4
 * Provides intelligent API selection based on context, quality, and constraints with:
 * - Multi-criteria decision making (cost, quality, speed, reliability)
 * - Context-aware selection based on user preferences and requirements
 * - Dynamic scoring and ranking algorithms
 * - Budget and constraint awareness
 * - Historical performance integration
 */
export class SmartSelector {
  constructor(registry, performanceMonitor = null) {
    this.registry = registry;
    this.performanceMonitor = performanceMonitor;
    
    // Selection criteria weights for different priorities
    this.criteriaWeights = new Map([
      ['quality', { quality: 0.5, speed: 0.2, cost: 0.1, reliability: 0.2 }],
      ['speed', { quality: 0.2, speed: 0.5, cost: 0.1, reliability: 0.2 }],
      ['cost', { quality: 0.2, speed: 0.1, cost: 0.5, reliability: 0.2 }],
      ['reliability', { quality: 0.2, speed: 0.1, cost: 0.2, reliability: 0.5 }],
      ['balanced', { quality: 0.3, speed: 0.25, cost: 0.25, reliability: 0.2 }]
    ]);

    // API capability definitions for different domains
    this.apiCapabilities = new Map([
      ['weather', {
        'openweather': { quality: 8, speed: 7, cost: 10, reliability: 9, features: ['current', 'forecast', 'historical'] },
        'weatherapi': { quality: 9, speed: 9, cost: 5, reliability: 8, features: ['current', 'forecast', 'alerts'] },
        'weatherstack': { quality: 7, speed: 8, cost: 8, reliability: 7, features: ['current', 'historical'] }
      }],
      ['news', {
        'newsapi': { quality: 9, speed: 8, cost: 6, reliability: 9, features: ['headlines', 'search', 'sources'] },
        'gnews': { quality: 8, speed: 9, cost: 9, reliability: 7, features: ['headlines', 'search'] },
        'currentsapi': { quality: 7, speed: 7, cost: 8, reliability: 8, features: ['headlines', 'latest'] }
      }],
      ['currency', {
        'exchangerate': { quality: 9, speed: 8, cost: 10, reliability: 9, features: ['rates', 'historical', 'convert'] },
        'fixer': { quality: 8, speed: 9, cost: 7, reliability: 8, features: ['rates', 'convert'] },
        'currencylayer': { quality: 8, speed: 7, cost: 8, reliability: 7, features: ['rates', 'historical'] }
      }],
      ['location', {
        'ipapi': { quality: 8, speed: 9, cost: 10, reliability: 8, features: ['ip_lookup', 'geolocation'] },
        'ipgeolocation': { quality: 9, speed: 8, cost: 8, reliability: 9, features: ['ip_lookup', 'timezone'] },
        'maxmind': { quality: 10, speed: 7, cost: 5, reliability: 10, features: ['ip_lookup', 'accuracy'] }
      }]
    ]);

    // Cost categories and budget constraints
    this.costCategories = new Map([
      ['free', { maxCostScore: 8, description: 'Free tier APIs only' }],
      ['budget', { maxCostScore: 6, description: 'Low-cost APIs preferred' }],
      ['standard', { maxCostScore: 4, description: 'Standard pricing acceptable' }],
      ['premium', { maxCostScore: 1, description: 'Premium APIs acceptable' }]
    ]);

    // Feature requirements mapping
    this.featureRequirements = new Map([
      ['current_weather', ['current']],
      ['weather_forecast', ['forecast']],
      ['weather_alerts', ['alerts']],
      ['news_headlines', ['headlines']],
      ['news_search', ['search']],
      ['currency_convert', ['convert']],
      ['currency_historical', ['historical']],
      ['location_lookup', ['ip_lookup']],
      ['location_timezone', ['timezone']]
    ]);

    this.selectionHistory = new Map();
    this.initialized = true;
  }

  /**
   * Select optimal API based on multiple criteria
   * @param {string} domain - API domain (weather, news, currency, etc.)
   * @param {Array} availableAPIs - List of available API options
   * @param {Object} constraints - Selection constraints and preferences
   * @returns {Object} Selection result with chosen API and reasoning
   */
  async selectOptimalAPI(domain, availableAPIs = [], constraints = {}) {
    try {
      logger.debug('Smart API selection started', { domain, apiCount: availableAPIs.length });

      const startTime = Date.now();

      // Get domain capabilities or use provided API list
      const candidates = availableAPIs.length > 0 ? 
        this.buildCandidatesFromOptions(availableAPIs, domain) :
        this.getCandidatesFromDomain(domain);
      
      logger.debug('Candidates built', { candidates: candidates.map(c => ({ id: c.id, cost: c.cost, quality: c.quality })) });

      if (candidates.length === 0) {
        return {
          selectedAPI: null,
          reason: 'No suitable APIs found for domain',
          confidence: 0,
          alternatives: []
        };
      }

      // Apply constraints filtering
      const filteredCandidates = await this.applyConstraints(candidates, constraints);

      if (filteredCandidates.length === 0) {
        return {
          selectedAPI: null,
          reason: 'No APIs meet the specified constraints',
          confidence: 0,
          alternatives: candidates.map(c => c.id)
        };
      }

      // Score candidates based on criteria
      const scoredCandidates = await this.scoreCandidates(filteredCandidates, constraints);

      // Select best candidate
      const selection = this.selectBestCandidate(scoredCandidates, constraints);

      // Record selection for learning
      await this.recordSelection(domain, selection, constraints);

      const selectionTime = Date.now() - startTime;

      const result = {
        selectedAPI: selection.id,
        reason: selection.reason,
        confidence: selection.score,
        alternatives: scoredCandidates
          .filter(c => c.id !== selection.id)
          .sort((a, b) => b.totalScore - a.totalScore)
          .slice(0, 3)
          .map(c => ({ id: c.id, score: c.totalScore, reason: c.primaryStrength })),
        selectionCriteria: {
          priority: constraints.priority || 'balanced',
          budget: constraints.budget || 'standard',
          features: constraints.features || [],
          constraints: constraints
        },
        metadata: {
          domain: domain,
          candidatesEvaluated: candidates.length,
          constraintsApplied: filteredCandidates.length !== candidates.length,
          selectionTime: selectionTime,
          weights: this.criteriaWeights.get(constraints.priority || 'balanced')
        }
      };

      logger.debug('Smart API selection completed', {
        selectedAPI: result.selectedAPI,
        confidence: result.confidence,
        alternatives: result.alternatives.length
      });

      return result;

    } catch (error) {
      logger.error('Smart API selection failed', { error: error.message, stack: error.stack, domain });
      return {
        selectedAPI: null,
        reason: `Selection failed: ${error.message}`,
        confidence: 0,
        alternatives: [],
        error: error.message
      };
    }
  }

  /**
   * Build candidates from provided API options
   * @param {Array} availableAPIs - Available API options
   * @param {string} domain - API domain
   * @returns {Array} Candidate APIs with enriched data
   */
  buildCandidatesFromOptions(availableAPIs, domain) {
    return availableAPIs.map(api => {
      const domainCapabilities = this.apiCapabilities.get(domain);
      const knownCapability = domainCapabilities && domainCapabilities[api.id];

      // Handle cost properly - api.cost could be a string or number
      let costValue = api.cost;
      if (knownCapability && !costValue) {
        costValue = knownCapability.cost;
      }
      if (!costValue) {
        costValue = 7; // Default cost score
      }

      return {
        id: api.id,
        quality: api.quality || knownCapability?.quality || 7,
        speed: this.calculateSpeedScore(api.responseTime || (knownCapability ? knownCapability.speed * 100 : 1000)),
        cost: this.calculateCostScore(costValue),
        reliability: api.reliability || knownCapability?.reliability || 8,
        features: api.features || knownCapability?.features || [],
        metadata: {
          provided: true,
          responseTime: api.responseTime,
          costCategory: api.cost,
          originalData: api
        }
      };
    });
  }

  /**
   * Get candidate APIs from domain capabilities
   * @param {string} domain - API domain
   * @returns {Array} Candidate APIs
   */
  getCandidatesFromDomain(domain) {
    const domainAPIs = this.apiCapabilities.get(domain);
    if (!domainAPIs) {
      return [];
    }

    return Object.entries(domainAPIs).map(([apiId, capabilities]) => ({
      id: apiId,
      quality: capabilities.quality,
      speed: capabilities.speed,
      cost: capabilities.cost,
      reliability: capabilities.reliability,
      features: capabilities.features,
      metadata: {
        provided: false,
        fromDomain: domain
      }
    }));
  }

  /**
   * Apply constraints to filter candidates
   * @param {Array} candidates - Candidate APIs
   * @param {Object} constraints - Selection constraints
   * @returns {Array} Filtered candidates
   */
  async applyConstraints(candidates, constraints) {
    let filtered = [...candidates];

    // Budget constraint
    if (constraints.budget) {
      const budgetLimit = this.costCategories.get(constraints.budget);
      if (budgetLimit) {
        filtered = filtered.filter(api => (api.cost || 7) >= budgetLimit.maxCostScore);
      }
    }

    // Feature requirements
    if (constraints.features && constraints.features.length > 0) {
      filtered = filtered.filter(api => 
        constraints.features.every(feature =>
          api.features.some(apiFeature => 
            apiFeature.includes(feature) || feature.includes(apiFeature)
          )
        )
      );
    }

    // Performance constraints
    if (constraints.minQuality) {
      filtered = filtered.filter(api => api.quality >= constraints.minQuality);
    }

    if (constraints.minReliability) {
      filtered = filtered.filter(api => api.reliability >= constraints.minReliability);
    }

    if (constraints.maxResponseTime) {
      filtered = filtered.filter(api => {
        const responseTime = api.metadata.responseTime || (10 - api.speed) * 200;
        return responseTime <= constraints.maxResponseTime;
      });
    }

    // Exclude specific APIs
    if (constraints.excludeAPIs) {
      filtered = filtered.filter(api => !constraints.excludeAPIs.includes(api.id));
    }

    return filtered;
  }

  /**
   * Score candidates based on weighted criteria
   * @param {Array} candidates - Filtered candidates
   * @param {Object} constraints - Selection constraints
   * @returns {Array} Scored candidates
   */
  async scoreCandidates(candidates, constraints) {
    const priority = constraints.priority || 'balanced';
    const weights = this.criteriaWeights.get(priority);

    const scoredCandidates = [];

    for (const candidate of candidates) {
      // Base scores (normalized to 0-1)
      const qualityScore = (candidate.quality || 7) / 10;
      const speedScore = (candidate.speed || 7) / 10;
      const costScore = (candidate.cost || 7) / 10;
      const reliabilityScore = (candidate.reliability || 8) / 10;

      // Apply performance monitoring boost if available
      let performanceBoost = 0;
      if (this.performanceMonitor) {
        const stats = await this.performanceMonitor.getAPIStats?.(candidate.id);
        if (stats) {
          performanceBoost = (stats.successRate - 0.8) * 0.2; // Max 0.2 boost for 100% success rate
        }
      }

      // Calculate weighted total score
      const totalScore = (
        (qualityScore * weights.quality) +
        (speedScore * weights.speed) +
        (costScore * weights.cost) +
        (reliabilityScore * weights.reliability) +
        performanceBoost
      );

      // Determine primary strength
      const strengths = {
        quality: qualityScore || 0,
        speed: speedScore || 0,
        cost: costScore || 0,
        reliability: reliabilityScore || 0
      };
      const primaryStrength = Object.entries(strengths)
        .sort(([,a], [,b]) => b - a)[0][0];

      scoredCandidates.push({
        ...candidate,
        totalScore: Math.min(1, totalScore),
        criteriaScores: {
          quality: qualityScore,
          speed: speedScore,
          cost: costScore,
          reliability: reliabilityScore
        },
        performanceBoost: performanceBoost,
        primaryStrength: primaryStrength,
        reasoning: this.generateScoreReasoning(candidate, totalScore, primaryStrength, weights)
      });
    }

    return scoredCandidates.sort((a, b) => b.totalScore - a.totalScore);
  }

  /**
   * Select the best candidate from scored list
   * @param {Array} scoredCandidates - Scored and sorted candidates
   * @param {Object} constraints - Selection constraints
   * @returns {Object} Selected candidate with reasoning
   */
  selectBestCandidate(scoredCandidates, constraints) {
    if (scoredCandidates.length === 0) {
      return {
        id: null,
        score: 0,
        reason: 'No candidates available'
      };
    }

    const best = scoredCandidates[0];
    const priority = constraints.priority || 'balanced';
    const budget = constraints.budget;

    // Generate selection reasoning
    let reason = `Selected based on ${priority} priority`;
    
    if (budget) {
      const budgetInfo = this.costCategories.get(budget);
      reason += ` with ${budgetInfo.description.toLowerCase()}`;
    }

    if (best.primaryStrength) {
      reason += `. Strongest in ${best.primaryStrength}`;
    }

    if (best.performanceBoost > 0) {
      reason += `. Historical performance boost applied`;
    }

    // Check if selection is close - provide additional reasoning
    if (scoredCandidates.length > 1) {
      const runner_up = scoredCandidates[1];
      const scoreDifference = best.totalScore - runner_up.totalScore;
      
      if (scoreDifference < 0.1) {
        reason += `. Close decision (${(scoreDifference * 100).toFixed(1)}% margin)`;
      }
    }

    return {
      ...best,
      score: best.totalScore,
      reason: reason
    };
  }

  /**
   * Calculate speed score from response time
   * @param {number} responseTime - Response time in milliseconds
   * @returns {number} Speed score (1-10)
   */
  calculateSpeedScore(responseTime) {
    if (!responseTime) return 7; // Default score
    
    // Convert response time to score (lower time = higher score)
    if (responseTime <= 500) return 10;
    if (responseTime <= 1000) return 9;
    if (responseTime <= 2000) return 8;
    if (responseTime <= 3000) return 7;
    if (responseTime <= 5000) return 6;
    return 5;
  }

  /**
   * Calculate cost score from cost category
   * @param {string|number} cost - Cost category or numeric cost
   * @returns {number} Cost score (1-10, higher = more cost-effective)
   */
  calculateCostScore(cost) {
    if (typeof cost === 'number') return cost;
    
    const costMapping = {
      'free': 10,
      'budget': 8,
      'standard': 6,
      'premium': 3,
      'enterprise': 1
    };
    
    return costMapping[cost] || 7;
  }

  /**
   * Generate reasoning for score calculation
   * @param {Object} candidate - Candidate API
   * @param {number} totalScore - Total calculated score
   * @param {string} primaryStrength - Primary strength area
   * @param {Object} weights - Criteria weights used
   * @returns {string} Human-readable reasoning
   */
  generateScoreReasoning(candidate, totalScore, primaryStrength, weights) {
    const scorePercent = Math.round((totalScore || 0) * 100);
    const strengthValue = Math.round((candidate.criteriaScores?.[primaryStrength] || 0) * 10);
    
    let reasoning = `Scored ${scorePercent}% overall`;
    reasoning += `, excels in ${primaryStrength} (${strengthValue}/10)`;
    
    // Mention weighted criteria
    const topWeightedCriteria = Object.entries(weights)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 2)
      .map(([criteria]) => criteria);
    
    reasoning += `. Optimized for ${topWeightedCriteria.join(' and ')}`;
    
    return reasoning;
  }

  /**
   * Record selection for learning and optimization
   * @param {string} domain - API domain
   * @param {Object} selection - Selection made
   * @param {Object} constraints - Constraints used
   * @returns {Promise<void>}
   */
  async recordSelection(domain, selection, constraints) {
    const record = {
      domain: domain,
      selectedAPI: selection.id,
      score: selection.score,
      constraints: constraints,
      timestamp: new Date().toISOString(),
      reasoning: selection.reason
    };

    // Store in selection history
    if (!this.selectionHistory.has(domain)) {
      this.selectionHistory.set(domain, []);
    }
    
    const domainHistory = this.selectionHistory.get(domain);
    domainHistory.push(record);
    
    // Keep only last 100 selections per domain
    if (domainHistory.length > 100) {
      domainHistory.splice(0, domainHistory.length - 100);
    }

    logger.debug('API selection recorded', {
      domain: domain,
      selectedAPI: selection.id,
      historySize: domainHistory.length
    });
  }

  /**
   * Get selection statistics for a domain
   * @param {string} domain - API domain
   * @returns {Object} Selection statistics
   */
  getSelectionStats(domain) {
    const history = this.selectionHistory.get(domain) || [];
    
    if (history.length === 0) {
      return {
        domain: domain,
        totalSelections: 0,
        topAPIs: [],
        averageScore: 0
      };
    }

    // Calculate API usage frequency
    const apiCounts = {};
    let totalScore = 0;

    for (const record of history) {
      apiCounts[record.selectedAPI] = (apiCounts[record.selectedAPI] || 0) + 1;
      totalScore += record.score;
    }

    const topAPIs = Object.entries(apiCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([api, count]) => ({
        api: api,
        selections: count,
        percentage: Math.round((count / history.length) * 100)
      }));

    return {
      domain: domain,
      totalSelections: history.length,
      topAPIs: topAPIs,
      averageScore: totalScore / history.length,
      recentSelections: history.slice(-10).map(r => ({
        api: r.selectedAPI,
        score: r.score,
        timestamp: r.timestamp
      }))
    };
  }

  /**
   * Update API capabilities based on performance data
   * @param {string} apiId - API identifier
   * @param {Object} performanceData - Performance metrics
   * @returns {Promise<void>}
   */
  async updateAPICapabilities(apiId, performanceData) {
    // Find API in capabilities
    for (const [domain, apis] of this.apiCapabilities) {
      if (apis[apiId]) {
        const current = apis[apiId];
        
        // Update reliability based on success rate
        if (performanceData.successRate !== undefined) {
          current.reliability = Math.round(performanceData.successRate * 10);
        }
        
        // Update speed based on response time
        if (performanceData.averageResponseTime) {
          current.speed = this.calculateSpeedScore(performanceData.averageResponseTime);
        }
        
        logger.debug('API capabilities updated', {
          apiId: apiId,
          domain: domain,
          newReliability: current.reliability,
          newSpeed: current.speed
        });
        
        break;
      }
    }
  }

  /**
   * Get available APIs for a domain
   * @param {string} domain - API domain
   * @returns {Array} Available API IDs
   */
  getAvailableAPIs(domain) {
    const domainAPIs = this.apiCapabilities.get(domain);
    return domainAPIs ? Object.keys(domainAPIs) : [];
  }

  /**
   * Clear selection history
   * @param {string} domain - Optional domain to clear (clears all if not specified)
   * @returns {void}
   */
  clearSelectionHistory(domain = null) {
    if (domain) {
      this.selectionHistory.delete(domain);
    } else {
      this.selectionHistory.clear();
    }
    
    logger.debug('Selection history cleared', { domain: domain || 'all' });
  }
}