import { ApiRegistry } from './src/registry/api-registry.js';
import { ApiExecutor } from './src/execution/executor.js';
import { config } from './src/config/server-config.js';

async function testCheckpoint2() {
  console.log('🧪 CHECKPOINT 2: Currency & Facts APIs\n');
  
  try {
    // Test 1: New specs loaded
    const registry = new ApiRegistry();
    await registry.initialize();
    const operations = registry.getAllOperations();
    console.log(`✅ Registry now has ${operations.length} operations`);
    
    // Verify we have the expected operations
    const operationIds = operations.map(op => op.operationId);
    const expectedOps = ['getCurrentWeather', 'getExchangeRates', 'getRandomFact'];
    for (const expectedOp of expectedOps) {
      if (!operationIds.includes(expectedOp)) {
        throw new Error(`Missing operation: ${expectedOp}`);
      }
    }
    console.log('✅ All expected operations present:', expectedOps.join(', '));
    
    // Test 2: Currency API works
    console.log('\nTest 2: Currency API execution');
    const executor = new ApiExecutor(registry, config.apis);
    const currencyResult = await executor.executeOperation('getExchangeRates', { base: 'USD' });
    if (!currencyResult.success) throw new Error('Currency API failed: ' + currencyResult.error);
    console.log('✅ Currency API working - Response received with status:', currencyResult.success);
    
    // Test 3: Facts API works  
    console.log('\nTest 3: Facts API execution');
    const factsResult = await executor.executeOperation('getRandomFact', {});
    if (!factsResult.success) throw new Error('Facts API failed: ' + factsResult.error);
    console.log('✅ Facts API working - Response received with status:', factsResult.success);
    
    // Test 4: Phase 1 weather still works
    console.log('\nTest 4: Phase 1 backward compatibility');
    const weatherOp = registry.findOperationByIntent('weather london');
    if (!weatherOp || weatherOp !== 'getCurrentWeather') {
      throw new Error('Weather operation not found or changed');
    }
    console.log('✅ Phase 1 weather functionality preserved');
    
    console.log('\n🎉 CHECKPOINT 2 PASSED - Ready for Checkpoint 3');
    
  } catch (error) {
    console.error('\n❌ CHECKPOINT 2 FAILED:', error.message);
    throw error;
  }
}

testCheckpoint2();