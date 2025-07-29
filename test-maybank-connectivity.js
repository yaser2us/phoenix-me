#!/usr/bin/env node

/**
 * Simple connectivity test to Maybank staging server
 */

import axios from 'axios';

const JWT_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJjdXNfa2V5IjoiVTJGc2RHVmtYMThoTlRIT1g3cmIwSDJKQUY0YmNIckp5d0dNSG5CZHZDU0F6cFhIanY0RHVHQmQyWUtuUk5LaEZRZWVCc1BLMWt2aGVOdkk2RDcrUGc9PSIsImF1ZCI6WyJ6dXVsR2F0ZXdheSJdLCJ1c2VyX25hbWUiOiJZYXNlcjJ1cyIsImN1c1R5cGUiOiIxMCIsInNjb3BlIjpbIkVESVRfTk9OX0JBTktJTkciLCJSRUFEX0JBTktJTkciLCJSRUFEX05PTl9CQU5LSU5HIl0sIm1heWFfc2Vzc2lvbl9pZCI6IkBAQEEyMDI1MDcyOTEyLjYyMDE3MjA0NTVAQEBAIiwibTJ1X3VzZXJfaWQiOjE3ODI3NzEzLCJwYW4iOiJNWmMvakl6RGpGVEh5YWNDTWpPSGd4ajllK0owdDdUSG5aY05BSERrK05PbjhoTWloUlUrdGc4NkdldTl4RHl3NVJCTWpYcDlvTnU2UHhQTkZoZWRjN0oxTWMrQ1l1SjVOTXdibjNrVlZXaUhJWVZleHlTUmhYQ3RhRFpaeExMMU5sMEc0anM4KzcvRXIxSndVVnJweFJvSGxKZlFpOGFXZVpIbEk1eWV4Q1k9IiwiZXhwIjoxNzg1MzM3MzQ2LCJ1c2VySWQiOjUxMjYxMDksImp0aSI6IjY1NjRlYjE0LWU1ZTMtNGQxNS1hY2U2LTRmZWE3YmM0ZTY1MyIsImNsaWVudF9pZCI6Ik0yVUdBVEVXQVkifQ.Lx0vgdJeVc8G2hPcqebAbkkmL1vDKTMUJrkDU5hvmJI';

async function testConnectivity() {
  console.log('🔗 Testing Maybank Server Connectivity');
  console.log('=====================================');
  
  const tests = [
    {
      name: 'Banking Balance Endpoint (Our Call)',
      url: 'https://staging.maya.maybank2u.com.my/banking/v1/summary/getBalance',
      params: { isFirstLoad: 'true' }
    },
    {
      name: 'Banking Summary Endpoint',
      url: 'https://staging.maya.maybank2u.com.my/banking/v1/summary',
      params: { type: 'A' }
    },
    {
      name: 'Banking All Accounts Endpoint',
      url: 'https://staging.maya.maybank2u.com.my/banking/v1/accounts/all',
      params: {}
    }
  ];
  
  const headers = {
    'Accept': 'application/json',
    'authorization': `bearer ${JWT_TOKEN}`,
    'X-APP-PLATFORM': 'IOS',
    'X-APP-VERSION': '0.9.38',
    'X-APP-ENVIRONMENT': '',
    'X-APP-BUILD-NO': '1203',
    'X-APP-RELEASE-NO': '25.5.0',
    'X-APP-SESSION-TRACE-ID': 'VGVzdFNlc3Npb25UcmFjZUlE'
  };
  
  for (const test of tests) {
    console.log(`\n🧪 Testing: ${test.name}`);
    console.log(`📡 URL: ${test.url}`);
    console.log(`📋 Params:`, test.params);
    
    const startTime = Date.now();
    
    try {
      
      const response = await axios.get(test.url, {
        params: test.params,
        headers: headers,
        timeout: 10000 // 10 second timeout
      });
      
      const duration = Date.now() - startTime;
      
      console.log(`✅ Success! (${duration}ms)`);
      console.log(`📊 Status: ${response.status} ${response.statusText}`);
      console.log(`📄 Content-Type: ${response.headers['content-type']}`);
      console.log(`📏 Content-Length: ${response.headers['content-length'] || 'unknown'}`);
      
      if (response.data) {
        console.log(`📝 Response Preview:`, JSON.stringify(response.data, null, 2).substring(0, 300) + '...');
        
        // Check for success indicators
        if (response.data.message === 'success' && response.data.code === 0) {
          console.log(`🎉 Maybank API Success! Message: ${response.data.message}, Code: ${response.data.code}`);
          
          if (response.data.result) {
            console.log(`💰 Data Available:`, Object.keys(response.data.result));
          }
        } else {
          console.log(`⚠️  Maybank API Response: Message: ${response.data.message}, Code: ${response.data.code}`);
        }
      }
      
    } catch (error) {
      const duration = Date.now() - startTime;
      
      console.log(`❌ Failed! (${duration}ms)`);
      console.log(`🔍 Error Type: ${error.code || 'Unknown'}`);
      console.log(`📝 Error Message: ${error.message}`);
      
      if (error.response) {
        console.log(`📊 Response Status: ${error.response.status} ${error.response.statusText}`);
        console.log(`📄 Response Headers:`, error.response.headers);
        console.log(`📝 Response Data:`, error.response.data);
      } else if (error.request) {
        console.log(`🌐 Network Issue: Request made but no response received`);
        console.log(`📡 Request Details:`, {
          url: error.config?.url,
          method: error.config?.method,
          timeout: error.config?.timeout
        });
      }
    }
  }
  
  console.log('\n🏁 Connectivity tests completed');
}

testConnectivity().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});