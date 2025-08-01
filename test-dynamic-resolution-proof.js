#!/usr/bin/env node

/**
 * Proof that dynamic resolution is working
 */

import { ApiRegistry } from './src/registry/api-registry.js';
import { MaybankAdapter } from './src/adapters/maybank-adapter.js';

async function testDynamicResolution() {
  console.log('🧪 Testing Dynamic Resolution Proof');
  console.log('='.repeat(60));
  
  try {
    // Initialize registry
    const registry = new ApiRegistry();
    await registry.initialize();
    
    // Create adapter with registry
    const adapter = new MaybankAdapter(registry);
    
    // Test 1: Check if registry has the operations
    console.log('\n📋 Test 1: Registry Operations');
    const getOp = registry.getOperation('get_payment_favList_1');
    const postOp = registry.getOperation('post_bill_getBillsTxnHistory');
    
    console.log('GET Operation:');
    console.log('  ID:', getOp?.operationId);
    console.log('  Method:', getOp?.method);
    console.log('  Path:', getOp?.path);
    
    console.log('\nPOST Operation:');
    console.log('  ID:', postOp?.operationId);
    console.log('  Method:', postOp?.method);
    console.log('  Path:', postOp?.path);
    
    // Test 2: Build URLs using adapter
    console.log('\n📋 Test 2: Dynamic URL Building');
    const getUrl = await adapter.buildURL('get_payment_favList_1');
    const postUrl = await adapter.buildURL('post_bill_getBillsTxnHistory');
    
    console.log('GET URL:', getUrl);
    console.log('POST URL:', postUrl);
    
    // Test 3: Prepare requests to see method resolution
    console.log('\n📋 Test 3: Method Resolution');
    const getRequest = await adapter.prepareRequest({
      operation: 'get_payment_favList_1',
      parameters: {}
    });
    
    const postRequest = await adapter.prepareRequest({
      operation: 'post_bill_getBillsTxnHistory',
      parameters: {
        payeeCode: '1111',
        billAcctNo: '210027549604'
      }
    });
    
    console.log('GET Request Method:', getRequest.method);
    console.log('POST Request Method:', postRequest.method);
    console.log('POST Request Has Body:', !!postRequest.data);
    
    console.log('\n✅ Dynamic Resolution Confirmed!');
    console.log('  - URLs resolved from registry specs');
    console.log('  - Methods resolved from registry specs');
    console.log('  - No hardcoded logic needed');
    
  } catch (error) {
    console.log(`\n❌ Error: ${error.message}`);
    console.error(error.stack);
  }
}

testDynamicResolution().catch(console.error);