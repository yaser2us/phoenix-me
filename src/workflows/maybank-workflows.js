import { logger } from '../utils/logger.js';

/**
 * Maybank-Specific Workflows for Phase 4.2 Checkpoint 3
 * Provides intelligent workflows that combine multiple Maybank API calls
 * with interactive parameter collection and financial insights
 */
export class MaybankWorkflows {
  constructor() {
    this.workflows = new Map();
    this.initializeWorkflows();
    
    logger.info('Maybank workflows initialized', { 
      workflowCount: this.workflows.size 
    });
  }

  initializeWorkflows() {
    // Financial Overview Workflow
    this.workflows.set('maybank_financial_overview', {
      name: 'maybank_financial_overview',
      displayName: 'Complete Financial Overview',
      description: 'Get comprehensive overview of all Maybank accounts with balances and insights',
      apiType: 'maybank',
      stepCount: 3,
      estimatedTime: 8000, // 8 seconds
      complexity: 'medium',
      workflowType: 'financial_analysis',
      requiredParameters: ['jwtToken'],
      optionalParameters: ['includeDetails', 'analysisType'],
      steps: [
        {
          id: 'step1_get_balance',
          operation: 'get_banking_getBalance',
          description: 'Get MAE Wallet balance',
          parameters: { isFirstLoad: 'true' },
          outputMapping: 'maeBalance'
        },
        {
          id: 'step2_get_summary',
          operation: 'get_banking_summary', 
          description: 'Get account summary with all accounts',
          parameters: { type: 'A' },
          outputMapping: 'accountSummary'
        },
        {
          id: 'step3_get_all_accounts',
          operation: 'get_banking_all',
          description: 'Get detailed information for all accounts',
          parameters: {},
          outputMapping: 'allAccounts'
        }
      ],
      postProcessing: 'aggregateFinancialData',
      insights: true,
      sensitive: true
    });

    // MAE Wallet Focus Workflow
    this.workflows.set('maybank_mae_focus', {
      name: 'maybank_mae_focus',
      displayName: 'MAE Wallet Analysis',
      description: 'Detailed analysis of MAE Wallet account with spending insights',
      apiType: 'maybank',
      stepCount: 2,
      estimatedTime: 5000, // 5 seconds
      complexity: 'simple',
      workflowType: 'account_analysis',
      requiredParameters: ['jwtToken'],
      optionalParameters: ['period', 'includeRecommendations'],
      steps: [
        {
          id: 'step1_mae_balance',
          operation: 'get_banking_getBalance',
          description: 'Get current MAE Wallet balance',
          parameters: { isFirstLoad: 'true' },
          outputMapping: 'currentBalance'
        },
        {
          id: 'step2_account_context',
          operation: 'get_banking_summary',
          description: 'Get account context for comparison',
          parameters: { type: 'A' },
          outputMapping: 'accountContext'
        }
      ],
      postProcessing: 'analyzeMaeWallet',
      insights: true,
      sensitive: true
    });

    // Account Comparison Workflow
    this.workflows.set('maybank_account_comparison', {
      name: 'maybank_account_comparison',
      displayName: 'Account Comparison Analysis',
      description: 'Compare all accounts and provide financial recommendations',
      apiType: 'maybank',
      stepCount: 2,
      estimatedTime: 6000, // 6 seconds
      complexity: 'medium',
      workflowType: 'comparative_analysis',
      requiredParameters: ['jwtToken'],
      optionalParameters: ['comparisonType', 'recommendations'],
      steps: [
        {
          id: 'step1_all_accounts',
          operation: 'get_banking_all',
          description: 'Get all account details',
          parameters: {},
          outputMapping: 'accountDetails'
        },
        {
          id: 'step2_summary_data',
          operation: 'get_banking_summary',
          description: 'Get summary for context',
          parameters: { type: 'A' },
          outputMapping: 'summaryData'
        }
      ],
      postProcessing: 'compareAccounts',
      insights: true,
      sensitive: true
    });

    // Quick Balance Check Workflow
    this.workflows.set('maybank_quick_balance', {
      name: 'maybank_quick_balance',
      displayName: 'Quick Balance Check',
      description: 'Fast balance check with minimal API calls',
      apiType: 'maybank',
      stepCount: 1,
      estimatedTime: 3000, // 3 seconds
      complexity: 'simple',
      workflowType: 'quick_check',
      requiredParameters: ['jwtToken'],
      optionalParameters: ['accountType'],
      steps: [
        {
          id: 'step1_balance_only',
          operation: 'get_banking_getBalance',
          description: 'Get current balance',
          parameters: { isFirstLoad: 'true' },
          outputMapping: 'balance'
        }
      ],
      postProcessing: 'formatQuickBalance',
      insights: false,
      sensitive: true
    });

    // Financial Health Check Workflow
    this.workflows.set('maybank_health_check', {
      name: 'maybank_health_check',
      displayName: 'Financial Health Assessment',
      description: 'Comprehensive financial health analysis with recommendations',
      apiType: 'maybank',
      stepCount: 3,
      estimatedTime: 10000, // 10 seconds
      complexity: 'complex',
      workflowType: 'health_assessment',
      requiredParameters: ['jwtToken'],
      optionalParameters: ['healthMetrics', 'recommendationLevel'],
      steps: [
        {
          id: 'step1_balance_check',
          operation: 'get_banking_getBalance',
          description: 'Check MAE Wallet balance',
          parameters: { isFirstLoad: 'true' },
          outputMapping: 'primaryBalance'
        },
        {
          id: 'step2_all_accounts',
          operation: 'get_banking_all',
          description: 'Get all account information',
          parameters: {},
          outputMapping: 'allAccountData'
        },
        {
          id: 'step3_summary_analysis',
          operation: 'get_banking_summary',
          description: 'Get comprehensive summary',
          parameters: { type: 'A' },
          outputMapping: 'summaryAnalysis'
        }
      ],
      postProcessing: 'assessFinancialHealth',
      insights: true,
      sensitive: true,
      recommendations: true
    });
  }

  /**
   * Get all available Maybank workflows
   */
  getAllWorkflows() {
    return Array.from(this.workflows.values()).map(workflow => ({
      name: workflow.name,
      displayName: workflow.displayName,
      description: workflow.description,
      stepCount: workflow.stepCount,
      estimatedTime: workflow.estimatedTime,
      complexity: workflow.complexity,
      workflowType: workflow.workflowType,
      sensitive: workflow.sensitive,
      insights: workflow.insights
    }));
  }

  /**
   * Get specific workflow definition
   */
  getWorkflow(workflowName) {
    const workflow = this.workflows.get(workflowName);
    if (!workflow) {
      throw new Error(`Maybank workflow '${workflowName}' not found`);
    }
    return workflow;
  }

  /**
   * Suggest workflows based on user request
   */
  suggestWorkflows(userRequest) {
    const request = userRequest.toLowerCase();
    const suggestions = [];

    // Intent-based workflow suggestions
    if (request.includes('balance') && !request.includes('all')) {
      suggestions.push({
        workflowType: 'quick_check',
        workflow: 'maybank_quick_balance',
        confidence: 0.9,
        reasoning: 'User requested balance information - quick balance check is most appropriate'
      });
    }

    if (request.includes('mae') || request.includes('wallet')) {
      suggestions.push({
        workflowType: 'account_analysis',  
        workflow: 'maybank_mae_focus',
        confidence: 0.85,
        reasoning: 'User mentioned MAE wallet specifically'
      });
    }

    if (request.includes('all') || request.includes('accounts') || request.includes('total')) {
      suggestions.push({
        workflowType: 'financial_analysis',
        workflow: 'maybank_financial_overview',
        confidence: 0.8,
        reasoning: 'User wants comprehensive account information'
      });
    }

    if (request.includes('compare') || request.includes('analysis') || request.includes('overview')) {
      suggestions.push({
        workflowType: 'comparative_analysis',
        workflow: 'maybank_account_comparison', 
        confidence: 0.75,
        reasoning: 'User wants comparative analysis of accounts'
      });
    }

    if (request.includes('health') || request.includes('financial') || request.includes('advice')) {
      suggestions.push({
        workflowType: 'health_assessment',
        workflow: 'maybank_health_check',
        confidence: 0.8,
        reasoning: 'User wants financial health assessment'
      });
    }

    // If no specific matches, suggest the overview as default
    if (suggestions.length === 0) {
      suggestions.push({
        workflowType: 'financial_analysis',
        workflow: 'maybank_financial_overview',
        confidence: 0.6,
        reasoning: 'Default comprehensive overview for unclear requests'
      });
    }

    // Sort by confidence
    return suggestions.sort((a, b) => b.confidence - a.confidence);
  }

  /**
   * Post-processing functions for different workflow types
   */
  async processWorkflowResults(workflowName, stepResults, parameters = {}) {
    const workflow = this.getWorkflow(workflowName);
    
    switch (workflow.postProcessing) {
      case 'aggregateFinancialData':
        return this.aggregateFinancialData(stepResults, parameters);
        
      case 'analyzeMaeWallet':
        return this.analyzeMaeWallet(stepResults, parameters);
        
      case 'compareAccounts':
        return this.compareAccounts(stepResults, parameters);
        
      case 'formatQuickBalance':
        return this.formatQuickBalance(stepResults, parameters);
        
      case 'assessFinancialHealth':
        return this.assessFinancialHealth(stepResults, parameters);
        
      default:
        return this.defaultProcessing(stepResults, parameters);
    }
  }

  /**
   * Aggregate financial data from multiple API calls
   */
  aggregateFinancialData(stepResults, parameters) {
    try {
      const maeBalance = stepResults.maeBalance;
      const accountSummary = stepResults.accountSummary;
      const allAccounts = stepResults.allAccounts;

      // Check if any critical API calls failed and collect detailed error information
      const failedSteps = [];
      const apiErrors = [];
      const detailedErrors = [];

      if (!maeBalance?.success) {
        failedSteps.push('MAE Balance');
        const errorMsg = `MAE Balance: ${maeBalance?.error || 'API call failed'}`;
        apiErrors.push(errorMsg);
        
        // Add detailed error information for debugging
        if (maeBalance?.httpStatus) {
          detailedErrors.push({
            api: 'MAE Balance',
            endpoint: '/banking/v1/summary/getBalance',
            httpStatus: maeBalance.httpStatus,
            httpStatusText: maeBalance.httpStatusText,
            error: maeBalance.error,
            responseBody: maeBalance.responseBody,
            responseHeaders: maeBalance.responseHeaders,
            duration: maeBalance.duration,
            timestamp: maeBalance.timestamp
          });
        }
      }
      if (!accountSummary?.success) {
        failedSteps.push('Account Summary');
        const errorMsg = `Account Summary: ${accountSummary?.error || 'API call failed'}`;
        apiErrors.push(errorMsg);
        
        // Add detailed error information for debugging
        if (accountSummary?.httpStatus) {
          detailedErrors.push({
            api: 'Account Summary',
            endpoint: '/banking/v1/summary',
            httpStatus: accountSummary.httpStatus,
            httpStatusText: accountSummary.httpStatusText,
            error: accountSummary.error,
            responseBody: accountSummary.responseBody,
            responseHeaders: accountSummary.responseHeaders,
            duration: accountSummary.duration,
            timestamp: accountSummary.timestamp
          });
        }
      }
      if (!allAccounts?.success) {
        failedSteps.push('All Accounts');
        const errorMsg = `All Accounts: ${allAccounts?.error || 'API call failed'}`;
        apiErrors.push(errorMsg);
        
        // Add detailed error information for debugging
        if (allAccounts?.httpStatus) {
          detailedErrors.push({
            api: 'All Accounts',
            endpoint: '/banking/v1/accounts/all',
            httpStatus: allAccounts.httpStatus,
            httpStatusText: allAccounts.httpStatusText,
            error: allAccounts.error,
            responseBody: allAccounts.responseBody,
            responseHeaders: allAccounts.responseHeaders,
            duration: allAccounts.duration,
            timestamp: allAccounts.timestamp
          });
        }
      }

      // Use logger instead of console.log to avoid breaking MCP protocol
      logger.debug('RAW API RESPONSES FOR DEBUGGING', {
        maeBalance: maeBalance,
        accountSummary: accountSummary,
        allAccounts: allAccounts
      });

      // If all critical APIs failed, return failure with detailed error information
      if (failedSteps.length === 3) {
        return {
          success: false,
          error: `All Maybank API calls failed: ${apiErrors.join('; ')}`,
          workflowType: 'financial_analysis',
          failedSteps: failedSteps,
          detailedErrors: detailedErrors,
          summary: `All API calls failed - check detailed errors for debugging information`
        };
      }

      // If some APIs failed, include warning in results
      const aggregated = {
        overview: {
          totalBalance: accountSummary?.data?.summary?.totalBalance || 0,
          accountCount: accountSummary?.data?.summary?.accountCount || 0,
          maeAvailable: accountSummary?.data?.summary?.maeAvailable || false
        },
        maeWallet: {
          balance: maeBalance?.data?.account?.balance || '0.00',
          name: maeBalance?.data?.account?.name || 'MAE Wallet',
          code: maeBalance?.data?.account?.code || '0Y'
        },
        accounts: allAccounts?.data?.accounts || [],
        insights: this.generateFinancialInsights(stepResults),
        recommendations: this.generateRecommendations(stepResults),
        timestamp: new Date().toISOString(),
        // Add API status information with detailed errors
        apiStatus: {
          maeBalance: maeBalance?.success ? 'success' : 'failed',
          accountSummary: accountSummary?.success ? 'success' : 'failed', 
          allAccounts: allAccounts?.success ? 'success' : 'failed',
          failedSteps: failedSteps
        },
        // Include detailed error information for debugging
        detailedErrors: detailedErrors.length > 0 ? detailedErrors : undefined,
        // Include entire raw responses for debugging
        rawResponses: {
          maeBalance: maeBalance?.data || maeBalance,
          accountSummary: accountSummary?.data || accountSummary,
          allAccounts: allAccounts?.data || allAccounts
        }
      };

      // Determine overall success
      const isPartialSuccess = failedSteps.length > 0;
      
      return {
        success: true, // Partial success is still success
        data: aggregated,
        workflowType: 'financial_analysis',
        summary: isPartialSuccess 
          ? `Partial results: RM ${aggregated.overview.totalBalance} (${failedSteps.length} API calls failed: ${failedSteps.join(', ')})`
          : `Financial overview: RM ${aggregated.overview.totalBalance} across ${aggregated.overview.accountCount} accounts`,
        warnings: isPartialSuccess ? apiErrors : undefined,
        detailedErrors: detailedErrors.length > 0 ? detailedErrors : undefined
      };

    } catch (error) {
      logger.error('Failed to aggregate financial data', { error: error.message });
      return {
        success: false,
        error: `Financial data aggregation failed: ${error.message}`,
        workflowType: 'financial_analysis'
      };
    }
  }

  /**
   * Analyze MAE Wallet specifically
   */
  analyzeMaeWallet(stepResults, parameters) {
    try {
      const balance = stepResults.currentBalance?.data;
      const context = stepResults.accountContext?.data;

      const analysis = {
        maeWallet: {
          currentBalance: balance?.account?.balance || '0.00',
          balanceValue: balance?.account?.value || 0,
          accountName: balance?.account?.name || 'MAE Wallet'
        },
        context: {
          totalAcrossAllAccounts: context?.summary?.totalBalance || 0,
          maePercentage: this.calculateMaePercentage(balance, context)
        },
        insights: this.generateMaeInsights(balance, context),
        timestamp: new Date().toISOString()
      };

      return {
        success: true,
        data: analysis,
        workflowType: 'account_analysis',
        summary: `MAE Wallet: RM ${analysis.maeWallet.currentBalance} (${analysis.context.maePercentage}% of total funds)`
      };

    } catch (error) {
      logger.error('Failed to analyze MAE wallet', { error: error.message });
      return {
        success: false,
        error: `MAE wallet analysis failed: ${error.message}`,
        workflowType: 'account_analysis'
      };
    }
  }

  /**
   * Compare accounts and provide insights
   */
  compareAccounts(stepResults, parameters) {
    try {
      const accounts = stepResults.accountDetails?.data?.accounts || [];
      const summary = stepResults.summaryData?.data?.summary || {};

      const comparison = {
        accountCount: accounts.length,
        totalBalance: summary.totalBalance || 0,
        accountBreakdown: accounts.map(account => ({
          name: account.name,
          type: account.type || account.accountType,
          balance: parseFloat(account.balance) || 0,
          percentage: this.calculateAccountPercentage(account.balance, summary.totalBalance),
          active: account.active
        })),
        insights: this.generateComparisonInsights(accounts, summary),
        recommendations: this.generateAccountRecommendations(accounts),
        timestamp: new Date().toISOString()
      };

      return {
        success: true,
        data: comparison,
        workflowType: 'comparative_analysis',
        summary: `Account comparison: ${comparison.accountCount} accounts totaling RM ${comparison.totalBalance}`
      };

    } catch (error) {
      logger.error('Failed to compare accounts', { error: error.message });
      return {
        success: false,
        error: `Account comparison failed: ${error.message}`,
        workflowType: 'comparative_analysis'
      };
    }
  }

  /**
   * Format quick balance response
   */
  formatQuickBalance(stepResults, parameters) {
    try {
      const balance = stepResults.balance?.data;

      // Use logger instead of console.log to avoid breaking MCP protocol
      logger.debug('RAW BALANCE RESPONSE', {
        balanceResult: stepResults.balance
      });

      const formatted = {
        balance: balance?.account?.balance || '0.00',
        accountName: balance?.account?.name || 'MAE Wallet',
        displayText: balance?.formatted?.displayText || `Balance: RM ${balance?.account?.balance || '0.00'}`,
        timestamp: new Date().toISOString(),
        // Include raw response for debugging
        rawResponse: stepResults.balance
      };

      return {
        success: true,
        data: formatted,
        workflowType: 'quick_check',
        summary: formatted.displayText
      };

    } catch (error) {
      logger.error('Failed to format quick balance', { error: error.message });
      return {
        success: false,
        error: `Quick balance formatting failed: ${error.message}`,
        workflowType: 'quick_check'
      };
    }
  }

  /**
   * Assess financial health
   */
  assessFinancialHealth(stepResults, parameters) {
    try {
      const primaryBalance = stepResults.primaryBalance?.data;
      const allAccounts = stepResults.allAccountData?.data;
      const summary = stepResults.summaryAnalysis?.data;

      const healthScore = this.calculateHealthScore(primaryBalance, allAccounts, summary);
      
      const assessment = {
        healthScore: healthScore,
        rating: this.getHealthRating(healthScore),
        totalBalance: summary?.summary?.totalBalance || 0,
        accountDiversification: this.assessDiversification(allAccounts),
        recommendations: this.generateHealthRecommendations(healthScore, allAccounts),
        insights: this.generateHealthInsights(primaryBalance, allAccounts, summary),
        actionItems: this.generateActionItems(healthScore),
        timestamp: new Date().toISOString()
      };

      return {
        success: true,
        data: assessment,
        workflowType: 'health_assessment',
        summary: `Financial Health: ${assessment.rating} (Score: ${assessment.healthScore}/100)`
      };

    } catch (error) {
      logger.error('Failed to assess financial health', { error: error.message });
      return {
        success: false,
        error: `Financial health assessment failed: ${error.message}`,
        workflowType: 'health_assessment'
      };
    }
  }

  /**
   * Helper functions for analysis
   */
  calculateMaePercentage(balance, context) {
    const maeValue = balance?.account?.value || 0;
    const totalValue = context?.summary?.totalBalance || 0;
    
    if (totalValue === 0) return 0;
    return Math.round((maeValue / totalValue) * 100);
  }

  calculateAccountPercentage(accountBalance, totalBalance) {
    const balance = parseFloat(accountBalance) || 0;
    const total = parseFloat(totalBalance) || 0;
    
    if (total === 0) return 0;
    return Math.round((balance / total) * 100);
  }

  calculateHealthScore(primaryBalance, allAccounts, summary) {
    let score = 50; // Base score
    
    // Account diversification (20 points max)
    const accountCount = allAccounts?.accounts?.length || 0;
    score += Math.min(accountCount * 5, 20);
    
    // Balance distribution (20 points max)
    const totalBalance = summary?.summary?.totalBalance || 0;
    if (totalBalance > 1000) score += 10;
    if (totalBalance > 5000) score += 10;
    
    // Account activity (10 points max)
    const activeAccounts = allAccounts?.accounts?.filter(acc => acc.active)?.length || 0;
    score += Math.min(activeAccounts * 3, 10);
    
    return Math.min(score, 100);
  }

  getHealthRating(score) {
    if (score >= 90) return 'Excellent';
    if (score >= 75) return 'Good';
    if (score >= 60) return 'Fair';
    if (score >= 40) return 'Needs Improvement';
    return 'Poor';
  }

  assessDiversification(allAccounts) {
    const accounts = allAccounts?.accounts || [];
    const types = [...new Set(accounts.map(acc => acc.type || acc.accountType))];
    
    return {
      accountTypes: types.length,
      diversificationScore: Math.min(types.length * 25, 100),
      recommendation: types.length < 2 ? 'Consider diversifying account types' : 'Good account diversification'
    };
  }

  generateFinancialInsights(stepResults) {
    const insights = [];
    
    // Add insights based on the data
    const total = stepResults.accountSummary?.data?.summary?.totalBalance || 0;
    const accountCount = stepResults.accountSummary?.data?.summary?.accountCount || 0;
    
    if (total > 0) {
      insights.push(`You have a total of RM ${total} across ${accountCount} account${accountCount > 1 ? 's' : ''}`);
    }
    
    if (accountCount === 1) {
      insights.push('Consider opening additional account types for better financial management');
    }
    
    return insights;
  }

  generateRecommendations(stepResults) {
    const recommendations = [];
    
    const maeBalance = stepResults.maeBalance?.data?.account?.value || 0;
    const totalBalance = stepResults.accountSummary?.data?.summary?.totalBalance || 0;
    
    if (maeBalance / totalBalance > 0.8) {
      recommendations.push('Consider transferring some funds to a savings account for better interest earnings');
    }
    
    if (totalBalance < 1000) {
      recommendations.push('Building an emergency fund should be a priority');
    }
    
    return recommendations;
  }

  generateMaeInsights(balance, context) {
    const insights = [];
    const maeValue = balance?.account?.value || 0;
    
    if (maeValue > 500) {
      insights.push('Your MAE wallet has a healthy balance for daily transactions');
    } else if (maeValue < 100) {
      insights.push('Consider topping up your MAE wallet for convenience');
    }
    
    return insights;
  }

  generateComparisonInsights(accounts, summary) {
    const insights = [];
    
    if (accounts.length > 1) {
      const balances = accounts.map(acc => parseFloat(acc.balance) || 0);
      const maxBalance = Math.max(...balances);
      const primaryAccount = accounts.find(acc => (parseFloat(acc.balance) || 0) === maxBalance);
      
      if (primaryAccount) {
        insights.push(`Your ${primaryAccount.name} has the highest balance`);
      }
    }
    
    return insights;
  }

  generateAccountRecommendations(accounts) {
    const recommendations = [];
    
    const activeAccounts = accounts.filter(acc => acc.active).length;
    const totalAccounts = accounts.length;
    
    if (activeAccounts < totalAccounts) {
      recommendations.push('You have inactive accounts that could be optimized');
    }
    
    return recommendations;
  }

  generateHealthRecommendations(healthScore, allAccounts) {
    const recommendations = [];
    
    if (healthScore < 60) {
      recommendations.push('Focus on building your emergency fund');
      recommendations.push('Consider diversifying your account types');
    }
    
    if (healthScore >= 60 && healthScore < 80) {
      recommendations.push('Good foundation - consider investment opportunities');
    }
    
    if (healthScore >= 80) {
      recommendations.push('Excellent financial health - maintain current practices');
    }
    
    return recommendations;
  }

  generateHealthInsights(primaryBalance, allAccounts, summary) {
    const insights = [];
    const totalBalance = summary?.summary?.totalBalance || 0;
    
    if (totalBalance > 10000) {
      insights.push('You maintain a strong financial position');
    }
    
    const accountCount = allAccounts?.accounts?.length || 0;
    if (accountCount >= 2) {
      insights.push('Good account diversification supports financial stability');
    }
    
    return insights;
  }

  generateActionItems(healthScore) {
    const actions = [];
    
    if (healthScore < 50) {
      actions.push('Set up automatic savings transfers');
      actions.push('Review and optimize account fees');
    }
    
    if (healthScore >= 50 && healthScore < 75) {
      actions.push('Consider increasing savings rate');
      actions.push('Explore investment options');
    }
    
    if (healthScore >= 75) {
      actions.push('Review investment portfolio');
      actions.push('Consider advanced financial planning');
    }
    
    return actions;
  }

  defaultProcessing(stepResults, parameters) {
    return {
      success: true,
      data: stepResults,
      workflowType: 'generic',
      summary: 'Workflow completed successfully'
    };
  }

  /**
   * Validate workflow parameters
   */
  validateWorkflowParameters(workflowName, parameters) {
    const workflow = this.getWorkflow(workflowName);
    const missing = [];
    
    // Check required parameters
    for (const param of workflow.requiredParameters) {
      if (!parameters[param]) {
        missing.push(param);
      }
    }
    
    return {
      valid: missing.length === 0,
      missingParameters: missing,
      workflow: workflow
    };
  }

  /**
   * Get workflow statistics
   */
  getStats() {
    const workflows = Array.from(this.workflows.values());
    
    return {
      totalWorkflows: workflows.length,
      complexityBreakdown: {
        simple: workflows.filter(w => w.complexity === 'simple').length,
        medium: workflows.filter(w => w.complexity === 'medium').length,
        complex: workflows.filter(w => w.complexity === 'complex').length
      },
      averageSteps: Math.round(workflows.reduce((sum, w) => sum + w.stepCount, 0) / workflows.length),
      averageTime: Math.round(workflows.reduce((sum, w) => sum + w.estimatedTime, 0) / workflows.length),
      sensitiveWorkflows: workflows.filter(w => w.sensitive).length,
      workflowTypes: [...new Set(workflows.map(w => w.workflowType))]
    };
  }
}

export default MaybankWorkflows;