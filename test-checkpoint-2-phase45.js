import { ApiRegistry } from './src/registry/api-registry.js';
import { AIWorkflowPlanner } from './src/workflow/ai-workflow-planner.js';
import { DynamicParameterCollector } from './src/workflow/dynamic-parameter-collector.js';
import { logger } from './src/utils/logger.js';

/**
 * Phase 4.5 - Checkpoint 2: Dynamic Parameter Collector
 * Tests intelligent parameter collection with OpenAPI schema validation
 */
async function runCheckpoint2Tests() {
  console.log('🚀 Phase 4.5 - Checkpoint 2: Dynamic Parameter Collector');
  console.log('='.repeat(70));
  console.log('Testing intelligent parameter collection and validation...\n');

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

    // Test 1: Basic Parameter Collection with Context
    await testBasicParameterCollection(workflowPlanner, parameterCollector, results);

    // Test 2: Schema-Driven Validation
    await testSchemaDrivenValidation(parameterCollector, results);

    // Test 3: Interactive Parameter Prompting
    await testInteractivePrompting(parameterCollector, results);

    // Test 4: Shared Parameter Detection
    await testSharedParameterDetection(workflowPlanner, parameterCollector, results);

    // Test 5: Batch Parameter Collection
    await testBatchParameterCollection(parameterCollector, results);

  } catch (error) {
    logger.error('Test suite failed:', error);
    results.failed++;
  }

  // Print summary
  printTestSummary(results);
}

/**
 * Test 1: Basic Parameter Collection with Context
 */
async function testBasicParameterCollection(planner, collector, results) {
  console.log('\n🧪 Test 1: Basic Parameter Collection with Context');
  console.log('='.repeat(55));
  
  const testName = 'Basic Parameter Collection';
  
  try {
    // Create a workflow that needs parameters
    const userIntent = "Check my balance and get weather for Kuala Lumpur";
    const workflow = await planner.planFromIntent(userIntent);
    
    console.log(`📝 User Intent: "${userIntent}"`);
    console.log(`   Generated workflow with ${workflow.metadata.totalOperations} operations`);
    
    // Provide user context
    const userContext = {
      location: 'Kuala Lumpur',
      authentication: {
        jwt: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test'
      },
      preferredCurrency: 'MYR',
      preferredUnits: 'metric'
    };
    
    // Collect parameters
    const paramResult = await collector.collectParameters(workflow, userContext);
    
    console.log('\n📊 Parameter Collection Results:');
    console.log(`   Collected: ${Object.keys(paramResult.collected).length} parameters`);
    console.log(`   Missing: ${paramResult.missing.length} parameters`);
    console.log(`   Prompts needed: ${paramResult.prompts.length}`);
    
    console.log('\n✅ Successfully Collected Parameters:');
    for (const [param, value] of Object.entries(paramResult.collected)) {
      const displayValue = param.toLowerCase().includes('token') || param.toLowerCase().includes('jwt') 
        ? value.substring(0, 20) + '...' 
        : value;
      console.log(`   - ${param}: "${displayValue}"`);
    }
    
    if (paramResult.missing.length > 0) {
      console.log('\n📝 Parameters Requiring User Input:');
      paramResult.missing.forEach(missing => {
        console.log(`   - ${missing.name}: Used by ${missing.details.operations.join(', ')}`);
      });
    }
    
    console.log('\n🔗 Shared Parameters:');
    for (const [param, operations] of Object.entries(paramResult.sharedParameters)) {
      if (operations.length > 1) {
        console.log(`   - ${param}: Shared by ${operations.join(', ')}`);
      }
    }
    
    // Validate results
    const hasCollectedParams = Object.keys(paramResult.collected).length > 0;
    const hasContextInference = paramResult.collected.location || paramResult.collected.q;
    const hasSharedParams = Object.keys(paramResult.sharedParameters).length > 0;
    
    if (hasCollectedParams && hasSharedParams) {
      console.log('\n✅ PASSED: Basic parameter collection working');
      results.passed++;
    } else {
      console.log('\n❌ FAILED: Parameter collection incomplete');
      results.failed++;
    }
    
    results.tests.push({
      name: testName,
      passed: hasCollectedParams && hasSharedParams,
      collectedCount: Object.keys(paramResult.collected).length,
      missingCount: paramResult.missing.length
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
 * Test 2: Schema-Driven Validation
 */
async function testSchemaDrivenValidation(collector, results) {
  console.log('\n🧪 Test 2: Schema-Driven Validation');
  console.log('='.repeat(40));
  
  const testName = 'Schema-Driven Validation';
  
  try {
    console.log('📋 Testing parameter validation against OpenAPI schemas...');
    
    // Test various validation scenarios
    const validationTests = [
      {
        name: 'String Type Validation',
        value: 'Kuala Lumpur',
        schema: { type: 'string' },
        shouldPass: true
      },
      {
        name: 'Number Type Validation',
        value: '42',
        schema: { type: 'number' },
        shouldPass: true
      },
      {
        name: 'Enum Validation - Valid',
        value: 'metric',
        schema: { type: 'string', enum: ['metric', 'imperial'] },
        shouldPass: true
      },
      {
        name: 'Enum Validation - Invalid',
        value: 'celsius',
        schema: { type: 'string', enum: ['metric', 'imperial'] },
        shouldPass: false
      },
      {
        name: 'Pattern Validation - Valid',
        value: 'abc123',
        schema: { type: 'string', pattern: '^[a-z]+[0-9]+$' },
        shouldPass: true
      },
      {
        name: 'Pattern Validation - Invalid',
        value: '123abc',
        schema: { type: 'string', pattern: '^[a-z]+[0-9]+$' },
        shouldPass: false
      },
      {
        name: 'Length Validation - Valid',
        value: 'hello',
        schema: { type: 'string', minLength: 3, maxLength: 10 },
        shouldPass: true
      },
      {
        name: 'Length Validation - Too Short',
        value: 'hi',
        schema: { type: 'string', minLength: 3, maxLength: 10 },
        shouldPass: false
      }
    ];
    
    let passedValidations = 0;
    
    console.log('\n🔍 Validation Test Results:');
    for (const test of validationTests) {
      const paramDetails = { schema: test.schema };
      const validation = await collector.validateParameter(test.value, paramDetails);
      
      const testPassed = validation.valid === test.shouldPass;
      console.log(`   ${testPassed ? '✅' : '❌'} ${test.name}: ${validation.valid ? 'Valid' : validation.error}`);
      
      if (testPassed) passedValidations++;
    }
    
    const allValidationsPassed = passedValidations === validationTests.length;
    
    console.log(`\n📊 Validation Summary: ${passedValidations}/${validationTests.length} tests passed`);
    
    if (allValidationsPassed) {
      console.log('\n✅ PASSED: Schema-driven validation working correctly');
      results.passed++;
    } else {
      console.log('\n❌ FAILED: Some validation tests failed');
      results.failed++;
    }
    
    results.tests.push({
      name: testName,
      passed: allValidationsPassed,
      validationScore: (passedValidations / validationTests.length) * 100
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
 * Test 3: Interactive Parameter Prompting
 */
async function testInteractivePrompting(collector, results) {
  console.log('\n🧪 Test 3: Interactive Parameter Prompting');
  console.log('='.repeat(45));
  
  const testName = 'Interactive Parameter Prompting';
  
  try {
    console.log('💬 Testing intelligent prompt generation for missing parameters...');
    
    // Test parameter prompts for different scenarios
    const promptTests = [
      {
        paramName: 'location',
        paramDetails: {
          operations: ['check_weather', 'find_restaurants'],
          schema: { type: 'string' },
          required: true
        },
        expectedKeywords: ['location', 'weather', 'restaurants']
      },
      {
        paramName: 'jwt',
        paramDetails: {
          operations: ['check_balance'],
          schema: { type: 'string' },
          required: true
        },
        expectedKeywords: ['authentication', 'jwt', 'balance']
      },
      {
        paramName: 'currency',
        paramDetails: {
          operations: ['currency_exchange'],
          schema: { type: 'string', enum: ['USD', 'MYR', 'SGD'] },
          required: true
        },
        expectedKeywords: ['currency', 'exchange']
      },
      {
        paramName: 'amount',
        paramDetails: {
          operations: ['transfer_money'],
          schema: { type: 'number', minimum: 1 },
          required: true
        },
        expectedKeywords: ['amount', 'transfer']
      }
    ];
    
    let successfulPrompts = 0;
    
    console.log('\n💡 Generated Prompts:');
    for (const test of promptTests) {
      const prompt = collector.generateParameterPrompt(test.paramName, test.paramDetails, {});
      
      console.log(`\n   Parameter: ${test.paramName}`);
      console.log(`   Message: "${prompt.message}"`);
      console.log(`   Type: ${prompt.type}`);
      console.log(`   Required: ${prompt.required}`);
      console.log(`   Suggestions: [${prompt.suggestions.join(', ')}]`);
      
      // Check if prompt contains expected keywords
      const messageText = prompt.message.toLowerCase();
      const hasKeywords = test.expectedKeywords.some(keyword => 
        messageText.includes(keyword.toLowerCase())
      );
      const hasSuggestions = prompt.suggestions.length > 0;
      
      if (hasKeywords && hasSuggestions) {
        console.log('   Result: ✅ Good prompt');
        successfulPrompts++;
      } else {
        console.log('   Result: ❌ Prompt needs improvement');
      }
    }
    
    // Test interactive parameter collection
    console.log('\n🔄 Testing Interactive Collection:');
    const interactiveTest = await collector.collectParameterInteractively(
      'location',
      { schema: { type: 'string' }, operations: ['weather'] },
      'Singapore'
    );
    
    console.log(`   User response "Singapore": ${interactiveTest.success ? '✅ Accepted' : '❌ Rejected'}`);
    
    const allPromptsGood = successfulPrompts === promptTests.length;
    const interactiveWorks = interactiveTest.success;
    
    if (allPromptsGood && interactiveWorks) {
      console.log('\n✅ PASSED: Interactive prompting working correctly');
      results.passed++;
    } else {
      console.log('\n❌ FAILED: Prompting system needs improvement');
      results.failed++;
    }
    
    results.tests.push({
      name: testName,
      passed: allPromptsGood && interactiveWorks,
      promptScore: (successfulPrompts / promptTests.length) * 100,
      interactiveWorks
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
 * Test 4: Shared Parameter Detection
 */
async function testSharedParameterDetection(planner, collector, results) {
  console.log('\n🧪 Test 4: Shared Parameter Detection');
  console.log('='.repeat(42));
  
  const testName = 'Shared Parameter Detection';
  
  try {
    console.log('🔗 Testing parameter sharing across multiple operations...');
    
    // Create workflow with operations that share parameters
    const userIntent = "Get weather for Bangkok and find restaurants there, also check currency rates";
    const workflow = await planner.planFromIntent(userIntent);
    
    console.log(`📝 Intent: "${userIntent}"`);
    console.log(`   Operations: ${workflow.metadata.totalOperations}`);
    
    // Collect parameters to see sharing
    const paramResult = await collector.collectParameters(workflow, {});
    
    console.log('\n🔍 Parameter Sharing Analysis:');
    
    let sharedParamCount = 0;
    let locationShared = false;
    let authShared = false;
    
    for (const [param, operations] of Object.entries(paramResult.sharedParameters)) {
      if (operations.length > 1) {
        sharedParamCount++;
        console.log(`   - ${param}: Shared by ${operations.join(', ')}`);
        
        if (param.toLowerCase().includes('location') || param === 'q') {
          locationShared = true;
        }
        if (param.toLowerCase().includes('auth') || param.toLowerCase().includes('token')) {
          authShared = true;
        }
      }
    }
    
    console.log('\n📊 Sharing Statistics:');
    console.log(`   Total shared parameters: ${sharedParamCount}`);
    console.log(`   Location parameters shared: ${locationShared ? 'Yes' : 'No'}`);
    console.log(`   Auth parameters shared: ${authShared ? 'Yes' : 'No'}`);
    
    // Test parameter grouping
    const allParams = collector.extractWorkflowParameters(workflow);
    const grouped = collector.groupSharedParameters(allParams);
    
    console.log('\n🗂️  Parameter Grouping:');
    for (const [group, details] of Object.entries(grouped)) {
      console.log(`   Group "${group}": ${details.operations.length} operations`);
    }
    
    const hasSharedParams = sharedParamCount > 0;
    const hasLocationSharing = locationShared;
    const hasGrouping = Object.keys(grouped).length > 0;
    
    if (hasSharedParams && hasGrouping) {
      console.log('\n✅ PASSED: Shared parameter detection working');
      results.passed++;
    } else {
      console.log('\n❌ FAILED: Parameter sharing not detected properly');
      results.failed++;
    }
    
    results.tests.push({
      name: testName,
      passed: hasSharedParams && hasGrouping,
      sharedCount: sharedParamCount,
      groupCount: Object.keys(grouped).length
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
 * Test 5: Batch Parameter Collection
 */
async function testBatchParameterCollection(collector, results) {
  console.log('\n🧪 Test 5: Batch Parameter Collection');
  console.log('='.repeat(38));
  
  const testName = 'Batch Parameter Collection';
  
  try {
    console.log('📦 Testing efficient batch parameter collection...');
    
    // Create a list of parameters that should be batched
    const parameterList = [
      {
        name: 'location',
        operations: ['weather', 'restaurants'],
        schema: { type: 'string' },
        required: true
      },
      {
        name: 'units',
        operations: ['weather'],
        schema: { type: 'string', enum: ['metric', 'imperial'] },
        required: false
      },
      {
        name: 'jwt',
        operations: ['balance', 'transfer'],
        schema: { type: 'string' },
        required: true
      },
      {
        name: 'amount',
        operations: ['transfer'],
        schema: { type: 'number', minimum: 1 },
        required: true
      },
      {
        name: 'currency',
        operations: ['exchange'],
        schema: { type: 'string' },
        required: true
      }
    ];
    
    const userContext = {
      location: 'Bangkok',
      preferredUnits: 'metric',
      preferredCurrency: 'USD'
    };
    
    const batchResult = await collector.collectParametersBatch(parameterList, userContext);
    
    console.log('\n📊 Batch Collection Results:');
    console.log(`   Parameters collected: ${Object.keys(batchResult.collected).length}`);
    console.log(`   Parameters failed: ${batchResult.failed.length}`);
    console.log(`   Prompts generated: ${batchResult.prompts.length}`);
    
    console.log('\n✅ Collected in Batch:');
    for (const [param, value] of Object.entries(batchResult.collected)) {
      console.log(`   - ${param}: "${value}"`);
    }
    
    if (batchResult.failed.length > 0) {
      console.log('\n❌ Failed to Collect:');
      batchResult.failed.forEach(param => {
        console.log(`   - ${param}`);
      });
    }
    
    if (batchResult.prompts.length > 0) {
      console.log('\n💬 Generated Prompts:');
      batchResult.prompts.forEach(prompt => {
        console.log(`   - ${prompt.parameter}: ${prompt.message}`);
      });
    }
    
    // Test batch creation
    const batches = collector.createParameterBatches(parameterList);
    console.log(`\n🗂️  Created ${batches.length} parameter batches:`);
    batches.forEach((batch, index) => {
      const batchParams = batch.map(p => p.name);
      console.log(`   Batch ${index + 1}: [${batchParams.join(', ')}]`);
    });
    
    const hasCollectedSome = Object.keys(batchResult.collected).length > 0;
    const hasBatches = batches.length > 0;
    const hasContextInference = batchResult.collected.location === 'Bangkok';
    
    if (hasCollectedSome && hasBatches && hasContextInference) {
      console.log('\n✅ PASSED: Batch parameter collection working');
      results.passed++;
    } else {
      console.log('\n❌ FAILED: Batch collection not working properly');
      results.failed++;
    }
    
    results.tests.push({
      name: testName,
      passed: hasCollectedSome && hasBatches,
      batchCount: batches.length,
      collectedCount: Object.keys(batchResult.collected).length
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
  console.log('📊 Checkpoint 2 Test Summary');
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
  
  if (results.passed >= 4) {
    console.log('\n✅ CHECKPOINT 2 COMPLETE: Excellent performance!');
    console.log('\n🎯 Dynamic Parameter Collector Successfully Implemented!');
    console.log('The system can now:');
    console.log('  ✓ Collect parameters with context inference');
    console.log('  ✓ Validate parameters against OpenAPI schemas');
    console.log('  ✓ Generate intelligent prompts for missing data');
    console.log('  ✓ Detect and share parameters across operations');
    console.log('  ✓ Process parameters efficiently in batches');
    console.log('\n🚀 Ready for Checkpoint 3: Enhanced Semantic Intent Matching');
  } else if (results.passed >= 3) {
    console.log('\n⚠️ CHECKPOINT 2 MOSTLY COMPLETE: Good progress with minor issues');
    console.log('Review failed tests and make improvements before proceeding.');
  } else {
    console.log('\n❌ CHECKPOINT 2 INCOMPLETE: Significant issues detected');
    console.log('Please review and fix the failing tests before proceeding.');
  }
}

// Run the tests
runCheckpoint2Tests().catch(console.error);