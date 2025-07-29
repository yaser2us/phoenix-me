#!/usr/bin/env node

/**
 * Real Maybank API Test using curl-style approach
 * Tests all banking endpoints with fresh JWT token
 */

import axios from 'axios';
import crypto from 'crypto';

// Fresh JWT token provided by user
const JWT_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJjdXNfa2V5IjoiVTJGc2RHVmtYMThoTlRIT1g3cmIwSDJKQUY0YmNIckp5d0dNSG5CZHZDU0F6cFhIanY0RHVHQmQyWUtuUk5LaEZRZWVCc1BLMWt2aGVOdkk2RDcrUGc9PSIsImF1ZCI6WyJ6dXVsR2F0ZXdheSJdLCJ1c2VyX25hbWUiOiJZYXNlcjJ1cyIsImN1c1R5cGUiOiIxMCIsInNjb3BlIjpbIkVESVRfTk9OX0JBTktJTkciLCJSRUFEX0JBTktJTkciLCJSRUFEX05PTl9CQU5LSU5HIl0sIm1heWFfc2Vzc2lvbl9pZCI6IkBAQEAyMDI1MDcyOTE1LjAwNTk3NTU5MTdAQEBAIiwibTJ1X3VzZXJfaWQiOjE3ODI3NzEzLCJwYW4iOiJlRk9YT1ZmUTlaRjA3TVozSXNHaGU5UDVaY0JYUUN5R1dEd1lWUlp2aDh1Q3NhYmFXeVRsbkdCbjdwZHFrcjZ3a2xORGZTbjhrZDYwRlZKYmVzT1hnSm5GcGFLYWpuU1JxemNzb2RscmdVNktZM2h4ZnFwS05IWVFHcnlqY0FaVXR3TktMVlgyL0kwQVpUUnQrVFB1cDI3Y0ErWGswNFAwQnp5WVdSL3Z6bFU9IiwiZXhwIjoxNzg1MzQ1NTYxLCJ1c2VySWQiOjUxMjYxMDksImp0aSI6ImZiMmJlOTNjLTNkZDAtNGJlNi1hOTI0LTJkNWUzYjIwNjBkOSIsImNsaWVudF9pZCI6Ik0yVUdBVEVXQVkifQ.hMEH-zzCSV7tHYphdwEezQbSL6kbZCODVuydbKredqA'
// Generate session trace ID (like in the original curl)
function generateSessionTraceId() {
  return crypto.randomBytes(32).toString('base64');
}

// Headers exactly matching your curl example + maya-authorization fix
function getMaybankHeaders() {
  return {
    'Accept': 'application/json',
    'X-APP-PLATFORM': 'IOS',
    'X-APP-VERSION': '0.9.38',
    'X-APP-ENVIRONMENT': '',
    'X-APP-BUILD-NO': '1203',
    'X-APP-RELEASE-NO': '25.5.0',
    'X-APP-SESSION-TRACE-ID': generateSessionTraceId(),
    'authorization': `bearer ${JWT_TOKEN}`,
    'maya-authorization': `bearer ${JWT_TOKEN}` // CRITICAL: This header fixes 400 Bad Request errors!
  };
}

async function testMaybankBankingAPIs() {
  console.log('🏦 Real Maybank Banking API Test');
  console.log('================================');
  console.log(`🔑 JWT Token: ${JWT_TOKEN.substring(0, 50)}...`);
  console.log(`📅 Test Time: ${new Date().toISOString()}`);
  console.log();

  // Test cases exactly matching your OpenAPI specs
  const testCases = [
    {
      name: '💰 MAE Wallet Balance (getBalance)',
      url: 'https://maya.maybank2u.com.my/banking/v1/summary/getBalance?isFirstLoad=true',
      method: 'GET',
      params: { isFirstLoad: 'true' },
      expectedData: ['balance', 'currentBalance', 'name', 'code', 'value'],
      description: 'Get current MAE Wallet balance and details'
    },
    {
      name: '📊 Account Summary (summary)',  
      url: 'https://maya.maybank2u.com.my/banking/v1/summary?type=A&checkMae=true',
      method: 'GET',
      params: { type: 'A' },
      expectedData: ['total', 'accountListings', 'maeAvailable'],
      description: 'Get summary of all accounts with total balance'
    },
    {
      name: '🏦 All Accounts (accounts/all)',
      url: 'https://maya.maybank2u.com.my/banking/v1/accounts/all',
      method: 'GET', 
      params: {},
      expectedData: ['name', 'balance', 'accountType', 'statusCode'],
      description: 'Get detailed list of all user accounts'
    }
  ];

  const results = [];

  for (const [index, testCase] of testCases.entries()) {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`🧪 Test ${index + 1}/3: ${testCase.name}`);
    console.log(`📝 Description: ${testCase.description}`);
    console.log(`🌐 URL: ${testCase.url}`);
    console.log(`📋 Parameters:`, testCase.params);
    console.log(`⏱️  Starting...`);

    const startTime = Date.now();
    let result = {
      testName: testCase.name,
      success: false,
      duration: 0,
      status: null,
      data: null,
      error: null,
      dataFound: [],
      balance: null
    };

    try {
      const response = await axios({
        method: testCase.method,
        url: testCase.url,
        params: testCase.params,
        headers: getMaybankHeaders(),
        timeout: 15000, // 15 second timeout
        validateStatus: () => true // Accept all status codes
      });

      result.duration = Date.now() - startTime;
      result.status = response.status;

      console.log(`⏱️  Response Time: ${result.duration}ms`);
      console.log(`📊 HTTP Status: ${response.status} ${response.statusText}`);
      console.log(`📄 Content-Type: ${response.headers['content-type']}`);

      if (response.status === 200) {
        result.success = true;
        result.data = response.data;
        

        console.log(`✅ SUCCESS!`);
        

        console.log(`Response Data:`, result.data);

        // Check for Maybank standard response format
        if (response.data && response.data.message === 'success' && response.data.code === 0) {
          console.log(`🎉 Maybank API Success Response!`);
          console.log(`📝 Message: ${response.data.message}`);
          console.log(`🔢 Code: ${response.data.code}`);

          // Analyze the result data
          if (response.data.result) {
            console.log(`📦 Result Data Available:`);
            
            // Check for expected data fields
            const resultData = response.data.result;
            const foundFields = [];
            
            for (const field of testCase.expectedData) {
              if (resultData.hasOwnProperty(field) || 
                  (Array.isArray(resultData) && resultData.length > 0 && resultData[0].hasOwnProperty(field))) {
                foundFields.push(field);
                console.log(`   ✅ ${field}: Found`);
              } else {
                console.log(`   ❌ ${field}: Missing`);
              }
            }
            
            result.dataFound = foundFields;

            // Extract balance information
            if (testCase.name.includes('Balance')) {
              if (resultData.balance) {
                result.balance = resultData.balance;
                console.log(`💰 Balance Found: RM ${resultData.balance}`);
                console.log(`💳 Account: ${resultData.name || 'Unknown'}`);
                console.log(`🔖 Account Code: ${resultData.code || 'Unknown'}`);
              }
            } else if (testCase.name.includes('Summary')) {
              if (resultData.total !== undefined) {
                result.balance = resultData.total;
                console.log(`💰 Total Balance: RM ${resultData.total}`);
                console.log(`🏦 Account Count: ${resultData.accountListings?.length || 0}`);
                console.log(`💳 MAE Available: ${resultData.maeAvailable ? 'Yes' : 'No'}`);
              }
            } else if (testCase.name.includes('All Accounts')) {
              if (Array.isArray(resultData) && resultData.length > 0) {
                console.log(`🏦 Found ${resultData.length} accounts:`);
                resultData.forEach((account, i) => {
                  console.log(`   ${i + 1}. ${account.name}: RM ${account.balance} (${account.accountType || account.type})`);
                });
                // Calculate total from all accounts
                const totalBalance = resultData.reduce((sum, acc) => sum + (parseFloat(acc.balance) || 0), 0);
                result.balance = totalBalance.toFixed(2);
                console.log(`💰 Total Across All Accounts: RM ${result.balance}`);
              }
            }

            // Show sample of actual data (first 500 characters)
            console.log(`\n📄 Sample Response Data:`);
            console.log(JSON.stringify(response.data, null, 2).substring(0, 500) + '...');

          } else {
            console.log(`⚠️  No result data in response`);
          }

        } else {
          console.log(`⚠️  Non-standard Maybank response:`);
          console.log(`   Message: ${response.data?.message || 'undefined'}`);
          console.log(`   Code: ${response.data?.code || 'undefined'}`);
        }

      } else {
        console.log(`❌ HTTP Error: ${response.status}`);
        console.log(`📝 Response Data:`, response.data);
        result.error = `HTTP ${response.status}: ${JSON.stringify(response.data)}`;
      }

    } catch (error) {
      result.duration = Date.now() - startTime;
      result.error = error.message;

      console.log(`❌ Request Failed (${result.duration}ms)`);
      console.log(`🔍 Error: ${error.message}`);

      if (error.response) {
        console.log(`📊 Response Status: ${error.response.status}`);
        console.log(`📝 Response Data:`, error.response.data);
        result.status = error.response.status;
      } else if (error.code) {
        console.log(`🌐 Network Error: ${error.code}`);
      }
    }

    results.push(result);
  }

  // Summary Report
  console.log(`\n${'='.repeat(60)}`);
  console.log(`📋 TEST SUMMARY REPORT`);
  console.log(`${'='.repeat(60)}`);

  const successCount = results.filter(r => r.success).length;
  const totalTests = results.length;

  console.log(`✅ Successful Tests: ${successCount}/${totalTests}`);
  console.log(`⏱️  Average Response Time: ${Math.round(results.reduce((sum, r) => sum + r.duration, 0) / totalTests)}ms`);

  if (successCount > 0) {
    console.log(`\n💰 BALANCE INFORMATION:`);
    results.forEach((result, index) => {
      if (result.success && result.balance) {
        console.log(`   ${index + 1}. ${result.testName}: RM ${result.balance}`);
      }
    });
  }

  console.log(`\n🔍 DETAILED RESULTS:`);
  results.forEach((result, index) => {
    const status = result.success ? '✅' : '❌';
    console.log(`   ${index + 1}. ${status} ${result.testName} (${result.duration}ms)`);
    if (result.error) {
      console.log(`      Error: ${result.error}`);
    }
    if (result.dataFound && result.dataFound.length > 0) {
      console.log(`      Data Fields: [${result.dataFound.join(', ')}]`);
    }
  });

  // Final Assessment
  console.log(`\n🎯 FINAL ASSESSMENT:`);
  if (successCount === totalTests) {
    console.log(`🎉 ALL TESTS PASSED! Maybank API integration is fully functional.`);
    console.log(`✅ Authentication: Working`);
    console.log(`✅ API Connectivity: Working`);
    console.log(`✅ Data Retrieval: Working`);
    console.log(`✅ Balance Access: Working`);
  } else if (successCount > 0) {
    console.log(`⚠️  PARTIAL SUCCESS: ${successCount}/${totalTests} endpoints working.`);
    console.log(`   Some APIs may have different authentication requirements.`);
  } else {
    console.log(`❌ ALL TESTS FAILED. Check token validity and network connectivity.`);
  }

  console.log(`\n📊 Integration Status: ${successCount === totalTests ? 'COMPLETE ✅' : 'NEEDS ATTENTION ⚠️'}`);
  
  return results;
}

// JWT Token Analysis
function analyzeJWTToken(token) {
  try {
    console.log(`\n🔍 JWT TOKEN ANALYSIS:`);
    console.log(`${'='.repeat(30)}`);
    
    const parts = token.split('.');
    if (parts.length !== 3) {
      console.log(`❌ Invalid JWT format - should have 3 parts separated by dots`);
      return;
    }

    // Decode header and payload (not signature for security)
    const header = JSON.parse(Buffer.from(parts[0], 'base64').toString());
    const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());

    console.log(`📋 Header:`, header);
    console.log(`👤 User: ${payload.user_name}`);
    console.log(`🏢 Client: ${payload.client_id}`);
    console.log(`📅 Expires: ${new Date(payload.exp * 1000).toISOString()}`);
    console.log(`🔐 Scopes: [${payload.scope.join(', ')}]`);
    console.log(`📱 Session: ${payload.maya_session_id}`);

    // Check if token is expired
    const now = Date.now() / 1000;
    const isExpired = payload.exp < now;
    console.log(`⏰ Token Status: ${isExpired ? '❌ EXPIRED' : '✅ VALID'}`);
    
    if (!isExpired) {
      const timeLeft = payload.exp - now;
      const hoursLeft = Math.floor(timeLeft / 3600);
      const minutesLeft = Math.floor((timeLeft % 3600) / 60);
      console.log(`⏳ Time Remaining: ${hoursLeft}h ${minutesLeft}m`);
    }

  } catch (error) {
    console.log(`❌ JWT Analysis Error: ${error.message}`);
  }
}

// Run the tests
async function main() {
  try {
    analyzeJWTToken(JWT_TOKEN);
    const results = await testMaybankBankingAPIs();
    
    // Exit with appropriate code
    const successCount = results.filter(r => r.success).length;
    process.exit(successCount === results.length ? 0 : 1);
    
  } catch (error) {
    console.error(`💥 Fatal Error: ${error.message}`);
    process.exit(1);
  }
}

main();