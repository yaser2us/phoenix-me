import { ApiRegistry } from './src/registry/api-registry.js';
import { AIWorkflowPlanner } from './src/workflow/ai-workflow-planner.js';
import { DynamicParameterCollector } from './src/workflow/dynamic-parameter-collector.js';
import { WorkflowExecutionEngine } from './src/execution/workflow-execution-engine.js';
import { logger } from './src/utils/logger.js';

/**
 * Phase 4.5 - Checkpoint 4: Multi-Operation Workflow Execution
 * Tests complex workflow execution with data flow, parallel processing, and error handling
 */
async function runCheckpoint4Tests() {
  console.log('🚀 Phase 4.5 - Checkpoint 4: Multi-Operation Workflow Execution');
  console.log('='.repeat(75));
  console.log('Testing complex workflow execution with data flow and error handling...\n');

  const results = {
    passed: 0,
    failed: 0,
    tests: []
  };

  try {
    // Initialize components
    const apiRegistry = new ApiRegistry();
    await apiRegistry.initialize();
    
    const workflowPlanner = new AIWorkflowPlanner(apiRegistry);
    const parameterCollector = new DynamicParameterCollector(apiRegistry);
    const executionEngine = new WorkflowExecutionEngine(apiRegistry, parameterCollector);

    // Test 1: Simple Multi-Operation Workflow
    await testSimpleMultiOperationWorkflow(workflowPlanner, parameterCollector, executionEngine, results);

    // Test 2: Complex Workflow with Data Flow
    await testComplexWorkflowDataFlow(workflowPlanner, parameterCollector, executionEngine, results);

    // Test 3: Parallel vs Sequential Execution
    await testParallelVsSequentialExecution(workflowPlanner, parameterCollector, executionEngine, results);

    // Test 4: Error Handling and Recovery
    await testErrorHandlingAndRecovery(workflowPlanner, parameterCollector, executionEngine, results);

    // Test 5: Performance and Monitoring
    await testPerformanceAndMonitoring(executionEngine, results);

  } catch (error) {
    logger.error('Test suite failed:', error);
    results.failed++;
  }

  // Print summary
  printTestSummary(results);
}

/**
 * Test 1: Simple Multi-Operation Workflow
 */
async function testSimpleMultiOperationWorkflow(planner, collector, engine, results) {
  console.log('\n🧪 Test 1: Simple Multi-Operation Workflow');
  console.log('='.repeat(50));
  
  const testName = 'Simple Multi-Operation Workflow';
  
  try {
    console.log('📝 Creating workflow: "Check my balance and get weather for KL"');
    
    // Plan workflow
    const userIntent = "Check my balance and get weather for Kuala Lumpur";
    const workflow = await planner.planFromIntent(userIntent);
    
    console.log(`   Generated workflow with ${workflow.metadata.totalOperations} operations`);
    console.log(`   Execution steps: ${workflow.executionPlan.steps.length}`);
    
    // Collect parameters
    const userContext = {
      location: 'Kuala Lumpur',
      authentication: { jwt: 'mock_jwt_token' },
      preferredUnits: 'metric'
    };
    
    const parameters = await collector.collectParameters(workflow, userContext);
    console.log(`   Collected ${Object.keys(parameters.collected).length} parameters`);
    
    // Execute workflow
    const startTime = Date.now();
    const executionResult = await engine.executeWorkflow(workflow, parameters.collected, {
      timeout: 15000,
      maxRetries: 1
    });
    const executionTime = Date.now() - startTime;
    
    console.log('\n📊 Execution Results:');
    console.log(`   Status: ${executionResult.status}`);
    console.log(`   Duration: ${executionTime}ms`);
    console.log(`   Total operations: ${executionResult.summary.totalOperations}`);
    console.log(`   Successful operations: ${executionResult.summary.successfulOperations}`);
    console.log(`   Steps completed: ${executionResult.summary.successfulSteps}/${executionResult.summary.totalSteps}`);
    
    // Display operation results
    if (executionResult.results.byOperation.length > 0) {
      console.log('\n✅ Operation Results:');
      executionResult.results.byOperation.forEach((result, index) => {
        const status = result.success ? '✅' : '❌';
        console.log(`   ${index + 1}. ${result.operation} (${result.domain}): ${status} ${result.duration}ms`);
        if (result.success && result.data) {
          const dataPreview = typeof result.data === 'object' 
            ? Object.keys(result.data).join(', ')
            : String(result.data).substring(0, 50);
          console.log(`      Data: {${dataPreview}}`);
        }
      });
    }
    
    // Validate results
    const workflowCompleted = executionResult.status === 'completed' || executionResult.status === 'partial_success';
    const hasOperationResults = executionResult.summary.successfulOperations > 0;
    const reasonableExecutionTime = executionTime < 20000; // 20 seconds
    
    if (workflowCompleted && hasOperationResults && reasonableExecutionTime) {
      console.log('\n✅ PASSED: Simple multi-operation workflow executed successfully');
      results.passed++;
    } else {
      console.log('\n❌ FAILED: Workflow execution incomplete or too slow');
      results.failed++;
    }
    
    results.tests.push({
      name: testName,
      passed: workflowCompleted && hasOperationResults,
      executionTime,
      operationsExecuted: executionResult.summary.successfulOperations,
      status: executionResult.status
    });
    
  } catch (error) {
    console.log(`\n❌ FAILED: ${error.message}`);
    results.failed++;
    results.tests.push({
      name: testName,
      passed: false,
      error: error.message
    });
  }
}

/**
 * Test 2: Complex Workflow with Data Flow
 */
async function testComplexWorkflowDataFlow(planner, collector, engine, results) {
  console.log('\n🧪 Test 2: Complex Workflow with Data Flow');
  console.log('='.repeat(45));
  
  const testName = 'Complex Workflow Data Flow';
  
  try {
    console.log('📝 Creating complex workflow with data dependencies');
    
    // Create a workflow that should have data flow between operations
    const userIntent = "Get my account summary, check weather for my location, and show currency exchange rates";
    const workflow = await planner.planFromIntent(userIntent);
    
    console.log(`   Complex workflow: ${workflow.metadata.totalOperations} operations across ${workflow.metadata.sequentialSteps + workflow.metadata.parallelSteps} steps`);
    
    // Prepare parameters with some data flow scenarios
    const userContext = {
      location: 'Singapore',
      authentication: { jwt: 'complex_jwt_token' },
      preferredCurrency: 'USD'
    };
    
    const parameters = await collector.collectParameters(workflow, userContext);
    
    // Execute workflow with data flow tracking
    const executionResult = await engine.executeWorkflow(workflow, parameters.collected, {
      timeout: 20000,
      maxRetries: 2,
      failFast: false
    });
    
    console.log('\n🔄 Data Flow Analysis:');
    console.log(`   Global data keys: ${Object.keys(executionResult.globalData).length}`);
    
    if (Object.keys(executionResult.globalData).length > 0) {
      console.log('   Global data collected:');
      Object.keys(executionResult.globalData).forEach(key => {
        const value = executionResult.globalData[key];
        const preview = typeof value === 'object' 
          ? `{${Object.keys(value).length} properties}`
          : String(value).substring(0, 30);
        console.log(`     - ${key}: ${preview}`);
      });
    }
    
    console.log('\n📊 Complex Execution Results:');
    console.log(`   Overall status: ${executionResult.status}`);
    console.log(`   Duration: ${executionResult.duration}ms`);
    console.log(`   Operations: ${executionResult.summary.successfulOperations}/${executionResult.summary.totalOperations} successful`);
    
    // Analyze domain coverage
    const domains = new Set();
    executionResult.results.byOperation.forEach(op => {
      if (op.domain) domains.add(op.domain);
    });
    console.log(`   Domains covered: [${Array.from(domains).join(', ')}]`);
    
    // Check for data flow between operations
    const hasGlobalData = Object.keys(executionResult.globalData).length > 0;
    const multiDomainExecution = domains.size >= 2;
    const reasonableComplexity = executionResult.summary.totalOperations >= 3;
    
    if (hasGlobalData && multiDomainExecution && reasonableComplexity) {
      console.log('\n✅ PASSED: Complex workflow with data flow executed successfully');
      results.passed++;
    } else {
      console.log('\n❌ FAILED: Complex workflow execution incomplete');
      results.failed++;
    }
    
    results.tests.push({
      name: testName,
      passed: hasGlobalData && multiDomainExecution,
      domains: Array.from(domains),
      globalDataKeys: Object.keys(executionResult.globalData).length,
      complexity: executionResult.summary.totalOperations
    });
    
  } catch (error) {
    console.log(`\n❌ FAILED: ${error.message}`);
    results.failed++;
    results.tests.push({
      name: testName,
      passed: false,
      error: error.message
    });
  }
}

/**
 * Test 3: Parallel vs Sequential Execution
 */
async function testParallelVsSequentialExecution(planner, collector, engine, results) {
  console.log('\n🧪 Test 3: Parallel vs Sequential Execution');
  console.log('='.repeat(45));
  
  const testName = 'Parallel vs Sequential Execution';
  
  try {
    console.log('⚡ Testing execution mode optimization');
    
    // Create workflow that can benefit from parallel execution
    const userIntent = "Check weather in multiple cities and get currency rates";
    const workflow = await planner.planFromIntent(userIntent);
    
    const userContext = {
      locations: ['Bangkok', 'Singapore', 'Jakarta'],
      currencies: ['USD', 'EUR', 'GBP']
    };
    
    const parameters = await collector.collectParameters(workflow, userContext);
    
    // Test sequential execution
    console.log('\n🔄 Sequential Execution Test:');
    const sequentialStart = Date.now();
    const sequentialResult = await engine.executeWorkflow(workflow, parameters.collected, {
      parallelLimit: 1, // Force sequential
      timeout: 25000
    });
    const sequentialTime = Date.now() - sequentialStart;
    
    console.log(`   Sequential time: ${sequentialTime}ms`);
    console.log(`   Operations completed: ${sequentialResult.summary.successfulOperations}`);
    
    // Test parallel execution
    console.log('\n⚡ Parallel Execution Test:');
    const parallelStart = Date.now();
    const parallelResult = await engine.executeWorkflow(workflow, parameters.collected, {
      parallelLimit: 5, // Allow parallel
      timeout: 25000
    });
    const parallelTime = Date.now() - parallelStart;
    
    console.log(`   Parallel time: ${parallelTime}ms`);
    console.log(`   Operations completed: ${parallelResult.summary.successfulOperations}`);
    
    // Analyze execution modes used
    const parallelStepsUsed = parallelResult.results.byStep.filter(step => step.parallel).length;
    const sequentialStepsUsed = parallelResult.results.byStep.filter(step => !step.parallel).length;
    
    console.log('\n📊 Execution Analysis:');
    console.log(`   Parallel steps executed: ${parallelStepsUsed}`);
    console.log(`   Sequential steps executed: ${sequentialStepsUsed}`);
    
    // Performance comparison
    const performanceImprovement = sequentialTime > 0 ? ((sequentialTime - parallelTime) / sequentialTime) * 100 : 0;
    console.log(`   Performance improvement: ${performanceImprovement.toFixed(1)}%`);
    
    // Validate execution modes
    const bothExecutionsWorked = sequentialResult.summary.successfulOperations > 0 && parallelResult.summary.successfulOperations > 0;
    const parallelizationUsed = parallelStepsUsed > 0;
    const reasonablePerformance = parallelTime <= sequentialTime + 1000; // Allow some variance
    
    if (bothExecutionsWorked && parallelizationUsed && reasonablePerformance) {
      console.log('\n✅ PASSED: Parallel and sequential execution working correctly');
      results.passed++;
    } else {
      console.log('\n❌ FAILED: Execution mode optimization not working properly');
      results.failed++;
    }
    
    results.tests.push({
      name: testName,
      passed: bothExecutionsWorked && parallelizationUsed,
      sequentialTime,
      parallelTime,
      performanceImprovement,
      parallelStepsUsed
    });
    
  } catch (error) {
    console.log(`\n❌ FAILED: ${error.message}`);
    results.failed++;
    results.tests.push({
      name: testName,
      passed: false,
      error: error.message
    });
  }
}

/**
 * Test 4: Error Handling and Recovery
 */
async function testErrorHandlingAndRecovery(planner, collector, engine, results) {
  console.log('\n🧪 Test 4: Error Handling and Recovery');
  console.log('='.repeat(40));
  
  const testName = 'Error Handling and Recovery';
  
  try {
    console.log('🚨 Testing error scenarios and recovery mechanisms');
    
    // Create workflow with potential failure points
    const userIntent = "Check balance, transfer to invalid account, and get weather";
    const workflow = await planner.planFromIntent(userIntent);
    
    // Inject parameters that will cause some operations to fail
    const problematicParameters = {
      location: 'InvalidCity12345', // This should cause weather API to fail
      jwt: 'invalid_token',
      transferAmount: -100, // Invalid amount
      recipientAccount: 'INVALID_ACCOUNT'
    };
    
    console.log('\n⚠️  Executing workflow with problematic parameters');
    
    // Execute with error-prone parameters
    const errorResult = await engine.executeWorkflow(workflow, problematicParameters, {
      timeout: 15000,
      maxRetries: 1,
      failFast: false // Continue on errors
    });
    
    console.log('\n📊 Error Handling Results:');
    console.log(`   Overall status: ${errorResult.status}`);
    console.log(`   Total operations attempted: ${errorResult.summary.totalOperations}`);
    console.log(`   Successful operations: ${errorResult.summary.successfulOperations}`);
    console.log(`   Failed operations: ${errorResult.summary.totalOperations - errorResult.summary.successfulOperations}`);
    console.log(`   Steps: ${errorResult.summary.successfulSteps} successful, ${errorResult.summary.failedSteps} failed`);
    
    // Analyze error handling
    const failedOperations = errorResult.results.byOperation.filter(op => !op.success);
    if (failedOperations.length > 0) {
      console.log('\n❌ Failed Operations:');
      failedOperations.forEach((op, index) => {
        console.log(`   ${index + 1}. ${op.operation}: ${op.error}`);
      });
    }
    
    const successfulOperations = errorResult.results.byOperation.filter(op => op.success);
    if (successfulOperations.length > 0) {
      console.log('\n✅ Successful Operations Despite Errors:');
      successfulOperations.forEach((op, index) => {
        console.log(`   ${index + 1}. ${op.operation} (${op.duration}ms)`);
      });
    }
    
    // Test recovery with better parameters
    console.log('\n🔄 Testing Recovery with Corrected Parameters:');
    const correctedParameters = {
      location: 'Singapore',
      jwt: 'valid_mock_token',
      preferredUnits: 'metric'
    };
    
    const recoveryResult = await engine.executeWorkflow(workflow, correctedParameters, {
      timeout: 15000,
      maxRetries: 2
    });
    
    console.log(`   Recovery status: ${recoveryResult.status}`);
    console.log(`   Recovery operations: ${recoveryResult.summary.successfulOperations}/${recoveryResult.summary.totalOperations}`);
    
    // Validate error handling
    const gracefulErrorHandling = errorResult.status === 'partial_success' && errorResult.summary.successfulOperations > 0;
    const recoveryWorked = recoveryResult.summary.successfulOperations > errorResult.summary.successfulOperations;
    const errorLoggingWorked = errorResult.executionLog.some(log => log.status === 'failed');
    
    if (gracefulErrorHandling && recoveryWorked) {
      console.log('\n✅ PASSED: Error handling and recovery working correctly');
      results.passed++;
    } else {
      console.log('\n❌ FAILED: Error handling or recovery not working properly');
      results.failed++;
    }
    
    results.tests.push({
      name: testName,
      passed: gracefulErrorHandling && recoveryWorked,
      errorOperations: failedOperations.length,
      recoveryImprovement: recoveryResult.summary.successfulOperations - errorResult.summary.successfulOperations,
      gracefulHandling: gracefulErrorHandling
    });
    
  } catch (error) {
    console.log(`\n❌ FAILED: ${error.message}`);
    results.failed++;
    results.tests.push({
      name: testName,
      passed: false,
      error: error.message
    });
  }
}

/**
 * Test 5: Performance and Monitoring
 */
async function testPerformanceAndMonitoring(engine, results) {
  console.log('\n🧪 Test 5: Performance and Monitoring');
  console.log('='.repeat(35));
  
  const testName = 'Performance and Monitoring';
  
  try {
    console.log('📊 Testing performance metrics and monitoring capabilities');
    
    // Get initial metrics
    const initialMetrics = engine.getPerformanceMetrics();
    console.log('\n📈 Initial Performance Metrics:');
    console.log(`   Total executions: ${initialMetrics.totalExecutions}`);
    console.log(`   Success rate: ${initialMetrics.successRate.toFixed(1)}%`);
    console.log(`   Average execution time: ${initialMetrics.averageExecutionTime.toFixed(0)}ms`);
    console.log(`   Parallelization rate: ${initialMetrics.parallelizationRate.toFixed(1)}%`);
    
    // Test workflow monitoring
    console.log('\n🔍 Testing Workflow Monitoring:');
    const activeWorkflows = engine.getActiveWorkflows();
    console.log(`   Active workflows: ${activeWorkflows.length}`);
    
    const executionHistory = engine.getExecutionHistory(5);
    console.log(`   Execution history entries: ${executionHistory.length}`);
    
    if (executionHistory.length > 0) {
      console.log('   Recent executions:');
      executionHistory.forEach((entry, index) => {
        console.log(`     ${index + 1}. ${entry.workflowName} - ${entry.status} (${entry.duration}ms)`);
      });
    }
    
    // Test performance tracking
    const finalMetrics = engine.getPerformanceMetrics();
    const metricsImproved = finalMetrics.totalExecutions > initialMetrics.totalExecutions;
    
    console.log('\n📊 Final Performance Metrics:');
    console.log(`   Total executions: ${finalMetrics.totalExecutions}`);
    console.log(`   Success rate: ${finalMetrics.successRate.toFixed(1)}%`);
    console.log(`   Average execution time: ${finalMetrics.averageExecutionTime.toFixed(0)}ms`);
    
    // Performance analysis
    console.log('\n⚡ Performance Analysis:');
    const avgTime = finalMetrics.averageExecutionTime;
    const successRate = finalMetrics.successRate;
    
    console.log(`   Average response time: ${avgTime < 5000 ? '✅ Good' : '⚠️ Needs improvement'} (${avgTime.toFixed(0)}ms)`);
    console.log(`   Success rate: ${successRate > 70 ? '✅ Good' : '⚠️ Needs improvement'} (${successRate.toFixed(1)}%)`);
    console.log(`   Parallel execution usage: ${finalMetrics.parallelizationRate.toFixed(1)}%`);
    
    // Validate monitoring capabilities
    const metricsWorking = finalMetrics.totalExecutions > 0;
    const historyTracking = executionHistory.length > 0;
    const performanceReasonable = avgTime < 10000 && successRate > 50;
    
    if (metricsWorking && historyTracking && performanceReasonable) {
      console.log('\n✅ PASSED: Performance monitoring working correctly');
      results.passed++;
    } else {
      console.log('\n❌ FAILED: Performance monitoring or metrics not working properly');
      results.failed++;
    }
    
    results.tests.push({
      name: testName,
      passed: metricsWorking && historyTracking && performanceReasonable,
      averageExecutionTime: avgTime,
      successRate: successRate,
      totalExecutions: finalMetrics.totalExecutions,
      historyEntries: executionHistory.length
    });
    
  } catch (error) {
    console.log(`\n❌ FAILED: ${error.message}`);
    results.failed++;
    results.tests.push({
      name: testName,
      passed: false,
      error: error.message
    });
  }
}

/**
 * Print test summary
 */
function printTestSummary(results) {
  console.log('\n' + '='.repeat(75));
  console.log('📊 Checkpoint 4 Test Summary');
  console.log('='.repeat(75));
  
  results.tests.forEach((test, index) => {
    console.log(`${index + 1}. ${test.name}: ${test.passed ? '✅ PASSED' : '❌ FAILED'}`);
    if (test.error) {
      console.log(`   Error: ${test.error}`);
    }
  });
  
  console.log('\n📈 Overall Results:');
  console.log(`✅ Passed: ${results.passed}`);
  console.log(`❌ Failed: ${results.failed}`);
  console.log(`📊 Success Rate: ${((results.passed / (results.passed + results.failed)) * 100).toFixed(0)}%`);
  
  if (results.passed === 5) {
    console.log('\n✅ CHECKPOINT 4 COMPLETE: Outstanding performance!');
    console.log('\n🎯 Multi-Operation Workflow Execution Successfully Implemented!');
    console.log('The system can now:');
    console.log('  ✓ Execute complex multi-operation workflows end-to-end');
    console.log('  ✓ Handle data flow and parameter sharing between operations');
    console.log('  ✓ Optimize execution with parallel and sequential processing');
    console.log('  ✓ Recover gracefully from errors and partial failures');
    console.log('  ✓ Monitor performance and track execution metrics');
    console.log('\n🚀 Ready for Checkpoint 5: Interactive Workflow Experience');
  } else if (results.passed >= 4) {
    console.log('\n⚠️ CHECKPOINT 4 MOSTLY COMPLETE: Excellent progress with minor issues');
    console.log('Review failed tests and make improvements before proceeding.');
  } else if (results.passed >= 3) {
    console.log('\n⚠️ CHECKPOINT 4 PARTIALLY COMPLETE: Good foundation with some gaps');
    console.log('Address the failing components before proceeding to next checkpoint.');
  } else {
    console.log('\n❌ CHECKPOINT 4 INCOMPLETE: Significant issues detected');
    console.log('Please review and fix the failing tests before proceeding.');
  }
}

// Run the tests
runCheckpoint4Tests().catch(console.error);