import { logger } from '../utils/logger.js';

/**
 * Interactive UX Enhancements - Provides rich user experience for workflow execution
 * Handles progress indicators, real-time updates, confirmations, and result presentation
 */
export class InteractiveUXEnhancements {
  constructor() {
    this.logger = logger;
    
    // UI state management
    this.activeProgressIndicators = new Map();
    this.statusUpdateCallbacks = new Map();
    this.confirmationQueue = [];
    this.presentationTemplates = new Map();
    
    // Performance tracking
    this.uiMetrics = {
      averageResponseTime: 0,
      totalInteractions: 0,
      userSatisfactionScore: 0
    };
    
    this.initializePresentationTemplates();
  }

  /**
   * Creates a progress indicator for long-running workflows
   * @param {string} workflowId - Workflow identifier
   * @param {Object} workflow - Workflow specification
   * @returns {Object} Progress indicator configuration
   */
  createProgressIndicator(workflowId, workflow) {
    const progressConfig = {
      id: workflowId,
      type: 'workflow_execution',
      title: this.generateProgressTitle(workflow),
      stages: this.mapWorkflowToStages(workflow),
      currentStage: 0,
      startTime: Date.now(),
      estimatedDuration: this.estimateWorkflowDuration(workflow),
      status: 'initializing'
    };

    this.activeProgressIndicators.set(workflowId, progressConfig);
    
    return {
      progressId: workflowId,
      indicator: this.formatProgressIndicator(progressConfig),
      estimatedTime: progressConfig.estimatedDuration
    };
  }

  /**
   * Updates progress indicator with current status
   * @param {string} workflowId - Workflow identifier
   * @param {Object} progress - Progress update information
   * @returns {Object} Updated progress display
   */
  updateProgress(workflowId, progress) {
    const indicator = this.activeProgressIndicators.get(workflowId);
    
    if (!indicator) {
      return null;
    }

    // Update progress information
    indicator.currentStage = progress.stepIndex || indicator.currentStage;
    indicator.status = progress.status || indicator.status;
    indicator.completedOperations = progress.completedOperations || 0;
    indicator.totalOperations = progress.totalOperations || indicator.stages.length;
    indicator.lastUpdate = Date.now();

    // Calculate progress percentage
    const progressPercent = this.calculateProgressPercentage(indicator, progress);
    indicator.progressPercent = progressPercent;

    // Generate status message
    indicator.statusMessage = this.generateStatusMessage(indicator, progress);

    return {
      progressId: workflowId,
      indicator: this.formatProgressIndicator(indicator),
      progressPercent: progressPercent,
      statusMessage: indicator.statusMessage,
      estimatedTimeRemaining: this.calculateTimeRemaining(indicator)
    };
  }

  /**
   * Formats progress indicator for display
   * @private
   */
  formatProgressIndicator(indicator) {
    const progressBar = this.createProgressBar(indicator.progressPercent || 0);
    const timeInfo = this.formatTimeInformation(indicator);
    const stageInfo = this.formatStageInformation(indicator);

    return {
      title: indicator.title,
      progressBar: progressBar,
      percentage: Math.round(indicator.progressPercent || 0),
      timeInfo: timeInfo,
      stageInfo: stageInfo,
      status: indicator.status,
      statusMessage: indicator.statusMessage
    };
  }

  /**
   * Creates visual progress bar
   * @private
   */
  createProgressBar(percentage) {
    const width = 30; // Character width of progress bar
    const filled = Math.round((percentage / 100) * width);
    const empty = width - filled;
    
    const filledChar = '█';
    const emptyChar = '░';
    
    return `[${filledChar.repeat(filled)}${emptyChar.repeat(empty)}] ${percentage}%`;
  }

  /**
   * Formats time information for display
   * @private
   */
  formatTimeInformation(indicator) {
    const elapsed = Date.now() - indicator.startTime;
    const remaining = this.calculateTimeRemaining(indicator);
    
    return {
      elapsed: this.formatDuration(elapsed),
      remaining: this.formatDuration(remaining),
      estimated: this.formatDuration(indicator.estimatedDuration)
    };
  }

  /**
   * Formats stage information for display
   * @private
   */
  formatStageInformation(indicator) {
    const currentStage = indicator.stages[indicator.currentStage] || {};
    
    return {
      current: currentStage.name || 'Unknown',
      currentIndex: indicator.currentStage + 1,
      total: indicator.stages.length,
      description: currentStage.description || '',
      operations: `${indicator.completedOperations || 0}/${indicator.totalOperations || 0}`
    };
  }

  /**
   * Provides real-time status updates during execution
   * @param {string} workflowId - Workflow identifier
   * @param {Function} callback - Status update callback function
   */
  subscribeToStatusUpdates(workflowId, callback) {
    if (!this.statusUpdateCallbacks.has(workflowId)) {
      this.statusUpdateCallbacks.set(workflowId, []);
    }
    
    this.statusUpdateCallbacks.get(workflowId).push(callback);
    
    // Return unsubscribe function
    return () => {
      const callbacks = this.statusUpdateCallbacks.get(workflowId) || [];
      const index = callbacks.indexOf(callback);
      if (index > -1) {
        callbacks.splice(index, 1);
      }
    };
  }

  /**
   * Broadcasts status update to all subscribers
   * @param {string} workflowId - Workflow identifier
   * @param {Object} statusUpdate - Status update information
   */
  broadcastStatusUpdate(workflowId, statusUpdate) {
    const callbacks = this.statusUpdateCallbacks.get(workflowId) || [];
    
    callbacks.forEach(callback => {
      try {
        callback(statusUpdate);
      } catch (error) {
        this.logger.warn(`Status update callback failed for ${workflowId}: ${error.message}`);
      }
    });
  }

  /**
   * Requests user confirmation for critical operations
   * @param {string} workflowId - Workflow identifier
   * @param {Object} confirmationRequest - Confirmation details
   * @returns {Object} Confirmation prompt
   */
  requestUserConfirmation(workflowId, confirmationRequest) {
    const confirmation = {
      id: this.generateConfirmationId(),
      workflowId: workflowId,
      type: confirmationRequest.type || 'general',
      title: confirmationRequest.title,
      message: confirmationRequest.message,
      details: confirmationRequest.details || {},
      options: confirmationRequest.options || ['Yes', 'No'],
      defaultOption: confirmationRequest.defaultOption || 'No',
      criticality: confirmationRequest.criticality || 'medium',
      timestamp: Date.now(),
      timeout: confirmationRequest.timeout || 300000 // 5 minutes default
    };

    this.confirmationQueue.push(confirmation);

    return {
      confirmationId: confirmation.id,
      prompt: this.formatConfirmationPrompt(confirmation),
      requiresResponse: true,
      timeout: confirmation.timeout
    };
  }

  /**
   * Formats confirmation prompt for display
   * @private
   */
  formatConfirmationPrompt(confirmation) {
    let prompt = `⚠️  **${confirmation.title}**\n\n`;
    prompt += `${confirmation.message}\n\n`;

    if (confirmation.details && Object.keys(confirmation.details).length > 0) {
      prompt += `📋 **Details:**\n`;
      for (const [key, value] of Object.entries(confirmation.details)) {
        prompt += `• ${key}: ${value}\n`;
      }
      prompt += `\n`;
    }

    prompt += `❓ **Please confirm:** ${confirmation.options.join(' / ')}\n`;
    prompt += `💡 Default: ${confirmation.defaultOption}`;

    return prompt;
  }

  /**
   * Processes user confirmation response
   * @param {string} confirmationId - Confirmation identifier
   * @param {string} userResponse - User's response
   * @returns {Object} Processed confirmation result
   */
  processConfirmation(confirmationId, userResponse) {
    const confirmationIndex = this.confirmationQueue.findIndex(c => c.id === confirmationId);
    
    if (confirmationIndex === -1) {
      return {
        success: false,
        error: 'Confirmation not found or expired'
      };
    }

    const confirmation = this.confirmationQueue[confirmationIndex];
    
    // Parse user response
    const parsedResponse = this.parseConfirmationResponse(userResponse, confirmation.options);
    
    // Remove from queue
    this.confirmationQueue.splice(confirmationIndex, 1);

    return {
      success: true,
      confirmationId: confirmationId,
      userChoice: parsedResponse.choice,
      confirmed: parsedResponse.confirmed,
      workflowId: confirmation.workflowId
    };
  }

  /**
   * Optimizes result presentation based on data type and user preferences
   * @param {Object} executionResult - Workflow execution results
   * @param {Object} userPreferences - User presentation preferences
   * @returns {Object} Optimized result presentation
   */
  optimizeResultPresentation(executionResult, userPreferences = {}) {
    const presentationStyle = userPreferences.presentationStyle || 'detailed';
    const resultFormat = userPreferences.resultFormat || 'structured';

    const optimizedResults = {
      summary: this.generateResultSummary(executionResult),
      detailed: this.generateDetailedResults(executionResult, presentationStyle),
      formatted: this.formatResultsByType(executionResult, resultFormat),
      visualizations: this.generateResultVisualizations(executionResult),
      metadata: {
        executionTime: executionResult.duration,
        operationCount: executionResult.summary.totalOperations,
        successRate: this.calculateSuccessRate(executionResult)
      }
    };

    return optimizedResults;
  }

  /**
   * Generates result summary
   * @private
   */
  generateResultSummary(executionResult) {
    const summary = {
      status: executionResult.status,
      duration: this.formatDuration(executionResult.duration),
      operations: {
        total: executionResult.summary.totalOperations,
        successful: executionResult.summary.successfulOperations,
        successRate: `${Math.round((executionResult.summary.successfulOperations / executionResult.summary.totalOperations) * 100)}%`
      }
    };

    // Add key results by domain
    const domainResults = executionResult.results.aggregated;
    if (domainResults.banking.length > 0) {
      summary.banking = this.extractBankingHighlights(domainResults.banking);
    }
    if (domainResults.weather.length > 0) {
      summary.weather = this.extractWeatherHighlights(domainResults.weather);
    }
    if (domainResults.currency.length > 0) {
      summary.currency = this.extractCurrencyHighlights(domainResults.currency);
    }

    return summary;
  }

  /**
   * Generates detailed results with formatting
   * @private
   */
  generateDetailedResults(executionResult, style) {
    const detailed = {
      overview: this.formatOverview(executionResult),
      operationResults: [],
      errorDetails: [],
      performanceMetrics: this.extractPerformanceMetrics(executionResult)
    };

    // Format operation results
    executionResult.results.byOperation.forEach(operation => {
      detailed.operationResults.push({
        operation: operation.operation,
        domain: operation.domain,
        status: operation.success ? '✅ Success' : '❌ Failed',
        duration: this.formatDuration(operation.duration),
        data: this.formatOperationData(operation.data, style),
        error: operation.error
      });

      if (!operation.success && operation.error) {
        detailed.errorDetails.push({
          operation: operation.operation,
          error: operation.error,
          suggestion: this.generateErrorSuggestion(operation.error)
        });
      }
    });

    return detailed;
  }

  /**
   * Formats results by data type
   * @private
   */
  formatResultsByType(executionResult, format) {
    const formatted = {};

    const domains = ['banking', 'weather', 'currency', 'location'];
    
    domains.forEach(domain => {
      const domainResults = executionResult.results.aggregated[domain] || [];
      if (domainResults.length > 0) {
        formatted[domain] = this.formatDomainResults(domainResults, format);
      }
    });

    return formatted;
  }

  /**
   * Generates result visualizations
   * @private
   */
  generateResultVisualizations(executionResult) {
    const visualizations = {};

    // Success rate visualization
    const successRate = this.calculateSuccessRate(executionResult);
    visualizations.successRate = this.createSuccessRateVisualization(successRate);

    // Execution timeline
    visualizations.timeline = this.createExecutionTimeline(executionResult);

    // Domain breakdown
    visualizations.domainBreakdown = this.createDomainBreakdown(executionResult);

    return visualizations;
  }

  /**
   * Creates success rate visualization
   * @private
   */
  createSuccessRateVisualization(successRate) {
    const width = 20;
    const filled = Math.round((successRate / 100) * width);
    const empty = width - filled;

    return {
      bar: `[${'█'.repeat(filled)}${'░'.repeat(empty)}] ${successRate}%`,
      percentage: successRate,
      status: successRate >= 80 ? 'excellent' : successRate >= 60 ? 'good' : 'needs_improvement'
    };
  }

  /**
   * Creates execution timeline visualization
   * @private
   */
  createExecutionTimeline(executionResult) {
    const timeline = [];
    
    executionResult.results.byStep.forEach((step, index) => {
      timeline.push({
        step: index + 1,
        name: step.stepId,
        duration: this.formatDuration(step.duration),
        operations: step.operations,
        successful: step.successful,
        status: step.successful === step.operations ? '✅' : '⚠️'
      });
    });

    return timeline;
  }

  /**
   * Helper methods for data processing
   */

  generateProgressTitle(workflow) {
    return workflow.name || `Workflow: ${workflow.id}`;
  }

  mapWorkflowToStages(workflow) {
    return workflow.executionPlan.steps.map((step, index) => ({
      name: `Step ${index + 1}`,
      description: step.operations.map(op => op.subGoal).join(', '),
      operations: step.operations.length,
      estimatedDuration: this.estimateStepDuration(step)
    }));
  }

  estimateWorkflowDuration(workflow) {
    // Simple estimation based on operation count and type
    const operationCount = workflow.executionPlan.steps.reduce((sum, step) => sum + step.operations.length, 0);
    const baseTime = 2000; // 2 seconds base
    const operationTime = operationCount * 1000; // 1 second per operation
    
    return baseTime + operationTime;
  }

  estimateStepDuration(step) {
    return step.operations.length * 1000; // 1 second per operation
  }

  calculateProgressPercentage(indicator, progress) {
    if (progress.percentage !== undefined) {
      return progress.percentage;
    }

    const totalStages = indicator.stages.length;
    const currentStage = indicator.currentStage;
    
    if (totalStages === 0) return 0;
    
    return Math.round(((currentStage + 1) / totalStages) * 100);
  }

  calculateTimeRemaining(indicator) {
    const elapsed = Date.now() - indicator.startTime;
    const progressPercent = indicator.progressPercent || 0;
    
    if (progressPercent === 0) return indicator.estimatedDuration;
    
    const totalEstimated = (elapsed / progressPercent) * 100;
    return Math.max(0, totalEstimated - elapsed);
  }

  calculateSuccessRate(executionResult) {
    const { totalOperations, successfulOperations } = executionResult.summary;
    return totalOperations > 0 ? Math.round((successfulOperations / totalOperations) * 100) : 0;
  }

  generateStatusMessage(indicator, progress) {
    if (progress.statusMessage) {
      return progress.statusMessage;
    }

    const currentStage = indicator.stages[indicator.currentStage];
    if (currentStage) {
      return `Executing: ${currentStage.description}`;
    }

    return `Processing workflow (${indicator.status})`;
  }

  formatDuration(milliseconds) {
    if (milliseconds < 1000) {
      return `${milliseconds}ms`;
    } else if (milliseconds < 60000) {
      return `${Math.round(milliseconds / 1000)}s`;
    } else {
      const minutes = Math.floor(milliseconds / 60000);
      const seconds = Math.round((milliseconds % 60000) / 1000);
      return `${minutes}m ${seconds}s`;
    }
  }

  parseConfirmationResponse(response, options) {
    const responseLower = response.toLowerCase().trim();
    
    // Check for explicit option matches
    for (const option of options) {
      if (responseLower === option.toLowerCase()) {
        return {
          choice: option,
          confirmed: this.isPositiveResponse(option)
        };
      }
    }

    // Check for common affirmative/negative responses
    const positiveResponses = ['yes', 'y', 'ok', 'sure', 'confirm', 'proceed', 'go', 'continue'];
    const negativeResponses = ['no', 'n', 'cancel', 'stop', 'abort', 'decline'];

    if (positiveResponses.includes(responseLower)) {
      return {
        choice: options[0], // Default to first option for positive
        confirmed: true
      };
    } else if (negativeResponses.includes(responseLower)) {
      return {
        choice: options[options.length - 1], // Default to last option for negative
        confirmed: false
      };
    }

    // Default to negative if unclear
    return {
      choice: options[options.length - 1],
      confirmed: false
    };
  }

  isPositiveResponse(response) {
    const positiveOptions = ['yes', 'confirm', 'proceed', 'continue', 'ok', 'sure'];
    return positiveOptions.some(opt => response.toLowerCase().includes(opt));
  }

  generateConfirmationId() {
    return `confirm_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  }

  initializePresentationTemplates() {
    // Banking result templates
    this.presentationTemplates.set('banking_balance', {
      title: '💰 Account Balance',
      format: (data) => `**Balance:** ${data.balance}\n**Account:** ${data.accountNumber}\n**Type:** ${data.accountType}`
    });

    this.presentationTemplates.set('banking_summary', {
      title: '📊 Account Summary',
      format: (data) => {
        let summary = `**Account Holder:** ${data.accountHolder}\n`;
        summary += `**Total Balance:** ${data.totalBalance}\n\n`;
        summary += `**Accounts:**\n`;
        data.accounts.forEach(acc => {
          summary += `• ${acc.type}: ${acc.balance} (${acc.accountNumber})\n`;
        });
        return summary;
      }
    });

    // Weather result templates
    this.presentationTemplates.set('weather_current', {
      title: '🌤️ Current Weather',
      format: (data) => {
        return `**Location:** ${data.name}\n**Temperature:** ${data.main.temp}°C\n**Condition:** ${data.weather[0].description}\n**Humidity:** ${data.main.humidity}%`;
      }
    });

    // Currency result templates
    this.presentationTemplates.set('currency_rates', {
      title: '💱 Exchange Rates',
      format: (data) => {
        let rates = `**Base Currency:** ${data.base}\n**Date:** ${data.date}\n\n**Rates:**\n`;
        Object.entries(data.rates).forEach(([currency, rate]) => {
          rates += `• ${currency}: ${rate}\n`;
        });
        return rates;
      }
    });
  }

  // Domain-specific result extraction methods
  
  extractBankingHighlights(bankingResults) {
    const highlights = {};
    
    bankingResults.forEach(result => {
      if (result.data) {
        if (result.data.balance) highlights.balance = result.data.balance;
        if (result.data.totalBalance) highlights.totalBalance = result.data.totalBalance;
        if (result.data.accountNumber) highlights.accountNumber = result.data.accountNumber;
      }
    });

    return highlights;
  }

  extractWeatherHighlights(weatherResults) {
    const highlights = {};
    
    weatherResults.forEach(result => {
      if (result.data) {
        if (result.data.main?.temp) highlights.temperature = `${result.data.main.temp}°C`;
        if (result.data.weather?.[0]?.description) highlights.condition = result.data.weather[0].description;
        if (result.data.name) highlights.location = result.data.name;
      }
    });

    return highlights;
  }

  extractCurrencyHighlights(currencyResults) {
    const highlights = {};
    
    currencyResults.forEach(result => {
      if (result.data) {
        if (result.data.base) highlights.baseCurrency = result.data.base;
        if (result.data.rates) {
          const topRates = Object.entries(result.data.rates).slice(0, 3);
          highlights.topRates = topRates.map(([curr, rate]) => `${curr}: ${rate}`);
        }
      }
    });

    return highlights;
  }

  // Cleanup methods

  cleanupProgressIndicator(workflowId) {
    this.activeProgressIndicators.delete(workflowId);
    this.statusUpdateCallbacks.delete(workflowId);
  }

  getActiveProgressIndicators() {
    return Array.from(this.activeProgressIndicators.keys());
  }

  getPendingConfirmations() {
    return this.confirmationQueue.length;
  }

  clearExpiredConfirmations() {
    const now = Date.now();
    this.confirmationQueue = this.confirmationQueue.filter(
      confirmation => (now - confirmation.timestamp) < confirmation.timeout
    );
  }
}