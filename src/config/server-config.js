import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

export const config = {
  apis: {
    weather: {
      apiKey: process.env.WEATHER_API_KEY,
      timeout: parseInt(process.env.DEFAULT_TIMEOUT) || 10000,
      retries: parseInt(process.env.MAX_RETRIES) || 3
    }
  },
  server: {
    name: process.env.MCP_SERVER_NAME || 'api-gateway',
    version: process.env.MCP_SERVER_VERSION || '1.0.0',
    logLevel: process.env.LOG_LEVEL || 'info'
  }
};

// Configuration validation
export function validateConfig() {
  const errors = [];
  const warnings = [];
  
  // Check required API keys
  if (!config.apis.weather.apiKey) {
    errors.push('WEATHER_API_KEY environment variable is required');
  }
  
  // Validate timeout values
  if (config.apis.weather.timeout < 1000) {
    warnings.push('DEFAULT_TIMEOUT is very low (< 1s), may cause request failures');
  }
  
  if (config.apis.weather.timeout > 60000) {
    warnings.push('DEFAULT_TIMEOUT is very high (> 60s), may cause slow responses');
  }
  
  // Validate retry values
  if (config.apis.weather.retries < 0) {
    errors.push('MAX_RETRIES cannot be negative');
  }
  
  if (config.apis.weather.retries > 10) {
    warnings.push('MAX_RETRIES is very high (> 10), may cause slow error responses');
  }
  
  // Validate log level
  const validLogLevels = ['error', 'warn', 'info', 'debug'];
  if (!validLogLevels.includes(config.server.logLevel)) {
    warnings.push(`Invalid LOG_LEVEL '${config.server.logLevel}', defaulting to 'info'`);
    config.server.logLevel = 'info';
  }
  
  // Validate server name
  if (!config.server.name || config.server.name.trim().length === 0) {
    errors.push('MCP_SERVER_NAME cannot be empty');
  }
  
  // Validate version format (basic semantic versioning check)
  const versionPattern = /^\d+\.\d+\.\d+$/;
  if (!versionPattern.test(config.server.version)) {
    warnings.push(`Server version '${config.server.version}' does not follow semantic versioning (x.y.z)`);
  }
  
  return {
    valid: errors.length === 0,
    errors: errors,
    warnings: warnings
  };
}

// Get configuration for specific API
export function getApiConfig(apiName) {
  const apiConfig = config.apis[apiName];
  if (!apiConfig) {
    throw new Error(`API configuration not found for: ${apiName}`);
  }
  
  return apiConfig;
}

// Get server configuration
export function getServerConfig() {
  return config.server;
}

// Check if specific API is configured
export function isApiConfigured(apiName) {
  const apiConfig = config.apis[apiName];
  
  switch (apiName) {
    case 'weather':
      return !!(apiConfig && apiConfig.apiKey);
    default:
      return !!(apiConfig && Object.keys(apiConfig).length > 0);
  }
}

// Get configuration summary for debugging
export function getConfigSummary() {
  return {
    server: {
      name: config.server.name,
      version: config.server.version,
      logLevel: config.server.logLevel
    },
    apis: {
      weather: {
        configured: isApiConfigured('weather'),
        timeout: config.apis.weather.timeout,
        retries: config.apis.weather.retries,
        hasApiKey: !!config.apis.weather.apiKey
      }
    },
    environment: {
      nodeVersion: process.version,
      platform: process.platform,
      nodeEnv: process.env.NODE_ENV || 'development'
    }
  };
}

// Initialize configuration with validation
export function initializeConfig() {
  // Use stderr for logging to avoid polluting JSON-RPC stdout
  console.error('Initializing server configuration...');
  
  const validation = validateConfig();
  
  // Log warnings to stderr
  if (validation.warnings.length > 0) {
    console.error('Configuration warnings:');
    validation.warnings.forEach(warning => console.error(`  - ${warning}`));
  }
  
  // Handle errors
  if (!validation.valid) {
    console.error('Configuration errors:');
    validation.errors.forEach(error => console.error(`  - ${error}`));
    throw new Error(`Configuration validation failed: ${validation.errors.join(', ')}`);
  }
  
  console.error('Configuration initialized successfully');
  
  // Log configuration summary (without sensitive data) to stderr
  const summary = getConfigSummary();
  console.error('Configuration summary:', JSON.stringify(summary, null, 2));
  
  return config;
}