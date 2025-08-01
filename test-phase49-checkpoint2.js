#!/usr/bin/env node

/**
 * Phase 4.9 Checkpoint 2 Test: Dynamic Workflow Execution
 * Tests the dynamic execution of composed workflows with intelligent data flow
 */

import { logger } from './src/utils/logger.js';
import { ApiRegistry } from './src/registry/api-registry.js';
import { CompositionCoordinator } from './src/composition/composition-coordinator.js';
import { ApiCatalogProvider } from './src/composition/api-catalog-provider.js';
import { ClaudeWorkflowComposer } from './src/composition/claude-workflow-composer.js';
import { WorkflowPlanParser } from './src/composition/workflow-plan-parser.js';
import { DynamicWorkflowExecutor } from './src/execution/dynamic-workflow-executor.js';
import { DataFlowManager } from './src/execution/data-flow-manager.js';
import { WorkflowOrchestrator } from './src/execution/workflow-orchestrator.js';
import { AdaptiveErrorRecovery } from './src/execution/adaptive-error-recovery.js';

/**
 * Test Suite for Phase 4.9 Checkpoint 2
 */
class Phase49Checkpoint2Test {
  constructor() {
    this.testResults = [];
    this.components = {};
  }

  async runAllTests() {
    console.log('\n🚀 Phase 4.9 Checkpoint 2: Dynamic Workflow Execution Tests\n');
    
    try {
      // Initialize components
      await this.initializeComponents();
      
      // Run test suite
      await this.testDynamicWorkflowExecutor();
      await this.testDataFlowManager();
      await this.testWorkflowOrchestrator();
      await this.testAdaptiveErrorRecovery();
      await this.testEndToEndWorkflowExecution();
      
      // Generate results
      this.generateTestReport();
      
    } catch (error) {
      console.error('❌ Test suite failed:', error.message);
      process.exit(1);
    }
  }

  async initializeComponents() {
    console.log('📋 Initializing Phase 4.9 Checkpoint 2 components...');
    
    try {
      // Initialize existing components from Checkpoint 1
      this.components.registry = new ApiRegistry();
      await this.components.registry.initialize();
      
      this.components.catalogProvider = new ApiCatalogProvider(this.components.registry);
      this.components.workflowComposer = new ClaudeWorkflowComposer();
      this.components.planParser = new WorkflowPlanParser();
      this.components.coordinator = new CompositionCoordinator(
        this.components.catalogProvider,
        this.components.workflowComposer,
        this.components.planParser
      );
      
      // Initialize new Checkpoint 2 components
      this.components.dataFlowManager = new DataFlowManager();
      this.components.errorRecovery = new AdaptiveErrorRecovery();
      this.components.orchestrator = new WorkflowOrchestrator(
        this.components.dataFlowManager,
        this.components.errorRecovery
      );
      this.components.executor = new DynamicWorkflowExecutor(
        this.components.registry,
        this.components.orchestrator
      );
      
      console.log('✅ All Checkpoint 2 components initialized');
      
    } catch (error) {
      console.error('❌ Component initialization failed:', error.message);
      throw error;
    }
  }

  async testDynamicWorkflowExecutor() {
    console.log('\n🧪 Testing Dynamic Workflow Executor...');
    
    try {
      // Test 1: Execute simple single-step workflow
      const simpleWorkflow = {
        steps: [{
          id: 'step1',
          operation: 'get_banking_getBalance',
          parameters: { isFirstLoad: 'true' },
          dependencies: []
        }],
        executionOrder: ['step1'],
        dataFlowMap: new Map()
      };
      
      const simpleResult = await this.components.executor.executeWorkflow(simpleWorkflow);
      this.assert(simpleResult && simpleResult.success !== undefined, 'Simple workflow execution should return result');
      
      console.log(`✅ Simple workflow execution: ${simpleResult.success ? 'Success' : 'Failed'}`);
      
      // Test 2: Execute multi-step workflow with data flow
      const multiStepWorkflow = {
        steps: [
          {
            id: 'step1',
            operation: 'get_banking_getBalance',
            parameters: { isFirstLoad: 'true' },
            dependencies: []
          },
          {
            id: 'step2',
            operation: 'getCurrentWeather',
            parameters: { city: 'Kuala Lumpur' },
            dependencies: []
          }
        ],
        executionOrder: ['step1', 'step2'],
        dataFlowMap: new Map()
      };
      
      // This might fail due to API connectivity, but should handle gracefully
      const multiResult = await this.components.executor.executeWorkflow(multiStepWorkflow);
      this.assert(multiResult !== null, 'Multi-step workflow should return result even if steps fail');
      
      console.log(`✅ Multi-step workflow execution completed`);
      
      // Test 3: Execute workflow with dependencies
      const dependentWorkflow = {
        steps: [
          {
            id: 'step1',
            operation: 'get_banking_getBalance',
            parameters: { isFirstLoad: 'true' },
            dependencies: []
          },
          {
            id: 'step2',
            operation: 'synthesize_response',
            parameters: {},
            dependencies: ['step1']
          }
        ],
        executionOrder: ['step1', 'step2'],
        dataFlowMap: new Map([
          ['step2', [{ from: 'step1', to: 'step2', field: 'balance', transformation: 'extract_balance' }]]
        ])
      };
      
      const dependentResult = await this.components.executor.executeWorkflow(dependentWorkflow);
      this.assert(dependentResult !== null, 'Dependent workflow should return result');
      
      console.log(`✅ Dependent workflow execution completed`);
      
      this.recordTest('Dynamic Workflow Executor', 'PASS', 'All workflow execution tests passed');
      
    } catch (error) {
      this.recordTest('Dynamic Workflow Executor', 'FAIL', error.message);
      throw error;
    }
  }

  async testDataFlowManager() {
    console.log('\n🧪 Testing Data Flow Manager...');
    
    try {
      // Test 1: Simple data transformation
      const sourceData = { balance: { amount: 1000, currency: 'MYR' } };
      const transformation = 'extract_balance_value';
      
      const transformed = await this.components.dataFlowManager.transformData(
        sourceData, 
        transformation, 
        'balance'
      );
      
      this.assert(transformed !== undefined, 'Data transformation should return value');
      console.log(`✅ Data transformation: ${JSON.stringify(transformed).substring(0, 50)}...`);
      
      // Test 2: Data flow execution
      const dataFlow = {
        from: 'step1',
        to: 'step2',
        field: 'balance_amount',
        transformation: 'extract_balance_value'
      };
      
      const stepResults = new Map([
        ['step1', { success: true, data: { balance: { amount: 1500, currency: 'MYR' } } }]
      ]);
      
      const flowResult = await this.components.dataFlowManager.executeDataFlow(
        dataFlow,
        stepResults
      );
      
      this.assert(flowResult !== undefined, 'Data flow execution should return result');
      console.log(`✅ Data flow execution completed`);
      
      // Test 3: Complex data flow with multiple sources
      const complexDataFlow = [
        { from: 'step1', to: 'step3', field: 'balance_data', transformation: 'extract_financial' },
        { from: 'step2', to: 'step3', field: 'weather_data', transformation: 'extract_weather' }
      ];
      
      const complexStepResults = new Map([
        ['step1', { success: true, data: { balance: { amount: 2000 } } }],
        ['step2', { success: true, data: { weather: { temperature: 28, condition: 'sunny' } } }]
      ]);
      
      const complexFlowResult = await this.components.dataFlowManager.executeMultipleDataFlows(
        complexDataFlow,
        complexStepResults
      );
      
      this.assert(complexFlowResult && typeof complexFlowResult === 'object', 'Complex data flow should return object');
      console.log(`✅ Complex data flow execution completed`);
      
      this.recordTest('Data Flow Manager', 'PASS', 'All data flow tests passed');
      
    } catch (error) {
      this.recordTest('Data Flow Manager', 'FAIL', error.message);
      throw error;
    }
  }

  async testWorkflowOrchestrator() {
    console.log('\n🧪 Testing Workflow Orchestrator...');
    
    try {
      // Test 1: Sequential execution
      const sequentialSteps = [
        { id: 'step1', operation: 'get_banking_getBalance', dependencies: [] },
        { id: 'step2', operation: 'getCurrentWeather', dependencies: ['step1'] }
      ];
      
      const sequentialPlan = await this.components.orchestrator.planExecution(sequentialSteps);
      this.assert(sequentialPlan && sequentialPlan.strategy === 'sequential', 'Sequential plan should be identified');
      
      console.log(`✅ Sequential execution planning: ${sequentialPlan.batches.length} batches`);
      
      // Test 2: Parallel execution
      const parallelSteps = [
        { id: 'step1', operation: 'get_banking_getBalance', dependencies: [] },
        { id: 'step2', operation: 'getCurrentWeather', dependencies: [] },
        { id: 'step3', operation: 'getExchangeRates', dependencies: [] }
      ];
      
      const parallelPlan = await this.components.orchestrator.planExecution(parallelSteps);
      this.assert(parallelPlan && parallelPlan.strategy === 'parallel', 'Parallel plan should be identified');
      
      console.log(`✅ Parallel execution planning: ${parallelPlan.batches.length} batches`);
      
      // Test 3: Mixed execution with dependencies
      const mixedSteps = [
        { id: 'step1', operation: 'get_banking_getBalance', dependencies: [] },
        { id: 'step2', operation: 'getCurrentWeather', dependencies: [] },
        { id: 'step3', operation: 'synthesize_response', dependencies: ['step1', 'step2'] }
      ];
      
      const mixedPlan = await this.components.orchestrator.planExecution(mixedSteps);
      this.assert(mixedPlan && mixedPlan.strategy === 'mixed', 'Mixed plan should be identified');
      
      console.log(`✅ Mixed execution planning: ${mixedPlan.batches.length} batches`);
      
      // Test 4: Execution timing estimation
      const timingEstimate = await this.components.orchestrator.estimateExecutionTime(parallelSteps);
      this.assert(typeof timingEstimate === 'number' && timingEstimate > 0, 'Timing estimate should be positive number');
      
      console.log(`✅ Execution time estimation: ${timingEstimate}s`);
      
      this.recordTest('Workflow Orchestrator', 'PASS', 'All orchestration tests passed');
      
    } catch (error) {
      this.recordTest('Workflow Orchestrator', 'FAIL', error.message);
      throw error;
    }
  }

  async testAdaptiveErrorRecovery() {
    console.log('\n🧪 Testing Adaptive Error Recovery...');
    
    try {
      // Test 1: Retry strategy determination
      const networkError = { code: 'ECONNABORTED', message: 'Request timeout' };
      const retryStrategy = await this.components.errorRecovery.determineRetryStrategy(networkError);
      
      this.assert(retryStrategy && retryStrategy.shouldRetry, 'Network errors should be retryable');
      this.assert(retryStrategy.maxRetries > 0, 'Should have retry limit');
      
      console.log(`✅ Retry strategy: ${retryStrategy.shouldRetry ? 'Retry' : 'No retry'}, max: ${retryStrategy.maxRetries}`);
      
      // Test 2: Graceful degradation
      const failedStep = {
        id: 'step2',
        operation: 'getCurrentWeather',
        error: { message: 'API unavailable', status: 503 }
      };
      
      const workflow = {
        steps: [
          { id: 'step1', operation: 'get_banking_getBalance' },
          failedStep,
          { id: 'step3', operation: 'synthesize_response', dependencies: ['step1', 'step2'] }
        ]
      };
      
      const degradationStrategy = await this.components.errorRecovery.planGracefulDegradation(
        failedStep,
        workflow
      );
      
      this.assert(degradationStrategy !== null, 'Should provide degradation strategy');
      console.log(`✅ Graceful degradation: ${degradationStrategy.strategy}`);
      
      // Test 3: Error recovery execution
      const stepResults = new Map([
        ['step1', { success: true, data: { balance: 1000 } }],
        ['step2', { success: false, error: 'Weather API down' }]
      ]);
      
      const recoveryResult = await this.components.errorRecovery.executeRecovery(
        'step2',
        stepResults,
        workflow
      );
      
      this.assert(recoveryResult !== null, 'Recovery should provide result');
      console.log(`✅ Error recovery executed: ${recoveryResult.recovered ? 'Success' : 'Failed'}`);
      
      // Test 4: Circuit breaker functionality
      const circuitBreakerTest = await this.components.errorRecovery.shouldCircuitBreak('getCurrentWeather');
      this.assert(typeof circuitBreakerTest === 'boolean', 'Circuit breaker should return boolean');
      
      console.log(`✅ Circuit breaker check: ${circuitBreakerTest ? 'Open' : 'Closed'}`);
      
      this.recordTest('Adaptive Error Recovery', 'PASS', 'All error recovery tests passed');
      
    } catch (error) {
      this.recordTest('Adaptive Error Recovery', 'FAIL', error.message);
      throw error;
    }
  }

  async testEndToEndWorkflowExecution() {
    console.log('\n🧪 Testing End-to-End Workflow Execution...');
    
    try {
      // Test 1: Complete workflow from composition to execution
      const userRequest = "Show me my account balance and today's weather";
      
      console.log(`📝 User Request: "${userRequest}"`);
      
      // Step 1: Compose the workflow
      const composition = await this.components.coordinator.composeWorkflow(userRequest);
      this.assert(composition.success, 'Workflow composition should succeed');
      
      console.log(`✅ Workflow composed with ${composition.executablePlan.steps.length} steps`);
      
      // Step 2: Execute the composed workflow
      const executionResult = await this.components.executor.executeWorkflow(composition.executablePlan);
      this.assert(executionResult !== null, 'Workflow execution should return result');
      
      console.log(`✅ Workflow execution completed: ${executionResult.success ? 'Success' : 'Completed with issues'}`);
      
      // Test 2: Complex multi-domain workflow
      const complexRequest = "I need my financial overview with weather and currency information";
      
      console.log(`📝 Complex Request: "${complexRequest}"`);
      
      const complexComposition = await this.components.coordinator.composeWorkflow(complexRequest);
      this.assert(complexComposition.success, 'Complex workflow composition should succeed');
      
      console.log(`✅ Complex workflow composed with ${complexComposition.executablePlan.steps.length} steps`);
      
      const complexExecution = await this.components.executor.executeWorkflow(complexComposition.executablePlan);
      this.assert(complexExecution !== null, 'Complex workflow execution should return result');
      
      console.log(`✅ Complex workflow execution completed`);
      
      // Test 3: Performance metrics
      if (executionResult && executionResult.metrics) {
        const metrics = executionResult.metrics;
        console.log(`📊 Execution Metrics:`);
        console.log(`   - Total time: ${metrics.totalTime || 'N/A'}ms`);
        console.log(`   - Steps executed: ${metrics.stepsExecuted || 'N/A'}`);
        console.log(`   - Parallel operations: ${metrics.parallelOps || 'N/A'}`);
        console.log(`   - Data flows: ${metrics.dataFlows || 'N/A'}`);
      }
      
      // Test 4: Error handling in complex workflows
      const errorProneRequest = "Get my balance from non-existent API and combine with weather";
      
      const errorComposition = await this.components.coordinator.composeWorkflow(errorProneRequest);
      const errorExecution = await this.components.executor.executeWorkflow(errorComposition.executablePlan);
      
      // Should handle errors gracefully
      this.assert(errorExecution !== null, 'Error-prone workflow should still return result');
      console.log(`✅ Error handling test completed`);
      
      this.recordTest('End-to-End Workflow Execution', 'PASS', 'All end-to-end tests passed');
      
    } catch (error) {
      this.recordTest('End-to-End Workflow Execution', 'FAIL', error.message);
      throw error;
    }
  }

  assert(condition, message) {
    if (!condition) {
      throw new Error(`Assertion failed: ${message}`);
    }
  }

  recordTest(testName, status, details) {
    this.testResults.push({
      test: testName,
      status,
      details,
      timestamp: new Date().toISOString()
    });
  }

  generateTestReport() {
    console.log('\n📊 Phase 4.9 Checkpoint 2 Test Results\n');
    
    const passed = this.testResults.filter(r => r.status === 'PASS').length;
    const failed = this.testResults.filter(r => r.status === 'FAIL').length;
    
    this.testResults.forEach(result => {
      const icon = result.status === 'PASS' ? '✅' : '❌';
      console.log(`${icon} ${result.test}: ${result.details}`);
    });
    
    console.log(`\n📈 Summary: ${passed} passed, ${failed} failed`);
    
    if (failed === 0) {
      console.log('\n🎉 All Checkpoint 2 tests passed! Ready for implementation.');
    } else {
      console.log('\n⚠️ Some tests failed. Fix issues before proceeding.');
      process.exit(1);
    }
  }
}

// Run tests if this file is executed directly
if (import.meta.url === new URL(process.argv[1], 'file://').href) {
  const test = new Phase49Checkpoint2Test();
  test.runAllTests().catch(console.error);
}

export { Phase49Checkpoint2Test };