import { logger } from '../utils/logger.js';

/**
 * Composition Coordinator - Phase 4.9 Checkpoint 1
 * Coordinates the entire workflow composition process from user request to executable plan
 */
export class CompositionCoordinator {
  constructor(catalogProvider, workflowComposer, planParser) {
    this.catalogProvider = catalogProvider;
    this.workflowComposer = workflowComposer;
    this.planParser = planParser;
    this.compositionHistory = [];
    
    logger.info('Composition Coordinator initialized');
  }

  /**
   * Main method to compose a workflow from user request
   */
  async composeWorkflow(userRequest, options = {}) {
    const startTime = Date.now();
    const compositionId = this.generateCompositionId();
    
    logger.info('Starting workflow composition', { 
      compositionId, 
      request: userRequest,
      options 
    });
    
    try {
      // Step 1: Get API capabilities catalog
      const apiCatalog = await this.catalogProvider.getApiCapabilities();
      logger.debug('API catalog retrieved', { operationCount: apiCatalog.operations.length });
      
      // Step 2: Generate workflow plan using Claude
      const workflowPlan = await this.workflowComposer.generateWorkflowPlan(userRequest, apiCatalog);
      logger.debug('Workflow plan generated', { stepCount: workflowPlan.steps.length });
      
      // Step 3: Parse and validate the plan
      const parsedPlan = await this.planParser.parsePlan(workflowPlan);
      if (!parsedPlan.isValid) {
        return this.createFailureResponse(compositionId, 'Plan validation failed', parsedPlan.errors, startTime);
      }
      
      // Step 4: Validate feasibility against available APIs
      const feasibility = await this.planParser.validateFeasibility(workflowPlan, apiCatalog);
      if (!feasibility.feasible) {
        return this.createFailureResponse(compositionId, 'Plan not feasible', feasibility.issues, startTime);
      }
      
      // Step 5: Create final composition result
      const composition = {
        success: true,
        compositionId,
        userRequest,
        workflowPlan: parsedPlan.originalPlan,
        executablePlan: {
          steps: parsedPlan.executableSteps,
          executionOrder: parsedPlan.executionOrder,
          dataFlowMap: parsedPlan.dataFlowMap,
          metadata: parsedPlan.metadata
        },
        feasibilityReport: feasibility,
        performance: {
          compositionTime: Date.now() - startTime,
          estimatedExecutionTime: parsedPlan.metadata.estimatedDuration
        },
        createdAt: new Date().toISOString()
      };
      
      // Store in history
      this.compositionHistory.push(composition);
      
      logger.info('Workflow composition completed successfully', {
        compositionId,
        stepCount: composition.executablePlan.steps.length,
        compositionTime: composition.performance.compositionTime,
        complexity: composition.executablePlan.metadata.complexity
      });
      
      return composition;
      
    } catch (error) {
      logger.error('Workflow composition failed', { 
        compositionId, 
        error: error.message,
        stack: error.stack 
      });
      
      return this.createFailureResponse(compositionId, error.message, [], startTime);
    }
  }

  /**
   * Analyze composition patterns and suggest improvements
   */
  async analyzeCompositionPatterns(userRequest) {
    try {
      // Find similar past compositions
      const similarCompositions = this.findSimilarCompositions(userRequest);
      
      // Analyze intent patterns
      const intentAnalysis = await this.workflowComposer.analyzeIntent(userRequest);
      
      // Get API compatibility insights
      const apiCatalog = await this.catalogProvider.getApiCapabilities();
      const compatibilityMatrix = await this.catalogProvider.getCompatibilityMatrix();
      
      const analysis = {
        intentAnalysis,
        similarCompositions: similarCompositions.slice(0, 5), // Top 5 similar
        recommendedApis: this.recommendApis(intentAnalysis, apiCatalog),
        compatibilityInsights: this.generateCompatibilityInsights(intentAnalysis.apis, compatibilityMatrix),
        optimizationSuggestions: this.generateOptimizationSuggestions(intentAnalysis, similarCompositions)
      };
      
      logger.info('Composition pattern analysis completed', {
        similarCount: similarCompositions.length,
        recommendedApiCount: analysis.recommendedApis.length
      });
      
      return analysis;
      
    } catch (error) {
      logger.error('Composition pattern analysis failed', { error: error.message });
      throw error;
    }
  }

  /**
   * Pre-validate a workflow idea before full composition
   */
  async preValidateWorkflow(userRequest) {
    try {
      logger.debug('Pre-validating workflow', { request: userRequest });
      
      // Quick intent analysis
      const intentAnalysis = await this.workflowComposer.analyzeIntent(userRequest);
      
      // Check API availability
      const apiCatalog = await this.catalogProvider.getApiCapabilities();
      const availableApis = intentAnalysis.apis.filter(api => 
        apiCatalog.domains.some(domain => domain.name === api)
      );
      
      // Basic feasibility check
      const missingApis = intentAnalysis.apis.filter(api => !availableApis.includes(api));
      
      const validation = {
        feasible: missingApis.length === 0,
        confidence: intentAnalysis.confidence,
        requiredApis: intentAnalysis.apis,
        availableApis,
        missingApis,
        complexity: intentAnalysis.complexity,
        estimatedSteps: this.estimateStepCount(intentAnalysis),
        warnings: this.generatePreValidationWarnings(intentAnalysis, availableApis)
      };
      
      logger.info('Pre-validation completed', {
        feasible: validation.feasible,
        complexity: validation.complexity,
        missingApiCount: missingApis.length
      });
      
      return validation;
      
    } catch (error) {
      logger.error('Pre-validation failed', { error: error.message });
      throw error;
    }
  }

  /**
   * Get composition statistics and insights
   */
  getCompositionStats() {
    try {
      const totalCompositions = this.compositionHistory.length;
      const successfulCompositions = this.compositionHistory.filter(c => c.success).length;
      const averageSteps = this.calculateAverageSteps();
      const commonPatterns = this.identifyCommonPatterns();
      const complexityDistribution = this.getComplexityDistribution();
      
      const stats = {
        total: totalCompositions,
        successful: successfulCompositions,
        successRate: totalCompositions > 0 ? (successfulCompositions / totalCompositions * 100).toFixed(1) : 0,
        averageSteps,
        commonPatterns,
        complexityDistribution,
        averageCompositionTime: this.calculateAverageCompositionTime(),
        recentCompositions: this.compositionHistory.slice(-10) // Last 10
      };
      
      logger.debug('Composition statistics calculated', stats);
      return stats;
      
    } catch (error) {
      logger.error('Failed to calculate composition stats', { error: error.message });
      return { total: 0, successful: 0, successRate: 0 };
    }
  }

  /**
   * Create failure response
   */
  createFailureResponse(compositionId, error, details, startTime) {
    const response = {
      success: false,
      compositionId,
      error,
      details: Array.isArray(details) ? details : [details],
      performance: {
        compositionTime: Date.now() - startTime
      },
      createdAt: new Date().toISOString()
    };
    
    // Store failure in history for learning
    this.compositionHistory.push(response);
    
    return response;
  }

  /**
   * Generate unique composition ID
   */
  generateCompositionId() {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    return `comp_${timestamp}_${random}`;
  }

  /**
   * Find similar past compositions
   */
  findSimilarCompositions(userRequest) {
    const requestWords = userRequest.toLowerCase().split(/\s+/);
    const similarities = [];
    
    for (const composition of this.compositionHistory) {
      if (!composition.success) continue;
      
      const compositionWords = composition.userRequest.toLowerCase().split(/\s+/);
      const similarity = this.calculateTextSimilarity(requestWords, compositionWords);
      
      if (similarity > 0.3) { // 30% similarity threshold
        similarities.push({ ...composition, similarity });
      }
    }
    
    return similarities.sort((a, b) => b.similarity - a.similarity);
  }

  /**
   * Calculate text similarity between two word arrays
   */
  calculateTextSimilarity(words1, words2) {
    const set1 = new Set(words1);
    const set2 = new Set(words2);
    const intersection = new Set([...set1].filter(x => set2.has(x)));
    const union = new Set([...set1, ...set2]);
    
    return intersection.size / union.size;
  }

  /**
   * Recommend APIs based on intent analysis
   */
  recommendApis(intentAnalysis, apiCatalog) {
    const recommendations = [];
    
    // Get operations matching detected APIs
    for (const apiDomain of intentAnalysis.apis) {
      const domainOps = apiCatalog.operations.filter(op => op.domain === apiDomain);
      recommendations.push(...domainOps.slice(0, 3)); // Top 3 per domain
    }
    
    // Add complementary APIs based on intent
    if (intentAnalysis.intent === 'comprehensive_overview') {
      const additionalDomains = ['news', 'goals'];
      for (const domain of additionalDomains) {
        if (!intentAnalysis.apis.includes(domain)) {
          const domainOps = apiCatalog.operations.filter(op => op.domain === domain);
          recommendations.push(...domainOps.slice(0, 1)); // One per additional domain
        }
      }
    }
    
    return recommendations;
  }

  /**
   * Generate compatibility insights
   */
  generateCompatibilityInsights(detectedApis, compatibilityMatrix) {
    const insights = [];
    
    for (let i = 0; i < detectedApis.length; i++) {
      for (let j = i + 1; j < detectedApis.length; j++) {
        const api1 = detectedApis[i];
        const api2 = detectedApis[j];
        
        // Find operations from these domains in compatibility matrix
        const api1Ops = Object.keys(compatibilityMatrix).filter(op => op.includes(api1));
        const api2Ops = Object.keys(compatibilityMatrix).filter(op => op.includes(api2));
        
        if (api1Ops.length > 0 && api2Ops.length > 0) {
          const compatibility = compatibilityMatrix[api1Ops[0]]?.[api2Ops[0]] || 'unknown';
          insights.push({
            api1,
            api2,
            compatibility,
            dataFlowPotential: compatibility === 'high' ? 'excellent' : compatibility === 'medium' ? 'good' : 'limited'
          });
        }
      }
    }
    
    return insights;
  }

  /**
   * Generate optimization suggestions
   */
  generateOptimizationSuggestions(intentAnalysis, similarCompositions) {
    const suggestions = [];
    
    // Suggest based on complexity
    if (intentAnalysis.complexity === 'multi_api') {
      suggestions.push('Consider parallel execution for independent operations');
    }
    
    // Suggest based on similar compositions
    if (similarCompositions.length > 0) {
      const avgSteps = similarCompositions.reduce((acc, comp) => acc + comp.workflowPlan.steps.length, 0) / similarCompositions.length;
      if (avgSteps > 5) {
        suggestions.push('Similar requests typically require multiple steps - consider breaking into phases');
      }
    }
    
    // Suggest caching for data-heavy operations
    if (intentAnalysis.apis.includes('banking')) {
      suggestions.push('Consider caching banking data for improved performance');
    }
    
    return suggestions;
  }

  /**
   * Estimate step count from intent analysis
   */
  estimateStepCount(intentAnalysis) {
    let stepCount = intentAnalysis.apis.length;
    
    if (intentAnalysis.needsSynthesis) {
      stepCount += 1; // Add synthesis step
    }
    
    if (intentAnalysis.complexity === 'multi_api') {
      stepCount += Math.floor(stepCount * 0.5); // 50% more for complexity
    }
    
    return Math.max(1, Math.min(10, stepCount)); // Between 1 and 10 steps
  }

  /**
   * Generate pre-validation warnings
   */
  generatePreValidationWarnings(intentAnalysis, availableApis) {
    const warnings = [];
    
    if (intentAnalysis.confidence < 0.7) {
      warnings.push('Intent analysis confidence is low - request may be ambiguous');
    }
    
    if (availableApis.length < intentAnalysis.apis.length) {
      warnings.push('Some required APIs may not be available');
    }
    
    if (intentAnalysis.complexity === 'multi_api') {
      warnings.push('Complex multi-API workflow - execution time may be longer');
    }
    
    return warnings;
  }

  /**
   * Calculate average steps across successful compositions
   */
  calculateAverageSteps() {
    const successful = this.compositionHistory.filter(c => c.success);
    if (successful.length === 0) return 0;
    
    const totalSteps = successful.reduce((acc, comp) => acc + comp.workflowPlan.steps.length, 0);
    return (totalSteps / successful.length).toFixed(1);
  }

  /**
   * Identify common composition patterns
   */
  identifyCommonPatterns() {
    const patterns = {};
    
    for (const composition of this.compositionHistory) {
      if (!composition.success) continue;
      
      const domains = composition.workflowPlan.steps.map(s => s.domain);
      const pattern = domains.sort().join('+');
      
      patterns[pattern] = (patterns[pattern] || 0) + 1;
    }
    
    // Return top 5 patterns
    return Object.entries(patterns)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([pattern, count]) => ({ pattern, count }));
  }

  /**
   * Get complexity distribution
   */
  getComplexityDistribution() {
    const distribution = { low: 0, medium: 0, high: 0 };
    
    for (const composition of this.compositionHistory) {
      if (composition.success && composition.executablePlan) {
        const complexity = composition.executablePlan.metadata.complexity;
        distribution[complexity] = (distribution[complexity] || 0) + 1;
      }
    }
    
    return distribution;
  }

  /**
   * Calculate average composition time
   */
  calculateAverageCompositionTime() {
    const times = this.compositionHistory
      .filter(c => c.performance && c.performance.compositionTime)
      .map(c => c.performance.compositionTime);
    
    if (times.length === 0) return 0;
    
    return Math.round(times.reduce((acc, time) => acc + time, 0) / times.length);
  }

  /**
   * Clear composition history
   */
  clearHistory() {
    this.compositionHistory = [];
    logger.info('Composition history cleared');
  }
}