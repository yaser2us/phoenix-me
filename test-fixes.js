#!/usr/bin/env node

/**
 * Quick test to verify the Phase 4.9 fixes
 */

import { MCPGatewayServer } from './src/server.js';

async function testFixes() {
  console.log('🔧 Testing Phase 4.9 fixes...\n');
  
  try {
    // Initialize server
    const server = new MCPGatewayServer();
    await server.initialize();
    console.log('✅ Server initialized successfully');
    
    // Test 1: Data fusion (fixed contextFusion.fuseResponses)
    console.log('\n🧪 Testing data fusion fix...');
    const fusionResult = await server.handleToolCall('get_fusion_insights', {
      apiResponses: [
        { operation: 'getBalance', data: { balance: 1500, currency: 'USD' }, success: true },
        { operation: 'getCurrentWeather', data: { temperature: 25, condition: 'sunny' }, success: true }
      ],
      fusionType: 'contextual',
      outputFormat: 'text'
    });
    
    const fusionSuccess = fusionResult.content && fusionResult.content[0].text && 
                         !fusionResult.content[0].text.includes('this.contextFusion.fuseResponses is not a function');
    
    console.log(fusionSuccess ? '✅ Data fusion fix working' : '❌ Data fusion still broken');
    console.log(`📋 Response: ${fusionResult.content[0].text.substring(0, 100)}...`);
    
    // Test 2: Dynamic workflow execution (fixed undefined id)
    console.log('\n🧪 Testing workflow execution fix...');
    const workflowResult = await server.handleToolCall('execute_dynamic_workflow', {
      workflowPlan: {
        id: 'test_workflow',
        name: 'Test Workflow',
        steps: [
          { 
            id: 'step_1',
            operation: 'getCurrentWeather', 
            parameters: { q: 'London' }, 
            order: 1 
          }
        ]
      },
      enableLearning: false
    });
    
    const workflowSuccess = workflowResult.content && workflowResult.content[0].text && 
                           !workflowResult.content[0].text.includes("Cannot read properties of undefined (reading 'id')");
    
    console.log(workflowSuccess ? '✅ Workflow execution fix working' : '❌ Workflow execution still broken');
    console.log(`📋 Response: ${workflowResult.content[0].text.substring(0, 100)}...`);
    
    // Summary
    console.log('\n📊 Fix Test Results:');
    console.log(`${fusionSuccess ? '✅' : '❌'} Data fusion error fixed`);
    console.log(`${workflowSuccess ? '✅' : '❌'} Workflow execution error fixed`);
    
    if (fusionSuccess && workflowSuccess) {
      console.log('\n🎉 All fixes verified! Phase 4.9 is ready for desktop testing.');
    } else {
      console.log('\n⚠️ Some fixes need more work.');
    }
    
  } catch (error) {
    console.error('❌ Fix test failed:', error.message);
  }
}

testFixes().catch(console.error);