import { ApiRegistry } from './src/registry/api-registry.js';

async function testApiRegistry() {
  console.log('🧪 Testing ApiRegistry...\n');

  try {
    // Test 1: Registry initialization
    console.log('Test 1: Registry initialization');
    const registry = new ApiRegistry();
    await registry.initialize();
    console.log('✅ Registry initialized successfully');
    
    // Test 2: Check specs loaded
    console.log('\nTest 2: Specs loading');
    const hasSpecs = registry.specs.size > 0;
    if (!hasSpecs) {
      throw new Error('No specs loaded');
    }
    console.log(`✅ ${registry.specs.size} spec(s) loaded`);
    
    // Test 3: Check operations registered
    console.log('\nTest 3: Operations registration');
    const operations = registry.getAllOperations();
    if (operations.length === 0) {
      throw new Error('No operations registered');
    }
    console.log(`✅ ${operations.length} operation(s) registered`);
    operations.forEach(op => {
      console.log(`   - ${op.operationId}: ${op.method} ${op.path}`);
    });
    
    // Test 4: Intent matching
    console.log('\nTest 4: Intent matching');
    const weatherIntent = registry.findOperationByIntent('get weather for London');
    if (!weatherIntent) {
      throw new Error('Weather intent not matched');
    }
    console.log(`✅ Intent matched to operation: ${weatherIntent}`);
    
    // Test 5: Operation details retrieval
    console.log('\nTest 5: Operation details');
    const details = registry.getOperationDetails(weatherIntent);
    if (!details || !details.parameters) {
      throw new Error('Operation details incomplete');
    }
    console.log(`✅ Operation details retrieved: ${details.summary}`);
    console.log(`   Parameters: ${details.parameters.length}`);
    
    // Test 6: Validation
    console.log('\nTest 6: Spec validation');
    const testSpec = {
      openapi: '3.0.0',
      info: { title: 'Test API', version: '1.0.0' },
      paths: {
        '/test': {
          get: {
            operationId: 'testOp',
            summary: 'Test operation'
          }
        }
      }
    };
    const validation = registry.validateSpec(testSpec);
    if (!validation.valid) {
      throw new Error('Valid spec failed validation');
    }
    console.log('✅ Spec validation works');
    
    console.log('\n🎉 All ApiRegistry tests passed!');
    
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    process.exit(1);
  }
}

testApiRegistry();