#!/usr/bin/env node

/**
 * Test post_bill_getBillsTxnHistory operation
 */

import { MCPGatewayServer } from './src/server.js';

async function testPostBillHistory() {
  console.log('🧾 Testing post_bill_getBillsTxnHistory');
  console.log('='.repeat(60));
  
  try {
    const server = new MCPGatewayServer();
    await server.initialize();
    
    // Parameters for POST request
    const parameters = {
      // Headers
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      'X-APP-PLATFORM': 'IOS',
      'X-APP-VERSION': '0.9.38',
      'X-APP-ENVIRONMENT': '',
      'X-APP-BUILD-NO': '1203',
      'X-APP-RELEASE-NO': '25.5.0',
      'X-APP-SESSION-TRACE-ID': 'amI4ZUo4czNQQ1RjbnM3TVE0VGtHWVlubUZDWWtNdkI=',
      
      // Request body parameters
      'payeeCode': '1111',
      'billAcctNo': '210027549604',
      'favBillPaymentStep2': '17',
      'gstNotesFavPaymentStep2': 'gstnotesfavpaystep2',
      'fullName': 'Tenaga Nasional Berhad',
      'shortName': 'Tenaga Nasional Berhad'
    };

    console.log('📡 Making POST request...');
    console.log('🎯 Operation: post_bill_getBillsTxnHistory');
    console.log('📋 Body: TNB bill transaction history');
    
    const result = await server.handleToolCall('post_bill_getBillsTxnHistory', parameters);
    
    console.log('\n📨 Response Analysis:');
    
    if (result && result.content && result.content[0]) {
      const responseText = result.content[0].text;
      
      if (responseText.includes('populateEffectiveDateList')) {
        console.log('🎉 SUCCESS! Got bill transaction history');
        console.log('📅 Response contains effective date list');
      } else if (responseText.includes('statusCode')) {
        console.log('📄 API response received');
        console.log('📊 Status code found in response');
      } else if (responseText.includes('401')) {
        console.log('❌ 401 Error - Token issue');
      } else {
        console.log('📄 Response preview:', responseText.substring(0, 200) + '...');
      }
    }
    
  } catch (error) {
    console.log(`\n❌ Error: ${error.message}`);
  }
}

testPostBillHistory().catch(console.error);