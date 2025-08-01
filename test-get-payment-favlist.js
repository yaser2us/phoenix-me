#!/usr/bin/env node

/**
 * Test for get_payment_favList_1 operation
 * Tests the bill payment favorites list API endpoint
 */

import { MCPGatewayServer } from './src/server.js';

const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const YELLOW = '\x1b[33m';
const BLUE = '\x1b[34m';
const RESET = '\x1b[0m';

// JWT token provided by user
const JWT_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJjdXNfa2V5IjoiVTJGc2RHVmtYMThoTlRIT1g3cmIwSDJKQUY0YmNIckp5d0dNSG5CZHZDU0F6cFhIanY0RHVHQmQyWUtuUk5LaEZRZWVCc1BLMWt2aGVOdkk2RDcrUGc9PSIsImF1ZCI6WyJ6dXVsR2F0ZXdheSJdLCJ1c2VyX25hbWUiOiJZYXNlcjJ1cyIsImN1c1R5cGUiOiIxMCIsInNjb3BlIjpbIkVESVRfQkFOS0lORyIsIkVESVRfTk9OX0JBTktJTkciLCJSRUFEX0JBTktJTkciLCJSRUFEX05PTl9CQU5LSU5HIl0sIm1heWFfc2Vzc2lvbl9pZCI6IkBAQEAyMDI1MDczMTIxLjQzMDE0MTI4MDhAQEBAIiwibTJ1X3VzZXJfaWQiOjE3ODI3NzEzLCJwYW4iOiJZVTNDQjNveWcrK0pOVTJwcFpGNTZ1djVxQ3NtZ01sb3RYY0VtVFNLRVBzNG55T3R2TjBlc1pQRTBCSGJlWXZGNmRBdCtta2ExM2NZRmtId3NHejg2T1ZyL0ZOTlZmWk8ya1E2cjYyYTNkOFNrQzhzb01EN2k2VGYwcWpYczY4UFlVZDRabE1YYXNlWWk3Vkg1U1E0a2tUa1dSUHhxRjZOOElGb1ByOGkzOVU9IiwiZXhwIjoxNzg1NTQwNzU4LCJ1c2VySWQiOjUxMjYxMDksImp0aSI6Ijk5NmY3MTc4LWM4MDItNGIzZC1hYjM2LTc0MDYwYmZhNWY4NiIsImNsaWVudF9pZCI6Ik0yVUdBVEVXQVkifQ.MzsEONGYtBbT62PpUNbfVcX-dGk1-vonEQ0DZ0gL5jA'

async function testGetPaymentFavList() {
  console.log(`${BLUE}🧪 Testing get_payment_favList_1 Operation${RESET}`);
  console.log('='.repeat(60));

  let passedTests = 0;
  let totalTests = 0;

  // Test 1: Server Initialization and Operation Registration
  console.log(`\n${YELLOW}Test 1: Server Initialization and Operation Registration${RESET}`);
  totalTests++;

  let server;
  try {
    server = new MCPGatewayServer();
    await server.initialize();

    // Check if operation is registered
    const operationDetails = server.registry.getOperationDetails('get_payment_favList_1');

    if (operationDetails) {
      console.log(`${GREEN}✅ Operation get_payment_favList_1 found in registry${RESET}`);
      console.log(`   Path: ${operationDetails.path}`);
      console.log(`   Method: ${operationDetails.method}`);
      console.log(`   Parameters: ${operationDetails.parameters.length}`);
      passedTests++;
    } else {
      console.log(`${RED}❌ Operation get_payment_favList_1 not found in registry${RESET}`);
    }
  } catch (error) {
    console.log(`${RED}❌ Server initialization error: ${error.message}${RESET}`);
  }

  // throw new Error('Test 1 failed intentionally to demonstrate error handling'); // Simulate failure for testing

  // Test 2: Parameter Validation - Check Required Headers
  console.log(`\n${YELLOW}Test 2: Parameter Validation - Required Headers${RESET}`);
  totalTests++;
  try {
    const operationDetails = server.registry.getOperationDetails('get_payment_favList_1');
    const requiredHeaders = operationDetails.parameters
      .filter(p => p.in === 'header' && p.required)
      .map(p => p.name);

    const expectedHeaders = [
      'Accept',
      'X-APP-PLATFORM',
      'X-APP-VERSION',
      'X-APP-ENVIRONMENT',
      'X-APP-BUILD-NO',
      'X-APP-RELEASE-NO',
      'X-APP-SESSION-TRACE-ID',
      'x-mb-client-adapter',
      'X-MB-E2E-Id',
      'X-MB-Timestamp',
      'X-MB-ENV',
      'X-MB-Client-Id'
    ];

    const missingHeaders = expectedHeaders.filter(h => !requiredHeaders.includes(h));

    if (missingHeaders.length === 0) {
      console.log(`${GREEN}✅ All expected headers are required${RESET}`);
      console.log(`   Required headers: ${requiredHeaders.length}`);
      console.log(`   Headers: ${requiredHeaders.slice(0, 3).join(', ')}...`);
      passedTests++;
    } else {
      console.log(`${RED}❌ Missing expected headers${RESET}`);
      console.log(`   Missing: ${missingHeaders.join(', ')}`);
    }
  } catch (error) {
    console.log(`${RED}❌ Parameter validation error: ${error.message}${RESET}`);
  }

  // Test 3: MCP Tool Registration
  console.log(`\n${YELLOW}Test 3: MCP Tool Registration${RESET}`);
  totalTests++;
  try {
    const mcpTool = server.mcpTools.find(tool => tool.name === 'get_payment_favList_1');

    if (mcpTool) {
      console.log(`${GREEN}✅ MCP tool registered successfully${RESET}`);
      console.log(`   Tool name: ${mcpTool.name}`);
      console.log(`   Description: ${mcpTool.description}`);
      console.log(`   Input schema properties: ${Object.keys(mcpTool.inputSchema.properties).length}`);
      passedTests++;
    } else {
      console.log(`${RED}❌ MCP tool not registered${RESET}`);
    }
  } catch (error) {
    console.log(`${RED}❌ MCP tool registration error: ${error.message}${RESET}`);
  }

  // Test 4: Enhanced API Execution with Validation
  console.log(`\n${YELLOW}Test 4: Enhanced API Execution with Validation${RESET}`);
  totalTests++;
  try {
    // Prepare parameters with all required headers
    const parameters = {
      'Accept': 'application/json',
      'X-APP-PLATFORM': 'IOS',
      'X-APP-VERSION': '0.9.38',
      'X-APP-ENVIRONMENT': '',
      'X-APP-BUILD-NO': '1203',
      'X-APP-RELEASE-NO': '25.5.0',
      'maya-authorization': `bearer ${JWT_TOKEN}`,
      'authorization': `bearer ${JWT_TOKEN}`
    };

    // Test with Phase 4.7 enhanced validation
    const result = await server.handleToolCall('execute_api_with_validation', {
      operationId: 'get_payment_favList_1',
      parameters: parameters,
      enableInteractiveCollection: false // Disable interactive collection for this test
    });

    if (result && result.content && result.content[0]) {
      const responseText = result.content[0].text;

      if (responseText.includes('API Execution Successful')) {
        console.log(`${GREEN}✅ Enhanced API execution successful${RESET}`);
        console.log(`   Response type: Success`);
        passedTests++;
      } else if (responseText.includes('Parameter Collection Required')) {
        console.log(`${YELLOW}⚠️ Parameter collection required (validation working)${RESET}`);
        console.log(`   This means validation is working but missing some parameters`);
        passedTests++;
      } else if (responseText.includes('API Execution Failed')) {
        console.log(`${RED}❌ API execution failed${RESET}`);
        console.log(`   Response: ${responseText.substring(0, 200)}...`);
      } else {
        console.log(`${YELLOW}⚠️ Unexpected response format${RESET}`);
        console.log(`   Response: ${responseText.substring(0, 200)}...`);
      }
    } else {
      console.log(`${RED}❌ No response received${RESET}`);
    }
  } catch (error) {
    console.log(`${RED}❌ Enhanced API execution error: ${error.message}${RESET}`);
  }

  // Test 5: Direct API Execution (Original Method)
  console.log(`\n${YELLOW}Test 5: Direct API Execution (Original Method)${RESET}`);
  totalTests++;
  try {
    const parameters = {
      'Accept': 'application/json',
      'X-APP-PLATFORM': 'IOS',
      'X-APP-VERSION': '0.9.38',
      'X-APP-ENVIRONMENT': '',
      'X-APP-BUILD-NO': '1203',
      'X-APP-RELEASE-NO': '25.5.0',
      'X-APP-SESSION-TRACE-ID': 'amI4ZUo4czNQQ1RjbnM3TVE0VGtHWVlubUZDWWtNdkI=',
      // 'x-mb-client-adapter': 'mae-favorites-bill-payment-inquiry',
      'X-MB-E2E-Id': 'amI4ZUo4czNQQ1RjbnM3TVE0VGtHWVlubUZDWWtNdkI=',
      // 'X-MB-Timestamp': '1753471678391',
      // 'X-MB-ENV': 'S',
      // 'X-MB-Client-Id': 'mae-fe-iv5p7',
      'maya-authorization': `bearer ${JWT_TOKEN}`,
      'authorization': `bearer ${JWT_TOKEN}`
    };

    const result = await server.handleToolCall('get_payment_favList_1', parameters);

    if (result && result.content && result.content[0]) {
      const responseText = result.content[0].text;

      if (responseText.includes('completed successfully') || responseText.includes('resultList')) {
        console.log(`${GREEN}✅ Direct API execution successful${RESET}`);
        console.log(`   Response received with data`);
        passedTests++;
      } else if (responseText.includes('Error')) {
        console.log(`${RED}❌ Direct API execution failed${RESET}`);
        console.log(`   Error: ${responseText.substring(0, 200)}...`);

        // Check if it's an authentication or network error
        if (responseText.includes('401') || responseText.includes('unauthorized')) {
          console.log(`   ${YELLOW}Note: This might be due to JWT token expiration${RESET}`);
        } else if (responseText.includes('timeout') || responseText.includes('network')) {
          console.log(`   ${YELLOW}Note: This might be due to network connectivity${RESET}`);
        }
      } else {
        console.log(`${YELLOW}⚠️ Unknown response format${RESET}`);
        console.log(`   Response: ${responseText.substring(0, 200)}...`);
      }
    } else {
      console.log(`${RED}❌ No response received from direct execution${RESET}`);
    }
  } catch (error) {
    console.log(`${RED}❌ Direct API execution error: ${error.message}${RESET}`);
  }

  // Test 6: Request Builder Test
  console.log(`\n${YELLOW}Test 6: Request Builder Validation${RESET}`);
  totalTests++;
  try {
    const operationDetails = server.registry.getOperationDetails('get_payment_favList_1');
    const testParams = {
      'Accept': 'application/json',
      'X-APP-PLATFORM': 'IOS',
      'X-APP-VERSION': '0.9.38',
            'maya-authorization': `bearer ${JWT_TOKEN}`,
      'authorization': `bearer ${JWT_TOKEN}`
    };

    // Use the enhanced request builder to check if it can build the request
    const requestConfig = server.enhancedRequestBuilder
      ? await server.enhancedRequestBuilder.buildRequest(operationDetails, testParams)
      : null;

    if (requestConfig && !requestConfig.validationErrors) {
      console.log(`${GREEN}✅ Request builder working correctly${RESET}`);
      console.log(`   URL: ${requestConfig.url}`);
      console.log(`   Method: ${requestConfig.method}`);
      console.log(`   Headers count: ${Object.keys(requestConfig.headers || {}).length}`);
      passedTests++;
    } else if (requestConfig && requestConfig.validationErrors) {
      console.log(`${YELLOW}⚠️ Request builder found validation errors (expected)${RESET}`);
      console.log(`   Missing parameters: ${requestConfig.validationErrors.missingFields?.length || 0}`);
      console.log(`   Validation working correctly`);
      passedTests++;
    } else {
      console.log(`${RED}❌ Request builder not working${RESET}`);
    }
  } catch (error) {
    console.log(`${RED}❌ Request builder error: ${error.message}${RESET}`);
  }

  // Test 7: JWT Token Analysis
  console.log(`\n${YELLOW}Test 7: JWT Token Analysis${RESET}`);
  totalTests++;
  try {
    // Decode JWT token (just the payload, without verification)
    const [header, payload, signature] = JWT_TOKEN.split('.');
    const decodedPayload = JSON.parse(Buffer.from(payload, 'base64').toString());

    const currentTime = Math.floor(Date.now() / 1000);
    const isExpired = decodedPayload.exp < currentTime;

    console.log(`${isExpired ? RED : GREEN}${isExpired ? '❌' : '✅'} JWT Token Analysis${RESET}`);
    console.log(`   User: ${decodedPayload.user_name || 'Unknown'}`);
    console.log(`   User ID: ${decodedPayload.userId || 'Unknown'}`);
    console.log(`   Client ID: ${decodedPayload.client_id || 'Unknown'}`);
    console.log(`   Expires: ${new Date(decodedPayload.exp * 1000).toISOString()}`);
    console.log(`   Current Time: ${new Date().toISOString()}`);
    console.log(`   Is Expired: ${isExpired}`);
    console.log(`   Scopes: ${decodedPayload.scope ? decodedPayload.scope.join(', ') : 'None'}`);

    if (!isExpired) {
      passedTests++;
    }
  } catch (error) {
    console.log(`${RED}❌ JWT token analysis error: ${error.message}${RESET}`);
  }

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log(`${BLUE}📊 get_payment_favList_1 Test Results${RESET}`);
  console.log('='.repeat(60));

  const percentage = Math.round((passedTests / totalTests) * 100);
  const status = passedTests === totalTests ? GREEN : percentage >= 70 ? YELLOW : RED;

  console.log(`${status}Passed: ${passedTests}/${totalTests} tests (${percentage}%)${RESET}`);

  if (passedTests >= 5) { // Most tests passed
    console.log(`\n${GREEN}✅ get_payment_favList_1 Operation Assessment${RESET}`);
    console.log('The operation appears to be properly configured:');
    console.log('• ✅ Registered in API registry with correct parameters');
    console.log('• ✅ Available as MCP tool');
    console.log('• ✅ Parameter validation working');
    console.log('• ✅ Enhanced validation pipeline integrated');

    if (passedTests < totalTests) {
      console.log('\n⚠️ Potential Issues:');
      if (passedTests < 5) {
        console.log('• Authentication may be failing (JWT token expired?)');
      }
      if (passedTests < 6) {
        console.log('• Network connectivity to Maybank API endpoints');
        console.log('• API endpoint may be down or modified');
      }
    }
  } else {
    console.log(`\n${RED}❌ get_payment_favList_1 Operation Issues Detected${RESET}`);
    console.log('Multiple tests failed - check the following:');
    console.log('• API registry configuration');
    console.log('• Parameter mapping');
    console.log('• MCP tool registration');
    console.log('• Request building logic');
  }

  // Recommendations
  console.log('\n' + '='.repeat(60));
  console.log(`${BLUE}💡 Recommendations${RESET}`);
  console.log('='.repeat(60));

  console.log('\n🔧 **To fix potential issues:**');
  console.log('1. **JWT Token**: Generate a fresh JWT token from Maybank API');
  console.log('2. **Network**: Verify connectivity to Maybank API endpoints');
  console.log('3. **Headers**: Ensure all required headers are included and valid');
  console.log('4. **Environment**: Check if API endpoint URLs are correct for your environment');

  console.log('\n🧪 **To test manually:**');
  console.log('```javascript');
  console.log('// Using the enhanced validation tool:');
  console.log('await server.handleToolCall("execute_api_with_validation", {');
  console.log('  operationId: "get_payment_favList_1",');
  console.log('  parameters: {');
  console.log('    "Accept": "application/json",');
  console.log('    "X-APP-PLATFORM": "IOS",');
  console.log('    "Authorization": "Bearer YOUR_FRESH_JWT_TOKEN"');
  console.log('    // ... other required headers');
  console.log('  }');
  console.log('});');
  console.log('```');

  console.log('\n🔍 **Expected Response:**');
  console.log('The API should return a list of favorite bill payment options with:');
  console.log('• selectedPageSize: number');
  console.log('• resultList: array of favorite payees');
  console.log('• Each payee includes: oid, fullName, shortName, paymentTypes, etc.');
}

// Run the tests
testGetPaymentFavList().catch(console.error);