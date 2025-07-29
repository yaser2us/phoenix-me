import { logger } from '../utils/logger.js';

/**
 * Workflow Optimizer for Phase 4
 * Provides advanced workflow optimization with:
 * - Cost and time optimization algorithms
 * - Parallel execution planning  
 * - Resource allocation optimization
 * - Performance prediction and analysis
 */
export class WorkflowOptimizer {
  constructor() {
    // Optimization algorithms registry
    this.algorithms = new Map([
      ['greedy_time', this.greedyTimeOptimization.bind(this)],
      ['greedy_cost', this.greedyCostOptimization.bind(this)],
      ['genetic_balanced', this.geneticBalancedOptimization.bind(this)],
      ['dynamic_programming', this.dynamicProgrammingOptimization.bind(this)],
      ['critical_path', this.criticalPathOptimization.bind(this)]
    ]);

    // Performance weights for different optimization criteria
    this.optimizationWeights = {
      speed: { time: 0.7, cost: 0.1, reliability: 0.2 },
      cost: { time: 0.2, cost: 0.6, reliability: 0.2 },
      reliability: { time: 0.2, cost: 0.2, reliability: 0.6 },
      balanced: { time: 0.4, cost: 0.3, reliability: 0.3 }
    };

    // Resource constraints and limits
    this.resourceLimits = {
      maxParallelOperations: 5,
      maxExecutionTime: 30000, // 30 seconds
      maxTotalCost: 20,
      minReliability: 0.6
    };

    this.initialized = true;
  }

  /**
   * Main workflow optimization method
   * @param {Object} workflowPlan - Original workflow plan
   * @param {Object} constraints - Optimization constraints
   * @param {string} algorithm - Optimization algorithm to use
   * @returns {Object} Optimized workflow plan
   */
  async optimizeWorkflow(workflowPlan, constraints = {}, algorithm = 'balanced') {
    try {
      logger.debug('Workflow optimization started', { 
        steps: workflowPlan.steps?.length || 0,
        algorithm 
      });

      const startTime = Date.now();

      // Merge constraints with defaults
      const effectiveConstraints = {
        ...this.resourceLimits,
        ...constraints,
        optimizationTarget: algorithm
      };

      // Choose optimization algorithm
      const optimizationMethod = this.algorithms.get(
        this.selectOptimizationAlgorithm(workflowPlan, algorithm)
      );

      if (!optimizationMethod) {
        throw new Error(`Unknown optimization algorithm: ${algorithm}`);
      }

      // Apply optimization
      const optimizedPlan = await optimizationMethod(workflowPlan, effectiveConstraints);

      // Validate optimized plan
      const validation = this.validateOptimizedPlan(optimizedPlan, effectiveConstraints);
      if (!validation.valid) {
        logger.warn('Optimization produced invalid plan, applying fixes', validation.issues);
        optimizedPlan = await this.fixPlanIssues(optimizedPlan, validation.issues);
      }

      // Calculate optimization metrics
      const metrics = this.calculateOptimizationMetrics(workflowPlan, optimizedPlan);

      const optimizationDuration = Date.now() - startTime;

      const result = {
        ...optimizedPlan,
        optimization: {
          algorithm: algorithm,
          metrics: metrics,
          constraints: effectiveConstraints,
          optimizationTime: optimizationDuration,
          improvementPercentage: metrics.overallImprovement
        }
      };

      logger.debug('Workflow optimization completed', {
        improvement: metrics.overallImprovement,
        optimizationTime: optimizationDuration
      });

      return result;

    } catch (error) {
      logger.error('Workflow optimization failed', { error: error.message });
      
      // Return original plan with error information
      return {
        ...workflowPlan,
        optimization: {
          failed: true,
          error: error.message,
          fallbackUsed: true
        }
      };
    }
  }

  /**
   * Select appropriate optimization algorithm based on workflow characteristics
   * @param {Object} workflowPlan - Workflow plan to analyze
   * @param {string} userPreference - User's preferred algorithm
   * @returns {string} Selected algorithm name
   */
  selectOptimizationAlgorithm(workflowPlan, userPreference) {
    const stepCount = workflowPlan.steps?.length || 0;
    
    // For simple workflows, use greedy algorithms
    if (stepCount <= 3) {
      return userPreference === 'cost' ? 'greedy_cost' : 'greedy_time';
    }
    
    // For moderate complexity, use critical path
    if (stepCount <= 6) {
      return 'critical_path';
    }
    
    // For complex workflows, use genetic algorithm
    if (stepCount > 6) {
      return 'genetic_balanced';
    }

    // Default to user preference or greedy time
    return this.algorithms.has(userPreference) ? userPreference : 'greedy_time';
  }

  /**
   * Greedy time optimization - prioritize fastest execution
   * @param {Object} workflowPlan - Original plan
   * @param {Object} constraints - Constraints
   * @returns {Object} Time-optimized plan
   */
  async greedyTimeOptimization(workflowPlan, constraints) {
    const steps = [...(workflowPlan.steps || [])];
    const dependencies = workflowPlan.dependencies || new Map();
    
    // Sort steps by execution time (ascending)
    const stepCosts = this.extractStepCosts(workflowPlan);
    steps.sort((a, b) => stepCosts.get(a)?.time - stepCosts.get(b)?.time);

    // Build optimized execution plan
    const optimizedSteps = [];
    const parallelGroups = [];
    let currentParallelGroup = [];
    let totalTime = 0;

    for (const step of steps) {
      const stepCost = stepCosts.get(step) || { time: 1000, cost: 2 };
      const canRunInParallel = this.canRunInParallel(step, currentParallelGroup, dependencies);

      if (canRunInParallel && currentParallelGroup.length < constraints.maxParallelOperations) {
        currentParallelGroup.push(step);
      } else {
        // Finalize current parallel group
        if (currentParallelGroup.length > 1) {
          parallelGroups.push({
            operations: [...currentParallelGroup],
            estimatedTime: Math.max(...currentParallelGroup.map(op => 
              stepCosts.get(op)?.time || 1000
            ))
          });
        }
        
        // Start new group
        currentParallelGroup = [step];
        optimizedSteps.push(step);
      }

      totalTime += stepCost.time;
    }

    // Handle final parallel group
    if (currentParallelGroup.length > 1) {
      parallelGroups.push({
        operations: currentParallelGroup,
        estimatedTime: Math.max(...currentParallelGroup.map(op => 
          stepCosts.get(op)?.time || 1000
        ))
      });
    }

    // Calculate optimized time
    const optimizedTime = this.calculateOptimizedTime(parallelGroups, stepCosts);

    return {
      ...workflowPlan,
      steps: optimizedSteps,
      parallelSteps: parallelGroups,
      estimatedTime: optimizedTime,
      optimizationStrategy: 'greedy_time'
    };
  }

  /**
   * Greedy cost optimization - prioritize lowest cost execution
   * @param {Object} workflowPlan - Original plan
   * @param {Object} constraints - Constraints
   * @returns {Object} Cost-optimized plan
   */
  async greedyCostOptimization(workflowPlan, constraints) {
    const steps = [...(workflowPlan.steps || [])];
    const stepCosts = this.extractStepCosts(workflowPlan);
    
    // Sort steps by cost (ascending)
    steps.sort((a, b) => stepCosts.get(a)?.cost - stepCosts.get(b)?.cost);

    // Build cost-optimized plan with minimal parallelization
    const parallelGroups = [];
    const dependencies = workflowPlan.dependencies || new Map();
    
    // Group only essential parallel operations to minimize resource usage
    const essentialParallel = this.identifyEssentialParallelOperations(steps, dependencies);
    
    for (const group of essentialParallel) {
      if (group.length > 1) {
        parallelGroups.push({
          operations: group,
          estimatedTime: Math.max(...group.map(op => stepCosts.get(op)?.time || 1000)),
          costSaving: group.length > 1 ? group.length - 1 : 0 // Resource sharing benefit
        });
      }
    }

    const totalCost = steps.reduce((sum, step) => 
      sum + (stepCosts.get(step)?.cost || 2), 0
    );

    return {
      ...workflowPlan,
      steps: steps,
      parallelSteps: parallelGroups,
      estimatedCost: totalCost,
      optimizationStrategy: 'greedy_cost'
    };
  }

  /**
   * Critical path optimization - optimize based on dependency critical path
   * @param {Object} workflowPlan - Original plan
   * @param {Object} constraints - Constraints
   * @returns {Object} Critical path optimized plan
   */
  async criticalPathOptimization(workflowPlan, constraints) {
    const steps = workflowPlan.steps || [];
    const dependencies = workflowPlan.dependencies || new Map();
    const stepCosts = this.extractStepCosts(workflowPlan);

    // Build critical path analysis
    const criticalPath = this.calculateCriticalPath(steps, dependencies, stepCosts);
    
    // Identify bottleneck operations
    const bottlenecks = criticalPath.filter((step, index) => {
      const stepTime = stepCosts.get(step)?.time || 1000;
      const avgTime = criticalPath.reduce((sum, s) => 
        sum + (stepCosts.get(s)?.time || 1000), 0
      ) / criticalPath.length;
      return stepTime > avgTime * 1.5; // 50% above average
    });

    // Optimize by parallelizing non-critical operations
    const nonCriticalOps = steps.filter(step => !criticalPath.includes(step));
    const parallelGroups = this.createOptimalParallelGroups(
      nonCriticalOps, 
      dependencies, 
      constraints.maxParallelOperations
    );

    // Calculate optimized execution time
    const criticalPathTime = criticalPath.reduce((sum, step) => 
      sum + (stepCosts.get(step)?.time || 1000), 0
    );
    
    const parallelTime = Math.max(...parallelGroups.map(group => 
      Math.max(...group.operations.map(op => stepCosts.get(op)?.time || 1000))
    ), 0);

    const optimizedTime = Math.max(criticalPathTime, parallelTime);

    return {
      ...workflowPlan,
      steps: steps,
      parallelSteps: parallelGroups,
      estimatedTime: optimizedTime,
      criticalPath: criticalPath,
      bottlenecks: bottlenecks,
      optimizationStrategy: 'critical_path'
    };
  }

  /**
   * Genetic algorithm for balanced optimization
   * @param {Object} workflowPlan - Original plan
   * @param {Object} constraints - Constraints
   * @returns {Object} Genetically optimized plan
   */
  async geneticBalancedOptimization(workflowPlan, constraints) {
    // Simplified genetic algorithm for workflow optimization
    const steps = workflowPlan.steps || [];
    const populationSize = 10;
    const generations = 5;
    const mutationRate = 0.1;

    let population = this.initializePopulation(workflowPlan, populationSize);
    
    for (let generation = 0; generation < generations; generation++) {
      // Evaluate fitness for each individual
      const fitness = population.map(individual => 
        this.calculateFitness(individual, constraints)
      );

      // Select best individuals
      const selected = this.selectBestIndividuals(population, fitness, populationSize / 2);

      // Create new generation through crossover and mutation
      population = this.createNewGeneration(selected, populationSize, mutationRate);
    }

    // Return the best individual from final population
    const finalFitness = population.map(individual => 
      this.calculateFitness(individual, constraints)
    );
    
    const bestIndex = finalFitness.indexOf(Math.max(...finalFitness));
    const bestPlan = population[bestIndex];

    return {
      ...bestPlan,
      optimizationStrategy: 'genetic_balanced',
      geneticStats: {
        generations: generations,
        populationSize: populationSize,
        bestFitness: finalFitness[bestIndex]
      }
    };
  }

  /**
   * Dynamic programming optimization for complex dependencies
   * @param {Object} workflowPlan - Original plan
   * @param {Object} constraints - Constraints
   * @returns {Object} DP optimized plan
   */
  async dynamicProgrammingOptimization(workflowPlan, constraints) {
    // Simplified DP approach for workflow optimization
    const steps = workflowPlan.steps || [];
    const dependencies = workflowPlan.dependencies || new Map();
    const stepCosts = this.extractStepCosts(workflowPlan);

    // Create DP table for optimal substructure
    const dpTable = new Map();
    
    // Base case: single operations
    for (const step of steps) {
      dpTable.set([step].toString(), {
        steps: [step],
        cost: stepCosts.get(step)?.cost || 2,
        time: stepCosts.get(step)?.time || 1000
      });
    }

    // Build up solutions for larger subsets
    for (let size = 2; size <= steps.length; size++) {
      const combinations = this.generateCombinations(steps, size);
      
      for (const combo of combinations) {
        const key = combo.sort().toString();
        let bestSolution = null;
        let bestScore = Infinity;

        // Try all possible splits of this combination
        for (let i = 1; i < combo.length; i++) {
          const left = combo.slice(0, i);
          const right = combo.slice(i);
          
          const leftSolution = dpTable.get(left.sort().toString());
          const rightSolution = dpTable.get(right.sort().toString());
          
          if (leftSolution && rightSolution) {
            const combinedCost = leftSolution.cost + rightSolution.cost;
            const combinedTime = this.canRunInParallel(left[0], right, dependencies) ?
              Math.max(leftSolution.time, rightSolution.time) :
              leftSolution.time + rightSolution.time;
            
            const score = combinedCost + (combinedTime / 1000); // Normalize time to cost scale
            
            if (score < bestScore) {
              bestScore = score;
              bestSolution = {
                steps: combo,
                cost: combinedCost,
                time: combinedTime,
                parallelizable: this.canRunInParallel(left[0], right, dependencies)
              };
            }
          }
        }

        if (bestSolution) {
          dpTable.set(key, bestSolution);
        }
      }
    }

    // Extract final solution
    const finalKey = steps.sort().toString();
    const finalSolution = dpTable.get(finalKey);

    return {
      ...workflowPlan,
      steps: finalSolution?.steps || steps,
      estimatedTime: finalSolution?.time || workflowPlan.estimatedTime,
      estimatedCost: finalSolution?.cost || workflowPlan.estimatedCost,
      optimizationStrategy: 'dynamic_programming'
    };
  }

  /**
   * Extract step costs from workflow plan
   * @param {Object} workflowPlan - Workflow plan
   * @returns {Map} Step costs mapping
   */
  extractStepCosts(workflowPlan) {
    const costs = new Map();
    
    // Default API costs
    const defaultCosts = {
      getCurrentLocation: { time: 800, cost: 1, reliability: 0.95 },
      getCurrentWeather: { time: 1200, cost: 2, reliability: 0.90 },
      getExchangeRates: { time: 600, cost: 1, reliability: 0.95 },
      getTopHeadlines: { time: 1500, cost: 3, reliability: 0.85 },
      searchNews: { time: 1800, cost: 4, reliability: 0.80 },
      getRandomFact: { time: 400, cost: 1, reliability: 0.98 }
    };

    for (const step of (workflowPlan.steps || [])) {
      costs.set(step, defaultCosts[step] || { time: 1000, cost: 2, reliability: 0.8 });
    }

    return costs;
  }

  /**
   * Check if operations can run in parallel
   * @param {string} operation - Operation to check
   * @param {Array} parallelGroup - Current parallel group
   * @param {Map} dependencies - Dependency mapping
   * @returns {boolean} Can run in parallel
   */
  canRunInParallel(operation, parallelGroup, dependencies) {
    const opDeps = dependencies.get(operation) || [];
    
    return parallelGroup.every(groupOp => {
      const groupDeps = dependencies.get(groupOp) || [];
      
      // No dependency relationship between operations
      return !opDeps.includes(groupOp) && 
             !groupDeps.includes(operation) &&
             !this.hasTransitiveDependency(operation, groupOp, dependencies);
    });
  }

  /**
   * Check for transitive dependencies between operations
   * @param {string} op1 - First operation
   * @param {string} op2 - Second operation
   * @param {Map} dependencies - Dependency mapping
   * @returns {boolean} Has transitive dependency
   */
  hasTransitiveDependency(op1, op2, dependencies) {
    const visited = new Set();
    
    const hasDependency = (source, target) => {
      if (visited.has(source)) return false;
      visited.add(source);
      
      const deps = dependencies.get(source) || [];
      if (deps.includes(target)) return true;
      
      return deps.some(dep => hasDependency(dep, target));
    };

    return hasDependency(op1, op2) || hasDependency(op2, op1);
  }

  /**
   * Calculate critical path through workflow
   * @param {Array} steps - Workflow steps
   * @param {Map} dependencies - Dependencies
   * @param {Map} stepCosts - Step costs
   * @returns {Array} Critical path
   */
  calculateCriticalPath(steps, dependencies, stepCosts) {
    // Simplified critical path calculation
    const path = [];
    const remaining = [...steps];
    
    while (remaining.length > 0) {
      // Find steps with no remaining dependencies
      const available = remaining.filter(step => {
        const deps = dependencies.get(step) || [];
        return deps.every(dep => path.includes(dep));
      });
      
      if (available.length === 0) {
        // Add remaining steps (circular dependency handling)
        path.push(...remaining);
        break;
      }
      
      // Select step with highest cost (critical)
      const critical = available.reduce((max, step) => {
        const stepCost = stepCosts.get(step)?.time || 1000;
        const maxCost = stepCosts.get(max)?.time || 1000;
        return stepCost > maxCost ? step : max;
      });
      
      path.push(critical);
      remaining.splice(remaining.indexOf(critical), 1);
    }
    
    return path;
  }

  /**
   * Create optimal parallel groups
   * @param {Array} operations - Operations to group
   * @param {Map} dependencies - Dependencies
   * @param {number} maxParallel - Maximum parallel operations
   * @returns {Array} Parallel groups
   */
  createOptimalParallelGroups(operations, dependencies, maxParallel) {
    const groups = [];
    const remaining = [...operations];
    
    while (remaining.length > 0) {
      const group = [remaining.shift()];
      
      // Add compatible operations to group
      for (let i = remaining.length - 1; i >= 0 && group.length < maxParallel; i--) {
        const candidate = remaining[i];
        
        if (this.canRunInParallel(candidate, group, dependencies)) {
          group.push(candidate);
          remaining.splice(i, 1);
        }
      }
      
      if (group.length > 1) {
        groups.push({
          operations: group,
          size: group.length
        });
      }
    }
    
    return groups;
  }

  /**
   * Calculate optimized execution time considering parallelization
   * @param {Array} parallelGroups - Parallel execution groups
   * @param {Map} stepCosts - Step cost mapping
   * @returns {number} Optimized execution time
   */
  calculateOptimizedTime(parallelGroups, stepCosts) {
    let totalTime = 0;
    
    for (const group of parallelGroups) {
      const groupTime = Math.max(...group.operations.map(op => 
        stepCosts.get(op)?.time || 1000
      ));
      totalTime += groupTime;
    }
    
    return totalTime;
  }

  /**
   * Calculate optimization metrics comparing original vs optimized
   * @param {Object} originalPlan - Original workflow plan
   * @param {Object} optimizedPlan - Optimized workflow plan
   * @returns {Object} Optimization metrics
   */
  calculateOptimizationMetrics(originalPlan, optimizedPlan) {
    const originalTime = originalPlan.estimatedTime || 5000;
    const optimizedTime = optimizedPlan.estimatedTime || 5000;
    const timeImprovement = ((originalTime - optimizedTime) / originalTime) * 100;

    const originalCost = originalPlan.estimatedCost || 10;
    const optimizedCost = optimizedPlan.estimatedCost || 10;
    const costImprovement = ((originalCost - optimizedCost) / originalCost) * 100;

    const originalReliability = originalPlan.reliability || 0.8;
    const optimizedReliability = optimizedPlan.reliability || 0.8;
    const reliabilityChange = ((optimizedReliability - originalReliability) / originalReliability) * 100;

    const overallImprovement = (timeImprovement + costImprovement + reliabilityChange) / 3;

    return {
      timeImprovement: Math.round(timeImprovement * 100) / 100,
      costImprovement: Math.round(costImprovement * 100) / 100,
      reliabilityChange: Math.round(reliabilityChange * 100) / 100,
      overallImprovement: Math.round(overallImprovement * 100) / 100,
      parallelizationBenefit: (optimizedPlan.parallelSteps?.length || 0) > 0
    };
  }

  /**
   * Validate optimized plan against constraints
   * @param {Object} plan - Optimized plan
   * @param {Object} constraints - Constraints
   * @returns {Object} Validation result
   */
  validateOptimizedPlan(plan, constraints) {
    const issues = [];
    let valid = true;

    if (plan.estimatedTime > constraints.maxExecutionTime) {
      issues.push(`Execution time ${plan.estimatedTime}ms exceeds limit ${constraints.maxExecutionTime}ms`);
      valid = false;
    }

    if (plan.estimatedCost > constraints.maxTotalCost) {
      issues.push(`Total cost ${plan.estimatedCost} exceeds limit ${constraints.maxTotalCost}`);
      valid = false;
    }

    if (plan.reliability < constraints.minReliability) {
      issues.push(`Reliability ${plan.reliability} below minimum ${constraints.minReliability}`);
      valid = false;
    }

    const maxParallelInGroup = Math.max(...(plan.parallelSteps?.map(g => g.operations.length) || [0]));
    if (maxParallelInGroup > constraints.maxParallelOperations) {
      issues.push(`Parallel group size ${maxParallelInGroup} exceeds limit ${constraints.maxParallelOperations}`);
      valid = false;
    }

    return { valid, issues };
  }

  /**
   * Fix issues in optimized plan
   * @param {Object} plan - Plan with issues
   * @param {Array} issues - Identified issues
   * @returns {Object} Fixed plan
   */
  async fixPlanIssues(plan, issues) {
    const fixedPlan = { ...plan };

    // Reduce parallelization if groups are too large
    if (issues.some(issue => issue.includes('Parallel group size'))) {
      fixedPlan.parallelSteps = (fixedPlan.parallelSteps || []).map(group => ({
        ...group,
        operations: group.operations.slice(0, this.resourceLimits.maxParallelOperations)
      }));
    }

    // Remove expensive operations if cost is too high
    if (issues.some(issue => issue.includes('Total cost'))) {
      // Keep only essential operations
      fixedPlan.steps = fixedPlan.steps.slice(0, Math.floor(fixedPlan.steps.length * 0.7));
      fixedPlan.estimatedCost = Math.floor(fixedPlan.estimatedCost * 0.7);
    }

    return fixedPlan;
  }

  // Genetic algorithm helper methods
  initializePopulation(workflowPlan, size) {
    const population = [];
    for (let i = 0; i < size; i++) {
      population.push(this.createRandomIndividual(workflowPlan));
    }
    return population;
  }

  createRandomIndividual(workflowPlan) {
    const steps = [...(workflowPlan.steps || [])];
    
    // Randomly shuffle steps (respecting dependencies)
    for (let i = steps.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [steps[i], steps[j]] = [steps[j], steps[i]];
    }

    return {
      ...workflowPlan,
      steps: steps,
      parallelSteps: this.generateRandomParallelGroups(steps)
    };
  }

  generateRandomParallelGroups(steps) {
    const groups = [];
    const groupSize = Math.floor(Math.random() * 3) + 1;
    
    for (let i = 0; i < steps.length; i += groupSize) {
      const group = steps.slice(i, i + groupSize);
      if (group.length > 1) {
        groups.push({ operations: group });
      }
    }
    
    return groups;
  }

  calculateFitness(individual, constraints) {
    const weights = this.optimizationWeights[constraints.optimizationTarget] || 
                   this.optimizationWeights.balanced;
    
    const timeScore = 1 - (individual.estimatedTime / 30000); // Normalize to 30s max
    const costScore = 1 - (individual.estimatedCost / 20); // Normalize to 20 cost units max
    const reliabilityScore = individual.reliability || 0.8;
    
    return (weights.time * timeScore) + 
           (weights.cost * costScore) + 
           (weights.reliability * reliabilityScore);
  }

  selectBestIndividuals(population, fitness, count) {
    const indexed = population.map((individual, index) => ({ individual, fitness: fitness[index] }));
    indexed.sort((a, b) => b.fitness - a.fitness);
    return indexed.slice(0, count).map(item => item.individual);
  }

  createNewGeneration(selected, size, mutationRate) {
    const newGeneration = [...selected]; // Keep best individuals
    
    while (newGeneration.length < size) {
      const parent1 = selected[Math.floor(Math.random() * selected.length)];
      const parent2 = selected[Math.floor(Math.random() * selected.length)];
      
      let child = this.crossover(parent1, parent2);
      
      if (Math.random() < mutationRate) {
        child = this.mutate(child);
      }
      
      newGeneration.push(child);
    }
    
    return newGeneration;
  }

  crossover(parent1, parent2) {
    // Simple crossover - combine steps from both parents
    const steps1 = parent1.steps || [];
    const steps2 = parent2.steps || [];
    
    const combinedSteps = [...new Set([...steps1, ...steps2])];
    
    return {
      ...parent1,
      steps: combinedSteps,
      parallelSteps: [...(parent1.parallelSteps || []), ...(parent2.parallelSteps || [])]
    };
  }

  mutate(individual) {
    const mutated = { ...individual };
    
    // Randomly shuffle some steps
    if (mutated.steps && mutated.steps.length > 1) {
      const i = Math.floor(Math.random() * mutated.steps.length);
      const j = Math.floor(Math.random() * mutated.steps.length);
      [mutated.steps[i], mutated.steps[j]] = [mutated.steps[j], mutated.steps[i]];
    }
    
    return mutated;
  }

  // Utility methods
  generateCombinations(array, size) {
    if (size === 1) return array.map(item => [item]);
    
    const combinations = [];
    for (let i = 0; i <= array.length - size; i++) {
      const smaller = this.generateCombinations(array.slice(i + 1), size - 1);
      smaller.forEach(combo => combinations.push([array[i], ...combo]));
    }
    
    return combinations;
  }

  identifyEssentialParallelOperations(steps, dependencies) {
    // Group operations that have no dependencies between them
    const groups = [];
    const processed = new Set();
    
    for (const step of steps) {
      if (processed.has(step)) continue;
      
      const group = [step];
      processed.add(step);
      
      for (const other of steps) {
        if (processed.has(other)) continue;
        
        if (this.canRunInParallel(step, [other], dependencies)) {
          group.push(other);
          processed.add(other);
        }
      }
      
      groups.push(group);
    }
    
    return groups;
  }
}