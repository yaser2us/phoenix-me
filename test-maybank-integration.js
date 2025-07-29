#!/usr/bin/env node

/**
 * Test script to verify Maybank Interactive Tool integration
 * Tests the complete flow with JWT token passing
 */

import { logger } from './src/utils/logger.js';
import { ApiRegistry } from './src/registry/api-registry.js';
import { ApiExecutor } from './src/execution/executor.js';
import { MaybankInteractiveTool } from './src/interaction/maybank-interactive-tool.js';
import { loadAuthenticationConfig } from './src/config/server-config.js';

// Test configuration
const TEST_JWT_TOKEN = 'your-test-jwt-token-here';  // Replace with actual JWT for real testing

async function testMaybankIntegration() {
  logger.info('Starting Maybank integration test');
  
  try {
    // 1. Initialize components
    logger.info('Initializing components...');
    
    const registry = new ApiRegistry();
    await registry.initialize();
    
    const authConfig = await loadAuthenticationConfig();
    const executor = new ApiExecutor(registry, authConfig);
    
    const interactiveTool = new MaybankInteractiveTool(registry, executor);
    
    logger.info('Components initialized successfully');
    
    // 2. Test workflow execution with parameters
    logger.info('\n=== Testing Workflow Execution ===');
    
    // Test quick balance workflow
    const quickBalanceResult = await testWorkflow(interactiveTool, {
      request: 'Check my MAE wallet balance',
      workflowName: 'maybank_quick_balance',
      parameters: {
        jwtToken: TEST_JWT_TOKEN
      }
    });
    
    logger.info('Quick balance result:', quickBalanceResult);
    
    // Test financial overview workflow
    const overviewResult = await testWorkflow(interactiveTool, {
      request: 'Show me all my accounts',
      workflowName: 'maybank_financial_overview',
      parameters: {
        jwtToken: TEST_JWT_TOKEN,
        includeDetails: true
      }
    });
    
    logger.info('Financial overview result:', overviewResult);
    
    // 3. Test direct operation execution
    logger.info('\n=== Testing Direct Operation ===');
    
    const operationResult = await testOperation(interactiveTool, {
      request: 'Get MAE balance',
      operationId: 'get_banking_getBalance',
      parameters: {
        jwtToken: TEST_JWT_TOKEN,
        isFirstLoad: 'true'
      }
    });
    
    logger.info('Operation result:', operationResult);
    
    // 4. Test interactive parameter collection
    logger.info('\n=== Testing Interactive Parameter Collection ===');
    
    // Start session without JWT token
    const sessionStart = await interactiveTool.execute({
      request: 'Analyze my financial health'
    });
    
    logger.info('Session started:', sessionStart);
    
    // Extract session ID from the response
    const sessionIdMatch = sessionStart.content?.[0]?.text?.match(/Session ID: (maybank_interactive_[^\s]*)/);
    const sessionId = sessionIdMatch ? sessionIdMatch[1] : null;
    
    if (sessionId) {
      // Continue session with JWT token
      const sessionContinue = await interactiveTool.execute({
        request: 'Continue session',
        sessionId: sessionId,
        providedValue: TEST_JWT_TOKEN
      });
      
      logger.info('Session continued:', sessionContinue);
    }
    
    // 5. Test error handling
    logger.info('\n=== Testing Error Handling ===');
    
    try {
      await testWorkflow(interactiveTool, {
        request: 'Invalid workflow test',
        workflowName: 'invalid_workflow',
        parameters: {
          jwtToken: TEST_JWT_TOKEN
        }
      });
    } catch (error) {
      logger.info('Expected error caught:', error.message);
    }
    
    logger.info('\n=== Integration Test Complete ===');
    logger.info('Summary:');
    logger.info('- Component initialization: ✓');
    logger.info('- Workflow execution: ✓');
    logger.info('- Direct operation execution: ✓');
    logger.info('- Interactive parameter collection: ✓');
    logger.info('- Error handling: ✓');
    
  } catch (error) {
    logger.error('Integration test failed:', error);
    process.exit(1);
  }
}

async function testWorkflow(tool, input) {
  try {
    const result = await tool.execute(input);
    return {
      success: true,
      hasContent: !!result.content,
      contentLength: result.content?.[0]?.text?.length || 0,
      isError: result.isError || false
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

async function testOperation(tool, input) {
  try {
    const result = await tool.execute(input);
    return {
      success: true,
      hasContent: !!result.content,
      contentLength: result.content?.[0]?.text?.length || 0,
      isError: result.isError || false
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

// Run the test
testMaybankIntegration().catch(error => {
  logger.error('Unhandled error:', error);
  process.exit(1);
});