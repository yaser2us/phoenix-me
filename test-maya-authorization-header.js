#!/usr/bin/env node

/**
 * Test the new maya-authorization header with Maybank API
 */

import axios from 'axios';
import crypto from 'crypto';

// Use the same JWT token as before
const JWT_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJjdXNfa2V5IjoiVTJGc2RHVmtYMThoTlRIT1g3cmIwSDJKQUY0YmNIckp5d0dNSG5CZHZDU0F6cFhIanY0RHVHQmQyWUtuUk5LaEZRZWVCc1BLMWt2aGVOdkk2RDcrUGc9PSIsImF1ZCI6WyJ6dXVsR2F0ZXdheSJdLCJ1c2VyX25hbWUiOiJZYXNlcjJ1cyIsImN1c1R5cGUiOiIxMCIsInNjb3BlIjpbIkVESVRfTk9OX0JBTktJTkciLCJSRUFEX0JBTktJTkciLCJSRUFEX05PTl9CQU5LSU5HIl0sIm1heWFfc2Vzc2lvbl9pZCI6IkBAQEAyMDI1MDcyOTE1LjAwNTk3NTU5MTdAQEBAIiwibTJ1X3VzZXJfaWQiOjE3ODI3NzEzLCJwYW4iOiJlRk9YT1ZmUTlaRjA3TVozSXNHaGU5UDVaY0JYUUN5R1dEd1lWUlp2aDh1Q3NhYmFXeVRsbkdCbjdwZHFrcjZ3a2xORGZTbjhrZDYwRlZKYmVzT1hnSm5GcGFLYWpuU1JxemNzb2RscmdVNktZM2h4ZnFwS05IWVFHcnlqY0FaVXR3TktMVlgyL0kwQVpUUnQrVFB1cDI3Y0ErWGswNFAwQnp5WVdSL3Z6bFU9IiwiZXhwIjoxNzg1MzQ1NTYxLCJ1c2VySWQiOjUxMjYxMDksImp0aSI6ImZiMmJlOTNjLTNkZDAtNGJlNi1hOTI0LTJkNWUzYjIwNjBkOSIsImNsaWVudF9pZCI6Ik0yVUdBVEVXQVkifQ.hMEH-zzCSV7tHYphdwEezQbSL6kbZCODVuydbKredqA';

function getMaybankHeadersWithMayaAuth() {
  return {
    'Accept': 'application/json',
    'X-APP-PLATFORM': 'IOS',
    'X-APP-VERSION': '0.9.38',
    'X-APP-ENVIRONMENT': '',
    'X-APP-BUILD-NO': '1203',
    'X-APP-RELEASE-NO': '25.5.0',
    'X-APP-SESSION-TRACE-ID': crypto.randomBytes(32).toString('base64'),
    'authorization': `bearer ${JWT_TOKEN}`,
    'maya-authorization': `bearer ${JWT_TOKEN}` // NEW HEADER!
  };
}

async function testMayaAuthorizationHeader() {
  console.log('🔍 Testing Maya-Authorization Header');
  console.log('===================================');
  console.log(`🔑 JWT Token: ${JWT_TOKEN.substring(0, 50)}...`);
  console.log(`📅 Test Time: ${new Date().toISOString()}`);
  console.log();

  const testEndpoint = {
    name: '💰 MAE Wallet Balance (with maya-authorization)',
    url: 'https://maya.maybank2u.com.my/banking/v1/summary/getBalance?isFirstLoad=true',
    method: 'GET'
  };

  console.log(`🧪 Testing: ${testEndpoint.name}`);
  console.log(`🌐 URL: ${testEndpoint.url}`);
  console.log(`📋 Headers:`);
  
  const headers = getMaybankHeadersWithMayaAuth();
  Object.keys(headers).forEach(key => {
    if (key.includes('authorization')) {
      console.log(`   ${key}: ${headers[key].substring(0, 20)}...`);
    } else {
      console.log(`   ${key}: ${headers[key]}`);
    }
  });
  
  console.log(`\n⏱️  Starting request...`);
  const startTime = Date.now();

  try {
    const response = await axios({
      method: testEndpoint.method,
      url: testEndpoint.url,
      headers: headers,
      timeout: 15000,
      validateStatus: () => true
    });

    const duration = Date.now() - startTime;
    console.log(`⏱️  Response Time: ${duration}ms`);
    console.log(`📊 HTTP Status: ${response.status} ${response.statusText}`);
    console.log(`📄 Content-Type: ${response.headers['content-type']}`);

    if (response.status === 200) {
      console.log(`🎉 SUCCESS! The maya-authorization header fixed the issue!`);
      
      if (response.data && response.data.message === 'success' && response.data.code === 0) {
        console.log(`✅ Maybank API Success Response!`);
        console.log(`📝 Message: ${response.data.message}`);
        console.log(`🔢 Code: ${response.data.code}`);
        
        if (response.data.result && response.data.result.balance) {
          console.log(`💰 Balance: RM ${response.data.result.balance}`);
          console.log(`💳 Account: ${response.data.result.name || 'Unknown'}`);
          console.log(`🔖 Account Code: ${response.data.result.code || 'Unknown'}`);
        }
        
        console.log(`\n📄 Sample Response Data:`);
        console.log(JSON.stringify(response.data, null, 2).substring(0, 500) + '...');
      }
    } else if (response.status === 400) {
      console.log(`❌ Still getting 400 Bad Request - may need other adjustments`);
      console.log(`📝 Response Data:`, response.data);
    } else {
      console.log(`⚠️  HTTP ${response.status}: ${JSON.stringify(response.data)}`);
    }

  } catch (error) {
    const duration = Date.now() - startTime;
    console.log(`❌ Request Failed (${duration}ms)`);
    console.log(`🔍 Error: ${error.message}`);

    if (error.response) {
      console.log(`📊 Response Status: ${error.response.status}`);
      console.log(`📝 Response Data:`, error.response.data);
    } else if (error.code) {
      console.log(`🌐 Network Error: ${error.code}`);
    }
  }

  console.log(`\n${'='.repeat(60)}`);
  console.log(`🎯 CONCLUSION:`);
  console.log(`Adding the maya-authorization header should resolve the 400 Bad Request errors`);
  console.log(`if that was the missing piece. This test shows whether it worked!`);
}

testMayaAuthorizationHeader().catch(console.error);