#!/usr/bin/env node

/**
 * Direct API call test using your exact working curl headers
 * Bypasses OpenAPI validation to match your working curl exactly
 */

import axios from 'axios';

const WORKING_JWT_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJjdXNfa2V5IjoiVTJGc2RHVmtYMThoTlRIT1g3cmIwSDJKQUY0YmNIckp5d0dNSG5CZHZDU0F6cFhIanY0RHVHQmQyWUtuUk5LaEZRZWVCc1BLMWt2aGVOdkk2RDcrUGc9PSIsImF1ZCI6WyJ6dXVsR2F0ZXdheSJdLCJ1c2VyX25hbWUiOiJZYXNlcjJ1cyIsImN1c1R5cGUiOiIxMCIsInNjb3BlIjpbIkVESVRfQkFOS0lORyIsIkVESVRfTk9OX0JBTktJTkciLCJSRUFEX0JBTktJTkciLCJSRUFEX05PTl9CQU5LSU5HIl0sIm1heWFfc2Vzc2lvbl9pZCI6IkBAQEAyMDI1MDczMTIxLjQzMDE0MTI4MDhAQEBAIiwibTJ1X3VzZXJfaWQiOjE3ODI3NzEzLCJwYW4iOiJZVTNDQjNveWcrK0pOVTJwcFpGNTZ1djVxQ3NtZ01sb3RYY0VtVFNLRVBzNG55T3R2TjBlc1pQRTBCSGJlWXZGNmRBdCtta2ExM2NZRmtId3NHejg2T1ZyL0ZOTlZmWk8ya1E2cjYyYTNkOFNrQzhzb01EN2k2VGYwcWpYczY4UFlVZDRabE1YYXNlWWk3Vkg1U1E0a2tUa1dSUHhxRjZOOElGb1ByOGkzOVU9IiwiZXhwIjoxNzg1NTQwNzU4LCJ1c2VySWQiOjUxMjYxMDksImp0aSI6Ijk5NmY3MTc4LWM4MDItNGIzZC1hYjM2LTc0MDYwYmZhNWY4NiIsImNsaWVudF9pZCI6Ik0yVUdBVEVXQVkifQ.MzsEONGYtBbT62PpUNbfVcX-dGk1-vonEQ0DZ0gL5jA';

async function testDirectApiCall() {
  console.log('🚀 Direct API Call - Your Exact Working Configuration');
  console.log('='.repeat(60));
  
  try {
    // Exact headers from your working curl command
    const headers = {
      'Accept': 'application/json',
      'X-APP-PLATFORM': 'IOS',
      'X-APP-VERSION': '0.9.38',
      'X-APP-ENVIRONMENT': '', // Empty value
      'X-APP-BUILD-NO': '1203',
      'X-APP-RELEASE-NO': '25.5.0',
      'X-APP-SESSION-TRACE-ID': 'T0h2a0s5WXA3eG5xZHBkanUyR3JqNEdzS0xBemhZeWc=',
      'Authorization': `bearer ${WORKING_JWT_TOKEN}`,
      'maya-authorization': `bearer ${WORKING_JWT_TOKEN}`
    };
    
    console.log('📡 Making direct HTTP request...');
    console.log(`🔑 JWT Token: ${WORKING_JWT_TOKEN.substring(0, 50)}...`);
    console.log(`🌐 URL: https://maya.maybank2u.com.my/payment/v1/pay/bill/favList`);
    console.log(`📋 Headers: ${Object.keys(headers).length} headers`);
    
    const response = await axios.get('https://maya.maybank2u.com.my/payment/v1/pay/bill/favList', {
      headers: headers,
      timeout: 30000,
      validateStatus: (status) => status < 500 // Accept 4xx as valid responses
    });
    
    console.log(`\n📨 Response Status: ${response.status} ${response.statusText}`);
    console.log(`📄 Content-Type: ${response.headers['content-type']}`);
    
    if (response.data) {
      console.log('\n📊 Response Data:');
      console.log('='.repeat(50));
      
      if (typeof response.data === 'object') {
        console.log(JSON.stringify(response.data, null, 2));
        
        // Check for favorites in the response
        if (response.data.resultList && Array.isArray(response.data.resultList)) {
          console.log(`\n🎉 SUCCESS! Found ${response.data.resultList.length} payment favorites:`);
          
          response.data.resultList.forEach((fav, idx) => {
            console.log(`\n${idx + 1}. ${fav.fullName || fav.shortName || 'Unknown Payee'}`);
            if (fav.oid) console.log(`   ID: ${fav.oid}`);
            if (fav.billAcctNo) console.log(`   Account: ${fav.billAcctNo}`);
            if (fav.paymentTypes) console.log(`   Type: ${fav.paymentTypes}`);
          });
          
        } else if (response.data.message === 'success') {
          console.log('\n✅ API call successful!');
          if (response.data.result) {
            console.log('📦 Result data available');
          }
        }
        
      } else {
        console.log(response.data);
      }
      
      console.log('='.repeat(50));
      
    } else {
      console.log('\n📭 No response data');
    }
    
  } catch (error) {
    console.log(`\n❌ Error: ${error.message}`);
    
    if (error.response) {
      console.log(`📨 Status: ${error.response.status} ${error.response.statusText}`);
      if (error.response.data) {
        console.log('📄 Error Response:');
        console.log(JSON.stringify(error.response.data, null, 2));
      }
    }
  }
}

testDirectApiCall().catch(console.error);