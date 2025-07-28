import { ApiRegistry } from './src/registry/api-registry.js';
import { RequestBuilder } from './src/execution/request-builder.js';

async function testRequestBuilder() {
  console.log('🧪 Testing RequestBuilder...\n');

  try {
    // Setup: Initialize registry to get operation details
    const registry = new ApiRegistry();
    await registry.initialize();
    const operationDetails = registry.getOperationDetails('getCurrentWeather');
    
    const mockAuthConfig = {
      weather: {
        apiKey: 'test-api-key-123'
      }
    };

    // Test 1: Basic request building
    console.log('Test 1: Basic request building');
    const userParams = { q: 'London,UK', units: 'metric' };
    const request = RequestBuilder.buildRequest(operationDetails, userParams, mockAuthConfig);
    
    if (!request.url || !request.method) {
      throw new Error('Request missing essential fields');
    }
    console.log('✅ Request built successfully');
    console.log(`   URL: ${request.url}`);
    console.log(`   Method: ${request.method.toUpperCase()}`);
    console.log(`   Params: ${JSON.stringify(request.params)}`);
    
    // Test 2: Server URL extraction
    console.log('\nTest 2: Server URL extraction');
    const serverUrl = RequestBuilder.extractServerUrl(operationDetails);
    if (!serverUrl.includes('api.openweathermap.org')) {
      throw new Error('Incorrect server URL extracted');
    }
    console.log(`✅ Server URL extracted: ${serverUrl}`);
    
    // Test 3: Parameter mapping with aliases
    console.log('\nTest 3: Parameter mapping');
    const aliasParams = { location: 'Tokyo', unit: 'imperial' };
    const mapped = RequestBuilder.mapParameters(aliasParams, operationDetails.parameters);
    if (!mapped.q || mapped.q !== 'Tokyo') {
      throw new Error('Parameter alias mapping failed');
    }
    console.log('✅ Parameter mapping works with aliases');
    console.log(`   Mapped: ${JSON.stringify(mapped)}`);
    
    // Test 4: Parameter validation - success case
    console.log('\nTest 4: Parameter validation (valid)');
    const validParams = { q: 'Berlin', units: 'metric', appid: 'test-key' };
    const validation = RequestBuilder.validateParameters(validParams, operationDetails.parameters);
    if (!validation.valid) {
      throw new Error(`Valid parameters failed validation: ${validation.errors.join(', ')}`);
    }
    console.log('✅ Valid parameters pass validation');
    
    // Test 5: Parameter validation - missing required
    console.log('\nTest 5: Parameter validation (missing required)');
    const invalidParams = { units: 'metric' }; // missing required 'q'
    const invalidValidation = RequestBuilder.validateParameters(invalidParams, operationDetails.parameters);
    if (invalidValidation.valid) {
      throw new Error('Invalid parameters passed validation');
    }
    console.log('✅ Missing required parameters correctly rejected');
    console.log(`   Errors: ${invalidValidation.errors.join(', ')}`);
    
    // Test 6: Authentication addition
    console.log('\nTest 6: Authentication');
    const authRequest = RequestBuilder.buildRequest(operationDetails, { q: 'Paris' }, mockAuthConfig);
    if (!authRequest.params.appid || authRequest.params.appid !== 'test-api-key-123') {
      throw new Error('API key not added to request');
    }
    console.log('✅ Authentication added correctly');
    console.log(`   API Key: ${authRequest.params.appid}`);
    
    // Test 7: Type validation
    console.log('\nTest 7: Type validation');
    const typeValidation = RequestBuilder.validateParameterType('metric', { type: 'string', enum: ['metric', 'imperial'] }, 'units');
    if (!typeValidation.valid) {
      throw new Error('Valid enum value failed type validation');
    }
    console.log('✅ Type validation works');
    
    // Test 8: Invalid enum validation
    console.log('\nTest 8: Invalid enum validation');
    const enumValidation = RequestBuilder.validateParameterType('kelvin', { type: 'string', enum: ['metric', 'imperial'] }, 'units');
    if (enumValidation.valid) {
      throw new Error('Invalid enum value passed validation');
    }
    console.log('✅ Invalid enum values correctly rejected');
    
    console.log('\n🎉 All RequestBuilder tests passed!');
    
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    process.exit(1);
  }
}

testRequestBuilder();