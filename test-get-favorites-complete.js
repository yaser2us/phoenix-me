#!/usr/bin/env node

/**
 * Complete test for get_payment_favList_1 with all required headers
 */

import { MCPGatewayServer } from './src/server.js';

const JWT_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJjdXNfa2V5IjoiVTJGc2RHVmtYMThoTlRIT1g3cmIwSDJKQUY0YmNIckp5d0dNSG5CZHZDU0F6cFhIanY0RHVHQmQyWUtuUk5LaEZRZWVCc1BLMWt2aGVOdkk2RDcrUGc9PSIsImF1ZCI6WyJ6dXVsR2F0ZXdheSJdLCJ1c2VyX25hbWUiOiJZYXNlcjJ1cyIsImN1c1R5cGUiOiIxMCIsInNjb3BlIjpbIkVESVRfQkFOS0lORyIsIkVESVRfTk9OX0JBTktJTkciLCJSRUFEX0JBTktJTkciLCJSRUFEX05PTl9CQU5LSU5HIl0sIm1heWFfc2Vzc2lvbl9pZCI6IkBAQEEyMDI1MDczMTIxLjQzMDE0MTI4MDhAQEBAIiwibTJ1X3VzZXJfaWQiOjE3ODI3NzEzLCJwYW4iOiJZVTNDQjNveWcrK0pOVTJwcFpGNTZ1djVxQ3NtZ01sb3RYY0VtVFNLRVBzNG55T3R2TjBlc1pQRTBCSGJlWXZGNmRBdCtta2ExM2NZRmtId3NHejg2T1ZyL0ZOTlZmWk8ya1E2cjYyYTNkOFNrQzhzb01EN2k2VGYwcWpYczY4UFlVZDRabE1YYXNlWWk3Vkg1U1E0a2tUa1dSUHhxRjZOOElGb1ByOGkzOVU9IiwiZXhwIjoxNzg1NTQwNzU4LCJ1c2VySWQiOjUxMjYxMDksImp0aSI6Ijk5NmY3MTc4LWM4MDItNGIzZC1hYjM2LTc0MDYwYmZhNWY4NiIsImNsaWVudF9pZCI6Ik0yVUdBVEVXQVkifQ.MzsEONGYtBbT62PpUNbfVcX-dGk1-vonEQ0DZ0gL5jA'

async function testCompleteFavorites() {
  console.log('🎯 Testing get_payment_favList_1 with Complete Headers');
  console.log('='.repeat(60));
  
  try {
    const server = new MCPGatewayServer();
    await server.initialize();
    
    // Complete parameters with ALL required headers
    const parameters = {
      'Accept': 'application/json',
      'X-APP-PLATFORM': 'IOS',
      'X-APP-VERSION': '0.9.38',
      'X-APP-ENVIRONMENT': '',
      'X-APP-BUILD-NO': '1203', 
      'X-APP-RELEASE-NO': '25.5.0',
      'X-APP-SESSION-TRACE-ID': 'amI4ZUo4czNQQ1RjbnM3TVE0VGtHWVlubUZDWWtNdkI=',
      'x-mb-client-adapter': 'mae-favorites-bill-payment-inquiry',
      'X-MB-E2E-Id': 'amI4ZUo4czNQQ1RjbnM3TVE0VGtHWVlubUZDWWtNdkI=',
      'X-MB-Timestamp': Date.now().toString(),
      'X-MB-ENV': 'S',
      'X-MB-Client-Id': 'mae-fe-iv5p7',
      'maya-authorization': `bearer ${JWT_TOKEN}`,
      'authorization': `bearer ${JWT_TOKEN}`
    };

    console.log('\n📡 Making API call to get payment favorites...');
    
    const result = await server.handleToolCall('get_payment_favList_1', parameters);
    
    if (result && result.content && result.content[0]) {
      const responseText = result.content[0].text;
      
      console.log('\n📨 Response received:');
      console.log('='.repeat(40));
      console.log(responseText);
      console.log('='.repeat(40));
      
      // Try to extract any JSON data from the response
      try {
        const jsonMatch = responseText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const jsonData = JSON.parse(jsonMatch[0]);
          
          if (jsonData.resultList) {
            console.log('\n🎉 FAVORITES FOUND!');
            console.log(`📋 Number of favorites: ${jsonData.resultList.length}`);
            
            jsonData.resultList.forEach((fav, index) => {
              console.log(`\n${index + 1}. ${fav.fullName || fav.shortName || 'Unknown'}`);
              if (fav.oid) console.log(`   OID: ${fav.oid}`);
              if (fav.paymentTypes) console.log(`   Payment Type: ${fav.paymentTypes}`);
              if (fav.billAcctNo) console.log(`   Account: ${fav.billAcctNo}`);
            });
          } else if (jsonData.selectedPageSize !== undefined) {
            console.log('\n📄 Response Structure:');
            console.log(`   Page Size: ${jsonData.selectedPageSize}`);
            console.log(`   Total Results: ${jsonData.resultList?.length || 0}`);
          }
        }
      } catch (parseError) {
        // JSON parsing failed, just show the text response
        console.log('\n📄 Response (non-JSON format)');
      }
      
    } else {
      console.log('\n❌ No response received');
    }
    
  } catch (error) {
    console.log(`\n❌ Error: ${error.message}`);
  }
}

testCompleteFavorites().catch(console.error);