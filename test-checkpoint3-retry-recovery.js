#!/usr/bin/env node

/**
 * Test for Phase 4.7 Checkpoint 3: Retry & Recovery System
 * Tests the complete validation-collection-retry-execution pipeline
 */

import { RetryManager } from './src/execution/retry-manager.js';
import { EnhancedApiExecutor } from './src/execution/enhanced-api-executor.js';
import { EnhancedRequestBuilder } from './src/execution/enhanced-request-builder.js';
import { InteractiveParameterCollector } from './src/interaction/interactive-parameter-collector.js';

const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const YELLOW = '\x1b[33m';
const BLUE = '\x1b[34m';
const RESET = '\x1b[0m';

// Mock API Executor for testing
class MockApiExecutor {
  async execute(requestConfig) {
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 100));
    
    return {
      status: 200,
      data: {
        success: true,
        result: 'API call successful',
        requestUrl: requestConfig.url,
        method: requestConfig.method,
        data: requestConfig.data
      }
    };
  }
}

async function testCheckpoint3() {
  console.log(`${BLUE}🧪 Phase 4.7 Checkpoint 3: Retry & Recovery System${RESET}`);
  console.log('=' . repeat(60));
  
  let passedTests = 0;
  let totalTests = 0;

  // Test 1: Retry Manager - Create Session
  console.log(`\n${YELLOW}Test 1: Retry Manager - Session Creation${RESET}`);
  totalTests++;
  try {
    const retryManager = new RetryManager();
    
    const operation = {
      operationId: 'test_operation',
      method: 'POST',
      path: '/test',
      servers: [{ url: 'https://api.example.com' }]
    };
    
    const session = retryManager.createRetrySession(
      operation,
      { body: { field1: 'value1' } },
      { apiKey: 'test-key' },
      {}
    );
    
    if (session.sessionId && session.status === 'created') {
      console.log(`${GREEN}✅ Retry session created successfully${RESET}`);
      console.log(`   Session ID: ${session.sessionId}`);
      passedTests++;
    } else {
      console.log(`${RED}❌ Session creation failed${RESET}`);
    }
  } catch (error) {
    console.log(`${RED}❌ Error: ${error.message}${RESET}`);
  }

  // Test 2: Retry Manager - Session Status Tracking
  console.log(`\n${YELLOW}Test 2: Session Status Tracking${RESET}`);
  totalTests++;
  try {
    const retryManager = new RetryManager();
    
    const operation = {
      operationId: 'test_status',
      method: 'GET',
      path: '/status'
    };
    
    const session = retryManager.createRetrySession(operation, {}, {});
    const status = retryManager.getSessionStatus(session.sessionId);
    
    if (status.exists && 
        status.sessionId === session.sessionId &&
        status.status === 'collecting' &&
        status.attempts === 0) {
      console.log(`${GREEN}✅ Session status tracking working${RESET}`);
      console.log(`   Status: ${status.status}, Attempts: ${status.attempts}`);
      passedTests++;
    } else {
      console.log(`${RED}❌ Session status tracking failed${RESET}`);
    }
  } catch (error) {
    console.log(`${RED}❌ Error: ${error.message}${RESET}`);
  }

  // Test 3: Enhanced API Executor - Successful Execution
  console.log(`\n${YELLOW}Test 3: Enhanced Executor - Successful Execution${RESET}`);
  totalTests++;
  try {
    const mockExecutor = new MockApiExecutor();
    const enhancedExecutor = new EnhancedApiExecutor(mockExecutor);
    
    const operation = {
      operationId: 'test_success',
      method: 'GET',
      path: '/success',
      servers: [{ url: 'https://api.example.com' }],
      parameters: [
        {
          name: 'q',
          in: 'query',
          required: true,
          schema: { type: 'string' }
        }
      ]
    };
    
    const result = await enhancedExecutor.executeWithValidation(
      operation,
      { q: 'test query' }, // Complete data provided
      { apiKey: 'test-key' }
    );
    
    if (result.success && 
        result.type === 'execution_success' &&
        result.data) {
      console.log(`${GREEN}✅ Successful execution working${RESET}`);
      console.log(`   Result: ${result.data.data.result}`);
      console.log(`   Attempts: ${result.attempts}`);
      passedTests++;
    } else {
      console.log(`${RED}❌ Successful execution failed${RESET}`);
    }
  } catch (error) {
    console.log(`${RED}❌ Error: ${error.message}${RESET}`);
  }

  // Test 4: Enhanced Executor - Missing Parameters Trigger Collection
  console.log(`\n${YELLOW}Test 4: Missing Parameters Trigger Collection${RESET}`);
  totalTests++;
  try {
    const mockExecutor = new MockApiExecutor();
    const enhancedExecutor = new EnhancedApiExecutor(mockExecutor);
    
    const operation = {
      operationId: 'test_collection',
      method: 'POST',
      path: '/payment',
      servers: [{ url: 'https://api.example.com' }],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['payeeCode', 'amount'],
              properties: {
                payeeCode: { type: 'string', pattern: '^[0-9]{4}$' },
                amount: { type: 'number', minimum: 0 }
              }
            }
          }
        }
      }
    };
    
    // Missing required fields
    const result = await enhancedExecutor.executeWithValidation(
      operation,
      { body: { payeeCode: '1111' } }, // Missing amount
      {}
    );
    
    if (result.success && 
        result.requiresUserInput &&
        result.type === 'collection_prompt' &&
        result.message.includes('amount')) {
      console.log(`${GREEN}✅ Missing parameters trigger collection${RESET}`);
      console.log(`   Session ID: ${result.sessionId}`);
      console.log(`   Collection ID: ${result.collectionId}`);
      console.log(`   Current field: ${result.currentField}`);
      passedTests++;
    } else {
      console.log(`${RED}❌ Collection trigger failed${RESET}`);
    }
  } catch (error) {
    console.log(`${RED}❌ Error: ${error.message}${RESET}`);
  }

  // Test 5: Complete Retry Flow - Collection to Execution
  console.log(`\n${YELLOW}Test 5: Complete Retry Flow - Collection to Execution${RESET}`);
  totalTests++;
  try {
    const mockExecutor = new MockApiExecutor();
    const enhancedExecutor = new EnhancedApiExecutor(mockExecutor);
    
    const operation = {
      operationId: 'test_complete_flow',
      method: 'POST',
      path: '/complete',
      servers: [{ url: 'https://api.example.com' }],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['amount'],
              properties: {
                amount: { type: 'number', minimum: 0 }
              }
            }
          }
        }
      }
    };
    
    // Step 1: Start with missing data
    const initialResult = await enhancedExecutor.executeWithValidation(
      operation,
      { body: {} }, // Missing amount
      {}
    );
    
    if (initialResult.requiresUserInput) {
      // Step 2: Provide missing data
      const continueResult = await enhancedExecutor.continueAfterUserInput(
        initialResult.sessionId,
        initialResult.collectionId,
        '50.00' // Provide the missing amount
      );
      
      if (continueResult.success && 
          continueResult.type === 'execution_success' &&
          continueResult.data) {
        console.log(`${GREEN}✅ Complete retry flow working${RESET}`);
        console.log(`   Final result: ${continueResult.data.data.result}`);
        console.log(`   Total attempts: ${continueResult.attempts}`);
        passedTests++;
      } else {
        console.log(`${RED}❌ Retry execution failed${RESET}`);
        console.log(`   Result type: ${continueResult.type}`);
      }
    } else {
      console.log(`${RED}❌ Initial collection trigger failed${RESET}`);
    }
  } catch (error) {
    console.log(`${RED}❌ Error: ${error.message}${RESET}`);
  }

  // Test 6: Invalid Input Retry Logic
  console.log(`\n${YELLOW}Test 6: Invalid Input Retry Logic${RESET}`);
  totalTests++;
  try {
    const mockExecutor = new MockApiExecutor();
    const enhancedExecutor = new EnhancedApiExecutor(mockExecutor);
    
    const operation = {
      operationId: 'test_invalid_retry',
      method: 'POST',
      path: '/validate',
      servers: [{ url: 'https://api.example.com' }],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['payeeCode'],
              properties: {
                payeeCode: { type: 'string', pattern: '^[0-9]{4}$' }
              }
            }
          }
        }
      }
    };
    
    // Start collection
    const initialResult = await enhancedExecutor.executeWithValidation(
      operation,
      { body: {} },
      {}
    );
    
    if (initialResult.requiresUserInput) {
      // Provide invalid input
      const invalidResult = await enhancedExecutor.continueAfterUserInput(
        initialResult.sessionId,
        initialResult.collectionId,
        'ABC1' // Invalid - should be 4 digits
      );
      
      if (invalidResult.success && 
          invalidResult.requiresUserInput &&
          invalidResult.error &&
          invalidResult.message.includes('try again')) {
        console.log(`${GREEN}✅ Invalid input retry logic working${RESET}`);
        console.log(`   Error: ${invalidResult.error}`);
        console.log(`   Attempts: ${invalidResult.attempts}`);
        passedTests++;
      } else {
        console.log(`${RED}❌ Invalid input retry failed${RESET}`);
      }
    } else {
      console.log(`${RED}❌ Collection setup failed${RESET}`);
    }
  } catch (error) {
    console.log(`${RED}❌ Error: ${error.message}${RESET}`);
  }

  // Test 7: Session Cleanup and Management
  console.log(`\n${YELLOW}Test 7: Session Cleanup and Management${RESET}`);
  totalTests++;
  try {
    const retryManager = new RetryManager();
    
    // Create a session
    const operation = { operationId: 'test_cleanup' };
    const session = retryManager.createRetrySession(operation, {}, {});
    
    // Check it exists
    const status1 = retryManager.getSessionStatus(session.sessionId);
    
    // Cancel the session
    const cancelResult = retryManager.cancelSession(session.sessionId);
    
    // Wait for cleanup
    await new Promise(resolve => setTimeout(resolve, 1100));
    
    // Check it's cleaned up
    const status2 = retryManager.getSessionStatus(session.sessionId);
    
    if (status1.exists && 
        cancelResult.success &&
        cancelResult.status === 'cancelled' &&
        !status2.exists) {
      console.log(`${GREEN}✅ Session cleanup and management working${RESET}`);
      console.log(`   Cancellation: ${cancelResult.success}`);
      console.log(`   Cleanup: ${!status2.exists}`);
      passedTests++;
    } else {
      console.log(`${RED}❌ Session cleanup failed${RESET}`);
    }
  } catch (error) {
    console.log(`${RED}❌ Error: ${error.message}${RESET}`);
  }

  // Test 8: Conversational Interface
  console.log(`\n${YELLOW}Test 8: Conversational Interface${RESET}`);
  totalTests++;
  try {
    const mockExecutor = new MockApiExecutor();
    const enhancedExecutor = new EnhancedApiExecutor(mockExecutor);
    const conversational = enhancedExecutor.createConversationalInterface();
    
    const operation = {
      operationId: 'test_conversational',
      method: 'POST',
      path: '/chat',
      servers: [{ url: 'https://api.example.com' }],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['message'],
              properties: {
                message: { type: 'string', minLength: 1 }
              }
            }
          }
        }
      }
    };
    
    // Start conversation with missing data
    const startResult = await conversational.startExecution(
      operation,
      { body: {} }, // Missing message
      {}
    );
    
    if (startResult.needsInput && 
        startResult.message &&
        startResult.sessionId &&
        startResult.collectionId) {
      console.log(`${GREEN}✅ Conversational interface working${RESET}`);
      console.log(`   Prompt generated: ${startResult.message.includes('message')}`);
      console.log(`   Session management: ${!!startResult.sessionId}`);
      passedTests++;
    } else {
      console.log(`${RED}❌ Conversational interface failed${RESET}`);
    }
  } catch (error) {
    console.log(`${RED}❌ Error: ${error.message}${RESET}`);
  }

  // Summary
  console.log('\n' + '=' . repeat(60));
  console.log(`${BLUE}📊 Checkpoint 3 Test Results${RESET}`);
  console.log('=' . repeat(60));
  
  const percentage = Math.round((passedTests / totalTests) * 100);
  const status = passedTests === totalTests ? GREEN : percentage >= 70 ? YELLOW : RED;
  
  console.log(`${status}Passed: ${passedTests}/${totalTests} tests (${percentage}%)${RESET}`);
  
  if (passedTests === totalTests) {
    console.log(`\n${GREEN}✅ CHECKPOINT 3 COMPLETE!${RESET}`);
    console.log('Retry & Recovery System working correctly.');
    console.log('\nKey achievements:');
    console.log('• Retry session management with progress tracking');
    console.log('• Enhanced API executor with validation pipeline');
    console.log('• Complete collection-to-execution retry flow');
    console.log('• Invalid input handling with retry logic');
    console.log('• Session cleanup and timeout management');
    console.log('• Conversational interface for natural interaction');
    console.log('• Full integration of validation → collection → retry → execution');
  } else {
    console.log(`\n${RED}❌ CHECKPOINT 3 INCOMPLETE${RESET}`);
    console.log('Some tests failed. Please fix the issues before proceeding.');
  }
  
  // Demo complete flow
  if (passedTests === totalTests) {
    console.log('\n' + '=' . repeat(60));
    console.log(`${BLUE}🎬 Demo: Complete Validation → Collection → Retry → Execution Flow${RESET}`);
    console.log('=' . repeat(60));
    
    console.log('\n1. User: "Pay my electricity bill for $50"');
    console.log('   System: Validates request → Missing payeeCode, billAcctNo');
    console.log('\n2. System: "I need some information:"');
    console.log('   💡 Payee Code: Which utility company? (4-digit code)');
    console.log('   Suggestions: 1111 (TNB), 2222 (Air Selangor)');
    console.log('\n3. User: "1111"');
    console.log('   System: ✅ Got it! Payee: Tenaga Nasional Berhad');
    console.log('   💡 Bill Account Number: Your account number');
    console.log('\n4. User: "210027549604"');
    console.log('   System: ✅ All information collected!');
    console.log('   🚀 Processing TNB bill payment of $50...');
    console.log('   ✅ Payment successful! Transaction ID: TXN123456');
    console.log('\n🎉 Complete seamless experience from validation to execution!');
  }
}

// Run the tests
testCheckpoint3().catch(console.error);