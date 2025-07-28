# MCP API GATEWAY - PHASE 1: BULLETPROOF IMPLEMENTATION

## EXECUTIVE SUMMARY
Build a production-ready MCP server foundation that uses OpenAPI specifications as the single source of truth for API management. The system must demonstrate scalable architecture by successfully calling a weather API through a complete registry-based system, with zero hardcoded API details.

## CRITICAL SUCCESS CRITERIA
- ✅ MCP server starts and responds to tools without errors
- ✅ Weather API calls work through OpenAPI spec (not hardcoded)
- ✅ Adding new APIs requires only dropping OpenAPI spec files (zero code changes)
- ✅ All components pass validation tests
- ✅ Complete error handling for all external dependencies

## EXACT TECHNOLOGY STACK

### Dependencies (Exact Versions)
```json
{
  "name": "mcp-api-gateway",
  "version": "1.0.0",
  "type": "module",
  "main": "src/server.js",
  "dependencies": {
    "@modelcontextprotocol/sdk": "^0.5.0",
    "axios": "^1.6.0",
    "dotenv": "^16.3.1"
  },
  "scripts": {
    "start": "node src/server.js",
    "validate": "node src/validate.js"
  }
}
```

### Required Import Patterns
```javascript
// MCP SDK - Use these EXACT imports
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';

// HTTP client - Use default import
import axios from 'axios';

// Environment - Use this pattern
import dotenv from 'dotenv';
dotenv.config();

// File system - Use promises version
import { promises as fs } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
```

## MANDATORY FILE STRUCTURE
Create ALL of these files with complete implementations:

```
project-root/
├── package.json                    # Exact dependencies above
├── .env.example                    # Environment template
├── .gitignore                      # Standard Node.js gitignore
├── README.md                       # Setup and usage instructions
└── src/
    ├── server.js                   # Main MCP server entry point
    ├── validate.js                 # Validation test suite
    ├── registry/
    │   ├── api-registry.js         # Complete ApiRegistry class
    │   └── specs/
    │       └── weather.json        # Complete OpenAPI weather spec
    ├── execution/
    │   ├── executor.js             # Complete ApiExecutor class
    │   └── request-builder.js      # Complete RequestBuilder class
    ├── parsers/
    │   └── intent-parser.js        # Complete IntentParser class
    ├── config/
    │   └── server-config.js        # Server configuration
    └── utils/
        ├── logger.js               # Logging utilities
        └── validators.js           # Input validation utilities
```

## IMPLEMENTATION SPECIFICATIONS

### 1. OpenAPI Weather Specification (registry/specs/weather.json)
**REQUIREMENT**: Complete, valid OpenAPI 3.0 spec for OpenWeatherMap API

```json
{
  "openapi": "3.0.0",
  "info": {
    "title": "Weather API",
    "description": "OpenWeatherMap current weather API",
    "version": "1.0.0"
  },
  "servers": [
    {
      "url": "https://api.openweathermap.org/data/2.5",
      "description": "OpenWeatherMap API"
    }
  ],
  "paths": {
    "/weather": {
      "get": {
        "operationId": "getCurrentWeather",
        "summary": "Get current weather for a location",
        "description": "Returns current weather data for specified location",
        "parameters": [
          {
            "name": "q",
            "in": "query",
            "required": true,
            "description": "City name, state code and country code divided by comma",
            "schema": {
              "type": "string",
              "example": "London,UK"
            }
          },
          {
            "name": "appid",
            "in": "query", 
            "required": true,
            "description": "API key",
            "schema": {
              "type": "string"
            }
          },
          {
            "name": "units",
            "in": "query",
            "required": false,
            "description": "Temperature unit",
            "schema": {
              "type": "string",
              "enum": ["standard", "metric", "imperial"],
              "default": "metric"
            }
          }
        ],
        "responses": {
          "200": {
            "description": "Successful response",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "coord": {
                      "type": "object",
                      "properties": {
                        "lon": {"type": "number"},
                        "lat": {"type": "number"}
                      }
                    },
                    "weather": {
                      "type": "array",
                      "items": {
                        "type": "object",
                        "properties": {
                          "id": {"type": "integer"},
                          "main": {"type": "string"},
                          "description": {"type": "string"},
                          "icon": {"type": "string"}
                        }
                      }
                    },
                    "main": {
                      "type": "object",
                      "properties": {
                        "temp": {"type": "number"},
                        "feels_like": {"type": "number"},
                        "temp_min": {"type": "number"},
                        "temp_max": {"type": "number"},
                        "pressure": {"type": "integer"},
                        "humidity": {"type": "integer"}
                      }
                    },
                    "name": {"type": "string"}
                  }
                }
              }
            }
          },
          "404": {
            "description": "City not found"
          },
          "401": {
            "description": "Invalid API key"
          }
        }
      }
    }
  },
  "components": {
    "securitySchemes": {
      "ApiKeyAuth": {
        "type": "apiKey",
        "in": "query",
        "name": "appid"
      }
    }
  }
}
```

### 2. ApiRegistry Class (registry/api-registry.js)
**COMPLETE IMPLEMENTATION REQUIRED** - No placeholder methods allowed

```javascript
class ApiRegistry {
  constructor() {
    this.specs = new Map();           // Map<string, OpenAPISpec>
    this.operations = new Map();      // Map<operationId, OperationDetails>
    this.initialized = false;
  }

  async initialize() {
    // COMPLETE IMPLEMENTATION:
    // 1. Load all .json files from specs directory
    // 2. Parse and validate each OpenAPI spec
    // 3. Register all operations from all specs
    // 4. Build operation lookup tables
    // 5. Handle file system errors gracefully
    // 6. Set initialized = true
  }

  async loadSpecsFromDirectory(specsPath) {
    // COMPLETE IMPLEMENTATION:
    // 1. Read directory contents
    // 2. Filter .json files
    // 3. Load and parse each file
    // 4. Validate OpenAPI format
    // 5. Return array of valid specs
  }

  registerSpec(specName, openApiSpec) {
    // COMPLETE IMPLEMENTATION:
    // 1. Validate spec structure
    // 2. Extract all operations from paths
    // 3. Store spec in this.specs Map
    // 4. Register each operation in this.operations Map
    // 5. Build operation metadata
  }

  findOperationByIntent(userIntent) {
    // COMPLETE IMPLEMENTATION:
    // 1. Clean and normalize user intent
    // 2. Match against operation summaries/descriptions
    // 3. Use keyword matching for Phase 1
    // 4. Return best matching operationId or null
    // 5. Handle ambiguous matches
  }

  getOperationDetails(operationId) {
    // COMPLETE IMPLEMENTATION:
    // 1. Retrieve operation from this.operations
    // 2. Include full OpenAPI operation spec
    // 3. Include server information
    // 4. Include security requirements
    // 5. Return complete operation details
  }

  getAllOperations() {
    // COMPLETE IMPLEMENTATION:
    // Return array of all registered operations with metadata
  }

  validateSpec(openApiSpec) {
    // COMPLETE IMPLEMENTATION:
    // 1. Check required OpenAPI fields
    // 2. Validate paths structure
    // 3. Validate operation definitions
    // 4. Return validation results
  }
}
```

### 3. RequestBuilder Class (execution/request-builder.js)
**COMPLETE IMPLEMENTATION REQUIRED** - All static methods must work

```javascript
class RequestBuilder {
  static buildRequest(operationDetails, userParameters, authConfig) {
    // COMPLETE IMPLEMENTATION:
    // 1. Extract server URL from OpenAPI spec
    // 2. Build complete URL with path and parameters
    // 3. Map user parameters to OpenAPI parameters
    // 4. Add authentication (API key, headers)
    // 5. Set appropriate HTTP method
    // 6. Add required headers
    // 7. Validate all required parameters present
    // 8. Return complete axios request config
  }

  static extractServerUrl(operationDetails) {
    // COMPLETE IMPLEMENTATION:
    // Extract base URL from OpenAPI servers array
  }

  static mapParameters(userParams, operationParams) {
    // COMPLETE IMPLEMENTATION:
    // 1. Map user input to OpenAPI parameter names
    // 2. Handle query, path, header parameters
    // 3. Apply default values where specified
    // 4. Validate required parameters
    // 5. Return mapped parameter object
  }

  static validateParameters(userParams, operationParams) {
    // COMPLETE IMPLEMENTATION:
    // 1. Check all required parameters present
    // 2. Validate parameter types against OpenAPI schemas
    // 3. Check enum values if specified
    // 4. Return validation results with specific errors
  }

  static addAuthentication(requestConfig, operationDetails, authConfig) {
    // COMPLETE IMPLEMENTATION:
    // 1. Read security requirements from OpenAPI spec
    // 2. Apply appropriate authentication method
    // 3. Add API keys to query/headers as required
    // 4. Handle multiple security schemes
  }
}
```

### 4. ApiExecutor Class (execution/executor.js)
**COMPLETE IMPLEMENTATION REQUIRED** - Full async execution with error handling

```javascript
class ApiExecutor {
  constructor(registry, authConfig) {
    this.registry = registry;
    this.authConfig = authConfig;
    this.httpClient = axios.create({
      timeout: 10000,  // 10 second timeout
      headers: {
        'User-Agent': 'MCP-Gateway/1.0.0'
      }
    });
  }

  async executeOperation(operationId, userParameters) {
    // COMPLETE IMPLEMENTATION:
    // 1. Get operation details from registry
    // 2. Build request using RequestBuilder
    // 3. Execute HTTP request with proper error handling
    // 4. Validate response against OpenAPI schema
    // 5. Format response for MCP return
    // 6. Handle all error scenarios (network, API, validation)
    // 7. Return standardized response object
  }

  async makeHttpRequest(requestConfig) {
    // COMPLETE IMPLEMENTATION:
    // 1. Execute axios request
    // 2. Handle network timeouts
    // 3. Handle HTTP error status codes
    // 4. Handle malformed responses
    // 5. Return response data with metadata
  }

  formatResponse(apiResponse, operationDetails) {
    // COMPLETE IMPLEMENTATION:
    // 1. Extract relevant data from API response
    // 2. Format according to operation response schema
    // 3. Add metadata (timestamp, operation used, etc.)
    // 4. Return user-friendly formatted response
  }

  handleApiError(error, operationId) {
    // COMPLETE IMPLEMENTATION:
    // 1. Categorize error type (network, API, validation)
    // 2. Extract meaningful error message
    // 3. Log error details
    // 4. Return user-friendly error response
  }
}
```

### 5. IntentParser Class (parsers/intent-parser.js)
**COMPLETE IMPLEMENTATION REQUIRED** - Simple but functional intent matching

```javascript
class IntentParser {
  constructor(registry) {
    this.registry = registry;
    this.intentMap = new Map(); // Cache intent patterns
  }

  parseIntent(userInput) {
    // COMPLETE IMPLEMENTATION:
    // 1. Clean and normalize user input
    // 2. Extract key entities (location, action, etc.)
    // 3. Match against known operation patterns
    // 4. Return operationId and extracted parameters
    // 5. Handle ambiguous or unclear intents
  }

  extractParameters(userInput, operationDetails) {
    // COMPLETE IMPLEMENTATION:
    // 1. Use simple regex/string matching for Phase 1
    // 2. Extract location names, cities, etc.
    // 3. Map to OpenAPI parameter names
    // 4. Return parameter object
  }

  buildIntentPatterns() {
    // COMPLETE IMPLEMENTATION:
    // 1. Build regex patterns from operation summaries
    // 2. Create keyword mappings
    // 3. Cache patterns for quick lookup
  }

  normalizeInput(userInput) {
    // COMPLETE IMPLEMENTATION:
    // 1. Convert to lowercase
    // 2. Remove extra whitespace
    // 3. Handle common variations
    // 4. Return normalized string
  }
}
```

### 6. MCP Server (server.js)
**COMPLETE IMPLEMENTATION REQUIRED** - Production-ready MCP server

```javascript
class MCPGatewayServer {
  constructor() {
    this.server = new Server(
      { name: "api-gateway", version: "1.0.0" },
      { capabilities: { tools: {} } }
    );
    
    this.registry = null;
    this.executor = null;
    this.intentParser = null;
    this.authConfig = null;
  }

  async initialize() {
    // COMPLETE IMPLEMENTATION:
    // 1. Load environment configuration
    // 2. Initialize API registry
    // 3. Load authentication config
    // 4. Initialize executor and intent parser
    // 5. Register MCP tools dynamically
    // 6. Set up error handlers
    // 7. Validate all components work
  }

  async setupMCPTools() {
    // COMPLETE IMPLEMENTATION:
    // 1. Get all operations from registry
    // 2. Create MCP tool for each operation
    // 3. Register tools with server
    // 4. Set up tool handlers
  }

  createToolFromOperation(operationDetails) {
    // COMPLETE IMPLEMENTATION:
    // 1. Extract tool name from operationId
    // 2. Build tool description from OpenAPI summary
    // 3. Define input schema from OpenAPI parameters
    // 4. Return MCP tool definition
  }

  async handleToolCall(toolName, arguments) {
    // COMPLETE IMPLEMENTATION:
    // 1. Map tool name to operation
    // 2. Validate input arguments
    // 3. Execute operation via executor
    // 4. Format response for MCP
    // 5. Handle all error scenarios
  }

  async start() {
    // COMPLETE IMPLEMENTATION:
    // 1. Initialize all components
    // 2. Start MCP server
    // 3. Set up transport
    // 4. Handle startup errors
  }
}

// Main execution
async function main() {
  // COMPLETE IMPLEMENTATION:
  // 1. Create server instance
  // 2. Initialize and start server
  // 3. Handle process signals
  // 4. Graceful shutdown
}
```

## ERROR HANDLING REQUIREMENTS

### Mandatory Error Scenarios to Handle
```javascript
// File Operations
try {
  const spec = await fs.readFile(specPath);
} catch (error) {
  if (error.code === 'ENOENT') {
    throw new Error(`OpenAPI spec file not found: ${specPath}`);
  } else if (error.code === 'EACCES') {
    throw new Error(`Permission denied reading spec file: ${specPath}`);
  } else {
    throw new Error(`Failed to read spec file: ${error.message}`);
  }
}

// Network Operations
try {
  const response = await axios.get(url);
} catch (error) {
  if (error.code === 'ECONNABORTED') {
    throw new Error('API request timeout - service may be down');
  } else if (error.response?.status === 401) {
    throw new Error('API authentication failed - check API key');
  } else if (error.response?.status === 404) {
    throw new Error('Requested resource not found');
  } else if (error.response?.status >= 500) {
    throw new Error('API service error - try again later');
  } else {
    throw new Error(`API request failed: ${error.message}`);
  }
}

// JSON Parsing
try {
  const parsed = JSON.parse(data);
} catch (error) {
  throw new Error(`Invalid JSON format: ${error.message}`);
}
```

## ENVIRONMENT CONFIGURATION

### .env.example File
```bash
# OpenWeatherMap API Configuration
WEATHER_API_KEY=your_openweathermap_api_key_here

# Server Configuration  
MCP_SERVER_NAME=api-gateway
MCP_SERVER_VERSION=1.0.0
LOG_LEVEL=info

# API Configuration
DEFAULT_TIMEOUT=10000
MAX_RETRIES=3
```

### Configuration Loading (config/server-config.js)
```javascript
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

// Validation
if (!config.apis.weather.apiKey) {
  throw new Error('WEATHER_API_KEY environment variable is required');
}
```

## VALIDATION REQUIREMENTS

### Create validate.js - Complete Test Suite
```javascript
// COMPLETE IMPLEMENTATION REQUIRED
import { ApiRegistry } from './registry/api-registry.js';
import { RequestBuilder } from './execution/request-builder.js';
import { ApiExecutor } from './execution/executor.js';
import { IntentParser } from './parsers/intent-parser.js';

async function validateImplementation() {
  console.log('🧪 Starting Phase 1 Validation...\n');

  try {
    // Test 1: Registry loads OpenAPI specs
    console.log('Test 1: API Registry initialization');
    const registry = new ApiRegistry();
    await registry.initialize();
    console.log('✅ Registry initialized successfully');
    
    // Test 2: Operations are registered
    console.log('\nTest 2: Operation registration');
    const operations = registry.getAllOperations();
    if (operations.length === 0) {
      throw new Error('No operations registered');
    }
    console.log(`✅ ${operations.length} operations registered`);
    
    // Test 3: Weather operation exists
    console.log('\nTest 3: Weather operation lookup');
    const weatherOp = registry.findOperationByIntent('weather london');
    if (!weatherOp) {
      throw new Error('Weather operation not found');
    }
    console.log('✅ Weather operation found:', weatherOp);
    
    // Test 4: Request building works
    console.log('\nTest 4: Request building');
    const opDetails = registry.getOperationDetails(weatherOp);
    const request = RequestBuilder.buildRequest(opDetails, { location: 'London' }, config.apis);
    if (!request.url || !request.method) {
      throw new Error('Invalid request built');
    }
    console.log('✅ Request built successfully:', request.url);
    
    // Test 5: Parameter validation
    console.log('\nTest 5: Parameter validation');
    const validation = RequestBuilder.validateParameters(
      { location: 'London' }, 
      opDetails.parameters
    );
    console.log('✅ Parameter validation works');
    
    // Test 6: Intent parsing
    console.log('\nTest 6: Intent parsing');
    const parser = new IntentParser(registry);
    const intent = parser.parseIntent('get weather for london');
    if (!intent.operationId || !intent.parameters) {
      throw new Error('Intent parsing failed');
    }
    console.log('✅ Intent parsing works:', intent);
    
    // Test 7: Full execution (with API key)
    if (process.env.WEATHER_API_KEY) {
      console.log('\nTest 7: Full API execution');
      const executor = new ApiExecutor(registry, config.apis);
      const result = await executor.executeOperation('getCurrentWeather', { q: 'London,UK' });
      if (!result.success) {
        throw new Error('API execution failed: ' + result.error);
      }
      console.log('✅ API execution successful');
    } else {
      console.log('\n⚠️  Test 7 skipped: WEATHER_API_KEY not provided');
    }
    
    console.log('\n🎉 ALL VALIDATION TESTS PASSED');
    console.log('\n📋 Phase 1 Implementation Complete:');
    console.log('   - OpenAPI spec-driven architecture ✅');
    console.log('   - Registry-based API management ✅');
    console.log('   - Dynamic request building ✅');
    console.log('   - Complete error handling ✅');
    console.log('   - MCP tool integration ready ✅');
    
  } catch (error) {
    console.error('\n❌ VALIDATION FAILED:', error.message);
    console.error('Stack trace:', error.stack);
    process.exit(1);
  }
}

validateImplementation();
```

## DELIVERABLE REQUIREMENTS

### 1. Complete Package Structure
All files must be created with full implementations - no placeholders.

### 2. Working Demo Commands
```bash
# Install dependencies
npm install

# Run validation tests
npm run validate

# Start MCP server (for testing with MCP client)
npm start
```

### 3. Documentation (README.md)
```markdown
# MCP API Gateway - Phase 1

## Quick Start

1. Copy `.env.example` to `.env` and add your OpenWeatherMap API key
2. Run `npm install`
3. Run `npm run validate` to verify everything works
4. Run `npm start` to start the MCP server

## Testing

Use an MCP client to test these commands:
- "Get weather for London"  
- "What's the weather in Tokyo?"
- "Check weather in New York"

## Architecture

This Phase 1 implementation establishes the foundational architecture:
- OpenAPI specs define all APIs (registry/specs/)
- Registry system manages API discovery
- Request builder creates API calls from specs
- Executor handles API communication
- Intent parser maps user requests to operations

## Adding New APIs

To add a new API in Phase 2:
1. Add OpenAPI spec to `registry/specs/`
2. Add API key to `.env` and `config/server-config.js`
3. Restart server - no code changes needed!
```

## SUCCESS VALIDATION CHECKLIST

Before submitting, verify ALL items are complete:

- [ ] **Package.json** - Exact dependencies specified
- [ ] **All source files** - Complete implementations, no stubs
- [ ] **OpenAPI spec** - Valid, complete weather API specification  
- [ ] **Environment setup** - .env.example with all required variables
- [ ] **Error handling** - Every external operation has try/catch
- [ ] **Validation tests** - validate.js runs and passes all tests
- [ ] **Documentation** - Clear README with setup instructions
- [ ] **Import verification** - All imports work without errors
- [ ] **MCP integration** - Server starts and registers tools correctly
- [ ] **API execution** - Weather API calls work through the system

## FINAL DELIVERY FORMAT

Provide the complete implementation with:

1. **All source code files** (complete implementations)
2. **Package.json** with exact dependencies
3. **Environment configuration** (.env.example)
4. **Validation test suite** (validate.js)
5. **Documentation** (README.md)
6. **Verification results** (output from npm run validate)

**CRITICAL:** Every component must be production-ready with complete error handling. No placeholder functions or TODO comments allowed.