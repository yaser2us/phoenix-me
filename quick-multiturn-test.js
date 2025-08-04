#!/usr/bin/env node

/**
 * Quick test for multi-turn conversation
 */

import { ConversationalWorkflowManager } from './src/interaction/conversational-workflow-manager.js';

// Create a mock workflow planner that always creates missing parameters
const mockWorkflowPlanner = {
  async planFromIntent(intent, context) {
    return {
      id: 'test_workflow',
      name: 'Test Multi-Turn Workflow',
      executionPlan: {
        steps: [{
          operations: [
            { subGoal: 'transfer_money', operation: { operationId: 'transfer' } },
            { subGoal: 'check_weather', operation: { operationId: 'getCurrentWeather' } }
          ]
        }]
      }
    };
  }
};

// Create a mock parameter collector that always has missing parameters
const mockParameterCollector = {
  async collectParameters(workflowSpec, context) {
    return {
      collected: {},
      missing: ['amount', 'location'],
      prompts: [
        {
          parameter: 'amount',
          message: 'How much money would you like to transfer?',
          suggestions: ['$100', '$500', '$1000'],
          details: { name: 'amount', schema: { type: 'string' } }
        },
        {
          parameter: 'location',
          message: 'What location for weather?',
          suggestions: ['London', 'Paris', 'New York'],
          details: { name: 'location', schema: { type: 'string' } }
        }
      ]
    };
  },

  async collectParameterInteractively(paramName, paramDetails, userResponse) {
    return {
      success: true,
      value: userResponse,
      parameter: paramName
    };
  }
};

// Mock execution engine
const mockExecutionEngine = {
  async executeWorkflow() {
    return { status: 'completed', duration: 1000 };
  }
};

async function testQuickMultiTurn() {
  console.log('🧪 Quick Multi-Turn Test');
  console.log('========================');
  
  try {
    const conversationManager = new ConversationalWorkflowManager(
      mockWorkflowPlanner,
      mockParameterCollector,
      mockExecutionEngine
    );
    
    console.log('👤 User: "Transfer money and check weather"');
    
    // Turn 1: Start conversation
    const conversation = await conversationManager.startConversation(
      'test_user',
      'Transfer money and check weather',
      {}
    );
    
    console.log(`\n🤖 Turn 1: ${conversation.response.substring(0, 100)}...`);
    console.log(`❓ Needs Input: ${conversation.needsInput}`);
    
    let turnCount = 1;
    let currentConversation = conversation;
    
    // Turn 2: Provide amount
    if (currentConversation.needsInput) {
      turnCount++;
      console.log(`\n👤 Turn ${turnCount}: "$500"`);
      
      currentConversation = await conversationManager.continueConversation(
        conversation.conversationId,
        '$500'
      );
      
      console.log(`🤖 Turn ${turnCount}: ${currentConversation.response.substring(0, 100)}...`);
      console.log(`❓ Needs Input: ${currentConversation.needsInput}`);
    }
    
    // Turn 3: Provide location
    if (currentConversation.needsInput) {
      turnCount++;
      console.log(`\n👤 Turn ${turnCount}: "London"`);
      
      currentConversation = await conversationManager.continueConversation(
        conversation.conversationId,
        'London'
      );
      
      console.log(`🤖 Turn ${turnCount}: ${currentConversation.response.substring(0, 100)}...`);
      console.log(`❓ Needs Input: ${currentConversation.needsInput}`);
    }
    
    // Turn 4: Confirm
    if (currentConversation.needsInput) {
      turnCount++;
      console.log(`\n👤 Turn ${turnCount}: "Yes, proceed"`);
      
      currentConversation = await conversationManager.continueConversation(
        conversation.conversationId,
        'Yes, proceed'
      );
      
      console.log(`🤖 Turn ${turnCount}: ${currentConversation.response.substring(0, 100)}...`);
      console.log(`❓ Needs Input: ${currentConversation.needsInput}`);
    }
    
    console.log(`\n📊 Results:`);
    console.log(`• Total Turns: ${turnCount}`);
    console.log(`• Final Status: ${currentConversation.status}`);
    
    if (turnCount >= 3) {
      console.log('✅ SUCCESS: Multi-turn conversation working!');
    } else {
      console.log(`❌ FAILED: Expected 3+ turns, got ${turnCount}`);
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testQuickMultiTurn();