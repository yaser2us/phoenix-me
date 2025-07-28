import { ApiRegistry } from './src/registry/api-registry.js';
import { ApiExecutor } from './src/execution/executor.js';

async function testApiExecutor() {
  console.log('🧪 Testing ApiExecutor...\n');

  try {
    // Setup: Initialize registry and executor
    const registry = new ApiRegistry();
    await registry.initialize();
    
    const mockAuthConfig = {
      weather: {
        apiKey: 'test-api-key-123'
      }
    };
    
    const executor = new ApiExecutor(registry, mockAuthConfig);

    // Test 1: Executor configuration
    console.log('Test 1: Executor configuration');
    const status = executor.getStatus();
    if (!status.registryInitialized || !status.authConfigured) {
      throw new Error('Executor not properly configured');
    }
    console.log('✅ Executor properly configured');
    console.log(`   Registry: ${status.registryInitialized}, Auth: ${status.authConfigured}, Operations: ${status.operationsCount}`);
    
    // Test 2: Weather response formatting
    console.log('\nTest 2: Weather response formatting');
    const mockWeatherData = {
      name: 'London',
      sys: { country: 'GB' },
      coord: { lat: 51.5074, lon: -0.1278 },
      weather: [
        { main: 'Clear', description: 'clear sky', icon: '01d' }
      ],
      main: {
        temp: 20.5,
        feels_like: 18.3,
        temp_min: 18.0,
        temp_max: 23.0,
        pressure: 1013,
        humidity: 65
      },
      wind: { speed: 3.5, deg: 180 },
      visibility: 10000
    };
    
    const operationDetails = registry.getOperationDetails('getCurrentWeather');
    const formatted = executor.formatResponse({ data: mockWeatherData, status: 200 }, operationDetails);
    
    if (!formatted.location || formatted.location !== 'London') {
      throw new Error('Weather response formatting failed');
    }
    console.log('✅ Weather response formatting works');
    console.log(`   Location: ${formatted.location}, Temp: ${formatted.temperature.current}°C`);
    
    // Test 3: Error handling - authentication error
    console.log('\nTest 3: Error handling (authentication)');
    const authError = new Error('API authentication failed - check API key');
    const authErrorResponse = executor.handleApiError(authError, 'getCurrentWeather');
    
    if (authErrorResponse.success || authErrorResponse.errorType !== 'authentication') {
      throw new Error('Authentication error not handled correctly');
    }
    console.log('✅ Authentication error handled correctly');
    console.log(`   Error type: ${authErrorResponse.errorType}, Message: ${authErrorResponse.error}`);
    
    // Test 4: Error handling - timeout error
    console.log('\nTest 4: Error handling (timeout)');
    const timeoutError = new Error('API request timeout - service may be down');
    const timeoutErrorResponse = executor.handleApiError(timeoutError, 'getCurrentWeather');
    
    if (timeoutErrorResponse.success || timeoutErrorResponse.errorType !== 'network') {
      throw new Error('Timeout error not handled correctly');
    }
    console.log('✅ Timeout error handled correctly');
    console.log(`   Error type: ${timeoutErrorResponse.errorType}`);
    
    // Test 5: Error handling - validation error
    console.log('\nTest 5: Error handling (validation)');
    const validationError = new Error('Parameter validation failed: Required parameter \'q\' is missing');
    const validationErrorResponse = executor.handleApiError(validationError, 'getCurrentWeather');
    
    if (validationErrorResponse.success || validationErrorResponse.errorType !== 'validation') {
      throw new Error('Validation error not handled correctly');
    }
    console.log('✅ Validation error handled correctly');
    
    // Test 6: Successful execution simulation (without real API call)
    console.log('\nTest 6: Execution flow (mocked)');
    
    // Mock the HTTP client to avoid real API calls
    const originalMakeRequest = executor.makeHttpRequest;
    executor.makeHttpRequest = async (requestConfig) => {
      // Simulate successful API response
      if (requestConfig.params && requestConfig.params.q === 'TestCity') {
        return {
          status: 200,
          statusText: 'OK',
          data: {
            name: 'TestCity',
            sys: { country: 'TC' },
            coord: { lat: 0, lon: 0 },
            weather: [{ main: 'Sunny', description: 'sunny', icon: '01d' }],
            main: { temp: 25, feels_like: 24, temp_min: 20, temp_max: 30, pressure: 1010, humidity: 50 }
          }
        };
      }
      throw new Error('Mock API call failed');
    };
    
    const result = await executor.executeOperation('getCurrentWeather', { q: 'TestCity' });
    
    if (!result.success || !result.data.location) {
      throw new Error('Mocked execution failed');
    }
    console.log('✅ Execution flow works');
    console.log(`   Result: ${result.data.location}, Success: ${result.success}`);
    
    // Restore original method
    executor.makeHttpRequest = originalMakeRequest;
    
    // Test 7: HTTP request error simulation
    console.log('\nTest 7: HTTP error handling');
    
    // Mock HTTP client to simulate 404 error (matching the actual error message from makeHttpRequest)
    executor.makeHttpRequest = async () => {
      throw new Error('Requested resource not found');
    };
    
    const errorResult = await executor.executeOperation('getCurrentWeather', { q: 'NonExistentCity' });
    
    if (errorResult.success || errorResult.errorType !== 'not_found') {
      throw new Error('HTTP 404 error not handled correctly');
    }
    console.log('✅ HTTP 404 error handled correctly');
    
    // Restore original method
    executor.makeHttpRequest = originalMakeRequest;
    
    console.log('\n🎉 All ApiExecutor tests passed!');
    
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
}

testApiExecutor();