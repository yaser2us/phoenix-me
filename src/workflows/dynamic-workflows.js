import { logger } from '../utils/logger.js';

/**
 * Dynamic Workflow Generator for Phase 4
 * Provides runtime workflow creation with:
 * - Dynamic workflow generation from user intents
 * - Template-based workflow creation
 * - Adaptive workflow modification
 * - Real-time workflow customization
 */
export class DynamicWorkflowGenerator {
  constructor(registry, workflowEngine) {
    this.registry = registry;
    this.workflowEngine = workflowEngine;
    
    // Workflow templates for dynamic generation
    this.workflowTemplates = new Map([
      ['information_gathering', {
        baseSteps: ['getCurrentLocation'],
        expandableWith: ['getCurrentWeather', 'getRandomFact', 'getTopHeadlines'],
        aggregationType: 'comprehensive',
        description: 'Gather comprehensive information about a topic or location'
      }],
      ['travel_preparation', {
        baseSteps: ['getCurrentLocation', 'getCurrentWeather'],
        expandableWith: ['getExchangeRates', 'getTopHeadlines', 'searchNews'],
        aggregationType: 'travel_summary',
        description: 'Prepare for travel with relevant information'
      }],
      ['market_analysis', {
        baseSteps: ['getExchangeRates'],
        expandableWith: ['getTopHeadlines', 'searchNews', 'getRandomFact'],
        aggregationType: 'market_report',
        description: 'Analyze market conditions and financial information'
      }],
      ['location_discovery', {
        baseSteps: ['getCurrentLocation'],
        expandableWith: ['getCurrentWeather', 'getTopHeadlines', 'getRandomFact'],
        aggregationType: 'location_report',
        description: 'Discover comprehensive information about a location'
      }]
    ]);

    // Context patterns for workflow selection
    this.contextPatterns = new Map([
      ['comprehensive', ['everything', 'complete', 'full', 'detailed', 'thorough']],
      ['urgent', ['quickly', 'fast', 'urgent', 'asap', 'immediately']],
      ['travel', ['trip', 'travel', 'vacation', 'visit', 'journey']],
      ['financial', ['money', 'currency', 'exchange', 'cost', 'financial']],
      ['news', ['news', 'current', 'happening', 'events', 'updates']],
      ['weather', ['weather', 'temperature', 'climate', 'forecast']],
      ['location', ['location', 'place', 'where', 'here', 'there']]
    ]);

    // Dynamic adaptation rules
    this.adaptationRules = new Map([
      ['add_weather', {
        condition: (context) => context.includes('location') && !context.includes('weather'),
        action: 'add',
        operation: 'getCurrentWeather',
        reason: 'Location context suggests weather information would be valuable'
      }],
      ['add_currency', {
        condition: (context) => context.includes('travel') && !context.includes('currency'),
        action: 'add',
        operation: 'getExchangeRates',
        reason: 'Travel context suggests currency information would be helpful'
      }],
      ['add_news', {
        condition: (context) => context.includes('comprehensive') && !context.includes('news'),
        action: 'add',
        operation: 'getTopHeadlines',
        reason: 'Comprehensive request suggests current news would be relevant'
      }],
      ['prioritize_speed', {
        condition: (context) => context.includes('urgent'),
        action: 'optimize',
        target: 'speed',
        reason: 'Urgency detected, optimizing for fastest execution'
      }]
    ]);

    this.generatedWorkflows = new Map();
    this.initialized = true;
  }

  /**
   * Generate dynamic workflow from user intent and context
   * @param {string} userIntent - Natural language user intent
   * @param {Object} context - Conversation and system context
   * @param {Object} preferences - User preferences
   * @returns {Object} Dynamically generated workflow
   */
  async generateWorkflow(userIntent, context = {}, preferences = {}) {
    try {
      logger.debug('Dynamic workflow generation started', { intent: userIntent });

      const startTime = Date.now();
      
      // 1. Analyze intent and extract workflow requirements
      const workflowRequirements = this.analyzeWorkflowRequirements(userIntent, context);
      
      // 2. Select appropriate workflow template
      const selectedTemplate = this.selectWorkflowTemplate(workflowRequirements);
      
      // 3. Customize template based on requirements
      const customizedWorkflow = await this.customizeWorkflowTemplate(
        selectedTemplate, 
        workflowRequirements, 
        preferences
      );
      
      // 4. Apply dynamic adaptations
      const adaptedWorkflow = await this.applyDynamicAdaptations(
        customizedWorkflow, 
        workflowRequirements
      );
      
      // 5. Validate and optimize generated workflow
      const validatedWorkflow = await this.validateAndOptimizeWorkflow(adaptedWorkflow);
      
      // 6. Generate workflow metadata
      const workflowId = this.generateWorkflowId();
      const generationTime = Date.now() - startTime;
      
      const dynamicWorkflow = {
        id: workflowId,
        name: `Dynamic_${selectedTemplate.name}_${Date.now()}`,
        displayName: `Custom ${selectedTemplate.description}`,
        description: `Dynamically generated workflow for: ${userIntent}`,
        userIntent: userIntent,
        requirements: workflowRequirements,
        templateUsed: selectedTemplate.name,
        steps: validatedWorkflow.steps,
        aggregation: validatedWorkflow.aggregation,
        metadata: {
          generated: true,
          generatedAt: new Date().toISOString(),
          generationTime: generationTime,
          context: context,
          preferences: preferences,
          adaptationsApplied: validatedWorkflow.adaptationsApplied || []
        },
        estimatedTime: this.estimateWorkflowTime(validatedWorkflow.steps),
        confidence: this.calculateGenerationConfidence(workflowRequirements, validatedWorkflow)
      };
      
      // Store generated workflow for reuse
      this.generatedWorkflows.set(workflowId, dynamicWorkflow);
      
      logger.debug('Dynamic workflow generated successfully', {
        workflowId: workflowId,
        steps: dynamicWorkflow.steps.length,
        generationTime: generationTime
      });
      
      return dynamicWorkflow;
      
    } catch (error) {
      logger.error('Dynamic workflow generation failed', { error: error.message, intent: userIntent });
      return this.createFallbackWorkflow(userIntent, error);
    }
  }

  /**
   * Analyze user intent to extract workflow requirements
   * @param {string} userIntent - User's natural language intent
   * @param {Object} context - System context
   * @returns {Object} Workflow requirements analysis
   */
  analyzeWorkflowRequirements(userIntent, context) {
    const requirements = {
      originalIntent: userIntent,
      requiredOperations: [],
      optionalOperations: [],
      contextPatterns: [],
      complexity: 'simple',
      priority: 'balanced',
      domains: [],
      constraints: {}
    };

    const lowerIntent = userIntent.toLowerCase();

    // Identify context patterns
    for (const [pattern, keywords] of this.contextPatterns) {
      if (keywords.some(keyword => lowerIntent.includes(keyword))) {
        requirements.contextPatterns.push(pattern);
      }
    }

    // Determine required operations based on patterns
    const operationMapping = {
      location: ['getCurrentLocation'],
      weather: ['getCurrentWeather'],
      financial: ['getExchangeRates'],
      news: ['getTopHeadlines'],
      travel: ['getCurrentLocation', 'getCurrentWeather', 'getExchangeRates'],
      comprehensive: ['getCurrentLocation', 'getCurrentWeather', 'getTopHeadlines', 'getRandomFact']
    };

    for (const pattern of requirements.contextPatterns) {
      const operations = operationMapping[pattern] || [];
      for (const operation of operations) {
        if (!requirements.requiredOperations.includes(operation)) {
          requirements.requiredOperations.push(operation);
        }
      }
    }

    // Determine complexity based on number of requirements
    if (requirements.contextPatterns.includes('comprehensive') || 
        requirements.requiredOperations.length > 3) {
      requirements.complexity = 'complex';
    } else if (requirements.requiredOperations.length > 1) {
      requirements.complexity = 'moderate';
    }

    // Set priority based on context
    if (requirements.contextPatterns.includes('urgent')) {
      requirements.priority = 'speed';
    } else if (lowerIntent.includes('cost') || lowerIntent.includes('cheap')) {
      requirements.priority = 'cost';
    } else if (lowerIntent.includes('reliable') || lowerIntent.includes('accurate')) {
      requirements.priority = 'reliability';
    }

    // Add context-specific constraints
    if (context.user_location) {
      requirements.constraints.fixedLocation = context.user_location;
    }

    if (context.timeConstraint) {
      requirements.constraints.maxExecutionTime = context.timeConstraint;
    }

    // Extract domains from context patterns
    requirements.domains = requirements.contextPatterns.filter(pattern => 
      ['location', 'weather', 'financial', 'news', 'travel'].includes(pattern)
    );

    return requirements;
  }

  /**
   * Select most appropriate workflow template
   * @param {Object} requirements - Workflow requirements
   * @returns {Object} Selected template with metadata
   */
  selectWorkflowTemplate(requirements) {
    let bestTemplate = null;
    let bestScore = -1;

    for (const [templateName, template] of this.workflowTemplates) {
      const score = this.calculateTemplateScore(template, requirements);
      
      if (score > bestScore) {
        bestScore = score;
        bestTemplate = {
          name: templateName,
          ...template,
          score: score
        };
      }
    }

    // Fallback to information gathering if no good match
    if (!bestTemplate || bestScore < 0.3) {
      bestTemplate = {
        name: 'information_gathering',
        ...this.workflowTemplates.get('information_gathering'),
        score: 0.5
      };
    }

    return bestTemplate;
  }

  /**
   * Calculate how well a template matches requirements
   * @param {Object} template - Workflow template
   * @param {Object} requirements - Requirements to match
   * @returns {number} Matching score (0-1)
   */
  calculateTemplateScore(template, requirements) {
    let score = 0.0;

    // Check if template's base steps match required operations
    const baseOperationsMatch = template.baseSteps.filter(step => 
      requirements.requiredOperations.includes(step)
    ).length;
    score += (baseOperationsMatch / template.baseSteps.length) * 0.4;

    // Check if template's expandable operations cover requirements
    const expandableMatch = requirements.requiredOperations.filter(op => 
      template.expandableWith.includes(op)
    ).length;
    score += (expandableMatch / Math.max(1, requirements.requiredOperations.length)) * 0.3;

    // Check context pattern alignment
    const templatePatterns = {
      'information_gathering': ['comprehensive', 'location'],
      'travel_preparation': ['travel', 'location', 'weather'],
      'market_analysis': ['financial', 'news'],
      'location_discovery': ['location', 'comprehensive']
    };

    const templateName = Object.keys(templatePatterns).find(key => 
      templatePatterns[key] === template.baseSteps
    );

    if (templateName && templatePatterns[templateName]) {
      const patternMatch = requirements.contextPatterns.filter(pattern => 
        templatePatterns[templateName].includes(pattern)
      ).length;
      score += (patternMatch / templatePatterns[templateName].length) * 0.3;
    }

    return Math.min(1.0, score);
  }

  /**
   * Customize workflow template based on specific requirements
   * @param {Object} template - Selected template
   * @param {Object} requirements - Workflow requirements
   * @param {Object} preferences - User preferences
   * @returns {Object} Customized workflow definition
   */
  async customizeWorkflowTemplate(template, requirements, preferences) {
    const customizedWorkflow = {
      steps: [...template.baseSteps],
      aggregation: {
        format: template.aggregationType,
        includeMetadata: true
      },
      templateName: template.name
    };

    // Add required operations not in base steps
    for (const requiredOp of requirements.requiredOperations) {
      if (!customizedWorkflow.steps.includes(requiredOp)) {
        customizedWorkflow.steps.push(requiredOp);
      }
    }

    // Add complementary operations based on context
    const contextualAdditions = this.getContextualOperations(
      requirements.contextPatterns, 
      customizedWorkflow.steps
    );

    for (const addition of contextualAdditions) {
      if (!customizedWorkflow.steps.includes(addition) && 
          template.expandableWith.includes(addition)) {
        customizedWorkflow.steps.push(addition);
      }
    }

    // Apply user preferences
    if (preferences.includeNews && !customizedWorkflow.steps.includes('getTopHeadlines')) {
      customizedWorkflow.steps.push('getTopHeadlines');
    }

    if (preferences.includeWeather && !customizedWorkflow.steps.includes('getCurrentWeather')) {
      customizedWorkflow.steps.push('getCurrentWeather');
    }

    // Order steps based on dependencies
    customizedWorkflow.steps = this.orderStepsByDependencies(customizedWorkflow.steps);

    // Add step configurations
    customizedWorkflow.stepConfigurations = this.generateStepConfigurations(
      customizedWorkflow.steps, 
      requirements
    );

    return customizedWorkflow;
  }

  /**
   * Get contextual operations that complement existing steps
   * @param {Array} contextPatterns - Detected context patterns
   * @param {Array} existingSteps - Already included steps
   * @returns {Array} Suggested additional operations
   */
  getContextualOperations(contextPatterns, existingSteps) {
    const suggestions = [];
    
    const contextSuggestions = {
      comprehensive: ['getRandomFact', 'getTopHeadlines'],
      travel: ['getExchangeRates', 'getCurrentWeather'],
      location: ['getCurrentWeather', 'getRandomFact'],
      financial: ['getTopHeadlines'],
      weather: ['getCurrentLocation'],
      news: ['getCurrentLocation']
    };

    for (const pattern of contextPatterns) {
      const contextOps = contextSuggestions[pattern] || [];
      for (const op of contextOps) {
        if (!existingSteps.includes(op) && !suggestions.includes(op)) {
          suggestions.push(op);
        }
      }
    }

    return suggestions;
  }

  /**
   * Order workflow steps based on logical dependencies
   * @param {Array} steps - Unordered workflow steps
   * @returns {Array} Dependency-ordered steps
   */
  orderStepsByDependencies(steps) {
    const dependencies = {
      getCurrentWeather: ['getCurrentLocation'],
      searchNews: ['getCurrentLocation'],
      getTopHeadlines: [],
      getExchangeRates: [],
      getRandomFact: [],
      getCurrentLocation: []
    };

    const ordered = [];
    const remaining = [...steps];

    // Simple topological sort
    while (remaining.length > 0) {
      const candidates = remaining.filter(step => {
        const deps = dependencies[step] || [];
        return deps.every(dep => ordered.includes(dep));
      });

      if (candidates.length === 0) {
        // Add remaining steps (handle circular dependencies)
        ordered.push(...remaining);
        break;
      }

      // Add first candidate and remove from remaining
      const selected = candidates[0];
      ordered.push(selected);
      remaining.splice(remaining.indexOf(selected), 1);
    }

    return ordered;
  }

  /**
   * Generate step configurations based on requirements
   * @param {Array} steps - Workflow steps
   * @param {Object} requirements - Workflow requirements
   * @returns {Object} Step configurations
   */
  generateStepConfigurations(steps, requirements) {
    const configurations = {};

    for (const step of steps) {
      configurations[step] = {
        id: `step_${steps.indexOf(step) + 1}`,
        operation: step,
        parameters: this.generateStepParameters(step, requirements),
        optional: this.isStepOptional(step, requirements),
        retries: requirements.priority === 'reliability' ? 3 : 1,
        timeout: requirements.priority === 'speed' ? 5000 : 10000
      };
    }

    return configurations;
  }

  /**
   * Generate parameters for a specific step
   * @param {string} step - Step operation name
   * @param {Object} requirements - Workflow requirements
   * @returns {Object} Step parameters
   */
  generateStepParameters(step, requirements) {
    const parameters = {};

    // Add location parameter for weather if fixed location available
    if (step === 'getCurrentWeather' && requirements.constraints.fixedLocation) {
      parameters.q = requirements.constraints.fixedLocation;
    }

    // Add currency base for exchange rates
    if (step === 'getExchangeRates') {
      parameters.base = 'USD'; // Default base currency
    }

    // Add category for news based on context
    if (step === 'getTopHeadlines') {
      if (requirements.contextPatterns.includes('financial')) {
        parameters.category = 'business';
      } else if (requirements.contextPatterns.includes('travel')) {
        parameters.category = 'general';
      }
    }

    return parameters;
  }

  /**
   * Determine if a step is optional based on requirements
   * @param {string} step - Step operation name
   * @param {Object} requirements - Workflow requirements
   * @returns {boolean} Whether step is optional
   */
  isStepOptional(step, requirements) {
    const essentialSteps = ['getCurrentLocation'];
    
    // Steps are optional if they're not explicitly required
    if (!requirements.requiredOperations.includes(step) && 
        !essentialSteps.includes(step)) {
      return true;
    }

    // News operations are often optional due to API key requirements
    if (['getTopHeadlines', 'searchNews'].includes(step)) {
      return true;
    }

    return false;
  }

  /**
   * Apply dynamic adaptations based on context and requirements
   * @param {Object} workflow - Base customized workflow
   * @param {Object} requirements - Workflow requirements
   * @returns {Object} Adapted workflow
   */
  async applyDynamicAdaptations(workflow, requirements) {
    const adaptedWorkflow = { ...workflow };
    const adaptationsApplied = [];

    // Apply adaptation rules
    for (const [ruleName, rule] of this.adaptationRules) {
      if (rule.condition(requirements.contextPatterns)) {
        adaptationsApplied.push({
          rule: ruleName,
          action: rule.action,
          reason: rule.reason
        });

        if (rule.action === 'add' && !adaptedWorkflow.steps.includes(rule.operation)) {
          adaptedWorkflow.steps.push(rule.operation);
          
          // Re-order steps after addition
          adaptedWorkflow.steps = this.orderStepsByDependencies(adaptedWorkflow.steps);
        } else if (rule.action === 'optimize') {
          adaptedWorkflow.optimizationPreference = rule.target;
        }
      }
    }

    // Apply smart defaults based on requirements
    if (requirements.complexity === 'complex' && adaptedWorkflow.steps.length < 4) {
      // Add informational step for complex requests
      if (!adaptedWorkflow.steps.includes('getRandomFact')) {
        adaptedWorkflow.steps.push('getRandomFact');
        adaptationsApplied.push({
          rule: 'complexity_enhancement',
          action: 'add',
          reason: 'Complex request enhanced with additional information'
        });
      }
    }

    adaptedWorkflow.adaptationsApplied = adaptationsApplied;
    return adaptedWorkflow;
  }

  /**
   * Validate and optimize the generated workflow
   * @param {Object} workflow - Generated workflow
   * @returns {Object} Validated and optimized workflow
   */
  async validateAndOptimizeWorkflow(workflow) {
    const validatedWorkflow = { ...workflow };

    // Validate step operations exist in registry
    const availableOperations = this.registry.getAllOperations().map(op => op.operationId);
    validatedWorkflow.steps = validatedWorkflow.steps.filter(step => 
      availableOperations.includes(step)
    );

    // Ensure minimum workflow length
    if (validatedWorkflow.steps.length === 0) {
      validatedWorkflow.steps = ['getCurrentLocation']; // Safe fallback
    }

    // Limit maximum workflow complexity
    if (validatedWorkflow.steps.length > 6) {
      // Keep most important steps
      const prioritySteps = ['getCurrentLocation', 'getCurrentWeather', 'getExchangeRates'];
      const keptSteps = validatedWorkflow.steps.filter(step => prioritySteps.includes(step));
      const additionalSteps = validatedWorkflow.steps
        .filter(step => !prioritySteps.includes(step))
        .slice(0, 3);
      
      validatedWorkflow.steps = [...keptSteps, ...additionalSteps];
    }

    // Set appropriate aggregation format
    if (!validatedWorkflow.aggregation) {
      validatedWorkflow.aggregation = {
        format: 'combined',
        includeMetadata: true
      };
    }

    return validatedWorkflow;
  }

  /**
   * Estimate execution time for the workflow
   * @param {Array} steps - Workflow steps
   * @returns {number} Estimated execution time in milliseconds
   */
  estimateWorkflowTime(steps) {
    const stepTimes = {
      getCurrentLocation: 800,
      getCurrentWeather: 1200,
      getExchangeRates: 600,
      getTopHeadlines: 1500,
      searchNews: 1800,
      getRandomFact: 400
    };

    const baseTime = 2000; // Base workflow overhead
    const stepTime = steps.reduce((total, step) => 
      total + (stepTimes[step] || 1000), 0
    );

    return baseTime + stepTime;
  }

  /**
   * Calculate confidence in the generated workflow
   * @param {Object} requirements - Original requirements
   * @param {Object} workflow - Generated workflow
   * @returns {number} Confidence score (0-1)
   */
  calculateGenerationConfidence(requirements, workflow) {
    let confidence = 0.6; // Base confidence

    // Boost confidence if all required operations are included
    const requiredIncluded = requirements.requiredOperations.filter(op => 
      workflow.steps.includes(op)
    ).length;
    confidence += (requiredIncluded / Math.max(1, requirements.requiredOperations.length)) * 0.2;

    // Boost confidence based on template match quality
    if (workflow.templateName && workflow.templateScore) {
      confidence += workflow.templateScore * 0.15;
    }

    // Adjust based on complexity appropriateness
    const stepComplexity = workflow.steps.length <= 2 ? 'simple' : 
                          workflow.steps.length <= 4 ? 'moderate' : 'complex';
    
    if (stepComplexity === requirements.complexity) {
      confidence += 0.1;
    }

    // Reduce confidence for very short or very long workflows
    if (workflow.steps.length < 2 || workflow.steps.length > 5) {
      confidence -= 0.05;
    }

    return Math.max(0.1, Math.min(0.95, confidence));
  }

  /**
   * Get a previously generated workflow
   * @param {string} workflowId - Workflow identifier
   * @returns {Object|null} Retrieved workflow or null
   */
  getGeneratedWorkflow(workflowId) {
    return this.generatedWorkflows.get(workflowId) || null;
  }

  /**
   * List all generated workflows
   * @returns {Array} List of generated workflows
   */
  listGeneratedWorkflows() {
    return Array.from(this.generatedWorkflows.values());
  }

  /**
   * Modify an existing generated workflow
   * @param {string} workflowId - Workflow to modify
   * @param {Object} modifications - Modifications to apply
   * @returns {Object} Modified workflow
   */
  async modifyGeneratedWorkflow(workflowId, modifications) {
    const existingWorkflow = this.generatedWorkflows.get(workflowId);
    if (!existingWorkflow) {
      throw new Error(`Generated workflow ${workflowId} not found`);
    }

    const modifiedWorkflow = {
      ...existingWorkflow,
      ...modifications,
      metadata: {
        ...existingWorkflow.metadata,
        modified: true,
        modifiedAt: new Date().toISOString(),
        modifications: modifications
      }
    };

    // Re-validate modified workflow
    const validatedWorkflow = await this.validateAndOptimizeWorkflow(modifiedWorkflow);
    
    // Update confidence based on modifications
    validatedWorkflow.confidence = this.calculateGenerationConfidence(
      existingWorkflow.requirements,
      validatedWorkflow
    );

    this.generatedWorkflows.set(workflowId, validatedWorkflow);
    return validatedWorkflow;
  }

  /**
   * Generate unique workflow ID
   * @returns {string} Unique workflow identifier
   */
  generateWorkflowId() {
    return `dynamic_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Create fallback workflow for generation failures
   * @param {string} userIntent - Original user intent
   * @param {Error} error - Generation error
   * @returns {Object} Fallback workflow
   */
  createFallbackWorkflow(userIntent, error) {
    return {
      id: this.generateWorkflowId(),
      name: 'Fallback_Basic_Workflow',
      displayName: 'Basic Information Workflow',
      description: `Fallback workflow for: ${userIntent}`,
      userIntent: userIntent,
      steps: ['getCurrentLocation', 'getCurrentWeather'], // Safe basic workflow
      aggregation: { format: 'combined' },
      metadata: {
        generated: true,
        fallback: true,
        generatedAt: new Date().toISOString(),
        error: error.message
      },
      estimatedTime: 3000,
      confidence: 0.3
    };
  }
}