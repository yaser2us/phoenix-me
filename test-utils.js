import { logger } from './src/utils/logger.js';
import { Validators } from './src/utils/validators.js';

async function testUtils() {
  console.log('🧪 Testing Utility Classes...\n');

  try {
    // Test 1: Logger basic functionality
    console.log('Test 1: Logger basic functionality');
    const originalConsoleLog = console.log;
    const originalConsoleError = console.error;
    const originalConsoleWarn = console.warn;
    
    let logOutput = [];
    
    // Capture console output
    console.log = (...args) => logOutput.push(['log', ...args]);
    console.error = (...args) => logOutput.push(['error', ...args]);
    console.warn = (...args) => logOutput.push(['warn', ...args]);
    
    logger.info('Test info message');
    logger.error('Test error message');
    logger.warn('Test warning message');
    logger.debug('Test debug message'); // Should not appear with default 'info' level
    
    // Restore console
    console.log = originalConsoleLog;
    console.error = originalConsoleError;
    console.warn = originalConsoleWarn;
    
    if (logOutput.length < 3) {
      throw new Error('Logger not outputting messages');
    }
    console.log('✅ Logger basic functionality works');
    console.log(`   Captured ${logOutput.length} log messages`);
    
    // Test 2: Logger log level control
    console.log('\nTest 2: Logger log level control');
    logger.setLogLevel('debug');
    if (logger.getLogLevel() !== 'debug') {
      throw new Error('Log level not set correctly');
    }
    
    if (!logger.isDebugEnabled()) {
      throw new Error('Debug level check failed');
    }
    
    console.log('✅ Logger log level control works');
    
    // Reset log level
    logger.setLogLevel('info');
    
    // Test 3: Logger specialized methods
    console.log('\nTest 3: Logger specialized methods');
    
    // These should not throw errors
    logger.operationStart('testOp', { param: 'value' });
    logger.operationSuccess('testOp', 150);
    logger.operationError('testOp', new Error('Test error'), 200);
    logger.apiRequest('GET', 'https://api.example.com', { q: 'test' });
    logger.apiResponse(200, 'https://api.example.com', 100);
    logger.mcpToolCall('testTool', { arg: 'value' });
    logger.mcpToolResponse('testTool', true, 50);
    logger.serverStart(3000);
    logger.registryInit(2, 5);
    
    console.log('✅ Logger specialized methods work');
    
    // Test 4: Validators - Tool arguments
    console.log('\nTest 4: Validators - Tool arguments');
    
    const toolSchema = {
      required: ['location'],
      properties: {
        location: { type: 'string', minLength: 2 },
        units: { type: 'string', enum: ['metric', 'imperial'] }
      }
    };
    
    // Valid arguments
    const validArgs = { location: 'London', units: 'metric' };
    const validValidation = Validators.validateToolArguments(validArgs, toolSchema);
    if (!validValidation.valid) {
      throw new Error(`Valid arguments failed validation: ${validValidation.errors.join(', ')}`);
    }
    
    // Invalid arguments - missing required
    const invalidArgs = { units: 'metric' };
    const invalidValidation = Validators.validateToolArguments(invalidArgs, toolSchema);
    if (invalidValidation.valid) {
      throw new Error('Invalid arguments passed validation');
    }
    
    console.log('✅ Tool argument validation works');
    console.log(`   Valid args passed, invalid args rejected with ${invalidValidation.errors.length} errors`);
    
    // Test 5: Validators - Location validation
    console.log('\nTest 5: Validators - Location validation');
    
    const validLocation = Validators.validateLocation('New York');
    if (!validLocation.valid) {
      throw new Error('Valid location failed validation');
    }
    
    const invalidLocation = Validators.validateLocation('');
    if (invalidLocation.valid) {
      throw new Error('Invalid location passed validation');
    }
    
    const dirtyLocation = Validators.validateLocation('  London  ');
    if (!dirtyLocation.valid || dirtyLocation.sanitized !== 'London') {
      throw new Error('Location sanitization failed');
    }
    
    console.log('✅ Location validation works');
    console.log(`   Sanitized "  London  " -> "${dirtyLocation.sanitized}"`);
    
    // Test 6: Validators - Temperature units
    console.log('\nTest 6: Validators - Temperature units');
    
    const validUnits = Validators.validateTemperatureUnits('METRIC');
    if (!validUnits.valid || validUnits.sanitized !== 'metric') {
      throw new Error('Valid units failed validation or normalization');
    }
    
    const invalidUnits = Validators.validateTemperatureUnits('celsius');
    if (invalidUnits.valid) {
      throw new Error('Invalid units passed validation');
    }
    
    const defaultUnits = Validators.validateTemperatureUnits(null);
    if (!defaultUnits.valid || defaultUnits.sanitized !== 'metric') {
      throw new Error('Default units handling failed');
    }
    
    console.log('✅ Temperature units validation works');
    console.log(`   "METRIC" normalized to "${validUnits.sanitized}"`);
    
    // Test 7: Validators - URL validation
    console.log('\nTest 7: Validators - URL validation');
    
    const validUrl = Validators.validateUrl('https://api.example.com/weather');
    if (!validUrl.valid) {
      throw new Error('Valid URL failed validation');
    }
    
    const invalidUrl = Validators.validateUrl('not-a-url');
    if (invalidUrl.valid) {
      throw new Error('Invalid URL passed validation');
    }
    
    console.log('✅ URL validation works');
    
    // Test 8: Validators - Operation ID validation
    console.log('\nTest 8: Validators - Operation ID validation');
    
    const validOpId = Validators.validateOperationId('getCurrentWeather');
    if (!validOpId.valid) {
      throw new Error('Valid operation ID failed validation');
    }
    
    const invalidOpId = Validators.validateOperationId('123invalid');
    if (invalidOpId.valid) {
      throw new Error('Invalid operation ID passed validation');
    }
    
    console.log('✅ Operation ID validation works');
    
    // Test 9: Validators - JSON validation
    console.log('\nTest 9: Validators - JSON validation');
    
    const validJson = Validators.validateJson('{"key": "value"}');
    if (!validJson.valid || validJson.parsed.key !== 'value') {
      throw new Error('Valid JSON failed validation or parsing');
    }
    
    const invalidJson = Validators.validateJson('{"invalid": json}');
    if (invalidJson.valid) {
      throw new Error('Invalid JSON passed validation');
    }
    
    console.log('✅ JSON validation works');
    
    // Test 10: Validators - API response validation
    console.log('\nTest 10: Validators - API response validation');
    
    const validResponse = Validators.validateApiResponse({
      success: true,
      data: { result: 'test' }
    });
    if (!validResponse.valid) {
      throw new Error('Valid API response failed validation');
    }
    
    const invalidResponse = Validators.validateApiResponse({
      success: true
      // missing data property
    });
    if (invalidResponse.valid) {
      throw new Error('Invalid API response passed validation');
    }
    
    console.log('✅ API response validation works');
    
    // Test 11: Validators - Input sanitization
    console.log('\nTest 11: Validators - Input sanitization');
    
    const dirtyInput = '  Multiple    spaces   and   extra   ';
    const sanitized = Validators.sanitizeInput(dirtyInput);
    if (sanitized !== 'Multiple spaces and extra') {
      throw new Error(`Input sanitization failed: "${sanitized}"`);
    }
    
    console.log('✅ Input sanitization works');
    console.log(`   "${dirtyInput}" -> "${sanitized}"`);
    
    // Test 12: Validators - Environment validation
    console.log('\nTest 12: Validators - Environment validation');
    
    const envValidation = Validators.validateEnvironment();
    // This will likely have errors due to missing WEATHER_API_KEY, which is expected
    console.log(`✅ Environment validation completed`);
    console.log(`   Errors: ${envValidation.errors.length}, Warnings: ${envValidation.warnings.length}`);
    
    // Test 13: Validators - Type validation
    console.log('\nTest 13: Validators - Type validation');
    
    if (!Validators.validateType('string', 'string')) {
      throw new Error('String type validation failed');
    }
    
    if (!Validators.validateType(42, 'number')) {
      throw new Error('Number type validation failed');
    }
    
    if (!Validators.validateType(42, 'integer')) {
      throw new Error('Integer type validation failed');
    }
    
    if (Validators.validateType(3.14, 'integer')) {
      throw new Error('Float should not validate as integer');
    }
    
    if (!Validators.validateType([], 'array')) {
      throw new Error('Array type validation failed');
    }
    
    if (!Validators.validateType({}, 'object')) {
      throw new Error('Object type validation failed');
    }
    
    console.log('✅ Type validation works');
    
    console.log('\n🎉 All Utility Classes tests passed!');
    
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
}

testUtils();