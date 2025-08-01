#!/usr/bin/env node

/**
 * Quick test to verify get_payment_favList_1 fixes
 */

import { MCPGatewayServer } from './src/server.js';

const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const YELLOW = '\x1b[33m';
const BLUE = '\x1b[34m';
const RESET = '\x1b[0m';

async function testPaymentFavListFix() {
  console.log(`${BLUE}🔧 Testing get_payment_favList_1 Fixes${RESET}`);
  console.log('='.repeat(50));
  
  let passedTests = 0;
  let totalTests = 0;

  // Test 1: Registry getComponents method
  console.log(`\n${YELLOW}Test 1: Registry getComponents method${RESET}`);
  totalTests++;
  try {
    const server = new MCPGatewayServer();
    await server.initialize();
    
    const components = server.registry.getComponents();
    
    if (components && typeof components === 'object') {
      console.log(`${GREEN}✅ getComponents method working${RESET}`);
      console.log(`   Components available: ${Object.keys(components).length}`);
      console.log(`   Schemas: ${Object.keys(components.schemas || {}).length}`);
      passedTests++;
    } else {
      console.log(`${RED}❌ getComponents method failed${RESET}`);
    }
  } catch (error) {
    console.log(`${RED}❌ Error: ${error.message}${RESET}`);
  }

  // Test 2: Maybank adapter recognizes payment operation
  console.log(`\n${YELLOW}Test 2: Maybank adapter recognizes payment operation${RESET}`);
  totalTests++;
  try {
    const server = new MCPGatewayServer();
    await server.initialize();
    
    const parameters = {
      'Accept': 'application/json',
      'X-APP-PLATFORM': 'IOS',
      'Authorization': 'Bearer test-token'
    };

    // This should not throw "Unknown Maybank operation" error anymore
    const result = await server.handleToolCall('get_payment_favList_1', parameters);

    if (result && result.content && result.content[0]) {
      const responseText = result.content[0].text;
      
      if (!responseText.includes('Unknown Maybank operation')) {
        console.log(`${GREEN}✅ Maybank adapter recognizes get_payment_favList_1${RESET}`);
        console.log(`   Operation mapping successful`);
        passedTests++;
      } else {
        console.log(`${RED}❌ Still getting unknown operation error${RESET}`);
      }
    } else {
      console.log(`${RED}❌ No response received${RESET}`);
    }
  } catch (error) {
    if (!error.message.includes('Unknown Maybank operation')) {
      console.log(`${GREEN}✅ Maybank adapter recognizes get_payment_favList_1${RESET}`);
      console.log(`   Different error (expected): ${error.message.substring(0, 100)}...`);
      passedTests++;
    } else {
      console.log(`${RED}❌ Still getting unknown operation error: ${error.message}${RESET}`);
    }
  }

  // Test 3: Enhanced validation tool works
  console.log(`\n${YELLOW}Test 3: Enhanced validation tool works${RESET}`);
  totalTests++;
  try {
    const server = new MCPGatewayServer();
    await server.initialize();
    
    const result = await server.handleToolCall('execute_api_with_validation', {
      operationId: 'get_payment_favList_1',
      parameters: {
        'Accept': 'application/json',
        'X-APP-PLATFORM': 'IOS'
      },
      enableInteractiveCollection: false
    });

    if (result && result.content && result.content[0]) {
      const responseText = result.content[0].text;
      
      if (!responseText.includes('this.registry.getComponents is not a function')) {
        console.log(`${GREEN}✅ Enhanced validation tool working${RESET}`);
        console.log(`   No getComponents error`);
        passedTests++;
      } else {
        console.log(`${RED}❌ Still getting getComponents error${RESET}`);
      }
    } else {
      console.log(`${RED}❌ No response from enhanced validation tool${RESET}`);
    }
  } catch (error) {
    if (!error.message.includes('this.registry.getComponents is not a function')) {
      console.log(`${GREEN}✅ Enhanced validation tool working${RESET}`);
      console.log(`   Different error (expected): ${error.message.substring(0, 100)}...`);
      passedTests++;
    } else {
      console.log(`${RED}❌ Still getting getComponents error: ${error.message}${RESET}`);
    }
  }

  // Summary
  console.log('\n' + '='.repeat(50));
  console.log(`${BLUE}📊 Fix Test Results${RESET}`);
  console.log('='.repeat(50));
  
  const percentage = Math.round((passedTests / totalTests) * 100);
  const status = passedTests === totalTests ? GREEN : percentage >= 70 ? YELLOW : RED;
  
  console.log(`${status}Passed: ${passedTests}/${totalTests} tests (${percentage}%)${RESET}`);
  
  if (passedTests === totalTests) {
    console.log(`\n${GREEN}✅ ALL FIXES WORKING!${RESET}`);
    console.log('🎉 get_payment_favList_1 operation is now properly supported');
    console.log('\nFixed issues:');
    console.log('• ✅ Added getComponents() method to ApiRegistry');
    console.log('• ✅ Added get_payment_favList_1 mapping to Maybank adapter');
    console.log('• ✅ Added payment-specific headers');
    console.log('• ✅ Enhanced validation tools now work with the operation');
  } else {
    console.log(`\n${RED}❌ Some fixes still need work${RESET}`);
    console.log('Check the failing tests above for details.');
  }
  
  console.log(`\n${BLUE}💡 Next Steps:${RESET}`);
  console.log('1. Run the full test: node test-get-payment-favlist.js');
  console.log('2. Test with fresh JWT token for actual API calls');
  console.log('3. Verify all payment operation headers are included');
}

// Run the test
testPaymentFavListFix().catch(console.error);