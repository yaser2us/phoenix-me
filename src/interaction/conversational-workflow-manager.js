import { logger } from '../utils/logger.js';

/**
 * Conversational Workflow Manager - Handles multi-turn conversations for complex workflows
 * Preserves context, manages dynamic workflow modifications, and learns user preferences
 */
export class ConversationalWorkflowManager {
  constructor(workflowPlanner, parameterCollector, executionEngine) {
    this.workflowPlanner = workflowPlanner;
    this.parameterCollector = parameterCollector;
    this.executionEngine = executionEngine;
    this.logger = logger;
    
    // Conversation state management
    this.activeConversations = new Map();
    this.conversationHistory = [];
    this.userPreferences = new Map();
    this.workflowTemplates = new Map();
    
    // Learning and optimization
    this.interactionPatterns = new Map();
    this.feedbackHistory = [];
    this.optimizationRules = [];
  }

  /**
   * Starts a new conversational workflow session
   * @param {string} userId - Unique identifier for the user
   * @param {string} initialIntent - User's initial request
   * @param {Object} context - Additional context (location, time, etc.)
   * @returns {Object} Conversation session with initial response
   */
  async startConversation(userId, initialIntent, context = {}) {
    const conversationId = this.generateConversationId();
    
    try {
      // Initialize conversation state
      const conversation = {
        id: conversationId,
        userId: userId,
        startTime: Date.now(),
        status: 'active',
        currentStep: 1,
        totalSteps: 0,
        context: {
          ...context,
          userPreferences: this.getUserPreferences(userId),
          conversationHistory: this.getRecentConversations(userId, 3)
        },
        workflow: null,
        collectedParameters: {},
        pendingPrompts: [],
        executionResults: [],
        feedback: [],
        modifications: []
      };

      // Store active conversation
      this.activeConversations.set(conversationId, conversation);
      
      this.logger.debug(`Starting conversation ${conversationId} for user ${userId}`);
      
      // Process initial intent and generate workflow
      const planningResult = await this.processInitialIntent(conversation, initialIntent);
      
      // Generate response for user
      const response = await this.generateConversationResponse(conversation, planningResult);
      
      // Update conversation state
      this.updateConversationState(conversation, 'planning_complete', planningResult);
      
      return {
        conversationId: conversationId,
        response: response,
        needsInput: planningResult.needsInput,
        workflow: conversation.workflow,
        status: conversation.status
      };
      
    } catch (error) {
      this.logger.error(`Failed to start conversation: ${error.message}`);
      throw new Error(`Conversation initialization failed: ${error.message}`);
    }
  }

  /**
   * Continues an existing conversation with user input
   * @param {string} conversationId - Conversation identifier
   * @param {string} userInput - User's response/input
   * @param {Object} options - Additional options
   * @returns {Object} Updated conversation state and response
   */
  async continueConversation(conversationId, userInput, options = {}) {
    const conversation = this.activeConversations.get(conversationId);
    
    if (!conversation) {
      throw new Error(`Conversation ${conversationId} not found`);
    }

    try {
      this.logger.debug(`Continuing conversation ${conversationId} with input: ${userInput}`);
      
      // Process user input based on current conversation state
      const processingResult = await this.processUserInput(conversation, userInput, options);
      
      // Generate appropriate response
      const response = await this.generateConversationResponse(conversation, processingResult);
      
      // Update conversation state
      this.updateConversationState(conversation, processingResult.nextState, processingResult);
      
      // Learn from this interaction
      this.recordInteractionPattern(conversation, userInput, processingResult);
      
      return {
        conversationId: conversationId,
        response: response,
        needsInput: processingResult.needsInput,
        workflow: conversation.workflow,
        status: conversation.status,
        progress: this.calculateProgress(conversation)
      };
      
    } catch (error) {
      this.logger.error(`Failed to continue conversation ${conversationId}: ${error.message}`);
      return this.handleConversationError(conversation, error);
    }
  }

  /**
   * Processes initial user intent to create workflow plan
   * @private
   */
  async processInitialIntent(conversation, initialIntent) {
    // Enhance intent with user context and preferences
    const enhancedContext = {
      ...conversation.context,
      previousWorkflows: this.getRecentWorkflows(conversation.userId, 5),
      commonPatterns: this.getUserPatterns(conversation.userId)
    };

    // Generate workflow plan
    const workflowPlan = await this.workflowPlanner.planFromIntent(initialIntent, enhancedContext);
    conversation.workflow = workflowPlan;
    conversation.totalSteps = workflowPlan.executionPlan.steps.length;

    // Collect parameters with intelligent defaults
    const parameterResult = await this.parameterCollector.collectParameters(
      workflowPlan, 
      enhancedContext
    );

    // Store collected parameters
    conversation.collectedParameters = parameterResult.collected;
    conversation.pendingPrompts = parameterResult.prompts;

    return {
      type: 'workflow_planned',
      workflow: workflowPlan,
      parameters: parameterResult,
      needsInput: parameterResult.missing.length > 0,
      nextState: parameterResult.missing.length > 0 ? 'collecting_parameters' : 'awaiting_confirmation'
    };
  }

  /**
   * Processes user input based on conversation state
   * @private
   */
  async processUserInput(conversation, userInput, options) {
    const inputType = this.classifyUserInput(userInput);
    
    // Check if we have pending prompts (parameter collection needed)
    const hasPendingPrompts = conversation.pendingPrompts && conversation.pendingPrompts.length > 0;
    
    // If we have pending prompts, always process as parameter input first
    if (hasPendingPrompts) {
      return await this.processParameterInput(conversation, userInput, inputType);
    }
    
    switch (conversation.status) {
      case 'collecting_parameters':
        return await this.processParameterInput(conversation, userInput, inputType);
        
      case 'executing':
        return await this.processExecutionInput(conversation, userInput, inputType);
        
      case 'awaiting_confirmation':
        return await this.processConfirmationInput(conversation, userInput, inputType);
        
      case 'modifying_workflow':
        return await this.processModificationInput(conversation, userInput, inputType);
        
      default:
        return await this.processGeneralInput(conversation, userInput, inputType);
    }
  }

  /**
   * Processes parameter collection input
   * @private
   */
  async processParameterInput(conversation, userInput, inputType) {
    const pendingPrompts = conversation.pendingPrompts || [];
    
    if (pendingPrompts.length === 0) {
      // If no more parameters needed, ask for confirmation
      return {
        type: 'parameters_complete',
        needsInput: true,
        nextState: 'awaiting_confirmation'
      };
    }

    // Get the current parameter being collected
    const currentPrompt = pendingPrompts[0];
    
    // Process the user's response
    const parameterResult = await this.parameterCollector.collectParameterInteractively(
      currentPrompt.parameter,
      currentPrompt.details,
      userInput
    );

    if (parameterResult.success) {
      // Store the collected parameter
      conversation.collectedParameters[currentPrompt.parameter] = parameterResult.value;
      
      // Remove the completed prompt
      conversation.pendingPrompts.shift();
      
      // Check if we have more parameters to collect
      const hasMoreParams = conversation.pendingPrompts.length > 0;
      
      return {
        type: 'parameter_collected',
        parameter: currentPrompt.parameter,
        value: parameterResult.value,
        needsInput: hasMoreParams,
        nextState: hasMoreParams ? 'collecting_parameters' : 'awaiting_confirmation',
        remainingPrompts: conversation.pendingPrompts.length
      };
      
    } else {
      // Parameter validation failed, ask again
      return {
        type: 'parameter_validation_failed',
        parameter: currentPrompt.parameter,
        error: parameterResult.error,
        suggestion: parameterResult.suggestion,
        needsInput: true,
        nextState: 'collecting_parameters'
      };
    }
  }

  /**
   * Processes execution-related input (monitoring, cancellation, etc.)
   * @private
   */
  async processExecutionInput(conversation, userInput, inputType) {
    const inputLower = userInput.toLowerCase();
    
    if (inputLower.includes('cancel') || inputLower.includes('stop')) {
      // Cancel the workflow execution
      if (conversation.executionPromise) {
        // In a real implementation, you'd cancel the execution
        conversation.status = 'cancelled';
      }
      
      return {
        type: 'execution_cancelled',
        needsInput: false,
        nextState: 'cancelled'
      };
    }
    
    if (inputLower.includes('status') || inputLower.includes('progress')) {
      // Provide status update
      return {
        type: 'status_requested',
        needsInput: false,
        nextState: 'executing',
        currentProgress: this.calculateProgress(conversation)
      };
    }
    
    // Default: acknowledge input but continue execution
    return {
      type: 'execution_acknowledged',
      needsInput: false,
      nextState: 'executing'
    };
  }

  /**
   * Processes confirmation input (yes/no responses)
   * @private
   */
  async processConfirmationInput(conversation, userInput, inputType) {
    const confirmed = this.parseConfirmation(userInput);
    
    if (confirmed === true) {
      // User confirmed, proceed with execution
      return {
        type: 'execution_confirmed',
        needsInput: false,
        nextState: 'executing'
      };
    } else if (confirmed === false) {
      // User declined, ask for modifications
      return {
        type: 'execution_declined',
        needsInput: true,
        nextState: 'modifying_workflow'
      };
    } else {
      // Unclear response, ask for clarification
      return {
        type: 'confirmation_unclear',
        needsInput: true,
        nextState: 'awaiting_confirmation'
      };
    }
  }

  /**
   * Processes workflow modification input
   * @private
   */
  async processModificationInput(conversation, userInput, inputType) {
    // Parse modification request
    const modification = this.parseModificationRequest(userInput);
    
    if (modification.type === 'add_operation') {
      // Add new operation to workflow
      await this.addOperationToWorkflow(conversation, modification);
    } else if (modification.type === 'remove_operation') {
      // Remove operation from workflow
      await this.removeOperationFromWorkflow(conversation, modification);
    } else if (modification.type === 'change_parameters') {
      // Modify parameters
      await this.modifyWorkflowParameters(conversation, modification);
    }
    
    return {
      type: 'workflow_modified',
      modification: modification,
      needsInput: false,
      nextState: 'ready_to_execute'
    };
  }

  /**
   * Adds operation to existing workflow
   * @private
   */
  async addOperationToWorkflow(conversation, modification) {
    // Simplified implementation - in practice would use AI to determine new operations
    const newOperation = {
      subGoal: 'check_weather',
      domain: 'weather',
      operation: { operationId: 'getCurrentWeather' },
      confidence: 0.8
    };
    
    if (conversation.workflow && conversation.workflow.executionPlan.steps[0]) {
      conversation.workflow.executionPlan.steps[0].operations.push(newOperation);
    }
  }

  /**
   * Removes operation from workflow
   * @private
   */
  async removeOperationFromWorkflow(conversation, modification) {
    // Simplified implementation
    if (conversation.workflow && conversation.workflow.executionPlan.steps[0]) {
      conversation.workflow.executionPlan.steps[0].operations.pop();
    }
  }

  /**
   * Modifies workflow parameters
   * @private
   */
  async modifyWorkflowParameters(conversation, modification) {
    // Simplified implementation
    Object.assign(conversation.collectedParameters, {
      modified: true,
      modificationReason: modification.details
    });
  }

  /**
   * Generates question response
   * @private
   */
  async generateQuestionResponse(conversation, userInput) {
    // Simplified Q&A - in practice would use more sophisticated NLP
    const inputLower = userInput.toLowerCase();
    
    if (inputLower.includes('how long')) {
      return 'The workflow typically takes 3-10 seconds to complete, depending on the operations involved.';
    } else if (inputLower.includes('what') && inputLower.includes('do')) {
      return 'I can help you with banking operations, weather information, currency exchange, and more. What would you like to do?';
    } else if (inputLower.includes('cancel')) {
      return 'You can cancel the workflow anytime by saying "cancel" or "stop".';
    }
    
    return 'That\'s a good question! I\'m here to help with workflow execution. Is there something specific you\'d like to know?';
  }

  /**
   * Processes general conversational input
   * @private
   */
  async processGeneralInput(conversation, userInput, inputType) {
    if (inputType.isQuestion) {
      return {
        type: 'question_response',
        answer: await this.generateQuestionResponse(conversation, userInput),
        needsInput: false,
        nextState: conversation.status
      };
    }
    
    return {
      type: 'general_acknowledgment',
      needsInput: false,
      nextState: conversation.status
    };
  }

  /**
   * Executes the workflow when ready
   * @param {string} conversationId - Conversation identifier
   * @returns {Object} Execution results
   */
  async executeWorkflow(conversationId) {
    const conversation = this.activeConversations.get(conversationId);
    
    if (!conversation) {
      throw new Error(`Conversation ${conversationId} not found`);
    }

    try {
      this.logger.debug(`Executing workflow for conversation ${conversationId}`);
      
      // Update conversation status
      conversation.status = 'executing';
      conversation.executionStartTime = Date.now();
      
      // Execute the workflow
      const executionResult = await this.executionEngine.executeWorkflow(
        conversation.workflow,
        conversation.collectedParameters,
        {
          conversationId: conversationId,
          userId: conversation.userId,
          progressCallback: (progress) => this.updateExecutionProgress(conversation, progress)
        }
      );
      
      // Store execution results
      conversation.executionResults.push(executionResult);
      conversation.executionEndTime = Date.now();
      conversation.status = 'completed';
      
      // Learn from successful execution
      this.recordSuccessfulWorkflow(conversation, executionResult);
      
      return {
        conversationId: conversationId,
        executionResult: executionResult,
        duration: conversation.executionEndTime - conversation.executionStartTime,
        status: 'completed'
      };
      
    } catch (error) {
      conversation.status = 'failed';
      conversation.error = error.message;
      
      this.logger.error(`Workflow execution failed for conversation ${conversationId}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Generates appropriate conversation responses
   * @private
   */
  async generateConversationResponse(conversation, processingResult) {
    switch (processingResult.type) {
      case 'workflow_planned':
        return this.generateWorkflowPlanResponse(conversation, processingResult);
        
      case 'parameter_collected':
        return this.generateParameterCollectedResponse(conversation, processingResult);
        
      case 'parameters_complete':
        return this.generateParametersCompleteResponse(conversation, processingResult);
        
      case 'parameter_validation_failed':
        return this.generateParameterErrorResponse(conversation, processingResult);
        
      case 'execution_confirmed':
        return this.generateExecutionConfirmedResponse(conversation);
        
      case 'workflow_modified':
        return this.generateModificationResponse(conversation, processingResult);
        
      default:
        return this.generateDefaultResponse(conversation, processingResult);
    }
  }

  /**
   * Generates execution confirmed response
   * @private
   */
  generateExecutionConfirmedResponse(conversation) {
    return `🚀 **Starting execution!**\n\nI'll now execute your workflow: "${conversation.workflow.name}"\n\nYou can check progress or cancel anytime by typing "status" or "cancel".`;
  }

  /**
   * Generates modification response
   * @private
   */
  generateModificationResponse(conversation, result) {
    return `✅ **Workflow Updated!**\n\nI've modified your workflow based on your request.\n\n${result.modification.details}\n\nWould you like me to proceed with the updated workflow?`;
  }

  /**
   * Generates default response
   * @private
   */
  generateDefaultResponse(conversation, processingResult) {
    switch (processingResult.type) {
      case 'question_response':
        return processingResult.answer || 'I understand your question. How can I help you further?';
      case 'general_acknowledgment':
        return 'I understand. Is there anything else you\'d like me to help you with?';
      case 'execution_acknowledged':
        return 'Got it! The workflow is still running. You can check "status" anytime.';
      case 'status_requested':
        const progress = processingResult.currentProgress || { percent: 0, stage: 'unknown' };
        return `📊 **Current Status:** ${progress.percent}% complete\n🔄 Stage: ${progress.stage}`;
      default:
        return 'I understand. How would you like to proceed?';
    }
  }

  /**
   * Handles conversation errors gracefully
   * @private
   */
  handleConversationError(conversation, error) {
    conversation.status = 'error';
    conversation.error = error.message;
    
    return {
      conversationId: conversation.id,
      response: `❌ **Something went wrong:** ${error.message}\n\nWould you like to try again or start a new workflow?`,
      needsInput: true,
      status: 'error',
      error: error.message
    };
  }

  /**
   * Generates workflow plan response
   * @private
   */
  generateWorkflowPlanResponse(conversation, result) {
    const workflow = result.workflow;
    const parameters = result.parameters;
    
    let response = `I'll help you with: "${workflow.name}"\n\n`;
    response += `📋 **Planned Operations:**\n`;
    
    workflow.executionPlan.steps.forEach((step, index) => {
      response += `${index + 1}. ${step.operations.map(op => op.subGoal).join(', ')}\n`;
    });
    
    if (parameters.missing.length > 0) {
      response += `\n❓ **I need some information:**\n`;
      const firstPrompt = parameters.prompts[0];
      response += `${firstPrompt.message}\n`;
      
      if (firstPrompt.suggestions.length > 0) {
        response += `💡 Suggestions: ${firstPrompt.suggestions.join(', ')}\n`;
      }
    } else {
      response += `\n✅ **Ready to execute!** All parameters collected.\n`;
      response += `Would you like me to proceed?`;
    }
    
    return response;
  }

  /**
   * Generates parameter collected response
   * @private
   */
  generateParameterCollectedResponse(conversation, result) {
    let response = `✅ Got it! ${result.parameter} = ${result.value}\n\n`;
    
    if (result.needsInput) {
      const nextPrompt = conversation.pendingPrompts[0];
      response += `❓ **Next:** ${nextPrompt.message}\n`;
      
      if (nextPrompt.suggestions.length > 0) {
        response += `💡 Suggestions: ${nextPrompt.suggestions.join(', ')}\n`;
      }
    } else {
      response += `🚀 **All parameters collected!** Ready to execute your workflow.\n`;
      response += `Would you like me to proceed?`;
    }
    
    return response;
  }

  /**
   * Generates parameters complete response
   * @private
   */
  generateParametersCompleteResponse(conversation, result) {
    return `🎉 **Perfect!** I have all the information I need.\n\n📋 **Your Workflow:**\n• ${conversation.workflow.name}\n• Parameters: ${Object.keys(conversation.collectedParameters).length} collected\n\n🚀 **Ready to execute!** Would you like me to proceed?`;
  }

  /**
   * Generates parameter error response
   * @private
   */
  generateParameterErrorResponse(conversation, result) {
    let response = `❌ **Issue with ${result.parameter}:** ${result.error}\n\n`;
    
    if (result.suggestion) {
      response += `💡 **Suggestion:** ${result.suggestion.message}\n`;
      if (result.suggestion.suggestions.length > 0) {
        response += `Options: ${result.suggestion.suggestions.join(', ')}\n`;
      }
    }
    
    response += `\nPlease try again:`;
    
    return response;
  }

  /**
   * Utility methods for conversation management
   */
  
  generateConversationId() {
    return `conv_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  classifyUserInput(input) {
    const inputLower = input.toLowerCase();
    
    return {
      isQuestion: inputLower.includes('?') || inputLower.startsWith('what') || inputLower.startsWith('how'),
      isConfirmation: /^(yes|y|ok|sure|proceed|go ahead|no|n|cancel|stop)$/i.test(input.trim()),
      isModification: inputLower.includes('change') || inputLower.includes('modify') || inputLower.includes('add') || inputLower.includes('remove'),
      isStatus: inputLower.includes('status') || inputLower.includes('progress'),
      length: input.length,
      hasNumbers: /\d/.test(input),
      hasSpecialChars: /[!@#$%^&*(),.?":{}|<>]/.test(input)
    };
  }

  parseConfirmation(input) {
    const normalized = input.toLowerCase().trim();
    
    if (/^(yes|y|ok|sure|proceed|go ahead|confirm|execute)$/i.test(normalized)) {
      return true;
    } else if (/^(no|n|cancel|stop|abort|decline)$/i.test(normalized)) {
      return false;
    }
    
    return null; // Unclear
  }

  parseModificationRequest(input) {
    const inputLower = input.toLowerCase();
    
    if (inputLower.includes('add') || inputLower.includes('include')) {
      return {
        type: 'add_operation',
        details: input
      };
    } else if (inputLower.includes('remove') || inputLower.includes('skip')) {
      return {
        type: 'remove_operation',
        details: input
      };
    } else if (inputLower.includes('change') || inputLower.includes('modify')) {
      return {
        type: 'change_parameters',
        details: input
      };
    }
    
    return {
      type: 'general_modification',
      details: input
    };
  }

  calculateProgress(conversation) {
    if (!conversation.workflow) return { percent: 0, stage: 'initializing' };
    
    switch (conversation.status) {
      case 'collecting_parameters':
        const totalPrompts = conversation.pendingPrompts.length + Object.keys(conversation.collectedParameters).length;
        const collected = Object.keys(conversation.collectedParameters).length;
        return {
          percent: totalPrompts > 0 ? Math.round((collected / totalPrompts) * 30) : 0,
          stage: 'collecting_parameters',
          details: `${collected}/${totalPrompts} parameters collected`
        };
        
      case 'executing':
        return {
          percent: 70,
          stage: 'executing',
          details: 'Workflow execution in progress'
        };
        
      case 'completed':
        return {
          percent: 100,
          stage: 'completed',
          details: 'Workflow completed successfully'
        };
        
      default:
        return {
          percent: 10,
          stage: conversation.status,
          details: `Status: ${conversation.status}`
        };
    }
  }

  updateConversationState(conversation, nextState, result) {
    conversation.status = nextState;
    conversation.lastUpdate = Date.now();
    
    // Update step counter
    if (nextState === 'executing' && conversation.currentStep === 1) {
      conversation.currentStep = 2;
    } else if (nextState === 'completed') {
      conversation.currentStep = conversation.totalSteps;
    }
    
    // Store state change in history
    conversation.stateHistory = conversation.stateHistory || [];
    conversation.stateHistory.push({
      timestamp: Date.now(),
      state: nextState,
      result: result
    });
  }

  recordInteractionPattern(conversation, userInput, processingResult) {
    const pattern = {
      conversationId: conversation.id,
      userId: conversation.userId,
      input: userInput,
      inputType: this.classifyUserInput(userInput),
      processingResult: processingResult.type,
      timestamp: Date.now()
    };
    
    // Store pattern for learning
    const userId = conversation.userId;
    if (!this.interactionPatterns.has(userId)) {
      this.interactionPatterns.set(userId, []);
    }
    this.interactionPatterns.get(userId).push(pattern);
    
    // Keep only recent patterns (last 100)
    const patterns = this.interactionPatterns.get(userId);
    if (patterns.length > 100) {
      this.interactionPatterns.set(userId, patterns.slice(-100));
    }
  }

  recordSuccessfulWorkflow(conversation, executionResult) {
    const workflowPattern = {
      userId: conversation.userId,
      intent: conversation.workflow.name,
      operations: conversation.workflow.executionPlan.steps.flatMap(s => s.operations.map(o => o.subGoal)),
      parameters: conversation.collectedParameters,
      duration: conversation.executionEndTime - conversation.executionStartTime,
      success: executionResult.status === 'completed',
      timestamp: Date.now()
    };
    
    // Store for future optimization
    const templateKey = this.generateWorkflowTemplateKey(workflowPattern);
    this.workflowTemplates.set(templateKey, workflowPattern);
  }

  generateWorkflowTemplateKey(pattern) {
    const operationsKey = pattern.operations.sort().join('|');
    return `${pattern.userId}_${operationsKey}`;
  }

  getUserPreferences(userId) {
    return this.userPreferences.get(userId) || {
      preferredUnits: 'metric',
      preferredCurrency: 'USD',
      defaultLocation: 'Kuala Lumpur',
      communicationStyle: 'detailed'
    };
  }

  getRecentConversations(userId, limit = 5) {
    return this.conversationHistory
      .filter(conv => conv.userId === userId)
      .slice(-limit);
  }

  getRecentWorkflows(userId, limit = 5) {
    return Array.from(this.workflowTemplates.values())
      .filter(template => template.userId === userId)
      .slice(-limit);
  }

  getUserPatterns(userId) {
    return this.interactionPatterns.get(userId) || [];
  }

  // Cleanup and management methods
  
  endConversation(conversationId, reason = 'completed') {
    const conversation = this.activeConversations.get(conversationId);
    
    if (conversation) {
      conversation.endTime = Date.now();
      conversation.endReason = reason;
      
      // Move to history
      this.conversationHistory.push(conversation);
      
      // Remove from active
      this.activeConversations.delete(conversationId);
      
      // Keep history manageable (last 100 conversations)
      if (this.conversationHistory.length > 100) {
        this.conversationHistory = this.conversationHistory.slice(-100);
      }
    }
  }

  getActiveConversations() {
    return Array.from(this.activeConversations.keys());
  }

  getConversationStatus(conversationId) {
    const conversation = this.activeConversations.get(conversationId);
    return conversation ? {
      id: conversation.id,
      status: conversation.status,
      progress: this.calculateProgress(conversation),
      lastUpdate: conversation.lastUpdate
    } : null;
  }
}