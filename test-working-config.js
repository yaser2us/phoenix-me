#!/usr/bin/env node

/**
 * Test using your exact working curl configuration
 */

import { MCPGatewayServer } from './src/server.js';

const WORKING_JWT_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJjdXNfa2V5IjoiVTJGc2RHVmtYMThoTlRIT1g3cmIwSDJKQUY0YmNIckp5d0dNSG5CZHZDU0F6cFhIanY0RHVHQmQyWUtuUk5LaEZRZWVCc1BLMWt2aGVOdkk2RDcrUGc9PSIsImF1ZCI6WyJ6dXVsR2F0ZXdheSJdLCJ1c2VyX25hbWUiOiJZYXNlcjJ1cyIsImN1c1R5cGUiOiIxMCIsInNjb3BlIjpbIkVESVRfTk9OX0JBTktJTkciLCJSRUFEX05PTl9CQU5LSU5HIl0sIm1heWFfc2Vzc2lvbl9pZCI6IkBAQEAyMDI1MDczMDIxLjkyOTk0ODQ5ODZAQEBAIiwibTJ1X3VzZXJfaWQiOjE3ODI3NzEzLCJwYW4iOiJTbXRhSlZnUFdWT05FaWFDYnZTWUZLckZydU40b0Y4Yk1OT09ucUNtUVBCTlN0SExyNVY0aEczR3hSdjVReTYzak1qWUJJL1lJYnNSTVFPelRQb1BhbTc3WlJxclpXZFREU3ZmZ3VjZkdOSGtmb3Z2ZEk4OGwvb1VvTDlDQVE5YW5LNGtGcEVXbDBVRXJ1eFMybEFNb0FnQTJsQnlnUXh5Yzd5S1VGNURJb009IiwiZXhwIjoxNzg1NDUzNDEzLCJ1c2VySWQiOjUxMjYxMDksImp0aSI6ImM1NGFmMWVlLTRhMWItNGFmYi04OWRjLTk5NjhiMmI5ZWViOSIsImNsaWVudF9pZCI6Ik0yVUdBVEVXQVkifQ.NjE7JMQNBERQf8pUtkvvvMQEG8FBYNLaS0oOHgvnfp8';

async function testWorkingConfig() {
  console.log('🎯 Testing with Your Working Curl Configuration');
  console.log('='.repeat(60));
  
  try {
    const server = new MCPGatewayServer();
    await server.initialize();
    
    // Parameters matching your exact working curl command
    const parameters = {
      'Accept': 'application/json',
      'X-APP-PLATFORM': 'IOS',
      'X-APP-VERSION': '0.9.38',
      'X-APP-ENVIRONMENT': '', // Empty like in your curl
      'X-APP-BUILD-NO': '1203',
      'X-APP-RELEASE-NO': '25.5.0',
      'X-APP-SESSION-TRACE-ID': 'T0h2a0s5WXA3eG5xZHBkanUyR3JqNEdzS0xBemhZeWc=',
      'Authorization': `bearer ${WORKING_JWT_TOKEN}`, // Capital A like your curl
      'maya-authorization': `bearer ${WORKING_JWT_TOKEN}`
    };

    console.log('\n📡 Making API call with your working configuration...');
    console.log(`🔑 Using JWT Token: ${WORKING_JWT_TOKEN.substring(0, 50)}...`);
    console.log(`🔑 Session Trace ID: T0h2a0s5WXA3eG5xZHBkanUyR3JqNEdzS0xBemhZeWc=`);
    
    const result = await server.handleToolCall('get_payment_favList_1', parameters);
    
    if (result && result.content && result.content[0]) {
      const responseText = result.content[0].text;
      
      console.log('\n📨 Response received:');
      console.log('='.repeat(50));
      console.log(responseText);
      console.log('='.repeat(50));
      
      // Check for success indicators
      if (responseText.includes('resultList') || responseText.includes('favList')) {
        console.log('\n🎉 SUCCESS! Payment favorites retrieved!');
        
        // Try to extract and display favorites
        try {
          const jsonMatch = responseText.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            const data = JSON.parse(jsonMatch[0]);
            if (data.data && data.data.resultList) {
              console.log(`\n📋 Found ${data.data.resultList.length} payment favorites:`);
              data.data.resultList.forEach((fav, idx) => {
                console.log(`${idx + 1}. ${fav.fullName || fav.shortName || 'Unknown Payee'}`);
                if (fav.oid) console.log(`   ID: ${fav.oid}`);
                if (fav.billAcctNo) console.log(`   Account: ${fav.billAcctNo}`);
              });
            }
          }
        } catch (e) {
          console.log('✅ Response received (could not parse favorites details)');
        }
        
      } else if (responseText.includes('401') || responseText.includes('unauthorized')) {
        console.log('\n❌ Still getting authentication error');
        console.log('Your working JWT token may have expired or changed');
      } else {
        console.log('\n⚠️ Different response - check above for details');
      }
      
    } else {
      console.log('\n❌ No response received');
    }
    
  } catch (error) {
    console.log(`\n❌ Error: ${error.message}`);
  }
}

testWorkingConfig().catch(console.error);