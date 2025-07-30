#!/usr/bin/env node

/**
 * Test script to specifically validate multi-turn conversation functionality
 */

import { ApiRegistry } from './src/registry/api-registry.js';
import { AIWorkflowPlanner } from './src/workflow/ai-workflow-planner.js';
import { DynamicParameterCollector } from './src/workflow/dynamic-parameter-collector.js';
import { EnhancedSemanticMatcher } from './src/nlp/enhanced-semantic-matcher.js';
import { WorkflowExecutionEngine } from './src/execution/workflow-execution-engine.js';
import { ConversationalWorkflowManager } from './src/interaction/conversational-workflow-manager.js';

async function testMultiTurnConversation() {
  console.log('🧪 Multi-Turn Conversation Test');
  console.log('================================');
  
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
    
    console.log('✅ Components initialized\n');
    
    // Test multi-turn conversation
    const userId = 'test_user_multiturn';
    const intent = 'Send money to John and check weather in London';
    
    console.log(`👤 User: "${intent}"`);
    
    // Turn 1: Start conversation
    console.log('\n=== TURN 1: Start Conversation ===');
    const conversation = await conversationManager.startConversation(
      userId,
      intent,
      {} // Empty context to force parameter collection
    );
    
    console.log(`🤖 Assistant: ${conversation.response}`);
    console.log(`❓ Needs Input: ${conversation.needsInput}`);
    console.log(`📊 Status: ${conversation.status || 'N/A'}`);
    
    if (!conversation.needsInput) {
      console.log('❌ ISSUE: Expected needsInput=true but got false');
      console.log('Workflow seems to have all parameters already');
      return;
    }
    
    let conversationId = conversation.conversationId;
    let turnCount = 1;
    
    // Turn 2: Provide first parameter
    if (conversation.needsInput) {
      turnCount++;
      console.log(`\n=== TURN ${turnCount}: Provide Amount ===`);
      console.log('👤 User: "$200"');
      
      const response2 = await conversationManager.continueConversation(
        conversationId,
        '$200'
      );
      
      console.log(`🤖 Assistant: ${response2.response}`);
      console.log(`❓ Needs Input: ${response2.needsInput}`);
      console.log(`📊 Status: ${response2.status || 'N/A'}`);
      
      // Turn 3: Provide second parameter
      if (response2.needsInput) {
        turnCount++;
        console.log(`\n=== TURN ${turnCount}: Provide Location ===`);
        console.log('👤 User: "London"');
        
        const response3 = await conversationManager.continueConversation(
          conversationId,
          'London'
        );
        
        console.log(`🤖 Assistant: ${response3.response}`);
        console.log(`❓ Needs Input: ${response3.needsInput}`);
        console.log(`📊 Status: ${response3.status || 'N/A'}`);
        
        // Turn 4: Confirm execution
        if (response3.needsInput) {
          turnCount++;
          console.log(`\n=== TURN ${turnCount}: Confirm Execution ===`);
          console.log('👤 User: "Yes, go ahead"');
          
          const response4 = await conversationManager.continueConversation(
            conversationId,
            'Yes, go ahead'
          );
          
          console.log(`🤖 Assistant: ${response4.response}`);
          console.log(`❓ Needs Input: ${response4.needsInput}`);
          console.log(`📊 Status: ${response4.status || 'N/A'}`);
        }
      }
    }
    
    console.log(`\n📊 Final Results:`);
    console.log(`• Total Turns: ${turnCount}`);
    console.log(`• Conversation ID: ${conversationId}`);
    
    const finalStatus = conversationManager.getConversationStatus(conversationId);
    console.log(`• Final Status: ${finalStatus?.status || 'N/A'}`);
    
    if (turnCount >= 3) {
      console.log('✅ SUCCESS: Multi-turn conversation working correctly!');
    } else {
      console.log('❌ FAILED: Not enough conversation turns generated');
      console.log(`Expected: 3+ turns, Got: ${turnCount} turns`);
    }
    
  } catch (error) {
    console.error('❌ Test failed with error:', error.message);
    console.error(error.stack);
  }
}

testMultiTurnConversation();