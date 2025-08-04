#!/usr/bin/env node

/**
 * Phase 4.9 Checkpoint 1 Test: AI Workflow Composer Engine
 * Tests the Claude-powered intelligent workflow composition system
 */

import { logger } from './src/utils/logger.js';
import { ApiRegistry } from './src/registry/api-registry.js';
import { ClaudeWorkflowComposer } from './src/composition/claude-workflow-composer.js';
import { ApiCatalogProvider } from './src/composition/api-catalog-provider.js';
import { WorkflowPlanParser } from './src/composition/workflow-plan-parser.js';
import { CompositionCoordinator } from './src/composition/composition-coordinator.js';

/**
 * Test Suite for Phase 4.9 Checkpoint 1
 */
class Phase49Checkpoint1Test {
  constructor() {
    this.testResults = [];
    this.registry = null;
    this.catalogProvider = null;
    this.workflowComposer = null;
    this.planParser = null;
    this.coordinator = null;
  }

  async runAllTests() {
    console.log('\n🚀 Phase 4.9 Checkpoint 1: AI Workflow Composer Engine Tests\n');
    
    try {
      // Initialize components
      await this.initializeComponents();
      
      // Run test suite
      await this.testApiCatalogProvider();
      await this.testClaudeWorkflowComposer();
      await this.testWorkflowPlanParser();
      await this.testCompositionCoordinator();
      await this.testComplexWorkflowComposition();
      
      // Generate results
      this.generateTestReport();
      
    } catch (error) {
      console.error('❌ Test suite failed:', error.message);
      process.exit(1);
    }
  }

  async initializeComponents() {
    console.log('📋 Initializing Phase 4.9 Checkpoint 1 components...');
    
    try {
      // Initialize API Registry
      this.registry = new ApiRegistry();
      await this.registry.initialize();
      console.log(`✅ API Registry loaded with ${this.registry.getOperationCount()} operations`);
      
      // Initialize API Catalog Provider
      this.catalogProvider = new ApiCatalogProvider(this.registry);
      console.log('✅ API Catalog Provider initialized');
      
      // Initialize Claude Workflow Composer (mock for testing)
      this.workflowComposer = new ClaudeWorkflowComposer();
      console.log('✅ Claude Workflow Composer initialized');
      
      // Initialize Workflow Plan Parser
      this.planParser = new WorkflowPlanParser();
      console.log('✅ Workflow Plan Parser initialized');
      
      // Initialize Composition Coordinator
      this.coordinator = new CompositionCoordinator(
        this.catalogProvider,
        this.workflowComposer,
        this.planParser
      );
      console.log('✅ Composition Coordinator initialized');
      
    } catch (error) {
      console.error('❌ Component initialization failed:', error.message);
      throw error;
    }
  }

  async testApiCatalogProvider() {
    console.log('\n🧪 Testing API Catalog Provider...');
    
    try {
      // Test 1: Get API capabilities catalog
      const catalog = await this.catalogProvider.getApiCapabilities();
      
      this.assert(catalog && typeof catalog === 'object', 'API catalog should be an object');
      this.assert(catalog.domains && Array.isArray(catalog.domains), 'Catalog should have domains array');
      this.assert(catalog.operations && Array.isArray(catalog.operations), 'Catalog should have operations array');
      
      console.log(`✅ API Catalog generated with ${catalog.operations.length} operations across ${catalog.domains.length} domains`);
      
      // Test 2: Get capabilities for specific domains
      const bankingCapabilities = await this.catalogProvider.getDomainCapabilities('banking');
      this.assert(bankingCapabilities && bankingCapabilities.operations, 'Banking capabilities should exist');
      
      console.log(`✅ Banking domain has ${bankingCapabilities.operations.length} operations`);
      
      // Test 3: Generate capability summary for Claude
      const claudeSummary = await this.catalogProvider.generateClaudeSummary();
      this.assert(typeof claudeSummary === 'string' && claudeSummary.length > 0, 'Claude summary should be a non-empty string');
      
      console.log(`✅ Claude summary generated (${claudeSummary.length} characters)`);
      
      this.recordTest('API Catalog Provider', 'PASS', 'All catalog generation tests passed');
      
    } catch (error) {
      this.recordTest('API Catalog Provider', 'FAIL', error.message);
      throw error;
    }
  }

  async testClaudeWorkflowComposer() {
    console.log('\n🧪 Testing Claude Workflow Composer...');
    
    try {
      // Test 1: Simple intent analysis
      const simpleIntent = "What's my account balance?";
      const simpleAnalysis = await this.workflowComposer.analyzeIntent(simpleIntent);
      
      this.assert(simpleAnalysis && simpleAnalysis.complexity, 'Intent analysis should include complexity');
      this.assert(simpleAnalysis.apis && Array.isArray(simpleAnalysis.apis), 'Analysis should identify required APIs');
      
      console.log(`✅ Simple intent analysis: ${simpleAnalysis.complexity} complexity, ${simpleAnalysis.apis.length} APIs identified`);
      
      // Test 2: Complex multi-API intent
      const complexIntent = "Show me my account balance with today's weather and currency rates for USD";
      const complexAnalysis = await this.workflowComposer.analyzeIntent(complexIntent);
      
      this.assert(complexAnalysis.complexity === 'multi_api', 'Complex intent should be identified as multi-API');
      this.assert(complexAnalysis.apis.length >= 3, 'Complex intent should require 3+ APIs');
      
      console.log(`✅ Complex intent analysis: ${complexAnalysis.apis.length} APIs identified`);
      
      // Test 3: Generate workflow plan
      const apiCatalog = await this.catalogProvider.getApiCapabilities();
      const workflowPlan = await this.workflowComposer.generateWorkflowPlan(complexIntent, apiCatalog);
      
      this.assert(workflowPlan && workflowPlan.steps, 'Workflow plan should have steps');
      this.assert(Array.isArray(workflowPlan.steps) && workflowPlan.steps.length > 0, 'Plan should have multiple steps');
      
      console.log(`✅ Workflow plan generated with ${workflowPlan.steps.length} steps`);
      
      this.recordTest('Claude Workflow Composer', 'PASS', 'All workflow composition tests passed');
      
    } catch (error) {
      this.recordTest('Claude Workflow Composer', 'FAIL', error.message);
      throw error;
    }
  }

  async testWorkflowPlanParser() {
    console.log('\n🧪 Testing Workflow Plan Parser...');
    
    try {
      // Test 1: Parse simple workflow plan
      const samplePlan = {
        intent: "Get account balance and weather",
        steps: [
          {
            id: "step1",
            operation: "get_banking_getBalance",
            description: "Get user's account balance",
            parameters: { isFirstLoad: "true" },
            dependencies: []
          },
          {
            id: "step2", 
            operation: "get_weather_current",
            description: "Get current weather",
            parameters: { city: "Kuala Lumpur" },
            dependencies: []
          }
        ],
        dataFlow: [],
        expectedOutput: "Account balance and current weather information"
      };
      
      const parsedPlan = await this.planParser.parsePlan(samplePlan);
      
      this.assert(parsedPlan && parsedPlan.isValid, 'Parsed plan should be valid');
      this.assert(parsedPlan.executableSteps && parsedPlan.executableSteps.length === 2, 'Should have 2 executable steps');
      
      console.log(`✅ Simple workflow plan parsed successfully`);
      
      // Test 2: Parse complex workflow with data dependencies
      const complexPlan = {
        intent: "Financial overview with weather considerations",
        steps: [
          {
            id: "step1",
            operation: "get_banking_getBalance", 
            description: "Get account balance",
            parameters: { isFirstLoad: "true" },
            dependencies: []
          },
          {
            id: "step2",
            operation: "get_weather_current",
            description: "Get current weather", 
            parameters: { city: "Kuala Lumpur" },
            dependencies: []
          },
          {
            id: "step3",
            operation: "synthesize_financial_weather",
            description: "Combine financial and weather data for insights",
            parameters: {},
            dependencies: ["step1", "step2"]
          }
        ],
        dataFlow: [
          { from: "step1", to: "step3", field: "balance" },
          { from: "step2", to: "step3", field: "weather" }
        ]
      };
      
      const complexParsed = await this.planParser.parsePlan(complexPlan);
      
      this.assert(complexParsed.isValid, 'Complex plan should be valid');
      this.assert(complexParsed.executionOrder && complexParsed.executionOrder.length > 0, 'Should have execution order');
      
      console.log(`✅ Complex workflow plan with dependencies parsed successfully`);
      
      // Test 3: Validate plan feasibility
      const apiCatalog = await this.catalogProvider.getApiCapabilities();
      const feasibility = await this.planParser.validateFeasibility(samplePlan, apiCatalog);
      
      this.assert(feasibility && typeof feasibility.feasible === 'boolean', 'Feasibility check should return boolean result');
      
      console.log(`✅ Plan feasibility validation: ${feasibility.feasible ? 'Feasible' : 'Not feasible'}`);
      
      this.recordTest('Workflow Plan Parser', 'PASS', 'All plan parsing tests passed');
      
    } catch (error) {
      this.recordTest('Workflow Plan Parser', 'FAIL', error.message);
      throw error;
    }
  }

  async testCompositionCoordinator() {
    console.log('\n🧪 Testing Composition Coordinator...');
    
    try {
      // Test 1: End-to-end workflow composition
      const userRequest = "I want to see my account balance and today's weather";
      const composition = await this.coordinator.composeWorkflow(userRequest);
      
      this.assert(composition && composition.success, 'Workflow composition should succeed');
      this.assert(composition.workflowPlan && composition.workflowPlan.steps, 'Should generate workflow plan with steps');
      
      console.log(`✅ Workflow composition successful with ${composition.workflowPlan.steps.length} steps`);
      
      // Test 2: Complex multi-domain request
      const complexRequest = "Show me my financial overview with weather considerations and currency rates";
      const complexComposition = await this.coordinator.composeWorkflow(complexRequest);
      
      this.assert(complexComposition.success, 'Complex workflow composition should succeed');
      this.assert(complexComposition.workflowPlan.steps.length >= 3, 'Complex workflow should have multiple steps');
      
      console.log(`✅ Complex workflow composition with ${complexComposition.workflowPlan.steps.length} steps`);
      
      // Test 3: Invalid request handling
      const invalidRequest = "Do something impossible with non-existent APIs";
      const invalidComposition = await this.coordinator.composeWorkflow(invalidRequest);
      
      this.assert(!invalidComposition.success, 'Invalid workflow should fail gracefully');
      this.assert(invalidComposition.error, 'Should provide error message for invalid workflows');
      
      console.log(`✅ Invalid request handled gracefully: ${invalidComposition.error}`);
      
      this.recordTest('Composition Coordinator', 'PASS', 'All coordination tests passed');
      
    } catch (error) {
      this.recordTest('Composition Coordinator', 'FAIL', error.message);
      throw error;
    }
  }

  async testComplexWorkflowComposition() {
    console.log('\n🧪 Testing Complete Workflow Composition Flow...');
    
    try {
      // End-to-end test: Complex user request → Workflow plan → Validation
      const userRequest = "I need a comprehensive financial overview including my balance, recent transactions, current weather that might affect my spending, and USD exchange rates for my upcoming trip";
      
      console.log(`📝 User Request: "${userRequest}"`);
      
      // Step 1: Compose workflow
      const composition = await this.coordinator.composeWorkflow(userRequest);
      this.assert(composition.success, 'Complex workflow composition should succeed');
      
      console.log(`✅ Workflow composed with ${composition.workflowPlan.steps.length} steps`);
      
      // Step 2: Validate all operations exist
      const operations = composition.workflowPlan.steps.map(step => step.operation);
      for (const operation of operations) {
        const exists = this.registry.getOperation(operation);
        if (exists) {
          console.log(`✅ Operation '${operation}' found in registry`);
        } else {
          console.log(`⚠️ Operation '${operation}' not found - may be synthetic`);
        }
      }
      
      // Step 3: Check data flow logic
      if (composition.workflowPlan.dataFlow && composition.workflowPlan.dataFlow.length > 0) {
        console.log(`✅ Data flow defined with ${composition.workflowPlan.dataFlow.length} connections`);
      }
      
      // Step 4: Estimate execution complexity
      const complexity = this.estimateComplexity(composition.workflowPlan);
      console.log(`📊 Estimated execution complexity: ${complexity.score}/10 (${complexity.level})`);
      
      this.recordTest('Complete Workflow Composition', 'PASS', `Successfully composed ${composition.workflowPlan.steps.length}-step workflow`);
      
    } catch (error) {
      this.recordTest('Complete Workflow Composition', 'FAIL', error.message);
      throw error;
    }
  }

  estimateComplexity(workflowPlan) {
    const stepCount = workflowPlan.steps.length;
    const dataFlowCount = workflowPlan.dataFlow ? workflowPlan.dataFlow.length : 0;
    const dependencyCount = workflowPlan.steps.reduce((acc, step) => acc + (step.dependencies ? step.dependencies.length : 0), 0);
    
    const score = Math.min(10, stepCount + dataFlowCount + (dependencyCount * 0.5));
    
    let level = 'Simple';
    if (score >= 7) level = 'Complex';
    else if (score >= 4) level = 'Moderate';
    
    return { score: Math.round(score), level };
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
    console.log('\n📊 Phase 4.9 Checkpoint 1 Test Results\n');
    
    const passed = this.testResults.filter(r => r.status === 'PASS').length;
    const failed = this.testResults.filter(r => r.status === 'FAIL').length;
    
    this.testResults.forEach(result => {
      const icon = result.status === 'PASS' ? '✅' : '❌';
      console.log(`${icon} ${result.test}: ${result.details}`);
    });
    
    console.log(`\n📈 Summary: ${passed} passed, ${failed} failed`);
    
    if (failed === 0) {
      console.log('\n🎉 All Checkpoint 1 tests passed! Ready for implementation.');
    } else {
      console.log('\n⚠️ Some tests failed. Fix issues before proceeding.');
      process.exit(1);
    }
  }
}

// Run tests if this file is executed directly
if (import.meta.url === new URL(process.argv[1], 'file://').href) {
  const test = new Phase49Checkpoint1Test();
  test.runAllTests().catch(console.error);
}

export { Phase49Checkpoint1Test };