import { logger } from '../utils/logger.js';

/**
 * Quality Scorer for Phase 4 Checkpoint 4
 * Provides comprehensive API response quality analysis with:
 * - Multi-dimensional quality scoring (completeness, accuracy, freshness, structure)
 * - Domain-specific quality criteria and validation
 * - Response time and performance impact assessment
 * - Data validation and error detection
 * - Comparative quality analysis and benchmarking
 */
export class QualityScorer {
  constructor() {
    // Quality criteria weights for different domains
    this.domainCriteria = new Map([
      ['weather', {
        completeness: 0.3,
        accuracy: 0.3,
        freshness: 0.2,
        structure: 0.2,
        requiredFields: ['temp', 'description'],
        optionalFields: ['humidity', 'pressure', 'wind_speed', 'visibility'],
        freshnessWindow: 30 * 60 * 1000 // 30 minutes
      }],
      ['news', {
        completeness: 0.25,
        accuracy: 0.25,
        freshness: 0.3,
        structure: 0.2,
        requiredFields: ['title', 'url'],
        optionalFields: ['description', 'publishedAt', 'author', 'source'],
        freshnessWindow: 60 * 60 * 1000 // 1 hour
      }],
      ['currency', {
        completeness: 0.35,
        accuracy: 0.35,
        freshness: 0.2,
        structure: 0.1,
        requiredFields: ['rates'],
        optionalFields: ['base', 'date', 'timestamp'],
        freshnessWindow: 15 * 60 * 1000 // 15 minutes
      }],
      ['location', {
        completeness: 0.4,
        accuracy: 0.4,
        freshness: 0.1,
        structure: 0.1,
        requiredFields: ['country'],
        optionalFields: ['city', 'region', 'lat', 'lon', 'timezone'],
        freshnessWindow: 24 * 60 * 60 * 1000 // 24 hours
      }],
      ['facts', {
        completeness: 0.3,
        accuracy: 0.25,
        freshness: 0.15,
        structure: 0.3,
        requiredFields: ['text'],
        optionalFields: ['source', 'category', 'url'],
        freshnessWindow: 7 * 24 * 60 * 60 * 1000 // 7 days
      }]
    ]);

    // Response time impact on quality score
    this.responseTimeThresholds = {
      excellent: 500,    // < 500ms
      good: 1000,       // < 1s
      acceptable: 2000, // < 2s
      poor: 5000,       // < 5s
      unacceptable: 10000 // >= 10s
    };

    // Quality score categories
    this.qualityCategories = {
      excellent: { min: 9, description: 'Exceptional quality response' },
      very_good: { min: 8, description: 'High quality response' },
      good: { min: 7, description: 'Good quality response' },
      acceptable: { min: 6, description: 'Acceptable quality response' },
      poor: { min: 4, description: 'Poor quality response' },
      unacceptable: { min: 0, description: 'Unacceptable quality response' }
    };

    // Data validation patterns
    this.validationPatterns = new Map([
      ['email', /^[^\s@]+@[^\s@]+\.[^\s@]+$/],
      ['url', /^https?:\/\/.+/],
      ['iso_date', /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/],
      ['coordinates', /^-?\d+\.?\d*$/],
      ['temperature', /^-?\d+\.?\d*$/],
      ['percentage', /^\d+\.?\d*%?$/]
    ]);

    this.qualityHistory = new Map();
    this.initialized = true;
  }

  /**
   * Score API response quality across multiple dimensions
   * @param {Object} response - API response to analyze
   * @param {string} domain - Response domain (weather, news, etc.)
   * @param {Object} options - Scoring options and context
   * @returns {Promise<number>} Quality score (0-10)
   */
  async scoreResponse(response, domain, options = {}) {
    try {
      logger.debug('Quality scoring started', { domain, hasData: !!response.data });

      const startTime = Date.now();
      
      // Get domain criteria or use default
      const criteria = this.domainCriteria.get(domain) || this.getDefaultCriteria();
      
      // Calculate individual quality dimensions
      const completenessScore = await this.assessCompleteness(response, criteria);
      const accuracyScore = await this.assessAccuracy(response, criteria, domain);
      const freshnessScore = await this.assessFreshness(response, criteria);
      const structureScore = await this.assessStructure(response, criteria);
      
      // Apply performance impact
      const performanceImpact = this.calculatePerformanceImpact(response.responseTime);
      
      // Calculate weighted total score
      const weightedScore = (
        (completenessScore * criteria.completeness) +
        (accuracyScore * criteria.accuracy) +
        (freshnessScore * criteria.freshness) +
        (structureScore * criteria.structure)
      );
      
      // Apply performance penalty/bonus
      const finalScore = Math.max(0, Math.min(10, weightedScore + performanceImpact));
      
      // Generate quality assessment
      const assessment = this.generateQualityAssessment(finalScore, {
        completenessScore,
        accuracyScore,
        freshnessScore,
        structureScore,
        performanceImpact,
        responseTime: response.responseTime
      });

      // Record quality metrics
      await this.recordQualityMetrics(domain, response, finalScore, assessment);

      const scoringTime = Date.now() - startTime;

      logger.debug('Quality scoring completed', {
        domain,
        finalScore: finalScore.toFixed(2),
        scoringTime
      });

      return parseFloat(finalScore.toFixed(2));

    } catch (error) {
      logger.error('Quality scoring failed', { error: error.message, domain });
      return 0; // Return minimum score on error
    }
  }

  /**
   * Assess response completeness based on required and optional fields
   * @param {Object} response - API response
   * @param {Object} criteria - Domain criteria
   * @returns {Promise<number>} Completeness score (0-10)
   */
  async assessCompleteness(response, criteria) {
    const data = response.data || {};
    const requiredFields = criteria.requiredFields || [];
    const optionalFields = criteria.optionalFields || [];
    
    // Check required fields
    const requiredPresent = requiredFields.filter(field => 
      this.hasValidField(data, field)
    ).length;
    
    const requiredRatio = requiredFields.length > 0 ? 
      requiredPresent / requiredFields.length : 1;
    
    // Check optional fields for bonus points
    const optionalPresent = optionalFields.filter(field => 
      this.hasValidField(data, field)
    ).length;
    
    const optionalBonus = optionalFields.length > 0 ?
      (optionalPresent / optionalFields.length) * 2 : 0; // Max 2 points bonus
    
    // Base score from required fields (0-8) + optional bonus (0-2)
    const completenessScore = (requiredRatio * 8) + Math.min(2, optionalBonus);
    
    return Math.min(10, completenessScore);
  }

  /**
   * Assess response accuracy through data validation
   * @param {Object} response - API response
   * @param {Object} criteria - Domain criteria
   * @param {string} domain - Response domain
   * @returns {Promise<number>} Accuracy score (0-10)
   */
  async assessAccuracy(response, criteria, domain) {
    const data = response.data || {};
    let accuracyScore = 8; // Start with high base score
    let validationCount = 0;
    let validationPassed = 0;

    // Domain-specific accuracy checks
    switch (domain) {
      case 'weather':
        accuracyScore += this.validateWeatherData(data);
        break;
      case 'currency':
        accuracyScore += this.validateCurrencyData(data);
        break;
      case 'news':
        accuracyScore += this.validateNewsData(data);
        break;
      case 'location':
        accuracyScore += this.validateLocationData(data);
        break;
      default:
        accuracyScore += this.validateGenericData(data);
    }

    // Check for data type consistency
    const typeConsistency = this.assessDataTypeConsistency(data);
    accuracyScore += typeConsistency;

    // Check for logical constraints
    const logicalConsistency = this.assessLogicalConsistency(data, domain);
    accuracyScore += logicalConsistency;

    return Math.max(0, Math.min(10, accuracyScore));
  }

  /**
   * Assess response freshness based on timestamps and update frequency
   * @param {Object} response - API response
   * @param {Object} criteria - Domain criteria
   * @returns {Promise<number>} Freshness score (0-10)
   */
  async assessFreshness(response, criteria) {
    const data = response.data || {};
    const now = Date.now();
    const freshnessWindow = criteria.freshnessWindow || (60 * 60 * 1000); // Default 1 hour

    // Look for timestamp fields
    const timestampFields = ['timestamp', 'updated', 'last_updated', 'publishedAt', 'date'];
    let dataTimestamp = null;

    for (const field of timestampFields) {
      if (data[field]) {
        dataTimestamp = new Date(data[field]).getTime();
        break;
      }
    }

    // If no timestamp found, use response time as proxy
    if (!dataTimestamp && response.responseTime) {
      // Assume data is fresh if response was fast (likely real-time)
      return response.responseTime < 1000 ? 8 : 6;
    }

    if (!dataTimestamp) {
      return 5; // Default score when no timestamp available
    }

    const age = now - dataTimestamp;
    
    // Calculate freshness score based on age vs acceptable window
    if (age < 0) {
      return 3; // Future timestamp (suspicious)
    } else if (age <= freshnessWindow * 0.25) {
      return 10; // Very fresh
    } else if (age <= freshnessWindow * 0.5) {
      return 9; // Fresh
    } else if (age <= freshnessWindow) {
      return 7; // Acceptable
    } else if (age <= freshnessWindow * 2) {
      return 5; // Getting stale
    } else if (age <= freshnessWindow * 5) {
      return 3; // Stale
    } else {
      return 1; // Very stale
    }
  }

  /**
   * Assess response structure and format quality
   * @param {Object} response - API response
   * @param {Object} criteria - Domain criteria
   * @returns {Promise<number>} Structure score (0-10)
   */
  async assessStructure(response, criteria) {
    let structureScore = 8; // Base score for valid JSON

    const data = response.data || {};

    // Check if response is properly structured object
    if (typeof data !== 'object' || data === null) {
      return 2; // Poor structure
    }

    // Check for nested structure appropriateness
    const nesting = this.calculateNestingDepth(data);
    if (nesting > 5) {
      structureScore -= 1; // Overly complex nesting
    } else if (nesting === 0) {
      structureScore -= 0.5; // Too flat
    }

    // Check for consistent naming conventions
    const fieldNames = this.extractFieldNames(data);
    const namingConsistency = this.assessNamingConsistency(fieldNames);
    structureScore += namingConsistency;

    // Check for appropriate data organization
    const organization = this.assessDataOrganization(data);
    structureScore += organization;

    // Check for error structure if response contains errors
    if (data.error || data.errors) {
      const errorStructure = this.assessErrorStructure(data);
      structureScore += errorStructure;
    }

    return Math.max(0, Math.min(10, structureScore));
  }

  /**
   * Calculate performance impact on quality score
   * @param {number} responseTime - Response time in milliseconds
   * @returns {number} Performance impact (-2 to +1)
   */
  calculatePerformanceImpact(responseTime) {
    if (!responseTime) return 0;

    const thresholds = this.responseTimeThresholds;

    if (responseTime < thresholds.excellent) {
      return 1; // Bonus for excellent response time
    } else if (responseTime < thresholds.good) {
      return 0.5; // Small bonus for good response time
    } else if (responseTime < thresholds.acceptable) {
      return 0; // No impact for acceptable response time
    } else if (responseTime < thresholds.poor) {
      return -0.5; // Small penalty for poor response time
    } else if (responseTime < thresholds.unacceptable) {
      return -1; // Penalty for very poor response time
    } else {
      return -2; // Large penalty for unacceptable response time
    }
  }

  /**
   * Generate comprehensive quality assessment
   * @param {number} finalScore - Final quality score
   * @param {Object} scores - Individual dimension scores
   * @returns {Object} Quality assessment with details
   */
  generateQualityAssessment(finalScore, scores) {
    const category = this.determineQualityCategory(finalScore);
    
    const assessment = {
      overallScore: finalScore,
      category: category,
      dimensionScores: {
        completeness: scores.completenessScore,
        accuracy: scores.accuracyScore,
        freshness: scores.freshnessScore,
        structure: scores.structureScore
      },
      performanceImpact: scores.performanceImpact,
      responseTime: scores.responseTime,
      strengths: [],
      weaknesses: [],
      recommendations: []
    };

    // Identify strengths and weaknesses
    const dimensions = assessment.dimensionScores;
    Object.entries(dimensions).forEach(([dimension, score]) => {
      if (score >= 8) {
        assessment.strengths.push(`Excellent ${dimension}`);
      } else if (score <= 5) {
        assessment.weaknesses.push(`Poor ${dimension}`);
      }
    });

    // Generate recommendations
    if (scores.performanceImpact < 0) {
      assessment.recommendations.push('Improve response time for better quality score');
    }
    
    if (dimensions.completeness < 7) {
      assessment.recommendations.push('Include more complete data fields');
    }
    
    if (dimensions.freshness < 6) {
      assessment.recommendations.push('Provide more recent data or timestamps');
    }

    return assessment;
  }

  /**
   * Determine quality category from score
   * @param {number} score - Quality score
   * @returns {string} Quality category
   */
  determineQualityCategory(score) {
    const categories = this.qualityCategories;
    
    if (score >= categories.excellent.min) return 'excellent';
    if (score >= categories.very_good.min) return 'very_good';
    if (score >= categories.good.min) return 'good';
    if (score >= categories.acceptable.min) return 'acceptable';
    if (score >= categories.poor.min) return 'poor';
    return 'unacceptable';
  }

  // Domain-specific validation methods
  validateWeatherData(data) {
    let score = 0;
    
    // Temperature validation
    if (data.temp !== undefined) {
      const temp = parseFloat(data.temp);
      if (!isNaN(temp) && temp >= -100 && temp <= 70) { // Reasonable temperature range in Celsius
        score += 0.5;
      }
    }
    
    // Humidity validation
    if (data.humidity !== undefined) {
      const humidity = parseFloat(data.humidity);
      if (!isNaN(humidity) && humidity >= 0 && humidity <= 100) {
        score += 0.5;
      }
    }
    
    // Description validation
    if (data.description && typeof data.description === 'string' && data.description.length > 0) {
      score += 0.5;
    }
    
    return score;
  }

  validateCurrencyData(data) {
    let score = 0;
    
    // Rates validation
    if (data.rates && typeof data.rates === 'object') {
      const rates = Object.values(data.rates);
      const validRates = rates.filter(rate => 
        typeof rate === 'number' && rate > 0 && rate < 1000000
      );
      
      if (validRates.length === rates.length && rates.length > 0) {
        score += 1;
      }
    }
    
    // Base currency validation
    if (data.base && typeof data.base === 'string' && data.base.length === 3) {
      score += 0.5;
    }
    
    return score;
  }

  validateNewsData(data) {
    let score = 0;
    
    // Title validation
    if (data.title && typeof data.title === 'string' && data.title.length > 5) {
      score += 0.5;
    }
    
    // URL validation
    if (data.url && this.validationPatterns.get('url').test(data.url)) {
      score += 0.5;
    }
    
    // PublishedAt validation
    if (data.publishedAt) {
      const date = new Date(data.publishedAt);
      if (!isNaN(date.getTime())) {
        score += 0.5;
      }
    }
    
    return score;
  }

  validateLocationData(data) {
    let score = 0;
    
    // Country validation
    if (data.country && typeof data.country === 'string' && data.country.length >= 2) {
      score += 0.5;
    }
    
    // Coordinates validation
    if (data.lat !== undefined && data.lon !== undefined) {
      const lat = parseFloat(data.lat);
      const lon = parseFloat(data.lon);
      if (!isNaN(lat) && !isNaN(lon) && lat >= -90 && lat <= 90 && lon >= -180 && lon <= 180) {
        score += 1;
      }
    }
    
    return score;
  }

  validateGenericData(data) {
    // Generic validation for unknown domains
    let score = 0;
    
    const fieldCount = Object.keys(data).length;
    if (fieldCount > 0) {
      score += 0.5;
    }
    
    // Check for at least some string content
    const stringFields = Object.values(data).filter(v => typeof v === 'string' && v.length > 0);
    if (stringFields.length > 0) {
      score += 0.5;
    }
    
    return score;
  }

  // Helper methods
  hasValidField(data, field) {
    const value = data[field];
    return value !== undefined && value !== null && value !== '';
  }

  calculateNestingDepth(obj, depth = 0) {
    if (typeof obj !== 'object' || obj === null) return depth;
    
    let maxDepth = depth;
    for (const value of Object.values(obj)) {
      if (typeof value === 'object' && value !== null) {
        maxDepth = Math.max(maxDepth, this.calculateNestingDepth(value, depth + 1));
      }
    }
    
    return maxDepth;
  }

  extractFieldNames(obj, names = []) {
    if (typeof obj !== 'object' || obj === null) return names;
    
    Object.keys(obj).forEach(key => {
      names.push(key);
      if (typeof obj[key] === 'object' && obj[key] !== null) {
        this.extractFieldNames(obj[key], names);
      }
    });
    
    return names;
  }

  assessNamingConsistency(fieldNames) {
    if (fieldNames.length < 2) return 0;
    
    const camelCaseCount = fieldNames.filter(name => /^[a-z][a-zA-Z0-9]*$/.test(name)).length;
    const snake_caseCount = fieldNames.filter(name => /^[a-z][a-z0-9_]*$/.test(name)).length;
    const kebabCaseCount = fieldNames.filter(name => /^[a-z][a-z0-9-]*$/.test(name)).length;
    
    const total = fieldNames.length;
    const maxConsistency = Math.max(camelCaseCount, snake_caseCount, kebabCaseCount);
    const consistency = maxConsistency / total;
    
    return consistency > 0.8 ? 1 : consistency > 0.6 ? 0.5 : 0;
  }

  assessDataOrganization(data) {
    // Check if related data is grouped logically
    const keys = Object.keys(data);
    let organizationScore = 0;
    
    // Check for logical grouping (e.g., location data together)
    const locationFields = keys.filter(k => ['lat', 'lon', 'latitude', 'longitude', 'city', 'country'].includes(k.toLowerCase()));
    if (locationFields.length >= 2) {
      organizationScore += 0.5;
    }
    
    // Check for time-related grouping
    const timeFields = keys.filter(k => ['date', 'time', 'timestamp', 'created', 'updated'].some(t => k.toLowerCase().includes(t)));
    if (timeFields.length >= 1) {
      organizationScore += 0.5;
    }
    
    return organizationScore;
  }

  assessDataTypeConsistency(data) {
    // Check if similar fields have consistent types
    let consistencyScore = 1;
    const numberFields = [];
    const stringFields = [];
    
    Object.entries(data).forEach(([key, value]) => {
      if (typeof value === 'number') {
        numberFields.push(key);
      } else if (typeof value === 'string') {
        stringFields.push(key);
      }
    });
    
    // Penalize mixed types for similar field names
    const numericNames = ['temp', 'temperature', 'pressure', 'humidity', 'lat', 'lon', 'price', 'rate'];
    numericNames.forEach(name => {
      const stringVersion = stringFields.find(f => f.toLowerCase().includes(name));
      const numberVersion = numberFields.find(f => f.toLowerCase().includes(name));
      if (stringVersion && numberVersion) {
        consistencyScore -= 0.2; // Penalty for inconsistent types
      }
    });
    
    return Math.max(0, consistencyScore);
  }

  assessLogicalConsistency(data, domain) {
    let consistencyScore = 0;
    
    // Domain-specific logical checks
    switch (domain) {
      case 'weather':
        // Check temperature units consistency
        if (data.temp !== undefined && data.feels_like !== undefined) {
          const tempDiff = Math.abs(data.temp - data.feels_like);
          if (tempDiff < 20) { // Reasonable difference
            consistencyScore += 0.5;
          }
        }
        break;
        
      case 'news':
        // Check if publishedAt is not in the future
        if (data.publishedAt) {
          const publishDate = new Date(data.publishedAt);
          if (publishDate <= new Date()) {
            consistencyScore += 0.5;
          }
        }
        break;
    }
    
    return consistencyScore;
  }

  assessErrorStructure(data) {
    let errorScore = -1; // Penalty for having errors
    
    const errorInfo = data.error || data.errors;
    if (errorInfo) {
      // Good error structure should have message and code
      if (typeof errorInfo === 'object') {
        if (errorInfo.message || errorInfo.description) {
          errorScore += 0.5; // Partial recovery for descriptive error
        }
        if (errorInfo.code || errorInfo.status) {
          errorScore += 0.5; // Partial recovery for error code
        }
      }
    }
    
    return errorScore;
  }

  getDefaultCriteria() {
    return {
      completeness: 0.3,
      accuracy: 0.3,
      freshness: 0.2,
      structure: 0.2,
      requiredFields: [],
      optionalFields: [],
      freshnessWindow: 60 * 60 * 1000 // 1 hour
    };
  }

  async recordQualityMetrics(domain, response, score, assessment) {
    const record = {
      domain: domain,
      score: score,
      assessment: assessment,
      responseTime: response.responseTime,
      timestamp: new Date().toISOString(),
      dataSize: JSON.stringify(response.data || {}).length
    };

    if (!this.qualityHistory.has(domain)) {
      this.qualityHistory.set(domain, []);
    }
    
    const domainHistory = this.qualityHistory.get(domain);
    domainHistory.push(record);
    
    // Keep only last 50 records per domain
    if (domainHistory.length > 50) {
      domainHistory.splice(0, domainHistory.length - 50);
    }
  }

  /**
   * Get quality statistics for a domain
   * @param {string} domain - API domain
   * @returns {Object} Quality statistics
   */
  getQualityStats(domain) {
    const history = this.qualityHistory.get(domain) || [];
    
    if (history.length === 0) {
      return {
        domain: domain,
        totalResponses: 0,
        averageScore: 0,
        scoreDistribution: {}
      };
    }

    const scores = history.map(r => r.score);
    const averageScore = scores.reduce((sum, score) => sum + score, 0) / scores.length;
    
    // Calculate score distribution
    const distribution = {};
    Object.keys(this.qualityCategories).forEach(category => {
      distribution[category] = 0;
    });
    
    scores.forEach(score => {
      const category = this.determineQualityCategory(score);
      distribution[category]++;
    });

    return {
      domain: domain,
      totalResponses: history.length,
      averageScore: parseFloat(averageScore.toFixed(2)),
      scoreDistribution: distribution,
      recentScores: history.slice(-10).map(r => ({
        score: r.score,
        timestamp: r.timestamp,
        responseTime: r.responseTime
      }))
    };
  }

  /**
   * Compare quality scores between multiple responses
   * @param {Array} responses - Array of response objects with scores
   * @returns {Object} Comparison analysis
   */
  compareQuality(responses) {
    if (responses.length < 2) {
      return { error: 'At least 2 responses required for comparison' };
    }

    const scored = responses.map((response, index) => ({
      index: index,
      score: response.score || 0,
      responseTime: response.responseTime || 0,
      assessment: response.assessment || {}
    }));

    scored.sort((a, b) => b.score - a.score);

    return {
      ranking: scored.map((item, rank) => ({
        rank: rank + 1,
        originalIndex: item.index,
        score: item.score,
        responseTime: item.responseTime,
        category: this.determineQualityCategory(item.score)
      })),
      bestResponse: scored[0],
      worstResponse: scored[scored.length - 1],
      averageScore: scored.reduce((sum, item) => sum + item.score, 0) / scored.length,
      scoreRange: scored[0].score - scored[scored.length - 1].score
    };
  }
}