// Test script for Maybank Interactive JWT prompting with detailed server logging
// This simulates how Claude Desktop would interact with the maybank_interactive tool

import { MCPGatewayServer } from './src/server.js';
import { logger } from './src/utils/logger.js';

// Enable detailed logging
process.env.LOG_LEVEL = 'debug';
process.env.FULL_DEBUG = 'true';

// Helper function to log detailed response information
function logDetailedResponse(testName, result) {
  console.log(`\n=== ${testName} - Detailed Response Analysis ===`);
  console.log('📋 Response Structure:');
  console.log(`- Type: ${typeof result}`);
  console.log(`- Has content: ${!!result.content}`);
  console.log(`- Content length: ${result.content?.length || 0}`);
  console.log(`- Is error: ${!!result.isError}`);
  console.log(`- Has error field: ${!!result.error}`);
  
  if (result.content && result.content.length > 0) {
    console.log('\n📝 Content Analysis:');
    result.content.forEach((item, index) => {
      console.log(`- Item ${index}:`);
      console.log(`  - Type: ${item.type}`);
      console.log(`  - Text length: ${item.text?.length || 0}`);
      if (item.text) {
        console.log(`  - Text preview: ${item.text.substring(0, 200)}${item.text.length > 200 ? '...' : ''}`);
      }
    });
  }
  
  console.log('\n🔍 Full Response Object:');
  console.log(JSON.stringify(result, null, 2));
  console.log('\n' + '='.repeat(60) + '\n');
}

async function testMaybankInteractive() {
  console.log('🧪 Testing Maybank Interactive JWT Prompting with Server Response Logging\n');
  
  try {
    // Initialize server
    const server = new MCPGatewayServer();
    await server.initialize();
    
    console.log('✅ Server initialized');
    console.log(`📊 Server Status:`, {
      hasRegistry: !!server.registry,
      hasExecutor: !!server.executor,
      hasMaybankTool: !!server.maybankInteractiveTool,
      executorHasRegistry: !!server.executor?.registry,
      registryInitialized: server.registry?.initialized
    });
    console.log('\n');
    
    // Test 1: Call maybank_interactive without JWT token
    console.log('🧪 Test 1: Request without JWT token (should trigger prompting)');
    console.log('📤 Request: "Show me my MAE wallet balance"');
    
    const result1 = await server.handleToolCall('maybank_interactive', {
      request: 'Show me my MAE wallet balance'
    });
    
    logDetailedResponse('Test 1', result1);
    
    // Test 2: Call with workflow name but no JWT
    console.log('🧪 Test 2: Direct workflow request without JWT');
    console.log('📤 Workflow: maybank_financial_overview');
    
    const result2 = await server.handleToolCall('maybank_interactive', {
      request: 'Get financial overview',
      workflowName: 'maybank_financial_overview'
    });
    
    logDetailedResponse('Test 2', result2);
    
    // Test 3: Call with JWT token provided - THIS IS THE IMPORTANT ONE
    console.log('🧪 Test 3: Request with JWT token provided upfront (ACTUAL API CALL)');
    console.log('📤 Request: "Check my Maybank balance"');
    console.log('📤 JWT: [PROVIDED - This should trigger actual API call]');
    
    const result3 = await server.handleToolCall('maybank_interactive', {
      request: 'Check my Maybank balance',
      parameters: {
        jwtToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJjdXNfa2V5IjoiVTJGc2RHVmtYMThoTlRIT1g3cmIwSDJKQUY0YmNIckp5d0dNSG5CZHZDU0F6cFhIanY0RHVHQmQyWUtuUk5LaEZRZWVCc1BLMWt2aGVOdkk2RDcrUGc9PSIsImF1ZCI6WyJ6dXVsR2F0ZXdheSJdLCJ1c2VyX25hbWUiOiJZYXNlcjJ1cyIsImN1c1R5cGUiOiIxMCIsInNjb3BlIjpbIkVESVRfTk9OX0JBTktJTkciLCJSRUFEX0JBTktJTkciLCJSRUFEX05PTl9CQU5LSU5HIl0sIm1heWFfc2Vzc2lvbl9pZCI6IkBAQEEyMDI1MDcyOTEyLjYyMDE3MjA0NTVAQEBAIiwibTJ1X3VzZXJfaWQiOjE3ODI3NzEzLCJwYW4iOiJNWmMvakl6RGpGVEh5YWNDTWpPSGd4ajllK0owdDdUSG5aY05BSERrK05PbjhoTWloUlUrdGc4NkdldTl4RHl3NVJCTWpYcDlvTnU2UHhQTkZoZWRjN0oxTWMrQ1l1SjVOTXdibjNrVlZXaUhJWVZleHlTUmhYQ3RhRFpaeExMMU5sMEc0anM4KzcvRXIxSndVVnJweFJvSGxKZlFpOGFXZVpIbEk1eWV4Q1k9IiwiZXhwIjoxNzg1MzM3MzQ2LCJ1c2VySWQiOjUxMjYxMDksImp0aSI6IjY1NjRlYjE0LWU1ZTMtNGQxNS1hY2U2LTRmZWE3YmM0ZTY1MyIsImNsaWVudF9pZCI6Ik0yVUdBVEVXQVkifQ.Lx0vgdJeVc8G2hPcqebAbkkmL1vDKTMUJrkDU5hvmJI'
      }
    });
    
    console.log('🚨 THIS IS THE CRITICAL TEST - WHAT DO WE GET FROM MAYBANK SERVER?');
    logDetailedResponse('Test 3 - ACTUAL API CALL', result3);
    
    // Test 3.5: Direct operation test with JWT
    console.log('🧪 Test 3.5: Direct API operation with JWT token');
    console.log('📤 Operation: get_banking_getBalance');
    console.log('📤 Parameters: isFirstLoad=true');
    
    const result3_5 = await server.handleToolCall('maybank_interactive', {
      request: 'Get MAE balance directly',
      operationId: 'get_banking_getBalance',
      parameters: {
        jwtToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJjdXNfa2V5IjoiVTJGc2RHVmtYMThoTlRIT1g3cmIwSDJKQUY0YmNIckp5d0dNSG5CZHZDU0F6cFhIanY0RHVHQmQyWUtuUk5LaEZRZWVCc1BLMWt2aGVOdkk2RDcrUGc9PSIsImF1ZCI6WyJ6dXVsR2F0ZXdheSJdLCJ1c2VyX25hbWUiOiJZYXNlcjJ1cyIsImN1c1R5cGUiOiIxMCIsInNjb3BlIjpbIkVESVRfTk9OX0JBTktJTkciLCJSRUFEX0JBTktJTkciLCJSRUFEX05PTl9CQU5LSU5HIl0sIm1heWFfc2Vzc2lvbl9pZCI6IkBAQEEyMDI1MDcyOTEyLjYyMDE3MjA0NTVAQEBAIiwibTJ1X3VzZXJfaWQiOjE3ODI3NzEzLCJwYW4iOiJNWmMvakl6RGpGVEh5YWNDTWpPSGd4ajllK0owdDdUSG5aY05BSERrK05PbjhoTWloUlUrdGc4NkdldTl4RHl3NVJCTWpYcDlvTnU2UHhQTkZoZWRjN0oxTWMrQ1l1SjVOTXdibjNrVlZXaUhJWVZleHlTUmhYQ3RhRFpaeExMMU5sMEc0anM4KzcvRXIxSndVVnJweFJvSGxKZlFpOGFXZVpIbEk1eWV4Q1k9IiwiZXhwIjoxNzg1MzM3MzQ2LCJ1c2VySWQiOjUxMjYxMDksImp0aSI6IjY1NjRlYjE0LWU1ZTMtNGQxNS1hY2U2LTRmZWE3YmM0ZTY1MyIsImNsaWVudF9pZCI6Ik0yVUdBVEVXQVkifQ.Lx0vgdJeVc8G2hPcqebAbkkmL1vDKTMUJrkDU5hvmJI',
        isFirstLoad: 'true'
      }
    });
    
    console.log('🚨 DIRECT OPERATION TEST - SERVER RESPONSE:');
    logDetailedResponse('Test 3.5 - DIRECT OPERATION', result3_5);
    
    // Test 4: Simulate session continuation
    console.log('🧪 Test 4: Session continuation (simulating user providing JWT)');
    
    // Extract session ID from previous response (if available)
    const sessionIdMatch = result1.content[0].text.match(/Session ID: (maybank_interactive_\d+_\w+)/);
    
    if (sessionIdMatch) {
      const sessionId = sessionIdMatch[1];
      console.log(`Continuing session: ${sessionId}`);
      console.log('Providing JWT token...\n');
      
      const result4 = await server.handleToolCall('maybank_interactive', {
        sessionId: sessionId,
        providedValue: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJjdXNfa2V5IjoiVTJGc2RHVmtYMThoTlRIT1g3cmIwSDJKQUY0YmNIckp5d0dNSG5CZHZDU0F6cFhIanY0RHVHQmQyWUtuUk5LaEZRZWVCc1BLMWt2aGVOdkk2RDcrUGc9PSIsImF1ZCI6WyJ6dXVsR2F0ZXdheSJdLCJ1c2VyX25hbWUiOiJZYXNlcjJ1cyIsImN1c1R5cGUiOiIxMCIsInNjb3BlIjpbIkVESVRfTk9OX0JBTktJTkciLCJSRUFEX0JBTktJTkciLCJSRUFEX05PTl9CQU5LSU5HIl0sIm1heWFfc2Vzc2lvbl9pZCI6IkBAQEAyMDI1MDcyOTEyLjYyMDE3MjA0NTVAQEBAIiwibTJ1X3VzZXJfaWQiOjE3ODI3NzEzLCJwYW4iOiJNWmMvakl6RGpGVEh5YWNDTWpPSGd4ajllK0owdDdUSG5aY05BSERrK05PbjhoTWloUlUrdGc4NkdldTl4RHl3NVJCTWpYcDlvTnU2UHhQTkZoZWRjN0oxTWMrQ1l1SjVOTXdibjNrVlZXaUhJWVZleHlTUmhYQ3RhRFpaeExMMU5sMEc0anM4KzcvRXIxSndVVnJweFJvSGxKZlFpOGFXZVpIbEk1eWV4Q1k9IiwiZXhwIjoxNzg1MzM3MzQ2LCJ1c2VySWQiOjUxMjYxMDksImp0aSI6IjY1NjRlYjE0LWU1ZTMtNGQxNS1hY2U2LTRmZWE3YmM0ZTY1MyIsImNsaWVudF9pZCI6Ik0yVUdBVEVXQVkifQ.Lx0vgdJeVc8G2hPcqebAbkkmL1vDKTMUJrkDU5hvmJI'
      });
      
      console.log('Response:');
      console.log(result4.content[0].text);
    } else {
      console.log('No session ID found in previous response');
    }
    
    console.log('\n✅ All tests completed');
    
    // Cleanup
    if (server.maybankInteractiveTool) {
      server.maybankInteractiveTool.destroy();
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error(error.stack);
  }
}

// Run the test
testMaybankInteractive().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});