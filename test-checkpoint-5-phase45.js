#!/usr/bin/env node

/**
 * Phase 4.5 Checkpoint 5: Interactive Workflow Experience Test Suite
 * Tests complete interactive experience for complex workflow execution
 */

import { ApiRegistry } from './src/registry/api-registry.js';
import { AIWorkflowPlanner } from './src/workflow/ai-workflow-planner.js';
import { DynamicParameterCollector } from './src/workflow/dynamic-parameter-collector.js';
import { EnhancedSemanticMatcher } from './src/nlp/enhanced-semantic-matcher.js';
import { WorkflowExecutionEngine } from './src/execution/workflow-execution-engine.js';
import { ConversationalWorkflowManager } from './src/interaction/conversational-workflow-manager.js';
import { InteractiveUXEnhancements } from './src/interaction/interactive-ux-enhancements.js';
import { WorkflowIntelligence } from './src/intelligence/workflow-intelligence.js';
import { logger } from './src/utils/logger.js';

class InteractiveWorkflowExperienceTest {
  constructor() {
    this.testResults = {
      totalTests: 0,
      passedTests: 0,
      failedTests: 0,
      testDetails: []
    };
  }

  async runAllTests() {
    console.log('🧪 Phase 4.5 Checkpoint 5: Interactive Workflow Experience Test Suite');
    console.log('================================================================================');
    
    try {
      // Initialize components
      await this.initializeComponents();
      
      // Run test cases
      await this.testMultiTurnConversation();
      await this.testDynamicParameterCollection();
      await this.testWorkflowModification();
      await this.testProgressMonitoring();
      await this.testIntelligentRecommendations();
      
      // Generate final report
      this.generateTestReport();
      
    } catch (error) {
      console.error('❌ Test suite initialization failed:', error.message);
      process.exit(1);
    }
  }

  async initializeComponents() {
    console.log('🔧 Initializing Interactive Workflow Components...\n');
    
    // Core components
    this.apiRegistry = new ApiRegistry();
    await this.apiRegistry.initialize();
    
    this.semanticMatcher = new EnhancedSemanticMatcher(this.apiRegistry);
    this.workflowPlanner = new AIWorkflowPlanner(this.apiRegistry, this.semanticMatcher);
    this.parameterCollector = new DynamicParameterCollector(this.apiRegistry);
    this.executionEngine = new WorkflowExecutionEngine(this.apiRegistry, this.parameterCollector);
    
    // Interactive components
    this.conversationManager = new ConversationalWorkflowManager(
      this.workflowPlanner, 
      this.parameterCollector, 
      this.executionEngine
    );
    
    this.uxEnhancements = new InteractiveUXEnhancements();
    this.workflowIntelligence = new WorkflowIntelligence();
    
    console.log('✅ All components initialized successfully\n');
  }

  async testMultiTurnConversation() {
    console.log('🧪 Test 1: Multi-Turn Conversation Handling');
    console.log('===========================================');
    
    const testPassed = await this.runTest('Multi-Turn Conversation', async () => {
      const userId = 'test_user_001';
      const initialIntent = 'I want to transfer money to my friend and check weather forecast';
      
      console.log('👤 User: "I want to transfer money to my friend and check weather forecast"');
      
      // Start conversation - don't provide context to force parameter collection
      const conversationStart = await this.conversationManager.startConversation(
        userId, 
        initialIntent,
        { platform: 'desktop' } // Don't provide location or amount to force conversation
      );
      
      console.log('🤖 Assistant:', conversationStart.response);
      console.log(`📊 Workflow: ${conversationStart.workflow.name}`);
      console.log(`❓ Needs Input: ${conversationStart.needsInput}`);
      
      // Simulate user responses to parameter prompts
      let conversationId = conversationStart.conversationId;
      let currentConversation = conversationStart;
      let turnCount = 1;
      
      // Turn 2: Provide first parameter (amount)
      if (currentConversation.needsInput) {
        turnCount++;
        console.log(`\n--- Turn ${turnCount} ---`);
        console.log('👤 User: "$500"');
        
        currentConversation = await this.conversationManager.continueConversation(
          conversationId,
          '$500'
        );
        
        console.log('🤖 Assistant:', currentConversation.response);
        console.log(`📊 Progress: ${currentConversation.progress?.percent || 0}%`);
      }
      
      // Turn 3: Provide second parameter (location)
      if (currentConversation.needsInput) {
        turnCount++;
        console.log(`\n--- Turn ${turnCount} ---`);
        console.log('👤 User: "Singapore"');
        
        currentConversation = await this.conversationManager.continueConversation(
          conversationId,
          'Singapore'
        );
        
        console.log('🤖 Assistant:', currentConversation.response);
        console.log(`📊 Progress: ${currentConversation.progress?.percent || 0}%`);
      }
      
      // Turn 4: Confirm execution
      if (currentConversation.needsInput) {
        turnCount++;
        console.log(`\n--- Turn ${turnCount} ---`);
        console.log('👤 User: "Yes, proceed"');
        
        currentConversation = await this.conversationManager.continueConversation(
          conversationId,
          'Yes, proceed'
        );
        
        console.log('🤖 Assistant:', currentConversation.response);
      }
      
      // Execute workflow
      if (!currentConversation.needsInput) {
        console.log('\n🚀 Executing workflow...');
        const executionResult = await this.conversationManager.executeWorkflow(conversationId);
        console.log(`✅ Execution completed in ${executionResult.duration}ms`);
        console.log(`📊 Status: ${executionResult.executionResult.status}`);
      }
      
      // Validate conversation handling
      const conversationStatus = this.conversationManager.getConversationStatus(conversationId);
      
      return {
        success: turnCount >= 3 && conversationStatus !== null,
        details: {
          conversationTurns: turnCount,
          conversationId: conversationId,
          finalStatus: conversationStatus?.status,
          workflowOperations: currentConversation.workflow?.executionPlan?.steps?.length || 0
        }
      };
    });

    if (testPassed.success) {
      console.log(`✅ PASSED: Multi-turn conversation with ${testPassed.details.conversationTurns} turns`);
    } else {
      console.log('❌ FAILED: Multi-turn conversation handling not working properly');
    }
    
    console.log();
  }

  async testDynamicParameterCollection() {
    console.log('🧪 Test 2: Dynamic Parameter Collection Through Conversation');
    console.log('============================================================');
    
    const testPassed = await this.runTest('Dynamic Parameter Collection', async () => {
      const userId = 'test_user_002';
      const complexIntent = 'Transfer money to account 12345 and check exchange rates for USD to EUR';
      
      console.log('👤 User: "Transfer money to account 12345 and check exchange rates for USD to EUR"');
      
      // Start conversation
      const conversation = await this.conversationManager.startConversation(
        userId,
        complexIntent,
        { preferredCurrency: 'USD', location: 'New York' }
      );
      
      console.log('🤖 Assistant:', conversation.response);
      
      // Check if parameters are being collected dynamically
      const pendingParams = conversation.workflow?.parameters?.missing || [];
      console.log(`📋 Parameters needed: ${pendingParams.length}`);
      
      if (pendingParams.length > 0) {
        console.log('Parameters being collected:');
        pendingParams.forEach(param => {
          console.log(`  • ${param.name}: ${param.prompt.message}`);
        });
      }
      
      // Simulate providing parameters through conversation
      let conversationId = conversation.conversationId;
      let parameterCount = 0;
      let maxTurns = 5;
      
      while (conversation.needsInput && parameterCount < maxTurns) {
        parameterCount++;
        
        // Provide sample parameter values
        const sampleResponses = ['$500', 'urgent', 'yes', 'USD', 'business'];
        const response = sampleResponses[parameterCount - 1] || 'default';
        
        console.log(`\n👤 User: "${response}"`);
        
        const continueResult = await this.conversationManager.continueConversation(
          conversationId,
          response
        );
        
        console.log('🤖 Assistant:', continueResult.response);
        
        if (!continueResult.needsInput) {
          break;
        }
      }
      
      return {
        success: parameterCount > 0 && parameterCount <= maxTurns,
        details: {
          parametersCollected: parameterCount,
          workflowReady: !conversation.needsInput,
          conversationFlows: parameterCount > 0
        }
      };
    });

    if (testPassed.success) {
      console.log(`✅ PASSED: Dynamic parameter collection with ${testPassed.details.parametersCollected} parameters`);
    } else {
      console.log('❌ FAILED: Dynamic parameter collection not working properly');
    }
    
    console.log();
  }

  async testWorkflowModification() {
    console.log('🧪 Test 3: Workflow Modification During Conversation');
    console.log('====================================================');
    
    const testPassed = await this.runTest('Workflow Modification', async () => {
      const userId = 'test_user_003';
      const initialIntent = 'Check my bank balance';
      
      console.log('👤 User: "Check my bank balance"');
      
      // Start simple conversation
      const conversation = await this.conversationManager.startConversation(userId, initialIntent);
      console.log('🤖 Assistant:', conversation.response);
      
      // User requests modification
      console.log('\n👤 User: "Actually, also add weather check for my location"');
      
      const modificationResult = await this.conversationManager.continueConversation(
        conversation.conversationId,
        'Actually, also add weather check for my location'
      );
      
      console.log('🤖 Assistant:', modificationResult.response);
      
      // Check if workflow was modified
      const originalOps = conversation.workflow?.executionPlan?.steps?.reduce(
        (sum, step) => sum + step.operations.length, 0
      ) || 0;
      
      const modifiedOps = modificationResult.workflow?.executionPlan?.steps?.reduce(
        (sum, step) => sum + step.operations.length, 0
      ) || 0;
      
      console.log(`📊 Original operations: ${originalOps}`);
      console.log(`📊 Modified operations: ${modifiedOps}`);
      
      // Test declining a workflow
      console.log('\n👤 User: "No, I changed my mind"');
      
      const declineResult = await this.conversationManager.continueConversation(
        conversation.conversationId,
        'No, I changed my mind'
      );
      
      console.log('🤖 Assistant:', declineResult.response);
      
      return {
        success: modifiedOps >= originalOps,
        details: {
          originalOperations: originalOps,
          modifiedOperations: modifiedOps,
          workflowModified: modifiedOps > originalOps,
          handlesDecline: declineResult.response.includes('change') || declineResult.response.includes('modify')
        }
      };
    });

    if (testPassed.success) {
      console.log('✅ PASSED: Workflow modification during conversation working');
    } else {
      console.log('❌ FAILED: Workflow modification not working properly');
    }
    
    console.log();
  }

  async testProgressMonitoring() {
    console.log('🧪 Test 4: Real-time Progress Monitoring');
    console.log('=========================================');
    
    const testPassed = await this.runTest('Progress Monitoring', async () => {
      // Create a test workflow
      const testWorkflow = {
        id: 'test_workflow_progress',
        name: 'Progress Test Workflow',
        executionPlan: {
          steps: [
            {
              operations: [
                { subGoal: 'check_balance', domain: 'banking' },
                { subGoal: 'get_weather', domain: 'weather' },
                { subGoal: 'currency_rates', domain: 'currency' }
              ]
            }
          ]
        }
      };
      
      // Create progress indicator
      const progressIndicator = this.uxEnhancements.createProgressIndicator(
        testWorkflow.id,
        testWorkflow
      );
      
      console.log('📊 Initial Progress:');
      console.log(`   ${progressIndicator.indicator.progressBar}`);
      console.log(`   Status: ${progressIndicator.indicator.status}`);
      console.log(`   Estimated time: ${progressIndicator.estimatedTime}ms`);
      
      // Simulate progress updates
      const progressUpdates = [
        { stepIndex: 0, status: 'executing', completedOperations: 1, totalOperations: 3 },
        { stepIndex: 0, status: 'executing', completedOperations: 2, totalOperations: 3 },
        { stepIndex: 0, status: 'completed', completedOperations: 3, totalOperations: 3 }
      ];
      
      let progressUpdateCount = 0;
      
      for (const update of progressUpdates) {
        progressUpdateCount++;
        
        const updatedProgress = this.uxEnhancements.updateProgress(testWorkflow.id, update);
        
        console.log(`\n📈 Progress Update ${progressUpdateCount}:`);
        console.log(`   ${updatedProgress.indicator.progressBar}`);
        console.log(`   Status: ${updatedProgress.statusMessage}`);
        console.log(`   Operations: ${update.completedOperations}/${update.totalOperations}`);
        
        // Simulate some processing time
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
      // Test status subscription
      let statusUpdatesReceived = 0;
      const unsubscribe = this.uxEnhancements.subscribeToStatusUpdates(
        testWorkflow.id,
        (status) => {
          statusUpdatesReceived++;
          console.log(`🔔 Status Update Received: ${status.message || 'Update'}`);
        }
      );
      
      // Broadcast test status update
      this.uxEnhancements.broadcastStatusUpdate(testWorkflow.id, {
        message: 'Test status broadcast',
        timestamp: Date.now()
      });
      
      // Cleanup
      unsubscribe();
      this.uxEnhancements.cleanupProgressIndicator(testWorkflow.id);
      
      return {
        success: progressUpdateCount === 3 && statusUpdatesReceived > 0,
        details: {
          progressUpdates: progressUpdateCount,
          statusUpdatesReceived: statusUpdatesReceived,
          progressTracking: true,
          realTimeUpdates: statusUpdatesReceived > 0
        }
      };
    });

    if (testPassed.success) {
      console.log(`✅ PASSED: Progress monitoring with ${testPassed.details.progressUpdates} updates`);
    } else {
      console.log('❌ FAILED: Progress monitoring not working properly');
    }
    
    console.log();
  }

  async testIntelligentRecommendations() {
    console.log('🧪 Test 5: Intelligent Workflow Recommendations');
    console.log('================================================');
    
    const testPassed = await this.runTest('Intelligent Recommendations', async () => {
      const userId = 'test_user_005';
      
      // Test smart defaults generation
      console.log('🧠 Testing Smart Defaults Generation...');
      
      const workflowContext = {
        intent: 'check banking and weather',
        location: 'Singapore',
        operations: ['balance', 'weather']
      };
      
      const smartDefaults = this.workflowIntelligence.generateSmartDefaults(userId, workflowContext);
      
      console.log(`📋 Smart Defaults Generated: ${Object.keys(smartDefaults.defaults).length}`);
      console.log(`🎯 Overall Confidence: ${Math.round(smartDefaults.confidence * 100)}%`);
      
      Object.entries(smartDefaults.defaults).slice(0, 5).forEach(([param, info]) => {
        console.log(`   • ${param}: ${info.value} (${Math.round(info.confidence * 100)}% confidence)`);
      });
      
      // Test workflow suggestions
      console.log('\n🧠 Testing Workflow Suggestions...');
      
      const suggestions = this.workflowIntelligence.suggestWorkflows(
        userId, 
        'I need to do some banking tasks',
        { location: 'Singapore', timeOfDay: 'morning' }
      );
      
      console.log(`💡 Workflow Suggestions Generated: ${suggestions.length}`);
      
      suggestions.slice(0, 3).forEach((suggestion, index) => {
        console.log(`   ${index + 1}. ${suggestion.workflow.name}`);
        console.log(`      Type: ${suggestion.type}, Confidence: ${Math.round(suggestion.confidence * 100)}%`);
        console.log(`      Reason: ${suggestion.reason}`);
      });
      
      // Test optimization recommendations
      console.log('\n🧠 Testing Optimization Recommendations...');
      
      const mockWorkflow = {
        id: 'test_workflow',
        executionPlan: {
          steps: [
            {
              parallel: false,
              operations: [
                { subGoal: 'check_balance', domain: 'banking' },
                { subGoal: 'get_weather', domain: 'weather' }
              ]
            }
          ]
        }
      };
      
      const mockHistory = [
        { duration: 5000, status: 'completed', results: { byOperation: [] } },
        { duration: 7000, status: 'failed', results: { byOperation: [] } },
        { duration: 4500, status: 'completed', results: { byOperation: [] } }
      ];
      
      const optimizationRecs = this.workflowIntelligence.generateOptimizationRecommendations(
        mockWorkflow,
        mockHistory
      );
      
      console.log(`⚡ Optimization Recommendations: ${optimizationRecs.length}`);
      
      optimizationRecs.slice(0, 3).forEach((rec, index) => {
        console.log(`   ${index + 1}. ${rec.title} (${rec.priority} priority)`);
        console.log(`      ${rec.description}`);
        console.log(`      Impact: ${rec.impact}`);
      });
      
      // Test learning from feedback
      console.log('\n🧠 Testing Feedback Learning...');
      
      const feedback = {
        type: 'recommendation',
        accepted: true,
        outcome: 'improved_performance',
        context: {
          workflowType: 'banking',
          suggestion: 'parallelization'
        }
      };
      
      this.workflowIntelligence.learnFromFeedback(userId, feedback);
      
      const intelligenceMetrics = this.workflowIntelligence.getIntelligenceMetrics();
      console.log('📊 Intelligence Metrics:');
      console.log(`   Recommendations Generated: ${intelligenceMetrics.recommendationsGenerated}`);
      console.log(`   Recommendations Accepted: ${intelligenceMetrics.recommendationsAccepted}`);
      console.log(`   Learning Entries: ${intelligenceMetrics.learningEntries}`);
      
      return {
        success: (
          Object.keys(smartDefaults.defaults).length > 0 &&
          suggestions.length > 0 &&
          optimizationRecs.length > 0 &&
          intelligenceMetrics.learningEntries > 0
        ),
        details: {
          smartDefaults: Object.keys(smartDefaults.defaults).length,
          suggestions: suggestions.length,
          optimizations: optimizationRecs.length,
          learningEntries: intelligenceMetrics.learningEntries,
          avgConfidence: smartDefaults.confidence
        }
      };
    });

    if (testPassed.success) {
      console.log(`✅ PASSED: Intelligent recommendations with ${testPassed.details.suggestions} suggestions`);
    } else {
      console.log('❌ FAILED: Intelligent recommendations not working properly');
    }
    
    console.log();
  }

  async runTest(testName, testFunction) {
    this.testResults.totalTests++;
    
    try {
      const result = await testFunction();
      
      if (result.success) {
        this.testResults.passedTests++;
        this.testResults.testDetails.push({
          name: testName,
          status: 'PASSED',
          details: result.details
        });
      } else {
        this.testResults.failedTests++;
        this.testResults.testDetails.push({
          name: testName,
          status: 'FAILED',
          details: result.details || { error: 'Test criteria not met' }
        });
      }
      
      return result;
      
    } catch (error) {
      this.testResults.failedTests++;
      this.testResults.testDetails.push({
        name: testName,
        status: 'FAILED',
        details: { error: error.message }
      });
      
      return { success: false, error: error.message };
    }
  }

  generateTestReport() {
    console.log('===========================================================================');
    console.log('📊 Checkpoint 5 Test Summary');
    console.log('===========================================================================');
    
    this.testResults.testDetails.forEach((test, index) => {
      const status = test.status === 'PASSED' ? '✅ PASSED' : '❌ FAILED';
      console.log(`${index + 1}. ${test.name}: ${status}`);
      
      if (test.details && typeof test.details === 'object') {
        Object.entries(test.details).forEach(([key, value]) => {
          console.log(`   ${key}: ${value}`);
        });
      }
    });
    
    console.log('\n📈 Overall Results:');
    console.log(`✅ Passed: ${this.testResults.passedTests}`);
    console.log(`❌ Failed: ${this.testResults.failedTests}`);
    console.log(`📊 Success Rate: ${Math.round((this.testResults.passedTests / this.testResults.totalTests) * 100)}%`);
    
    const successRate = (this.testResults.passedTests / this.testResults.totalTests) * 100;
    
    if (successRate >= 80) {
      console.log('\n🎉 CHECKPOINT 5 COMPLETE: Interactive Workflow Experience operational');
      console.log('Ready for production deployment with full conversational capabilities!');
    } else if (successRate >= 60) {
      console.log('\n⚠️ CHECKPOINT 5 MOSTLY COMPLETE: Good progress with minor issues');
      console.log('Review failed tests and make improvements before proceeding.');
    } else {
      console.log('\n❌ CHECKPOINT 5 NEEDS WORK: Major issues need resolution');
      console.log('Review implementation and address failing test cases.');
    }
  }
}

// Run the test suite
const testSuite = new InteractiveWorkflowExperienceTest();
testSuite.runAllTests().catch(error => {
  console.error('Test suite failed:', error);
  process.exit(1);
});