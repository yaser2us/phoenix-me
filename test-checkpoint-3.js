import { ApiRegistry } from './src/registry/api-registry.js';
import { ApiExecutor } from './src/execution/executor.js';
import { IntentParser } from './src/parsers/intent-parser.js';
import { config } from './src/config/server-config.js';

async function testCheckpoint3() {
  console.log('🧪 CHECKPOINT 3: Geolocation & Intent Parsing\n');
  
  try {
    // Initialize components
    const registry = new ApiRegistry();
    await registry.initialize();
    const executor = new ApiExecutor(registry, config.apis);
    
    // Test 1: Geolocation API works
    console.log('Test 1: Geolocation API execution');
    const locationResult = await executor.executeOperation('getCurrentLocation', {});
    if (!locationResult.success) throw new Error('Geolocation API failed: ' + locationResult.error);
    console.log('✅ Geolocation API working - Response received');
    
    // Test 2: Enhanced intent parsing
    console.log('\nTest 2: Multi-API intent routing');
    const parser = new IntentParser(registry);
    
    const testCases = [
      { input: 'weather in Tokyo', expectedAPI: 'weather' },
      { input: 'convert USD to EUR', expectedAPI: 'currency' },
      { input: 'where am I', expectedAPI: 'geolocation' },
      { input: 'random fact', expectedAPI: 'facts' }
    ];
    
    for (const test of testCases) {
      const result = parser.parseIntentEnhanced(test.input);
      if (result.success && result.apiType === test.expectedAPI) {
        console.log(`✅ "${test.input}" → ${result.apiType}`);
      } else {
        throw new Error(`Intent parsing failed: "${test.input}" → ${result.apiType || 'failed'} (expected: ${test.expectedAPI})`);
      }
    }
    
    // Test 3: Registry has all expected operations
    console.log('\nTest 3: Complete API registry');
    const operations = registry.getAllOperations();
    const expectedOps = ['getCurrentWeather', 'getExchangeRates', 'getRandomFact', 'getCurrentLocation', 'getLocationByIP'];
    
    for (const expectedOp of expectedOps) {
      const hasOp = operations.some(op => op.operationId === expectedOp);
      if (!hasOp) {
        throw new Error(`Missing operation: ${expectedOp}`);
      }
    }
    console.log(`✅ Registry has all ${expectedOps.length} expected operations`);
    
    // Test 4: Verify API categorization works
    console.log('\nTest 4: API categorization functionality');
    const categorization = parser.categorizeIntent('convert 100 dollars to euros');
    if (categorization.apiType !== 'currency') {
      throw new Error(`Categorization failed: got ${categorization.apiType}, expected currency`);
    }
    console.log('✅ API categorization working correctly');
    
    console.log('\n🎉 CHECKPOINT 3 PASSED - Ready for Checkpoint 4');
    
  } catch (error) {
    console.error('\n❌ CHECKPOINT 3 FAILED:', error.message);
    throw error;
  }
}

testCheckpoint3();