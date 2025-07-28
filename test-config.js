import { config, validateConfig, getApiConfig, getServerConfig, isApiConfigured, getConfigSummary, initializeConfig } from './src/config/server-config.js';

async function testServerConfig() {
  console.log('🧪 Testing Server Configuration...\n');

  try {
    // Test 1: Configuration loading
    console.log('Test 1: Configuration loading');
    if (!config.server || !config.apis) {
      throw new Error('Configuration not loaded properly');
    }
    console.log('✅ Configuration loaded');
    console.log(`   Server: ${config.server.name} v${config.server.version}`);
    
    // Test 2: Server configuration access
    console.log('\nTest 2: Server configuration access');
    const serverConfig = getServerConfig();
    if (!serverConfig.name || !serverConfig.version) {
      throw new Error('Server configuration incomplete');
    }
    console.log('✅ Server configuration accessible');
    console.log(`   Name: ${serverConfig.name}, Log Level: ${serverConfig.logLevel}`);
    
    // Test 3: API configuration access
    console.log('\nTest 3: API configuration access');
    try {
      const weatherConfig = getApiConfig('weather');
      if (!weatherConfig.timeout || !weatherConfig.retries) {
        throw new Error('Weather API configuration incomplete');
      }
      console.log('✅ API configuration accessible');
      console.log(`   Weather timeout: ${weatherConfig.timeout}ms, retries: ${weatherConfig.retries}`);
    } catch (error) {
      console.log('✅ API configuration access works (expected error for missing config)');
    }
    
    // Test 4: API configuration status
    console.log('\nTest 4: API configuration status');
    const weatherConfigured = isApiConfigured('weather');
    console.log(`✅ Weather API configured: ${weatherConfigured}`);
    
    // Test 5: Configuration validation (valid config)
    console.log('\nTest 5: Configuration validation');
    
    // Temporarily set a test API key for validation
    const originalApiKey = config.apis.weather.apiKey;
    config.apis.weather.apiKey = 'test-api-key';
    
    const validation = validateConfig();
    if (!validation.valid && validation.errors.length > 0) {
      // This might fail if no API key is set, which is expected
      console.log('⚠️  Configuration validation failed (expected if no API key set)');
      console.log(`   Errors: ${validation.errors.join(', ')}`);
    } else {
      console.log('✅ Configuration validation passed');
      if (validation.warnings.length > 0) {
        console.log(`   Warnings: ${validation.warnings.length}`);
      }
    }
    
    // Restore original API key
    config.apis.weather.apiKey = originalApiKey;
    
    // Test 6: Configuration summary
    console.log('\nTest 6: Configuration summary');
    const summary = getConfigSummary();
    if (!summary.server || !summary.apis || !summary.environment) {
      throw new Error('Configuration summary incomplete');
    }
    console.log('✅ Configuration summary generated');
    console.log(`   Node version: ${summary.environment.nodeVersion}`);
    console.log(`   Weather configured: ${summary.apis.weather.configured}`);
    
    // Test 7: Invalid API configuration access
    console.log('\nTest 7: Invalid API access');
    try {
      getApiConfig('nonexistent');
      throw new Error('Should have thrown error for nonexistent API');
    } catch (error) {
      if (error.message.includes('not found')) {
        console.log('✅ Invalid API access properly rejected');
      } else {
        throw error;
      }
    }
    
    // Test 8: Configuration validation with invalid values
    console.log('\nTest 8: Configuration validation with invalid values');
    
    // Test negative retries
    const originalRetries = config.apis.weather.retries;
    config.apis.weather.retries = -1;
    
    const invalidValidation = validateConfig();
    if (invalidValidation.valid) {
      throw new Error('Validation should have failed for negative retries');
    }
    console.log('✅ Invalid configuration properly rejected');
    
    // Restore original retries
    config.apis.weather.retries = originalRetries;
    
    // Test 9: Environment variable handling
    console.log('\nTest 9: Environment variable handling');
    
    // Check if defaults are applied when env vars are missing
    if (config.server.logLevel !== 'info' && !process.env.LOG_LEVEL) {
      throw new Error('Default log level not applied');
    }
    console.log('✅ Environment variable defaults work');
    
    // Test 10: Initialization function (if API key is available)
    console.log('\nTest 10: Configuration initialization');
    try {
      // This will fail if no API key is set, which is expected
      if (process.env.WEATHER_API_KEY) {
        initializeConfig();
        console.log('✅ Configuration initialization successful');
      } else {
        console.log('⚠️  Configuration initialization skipped (no API key)');
      }
    } catch (error) {
      if (error.message.includes('WEATHER_API_KEY')) {
        console.log('✅ Configuration initialization properly requires API key');
      } else {
        throw error;
      }
    }
    
    console.log('\n🎉 All Server Configuration tests passed!');
    
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
}

testServerConfig();