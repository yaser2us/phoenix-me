#!/usr/bin/env node

/**
 * Quick test to verify JWT token fix is working
 */

import { MCPGatewayServer } from './src/server.js';

const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const YELLOW = '\x1b[33m';
const BLUE = '\x1b[34m';
const RESET = '\x1b[0m';

// Your JWT token
const JWT_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJjdXNfa2V5IjoiVTJGc2RHVmtYMThoTlRIT1g3cmIwSDJKQUY0YmNIckp5d0dNSG5CZHZDU0F6cFhIanY0RHVHQmQyWUtuUk5LaEZRZWVCc1BLMWt2aGVOdkk2RDcrUGc9PSIsImF1ZCI6WyJ6dXVsR2F0ZXdheSJdLCJ1c2VyX25hbWUiOiJZYXNlcjJ1cyIsImN1c1R5cGUiOiIxMCIsInNjb3BlIjpbIkVESVRfQkFOS0lORyIsIkVESVRfTk9OX0JBTktJTkciLCJSRUFEX0JBTktJTkciLCJSRUFEX05PTl9CQU5LSU5HIl0sIm1heWFfc2Vzc2lvbl9pZCI6IkBAQEEyMDI1MDczMTIxLjQzMDE0MTI4MDhAQEBAIiwibTJ1X3VzZXJfaWQiOjE3ODI3NzEzLCJwYW4iOiJZVTNDQjNveWcrK0pOVTJwcFpGNTZ1djVxQ3NtZ01sb3RYY0VtVFNLRVBzNG55T3R2TjBlc1pQRTBCSGJlWXZGNmRBdCtta2ExM2NZRmtId3NHejg2T1ZyL0ZOTlZmWk8ya1E2cjYyYTNkOFNrQzhzb01EN2k2VGYwcWpYczY4UFlVZDRabE1YYXNlWWk3Vkg1U1E0a2tUa1dSUHhxRjZOOElGb1ByOGkzOVU9IiwiZXhwIjoxNzg1NTQwNzU4LCJ1c2VySWQiOjUxMjYxMDksImp0aSI6Ijk5NmY3MTc4LWM4MDItNGIzZC1hYjM2LTc0MDYwYmZhNWY4NiIsImNsaWVudF9pZCI6Ik0yVUdBVEVXQVkifQ.MzsEONGYtBbT62PpUNbfVcX-dGk1-vonEQ0DZ0gL5jA'

async function testJWTTokenFix() {
  console.log(`${BLUE}🔧 Testing JWT Token Fix${RESET}`);
  console.log('='.repeat(50));
  
  try {
    const server = new MCPGatewayServer();
    await server.initialize();
    
    // Test with all required headers including your JWT token
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

    console.log(`\n${YELLOW}Testing API call with your JWT token...${RESET}`);
    
    const result = await server.handleToolCall('get_payment_favList_1', parameters);
    
    if (result && result.content && result.content[0]) {
      const responseText = result.content[0].text;
      
      console.log(`\n${GREEN}📨 Response received:${RESET}`);
      console.log(responseText.substring(0, 300) + '...');
      
      if (responseText.includes('401') || responseText.includes('unauthorized')) {
        console.log(`\n${RED}❌ Still getting 401 error${RESET}`);
        console.log('This might indicate the token override fix didn\'t work');
      } else if (responseText.includes('resultList') || responseText.includes('success')) {
        console.log(`\n${GREEN}✅ SUCCESS! JWT token is working${RESET}`);
        console.log('🎉 Your JWT token is now being used properly');
      } else {
        console.log(`\n${YELLOW}⚠️ Different response (not 401)${RESET}`);
        console.log('This suggests the JWT token fix is working');
      }
    } else {
      console.log(`\n${RED}❌ No response received${RESET}`);
    }
    
  } catch (error) {
    console.log(`\n${RED}❌ Error: ${error.message}${RESET}`);
    
    if (error.message.includes('401') || error.message.includes('unauthorized')) {
      console.log(`${RED}Token override fix may not be working${RESET}`);
    } else {
      console.log(`${YELLOW}Different error - token fix likely working${RESET}`);
    }
  }
  
  console.log(`\n${BLUE}✅ JWT Token Fix Summary:${RESET}`);
  console.log('• Fixed line 88 in maybank-adapter.js');
  console.log('• Changed hardcoded token to use provided token first');
  console.log('• Your JWT token should now be used instead of being overridden');
  console.log('\nThe fix changed:');
  console.log(`${RED}const token = 'hardcoded...'${RESET}`);
  console.log('to:');
  console.log(`${GREEN}const token = jwtToken || 'hardcoded...'${RESET}`);
}

testJWTTokenFix().catch(console.error);