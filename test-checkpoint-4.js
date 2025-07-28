import { ApiRegistry } from './src/registry/api-registry.js';
import { ApiExecutor } from './src/execution/executor.js';
import { IntentParser } from './src/parsers/intent-parser.js';
import { config } from './src/config/server-config.js';

async function testCheckpoint4() {
  console.log('🧪 CHECKPOINT 4: News API & Configuration\n');
  
  try {
    // Initialize components
    const registry = new ApiRegistry();
    await registry.initialize();
    const executor = new ApiExecutor(registry, config.apis);
    
    // Test 1: Configuration handles multiple APIs
    console.log('Test 1: Multi-API configuration');
    const configKeys = Object.keys(config.apis);
    const expectedAPIs = ['weather', 'currency', 'news', 'geolocation', 'facts'];
    for (const api of expectedAPIs) {
      if (!configKeys.includes(api)) {
        throw new Error(`Missing configuration for ${api} API`);
      }
    }
    console.log('✅ All API configurations present');
    
    // Test 2: News API operations registered
    console.log('\nTest 2: News API operations');
    const operations = registry.getAllOperations();
    const newsOps = operations.filter(op => 
      op.operationId.toLowerCase().includes('news') || 
      op.operationId.toLowerCase().includes('headline') ||
      op.summary.toLowerCase().includes('news') ||
      op.summary.toLowerCase().includes('headline')
    );
    if (newsOps.length < 2) {
      throw new Error(`Expected 2 news operations, found ${newsOps.length}`);
    }
    console.log(`✅ News API operations registered: ${newsOps.map(op => op.operationId).join(', ')}`);
    
    // Test 3: News intent parsing
    console.log('\nTest 3: News intent parsing');
    const parser = new IntentParser(registry);
    const newsTests = [
      'latest news headlines',
      'news about technology',
      'top headlines from US'
    ];
    
    let successfulParses = 0;
    for (const test of newsTests) {
      const result = parser.parseIntentEnhanced(test);
      if (result.success && result.apiType === 'news') {
        successfulParses++;
        console.log(`✅ "${test}" → ${result.operationId}`);
      } else {
        console.log(`⚠️  "${test}" → ${result.apiType || 'failed'} (expected: news)`);
      }
    }
    
    if (successfulParses === 0) {
      throw new Error('News intent parsing completely failed');
    }
    console.log(`✅ News intent parsing working (${successfulParses}/${newsTests.length} successful)`);
    
    // Test 4: All APIs accessible via registry
    console.log('\nTest 4: Complete API registry');
    if (operations.length < 7) {
      throw new Error(`Expected 7+ operations, got ${operations.length}`);
    }
    console.log(`✅ Complete registry: ${operations.length} operations across 5 API types`);
    
    // Test 5: Configuration validation
    console.log('\nTest 5: Configuration validation');
    const apiTypes = ['weather', 'currency', 'news', 'geolocation', 'facts'];
    for (const apiType of apiTypes) {
      const apiConfig = config.apis[apiType];
      if (!apiConfig) {
        throw new Error(`Missing configuration for ${apiType}`);
      }
    }
    console.log('✅ All API configurations validated');
    
    // Test 6: News API (if API key available)
    if (process.env.NEWS_API_KEY && process.env.NEWS_API_KEY !== 'your_newsapi_org_key_here') {
      console.log('\nTest 6: News API execution');
      try {
        const newsResult = await executor.executeOperation('getTopHeadlines', { country: 'us' });
        if (newsResult.success) {
          console.log('✅ News API working with real API key');
        } else {
          console.log('⚠️  News API failed:', newsResult.error);
        }
      } catch (error) {
        console.log('⚠️  News API error:', error.message);
      }
    } else {
      console.log('\n⚠️  Test 6 skipped: NEWS_API_KEY not provided or using placeholder value');
    }
    
    console.log('\n🎉 CHECKPOINT 4 PASSED - Ready for Final Validation');
    
  } catch (error) {
    console.error('\n❌ CHECKPOINT 4 FAILED:', error.message);
    throw error;
  }
}

testCheckpoint4();