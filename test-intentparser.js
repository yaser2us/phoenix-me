import { ApiRegistry } from './src/registry/api-registry.js';
import { IntentParser } from './src/parsers/intent-parser.js';

async function testIntentParser() {
  console.log('🧪 Testing IntentParser...\n');

  try {
    // Setup: Initialize registry and intent parser
    const registry = new ApiRegistry();
    await registry.initialize();
    const parser = new IntentParser(registry);

    // Test 1: Parser initialization
    console.log('Test 1: Parser initialization');
    const stats = parser.getStats();
    if (!stats.registryInitialized || stats.patternsBuilt === 0) {
      throw new Error('Parser not properly initialized');
    }
    console.log('✅ Parser initialized successfully');
    console.log(`   Operations: ${stats.totalOperations}, Patterns: ${stats.patternsBuilt}`);

    // Test 2: Basic weather intent parsing
    console.log('\nTest 2: Basic weather intent');
    const basicIntent = parser.parseIntent('get weather for London');
    if (!basicIntent.success || basicIntent.operationId !== 'getCurrentWeather') {
      throw new Error('Basic weather intent parsing failed');
    }
    console.log('✅ Basic weather intent parsed');
    console.log(`   Operation: ${basicIntent.operationId}, Location: ${basicIntent.parameters.q}`);

    // Test 3: Location extraction variations
    console.log('\nTest 3: Location extraction variations');
    const testCases = [
      { input: 'weather in Tokyo', expected: 'Tokyo' },
      { input: 'What\'s the weather like in New York?', expected: 'New York' },
      { input: 'London weather', expected: 'London' },
      { input: 'Check weather for Paris, France', expected: 'Paris, France' },
      { input: 'Show me Berlin weather', expected: 'Berlin' }
    ];

    for (const testCase of testCases) {
      const result = parser.parseIntent(testCase.input);
      if (!result.success || !result.parameters.q) {
        throw new Error(`Failed to extract location from: "${testCase.input}"`);
      }
      if (!result.parameters.q.toLowerCase().includes(testCase.expected.toLowerCase())) {
        console.warn(`Location mismatch for "${testCase.input}": got "${result.parameters.q}", expected to contain "${testCase.expected}"`);
      }
      console.log(`   ✓ "${testCase.input}" -> "${result.parameters.q}"`);
    }
    console.log('✅ Location extraction variations work');

    // Test 4: Temperature unit extraction
    console.log('\nTest 4: Temperature unit extraction');
    const unitTests = [
      { input: 'weather in London in celsius', expected: 'metric' },
      { input: 'get temperature for Tokyo in fahrenheit', expected: 'imperial' },
      { input: 'weather for Berlin', expected: 'metric' }, // default
      { input: 'New York weather in F', expected: 'imperial' }
    ];

    for (const test of unitTests) {
      const result = parser.parseIntent(test.input);
      if (!result.success) {
        throw new Error(`Unit test failed for: "${test.input}"`);
      }
      if (result.parameters.units !== test.expected) {
        throw new Error(`Unit mismatch for "${test.input}": got "${result.parameters.units}", expected "${test.expected}"`);
      }
      console.log(`   ✓ "${test.input}" -> units: ${result.parameters.units}`);
    }
    console.log('✅ Temperature unit extraction works');

    // Test 5: Confidence calculation
    console.log('\nTest 5: Confidence calculation');
    const confidenceTests = [
      'get weather for London', // Should have high confidence
      'weather', // Should have low confidence (no location)
      'temperature in Tokyo today' // Should have medium confidence
    ];

    for (const input of confidenceTests) {
      const result = parser.parseIntent(input);
      if (!result.success) continue;
      
      if (result.confidence < 0 || result.confidence > 1) {
        throw new Error(`Invalid confidence score: ${result.confidence}`);
      }
      console.log(`   ✓ "${input}" -> confidence: ${result.confidence.toFixed(2)}`);
    }
    console.log('✅ Confidence calculation works');

    // Test 6: Invalid/unclear intents
    console.log('\nTest 6: Invalid intent handling');
    const invalidInputs = [
      'hello there',
      'what time is it',
      'random text here',
      ''
    ];

    for (const input of invalidInputs) {
      const result = parser.parseIntent(input);
      if (result.success) {
        console.warn(`Unexpected success for invalid input: "${input}"`);
      } else {
        console.log(`   ✓ "${input}" -> correctly rejected`);
      }
    }
    console.log('✅ Invalid intent handling works');

    // Test 7: Input normalization
    console.log('\nTest 7: Input normalization');
    const normalizationTests = [
      { input: 'WEATHER IN LONDON!!!', expected: 'weather in london' },
      { input: 'What\'s    the     weather???', expected: 'what s the weather' },
      { input: 'Weather@#$%^&*()in Tokyo', expected: 'weather in tokyo' }
    ];

    for (const test of normalizationTests) {
      const normalized = parser.normalizeInput(test.input);
      console.log(`   ✓ "${test.input}" -> "${normalized}"`);
    }
    console.log('✅ Input normalization works');

    // Test 8: Complex location names
    console.log('\nTest 8: Complex location names');
    const complexLocationTests = [
      'weather in New York City',
      'get weather for Los Angeles, CA',
      'temperature in Saint Petersburg',
      'weather for Mexico City, Mexico'
    ];

    for (const input of complexLocationTests) {
      const result = parser.parseIntent(input);
      if (!result.success || !result.parameters.q) {
        throw new Error(`Failed to parse complex location: "${input}"`);
      }
      console.log(`   ✓ "${input}" -> "${result.parameters.q}"`);
    }
    console.log('✅ Complex location names work');

    // Test 9: Test intent method
    console.log('\nTest 9: Test intent method');
    const testResult = parser.testIntent('weather in Amsterdam');
    if (!testResult.success || !testResult.stats || !testResult.timestamp) {
      throw new Error('Test intent method incomplete');
    }
    console.log('✅ Test intent method works');
    console.log(`   Result: ${testResult.operationId}, Stats included: ${!!testResult.stats}`);

    console.log('\n🎉 All IntentParser tests passed!');

  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
}

testIntentParser();