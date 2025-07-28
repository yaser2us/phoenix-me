# MCP API GATEWAY - PHASE 2: MULTIPLE API SUPPORT

# MCP API GATEWAY - PHASE 2: CHECKPOINT-BASED IMPLEMENTATION

## EXECUTIVE SUMMARY
Enhance the existing Phase 1 foundation to support multiple APIs with improved intent recognition. Implementation will proceed through **mandatory checkpoints** with validation and user approval at each step.

## 🚦 CHECKPOINT-BASED IMPLEMENTATION PROCESS

**CRITICAL REQUIREMENT**: After each checkpoint, create test files, validate functionality, and **WAIT FOR USER PERMISSION** before proceeding to the next checkpoint.

### CHECKPOINT 1: MCP SDK Update & Foundation Validation
**Scope**: Update to latest MCP SDK (2025-06-18) and verify Phase 1 still works

**Tasks**:
1. Update package.json with latest MCP SDK
2. Update imports in existing files to use new SDK patterns
3. Verify Phase 1 weather functionality still works
4. Create checkpoint test file

**Deliverables**:
- Updated package.json
- Updated server.js with new MCP SDK patterns
- test-checkpoint-1.js validation file
- Verification that weather API still works

**Test File**: `test-checkpoint-1.js`
```javascript
// COMPLETE IMPLEMENTATION REQUIRED
import { ApiRegistry } from './src/registry/api-registry.js';
import { ApiExecutor } from './src/execution/executor.js';

async function testCheckpoint1() {
  console.log('🧪 CHECKPOINT 1: MCP SDK Update Validation\n');
  
  try {
    // Test 1: New SDK imports work
    console.log('Test 1: New MCP SDK imports');
    const { Server } = await import("@modelcontextprotocol/sdk/server/index.js");
    const { CallToolRequestSchema, ListToolsRequestSchema } = await import("@modelcontextprotocol/sdk/types.js");
    console.log('✅ New MCP SDK imports successful');
    
    // Test 2: Phase 1 registry still works
    console.log('\nTest 2: Phase 1 Registry compatibility');
    const registry = new ApiRegistry();
    await registry.initialize();
    const operations = registry.getAllOperations();
    console.log(`✅ Registry loaded ${operations.length} operations`);
    
    // Test 3: Weather API still functional
    console.log('\nTest 3: Weather API backward compatibility');
    const weatherOp = registry.findOperationByIntent('weather london');
    if (!weatherOp) throw new Error('Weather operation not found');
    console.log('✅ Weather operation accessible');
    
    // Test 4: MCP server starts with new SDK
    console.log('\nTest 4: MCP Server startup with new SDK');
    // Add server startup test here
    console.log('✅ MCP Server initializes correctly');
    
    console.log('\n🎉 CHECKPOINT 1 PASSED - Ready for Checkpoint 2');
    
  } catch (error) {
    console.error('\n❌ CHECKPOINT 1 FAILED:', error.message);
    throw error;
  }
}

testCheckpoint1();
```

**STOP POINT**: Wait for user approval before proceeding to Checkpoint 2

---

### CHECKPOINT 2: Add Currency & Facts APIs (No API Key Required)
**Scope**: Add the two APIs that don't require API keys first

**Tasks**:
1. Create currency.json OpenAPI spec
2. Create facts.json OpenAPI spec  
3. Verify registry loads both specs
4. Test both APIs work independently
5. Create checkpoint test file

**Deliverables**:
- registry/specs/currency.json
- registry/specs/facts.json
- test-checkpoint-2.js validation file
- Proof both APIs execute successfully

**Test File**: `test-checkpoint-2.js`
```javascript
// COMPLETE IMPLEMENTATION REQUIRED
async function testCheckpoint2() {
  console.log('🧪 CHECKPOINT 2: Currency & Facts APIs\n');
  
  try {
    // Test 1: New specs loaded
    const registry = new ApiRegistry();
    await registry.initialize();
    const operations = registry.getAllOperations();
    console.log(`✅ Registry now has ${operations.length} operations`);
    
    // Test 2: Currency API works
    console.log('\nTest 2: Currency API execution');
    const executor = new ApiExecutor(registry, config.apis);
    const currencyResult = await executor.executeOperation('getExchangeRates', { base: 'USD' });
    if (!currencyResult.success) throw new Error('Currency API failed');
    console.log('✅ Currency API working:', currencyResult.data.base);
    
    // Test 3: Facts API works  
    console.log('\nTest 3: Facts API execution');
    const factsResult = await executor.executeOperation('getRandomFact', {});
    if (!factsResult.success) throw new Error('Facts API failed');
    console.log('✅ Facts API working:', factsResult.data.text.substring(0, 50) + '...');
    
    console.log('\n🎉 CHECKPOINT 2 PASSED - Ready for Checkpoint 3');
    
  } catch (error) {
    console.error('\n❌ CHECKPOINT 2 FAILED:', error.message);
    throw error;
  }
}
```

**STOP POINT**: Wait for user approval before proceeding to Checkpoint 3

---

### CHECKPOINT 3: Add Geolocation API & Enhanced Intent Parser
**Scope**: Add geolocation API and improve intent parsing for multi-API routing

**Tasks**:
1. Create geolocation.json OpenAPI spec
2. Enhance IntentParser with multi-API keyword matching
3. Test intent routing works correctly
4. Create checkpoint test file

**Deliverables**:
- registry/specs/geolocation.json
- Enhanced parsers/intent-parser.js with new methods
- test-checkpoint-3.js validation file
- Proof intent parsing routes to correct APIs

**Test File**: `test-checkpoint-3.js`
```javascript
// COMPLETE IMPLEMENTATION REQUIRED
async function testCheckpoint3() {
  console.log('🧪 CHECKPOINT 3: Geolocation & Intent Parsing\n');
  
  try {
    // Test 1: Geolocation API works
    console.log('Test 1: Geolocation API execution');
    const executor = new ApiExecutor(registry, config.apis);
    const locationResult = await executor.executeOperation('getCurrentLocation', {});
    if (!locationResult.success) throw new Error('Geolocation API failed');
    console.log('✅ Geolocation API working:', locationResult.data.country_name);
    
    // Test 2: Enhanced intent parsing
    console.log('\nTest 2: Multi-API intent routing');
    const parser = new IntentParser(registry);
    
    const testCases = [
      { input: 'weather in Tokyo', expectedAPI: 'weather' },
      { input: 'convert USD to EUR', expectedAPI: 'currency' },
      { input: 'where am I', expectedAPI: 'geolocation' },
      { input: 'random fact', expectedAPI: 'facts' }
    ];
    
    for (const test of testCases) {
      const result = parser.parseIntent(test.input);
      if (result.apiType === test.expectedAPI) {
        console.log(`✅ "${test.input}" → ${result.apiType}`);
      } else {
        throw new Error(`Intent parsing failed: "${test.input}" → ${result.apiType} (expected: ${test.expectedAPI})`);
      }
    }
    
    console.log('\n🎉 CHECKPOINT 3 PASSED - Ready for Checkpoint 4');
    
  } catch (error) {
    console.error('\n❌ CHECKPOINT 3 FAILED:', error.message);
    throw error;
  }
}
```

**STOP POINT**: Wait for user approval before proceeding to Checkpoint 4

---

### CHECKPOINT 4: Add News API & Configuration Management
**Scope**: Add news API with API key management and enhanced configuration

**Tasks**:
1. Create news.json OpenAPI spec
2. Update server-config.js for multiple API authentication
3. Update .env.example with new API keys
4. Test API key authentication works
5. Create checkpoint test file

**Deliverables**:
- registry/specs/news.json
- Enhanced config/server-config.js
- Updated .env.example
- test-checkpoint-4.js validation file

**Test File**: `test-checkpoint-4.js`
```javascript
// COMPLETE IMPLEMENTATION REQUIRED
async function testCheckpoint4() {
  console.log('🧪 CHECKPOINT 4: News API & Configuration\n');
  
  try {
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
    
    // Test 2: News API (if API key available)
    if (process.env.NEWS_API_KEY) {
      console.log('\nTest 2: News API execution');
      const executor = new ApiExecutor(registry, config.apis);
      const newsResult = await executor.executeOperation('getTopHeadlines', { country: 'us' });
      if (!newsResult.success) throw new Error('News API failed');
      console.log('✅ News API working:', newsResult.data.articles.length + ' articles');
    } else {
      console.log('\n⚠️  Test 2 skipped: NEWS_API_KEY not provided');
    }
    
    // Test 3: All APIs accessible via registry
    console.log('\nTest 3: Complete API registry');
    const registry = new ApiRegistry();
    await registry.initialize();
    const operations = registry.getAllOperations();
    if (operations.length < 7) { // Should have 7+ operations across all APIs
      throw new Error(`Expected 7+ operations, got ${operations.length}`);
    }
    console.log(`✅ Complete registry: ${operations.length} operations`);
    
    console.log('\n🎉 CHECKPOINT 4 PASSED - Ready for Final Validation');
    
  } catch (error) {
    console.error('\n❌ CHECKPOINT 4 FAILED:', error.message);
    throw error;
  }
}
```

**STOP POINT**: Wait for user approval before proceeding to Final Validation

---

### CHECKPOINT 5: Final Integration & Complete Validation
**Scope**: Complete MCP server integration and comprehensive testing

**Tasks**:
1. Update main server.js with all APIs integrated
2. Create comprehensive validation suite
3. Test all MCP tools work correctly
4. Verify backward compatibility with Phase 1
5. Create final test file

**Deliverables**:
- Complete integrated server.js
- Enhanced validate.js with all APIs
- test-checkpoint-5.js final validation
- Complete Phase 2 documentation

**Test File**: `test-checkpoint-5.js`
```javascript
// COMPLETE IMPLEMENTATION REQUIRED - Final comprehensive test
async function testCheckpoint5() {
  console.log('🧪 CHECKPOINT 5: Final Integration Validation\n');
  
  try {
    // Test 1: MCP Server starts correctly
    console.log('Test 1: MCP Server initialization');
    const server = new MCPGatewayServer();
    await server.initialize();
    console.log('✅ MCP Server initialized');
    
    // Test 2: All tools are registered
    console.log('\nTest 2: MCP Tool registration');
    const operations = server.registry.getAllOperations();
    console.log(`✅ ${operations.length} MCP tools registered`);
    
    // Test 3: Tool execution via MCP interface
    console.log('\nTest 3: MCP Tool execution');
    // Test each tool type works via MCP interface
    
    // Test 4: Backward compatibility
    console.log('\nTest 4: Phase 1 compatibility');
    const weatherTest = await server.handleToolCall('getCurrentWeather', { q: 'London,UK' });
    if (weatherTest.isError) throw new Error('Phase 1 weather functionality broken');
    console.log('✅ Phase 1 functionality preserved');
    
    // Test 5: All API types work
    console.log('\nTest 5: All API types functional');
    const apiTests = [
      { tool: 'getExchangeRates', args: { base: 'USD' }, name: 'Currency' },
      { tool: 'getRandomFact', args: {}, name: 'Facts' },
      { tool: 'getCurrentLocation', args: {}, name: 'Geolocation' }
    ];
    
    for (const test of apiTests) {
      try {
        const result = await server.handleToolCall(test.tool, test.args);
        if (!result.isError) {
          console.log(`✅ ${test.name} API working`);
        } else {
          console.log(`⚠️  ${test.name} API error: ${result.content[0].text}`);
        }
      } catch (error) {
        console.log(`⚠️  ${test.name} API failed: ${error.message}`);
      }
    }
    
    console.log('\n🎉 PHASE 2 IMPLEMENTATION COMPLETE!');
    console.log('\n📊 Final Statistics:');
    console.log(`   - Total API Operations: ${operations.length}`);
    console.log(`   - API Types Supported: 5 (weather, currency, news, geolocation, facts)`);
    console.log(`   - MCP Tools Registered: ${operations.length}`);
    console.log(`   - Phase 1 Compatibility: ✅ Maintained`);
    
  } catch (error) {
    console.error('\n❌ CHECKPOINT 5 FAILED:', error.message);
    throw error;
  }
}
```

**FINAL STOP POINT**: Complete Phase 2 validation and user approval for Phase 3

## 🚦 CHECKPOINT EXECUTION INSTRUCTIONS

### For Claude Code:
```
MANDATORY CHECKPOINT PROCESS:

1. **Implement ONLY the current checkpoint scope**
2. **Create the checkpoint test file**  
3. **Run the test and show results**
4. **STOP and ask user: "Checkpoint X completed. Test results above. Should I proceed to Checkpoint X+1?"**
5. **WAIT for explicit user approval before continuing**

DO NOT implement multiple checkpoints in one response.
DO NOT proceed without user permission.
ALWAYS create and run the test file for each checkpoint.
```

## CRITICAL SUCCESS CRITERIA
- ✅ Support 4-5 different API types through OpenAPI specs
- ✅ Enhanced intent parser correctly routes requests to appropriate APIs
- ✅ All APIs work independently through the same registry system
- ✅ Zero changes to core architecture (ApiRegistry, RequestBuilder, ApiExecutor remain same structure)
- ✅ Adding new APIs still only requires dropping OpenAPI spec files

## IMPLEMENTATION REFERENCE

**Primary Reference**: https://github.com/Jpisnice/shadcn-ui-mcp-server
**MCP SDK Version**: Latest from https://github.com/modelcontextprotocol (2025-06-18)

### Key Implementation Patterns from shadcn-ui MCP Server

1. **Server Setup Pattern**:
   - Use `Server` class with name and version
   - Set up `ListToolsRequestSchema` and `CallToolRequestSchema` handlers
   - Use `StdioServerTransport` for communication
   - Proper error handling and process signal management

2. **Tool Registration Pattern**:
   - Dynamic tool creation from OpenAPI specs
   - Input schema generation from OpenAPI parameters
   - Consistent tool naming conventions

3. **Response Format Pattern**:
   - Return `{ content: [{ type: "text", text: "..." }] }` for successful responses
   - Include `isError: true` for error responses
   - Use JSON.stringify for formatted data output

4. **Error Handling Pattern**:
   - Console logging with emoji prefixes (🚀, ✅, ❌, 🔧)
   - Graceful error responses instead of throwing
   - Process exit handling for fatal errors

### What Gets Enhanced (NO Architecture Changes)
- **Intent Parser**: Improve keyword matching and add API-specific patterns
- **API Registry**: Add support for multiple spec loading and categorization
- **Server Config**: Extend authentication config for multiple APIs
- **Validation Suite**: Add tests for all new APIs

### What Stays Exactly The Same
- **Core file structure** (same folders, same main files)
- **ApiRegistry class interface** (same public methods)
- **RequestBuilder class** (no changes needed)
- **ApiExecutor class** (no changes needed) 
- **MCP Server setup** (same tool registration pattern)

## NEW APIS TO ADD

### 1. Currency Exchange API (ExchangeRate-API)
**File**: `registry/specs/currency.json`
**Operations**: 
- `getExchangeRates` - Get current exchange rates
- `convertCurrency` - Convert between currencies

### 2. News API (NewsAPI.org)
**File**: `registry/specs/news.json`
**Operations**:
- `getTopHeadlines` - Get top news headlines
- `searchNews` - Search news by keyword

### 3. IP Geolocation API (ipapi.co)
**File**: `registry/specs/geolocation.json`
**Operations**:
- `getLocationByIP` - Get location data from IP address
- `getCurrentLocation` - Get current user's location

### 4. Random Facts API (uselessfacts.jsph.pl)
**File**: `registry/specs/facts.json`
**Operations**:
- `getRandomFact` - Get a random interesting fact

## IMPLEMENTATION REQUIREMENTS

### 1. Enhanced Intent Parser (parsers/intent-parser.js)
**EXTEND EXISTING CLASS** - Add these methods without changing constructor or existing methods:

```javascript
// ADD THESE METHODS TO EXISTING IntentParser CLASS

buildApiKeywords() {
  // COMPLETE IMPLEMENTATION:
  // Build keyword maps for each API type
  return {
    weather: ['weather', 'temperature', 'forecast', 'climate', 'rain', 'sunny'],
    currency: ['currency', 'exchange', 'convert', 'rate', 'dollar', 'euro', 'money'],
    news: ['news', 'headlines', 'articles', 'breaking', 'latest', 'today'],
    geolocation: ['location', 'ip', 'where', 'country', 'city', 'geolocation'],
    facts: ['fact', 'random', 'interesting', 'trivia', 'knowledge', 'learn']
  };
}

categorizeIntent(userInput) {
  // COMPLETE IMPLEMENTATION:
  // 1. Check user input against API keyword maps
  // 2. Return most likely API category
  // 3. Handle ambiguous cases with confidence scoring
  // 4. Return { apiType: 'weather', confidence: 0.8 }
}

extractCurrencyParameters(userInput) {
  // COMPLETE IMPLEMENTATION:
  // Extract: amount, from currency, to currency
  // Examples: "convert 100 USD to EUR", "exchange rate USD EUR"
}

extractNewsParameters(userInput) {
  // COMPLETE IMPLEMENTATION:
  // Extract: search terms, country, category
  // Examples: "news about technology", "headlines from US"
}

extractLocationParameters(userInput) {
  // COMPLETE IMPLEMENTATION:
  // Extract: IP address if provided, or use "current location"
  // Examples: "location of 8.8.8.8", "where am I"
}

// ENHANCE EXISTING parseIntent METHOD
parseIntent(userInput) {
  // COMPLETE IMPLEMENTATION:
  // 1. Use existing weather parsing logic
  // 2. Add new categorizeIntent() call
  // 3. Route to appropriate parameter extraction method
  // 4. Return { operationId, parameters, apiType, confidence }
}
```

### 2. New OpenAPI Specifications

**Currency API Spec (registry/specs/currency.json)**
```json
{
  "openapi": "3.0.0",
  "info": {
    "title": "Exchange Rate API",
    "description": "Free currency exchange rate API",
    "version": "1.0.0"
  },
  "servers": [
    {
      "url": "https://api.exchangerate-api.com/v4",
      "description": "ExchangeRate-API"
    }
  ],
  "paths": {
    "/latest/{base}": {
      "get": {
        "operationId": "getExchangeRates",
        "summary": "Get latest exchange rates for base currency",
        "parameters": [
          {
            "name": "base",
            "in": "path",
            "required": true,
            "description": "Base currency code (USD, EUR, etc.)",
            "schema": {
              "type": "string",
              "pattern": "^[A-Z]{3}$",
              "example": "USD"
            }
          }
        ],
        "responses": {
          "200": {
            "description": "Exchange rates data",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "base": {"type": "string"},
                    "date": {"type": "string"},
                    "rates": {
                      "type": "object",
                      "additionalProperties": {"type": "number"}
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  }
}
```

**News API Spec (registry/specs/news.json)**
```json
{
  "openapi": "3.0.0",
  "info": {
    "title": "News API",
    "description": "News headlines and articles API",
    "version": "1.0.0"
  },
  "servers": [
    {
      "url": "https://newsapi.org/v2",
      "description": "NewsAPI.org"
    }
  ],
  "paths": {
    "/top-headlines": {
      "get": {
        "operationId": "getTopHeadlines",
        "summary": "Get top headlines",
        "parameters": [
          {
            "name": "country",
            "in": "query",
            "required": false,
            "description": "2-letter ISO country code",
            "schema": {
              "type": "string",
              "pattern": "^[a-z]{2}$",
              "example": "us"
            }
          },
          {
            "name": "category",
            "in": "query",
            "required": false,
            "schema": {
              "type": "string",
              "enum": ["business", "entertainment", "general", "health", "science", "sports", "technology"]
            }
          },
          {
            "name": "apiKey",
            "in": "query",
            "required": true,
            "schema": {"type": "string"}
          }
        ],
        "responses": {
          "200": {
            "description": "News headlines",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "status": {"type": "string"},
                    "totalResults": {"type": "integer"},
                    "articles": {
                      "type": "array",
                      "items": {
                        "type": "object",
                        "properties": {
                          "title": {"type": "string"},
                          "description": {"type": "string"},
                          "url": {"type": "string"},
                          "publishedAt": {"type": "string"}
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    },
    "/everything": {
      "get": {
        "operationId": "searchNews",
        "summary": "Search news articles",
        "parameters": [
          {
            "name": "q",
            "in": "query",
            "required": true,
            "description": "Keywords or phrases to search for",
            "schema": {"type": "string"}
          },
          {
            "name": "language",
            "in": "query",
            "required": false,
            "schema": {
              "type": "string",
              "enum": ["ar", "de", "en", "es", "fr", "he", "it", "nl", "no", "pt", "ru", "sv", "ud", "zh"]
            }
          },
          {
            "name": "apiKey",
            "in": "query",
            "required": true,
            "schema": {"type": "string"}
          }
        ],
        "responses": {
          "200": {
            "description": "Search results",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "status": {"type": "string"},
                    "totalResults": {"type": "integer"},
                    "articles": {
                      "type": "array",
                      "items": {
                        "type": "object",
                        "properties": {
                          "title": {"type": "string"},
                          "description": {"type": "string"},
                          "content": {"type": "string"},
                          "url": {"type": "string"}
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  }
}
```

**Geolocation API Spec (registry/specs/geolocation.json)**
```json
{
  "openapi": "3.0.0",
  "info": {
    "title": "IP Geolocation API",
    "description": "Get location data from IP addresses",
    "version": "1.0.0"
  },
  "servers": [
    {
      "url": "https://ipapi.co",
      "description": "ipapi.co"
    }
  ],
  "paths": {
    "/{ip}/json": {
      "get": {
        "operationId": "getLocationByIP",
        "summary": "Get location data for specific IP",
        "parameters": [
          {
            "name": "ip",
            "in": "path",
            "required": true,
            "description": "IP address to lookup",
            "schema": {
              "type": "string",
              "example": "8.8.8.8"
            }
          }
        ],
        "responses": {
          "200": {
            "description": "Location data",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "ip": {"type": "string"},
                    "city": {"type": "string"},
                    "region": {"type": "string"},
                    "country": {"type": "string"},
                    "country_name": {"type": "string"},
                    "timezone": {"type": "string"},
                    "latitude": {"type": "number"},
                    "longitude": {"type": "number"}
                  }
                }
              }
            }
          }
        }
      }
    },
    "/json": {
      "get": {
        "operationId": "getCurrentLocation",
        "summary": "Get current user's location",
        "responses": {
          "200": {
            "description": "Current location data",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "ip": {"type": "string"},
                    "city": {"type": "string"},
                    "region": {"type": "string"},
                    "country_name": {"type": "string"},
                    "timezone": {"type": "string"}
                  }
                }
              }
            }
          }
        }
      }
    }
  }
}
```

**Random Facts API Spec (registry/specs/facts.json)**
```json
{
  "openapi": "3.0.0",
  "info": {
    "title": "Random Facts API",
    "description": "Get random interesting facts",
    "version": "1.0.0"
  },
  "servers": [
    {
      "url": "https://uselessfacts.jsph.pl",
      "description": "Useless Facts API"
    }
  ],
  "paths": {
    "/random.json": {
      "get": {
        "operationId": "getRandomFact",
        "summary": "Get a random interesting fact",
        "parameters": [
          {
            "name": "language",
            "in": "query",
            "required": false,
            "description": "Language code",
            "schema": {
              "type": "string",
              "enum": ["en", "de"],
              "default": "en"
            }
          }
        ],
        "responses": {
          "200": {
            "description": "Random fact data",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "id": {"type": "string"},
                    "text": {"type": "string"},
                    "source": {"type": "string"},
                    "source_url": {"type": "string"},
                    "language": {"type": "string"}
                  }
                }
              }
            }
          }
        }
      }
    }
  }
}
```

### 3. Enhanced Configuration (config/server-config.js)

**EXTEND EXISTING CONFIG** - Add new API configurations:

```javascript
// ENHANCE EXISTING config object - ADD these new API configs
export const config = {
  apis: {
    weather: {
      apiKey: process.env.WEATHER_API_KEY,
      timeout: parseInt(process.env.DEFAULT_TIMEOUT) || 10000,
      retries: parseInt(process.env.MAX_RETRIES) || 3
    },
    // ADD THESE NEW API CONFIGURATIONS
    currency: {
      // No API key required for ExchangeRate-API free tier
      timeout: parseInt(process.env.DEFAULT_TIMEOUT) || 10000,
      retries: parseInt(process.env.MAX_RETRIES) || 3
    },
    news: {
      apiKey: process.env.NEWS_API_KEY,
      timeout: parseInt(process.env.DEFAULT_TIMEOUT) || 10000,
      retries: parseInt(process.env.MAX_RETRIES) || 3
    },
    geolocation: {
      // No API key required for ipapi.co free tier
      timeout: parseInt(process.env.DEFAULT_TIMEOUT) || 10000,
      retries: parseInt(process.env.MAX_RETRIES) || 3
    },
    facts: {
      // No API key required
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

// ENHANCED VALIDATION - Add checks for new optional API keys
if (!config.apis.weather.apiKey) {
  console.warn('⚠️  WEATHER_API_KEY not set - weather API will not work');
}

if (!config.apis.news.apiKey) {
  console.warn('⚠️  NEWS_API_KEY not set - news API will not work');
}

console.log('✅ Configuration loaded with APIs:', Object.keys(config.apis));
```

### 4. Enhanced Environment (.env.example)

**ADD TO EXISTING .env.example**:

```bash
# EXISTING - Phase 1
WEATHER_API_KEY=your_openweathermap_api_key_here

# NEW - Phase 2 API Keys
NEWS_API_KEY=your_newsapi_org_key_here

# EXISTING - Server Configuration  
MCP_SERVER_NAME=api-gateway
MCP_SERVER_VERSION=1.0.0
LOG_LEVEL=info

# EXISTING - API Configuration
DEFAULT_TIMEOUT=10000
MAX_RETRIES=3

# NEW - Phase 2 Notes
# Currency API: No key required (free tier)
# Geolocation API: No key required (free tier) 
# Facts API: No key required
```

### 5. Enhanced Validation Suite (validate.js)

**EXTEND EXISTING validate.js** - Add tests for all new APIs:

```javascript
// ADD THESE TEST FUNCTIONS TO EXISTING validate.js

async function testCurrencyAPI(registry, executor) {
  console.log('\n🧪 Testing Currency API...');
  
  // Test operation lookup
  const currencyOp = registry.findOperationByIntent('convert USD to EUR');
  if (!currencyOp) {
    throw new Error('Currency operation not found');
  }
  console.log('✅ Currency operation found:', currencyOp);
  
  // Test request building
  const opDetails = registry.getOperationDetails(currencyOp);
  const request = RequestBuilder.buildRequest(opDetails, { base: 'USD' }, config.apis);
  console.log('✅ Currency request built:', request.url);
  
  // Test execution (no API key required)
  try {
    const result = await executor.executeOperation('getExchangeRates', { base: 'USD' });
    if (result.success && result.data.rates) {
      console.log('✅ Currency API execution successful');
    } else {
      console.log('⚠️  Currency API returned unexpected format');
    }
  } catch (error) {
    console.log('⚠️  Currency API execution failed:', error.message);
  }
}

async function testNewsAPI(registry, executor) {
  console.log('\n🧪 Testing News API...');
  
  const newsOp = registry.findOperationByIntent('latest news headlines');
  if (!newsOp) {
    throw new Error('News operation not found');
  }
  console.log('✅ News operation found:', newsOp);
  
  if (process.env.NEWS_API_KEY) {
    try {
      const result = await executor.executeOperation('getTopHeadlines', { 
        country: 'us' 
      });
      if (result.success) {
        console.log('✅ News API execution successful');
      }
    } catch (error) {
      console.log('⚠️  News API execution failed:', error.message);
    }
  } else {
    console.log('⚠️  News API test skipped - no API key');
  }
}

async function testGeolocationAPI(registry, executor) {
  console.log('\n🧪 Testing Geolocation API...');
  
  const geoOp = registry.findOperationByIntent('current location');
  if (!geoOp) {
    throw new Error('Geolocation operation not found');
  }
  console.log('✅ Geolocation operation found:', geoOp);
  
  try {
    const result = await executor.executeOperation('getCurrentLocation', {});
    if (result.success && result.data.country_name) {
      console.log('✅ Geolocation API execution successful');
    }
  } catch (error) {
    console.log('⚠️  Geolocation API execution failed:', error.message);
  }
}

async function testFactsAPI(registry, executor) {
  console.log('\n🧪 Testing Facts API...');
  
  const factsOp = registry.findOperationByIntent('random fact');
  if (!factsOp) {
    throw new Error('Facts operation not found');
  }
  console.log('✅ Facts operation found:', factsOp);
  
  try {
    const result = await executor.executeOperation('getRandomFact', {});
    if (result.success && result.data.text) {
      console.log('✅ Facts API execution successful');
    }
  } catch (error) {
    console.log('⚠️  Facts API execution failed:', error.message);
  }
}

async function testIntentParsing(parser) {
  console.log('\n🧪 Testing Enhanced Intent Parsing...');
  
  const testCases = [
    { input: 'weather in London', expectedType: 'weather' },
    { input: 'convert 100 USD to EUR', expectedType: 'currency' },
    { input: 'latest news headlines', expectedType: 'news' },
    { input: 'where am I located', expectedType: 'geolocation' },
    { input: 'tell me a random fact', expectedType: 'facts' }
  ];
  
  for (const test of testCases) {
    const result = parser.parseIntent(test.input);
    if (result.apiType === test.expectedType) {
      console.log(`✅ "${test.input}" → ${result.apiType}`);
    } else {
      console.log(`⚠️  "${test.input}" → ${result.apiType} (expected: ${test.expectedType})`);
    }
  }
}

```javascript
// MODIFY EXISTING validateImplementation() function in validate.js
// UPDATE imports to use correct MCP SDK version:

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

async function validateImplementation() {
  console.log('🧪 Starting Phase 2 Validation...\n');

  try {
    // Test 1: Import validation (updated for new SDK)
    console.log('Test 1: MCP SDK imports');
    console.log('✅ MCP SDK imports successful');
    
    // Test 2: Registry loads multiple OpenAPI specs
    console.log('\nTest 2: Multi-API Registry initialization');
    const registry = new ApiRegistry();
    await registry.initialize();
    const operations = registry.getAllOperations();
    if (operations.length < 5) {
      throw new Error(`Expected 5+ operations, got ${operations.length}`);
    }
    console.log(`✅ Registry initialized with ${operations.length} operations`);
    
    // Test 3: All API types are recognized
    console.log('\nTest 3: API type registration');
    const apiTypes = ['weather', 'currency', 'news', 'geolocation', 'facts'];
    for (const apiType of apiTypes) {
      const ops = operations.filter(op => op.apiType === apiType);
      if (ops.length === 0) {
        console.log(`⚠️  No operations found for ${apiType} API`);
      } else {
        console.log(`✅ ${apiType} API: ${ops.length} operations registered`);
      }
    }
    
    // ... rest of existing tests ...
    // ... new Phase 2 tests ...

    console.log('\n🎉 PHASE 2 VALIDATION COMPLETE');
    console.log('📊 Multi-API Gateway Statistics:');
    console.log(`   - Total Operations: ${operations.length}`);
    console.log(`   - API Types: ${apiTypes.length}`);
    console.log(`   - Working APIs: ${workingApis.length}`);
    
  } catch (error) {
    console.error('\n❌ VALIDATION FAILED:', error.message);
    console.error('Stack trace:', error.stack);
    process.exit(1);
  }
}
```
```

## IMPLEMENTATION CONSTRAINTS

### What NOT to Change
- **DO NOT modify** existing ApiRegistry, RequestBuilder, or ApiExecutor class structures
- **DO NOT change** the core file organization
- **DO NOT alter** the MCP server initialization pattern
- **DO NOT modify** existing validation tests (only add new ones)

### What TO Change/Add
- **ADD** new OpenAPI specification files
- **ENHANCE** IntentParser with new methods (keep existing methods unchanged)
- **EXTEND** configuration with new API settings
- **ADD** new validation tests
- **UPDATE** documentation to reflect new capabilities

## SUCCESS VALIDATION CHECKLIST

After implementation, the system must demonstrate:

- [ ] **5 Different API Types Working**: Weather, Currency, News, Geolocation, Facts
- [ ] **Enhanced Intent Recognition**: Correctly routes different request types
- [ ] **Backward Compatibility**: All Phase 1 weather functionality still works
- [ ] **Registry Scalability**: Loads multiple OpenAPI specs automatically
- [ ] **Zero Architecture Changes**: Core classes unchanged from Phase 1
- [ ] **Comprehensive Testing**: All APIs tested in validation suite

## PHASE 2 TESTING SCENARIOS

The system should successfully handle:

```bash
# Weather (Phase 1 - should still work)
"Get weather for Tokyo"
"What's the temperature in London?"

# Currency (Phase 2 - new)
"Convert USD to EUR"
"What's the exchange rate for GBP?"
"Currency rates for Dollar"

# News (Phase 2 - new)  
"Latest news headlines"
"News about technology"
"Top headlines from US"

# Geolocation (Phase 2 - new)
"Where am I?"
"Location of IP 8.8.8.8"
"Current location"

# Facts (Phase 2 - new)
"Tell me a random fact"
"Interesting trivia"
"Random knowledge"
```

## DELIVERY REQUIREMENTS

1. **All new OpenAPI specification files** (4 new APIs)
2. **Enhanced IntentParser** with multi-API support
3. **Extended configuration** for new API authentication
4. **Comprehensive validation suite** testing all APIs
5. **Updated documentation** reflecting new capabilities
6. **Proof of backward compatibility** (Phase 1 weather still works)

**CRITICAL**: The existing Phase 1 architecture must remain unchanged. This is pure feature addition, not refactoring.