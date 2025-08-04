#!/usr/bin/env node

/**
 * Test get_payment_favList_1 with fresh token
 */

import { MCPGatewayServer } from './src/server.js';

async function testFreshToken() {
  console.log('🧪 Testing get_payment_favList_1 with Fresh Token');
  console.log('='.repeat(50));
  
  try {
    // Initialize server
    console.log('\n📋 Initializing MCP Gateway Server...');
    const server = new MCPGatewayServer();
    await server.initialize();
    
    console.log('✅ Server initialized successfully');
    
    // Test the get_payment_favList_1 operation
    console.log('\n📋 Testing get_payment_favList_1 operation...');
    
    const result = await server.handleToolCall('get_payment_favList_1', {
      Accept: 'application/json',
      'X-APP-PLATFORM': 'IOS',
      'X-APP-VERSION': '0.9.38'
    });
    
    if (result && result.content && result.content[0]) {
      const responseText = result.content[0].text;
      console.log('\n📊 Response Analysis:');
      
      if (responseText.includes('401')) {
        console.log('❌ Still getting 401 - token may still be invalid');
        console.log('Token issue: Session may have expired');
      } else if (responseText.includes('favList') || responseText.includes('success')) {
        console.log('✅ SUCCESS! Token is working');
        console.log('Response contains expected data');
      } else if (responseText.includes('error')) {
        console.log('⚠️  Got error response (but not 401)');
        console.log('Response:', responseText.substring(0, 200));
      } else {
        console.log('✅ Got response (analyzing...)');
        console.log('Response preview:', responseText.substring(0, 300));
      }
      
      console.log('\n📝 Full Response Length:', responseText.length, 'characters');
      
    } else {
      console.log('❌ No response received');
    }
    
  } catch (error) {
    console.log('\n❌ Test failed:', error.message);
    
    if (error.message.includes('401') || error.message.includes('Unauthorized')) {
      console.log('💡 Token is still invalid - need a fresh session token');
    } else {
      console.log('💡 Different error - may be network or configuration issue');
    }
  }
}

testFreshToken().catch(console.error);