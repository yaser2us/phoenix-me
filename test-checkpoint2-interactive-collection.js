#!/usr/bin/env node

/**
 * Test for Phase 4.7 Checkpoint 2: Interactive Parameter Collection
 * Tests user-friendly prompting and collection of missing parameters/body fields
 */

import { ValidationErrorFormatter } from './src/validation/validation-error-formatter.js';
import { InteractiveParameterCollector } from './src/interaction/interactive-parameter-collector.js';
import { EnhancedRequestBuilder } from './src/execution/enhanced-request-builder.js';

const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const YELLOW = '\x1b[33m';
const BLUE = '\x1b[34m';
const RESET = '\x1b[0m';

async function testCheckpoint2() {
  console.log(`${BLUE}🧪 Phase 4.7 Checkpoint 2: Interactive Parameter Collection${RESET}`);
  console.log('=' . repeat(60));
  
  let passedTests = 0;
  let totalTests = 0;

  // Test 1: Validation Error Formatter - Basic Missing Field
  console.log(`\n${YELLOW}Test 1: Error Formatter - Missing Field Prompts${RESET}`);
  totalTests++;
  try {
    const formatter = new ValidationErrorFormatter();
    
    const validationResult = {
      valid: false,
      missingFields: ['payeeCode', 'billAcctNo', 'amount']
    };
    
    const schema = {
      type: 'object',
      required: ['payeeCode', 'billAcctNo', 'amount'],
      properties: {
        payeeCode: { type: 'string', pattern: '^[0-9]{4}$' },
        billAcctNo: { type: 'string', minLength: 10 },
        amount: { type: 'number', minimum: 0 }
      }
    };
    
    const prompts = formatter.formatValidationPrompts(validationResult, schema);
    
    if (prompts.length === 3 && 
        prompts[0].fieldName === 'payeeCode' &&
        prompts[0].suggestions.length > 0) {
      console.log(`${GREEN}✅ Missing field prompts generated correctly${RESET}`);
      console.log(`   Generated ${prompts.length} prompts with suggestions`);
      passedTests++;
    } else {
      console.log(`${RED}❌ Missing field prompt generation failed${RESET}`);
    }
  } catch (error) {
    console.log(`${RED}❌ Error: ${error.message}${RESET}`);
  }

  // Test 2: Conversational Message Formatting
  console.log(`\n${YELLOW}Test 2: Conversational Message Generation${RESET}`);
  totalTests++;
  try {
    const formatter = new ValidationErrorFormatter();
    
    const prompts = [
      {
        fieldPath: 'payeeCode',
        fieldName: 'payeeCode',
        type: 'missing',
        message: '💡 **Payee Code**: The biller/merchant code (specific format required)',
        suggestions: [
          { value: '1111', label: '1111 - Tenaga Nasional Berhad (TNB)' },
          { value: '2222', label: '2222 - Air Selangor' }
        ]
      },
      {
        fieldPath: 'amount',
        fieldName: 'amount',
        type: 'missing',
        message: '💡 **Amount**: Please provide Amount (number)',
        suggestions: ['10', '50', '100']
      }
    ];
    
    const message = formatter.formatConversationalMessage(prompts);
    
    if (message.includes('I need some information') && 
        message.includes('Suggestions') &&
        message.includes('payeeCode')) {
      console.log(`${GREEN}✅ Conversational message formatted correctly${RESET}`);
      console.log(`   Preview: ${message.split('\n')[0]}`);
      passedTests++;
    } else {
      console.log(`${RED}❌ Conversational message formatting failed${RESET}`);
    }
  } catch (error) {
    console.log(`${RED}❌ Error: ${error.message}${RESET}`);
  }

  // Test 3: Interactive Collector - Initialize Collection
  console.log(`\n${YELLOW}Test 3: Interactive Collector - Start Collection${RESET}`);
  totalTests++;
  try {
    const collector = new InteractiveParameterCollector();
    
    const operation = {
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['payeeCode', 'billAcctNo', 'amount'],
              properties: {
                payeeCode: { type: 'string', pattern: '^[0-9]{4}$' },
                billAcctNo: { type: 'string', minLength: 10 },
                amount: { type: 'number', minimum: 0 }
              }
            }
          }
        }
      }
    };
    
    const currentData = { body: { payeeCode: '1111' } }; // Has payeeCode, missing others
    
    const validationResult = {
      valid: false,
      missingFields: ['billAcctNo', 'amount']
    };
    
    const result = await collector.collectMissingData(
      operation,
      currentData,
      validationResult
    );
    
    if (result.success && 
        !result.complete && 
        result.needsInput &&
        result.prompts.length === 2) {
      console.log(`${GREEN}✅ Collection initialized successfully${RESET}`);
      console.log(`   Collection ID: ${result.collectionId}`);
      console.log(`   Fields to collect: ${result.totalFields}`);
      passedTests++;
    } else {
      console.log(`${RED}❌ Collection initialization failed${RESET}`);
    }
  } catch (error) {
    console.log(`${RED}❌ Error: ${error.message}${RESET}`);
  }

  // Test 4: Process Valid User Input
  console.log(`\n${YELLOW}Test 4: Process Valid User Input${RESET}`);
  totalTests++;
  try {
    const collector = new InteractiveParameterCollector();
    
    // First, start a collection
    const operation = {
      requestBody: {
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['billAcctNo'],
              properties: {
                billAcctNo: { type: 'string', minLength: 10 }
              }
            }
          }
        }
      }
    };
    
    const initResult = await collector.collectMissingData(
      operation,
      { body: {} },
      { valid: false, missingFields: ['billAcctNo'] }
    );
    
    // Process user input
    const processResult = await collector.processUserInput(
      initResult.collectionId,
      '210027549604' // Valid 12-character account number
    );
    
    if (processResult.success && processResult.complete) {
      console.log(`${GREEN}✅ Valid user input processed correctly${RESET}`);
      console.log(`   Collected value: ${processResult.data.body.billAcctNo}`);
      passedTests++;
    } else {
      console.log(`${RED}❌ Valid input processing failed${RESET}`);
    }
  } catch (error) {
    console.log(`${RED}❌ Error: ${error.message}${RESET}`);
  }

  // Test 5: Process Invalid User Input
  console.log(`\n${YELLOW}Test 5: Process Invalid User Input${RESET}`);
  totalTests++;
  try {
    const collector = new InteractiveParameterCollector();
    
    // Start collection for a field with pattern validation
    const operation = {
      requestBody: {
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
    
    const initResult = await collector.collectMissingData(
      operation,
      { body: {} },
      { valid: false, missingFields: ['payeeCode'] }
    );
    
    // Process invalid input
    const processResult = await collector.processUserInput(
      initResult.collectionId,
      'ABC1' // Invalid - should be 4 digits
    );
    
    if (processResult.success && 
        !processResult.complete &&
        processResult.needsInput &&
        processResult.error) {
      console.log(`${GREEN}✅ Invalid input handled with retry prompt${RESET}`);
      console.log(`   Error: ${processResult.error}`);
      console.log(`   Retry message includes: ${processResult.message.includes('try again') ? 'Yes' : 'No'}`);
      passedTests++;
    } else {
      console.log(`${RED}❌ Invalid input handling failed${RESET}`);
    }
  } catch (error) {
    console.log(`${RED}❌ Error: ${error.message}${RESET}`);
  }

  // Test 6: Multi-Field Collection Flow
  console.log(`\n${YELLOW}Test 6: Multi-Field Collection Flow${RESET}`);
  totalTests++;
  try {
    const collector = new InteractiveParameterCollector();
    
    const operation = {
      requestBody: {
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
    
    // Start collection
    const initResult = await collector.collectMissingData(
      operation,
      { body: {} },
      { valid: false, missingFields: ['payeeCode', 'amount'] }
    );
    
    // Provide first field
    const result1 = await collector.processUserInput(
      initResult.collectionId,
      '1111' // Valid payee code
    );
    
    // Check if it asks for next field
    if (result1.success && 
        !result1.complete && 
        result1.currentField === 'amount') {
      
      // Provide second field
      const result2 = await collector.processUserInput(
        initResult.collectionId,
        '50.00' // Valid amount
      );
      
      if (result2.success && result2.complete) {
        console.log(`${GREEN}✅ Multi-field collection flow working${RESET}`);
        console.log(`   Collected: payeeCode=${result2.data.body.payeeCode}, amount=${result2.data.body.amount}`);
        passedTests++;
      } else {
        console.log(`${RED}❌ Second field collection failed${RESET}`);
      }
    } else {
      console.log(`${RED}❌ Multi-field flow failed at first field${RESET}`);
    }
  } catch (error) {
    console.log(`${RED}❌ Error: ${error.message}${RESET}`);
  }

  // Test 7: Nested Object Collection
  console.log(`\n${YELLOW}Test 7: Nested Object Field Collection${RESET}`);
  totalTests++;
  try {
    const collector = new InteractiveParameterCollector();
    
    const operation = {
      requestBody: {
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['user'],
              properties: {
                user: {
                  type: 'object',
                  required: ['name', 'email'],
                  properties: {
                    name: { type: 'string' },
                    email: { type: 'string', pattern: '^[^@]+@[^@]+\\.[^@]+$' }
                  }
                }
              }
            }
          }
        }
      }
    };
    
    const validationResult = {
      valid: false,
      missingFields: ['user.name', 'user.email']
    };
    
    const result = await collector.collectMissingData(
      operation,
      { body: {} },
      validationResult
    );
    
    if (result.success && 
        result.prompts.length === 2 &&
        result.currentField === 'user.name') {
      console.log(`${GREEN}✅ Nested object collection initialized${RESET}`);
      console.log(`   First field: ${result.currentField}`);
      passedTests++;
    } else {
      console.log(`${RED}❌ Nested object collection failed${RESET}`);
    }
  } catch (error) {
    console.log(`${RED}❌ Error: ${error.message}${RESET}`);
  }

  // Test 8: Integration with Enhanced Request Builder
  console.log(`\n${YELLOW}Test 8: Integration with Request Builder${RESET}`);
  totalTests++;
  try {
    const builder = new EnhancedRequestBuilder();
    const collector = new InteractiveParameterCollector();
    
    const operationSpec = {
      servers: [{ url: 'https://api.example.com' }],
      method: 'POST',
      path: '/bill/payment',
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['payeeCode', 'billAcctNo', 'amount'],
              properties: {
                payeeCode: { type: 'string', pattern: '^[0-9]{4}$' },
                billAcctNo: { type: 'string', minLength: 10 },
                amount: { type: 'number', minimum: 0 }
              }
            }
          }
        }
      }
    };
    
    // Try to build with incomplete data
    const buildResult = await builder.buildRequest(
      operationSpec,
      { body: { payeeCode: '1111' } }, // Missing billAcctNo and amount
      {}
    );
    
    if (!buildResult.success && buildResult.needsUserInput) {
      // Use collector to get missing data
      const collectionResult = await collector.collectMissingData(
        operationSpec,
        { body: { payeeCode: '1111' } },
        buildResult.validation.body
      );
      
      if (collectionResult.needsInput && 
          collectionResult.prompts.length === 2) {
        console.log(`${GREEN}✅ Integration with request builder working${RESET}`);
        console.log(`   Missing fields detected: ${buildResult.missingFields.join(', ')}`);
        console.log(`   Ready to collect: ${collectionResult.prompts.map(p => p.fieldName).join(', ')}`);
        passedTests++;
      } else {
        console.log(`${RED}❌ Collection setup failed${RESET}`);
      }
    } else {
      console.log(`${RED}❌ Request builder integration failed${RESET}`);
    }
  } catch (error) {
    console.log(`${RED}❌ Error: ${error.message}${RESET}`);
  }

  // Summary
  console.log('\n' + '=' . repeat(60));
  console.log(`${BLUE}📊 Checkpoint 2 Test Results${RESET}`);
  console.log('=' . repeat(60));
  
  const percentage = Math.round((passedTests / totalTests) * 100);
  const status = passedTests === totalTests ? GREEN : percentage >= 70 ? YELLOW : RED;
  
  console.log(`${status}Passed: ${passedTests}/${totalTests} tests (${percentage}%)${RESET}`);
  
  if (passedTests === totalTests) {
    console.log(`\n${GREEN}✅ CHECKPOINT 2 COMPLETE!${RESET}`);
    console.log('Interactive parameter collection working correctly.');
    console.log('\nKey achievements:');
    console.log('• User-friendly error formatting with suggestions');
    console.log('• Conversational prompts for missing fields');
    console.log('• Interactive collection session management');
    console.log('• Input validation with retry handling');
    console.log('• Multi-field collection flow');
    console.log('• Nested object field support');
    console.log('• Integration with request builder');
  } else {
    console.log(`\n${RED}❌ CHECKPOINT 2 INCOMPLETE${RESET}`);
    console.log('Some tests failed. Please fix the issues before proceeding.');
  }
  
  // Demo interaction
  if (passedTests === totalTests) {
    console.log('\n' + '=' . repeat(60));
    console.log(`${BLUE}📝 Demo: Interactive Collection Experience${RESET}`);
    console.log('=' . repeat(60));
    
    console.log('\nUser: "Pay my electricity bill"');
    console.log('\nSystem: I need some information to proceed:\n');
    console.log('💡 **Bill Acct No**: Your account number with the biller');
    console.log('   Suggestions: 210027549604\n');
    console.log('💡 **Amount**: The payment amount (number)');
    console.log('   Suggestions: 10, 50, 100\n');
    console.log('Let\'s start with the Bill Acct No:\n');
    console.log('User: "210027549604"');
    console.log('\nSystem: ✅ Got it! Bill Acct No = 210027549604\n');
    console.log('💡 **Amount**: The payment amount (number)');
    console.log('   Suggestions: 10, 50, 100\n');
    console.log('User: "$50"');
    console.log('\nSystem: ✅ All information collected successfully!');
  }
}

// Run the tests
testCheckpoint2().catch(console.error);