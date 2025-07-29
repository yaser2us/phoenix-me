import { logger } from '../utils/logger.js';

/**
 * Banking Workflows for Phase 4.1 Checkpoint 4
 * Defines complex multi-step banking operations with security and caching integration
 * 
 * Features:
 * - Multi-step workflow definitions
 * - Security-aware parameter handling
 * - Intelligent caching integration
 * - Error recovery and rollback
 * - Banking compliance requirements
 */
export class BankingWorkflows {
  constructor() {
    // Workflow definitions
    this.workflows = {
      // Transfer Money Workflow
      transferMoney: {
        id: 'transfer_money',
        name: 'Transfer Money',
        description: 'Complete money transfer between accounts',
        securityLevel: 'critical',
        requiresAuthentication: true,
        steps: [
          {
            id: 'validate_jwt',
            name: 'Validate JWT Token',
            type: 'authentication',
            required: true,
            timeout: 30000,
            parameters: ['jwtToken'],
            validation: {
              scopes: ['banking:write', 'transfers:create'],
              maxAge: 3600 // 1 hour
            },
            onError: 'prompt_jwt'
          },
          {
            id: 'get_accounts',
            name: 'Get User Accounts',
            type: 'api_call',
            operation: 'getAccounts',
            cacheable: true,
            cacheOptions: {
              ttl: 900, // 15 minutes
              encryption: true,
              requiresConsent: true
            },
            dependencies: ['validate_jwt']
          },
          {
            id: 'select_source_account',
            name: 'Select Source Account',
            type: 'user_input',
            interactive: true,
            parameters: ['fromAccountId'],
            validation: {
              type: 'account_selection',
              source: 'get_accounts'
            },
            dependencies: ['get_accounts']
          },
          {
            id: 'collect_transfer_details',
            name: 'Collect Transfer Details',
            type: 'user_input',
            interactive: true,
            parameters: ['toAccountId', 'amount', 'description'],
            validation: {
              toAccountId: { type: 'string', pattern: /^[A-Za-z0-9]{8,16}$/ },
              amount: { type: 'number', min: 0.01, max: 50000 },
              description: { type: 'string', maxLength: 200, optional: true }
            },
            dependencies: ['select_source_account']
          },
          {
            id: 'check_balance',
            name: 'Check Account Balance',
            type: 'api_call',
            operation: 'getAccountBalance',
            parameters: ['fromAccountId'],
            cacheable: false, // Never cache balance
            securityLevel: 'sensitive',
            dependencies: ['select_source_account']
          },
          {
            id: 'validate_transfer',
            name: 'Validate Transfer',
            type: 'validation',
            rules: [
              'sufficient_balance',
              'daily_limit_check',
              'recipient_validation',
              'fraud_detection'
            ],
            dependencies: ['check_balance', 'collect_transfer_details']
          },
          {
            id: 'execute_transfer',
            name: 'Execute Transfer',
            type: 'api_call',
            operation: 'createTransfer',
            parameters: ['fromAccountId', 'toAccountId', 'amount', 'description'],
            critical: true,
            rollbackable: true,
            cacheable: false,
            auditRequired: true,
            dependencies: ['validate_transfer']
          },
          {
            id: 'confirm_transaction',
            name: 'Confirm Transaction',
            type: 'confirmation',
            cacheable: true,
            cacheOptions: {
              ttl: 300, // 5 minutes
              encryption: true
            },
            dependencies: ['execute_transfer']
          }
        ],
        rollbackSteps: [
          'execute_transfer' // Can rollback transfer if needed
        ],
        errorHandling: {
          retry: ['get_accounts', 'check_balance'],
          prompt: ['validate_jwt', 'select_source_account', 'collect_transfer_details'],
          fail: ['execute_transfer']
        }
      },

      // Monthly Financial Summary Workflow
      monthlyFinancialSummary: {
        id: 'monthly_financial_summary',
        name: 'Monthly Financial Summary',
        description: 'Generate comprehensive monthly financial report',
        securityLevel: 'high',
        requiresAuthentication: true,
        steps: [
          {
            id: 'validate_jwt',
            name: 'Validate JWT Token',
            type: 'authentication',
            required: true,
            parameters: ['jwtToken'],
            validation: {
              scopes: ['banking:read', 'accounts:read', 'transactions:read'],
              maxAge: 3600
            }
          },
          {
            id: 'get_all_accounts',
            name: 'Get All User Accounts',
            type: 'api_call',
            operation: 'getAccounts',
            cacheable: true,
            cacheOptions: {
              ttl: 900, // 15 minutes
              encryption: true,
              requiresConsent: true
            },
            dependencies: ['validate_jwt']
          },
          {
            id: 'collect_date_range',
            name: 'Collect Date Range',
            type: 'user_input',
            interactive: true,
            parameters: ['startDate', 'endDate'],
            defaults: {
              startDate: () => {
                const date = new Date();
                date.setMonth(date.getMonth() - 1);
                date.setDate(1);
                return date.toISOString().split('T')[0];
              },
              endDate: () => {
                const date = new Date();
                date.setDate(0);
                return date.toISOString().split('T')[0];
              }
            },
            validation: {
              startDate: { type: 'date', maxPastDays: 730 },
              endDate: { type: 'date', maxPastDays: 0 }
            }
          },
          {
            id: 'get_transactions_per_account',
            name: 'Get Transactions for Each Account',
            type: 'parallel_api_calls',
            operation: 'getAccountTransactions',
            source: 'get_all_accounts',
            cacheable: true,
            cacheOptions: {
              ttl: 600, // 10 minutes
              encryption: true,
              keyPattern: 'transactions:{accountId}:{startDate}:{endDate}'
            },
            dependencies: ['get_all_accounts', 'collect_date_range']
          },
          {
            id: 'calculate_summaries',
            name: 'Calculate Financial Summaries',
            type: 'computation',
            computations: [
              'total_income',
              'total_expenses',
              'net_change',
              'category_breakdown',
              'account_summaries',
              'spending_trends'
            ],
            cacheable: true,
            cacheOptions: {
              ttl: 3600, // 1 hour
              encryption: true,
              keyPattern: 'summary:{userId}:{startDate}:{endDate}'
            },
            dependencies: ['get_transactions_per_account']
          },
          {
            id: 'generate_report',
            name: 'Generate Financial Report',
            type: 'report_generation',
            format: 'detailed',
            cacheable: true,
            cacheOptions: {
              ttl: 3600, // 1 hour
              encryption: true,
              requiresConsent: true,
              consentType: 'cache_financial_reports'
            },
            dependencies: ['calculate_summaries']
          }
        ],
        errorHandling: {
          retry: ['get_all_accounts', 'get_transactions_per_account'],
          prompt: ['validate_jwt', 'collect_date_range'],
          continue: ['calculate_summaries', 'generate_report']
        }
      },

      // Account Verification Workflow
      accountVerification: {
        id: 'account_verification',
        name: 'Account Verification',
        description: 'Verify account ownership and details',
        securityLevel: 'critical',
        requiresAuthentication: true,
        steps: [
          {
            id: 'validate_jwt',
            name: 'Validate JWT Token',
            type: 'authentication',
            required: true,
            parameters: ['jwtToken'],
            validation: {
              scopes: ['banking:read', 'verification:create'],
              maxAge: 1800 // 30 minutes for verification
            }
          },
          {
            id: 'collect_account_details',
            name: 'Collect Account Details',
            type: 'user_input',
            interactive: true,
            parameters: ['accountId', 'accountType'],
            validation: {
              accountId: { type: 'string', pattern: /^[A-Za-z0-9]{8,16}$/ },
              accountType: { type: 'enum', values: ['checking', 'savings', 'credit'] }
            }
          },
          {
            id: 'verify_account_ownership',
            name: 'Verify Account Ownership',
            type: 'api_call',
            operation: 'getAccount',
            parameters: ['accountId'],
            cacheable: false, // Verification should always be fresh
            securityLevel: 'critical',
            dependencies: ['validate_jwt', 'collect_account_details']
          },
          {
            id: 'collect_verification_method',
            name: 'Select Verification Method',
            type: 'user_input',
            interactive: true,
            parameters: ['verificationMethod'],
            validation: {
              verificationMethod: { 
                type: 'enum', 
                values: ['micro_deposit', 'instant_verification', 'manual_review'] 
              }
            },
            dependencies: ['verify_account_ownership']
          },
          {
            id: 'execute_verification',
            name: 'Execute Verification Process',
            type: 'conditional_execution',
            conditions: {
              micro_deposit: {
                steps: ['initiate_micro_deposit', 'wait_for_deposit', 'verify_amounts']
              },
              instant_verification: {
                steps: ['check_banking_credentials', 'validate_account_info']
              },
              manual_review: {
                steps: ['submit_documents', 'schedule_review']
              }
            },
            dependencies: ['collect_verification_method']
          },
          {
            id: 'finalize_verification',
            name: 'Finalize Verification',
            type: 'finalization',
            cacheable: true,
            cacheOptions: {
              ttl: 86400, // 24 hours
              encryption: true,
              keyPattern: 'verification:{accountId}:{userId}'
            },
            dependencies: ['execute_verification']
          }
        ],
        errorHandling: {
          retry: ['verify_account_ownership', 'execute_verification'],
          prompt: ['validate_jwt', 'collect_account_details', 'collect_verification_method'],
          escalate: ['finalize_verification']
        }
      },

      // Transaction History Export
      transactionHistoryExport: {
        id: 'transaction_history_export',
        name: 'Transaction History Export',
        description: 'Export transaction history in various formats',
        securityLevel: 'high',
        requiresAuthentication: true,
        steps: [
          {
            id: 'validate_jwt',
            name: 'Validate JWT Token',
            type: 'authentication',
            required: true,
            parameters: ['jwtToken'],
            validation: {
              scopes: ['banking:read', 'transactions:export'],
              maxAge: 3600
            }
          },
          {
            id: 'collect_export_preferences',
            name: 'Collect Export Preferences',
            type: 'user_input',
            interactive: true,
            parameters: ['accountIds', 'startDate', 'endDate', 'format', 'includeDetails'],
            validation: {
              accountIds: { type: 'array', itemType: 'string' },
              startDate: { type: 'date', maxPastDays: 2190 }, // 6 years
              endDate: { type: 'date', maxPastDays: 0 },
              format: { type: 'enum', values: ['csv', 'json', 'pdf', 'excel'] },
              includeDetails: { type: 'boolean', default: true }
            }
          },
          {
            id: 'validate_export_request',
            name: 'Validate Export Request',
            type: 'validation',
            rules: [
              'date_range_valid',
              'account_access_permissions',
              'export_size_limits',
              'rate_limiting'
            ],
            dependencies: ['validate_jwt', 'collect_export_preferences']
          },
          {
            id: 'fetch_transactions',
            name: 'Fetch Transaction Data',
            type: 'parallel_api_calls',
            operation: 'getAccountTransactions',
            source: 'accountIds',
            cacheable: true,
            cacheOptions: {
              ttl: 1800, // 30 minutes
              encryption: true,
              keyPattern: 'export_data:{accountId}:{startDate}:{endDate}'
            },
            dependencies: ['validate_export_request']
          },
          {
            id: 'process_export_data',
            name: 'Process Export Data',
            type: 'data_processing',
            operations: [
              'filter_by_date_range',
              'sanitize_sensitive_data',
              'apply_formatting',
              'generate_export_file'
            ],
            dependencies: ['fetch_transactions']
          },
          {
            id: 'deliver_export',
            name: 'Deliver Export File',
            type: 'delivery',
            methods: ['download', 'email', 'secure_link'],
            securityOptions: {
              encryption: true,
              passwordProtected: true,
              expirationTime: 3600 // 1 hour
            },
            dependencies: ['process_export_data']
          }
        ],
        errorHandling: {
          retry: ['fetch_transactions', 'process_export_data'],
          prompt: ['validate_jwt', 'collect_export_preferences'],
          continue: ['deliver_export']
        }
      }
    };

    this.initialized = true;
    logger.info('Banking Workflows initialized with complex multi-step operations');
  }

  /**
   * Get workflow definition by ID
   * @param {string} workflowId - Workflow identifier
   * @returns {Object|null} Workflow definition
   */
  getWorkflow(workflowId) {
    return this.workflows[workflowId] || null;
  }

  /**
   * Get all available workflows
   * @returns {Array} List of workflow definitions
   */
  getAllWorkflows() {
    return Object.values(this.workflows);
  }

  /**
   * Get workflows by security level
   * @param {string} securityLevel - Security level filter
   * @returns {Array} Filtered workflows
   */
  getWorkflowsBySecurityLevel(securityLevel) {
    return Object.values(this.workflows).filter(
      workflow => workflow.securityLevel === securityLevel
    );
  }

  /**
   * Validate workflow step configuration
   * @param {Object} step - Workflow step
   * @returns {Object} Validation result
   */
  validateStep(step) {
    const required = ['id', 'name', 'type'];
    const missing = required.filter(field => !step[field]);
    
    if (missing.length > 0) {
      return {
        valid: false,
        errors: [`Missing required fields: ${missing.join(', ')}`]
      };
    }

    // Type-specific validation
    const typeValidations = {
      authentication: ['parameters'],
      api_call: ['operation'],
      user_input: ['parameters'],
      validation: ['rules'],
      computation: ['computations'],
      conditional_execution: ['conditions']
    };

    const requiredForType = typeValidations[step.type] || [];
    const missingForType = requiredForType.filter(field => !step[field]);

    if (missingForType.length > 0) {
      return {
        valid: false,
        errors: [`Missing fields for ${step.type}: ${missingForType.join(', ')}`]
      };
    }

    return { valid: true, errors: [] };
  }

  /**
   * Get workflow statistics
   * @returns {Object} Workflow statistics
   */
  getStats() {
    const workflowStats = Object.values(this.workflows).map(workflow => ({
      id: workflow.id,
      name: workflow.name,
      steps: workflow.steps.length,
      securityLevel: workflow.securityLevel,
      hasRollback: workflow.rollbackSteps?.length > 0,
      cacheableSteps: workflow.steps.filter(step => step.cacheable).length,
      interactiveSteps: workflow.steps.filter(step => step.interactive).length
    }));

    return {
      initialized: this.initialized,
      totalWorkflows: Object.keys(this.workflows).length,
      totalSteps: Object.values(this.workflows).reduce((sum, w) => sum + w.steps.length, 0),
      securityLevels: {
        critical: workflowStats.filter(w => w.securityLevel === 'critical').length,
        high: workflowStats.filter(w => w.securityLevel === 'high').length,
        medium: workflowStats.filter(w => w.securityLevel === 'medium').length
      },
      features: {
        rollbackSupport: workflowStats.filter(w => w.hasRollback).length,
        cachingIntegration: workflowStats.reduce((sum, w) => sum + w.cacheableSteps, 0),
        interactiveSteps: workflowStats.reduce((sum, w) => sum + w.interactiveSteps, 0)
      },
      workflows: workflowStats
    };
  }
}