#!/usr/bin/env node

/**
 * Debug script specifically for Maybank server connection
 * Shows exactly what we receive from the Maybank API
 */

import { MCPGatewayServer } from './src/server.js';
import { logger } from './src/utils/logger.js';

// Enable maximum logging
process.env.LOG_LEVEL = 'debug';
process.env.FULL_DEBUG = 'true';

// Your actual JWT token from the working session
const JWT_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJjdXNfa2V5IjoiVTJGc2RHVmtYMThoTlRIT1g3cmIwSDJKQUY0YmNIckp5d0dNSG5CZHZDU0F6cFhIanY0RHVHQmQyWUtuUk5LaEZRZWVCc1BLMWt2aGVOdkk2RDcrUGc9PSIsImF1ZCI6WyJ6dXVsR2F0ZXdheSJdLCJ1c2VyX25hbWUiOiJZYXNlcjJ1cyIsImN1c1R5cGUiOiIxMCIsInNjb3BlIjpbIkVESVRfTk9OX0JBTktJTkciLCJSRUFEX0JBTktJTkciLCJSRUFEX05PTl9CQU5LSU5HIl0sIm1heWFfc2Vzc2lvbl9pZCI6IkBAQEEyMDI1MDcyOTEyLjYyMDE3MjA0NTVAQEBAIiwibTJ1X3VzZXJfaWQiOjE3ODI3NzEzLCJwYW4iOiJNWmMvakl6RGpGVEh5YWNDTWpPSGd4ajllK0owdDdUSG5aY05BSERrK05PbjhoTWloUlUrdGc4NkdldTl4RHl3NVJCTWpYcDlvTnU2UHhQTkZoZWRjN0oxTWMrQ1l1SjVOTXdibjNrVlZXaUhJWVZleHlTUmhYQ3RhRFpaeExMMU5sMEc0anM4KzcvRXIxSndVVnJweFJvSGxKZlFpOGFXZVpIbEk1eWV4Q1k9IiwiZXhwIjoxNzg1MzM3MzQ2LCJ1c2VySWQiOjUxMjYxMDksImp0aSI6IjY1NjRlYjE0LWU1ZTMtNGQxNS1hY2U2LTRmZWE3YmM0ZTY1MyIsImNsaWVudF9pZCI6Ik0yVUdBVEVXQVkifQ.Lx0vgdJeVc8G2hPcqebAbkkmL1vDKTMUJrkDU5hvmJI';

async function debugMaybankConnection() {
  console.log('🔍 Maybank Server Connection Debug');
  console.log('=' .repeat(50));
  
  try {
    console.log('📡 Initializing server...');
    const server = new MCPGatewayServer();
    await server.initialize();
    
    console.log('✅ Server initialized');
    console.log(`🔧 Components Status:`, {
      registry: !!server.registry,
      executor: !!server.executor,
      maybankTool: !!server.maybankInteractiveTool,
      executorRegistry: !!server.executor?.registry
    });
    
    console.log('\n🧪 Testing Direct Maybank API Call...');
    console.log('Operation: get_banking_getBalance');
    console.log('JWT Token: [PROVIDED]');
    console.log('Expected: Direct call to Maybank staging API');
    
    const startTime = Date.now();
    
    try {
      const result = await server.handleToolCall('maybank_interactive', {
        request: 'Get my MAE wallet balance',
        operationId: 'get_banking_getBalance',
        parameters: {
          jwtToken: JWT_TOKEN,
          isFirstLoad: 'true'
        }
      });
      
      const duration = Date.now() - startTime;
      
      console.log(`\n⏱️  Total Time: ${duration}ms`);
      console.log('\n📋 RESULT ANALYSIS:');
      console.log(`- Success: ${!result.isError}`);
      console.log(`- Has Content: ${!!result.content}`);
      console.log(`- Content Items: ${result.content?.length || 0}`);
      console.log(`- Is Error Response: ${!!result.isError}`);
      
      if (result.content && result.content[0]) {
        const text = result.content[0].text;
        console.log(`- Response Length: ${text.length} characters`);
        
        // Check for specific indicators
        console.log('\n🔍 RESPONSE INDICATORS:');
        console.log(`- Contains "RM": ${text.includes('RM')}`);
        console.log(`- Contains "Balance": ${text.includes('Balance') || text.includes('balance')}`);
        console.log(`- Contains "MAE": ${text.includes('MAE')}`);
        console.log(`- Contains "Error": ${text.includes('Error') || text.includes('error')}`);
        console.log(`- Contains "Failed": ${text.includes('Failed') || text.includes('failed')}`);
        console.log(`- Contains "timeout": ${text.includes('timeout')}`);
        console.log(`- Contains "connection": ${text.includes('connection')}`);
        console.log(`- Contains "simulated": ${text.includes('simulated')}`);
        
        console.log('\n📄 FULL RESPONSE TEXT:');
        console.log('-'.repeat(50));
        console.log(text);
        console.log('-'.repeat(50));
        
        // Try to extract data from the response
        if (text.includes('RM ')) {
          const balanceMatch = text.match(/RM\s+([\d,]+\.?\d*)/);
          if (balanceMatch) {
            console.log(`\n💰 EXTRACTED BALANCE: ${balanceMatch[1]}`);
          }
        }
      }
      
      console.log('\n🔍 FULL RESULT OBJECT:');
      console.log(JSON.stringify(result, null, 2));
      
    } catch (apiError) {
      console.log(`\n❌ API Call Failed after ${Date.now() - startTime}ms`);
      console.log(`Error: ${apiError.message}`);
      console.log(`Stack: ${apiError.stack}`);
    }
    
    // Test 2: Quick balance workflow
    console.log('\n\n🧪 Testing Quick Balance Workflow...');
    
    try {
      const workflowResult = await server.handleToolCall('maybank_interactive', {
        request: 'Quick balance check',
        workflowName: 'maybank_quick_balance',
        parameters: {
          jwtToken: JWT_TOKEN
        }
      });
      
      console.log('\n📋 WORKFLOW RESULT:');
      if (workflowResult.content && workflowResult.content[0]) {
        console.log(workflowResult.content[0].text);
      }
      
      console.log('\n🔍 FULL WORKFLOW OBJECT:');
      console.log(JSON.stringify(workflowResult, null, 2));
      
    } catch (workflowError) {
      console.log(`\n❌ Workflow Failed: ${workflowError.message}`);
    }
    
    // Cleanup
    if (server.maybankInteractiveTool) {
      server.maybankInteractiveTool.destroy();
    }
    
  } catch (error) {
    console.error('❌ Debug failed:', error);
    console.error(error.stack);
  }
}

// Enhanced console logging
const originalLog = console.log;
const originalError = console.error;

console.log = (...args) => {
  const timestamp = new Date().toISOString();
  originalLog(`[${timestamp}]`, ...args);
};

console.error = (...args) => {
  const timestamp = new Date().toISOString();
  originalError(`[${timestamp}] ERROR:`, ...args);
};

debugMaybankConnection().catch(error => {
  console.error('Fatal debug error:', error);
  process.exit(1);
});