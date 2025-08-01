#!/usr/bin/env node

/**
 * Test for Phase 4.7 Checkpoint 1: Request Body Validation Foundation
 * Tests schema resolution, body validation, and enhanced request building
 */

import { SchemaResolver } from './src/validation/schema-resolver.js';
import { RequestBodyValidator } from './src/validation/request-body-validator.js';
import { EnhancedRequestBuilder } from './src/execution/enhanced-request-builder.js';
import fs from 'fs/promises';

const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const YELLOW = '\x1b[33m';
const BLUE = '\x1b[34m';
const RESET = '\x1b[0m';

async function testCheckpoint1() {
  console.log(`${BLUE}🧪 Phase 4.7 Checkpoint 1: Request Body Validation Foundation${RESET}`);
  console.log('=' . repeat(60));
  
  let passedTests = 0;
  let totalTests = 0;

  // Test 1: Schema Resolver - Basic Reference Resolution
  console.log(`\n${YELLOW}Test 1: Schema Reference Resolution${RESET}`);
  totalTests++;
  try {
    const resolver = new SchemaResolver();
    
    const components = {
      schemas: {
        'bills_getBillsTxnHistory_body': {
          type: 'object',
          required: ['payeeCode', 'billAcctNo'],
          properties: {
            payeeCode: { type: 'string', pattern: '^[0-9]{4}$' },
            billAcctNo: { type: 'string', minLength: 10 },
            fullName: { type: 'string', maxLength: 100 }
          }
        }
      }
    };
    
    const schemaWithRef = {
      $ref: '#/components/schemas/bills_getBillsTxnHistory_body'
    };
    
    const resolved = resolver.resolveSchema(schemaWithRef, components);
    
    if (resolved.type === 'object' && 
        resolved.required?.includes('payeeCode') &&
        resolved.properties?.payeeCode?.pattern === '^[0-9]{4}$') {
      console.log(`${GREEN}✅ Schema reference resolution working${RESET}`);
      passedTests++;
    } else {
      console.log(`${RED}❌ Schema reference resolution failed${RESET}`);
    }
  } catch (error) {
    console.log(`${RED}❌ Error: ${error.message}${RESET}`);
  }

  // Test 2: Request Body Validator - Valid Body
  console.log(`\n${YELLOW}Test 2: Request Body Validation - Valid Body${RESET}`);
  totalTests++;
  try {
    const validator = new RequestBodyValidator();
    
    const operationSpec = {
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['payeeCode', 'billAcctNo'],
              properties: {
                payeeCode: { type: 'string', pattern: '^[0-9]{4}$' },
                billAcctNo: { type: 'string', minLength: 10 }
              }
            }
          }
        }
      }
    };
    
    const validBody = {
      payeeCode: '1111',
      billAcctNo: '210027549604',
      fullName: 'Tenaga Nasional Berhad'
    };
    
    const result = await validator.validateRequestBody(validBody, operationSpec);
    
    if (result.valid) {
      console.log(`${GREEN}✅ Valid body passes validation${RESET}`);
      passedTests++;
    } else {
      console.log(`${RED}❌ Valid body failed validation: ${result.errors.join(', ')}${RESET}`);
    }
  } catch (error) {
    console.log(`${RED}❌ Error: ${error.message}${RESET}`);
  }

  // Test 3: Request Body Validator - Missing Required Fields
  console.log(`\n${YELLOW}Test 3: Request Body Validation - Missing Fields${RESET}`);
  totalTests++;
  try {
    const validator = new RequestBodyValidator();
    
    const operationSpec = {
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
    
    const incompleteBody = {
      payeeCode: '1111'
      // Missing billAcctNo and amount
    };
    
    const result = await validator.validateRequestBody(incompleteBody, operationSpec);
    
    if (!result.valid && 
        result.missingFields.includes('billAcctNo') &&
        result.missingFields.includes('amount')) {
      console.log(`${GREEN}✅ Missing fields detected correctly${RESET}`);
      console.log(`   Missing: ${result.missingFields.join(', ')}`);
      passedTests++;
    } else {
      console.log(`${RED}❌ Missing fields detection failed${RESET}`);
    }
  } catch (error) {
    console.log(`${RED}❌ Error: ${error.message}${RESET}`);
  }

  // Test 4: Request Body Validator - Invalid Pattern
  console.log(`\n${YELLOW}Test 4: Request Body Validation - Pattern Validation${RESET}`);
  totalTests++;
  try {
    const validator = new RequestBodyValidator();
    
    const operationSpec = {
      requestBody: {
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                payeeCode: { type: 'string', pattern: '^[0-9]{4}$' },
                email: { type: 'string', pattern: '^[^@]+@[^@]+\\.[^@]+$' }
              }
            }
          }
        }
      }
    };
    
    const invalidBody = {
      payeeCode: 'ABC1', // Should be 4 digits
      email: 'invalid-email' // Invalid email format
    };
    
    const result = await validator.validateRequestBody(invalidBody, operationSpec);
    
    if (!result.valid && result.errors.length > 0) {
      console.log(`${GREEN}✅ Pattern validation working${RESET}`);
      console.log(`   Errors: ${result.errors[0]}`);
      passedTests++;
    } else {
      console.log(`${RED}❌ Pattern validation failed${RESET}`);
    }
  } catch (error) {
    console.log(`${RED}❌ Error: ${error.message}${RESET}`);
  }

  // Test 5: Enhanced Request Builder - POST with Body
  console.log(`\n${YELLOW}Test 5: Enhanced Request Builder - POST with Body${RESET}`);
  totalTests++;
  try {
    const builder = new EnhancedRequestBuilder();
    
    // Load bill spec for real test
    const billSpec = JSON.parse(await fs.readFile('./src/registry/specs/bill.json', 'utf8'));
    const operationSpec = {
      ...billSpec.paths['/bill/v2/bills/getBillsTxnHistory'].post,
      servers: billSpec.servers,
      method: 'POST',
      path: '/bill/v2/bills/getBillsTxnHistory'
    };
    
    const userParams = {
      // Headers
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      'X-APP-PLATFORM': 'IOS',
      'X-APP-VERSION': '0.9.38',
      'X-APP-ENVIRONMENT': '',
      'X-APP-BUILD-NO': '1203',
      'X-APP-RELEASE-NO': '25.5.0',
      'X-APP-SESSION-TRACE-ID': 'test123',
      // Body data
      body: {
        payeeCode: '1111',
        billAcctNo: '210027549604',
        favBillPaymentStep2: '17',
        gstNotesFavPaymentStep2: 'gstnotesfavpaystep2',
        fullName: 'Tenaga Nasional Berhad',
        shortName: 'Tenaga Nasional Berhad'
      }
    };
    
    const result = await builder.buildRequest(operationSpec, userParams, {}, billSpec.components);
    
    if (result.success && result.requestConfig.data) {
      console.log(`${GREEN}✅ POST request with body built successfully${RESET}`);
      console.log(`   URL: ${result.requestConfig.url}`);
      console.log(`   Body: ${JSON.stringify(result.requestConfig.data).substring(0, 50)}...`);
      passedTests++;
    } else {
      console.log(`${RED}❌ POST request building failed${RESET}`);
      console.log(`   Errors: ${result.errors?.join(', ')}`);
    }
  } catch (error) {
    console.log(`${RED}❌ Error: ${error.message}${RESET}`);
  }

  // Test 6: Enhanced Request Builder - Missing Body Fields
  console.log(`\n${YELLOW}Test 6: Enhanced Request Builder - Missing Body Fields${RESET}`);
  totalTests++;
  try {
    const builder = new EnhancedRequestBuilder();
    
    const operationSpec = {
      servers: [{ url: 'https://api.example.com' }],
      method: 'POST',
      path: '/payment',
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['payeeCode', 'billAcctNo', 'amount'],
              properties: {
                payeeCode: { type: 'string' },
                billAcctNo: { type: 'string' },
                amount: { type: 'number' }
              }
            }
          }
        }
      }
    };
    
    const incompleteParams = {
      body: {
        payeeCode: '1111'
        // Missing billAcctNo and amount
      }
    };
    
    const result = await builder.buildRequest(operationSpec, incompleteParams, {});
    
    if (!result.success && 
        result.needsUserInput && 
        result.missingFields.includes('billAcctNo') &&
        result.missingFields.includes('amount')) {
      console.log(`${GREEN}✅ Missing body fields trigger user input request${RESET}`);
      console.log(`   Missing fields: ${result.missingFields.join(', ')}`);
      console.log(`   Needs user input: ${result.needsUserInput}`);
      passedTests++;
    } else {
      console.log(`${RED}❌ Missing body fields not handled correctly${RESET}`);
    }
  } catch (error) {
    console.log(`${RED}❌ Error: ${error.message}${RESET}`);
  }

  // Test 7: Nested Object Validation
  console.log(`\n${YELLOW}Test 7: Nested Object Validation${RESET}`);
  totalTests++;
  try {
    const validator = new RequestBodyValidator();
    
    const operationSpec = {
      requestBody: {
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['user', 'payment'],
              properties: {
                user: {
                  type: 'object',
                  required: ['id', 'name'],
                  properties: {
                    id: { type: 'string' },
                    name: { type: 'string' },
                    email: { type: 'string' }
                  }
                },
                payment: {
                  type: 'object',
                  required: ['amount', 'currency'],
                  properties: {
                    amount: { type: 'number', minimum: 0 },
                    currency: { type: 'string', enum: ['USD', 'MYR', 'SGD'] }
                  }
                }
              }
            }
          }
        }
      }
    };
    
    const nestedBody = {
      user: {
        id: '123',
        // Missing required 'name'
      },
      payment: {
        amount: -50, // Invalid: negative amount
        currency: 'EUR' // Invalid: not in enum
      }
    };
    
    const result = await validator.validateRequestBody(nestedBody, operationSpec);
    
    if (!result.valid && 
        result.missingFields.includes('user.name') &&
        result.errors.some(e => e.includes('amount must be >= 0')) &&
        result.errors.some(e => e.includes('currency'))) {
      console.log(`${GREEN}✅ Nested object validation working${RESET}`);
      console.log(`   Missing: ${result.missingFields.join(', ')}`);
      console.log(`   First error: ${result.errors[0]}`);
      passedTests++;
    } else {
      console.log(`${RED}❌ Nested object validation failed${RESET}`);
    }
  } catch (error) {
    console.log(`${RED}❌ Error: ${error.message}${RESET}`);
  }

  // Summary
  console.log('\n' + '=' . repeat(60));
  console.log(`${BLUE}📊 Checkpoint 1 Test Results${RESET}`);
  console.log('=' . repeat(60));
  
  const percentage = Math.round((passedTests / totalTests) * 100);
  const status = passedTests === totalTests ? GREEN : percentage >= 70 ? YELLOW : RED;
  
  console.log(`${status}Passed: ${passedTests}/${totalTests} tests (${percentage}%)${RESET}`);
  
  if (passedTests === totalTests) {
    console.log(`\n${GREEN}✅ CHECKPOINT 1 COMPLETE!${RESET}`);
    console.log('All request body validation foundation components working correctly.');
    console.log('\nKey achievements:');
    console.log('• Schema reference resolution implemented');
    console.log('• Comprehensive body validation with OpenAPI schemas');
    console.log('• Missing field detection for user prompting');
    console.log('• Pattern and constraint validation');
    console.log('• Nested object validation support');
    console.log('• Enhanced request builder with body support');
  } else {
    console.log(`\n${RED}❌ CHECKPOINT 1 INCOMPLETE${RESET}`);
    console.log('Some tests failed. Please fix the issues before proceeding.');
  }
}

// Run the tests
testCheckpoint1().catch(console.error);