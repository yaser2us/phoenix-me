#!/usr/bin/env node

/**
 * Debug Test for Maybank Token Authentication Issue
 * This test will help identify why valid tokens are being rejected
 */

import { MaybankAdapter } from './src/adapters/maybank-adapter.js';
import { ApiExecutor } from './src/execution/executor.js';
import { ApiRegistry } from './src/registry/api-registry.js';
import axios from 'axios';

async function testMaybankTokenAuthentication() {
  console.log('🔍 MAYBANK TOKEN AUTHENTICATION DEBUG TEST');
  console.log('==========================================\n');

  // Get JWT token from environment or prompt
  const jwtToken = process.env.MAYBANK_JWT_TOKEN || process.argv[2];
  
  if (!jwtToken) {
    console.error('❌ Please provide JWT token:');
    console.error('   node debug-maybank-token-test.js "your-jwt-token"');
    console.error('   OR set MAYBANK_JWT_TOKEN environment variable');
    process.exit(1);
  }

  console.log('📋 Test Configuration:');
  console.log(`• JWT Token Length: ${jwtToken.length} characters`);
  console.log(`• JWT Token Sample: ${jwtToken.substring(0, 20)}...${jwtToken.substring(jwtToken.length - 10)}`);
  console.log(`• JWT Parts Count: ${jwtToken.split('.').length} (should be 3)`);
  console.log();

  // Test 1: Direct HTTP request with exact cURL headers
  console.log('🧪 TEST 1: Direct HTTP Request (Matching cURL exactly)');
  console.log('-----------------------------------------------------');
  
  try {
    const directResponse = await axios({
      method: 'GET',
      url: 'https://maya.maybank2u.com.my/banking/v1/summary/getBalance?isFirstLoad=true',
      headers: {
        'Accept': 'application/json',
        'authorization': `bearer ${jwtToken}`,
        'maya-authorization': `bearer ${jwtToken}`,
        'X-APP-PLATFORM': 'IOS',
        'X-APP-VERSION': '0.9.38',
        'X-APP-ENVIRONMENT': '',
        'X-APP-BUILD-NO': '1203',
        'X-APP-RELEASE-NO': '25.5.0',
        'X-APP-SESSION-TRACE-ID': 'dGVzdFNlc3Npb24xMjM0NTY3ODkw'
      },
      timeout: 30000,
      validateStatus: (status) => status < 500
    });

    console.log('✅ Direct HTTP Response:');
    console.log(`   Status: ${directResponse.status}`);
    console.log(`   Headers: ${JSON.stringify(directResponse.headers, null, 2)}`);
    console.log(`   Data: ${JSON.stringify(directResponse.data, null, 2)}`);

  } catch (error) {
    console.log('❌ Direct HTTP Request Failed:');
    console.log(`   Error: ${error.message}`);
    if (error.response) {
      console.log(`   Status: ${error.response.status}`);
      console.log(`   Data: ${JSON.stringify(error.response.data, null, 2)}`);
    }
  }

  console.log('\n');

  // Test 2: Using Maybank Adapter
  console.log('🧪 TEST 2: Using Maybank Adapter');
  console.log('--------------------------------');

  try {
    const adapter = new MaybankAdapter();
    const requestData = {
      operation: 'get_banking_getBalance',
      jwtToken: jwtToken,
      parameters: { isFirstLoad: 'true' }
    };

    const preparedRequest = await adapter.prepareRequest(requestData);
    console.log('📦 Prepared Request:');
    console.log(`   URL: ${preparedRequest.url}`);
    console.log(`   Method: ${preparedRequest.method}`);
    console.log(`   Headers: ${JSON.stringify(preparedRequest.headers, null, 2)}`);

    // Execute the prepared request
    const adapterResponse = await axios(preparedRequest);
    console.log('✅ Adapter Response:');
    console.log(`   Status: ${adapterResponse.status}`);
    console.log(`   Data: ${JSON.stringify(adapterResponse.data, null, 2)}`);

    // Test response validation
    const validation = await adapter.validateResponse(adapterResponse.data, 'get_banking_getBalance');
    console.log('🔍 Response Validation:');
    console.log(`   Is Valid: ${validation.isValid}`);
    console.log(`   Error: ${validation.error || 'None'}`);

  } catch (error) {
    console.log('❌ Adapter Test Failed:');
    console.log(`   Error: ${error.message}`);
    if (error.response) {
      console.log(`   Status: ${error.response.status}`);
      console.log(`   Data: ${JSON.stringify(error.response.data, null, 2)}`);
    }
  }

  console.log('\n');

  // Test 3: Full API Executor
  console.log('🧪 TEST 3: Full API Executor');
  console.log('-----------------------------');

  try {
    const registry = new ApiRegistry();
    await registry.initialize();

    const executor = new ApiExecutor(registry, {});
    const result = await executor.executeOperation(
      'get_banking_getBalance',
      { isFirstLoad: 'true' },
      { jwtToken: jwtToken }
    );

    console.log('📊 Executor Result:');
    console.log(`   Success: ${result.success}`);
    console.log(`   API Type: ${result.apiType}`);
    console.log(`   Data: ${JSON.stringify(result.data, null, 2)}`);

  } catch (error) {
    console.log('❌ Executor Test Failed:');
    console.log(`   Error: ${error.message}`);
    console.log(`   Stack: ${error.stack}`);
  }

  console.log('\n');

  // Test 4: Token Analysis
  console.log('🧪 TEST 4: JWT Token Analysis');
  console.log('-----------------------------');

  try {
    const tokenParts = jwtToken.split('.');
    if (tokenParts.length === 3) {
      // Decode header
      const header = JSON.parse(Buffer.from(tokenParts[0], 'base64url').toString());
      console.log('📋 JWT Header:', JSON.stringify(header, null, 2));

      // Decode payload (be careful with sensitive data)
      const payload = JSON.parse(Buffer.from(tokenParts[1], 'base64url').toString());
      console.log('📋 JWT Payload (timestamps only):');
      if (payload.exp) {
        const expiry = new Date(payload.exp * 1000);
        console.log(`   Expires: ${expiry.toISOString()}`);
        console.log(`   Is Expired: ${expiry < new Date()}`);
      }
      if (payload.iat) {
        const issued = new Date(payload.iat * 1000);
        console.log(`   Issued: ${issued.toISOString()}`);
      }
      if (payload.nbf) {
        const notBefore = new Date(payload.nbf * 1000);
        console.log(`   Not Before: ${notBefore.toISOString()}`);
      }

    } else {
      console.log('❌ Invalid JWT format - should have 3 parts separated by dots');
    }

  } catch (error) {
    console.log('❌ Token Analysis Failed:');
    console.log(`   Error: ${error.message}`);
  }

  console.log('\n==========================================');
  console.log('🏁 Debug test completed');
}

// Run the test
testMaybankTokenAuthentication().catch(console.error);