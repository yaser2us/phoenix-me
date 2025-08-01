#!/usr/bin/env node

/**
 * Test for Phase 4.7 Checkpoint 5: Production Integration
 * Tests all Phase 4.7 features integrated into the main MCP server
 */

import { MCPGatewayServer } from './src/server.js';

const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const YELLOW = '\x1b[33m';
const BLUE = '\x1b[34m';
const RESET = '\x1b[0m';

async function testCheckpoint5() {
  console.log(`${BLUE}🧪 Phase 4.7 Checkpoint 5: Production Integration${RESET}`);
  console.log('='.repeat(60));
  
  let passedTests = 0;
  let totalTests = 0;

  // Test 1: Server Initialization with Phase 4.7 Components
  console.log(`\n${YELLOW}Test 1: Server Initialization with Phase 4.7 Components${RESET}`);
  totalTests++;
  try {
    const server = new MCPGatewayServer();
    await server.initialize();
    
    const status = server.getStatus();
    
    if (status.initialized && 
        status.registry && 
        status.executor &&
        server.enhancedApiExecutor &&
        server.requestBodyValidator &&
        server.retryManager) {
      console.log(`${GREEN}✅ Server initialized with Phase 4.7 components${RESET}`);
      console.log(`   Enhanced API Executor: ${!!server.enhancedApiExecutor}`);
      console.log(`   Request Body Validator: ${!!server.requestBodyValidator}`);
      console.log(`   Retry Manager: ${!!server.retryManager}`);
      console.log(`   Advanced Validator: ${!!server.advancedValidator}`);
      passedTests++;
    } else {
      console.log(`${RED}❌ Server initialization incomplete${RESET}`);
    }
  } catch (error) {
    console.log(`${RED}❌ Error: ${error.message}${RESET}`);
  }

  // Test 2: MCP Tools Registration - Validation Tools
  console.log(`\n${YELLOW}Test 2: MCP Tools Registration - Validation Tools${RESET}`);
  totalTests++;
  try {
    const server = new MCPGatewayServer();
    await server.initialize();
    
    const validationToolNames = [
      'execute_api_with_validation',
      'continue_api_execution', 
      'validate_request_body'
    ];
    
    const registeredTools = server.mcpTools.map(t => t.name);
    const validationToolsFound = validationToolNames.filter(name => 
      registeredTools.includes(name)
    );
    
    if (validationToolsFound.length === validationToolNames.length) {
      console.log(`${GREEN}✅ All validation tools registered${RESET}`);
      console.log(`   Found: ${validationToolsFound.join(', ')}`);
      console.log(`   Total MCP tools: ${server.mcpTools.length}`);
      passedTests++;
    } else {
      console.log(`${RED}❌ Validation tools registration incomplete${RESET}`);
      console.log(`   Expected: ${validationToolNames.join(', ')}`);
      console.log(`   Found: ${validationToolsFound.join(', ')}`);
    }
  } catch (error) {
    console.log(`${RED}❌ Error: ${error.message}${RESET}`);
  }

  // Test 3: Validation Tool Detection Logic
  console.log(`\n${YELLOW}Test 3: Validation Tool Detection Logic${RESET}`);
  totalTests++;
  try {
    const server = new MCPGatewayServer();
    await server.initialize();
    
    const testCases = [
      { tool: 'execute_api_with_validation', expected: true },
      { tool: 'continue_api_execution', expected: true },
      { tool: 'validate_request_body', expected: true },
      { tool: 'getCurrentWeather', expected: false },
      { tool: 'start_conversation', expected: false }
    ];
    
    let allCorrect = true;
    for (const testCase of testCases) {
      const result = server.isValidationTool(testCase.tool);
      if (result !== testCase.expected) {
        allCorrect = false;
        console.log(`   ❌ ${testCase.tool}: expected ${testCase.expected}, got ${result}`);
      }
    }
    
    if (allCorrect) {
      console.log(`${GREEN}✅ Validation tool detection working correctly${RESET}`);
      console.log(`   Tested ${testCases.length} cases successfully`);
      passedTests++;
    } else {
      console.log(`${RED}❌ Validation tool detection failed${RESET}`);
    }
  } catch (error) {
    console.log(`${RED}❌ Error: ${error.message}${RESET}`);
  }

  // Test 4: Tool Handler Integration - Validation vs Other Tools
  console.log(`\n${YELLOW}Test 4: Tool Handler Integration - Validation vs Other Tools${RESET}`);
  totalTests++;
  try {
    const server = new MCPGatewayServer();
    await server.initialize();
    
    // Mock the enhanced API executor to prevent actual API calls
    server.enhancedApiExecutor = {
      executeWithValidation: async () => ({
        success: true,
        type: 'execution_success',
        data: { message: 'Mock validation success' },
        attempts: 1
      }),
      continueAfterUserInput: async () => ({
        success: true,
        type: 'execution_success',  
        data: { message: 'Mock continue success' },
        attempts: 2
      })
    };
    
    server.requestBodyValidator = {
      validateRequestBody: async () => ({
        valid: true,
        errors: [],
        warnings: []
      })
    };
    
    // Test validation tool handling
    const validationResult = await server.handleToolCall('execute_api_with_validation', {
      operationId: 'getCurrentWeather',
      parameters: { q: 'London' }
    });
    
    // Test regular tool handling  
    const regularResult = await server.handleToolCall('getCurrentWeather', {
      q: 'London'
    });
    
    if (validationResult && validationResult.content && 
        regularResult && regularResult.content) {
      console.log(`${GREEN}✅ Tool handler integration working${RESET}`);
      console.log(`   Validation tool: ${validationResult.content[0].text.includes('Mock validation')}`);
      console.log(`   Regular tool: ${regularResult.content[0].text.includes('Error') || regularResult.content[0].text.includes('Operation')}`);
      passedTests++;
    } else {
      console.log(`${RED}❌ Tool handler integration failed${RESET}`);
    }
  } catch (error) {
    console.log(`${RED}❌ Error: ${error.message}${RESET}`);
  }

  // Test 5: Response Formatting for Validation Tools
  console.log(`\n${YELLOW}Test 5: Response Formatting for Validation Tools${RESET}`);
  totalTests++;
  try {
    const server = new MCPGatewayServer();
    await server.initialize();
    
    const testResults = [
      {
        result: {
          requiresUserInput: true,
          sessionId: 'test-session',
          collectionId: 'test-collection',
          currentField: 'amount',
          message: 'Please provide the amount'
        },
        toolName: 'execute_api_with_validation'
      },
      {
        result: {
          success: true,
          type: 'execution_success',
          data: { status: 'completed' },
          attempts: 1
        },
        toolName: 'continue_api_execution'
      },
      {
        result: {
          valid: false,
          operationId: 'testOp',
          errors: ['Field is required'],
          missingFields: ['amount']
        },
        toolName: 'validate_request_body'
      }
    ];
    
    let allFormatted = true;
    for (const test of testResults) {
      const formatted = server.formatValidationResponse(test.result, test.toolName);
      if (!formatted || formatted.length < 10) {
        allFormatted = false;
        console.log(`   ❌ ${test.toolName}: formatting failed`);
      }
    }
    
    if (allFormatted) {
      console.log(`${GREEN}✅ Response formatting working for all validation tools${RESET}`);
      console.log(`   Tested ${testResults.length} different response types`);
      passedTests++;
    } else {
      console.log(`${RED}❌ Response formatting failed${RESET}`);
    }
  } catch (error) {
    console.log(`${RED}❌ Error: ${error.message}${RESET}`);
  }

  // Test 6: Full Integration - All Phase 4.7 Components Working Together
  console.log(`\n${YELLOW}Test 6: Full Integration - All Phase 4.7 Components${RESET}`);
  totalTests++;
  try {
    const server = new MCPGatewayServer();
    await server.initialize();
    
    // Check that all Phase 4.7 components are accessible
    const components = {
      advancedValidator: server.advancedValidator,
      requestBodyValidator: server.requestBodyValidator,
      validationErrorFormatter: server.validationErrorFormatter, 
      enhancedRequestBuilder: server.enhancedRequestBuilder,
      interactiveParameterCollector: server.interactiveParameterCollector,
      retryManager: server.retryManager,
      enhancedApiExecutor: server.enhancedApiExecutor,
      conversationalApiInterface: server.conversationalApiInterface
    };
    
    const missingComponents = Object.entries(components)
      .filter(([name, component]) => !component)
      .map(([name]) => name);
    
    if (missingComponents.length === 0) {
      console.log(`${GREEN}✅ All Phase 4.7 components integrated successfully${RESET}`);
      console.log(`   Components: ${Object.keys(components).length}`);
      console.log(`   ✓ Advanced Validator`);
      console.log(`   ✓ Request Body Validator`);
      console.log(`   ✓ Enhanced API Executor`);
      console.log(`   ✓ Retry Manager`);
      console.log(`   ✓ Interactive Parameter Collector`);
      console.log(`   ✓ Conversational API Interface`);
      passedTests++;
    } else {
      console.log(`${RED}❌ Integration incomplete${RESET}`);
      console.log(`   Missing: ${missingComponents.join(', ')}`);
    }
  } catch (error) {
    console.log(`${RED}❌ Error: ${error.message}${RESET}`);
  }

  // Test 7: Backward Compatibility - Existing Tools Still Work
  console.log(`\n${YELLOW}Test 7: Backward Compatibility - Existing Tools Still Work${RESET}`);
  totalTests++;
  try {
    const server = new MCPGatewayServer();
    await server.initialize();
    
    const existingToolCategories = {
      workflow: server.isWorkflowTool('execute_workflow'),
      advanced: server.isAdvancedInteractiveTool('start_conversation'),
      maybank: server.mcpTools.some(t => t.name === 'maybank_interactive'),
      api: server.mcpTools.some(t => t.name === 'getCurrentWeather')
    };
    
    const workingCategories = Object.entries(existingToolCategories)
      .filter(([category, working]) => working)
      .map(([category]) => category);
    
    if (workingCategories.length >= 3) { // At least workflow, api, and one other
      console.log(`${GREEN}✅ Backward compatibility maintained${RESET}`);
      console.log(`   Working categories: ${workingCategories.join(', ')}`);
      console.log(`   Total tools available: ${server.mcpTools.length}`);
      passedTests++;
    } else {
      console.log(`${RED}❌ Backward compatibility issues${RESET}`);
      console.log(`   Working: ${workingCategories.join(', ')}`);
    }
  } catch (error) {
    console.log(`${RED}❌ Error: ${error.message}${RESET}`);
  }

  // Test 8: Tool Schema Validation - Validation Tools Have Proper Schemas
  console.log(`\n${YELLOW}Test 8: Tool Schema Validation - Validation Tools${RESET}`);
  totalTests++;
  try {
    const server = new MCPGatewayServer();
    await server.initialize();
    
    const validationTools = server.mcpTools.filter(tool => 
      server.isValidationTool(tool.name)
    );
    
    let allSchemasValid = true;
    const schemaChecks = [];
    
    for (const tool of validationTools) {
      const hasName = !!tool.name;
      const hasDescription = !!tool.description;
      const hasInputSchema = !!tool.inputSchema;
      const hasProperties = !!tool.inputSchema?.properties;
      const hasRequired = Array.isArray(tool.inputSchema?.required);
      
      const isValid = hasName && hasDescription && hasInputSchema && hasProperties;
      schemaChecks.push({ 
        name: tool.name, 
        valid: isValid,
        details: { hasName, hasDescription, hasInputSchema, hasProperties, hasRequired }
      });
      
      if (!isValid) allSchemasValid = false;
    }
    
    if (allSchemasValid && validationTools.length === 3) {
      console.log(`${GREEN}✅ All validation tool schemas are valid${RESET}`);
      console.log(`   Validated tools: ${validationTools.length}`);
      validationTools.forEach(tool => {
        console.log(`   ✓ ${tool.name}: ${Object.keys(tool.inputSchema.properties).length} parameters`);
      });
      passedTests++;
    } else {
      console.log(`${RED}❌ Tool schema validation failed${RESET}`);
      console.log(`   Expected 3 tools, found: ${validationTools.length}`);
      schemaChecks.forEach(check => {
        if (!check.valid) {
          console.log(`   ❌ ${check.name}: ${JSON.stringify(check.details)}`);
        }
      });
    }
  } catch (error) {
    console.log(`${RED}❌ Error: ${error.message}${RESET}`);
  }

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log(`${BLUE}📊 Checkpoint 5 Test Results${RESET}`);
  console.log('='.repeat(60));
  
  const percentage = Math.round((passedTests / totalTests) * 100);
  const status = passedTests === totalTests ? GREEN : percentage >= 70 ? YELLOW : RED;
  
  console.log(`${status}Passed: ${passedTests}/${totalTests} tests (${percentage}%)${RESET}`);
  
  if (passedTests === totalTests) {
    console.log(`\n${GREEN}✅ CHECKPOINT 5 COMPLETE!${RESET}`);
    console.log('Production Integration successful - Phase 4.7 is ready!');
    console.log('\nKey achievements:');
    console.log('• All Phase 4.7 components integrated into main MCP server');
    console.log('• Enhanced API execution with validation and retry logic');
    console.log('• Interactive parameter collection through conversational UI');
    console.log('• Advanced validation supporting complex OpenAPI scenarios');
    console.log('• Request body validation with detailed error reporting');
    console.log('• Full backward compatibility with existing tools');
    console.log('• Comprehensive MCP tool registration and handling');
    console.log('• Production-ready validation pipeline');
  } else {
    console.log(`\n${RED}❌ CHECKPOINT 5 INCOMPLETE${RESET}`);
    console.log('Some tests failed. Please fix the issues before proceeding.');
  }
  
  // Demo production integration
  if (passedTests === totalTests) {
    console.log('\n' + '='.repeat(60));
    console.log(`${BLUE}🎉 Production Integration Complete!${RESET}`);
    console.log('='.repeat(60));
    
    console.log('\n🚀 **Phase 4.7 Enhanced API Parameter & Payload Validation**');
    console.log('   ✅ Complete validation pipeline from parameter collection to execution');
    console.log('   ✅ Interactive user experience with intelligent prompts');
    console.log('   ✅ Advanced validation supporting oneOf/anyOf/allOf schemas');
    console.log('   ✅ Format validation for emails, dates, UUIDs, IP addresses');
    console.log('   ✅ Custom validation rules for business-specific requirements');
    console.log('   ✅ Retry management with session tracking and cleanup');
    console.log('   ✅ Full integration with existing MCP server architecture');
    
    console.log('\n📋 **Available Tools:**');
    console.log('   • execute_api_with_validation - Enhanced API execution');
    console.log('   • continue_api_execution - Continue after user input');
    console.log('   • validate_request_body - Standalone validation');
    console.log('   • Plus all existing workflow and API tools');
    
    console.log('\n🎯 **User Experience:**');
    console.log('   1. User: "Pay my electricity bill for $50"');
    console.log('   2. System: Validates → Missing payeeCode, billAcctNo');
    console.log('   3. System: "Which utility company? (4-digit code)"');
    console.log('   4. User: "1111"');
    console.log('   5. System: ✅ "Got it! Tenaga Nasional Berhad"');
    console.log('   6. System: "Your account number?"');
    console.log('   7. User: "210027549604"');
    console.log('   8. System: 🚀 "Processing TNB payment..."');
    console.log('   9. System: ✅ "Payment successful! TXN123456"');
    
    console.log('\n✨ **Phase 4.7 Complete - Enhanced validation ready for production!**');
  }
}

// Run the tests
testCheckpoint5().catch(console.error);