import { logger } from '../utils/logger.js';

/**
 * Workflow Plan Parser - Phase 4.9 Checkpoint 1
 * Parses and validates workflow plans from Claude, ensuring executability
 */
export class WorkflowPlanParser {
  constructor() {
    this.validationRules = this.initializeValidationRules();
    logger.info('Workflow Plan Parser initialized');
  }

  /**
   * Parse and validate a workflow plan
   */
  async parsePlan(rawPlan) {
    try {
      logger.debug('Parsing workflow plan', { stepCount: rawPlan.steps?.length });
      
      // Basic structure validation
      const structureValidation = this.validatePlanStructure(rawPlan);
      if (!structureValidation.valid) {
        return { isValid: false, errors: structureValidation.errors };
      }
      
      // Parse and validate steps
      const stepValidation = await this.validateSteps(rawPlan.steps);
      if (!stepValidation.valid) {
        return { isValid: false, errors: stepValidation.errors };
      }
      
      // Parse data flow
      const dataFlowValidation = this.validateDataFlow(rawPlan.dataFlow, rawPlan.steps);
      if (!dataFlowValidation.valid) {
        return { isValid: false, errors: dataFlowValidation.errors };
      }
      
      // Generate execution order
      const executionOrder = this.generateExecutionOrder(rawPlan.steps, rawPlan.dataFlow);
      
      // Create executable steps
      const executableSteps = await this.createExecutableSteps(rawPlan.steps, executionOrder);
      
      const parsedPlan = {
        isValid: true,
        originalPlan: rawPlan,
        executableSteps: executableSteps,
        executionOrder: executionOrder,
        dataFlowMap: this.createDataFlowMap(rawPlan.dataFlow),
        metadata: {
          totalSteps: rawPlan.steps.length,
          parallelizable: this.isParallelizable(rawPlan.steps, rawPlan.dataFlow),
          estimatedDuration: this.estimateExecutionTime(rawPlan.steps),
          complexity: this.assessPlanComplexity(rawPlan)
        },
        parsedAt: new Date().toISOString()
      };
      
      logger.info('Workflow plan parsed successfully', {
        stepCount: parsedPlan.executableSteps.length,
        parallelizable: parsedPlan.metadata.parallelizable,
        complexity: parsedPlan.metadata.complexity
      });
      
      return parsedPlan;
      
    } catch (error) {
      logger.error('Workflow plan parsing failed', { error: error.message });
      return { isValid: false, errors: [error.message] };
    }
  }

  /**
   * Validate plan feasibility against available APIs
   */
  async validateFeasibility(plan, apiCatalog) {
    try {
      const feasibilityReport = {
        feasible: true,
        issues: [],
        warnings: [],
        suggestions: []
      };
      
      // Check if all operations exist
      for (const step of plan.steps) {
        const operation = apiCatalog.operations.find(op => op.id === step.operation);
        
        if (!operation) {
          // Check for synthetic operations (acceptable for composition)
          if (this.isSyntheticOperation(step.operation)) {
            feasibilityReport.warnings.push(`Synthetic operation '${step.operation}' will require special handling`);
          } else {
            feasibilityReport.feasible = false;
            feasibilityReport.issues.push(`Operation '${step.operation}' not found in API catalog`);
          }
        } else {
          // Validate parameters
          const paramValidation = this.validateOperationParameters(step, operation);
          if (!paramValidation.valid) {
            feasibilityReport.issues.push(...paramValidation.errors.map(e => `${step.operation}: ${e}`));
          }
        }
      }
      
      // Check data flow feasibility
      if (plan.dataFlow) {
        for (const flow of plan.dataFlow) {
          const fromStep = plan.steps.find(s => s.id === flow.from);
          const toStep = plan.steps.find(s => s.id === flow.to);
          
          if (!fromStep || !toStep) {
            feasibilityReport.feasible = false;
            feasibilityReport.issues.push(`Invalid data flow: ${flow.from} → ${flow.to}`);
          }
        }
      }
      
      // Generate suggestions for improvement
      if (feasibilityReport.issues.length === 0) {
        feasibilityReport.suggestions = this.generateOptimizationSuggestions(plan, apiCatalog);
      }
      
      logger.info('Feasibility validation completed', {
        feasible: feasibilityReport.feasible,
        issueCount: feasibilityReport.issues.length,
        warningCount: feasibilityReport.warnings.length
      });
      
      return feasibilityReport;
      
    } catch (error) {
      logger.error('Feasibility validation failed', { error: error.message });
      return { feasible: false, issues: [`Validation error: ${error.message}`] };
    }
  }

  /**
   * Validate basic plan structure
   */
  validatePlanStructure(plan) {
    const errors = [];
    
    if (!plan || typeof plan !== 'object') {
      errors.push('Plan must be an object');
      return { valid: false, errors };
    }
    
    if (!plan.steps || !Array.isArray(plan.steps)) {
      errors.push('Plan must have a steps array');
    }
    
    if (plan.steps && plan.steps.length === 0) {
      errors.push('Plan must have at least one step');
    }
    
    if (plan.dataFlow && !Array.isArray(plan.dataFlow)) {
      errors.push('Data flow must be an array');
    }
    
    return { valid: errors.length === 0, errors };
  }

  /**
   * Validate individual steps
   */
  async validateSteps(steps) {
    const errors = [];
    const stepIds = new Set();
    
    for (const [index, step] of steps.entries()) {
      const stepErrors = [];
      
      // Required fields
      if (!step.id) stepErrors.push('Step must have an id');
      if (!step.operation) stepErrors.push('Step must have an operation');
      
      // Unique IDs
      if (step.id) {
        if (stepIds.has(step.id)) {
          stepErrors.push(`Duplicate step ID: ${step.id}`);
        }
        stepIds.add(step.id);
      }
      
      // Dependencies validation
      if (step.dependencies) {
        if (!Array.isArray(step.dependencies)) {
          stepErrors.push('Dependencies must be an array');
        } else {
          // Note: We can't validate dependency existence here since we're processing sequentially
          // This will be validated in dependency resolution phase
        }
      }
      
      // Parameters validation
      if (step.parameters && typeof step.parameters !== 'object') {
        stepErrors.push('Parameters must be an object');
      }
      
      if (stepErrors.length > 0) {
        errors.push(`Step ${index + 1} (${step.id || 'unnamed'}): ${stepErrors.join(', ')}`);
      }
    }
    
    return { valid: errors.length === 0, errors };
  }

  /**
   * Validate data flow
   */
  validateDataFlow(dataFlow, steps) {
    const errors = [];
    
    if (!dataFlow) {
      return { valid: true, errors: [] }; // Data flow is optional
    }
    
    const stepIds = new Set(steps.map(s => s.id));
    
    for (const [index, flow] of dataFlow.entries()) {
      const flowErrors = [];
      
      if (!flow.from) flowErrors.push('Data flow must have a from field');
      if (!flow.to) flowErrors.push('Data flow must have a to field');
      if (!flow.field) flowErrors.push('Data flow must have a field field');
      
      if (flow.from && !stepIds.has(flow.from)) {
        flowErrors.push(`Source step '${flow.from}' not found`);
      }
      
      if (flow.to && !stepIds.has(flow.to)) {
        flowErrors.push(`Target step '${flow.to}' not found`);
      }
      
      if (flowErrors.length > 0) {
        errors.push(`Data flow ${index + 1}: ${flowErrors.join(', ')}`);
      }
    }
    
    return { valid: errors.length === 0, errors };
  }

  /**
   * Generate execution order considering dependencies
   */
  generateExecutionOrder(steps, dataFlow = []) {
    const order = [];
    const processed = new Set();
    const dependencies = this.buildDependencyMap(steps, dataFlow);
    
    // Topological sort for dependency resolution
    const visit = (stepId) => {
      if (processed.has(stepId)) return;
      
      const stepDeps = dependencies.get(stepId) || [];
      for (const dep of stepDeps) {
        visit(dep);
      }
      
      processed.add(stepId);
      order.push(stepId);
    };
    
    // Visit all steps
    for (const step of steps) {
      visit(step.id);
    }
    
    return order;
  }

  /**
   * Build dependency map from steps and data flow
   */
  buildDependencyMap(steps, dataFlow = []) {
    const dependencies = new Map();
    
    // Initialize with explicit dependencies
    for (const step of steps) {
      dependencies.set(step.id, step.dependencies || []);
    }
    
    // Add data flow dependencies
    for (const flow of dataFlow) {
      const existing = dependencies.get(flow.to) || [];
      if (!existing.includes(flow.from)) {
        existing.push(flow.from);
        dependencies.set(flow.to, existing);
      }
    }
    
    return dependencies;
  }

  /**
   * Create executable steps with proper ordering
   */
  async createExecutableSteps(steps, executionOrder) {
    const executableSteps = [];
    
    for (const stepId of executionOrder) {
      const step = steps.find(s => s.id === stepId);
      if (step) {
        const executableStep = {
          ...step,
          executionIndex: executableSteps.length,
          canRunInParallel: this.canRunInParallel(step, steps, executionOrder),
          estimatedDuration: this.estimateStepDuration(step),
          retryable: this.isRetryable(step)
        };
        
        executableSteps.push(executableStep);
      }
    }
    
    return executableSteps;
  }

  /**
   * Create data flow map for easy lookup
   */
  createDataFlowMap(dataFlow = []) {
    const flowMap = new Map();
    
    for (const flow of dataFlow) {
      if (!flowMap.has(flow.to)) {
        flowMap.set(flow.to, []);
      }
      flowMap.get(flow.to).push(flow);
    }
    
    return flowMap;
  }

  /**
   * Check if step can run in parallel with others
   */
  canRunInParallel(step, allSteps, executionOrder) {
    const stepIndex = executionOrder.indexOf(step.id);
    
    // First step can always run
    if (stepIndex === 0) return true;
    
    // Steps with dependencies cannot run in parallel with their dependencies
    if (step.dependencies && step.dependencies.length > 0) return false;
    
    // Check if previous step can run in parallel
    const prevStepId = executionOrder[stepIndex - 1];
    const prevStep = allSteps.find(s => s.id === prevStepId);
    
    return prevStep && !prevStep.dependencies?.includes(step.id);
  }

  /**
   * Check if step is retryable
   */
  isRetryable(step) {
    // Banking operations are generally retryable
    if (step.domain === 'banking') return true;
    
    // GET operations are usually safe to retry
    if (step.method === 'GET') return true;
    
    // Synthesis operations are retryable
    if (step.domain === 'synthesis') return true;
    
    return false;
  }

  /**
   * Estimate step execution duration
   */
  estimateStepDuration(step) {
    const baseDuration = 2; // 2 seconds base
    
    // Banking operations take longer
    if (step.domain === 'banking') return baseDuration + 3;
    
    // Synthesis operations take longer
    if (step.domain === 'synthesis') return baseDuration + 5;
    
    // External API calls
    if (step.domain === 'weather' || step.domain === 'currency') return baseDuration + 1;
    
    return baseDuration;
  }

  /**
   * Check if plan is parallelizable
   */
  isParallelizable(steps, dataFlow = []) {
    // If there's data flow, some dependencies exist
    if (dataFlow.length > 0) return false;
    
    // Check for explicit dependencies
    return !steps.some(step => step.dependencies && step.dependencies.length > 0);
  }

  /**
   * Estimate total execution time
   */
  estimateExecutionTime(steps) {
    let totalTime = 0;
    
    for (const step of steps) {
      totalTime += this.estimateStepDuration(step);
    }
    
    // If parallelizable, execution time is max of individual steps
    if (this.isParallelizable(steps)) {
      totalTime = Math.max(...steps.map(step => this.estimateStepDuration(step)));
    }
    
    return totalTime;
  }

  /**
   * Assess plan complexity
   */
  assessPlanComplexity(plan) {
    const stepCount = plan.steps.length;
    const dataFlowCount = plan.dataFlow ? plan.dataFlow.length : 0;
    const depCount = plan.steps.reduce((acc, step) => acc + (step.dependencies?.length || 0), 0);
    
    const complexityScore = stepCount + (dataFlowCount * 2) + (depCount * 1.5);
    
    if (complexityScore >= 10) return 'high';
    if (complexityScore >= 5) return 'medium';
    return 'low';
  }

  /**
   * Check if operation is synthetic (created by composition)
   */
  isSyntheticOperation(operationId) {
    const syntheticPrefixes = ['synthesize_', 'combine_', 'analyze_', 'fuse_'];
    return syntheticPrefixes.some(prefix => operationId.startsWith(prefix));
  }

  /**
   * Validate operation parameters
   */
  validateOperationParameters(step, operation) {
    const errors = [];
    const providedParams = Object.keys(step.parameters || {});
    const requiredParams = operation.parameters?.required || [];
    
    // Check for missing required parameters
    for (const required of requiredParams) {
      if (!providedParams.includes(required)) {
        errors.push(`Missing required parameter: ${required}`);
      }
    }
    
    return { valid: errors.length === 0, errors };
  }

  /**
   * Generate optimization suggestions
   */
  generateOptimizationSuggestions(plan, apiCatalog) {
    const suggestions = [];
    
    // Suggest parallelization opportunities
    if (this.isParallelizable(plan.steps, plan.dataFlow)) {
      suggestions.push('This workflow can be executed in parallel for better performance');
    }
    
    // Suggest caching opportunities
    const duplicateOps = this.findDuplicateOperations(plan.steps);
    if (duplicateOps.length > 0) {
      suggestions.push(`Consider caching results for duplicate operations: ${duplicateOps.join(', ')}`);
    }
    
    // Suggest operation consolidation
    const consolidationOps = this.findConsolidationOpportunities(plan.steps, apiCatalog);
    if (consolidationOps.length > 0) {
      suggestions.push(`Consider consolidating operations: ${consolidationOps.join(', ')}`);
    }
    
    return suggestions;
  }

  /**
   * Find duplicate operations
   */
  findDuplicateOperations(steps) {
    const operations = steps.map(s => s.operation);
    const duplicates = operations.filter((op, index) => operations.indexOf(op) !== index);
    return [...new Set(duplicates)];
  }

  /**
   * Find consolidation opportunities
   */
  findConsolidationOpportunities(steps, apiCatalog) {
    // This is a simplified implementation
    // In practice, this would analyze API capabilities for consolidation
    return [];
  }

  /**
   * Initialize validation rules
   */
  initializeValidationRules() {
    return {
      maxSteps: 20,
      maxDataFlowConnections: 50,
      maxDependencyDepth: 5,
      allowedDomains: ['banking', 'weather', 'currency', 'news', 'payment', 'goals', 'synthesis'],
      requiredFields: ['id', 'operation'],
      optionalFields: ['description', 'parameters', 'dependencies', 'priority']
    };
  }
}