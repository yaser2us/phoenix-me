import { logger } from '../utils/logger.js';

/**
 * Pattern Recognizer - Phase 4.9 Checkpoint 4
 * Identifies patterns in user behavior, workflow sequences, and API usage
 */
export class PatternRecognizer {
  constructor() {
    this.patterns = new Map();
    this.sequencePatterns = new Map();
    this.temporalPatterns = new Map();
    this.combinationPatterns = new Map();
    this.learningMetrics = {
      patternsIdentified: 0,
      patternAccuracy: 0,
      lastAnalysis: null
    };
    
    logger.info('Pattern Recognizer initialized');
  }

  /**
   * Identify patterns from user intents
   */
  async identifyPatterns(userIntents, options = {}) {
    try {
      logger.debug('Identifying patterns from user intents', {
        intentCount: userIntents.length,
        minSupport: options.minSupport || 0.3
      });

      const minSupport = options.minSupport || 0.3;
      const patterns = [];

      // Extract intent features and cluster similar intents
      const intentFeatures = userIntents.map(intent => this.extractIntentFeatures(intent));
      
      // Find frequent word patterns
      const wordPatterns = await this.findWordPatterns(intentFeatures, minSupport);
      patterns.push(...wordPatterns);

      // Find domain combination patterns
      const domainPatterns = await this.findDomainPatterns(intentFeatures, minSupport);
      patterns.push(...domainPatterns);

      // Find action patterns
      const actionPatterns = await this.findActionPatterns(intentFeatures, minSupport);
      patterns.push(...actionPatterns);

      // Find structural patterns
      const structuralPatterns = await this.findStructuralPatterns(intentFeatures, minSupport);
      patterns.push(...structuralPatterns);

      // Store identified patterns
      for (const pattern of patterns) {
        this.patterns.set(pattern.id, {
          ...pattern,
          identifiedAt: new Date().toISOString(),
          strength: pattern.support,
          examples: pattern.examples || []
        });
      }

      this.learningMetrics.patternsIdentified += patterns.length;
      this.learningMetrics.lastAnalysis = new Date().toISOString();

      logger.info('Pattern identification completed', {
        patternsFound: patterns.length,
        totalPatterns: this.patterns.size
      });

      return patterns;

    } catch (error) {
      logger.error('Pattern identification failed', { error: error.message });
      throw error;
    }
  }

  /**
   * Recognize common workflow sequences
   */
  async recognizeSequencePatterns(workflowSequences, options = {}) {
    try {
      logger.debug('Recognizing workflow sequence patterns', {
        sequenceCount: workflowSequences.length,
        minLength: options.minLength || 2
      });

      const minSupport = options.minSupport || 0.3;
      const minLength = options.minLength || 2;
      const maxLength = options.maxLength || 5;

      const sequencePatterns = new Map();

      // Find frequent subsequences of different lengths
      for (let length = minLength; length <= maxLength; length++) {
        const subsequences = this.extractSubsequences(workflowSequences, length);
        const frequentSubsequences = this.findFrequentSubsequences(subsequences, minSupport);
        
        for (const [sequence, support] of frequentSubsequences) {
          const patternId = `seq_${sequence.join('_')}`;
          sequencePatterns.set(patternId, {
            id: patternId,
            type: 'sequence',
            sequence,
            support,
            length,
            examples: this.findSequenceExamples(workflowSequences, sequence)
          });
        }
      }

      // Find parallel execution patterns
      const parallelPatterns = await this.findParallelPatterns(workflowSequences);
      for (const pattern of parallelPatterns) {
        sequencePatterns.set(pattern.id, pattern);
      }

      // Store sequence patterns
      for (const [patternId, pattern] of sequencePatterns) {
        this.sequencePatterns.set(patternId, {
          ...pattern,
          identifiedAt: new Date().toISOString()
        });
      }

      const result = {
        commonSequences: Array.from(sequencePatterns.values()),
        statistics: {
          totalSequences: workflowSequences.length,
          uniqueOperations: this.countUniqueOperations(workflowSequences),
          averageSequenceLength: this.calculateAverageLength(workflowSequences),
          parallelPatterns: parallelPatterns.length
        }
      };

      logger.info('Sequence pattern recognition completed', {
        patternsFound: sequencePatterns.size,
        parallelPatterns: parallelPatterns.length
      });

      return result;

    } catch (error) {
      logger.error('Sequence pattern recognition failed', { error: error.message });
      throw error;
    }
  }

  /**
   * Analyze API combination patterns
   */
  async analyzeCombinationPatterns(apiCombinations, options = {}) {
    try {
      logger.debug('Analyzing API combination patterns', {
        combinationCount: apiCombinations.length
      });

      const minUsage = options.minUsage || 10;
      const minSuccess = options.minSuccess || 0.5;

      // Filter high-performing combinations
      const viableCombinations = apiCombinations.filter(combo => 
        combo.usage >= minUsage && combo.success >= minSuccess
      );

      // Sort by combined score (success rate * usage)
      viableCombinations.sort((a, b) => (b.success * b.usage) - (a.success * a.usage));

      // Identify top combinations
      const topCombinations = viableCombinations.slice(0, 10).map(combo => ({
        apis: combo.apis,
        success: combo.success,
        usage: combo.usage,
        score: combo.success * combo.usage,
        complexity: combo.apis.length,
        domains: this.identifyDomains(combo.apis)
      }));

      // Analyze combination trends
      const trends = await this.analyzeCombinationTrends(viableCombinations);

      // Find synergistic combinations (better together than alone)
      const synergies = await this.findSynergisticCombinations(viableCombinations);

      // Store combination patterns
      for (const combination of topCombinations) {
        const patternId = `combo_${combination.apis.join('_')}`;
        this.combinationPatterns.set(patternId, {
          id: patternId,
          type: 'combination',
          apis: combination.apis,
          metrics: {
            success: combination.success,
            usage: combination.usage,
            score: combination.score
          },
          identifiedAt: new Date().toISOString()
        });
      }

      const result = {
        topCombinations,
        trends,
        synergies,
        statistics: {
          totalCombinations: apiCombinations.length,
          viableCombinations: viableCombinations.length,
          averageSuccess: viableCombinations.reduce((sum, c) => sum + c.success, 0) / viableCombinations.length,
          averageUsage: viableCombinations.reduce((sum, c) => sum + c.usage, 0) / viableCombinations.length
        }
      };

      logger.info('API combination analysis completed', {
        topCombinations: topCombinations.length,
        trends: trends.length,
        synergies: synergies.length
      });

      return result;

    } catch (error) {
      logger.error('API combination analysis failed', { error: error.message });
      throw error;
    }
  }

  /**
   * Analyze temporal patterns in user behavior
   */
  async analyzeTemporalPatterns(temporalData, options = {}) {
    try {
      logger.debug('Analyzing temporal patterns', {
        dataPoints: temporalData.length
      });

      const patterns = [];

      // Hour-based patterns
      const hourlyPatterns = this.analyzeHourlyPatterns(temporalData);
      patterns.push(...hourlyPatterns);

      // Day-of-week patterns
      const weeklyPatterns = this.analyzeWeeklyPatterns(temporalData);
      patterns.push(...weeklyPatterns);

      // Frequency patterns
      const frequencyPatterns = this.analyzeFrequencyPatterns(temporalData);
      patterns.push(...frequencyPatterns);

      // Seasonal patterns (if enough data)
      if (temporalData.length > 30) {
        const seasonalPatterns = this.analyzeSeasonalPatterns(temporalData);
        patterns.push(...seasonalPatterns);
      }

      // Store temporal patterns
      for (const pattern of patterns) {
        this.temporalPatterns.set(pattern.id, {
          ...pattern,
          identifiedAt: new Date().toISOString()
        });
      }

      const result = {
        patterns,
        insights: this.generateTemporalInsights(patterns),
        statistics: {
          totalDataPoints: temporalData.length,
          patternsFound: patterns.length,
          timespan: this.calculateTimespan(temporalData),
          mostActiveHour: this.findMostActiveHour(temporalData),
          mostActiveDay: this.findMostActiveDay(temporalData)
        }
      };

      logger.info('Temporal pattern analysis completed', {
        patternsFound: patterns.length,
        mostActiveHour: result.statistics.mostActiveHour,
        mostActiveDay: result.statistics.mostActiveDay
      });

      return result;

    } catch (error) {
      logger.error('Temporal pattern analysis failed', { error: error.message });
      throw error;
    }
  }

  /**
   * Extract intent features for pattern analysis
   */
  extractIntentFeatures(intent) {
    const words = intent.toLowerCase()
      .replace(/[^\w\s]/g, '')
      .split(/\s+/)
      .filter(word => word.length > 2);

    return {
      originalIntent: intent,
      words: new Set(words),
      wordCount: words.length,
      hasFinancial: /balance|account|money|financial|bank|payment|transaction/i.test(intent),
      hasWeather: /weather|temperature|condition|forecast|climate/i.test(intent),
      hasCurrency: /currency|exchange|rate|dollar|euro|conversion/i.test(intent),
      hasGoals: /goal|target|saving|plan|objective/i.test(intent),
      hasNews: /news|update|headline|article/i.test(intent),
      actionType: this.identifyActionType(intent),
      complexity: this.calculateIntentComplexity(intent),
      domains: this.identifyIntentDomains(intent)
    };
  }

  /**
   * Find frequent word patterns
   */
  async findWordPatterns(intentFeatures, minSupport) {
    const wordCounts = new Map();
    const totalIntents = intentFeatures.length;

    // Count word occurrences
    for (const features of intentFeatures) {
      for (const word of features.words) {
        wordCounts.set(word, (wordCounts.get(word) || 0) + 1);
      }
    }

    // Find frequent words
    const patterns = [];
    for (const [word, count] of wordCounts) {
      const support = count / totalIntents;
      if (support >= minSupport) {
        patterns.push({
          id: `word_${word}`,
          type: 'word_pattern',
          pattern: word,
          support,
          frequency: count,
          category: 'vocabulary'
        });
      }
    }

    return patterns;
  }

  /**
   * Find domain combination patterns
   */
  async findDomainPatterns(intentFeatures, minSupport) {
    const domainCombinations = new Map();
    const totalIntents = intentFeatures.length;

    for (const features of intentFeatures) {
      const domains = features.domains.sort().join('_');
      if (domains) {
        domainCombinations.set(domains, (domainCombinations.get(domains) || 0) + 1);
      }
    }

    const patterns = [];
    for (const [combination, count] of domainCombinations) {
      const support = count / totalIntents;
      if (support >= minSupport) {
        patterns.push({
          id: `domain_${combination}`,
          type: 'domain_pattern',
          pattern: combination.split('_'),
          support,
          frequency: count,
          category: 'domain_combination'
        });
      }
    }

    return patterns;
  }

  /**
   * Find action patterns
   */
  async findActionPatterns(intentFeatures, minSupport) {
    const actionCounts = new Map();
    const totalIntents = intentFeatures.length;

    for (const features of intentFeatures) {
      const actionType = features.actionType;
      if (actionType) {
        actionCounts.set(actionType, (actionCounts.get(actionType) || 0) + 1);
      }
    }

    const patterns = [];
    for (const [action, count] of actionCounts) {
      const support = count / totalIntents;
      if (support >= minSupport) {
        patterns.push({
          id: `action_${action}`,
          type: 'action_pattern',
          pattern: action,
          support,
          frequency: count,
          category: 'user_behavior'
        });
      }
    }

    return patterns;
  }

  /**
   * Find structural patterns in intent complexity
   */
  async findStructuralPatterns(intentFeatures, minSupport) {
    const complexityGroups = new Map();
    const totalIntents = intentFeatures.length;

    for (const features of intentFeatures) {
      const complexity = features.complexity;
      const complexityGroup = complexity <= 2 ? 'simple' : 
                             complexity <= 4 ? 'moderate' : 'complex';
      
      complexityGroups.set(complexityGroup, (complexityGroups.get(complexityGroup) || 0) + 1);
    }

    const patterns = [];
    for (const [group, count] of complexityGroups) {
      const support = count / totalIntents;
      if (support >= minSupport) {
        patterns.push({
          id: `complexity_${group}`,
          type: 'structural_pattern',
          pattern: group,
          support,
          frequency: count,
          category: 'complexity'
        });
      }
    }

    return patterns;
  }

  /**
   * Extract subsequences of given length from workflow sequences
   */
  extractSubsequences(sequences, length) {
    const subsequences = [];
    
    for (const sequence of sequences) {
      for (let i = 0; i <= sequence.length - length; i++) {
        const subsequence = sequence.slice(i, i + length);
        subsequences.push(subsequence);
      }
    }
    
    return subsequences;
  }

  /**
   * Find frequent subsequences
   */
  findFrequentSubsequences(subsequences, minSupport) {
    const subsequenceCounts = new Map();
    const totalSubsequences = subsequences.length;

    for (const subsequence of subsequences) {
      const key = subsequence.join('|');
      subsequenceCounts.set(key, (subsequenceCounts.get(key) || 0) + 1);
    }

    const frequent = new Map();
    for (const [key, count] of subsequenceCounts) {
      const support = count / totalSubsequences;
      if (support >= minSupport) {
        frequent.set(key.split('|'), support);
      }
    }

    return frequent;
  }

  /**
   * Find parallel execution patterns
   */
  async findParallelPatterns(workflowSequences) {
    const patterns = [];
    
    // Look for operations that frequently appear at the same position
    const positionMaps = new Map();
    
    for (const sequence of workflowSequences) {
      for (let i = 0; i < sequence.length; i++) {
        if (!positionMaps.has(i)) {
          positionMaps.set(i, new Map());
        }
        const operation = sequence[i];
        const posMap = positionMaps.get(i);
        posMap.set(operation, (posMap.get(operation) || 0) + 1);
      }
    }

    // Find operations that commonly execute in parallel (same position, different workflows)
    for (let pos = 0; pos < 3; pos++) { // Check first 3 positions
      const posMap = positionMaps.get(pos);
      if (posMap && posMap.size > 1) {
        const operations = Array.from(posMap.keys());
        if (operations.length >= 2) {
          patterns.push({
            id: `parallel_pos${pos}_${operations.join('_')}`,
            type: 'parallel',
            operations,
            position: pos,
            frequency: Array.from(posMap.values()).reduce((a, b) => a + b, 0)
          });
        }
      }
    }

    return patterns;
  }

  /**
   * Helper methods for temporal analysis
   */
  analyzeHourlyPatterns(data) {
    const hourlyActivity = new Array(24).fill(0);
    
    for (const item of data) {
      if (item.hour !== undefined) {
        hourlyActivity[item.hour] += item.frequency || 1;
      }
    }

    const patterns = [];
    const avgActivity = hourlyActivity.reduce((a, b) => a + b, 0) / 24;
    
    for (let hour = 0; hour < 24; hour++) {
      if (hourlyActivity[hour] > avgActivity * 1.5) {
        patterns.push({
          id: `hourly_peak_${hour}`,
          type: 'temporal',
          pattern: 'peak_hour',
          hour,
          activity: hourlyActivity[hour],
          category: 'time_based'
        });
      }
    }

    return patterns;
  }

  analyzeWeeklyPatterns(data) {
    const weeklyActivity = new Array(7).fill(0);
    
    for (const item of data) {
      if (item.dayOfWeek !== undefined) {
        weeklyActivity[item.dayOfWeek] += item.frequency || 1;
      }
    }

    const patterns = [];
    const avgActivity = weeklyActivity.reduce((a, b) => a + b, 0) / 7;
    
    for (let day = 0; day < 7; day++) {
      if (weeklyActivity[day] > avgActivity * 1.3) {
        patterns.push({
          id: `weekly_peak_${day}`,
          type: 'temporal',
          pattern: 'peak_day',
          dayOfWeek: day,
          activity: weeklyActivity[day],
          category: 'day_based'
        });
      }
    }

    return patterns;
  }

  analyzeFrequencyPatterns(data) {
    const patterns = [];
    const frequencies = data.map(d => d.frequency || 1);
    const avgFreq = frequencies.reduce((a, b) => a + b, 0) / frequencies.length;
    
    if (avgFreq > 0.8) {
      patterns.push({
        id: 'high_frequency_usage',
        type: 'temporal',
        pattern: 'high_frequency',
        frequency: avgFreq,
        category: 'usage_intensity'
      });
    }

    return patterns;
  }

  analyzeSeasonalPatterns(data) {
    // Placeholder for seasonal analysis with more complex time series analysis
    return [];
  }

  /**
   * Helper methods for various analyses
   */
  identifyActionType(intent) {
    if (/^(get|show|display|view)/i.test(intent)) return 'retrieve';
    if (/^(check|verify|confirm)/i.test(intent)) return 'validate';
    if (/^(update|change|modify)/i.test(intent)) return 'modify';
    if (/^(create|add|new)/i.test(intent)) return 'create';
    if (/^(delete|remove|cancel)/i.test(intent)) return 'delete';
    return 'unknown';
  }

  calculateIntentComplexity(intent) {
    const words = intent.split(/\s+/).length;
    const hasConjunctions = /\b(and|or|with|plus|also)\b/i.test(intent);
    const hasComparisons = /\b(compare|versus|vs|between)\b/i.test(intent);
    
    let complexity = words / 5; // Base complexity from word count
    if (hasConjunctions) complexity += 1;
    if (hasComparisons) complexity += 1;
    
    return Math.round(complexity);
  }

  identifyIntentDomains(intent) {
    const domains = [];
    if (/balance|account|financial|bank|money/i.test(intent)) domains.push('financial');
    if (/weather|temperature|forecast|climate/i.test(intent)) domains.push('weather');
    if (/currency|exchange|rate/i.test(intent)) domains.push('currency');
    if (/news|headline|update/i.test(intent)) domains.push('news');
    if (/goal|target|saving/i.test(intent)) domains.push('goals');
    return domains;
  }

  identifyDomains(apis) {
    return apis.map(api => {
      if (api.includes('bank') || api.includes('account') || api.includes('financial')) return 'financial';
      if (api.includes('weather') || api.includes('climate')) return 'weather';
      if (api.includes('currency') || api.includes('exchange')) return 'currency';
      if (api.includes('news')) return 'news';
      return 'other';
    });
  }

  async analyzeCombinationTrends(combinations) {
    // Analyze trends in API combinations
    const trends = [];
    
    const multiDomainCombos = combinations.filter(c => c.apis.length > 1);
    if (multiDomainCombos.length > combinations.length * 0.6) {
      trends.push({
        type: 'multi_domain_preference',
        description: 'Users prefer multi-domain workflows',
        strength: multiDomainCombos.length / combinations.length
      });
    }

    return trends;
  }

  async findSynergisticCombinations(combinations) {
    // Find combinations that perform better together than individually
    const synergies = [];
    
    // This would require individual API performance data for comparison
    // For now, identify high-performing multi-API combinations
    const highPerforming = combinations.filter(c => 
      c.apis.length > 1 && c.success > 0.9 && c.usage > 50
    );

    for (const combo of highPerforming) {
      synergies.push({
        apis: combo.apis,
        synergy: combo.success,
        usage: combo.usage,
        type: 'high_performance_combination'
      });
    }

    return synergies;
  }

  countUniqueOperations(sequences) {
    const unique = new Set();
    for (const sequence of sequences) {
      for (const operation of sequence) {
        unique.add(operation);
      }
    }
    return unique.size;
  }

  calculateAverageLength(sequences) {
    const totalLength = sequences.reduce((sum, seq) => sum + seq.length, 0);
    return sequences.length > 0 ? totalLength / sequences.length : 0;
  }

  findSequenceExamples(workflowSequences, targetSequence) {
    const examples = [];
    for (const sequence of workflowSequences) {
      if (this.sequenceContains(sequence, targetSequence)) {
        examples.push(sequence);
        if (examples.length >= 3) break; // Limit examples
      }
    }
    return examples;
  }

  sequenceContains(sequence, subsequence) {
    for (let i = 0; i <= sequence.length - subsequence.length; i++) {
      let matches = true;
      for (let j = 0; j < subsequence.length; j++) {
        if (sequence[i + j] !== subsequence[j]) {
          matches = false;
          break;
        }
      }
      if (matches) return true;
    }
    return false;
  }

  generateTemporalInsights(patterns) {
    const insights = [];
    
    const peakHours = patterns.filter(p => p.pattern === 'peak_hour');
    if (peakHours.length > 0) {
      insights.push(`Peak usage hours: ${peakHours.map(p => `${p.hour}:00`).join(', ')}`);
    }

    const peakDays = patterns.filter(p => p.pattern === 'peak_day');
    if (peakDays.length > 0) {
      const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      insights.push(`Peak usage days: ${peakDays.map(p => dayNames[p.dayOfWeek]).join(', ')}`);
    }

    return insights;
  }

  calculateTimespan(data) {
    if (data.length === 0) return 0;
    
    const timestamps = data.map(d => d.timestamp || Date.now()).filter(t => t);
    if (timestamps.length === 0) return 0;
    
    const earliest = Math.min(...timestamps);
    const latest = Math.max(...timestamps);
    return (latest - earliest) / (24 * 60 * 60 * 1000); // Days
  }

  findMostActiveHour(data) {
    const hourCounts = new Array(24).fill(0);
    for (const item of data) {
      if (item.hour !== undefined) {
        hourCounts[item.hour] += item.frequency || 1;
      }
    }
    return hourCounts.indexOf(Math.max(...hourCounts));
  }

  findMostActiveDay(data) {
    const dayCounts = new Array(7).fill(0);
    for (const item of data) {
      if (item.dayOfWeek !== undefined) {
        dayCounts[item.dayOfWeek] += item.frequency || 1;
      }
    }
    return dayCounts.indexOf(Math.max(...dayCounts));
  }
}