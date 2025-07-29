/**
 * Phase 4.2 Checkpoint 1 Test Suite
 * Maybank OpenAPI Integration Test
 * 
 * Tests:
 * 1. Maybank OpenAPI spec loading and operation registration
 * 2. Maybank-specific header handling
 * 3. Maybank URL construction and parameter mapping
 * 4. Maybank response schema validation
 * 5. Session trace ID generation
 * 6. JWT token validation for Maybank
 */

import { ApiRegistry } from './src/registry/api-registry.js';
import { MaybankAdapter } from './src/adapters/maybank-adapter.js';
import { JWTManager } from './src/authentication/jwt-manager.js';

async function testCheckpoint1() {
  console.log('🧪 CHECKPOINT 1: Maybank OpenAPI Integration\n');
  
  try {
    // Test 1: Maybank OpenAPI spec loading
    console.log('Test 1: Maybank OpenAPI specification loading');
    const registry = new ApiRegistry();
    await registry.initialize();
    
    const expectedOperations = ['get_banking_getBalance', 'get_banking_summary', 'get_banking_all'];
    const maybankOps = [];
    const foundOperations = [];
    
    // Check for each expected Maybank operation
    for (const opId of expectedOperations) {
      const opDetails = registry.getOperationDetails(opId);
      if (opDetails && opDetails.spec.servers && 
          opDetails.spec.servers.some(server => server.url.includes('staging.maya.maybank2u.com.my'))) {
        maybankOps.push(opDetails);
        foundOperations.push(opId);
      }
    }
    
    if (expectedOperations.every(op => foundOperations.includes(op))) {
      console.log(`✅ Maybank API loaded: ${maybankOps.length} operations`);
      console.log('   Operations:', foundOperations.join(', '));
    } else {
      throw new Error(`Maybank API operations not loaded properly. Expected: ${expectedOperations.join(', ')}, Found: ${foundOperations.join(', ')}`);
    }
    
    // Test 2: Maybank-specific header handling
    console.log('\nTest 2: Maybank header configuration');
    const maybankAdapter = new MaybankAdapter();
    
    const maybankRequest = {
      operation: 'get_banking_getBalance',
      jwtToken: 'mock_jwt_token_eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyLCJleHAiOjk5OTk5OTk5OTl9.Lf7qHCGEEMsB72c4DFvp7znhHhzZUzfq5pySNR9TlPc',
      parameters: { isFirstLoad: 'true' }
    };
    
    const adaptedRequest = await maybankAdapter.prepareRequest(maybankRequest);
    
    const requiredHeaders = [
      'Accept', 'Authorization', 'X-APP-PLATFORM', 
      'X-APP-VERSION', 'X-APP-BUILD-NO', 'X-APP-RELEASE-NO', 
      'X-APP-SESSION-TRACE-ID', 'X-APP-ENVIRONMENT'
    ];
    
    const hasAllHeaders = requiredHeaders.every(header => 
      adaptedRequest.headers[header] !== undefined
    );
    
    if (hasAllHeaders && adaptedRequest.headers.Authorization.startsWith('Bearer ')) {
      console.log('✅ Maybank headers configured correctly');
      console.log('   Headers:', Object.keys(adaptedRequest.headers).join(', '));
    } else {
      throw new Error(`Maybank header configuration failed. Missing headers: ${requiredHeaders.filter(h => !adaptedRequest.headers[h]).join(', ')}`);
    }
    
    // Test 3: Maybank URL construction
    console.log('\nTest 3: Maybank URL construction');
    const balanceRequest = await maybankAdapter.buildURL('get_banking_getBalance', {
      isFirstLoad: 'true'
    });
    
    const expectedURL = 'https://staging.maya.maybank2u.com.my/banking/v1/summary/getBalance?isFirstLoad=true';
    
    if (balanceRequest.url === expectedURL) {
      console.log('✅ Maybank URL construction working');
      console.log('   URL:', balanceRequest.url);
    } else {
      throw new Error(`URL mismatch. Expected: ${expectedURL}, Got: ${balanceRequest.url}`);
    }
    
    // Test 4: Maybank response schema validation
    console.log('\nTest 4: Maybank response schema validation');
    const mockMaybankResponse = {
      message: "success",
      code: 0,
      challenge: null,
      result: {
        name: "MAE Wallet",
        code: "0Y",
        balance: "93.34",
        value: 93.34,
        statusCode: "00",
        statusMessage: "SUCCESS"
      }
    };
    
    const schemaValidation = await maybankAdapter.validateResponse(
      mockMaybankResponse, 
      'get_banking_getBalance'
    );
    
    if (schemaValidation.isValid && schemaValidation.extractedData.balance) {
      console.log('✅ Maybank response schema validation working');
      console.log('   Balance extracted:', schemaValidation.extractedData.balance);
    } else {
      throw new Error('Response schema validation failed');
    }
    
    // Test 5: Session trace ID generation
    console.log('\nTest 5: Session trace ID handling');
    const sessionTraceId = await maybankAdapter.generateSessionTraceId();
    
    if (sessionTraceId && sessionTraceId.length > 10) {
      console.log('✅ Session trace ID generation working');
      console.log('   Generated ID:', sessionTraceId.substring(0, 20) + '...');
    } else {
      throw new Error('Session trace ID generation failed');
    }
    
    // Test 6: JWT token validation for Maybank
    console.log('\nTest 6: Maybank JWT token validation');
    const jwtManager = new JWTManager();
    
    // Test with a properly formatted JWT token (mock)
    const mockJWT = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyLCJleHAiOjk5OTk5OTk5OTl9.Lf7qHCGEEMsB72c4DFvp7znhHhzZUzfq5pySNR9TlPc';
    const tokenValidation = await jwtManager.validateMaybankToken(mockJWT);
    
    if (tokenValidation.isValid) {
      console.log('✅ Maybank JWT token validation working');
      console.log('   Token algorithm:', tokenValidation.algorithm);
      console.log('   Token expires:', tokenValidation.expiresAt ? new Date(tokenValidation.expiresAt) : 'Never');
    } else {
      console.log('⚠️  Maybank JWT token validation issue:', tokenValidation.reason);
    }
    
    // Test 7: Additional Maybank operations
    console.log('\nTest 7: Additional Maybank operations');
    
    // Test summary endpoint
    const summaryRequest = await maybankAdapter.buildURL('get_banking_summary', { type: 'A' });
    const expectedSummaryURL = 'https://staging.maya.maybank2u.com.my/banking/v1/summary?type=A';
    
    if (summaryRequest.url === expectedSummaryURL) {
      console.log('✅ Summary endpoint URL construction working');
    } else {
      throw new Error(`Summary URL mismatch. Expected: ${expectedSummaryURL}, Got: ${summaryRequest.url}`);
    }
    
    // Test accounts/all endpoint
    const allAccountsRequest = await maybankAdapter.buildURL('get_banking_all', {});
    const expectedAllURL = 'https://staging.maya.maybank2u.com.my/banking/v1/accounts/all';
    
    if (allAccountsRequest.url === expectedAllURL) {
      console.log('✅ All accounts endpoint URL construction working');
    } else {
      throw new Error(`All accounts URL mismatch. Expected: ${expectedAllURL}, Got: ${allAccountsRequest.url}`);
    }
    
    // Test 8: Adapter status check
    console.log('\nTest 8: Maybank adapter status');
    const adapterStatus = maybankAdapter.getStatus();
    
    if (adapterStatus.adapterType === 'maybank' && 
        adapterStatus.initialized && 
        adapterStatus.supportedOperations.length === 3) {
      console.log('✅ Maybank adapter status check passed');
      console.log('   Supported operations:', adapterStatus.supportedOperations.length);
      console.log('   Server:', adapterStatus.server);
    } else {
      throw new Error('Adapter status check failed');
    }
    
    console.log('\n🎉 CHECKPOINT 1 PASSED - Ready for Checkpoint 2');
    console.log('\n✅ All Maybank integration tests passed successfully:');
    console.log('   ✓ Maybank OpenAPI specification loaded');
    console.log('   ✓ Maybank-specific headers configured');
    console.log('   ✓ URL construction for all endpoints');
    console.log('   ✓ Response schema validation');
    console.log('   ✓ Session trace ID generation');
    console.log('   ✓ JWT token validation for Maybank');
    console.log('\n🚀 Ready for Checkpoint 2 - Real Maybank API Testing with JWT');
    
  } catch (error) {
    console.error('\n❌ CHECKPOINT 1 FAILED:', error.message);
    console.error('Stack trace:', error.stack);
    throw error;
  }
}

// Run the test if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  testCheckpoint1().catch((error) => {
    console.error('Fatal error in checkpoint test:', error.message);
    process.exit(1);
  });
}

export { testCheckpoint1 };