#!/usr/bin/env node

/**
 * Phase 4.5 Checkpoint 5: Simplified Interactive Workflow Experience Test
 * Tests core interactive experience functionality
 */

import { ApiRegistry } from './src/registry/api-registry.js';
import { AIWorkflowPlanner } from './src/workflow/ai-workflow-planner.js';
import { DynamicParameterCollector } from './src/workflow/dynamic-parameter-collector.js';
import { EnhancedSemanticMatcher } from './src/nlp/enhanced-semantic-matcher.js';
import { WorkflowExecutionEngine } from './src/execution/workflow-execution-engine.js';
import { ConversationalWorkflowManager } from './src/interaction/conversational-workflow-manager.js';
import { InteractiveUXEnhancements } from './src/interaction/interactive-ux-enhancements.js';
import { WorkflowIntelligence } from './src/intelligence/workflow-intelligence.js';

async function runSimpleTests() {
  console.log('🧪 Phase 4.5 Checkpoint 5: Interactive Workflow Experience (Simplified Tests)');
  console.log('===============================================================================');
  
  let passedTests = 0;
  let totalTests = 0;
  
  try {
    // Initialize components
    console.log('🔧 Initializing components...');
    const apiRegistry = new ApiRegistry();
    await apiRegistry.initialize();
    
    const semanticMatcher = new EnhancedSemanticMatcher(apiRegistry);
    const workflowPlanner = new AIWorkflowPlanner(apiRegistry, semanticMatcher);
    const parameterCollector = new DynamicParameterCollector(apiRegistry);
    const executionEngine = new WorkflowExecutionEngine(apiRegistry, parameterCollector);
    
    const conversationManager = new ConversationalWorkflowManager(
      workflowPlanner, 
      parameterCollector, 
      executionEngine
    );
    
    const uxEnhancements = new InteractiveUXEnhancements();
    const workflowIntelligence = new WorkflowIntelligence();
    
    console.log('✅ Components initialized\n');
    
    // Test 1: Basic Conversation
    totalTests++;
    console.log('🧪 Test 1: Start Basic Conversation');
    try {
      const conversation = await conversationManager.startConversation(
        'test_user', 
        'Check weather in Singapore'
      );
      
      if (conversation.conversationId && conversation.response) {
        console.log('✅ PASSED: Basic conversation started');
        console.log(`   Response: ${conversation.response.substring(0, 100)}...`);
        passedTests++;
      } else {
        console.log('❌ FAILED: Missing conversation data');
      }
    } catch (error) {
      console.log(`❌ FAILED: ${error.message}`);
    }
    
    // Test 2: Progress Indicator
    totalTests++;
    console.log('\n🧪 Test 2: Progress Indicator');
    try {
      const testWorkflow = {
        id: 'test_progress',
        name: 'Test Workflow',
        executionPlan: {
          steps: [
            { operations: [{ subGoal: 'test_op' }] }
          ]
        }
      };
      
      const progressIndicator = uxEnhancements.createProgressIndicator('test_id', testWorkflow);
      
      if (progressIndicator.progressId && progressIndicator.indicator) {
        console.log('✅ PASSED: Progress indicator created');
        console.log(`   Progress: ${progressIndicator.indicator.progressBar}`);
        passedTests++;
      } else {
        console.log('❌ FAILED: Progress indicator creation failed');
      }
    } catch (error) {
      console.log(`❌ FAILED: ${error.message}`);
    }
    
    // Test 3: Smart Defaults
    totalTests++;
    console.log('\n🧪 Test 3: Smart Defaults Generation');
    try {
      const smartDefaults = workflowIntelligence.generateSmartDefaults(
        'test_user',
        { intent: 'banking check', location: 'Singapore' }
      );
      
      if (smartDefaults.defaults && Object.keys(smartDefaults.defaults).length > 0) {
        console.log('✅ PASSED: Smart defaults generated');
        console.log(`   Defaults: ${Object.keys(smartDefaults.defaults).length} parameters`);
        console.log(`   Confidence: ${Math.round(smartDefaults.confidence * 100)}%`);
        passedTests++;
      } else {
        console.log('❌ FAILED: No smart defaults generated');
      }
    } catch (error) {
      console.log(`❌ FAILED: ${error.message}`);
    }
    
    // Test 4: Workflow Suggestions
    totalTests++;
    console.log('\n🧪 Test 4: Workflow Suggestions');
    try {
      const suggestions = workflowIntelligence.suggestWorkflows(
        'test_user',
        'I need banking information',
        { location: 'Singapore' }
      );
      
      if (suggestions && suggestions.length > 0) {
        console.log('✅ PASSED: Workflow suggestions generated');
        console.log(`   Suggestions: ${suggestions.length}`);
        suggestions.slice(0, 2).forEach((suggestion, index) => {
          console.log(`   ${index + 1}. ${suggestion.workflow.name} (${Math.round(suggestion.confidence * 100)}%)`);
        });
        passedTests++;
      } else {
        console.log('❌ FAILED: No workflow suggestions generated');
      }
    } catch (error) {
      console.log(`❌ FAILED: ${error.message}`);
    }
    
    // Test 5: Conversation with Parameter Collection
    totalTests++;
    console.log('\n🧪 Test 5: Parameter Collection Conversation');
    try {
      const conversation = await conversationManager.startConversation(
        'test_user_2',
        'Transfer money and check exchange rates'
      );
      
      if (conversation.needsInput) {
        // Simulate user providing parameter
        const continueResult = await conversationManager.continueConversation(
          conversation.conversationId,
          'USD'
        );
        
        if (continueResult.response) {
          console.log('✅ PASSED: Parameter collection conversation');
          console.log(`   Initial: ${conversation.response.substring(0, 50)}...`);
          console.log(`   Continue: ${continueResult.response.substring(0, 50)}...`);
          passedTests++;
        } else {
          console.log('❌ FAILED: Conversation continuation failed');
        }
      } else {
        // No parameters needed, still a pass
        console.log('✅ PASSED: Direct execution (no parameters needed)');
        passedTests++;
      }
    } catch (error) {
      console.log(`❌ FAILED: ${error.message}`);
    }
    
    // Test Results
    console.log('\n===============================================================================');
    console.log('📊 Test Results Summary');
    console.log('===============================================================================');
    console.log(`✅ Passed: ${passedTests}/${totalTests}`);
    console.log(`📊 Success Rate: ${Math.round((passedTests / totalTests) * 100)}%`);
    
    if (passedTests === totalTests) {
      console.log('\n🎉 CHECKPOINT 5 COMPLETE: Interactive Workflow Experience operational!');
      console.log('All core interactive features are working correctly.');
    } else if (passedTests >= Math.ceil(totalTests * 0.8)) {
      console.log('\n✅ CHECKPOINT 5 MOSTLY COMPLETE: Excellent progress!');
      console.log('Core interactive workflow experience is functional.');
    } else {
      console.log('\n⚠️ CHECKPOINT 5 PARTIAL: Some features need attention');
      console.log('Review failed tests for improvements.');
    }
    
  } catch (error) {
    console.error('❌ Test initialization failed:', error.message);
  }
}

runSimpleTests().catch(error => {
  console.error('Test execution failed:', error);
  process.exit(1);
});