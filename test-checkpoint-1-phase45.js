import { ApiRegistry } from './src/registry/api-registry.js';
import { AIWorkflowPlanner } from './src/workflow/ai-workflow-planner.js';
import { logger } from './src/utils/logger.js';

/**
 * Phase 4.5 - Checkpoint 1: AI Workflow Planner Foundation
 * Tests complex intent decomposition and workflow planning
 */
async function runCheckpoint1Tests() {
  console.log('🚀 Phase 4.5 - Checkpoint 1: AI Workflow Planner Foundation');
  console.log('='.repeat(70));
  console.log('Testing AI-powered workflow planning for complex intents...\n');

  const results = {
    passed: 0,
    failed: 0,
    tests: []
  };

  try {
    // Initialize API Registry
    const apiRegistry = new ApiRegistry();
    await apiRegistry.initialize();
    
    // Create AI Workflow Planner
    const workflowPlanner = new AIWorkflowPlanner(apiRegistry);

    // Test 1: Simple Multi-Domain Intent
    await testSimpleMultiDomain(workflowPlanner, results);

    // Test 2: Complex Banking + Weather Intent
    await testComplexBankingWeather(workflowPlanner, results);

    // Test 3: Transfer + Location Services Intent
    await testTransferLocation(workflowPlanner, results);

    // Test 4: Multi-Step Workflow with Dependencies
    await testMultiStepDependencies(workflowPlanner, results);

    // Test 5: Ambiguous Intent Resolution
    await testAmbiguousIntent(workflowPlanner, results);

  } catch (error) {
    logger.error('Test suite failed:', error);
    results.failed++;
  }

  // Print summary
  printTestSummary(results);
}

/**
 * Test 1: Simple Multi-Domain Intent
 */
async function testSimpleMultiDomain(planner, results) {
  console.log('\n🧪 Test 1: Simple Multi-Domain Intent');
  console.log('='.repeat(50));
  
  const testName = 'Simple Multi-Domain Intent';
  const userIntent = "Check my balance and get weather for my location";
  
  try {
    console.log(`📝 User Intent: "${userIntent}"`);
    
    const workflow = await planner.planFromIntent(userIntent, {
      location: 'Kuala Lumpur'
    });
    
    console.log('\n📊 Workflow Analysis:');
    console.log(`   Workflow ID: ${workflow.id}`);
    console.log(`   Total Operations: ${workflow.metadata.totalOperations}`);
    console.log(`   Parallel Steps: ${workflow.metadata.parallelSteps}`);
    console.log(`   Sequential Steps: ${workflow.metadata.sequentialSteps}`);
    console.log(`   Estimated Duration: ${workflow.estimatedDuration}ms`);
    
    console.log('\n🎯 Decomposed Sub-Goals:');
    workflow.executionPlan.steps.forEach((step, index) => {
      console.log(`   Step ${index + 1} (${step.parallel ? 'Parallel' : 'Sequential'}):`);
      step.operations.forEach(op => {
        console.log(`     - ${op.subGoal} (${op.domain}) [${op.apiId}]`);
        console.log(`       Confidence: ${(op.confidence * 100).toFixed(0)}%`);
      });
    });
    
    console.log('\n🔗 Parameter Dependencies:');
    const params = workflow.parameters;
    params.forEach(param => {
      console.log(`   - ${param.name} (${param.type}): Used by ${param.operations.join(', ')}`);
    });
    
    // Validate results
    const hasBalanceCheck = workflow.executionPlan.steps.some(step => 
      step.operations.some(op => op.subGoal.includes('balance'))
    );
    const hasWeatherCheck = workflow.executionPlan.steps.some(step => 
      step.operations.some(op => op.subGoal.includes('weather'))
    );
    
    if (hasBalanceCheck && hasWeatherCheck && workflow.metadata.totalOperations >= 2) {
      console.log('\n✅ PASSED: Multi-domain intent correctly decomposed');
      results.passed++;
    } else {
      console.log('\n❌ FAILED: Multi-domain intent not properly handled');
      results.failed++;
    }
    
    results.tests.push({
      name: testName,
      passed: hasBalanceCheck && hasWeatherCheck,
      details: workflow.metadata
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
 * Test 2: Complex Banking + Weather Intent
 */
async function testComplexBankingWeather(planner, results) {
  console.log('\n🧪 Test 2: Complex Banking + Weather Intent');
  console.log('='.repeat(50));
  
  const testName = 'Complex Banking + Weather';
  const userIntent = "Get my account summary, check if it's raining in Bangkok, and show USD to MYR exchange rate";
  
  try {
    console.log(`📝 User Intent: "${userIntent}"`);
    
    const workflow = await planner.planFromIntent(userIntent);
    
    console.log('\n📊 Workflow Execution Plan:');
    workflow.executionPlan.steps.forEach((step, index) => {
      console.log(`\n   Step ${index + 1}:`);
      console.log(`   Execution: ${step.parallel ? '⚡ Parallel' : '📝 Sequential'}`);
      console.log(`   Operations:`);
      step.operations.forEach(op => {
        console.log(`     - ${op.subGoal}`);
        console.log(`       API: ${op.apiId}`);
        console.log(`       Operation: ${op.operation.operationId || 'dynamic'}`);
        console.log(`       Parameters: ${op.requiredParams.length}`);
      });
    });
    
    console.log('\n⚡ Performance Optimizations:');
    if (workflow.optimizations.caching.length > 0) {
      console.log('   Caching Opportunities:');
      workflow.optimizations.caching.forEach(cache => {
        console.log(`     - ${cache.operation}: TTL ${cache.ttl}ms`);
      });
    }
    
    if (workflow.optimizations.parallelization.length > 0) {
      console.log('   Parallelization Suggestions:');
      workflow.optimizations.parallelization.forEach(p => {
        console.log(`     - Steps ${p.steps.join(' & ')}: ${p.reason}`);
      });
    }
    
    // Validate complex workflow
    const operations = workflow.executionPlan.steps.flatMap(s => s.operations);
    const hasAccountSummary = operations.some(op => op.subGoal.includes('summary'));
    const hasWeather = operations.some(op => op.domain === 'weather');
    const hasCurrency = operations.some(op => op.subGoal.includes('currency'));
    
    if (hasAccountSummary && hasWeather && hasCurrency && operations.length >= 3) {
      console.log('\n✅ PASSED: Complex intent successfully planned');
      results.passed++;
    } else {
      console.log('\n❌ FAILED: Complex intent planning incomplete');
      results.failed++;
    }
    
    results.tests.push({
      name: testName,
      passed: hasAccountSummary && hasWeather && hasCurrency,
      operationCount: operations.length
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
 * Test 3: Transfer + Location Services Intent
 */
async function testTransferLocation(planner, results) {
  console.log('\n🧪 Test 3: Transfer + Location Services Intent');
  console.log('='.repeat(50));
  
  const testName = 'Transfer + Location Services';
  const userIntent = "Transfer $500 to John and find nearby ATMs for cash withdrawal";
  
  try {
    console.log(`📝 User Intent: "${userIntent}"`);
    
    const workflow = await planner.planFromIntent(userIntent, {
      authentication: { jwt: 'sample_token' }
    });
    
    console.log('\n🔐 Security & Authentication:');
    const authParams = workflow.parameters.filter(p => 
      p.name.toLowerCase().includes('auth') || 
      p.name.toLowerCase().includes('token')
    );
    authParams.forEach(param => {
      console.log(`   - ${param.name}: Required for ${param.operations.join(', ')}`);
    });
    
    console.log('\n📍 Location Dependencies:');
    const locationParams = workflow.parameters.filter(p => 
      p.name.toLowerCase().includes('location') || 
      p.name.toLowerCase().includes('lat')
    );
    locationParams.forEach(param => {
      console.log(`   - ${param.name}: Shared by ${param.operations.join(', ')}`);
    });
    
    console.log('\n🚨 Identified Bottlenecks:');
    if (workflow.performanceHints.bottlenecks.length > 0) {
      workflow.performanceHints.bottlenecks.forEach(bottleneck => {
        console.log(`   - Type: ${bottleneck.type}`);
        console.log(`     Operations: ${bottleneck.operations || bottleneck.operation}`);
        console.log(`     Mitigation: ${bottleneck.mitigation}`);
      });
    } else {
      console.log('   No bottlenecks identified');
    }
    
    // Validate transfer and location workflow
    const operations = workflow.executionPlan.steps.flatMap(s => s.operations);
    const hasTransfer = operations.some(op => op.subGoal.includes('transfer'));
    const hasATMSearch = operations.some(op => op.subGoal.includes('atm'));
    const hasProperSequencing = workflow.executionPlan.steps.length >= 2;
    
    if (hasTransfer && hasATMSearch && hasProperSequencing) {
      console.log('\n✅ PASSED: Transfer + Location workflow correctly planned');
      results.passed++;
    } else {
      console.log('\n❌ FAILED: Transfer + Location workflow incomplete');
      results.failed++;
    }
    
    results.tests.push({
      name: testName,
      passed: hasTransfer && hasATMSearch,
      sequencing: hasProperSequencing
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
 * Test 4: Multi-Step Workflow with Dependencies
 */
async function testMultiStepDependencies(planner, results) {
  console.log('\n🧪 Test 4: Multi-Step Workflow with Dependencies');
  console.log('='.repeat(50));
  
  const testName = 'Multi-Step Dependencies';
  const userIntent = "Check weather at my location, if it's sunny find outdoor restaurants nearby, also check my balance";
  
  try {
    console.log(`📝 User Intent: "${userIntent}"`);
    console.log('   (Complex workflow with conditional logic)');
    
    const workflow = await planner.planFromIntent(userIntent);
    
    console.log('\n🔄 Workflow Dependencies:');
    console.log('   Parameter Flow:');
    // Show how parameters flow between operations
    const steps = workflow.executionPlan.steps;
    steps.forEach((step, index) => {
      if (index < steps.length - 1) {
        const currentOps = step.operations.map(op => op.subGoal);
        const nextOps = steps[index + 1].operations.map(op => op.subGoal);
        console.log(`     Step ${index + 1} [${currentOps.join(', ')}]`);
        console.log(`        ↓`);
        console.log(`     Step ${index + 2} [${nextOps.join(', ')}]`);
      }
    });
    
    console.log('\n📊 Execution Strategy:');
    console.log(`   Total Steps: ${workflow.executionPlan.steps.length}`);
    console.log(`   Critical Path Length: ${workflow.performanceHints.criticalPath.length}`);
    console.log(`   Estimated Latency: ${workflow.performanceHints.estimatedLatency}ms`);
    
    console.log('\n🎯 Workflow Intelligence:');
    const hasWeatherFirst = workflow.executionPlan.steps[0].operations.some(
      op => op.domain === 'weather'
    );
    const hasLocationDependency = workflow.executionPlan.steps.some(
      step => step.operations.some(op => op.subGoal.includes('restaurant'))
    );
    
    console.log(`   Weather Check First: ${hasWeatherFirst ? '✓' : '✗'}`);
    console.log(`   Location Dependency Handled: ${hasLocationDependency ? '✓' : '✗'}`);
    console.log(`   Parallel Balance Check: ${
      workflow.executionPlan.steps.some(s => s.parallel && 
        s.operations.some(op => op.subGoal.includes('balance'))
      ) ? '✓' : '✗'
    }`);
    
    // Validate dependency handling
    if (hasWeatherFirst && hasLocationDependency && workflow.executionPlan.steps.length >= 2) {
      console.log('\n✅ PASSED: Complex dependencies correctly handled');
      results.passed++;
    } else {
      console.log('\n❌ FAILED: Dependency handling incomplete');
      results.failed++;
    }
    
    results.tests.push({
      name: testName,
      passed: hasWeatherFirst && hasLocationDependency,
      steps: workflow.executionPlan.steps.length
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
 * Test 5: Ambiguous Intent Resolution
 */
async function testAmbiguousIntent(planner, results) {
  console.log('\n🧪 Test 5: Ambiguous Intent Resolution');
  console.log('='.repeat(50));
  
  const testName = 'Ambiguous Intent Resolution';
  const userIntent = "I need money and food";
  
  try {
    console.log(`📝 User Intent: "${userIntent}"`);
    console.log('   (Ambiguous intent requiring interpretation)');
    
    const workflow = await planner.planFromIntent(userIntent);
    
    console.log('\n🤔 Intent Interpretation:');
    const interpretedGoals = workflow.executionPlan.steps.flatMap(
      s => s.operations.map(op => ({
        goal: op.subGoal,
        domain: op.domain,
        confidence: op.confidence
      }))
    );
    
    interpretedGoals.forEach((goal, index) => {
      console.log(`   ${index + 1}. Interpreted as: ${goal.goal} (${goal.domain})`);
      console.log(`      Confidence: ${(goal.confidence * 100).toFixed(0)}%`);
    });
    
    console.log('\n💡 Fuzzy Matching Results:');
    const lowConfidenceOps = interpretedGoals.filter(g => g.confidence < 0.8);
    if (lowConfidenceOps.length > 0) {
      console.log('   Low confidence operations detected:');
      lowConfidenceOps.forEach(op => {
        console.log(`     - ${op.goal}: ${(op.confidence * 100).toFixed(0)}% confidence`);
      });
    } else {
      console.log('   All operations matched with high confidence');
    }
    
    console.log('\n🎯 Resolved Workflow:');
    console.log(`   "money" → ${
      interpretedGoals.find(g => g.domain === 'banking')?.goal || 'not resolved'
    }`);
    console.log(`   "food" → ${
      interpretedGoals.find(g => g.domain === 'location')?.goal || 'not resolved'
    }`);
    
    // Validate ambiguous intent handling
    const hasBankingOp = interpretedGoals.some(g => g.domain === 'banking');
    const hasLocationOp = interpretedGoals.some(g => g.domain === 'location');
    
    if (hasBankingOp && hasLocationOp) {
      console.log('\n✅ PASSED: Ambiguous intent successfully resolved');
      results.passed++;
    } else {
      console.log('\n❌ FAILED: Ambiguous intent not properly resolved');
      results.failed++;
    }
    
    results.tests.push({
      name: testName,
      passed: hasBankingOp && hasLocationOp,
      interpretations: interpretedGoals.length
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
  console.log('\n' + '='.repeat(70));
  console.log('📊 Checkpoint 1 Test Summary');
  console.log('='.repeat(70));
  
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
  
  if (results.passed === 5 && results.failed === 0) {
    console.log('\n✅ CHECKPOINT 1 COMPLETE: All tests passed!');
    console.log('\n🎯 AI Workflow Planner Foundation Successfully Implemented!');
    console.log('The system can now:');
    console.log('  ✓ Decompose complex multi-domain intents');
    console.log('  ✓ Plan optimal execution sequences');
    console.log('  ✓ Identify parameter dependencies');
    console.log('  ✓ Optimize workflows for performance');
    console.log('  ✓ Handle ambiguous user requests');
    console.log('\n🚀 Ready for Checkpoint 2: Dynamic Parameter Collector');
  } else {
    console.log('\n❌ CHECKPOINT 1 INCOMPLETE: Some tests failed');
    console.log('Please review and fix the failing tests before proceeding.');
  }
}

// Run the tests
runCheckpoint1Tests().catch(console.error);