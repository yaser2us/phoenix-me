#!/usr/bin/env node

/**
 * Debug the 400 error from getBalance endpoint
 */

import axios from 'axios';
import crypto from 'crypto';

const JWT_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJjdXNfa2V5IjoiVTJGc2RHVmtYMThoTlRIT1g3cmIwSDJKQUY0YmNIckp5d0dNSG5CZHZDU0F6cFhIanY0RHVHQmQyWUtuUk5LaEZRZWVCc1BLMWt2aGVOdkk2RDcrUGc9PSIsImF1ZCI6WyJ6dXVsR2F0ZXdheSJdLCJ1c2VyX25hbWUiOiJZYXNlcjJ1cyIsImN1c1R5cGUiOiIxMCIsInNjb3BlIjpbIkVESVRfTk9OX0JBTktJTkciLCJSRUFEX0JBTktJTkciLCJSRUFEX05PTl9CQU5LSU5HIl0sIm1heWFfc2Vzc2lvbl9pZCI6IkBAQEAyMDI1MDcyOTE0LjMwNjM0NDgzNTdAQEBAIiwibTJ1X3VzZXJfaWQiOjE3ODI3NzEzLCJwYW4iOiJGbE93TmVGOEF0V2tSRldVNUpxd2Z3Q29mNnlsSHpMRm5jWXprWU9GK2s1NzJkOHdYU1kzUkJSaUlrK1JjUHJmdkRvcm1nQ2psZmYvN2h2REo5VjhGRXhDbnVhV0JhSUpnbDhDb3FOc09rNEZrVTBiL1BDZDlnYzJkWEVxNnpSMzJRZ3F4dmJQRVN3K09ZUkN4bFMvNHZUS0tybTdNMXIwcldSYWdSVVJFdlU9IiwiZXhwIjoxNzg1MzQyOTA3LCJ1c2VySWQiOjUxMjYxMDksImp0aSI6ImMwZDQ3ODI1LTUwY2MtNGU2Yy05ZjA0LTg4M2NmMzEwYWUwYiIsImNsaWVudF9pZCI6Ik0yVUdBVEVXQVkifQ.OeQBohS793NUTWOjjzh40p7D0GOqHcR8pG8CKm3bpwM';

async function debug400Error() {
  console.log('🔍 Debugging Maybank 400 Error');
  console.log('===============================');

  const baseHeaders = {
    'Accept': 'application/json',
    'X-APP-PLATFORM': 'IOS',
    'X-APP-VERSION': '0.9.38',
    'X-APP-ENVIRONMENT': '',
    'X-APP-BUILD-NO': '1203',
    'X-APP-RELEASE-NO': '25.5.0',
    'X-APP-SESSION-TRACE-ID': crypto.randomBytes(32).toString('base64'),
    'authorization': `bearer ${JWT_TOKEN}`
  };

  // Test different variations
  const testVariations = [
    {
      name: 'Original Request (causing 400)',
      url: 'https://staging.maya.maybank2u.com.my/banking/v1/summary/getBalance',
      params: { isFirstLoad: 'true' },
      headers: baseHeaders
    },
    {
      name: 'Without isFirstLoad parameter',
      url: 'https://staging.maya.maybank2u.com.my/banking/v1/summary/getBalance',
      params: {},
      headers: baseHeaders
    },
    {
      name: 'With isFirstLoad=false',
      url: 'https://staging.maya.maybank2u.com.my/banking/v1/summary/getBalance', 
      params: { isFirstLoad: 'false' },
      headers: baseHeaders
    },
    {
      name: 'With Authorization (capital A)',
      url: 'https://staging.maya.maybank2u.com.my/banking/v1/summary/getBalance',
      params: { isFirstLoad: 'true' },
      headers: {
        ...baseHeaders,
        'Authorization': `Bearer ${JWT_TOKEN}`,
        authorization: undefined
      }
    },
    {
      name: 'With both authorization headers',
      url: 'https://staging.maya.maybank2u.com.my/banking/v1/summary/getBalance',
      params: { isFirstLoad: 'true' },
      headers: {
        ...baseHeaders,
        'Authorization': `Bearer ${JWT_TOKEN}`
      }
    }
  ];

  for (const [index, test] of testVariations.entries()) {
    console.log(`\n${'='.repeat(50)}`);
    console.log(`🧪 Test ${index + 1}: ${test.name}`);
    console.log(`🌐 URL: ${test.url}`);
    console.log(`📋 Params:`, test.params);
    console.log(`📤 Headers:`, Object.keys(test.headers).filter(h => test.headers[h] !== undefined));

    try {
      const response = await axios({
        method: 'GET',
        url: test.url,
        params: test.params,
        headers: Object.fromEntries(
          Object.entries(test.headers).filter(([_, v]) => v !== undefined)
        ),
        timeout: 10000,
        validateStatus: () => true
      });

      console.log(`📊 Status: ${response.status} ${response.statusText}`);
      console.log(`📄 Content-Type: ${response.headers['content-type']}`);
      console.log(`📏 Content-Length: ${response.headers['content-length']}`);

      if (response.data) {
        console.log(`📝 Response Data:`, response.data);
        
        if (response.status === 200 && response.data.message === 'success') {
          console.log(`🎉 SUCCESS! This variation works!`);
          if (response.data.result && response.data.result.balance) {
            console.log(`💰 Balance: RM ${response.data.result.balance}`);
          }
        }
      } else {
        console.log(`❌ No response data`);
      }

    } catch (error) {
      console.log(`❌ Error: ${error.message}`);
      if (error.response) {
        console.log(`📊 Status: ${error.response.status}`);
        console.log(`📝 Data:`, error.response.data);
        console.log(`📄 Headers:`, error.response.headers);
      }
    }
  }

  // Test a working endpoint for comparison
  console.log(`\n${'='.repeat(50)}`);
  console.log(`🧪 Testing Working Endpoint for Comparison`);
  console.log(`🌐 Using your original curl URL pattern...`);

  try {
    // Test with a simpler endpoint pattern
    const testUrl = 'https://staging.maya.maybank2u.com.my/banking/v1/summary';
    console.log(`📡 Testing: ${testUrl}`);

    const response = await axios({
      method: 'GET',
      url: testUrl,
      headers: baseHeaders,
      timeout: 5000,
      validateStatus: () => true
    });

    console.log(`📊 Status: ${response.status} ${response.statusText}`);
    if (response.data) {
      console.log(`📝 Response:`, JSON.stringify(response.data, null, 2).substring(0, 300) + '...');
    }

  } catch (error) {
    console.log(`❌ Error: ${error.message}`);
  }
}

debug400Error().catch(console.error);