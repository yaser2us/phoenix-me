# MCP API GATEWAY - PHASE 3: API CHAINING & WORKFLOWS

## EXECUTIVE SUMMARY
Enhance the existing Phase 2 foundation to support multi-step workflows and API chaining. Users can now make complex requests that require multiple API calls in sequence, with data flowing between APIs to fulfill sophisticated use cases.

## IMPLEMENTATION REFERENCE
**Primary Reference**: https://github.com/Jpisnice/shadcn-ui-mcp-server
**MCP SDK Version**: Latest from https://github.com/modelcontextprotocol (2025-06-18)

## 🚦 CHECKPOINT-BASED IMPLEMENTATION PROCESS

**CRITICAL REQUIREMENT**: After each checkpoint, create test files, validate functionality, and **WAIT FOR USER PERMISSION** before proceeding to the next checkpoint.

### CHECKPOINT 1: Workflow Engine Foundation
**Scope**: Add workflow engine infrastructure without breaking existing single-API functionality

**Tasks**:
1. Create workflow-engine.js with basic chaining capabilities
2. Create workflow-definitions.js for workflow configurations
3. Add workflow detection to intent parser
4. Verify single-API functionality still works
5. Create checkpoint test file

**Deliverables**:
- src/workflows/workflow-engine.js
- src/workflows/workflow-definitions.js
- Enhanced parsers/intent-parser.js with workflow detection
- test-checkpoint-1.js validation file

**Architecture Changes**: 
- **NONE to existing classes** - only add new workflow components
- Existing ApiRegistry, RequestBuilder, ApiExecutor remain unchanged
- MCP Server enhanced to support workflow tools

**Test File**: `test-checkpoint-1.js`
```javascript
// COMPLETE IMPLEMENTATION REQUIRED
import { WorkflowEngine } from './src/workflows/workflow-engine.js';
import { ApiRegistry } from './src/registry/api-registry.js';
import { IntentParser } from './src/parsers/intent-parser.js';

async function testCheckpoint1() {
  console.log('🧪 CHECKPOINT 1: Workflow Engine Foundation\n');
  
  try {
    // Test 1: Workflow engine initializes
    console.log('Test 1: Workflow Engine initialization');
    const registry = new ApiRegistry();
    await registry.initialize();
    const workflowEngine = new WorkflowEngine(registry);
    console.log('✅ Workflow Engine initialized');
    
    // Test 2: Workflow definitions load
    console.log('\nTest 2: Workflow definitions loading');
    const workflows = workflowEngine.getAllWorkflows();
    console.log(`✅ ${workflows.length} workflows loaded`);
    
    // Test 3: Intent parser detects workflows
    console.log('\nTest 3: Workflow detection in intent parser');
    const parser = new IntentParser(registry);
    const singleIntent = parser.parseIntent('weather in london');
    const workflowIntent = parser.parseIntent('find restaurants in paris');
    
    if (singleIntent.isWorkflow === false && workflowIntent.isWorkflow === true) {
      console.log('✅ Workflow detection working');
    } else {
      throw new Error('Workflow detection failed');
    }
    
    // Test 4: Phase 2 functionality preserved
    console.log('\nTest 4: Phase 2 backward compatibility');
    const weatherResult = singleIntent;
    if (weatherResult.operationId === 'getCurrentWeather') {
      console.log('✅ Single API functionality preserved');
    } else {
      throw new Error('Phase 2 functionality broken');
    }
    
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

### CHECKPOINT 2: Simple Two-Step Workflows
**Scope**: Implement basic workflows that chain exactly 2 APIs

**Tasks**:
1. Define 2-3 simple workflow patterns
2. Implement workflow execution in workflow engine
3. Add data mapping between API calls
4. Test basic chaining works
5. Create checkpoint test file

**Workflow Examples**:
- **"Find restaurants in Paris"**: Geocoding API → Places API
- **"Weather and news for London"**: Weather API → News API (location-based)
- **"Currency rates and current location"**: Geolocation API → Currency API

**Deliverables**:
- Enhanced workflows/workflow-engine.js with execution logic
- Updated workflows/workflow-definitions.js with 2-step workflows
- Data mapping utilities
- test-checkpoint-2.js validation file

**Test File**: `test-checkpoint-2.js`
```javascript
// COMPLETE IMPLEMENTATION REQUIRED
async function testCheckpoint2() {
  console.log('🧪 CHECKPOINT 2: Two-Step Workflows\n');
  
  try {
    // Test 1: Workflow execution
    console.log('Test 1: Simple workflow execution');
    const workflowEngine = new WorkflowEngine(registry);
    
    // Test "current location + weather" workflow
    const workflowResult = await workflowEngine.executeWorkflow('location_weather', {});
    if (!workflowResult.success) {
      throw new Error('Workflow execution failed: ' + workflowResult.error);
    }
    console.log('✅ Two-step workflow executed successfully');
    
    // Test 2: Data flow between APIs
    console.log('\nTest 2: Data mapping between API calls');
    if (workflowResult.data.location && workflowResult.data.weather) {
      console.log('✅ Data flows correctly between APIs');
    } else {
      throw new Error('Data mapping failed between APIs');
    }
    
    // Test 3: Workflow vs single API detection
    console.log('\nTest 3: Workflow vs single API routing');
    const parser = new IntentParser(registry);
    const singleAPI = parser.parseIntent('weather in tokyo');
    const workflow = parser.parseIntent('weather at my location');
    
    if (!singleAPI.isWorkflow && workflow.isWorkflow) {
      console.log('✅ Intent routing correctly distinguishes workflows');
    } else {
      throw new Error('Intent routing failed');
    }
    
    console.log('\n🎉 CHECKPOINT 2 PASSED - Ready for Checkpoint 3');
    
  } catch (error) {
    console.error('\n❌ CHECKPOINT 2 FAILED:', error.message);
    throw error;
  }
}
```

**STOP POINT**: Wait for user approval before proceeding to Checkpoint 3

---

### CHECKPOINT 3: Complex Multi-Step Workflows
**Scope**: Add workflows that require 3+ API calls with conditional logic

**Tasks**:
1. Define complex workflow patterns
2. Add conditional workflow logic
3. Implement error recovery in workflows
4. Add workflow result aggregation
5. Create checkpoint test file

**Complex Workflow Examples**:
- **"Plan trip to Tokyo"**: Geolocation → Currency (local to JPY) → Weather → News (Tokyo travel)
- **"Market overview"**: Currency (USD rates) → News (financial) → Random fact (economy)
- **"Location-based recommendations"**: Geolocation → Weather → News (local) → Facts (country-specific)

**Deliverables**:
- Enhanced workflow engine with conditional logic
- Complex workflow definitions
- Error recovery mechanisms
- Result aggregation utilities
- test-checkpoint-3.js validation file

**Test File**: `test-checkpoint-3.js`
```javascript
// COMPLETE IMPLEMENTATION REQUIRED
async function testCheckpoint3() {
  console.log('🧪 CHECKPOINT 3: Complex Multi-Step Workflows\n');
  
  try {
    // Test 1: Multi-step workflow execution
    console.log('Test 1: 3+ step workflow execution');
    const workflowEngine = new WorkflowEngine(registry);
    
    const complexResult = await workflowEngine.executeWorkflow('trip_planning', {
      destination: 'Tokyo'
    });
    
    if (!complexResult.success) {
      throw new Error('Complex workflow failed: ' + complexResult.error);
    }
    console.log('✅ Multi-step workflow completed');
    
    // Test 2: Conditional workflow logic
    console.log('\nTest 2: Conditional workflow execution');
    const conditionalResult = await workflowEngine.executeWorkflow('smart_recommendations', {});
    if (conditionalResult.success && conditionalResult.steps >= 3) {
      console.log('✅ Conditional workflow logic working');
    } else {
      throw new Error('Conditional logic failed');
    }
    
    // Test 3: Error recovery in workflows
    console.log('\nTest 3: Workflow error recovery');
    // Test workflow with intentionally failing step
    const recoveryResult = await workflowEngine.executeWorkflow('test_recovery', {
      simulateError: true
    });
    if (recoveryResult.partialSuccess) {
      console.log('✅ Error recovery mechanism working');
    } else {
      console.log('⚠️  Error recovery needs improvement');
    }
    
    // Test 4: Result aggregation
    console.log('\nTest 4: Multi-API result aggregation');
    if (complexResult.data.aggregated && Object.keys(complexResult.data.aggregated).length > 1) {
      console.log('✅ Result aggregation working');
    } else {
      throw new Error('Result aggregation failed');
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

### CHECKPOINT 4: Advanced Intent Recognition for Workflows
**Scope**: Enhance intent parser to intelligently detect and plan complex workflows

**Tasks**:
1. Add advanced intent analysis for multi-step requests
2. Implement workflow planning algorithm
3. Add parameter extraction for complex requests
4. Create workflow suggestion system
5. Create checkpoint test file

**Enhanced Intent Examples**:
- **"I'm traveling to Japan next week"** → Plan comprehensive Japan workflow
- **"Compare costs for living in different countries"** → Multi-currency + news + facts workflow
- **"What should I know about my current location?"** → Location + weather + news + facts workflow

**Deliverables**:
- Enhanced parsers/intent-parser.js with workflow planning
- Workflow planning algorithms
- Advanced parameter extraction
- Workflow suggestion system
- test-checkpoint-4.js validation file

**Test File**: `test-checkpoint-4.js`
```javascript
// COMPLETE IMPLEMENTATION REQUIRED
async function testCheckpoint4() {
  console.log('🧪 CHECKPOINT 4: Advanced Intent Recognition\n');
  
  try {
    // Test 1: Complex intent analysis
    console.log('Test 1: Complex intent parsing');
    const parser = new IntentParser(registry);
    
    const complexIntents = [
      'I want to know everything about Tokyo',
      'Plan my day based on current weather and news',
      'Compare USD, EUR, and GBP with local news for each region'
    ];
    
    for (const intent of complexIntents) {
      const result = parser.parseIntent(intent);
      if (result.isWorkflow && result.plannedSteps && result.plannedSteps.length > 2) {
        console.log(`✅ "${intent}" → ${result.plannedSteps.length} step workflow`);
      } else {
        throw new Error(`Failed to plan workflow for: "${intent}"`);
      }
    }
    
    // Test 2: Parameter extraction from complex requests
    console.log('\nTest 2: Complex parameter extraction');
    const travelIntent = parser.parseIntent('I\'m going to Paris next month, what should I know?');
    if (travelIntent.parameters.destination === 'Paris' && travelIntent.parameters.timeframe) {
      console.log('✅ Complex parameter extraction working');
    } else {
      console.log('⚠️  Parameter extraction needs improvement');
    }
    
    // Test 3: Workflow planning accuracy
    console.log('\nTest 3: Workflow planning algorithm');
    const planningResult = parser.planWorkflow('comprehensive location analysis');
    if (planningResult.steps.length >= 3 && planningResult.estimatedTime) {
      console.log('✅ Workflow planning algorithm functional');
    } else {
      throw new Error('Workflow planning failed');
    }
    
    console.log('\n🎉 CHECKPOINT 4 PASSED - Ready for Checkpoint 5');
    
  } catch (error) {
    console.error('\n❌ CHECKPOINT 4 FAILED:', error.message);
    throw error;
  }
}
```

**STOP POINT**: Wait for user approval before proceeding to Checkpoint 5

---

### CHECKPOINT 5: MCP Integration & Final Validation
**Scope**: Integrate workflow capabilities into MCP server and create comprehensive validation

**Tasks**:
1. Add workflow tools to MCP server
2. Update server.js to handle workflow execution
3. Create comprehensive workflow validation suite
4. Test complete system end-to-end
5. Create final validation file

**MCP Workflow Tools**:
- `execute_workflow`: Execute predefined workflows
- `plan_workflow`: Plan workflow for complex requests
- `list_workflows`: Show available workflow templates
- `execute_custom_workflow`: Execute ad-hoc API sequences

**Deliverables**:
- Enhanced server.js with workflow tool registration
- Complete workflow MCP tool implementations
- Comprehensive validation suite
- End-to-end workflow testing
- test-checkpoint-5.js final validation

**Test File**: `test-checkpoint-5.js`
```javascript
// COMPLETE IMPLEMENTATION REQUIRED
async function testCheckpoint5() {
  console.log('🧪 CHECKPOINT 5: Complete MCP Workflow Integration\n');
  
  try {
    // Test 1: MCP Server with workflow tools
    console.log('Test 1: MCP Server workflow tool registration');
    const server = new MCPGatewayServer();
    await server.initialize();
    
    // Check workflow tools are registered
    const tools = await server.server.request({
      method: "tools/list",
      params: {}
    });
    
    const workflowTools = tools.tools.filter(t => 
      t.name.includes('workflow') || t.name.includes('chain')
    );
    
    if (workflowTools.length >= 3) {
      console.log(`✅ ${workflowTools.length} workflow tools registered`);
    } else {
      throw new Error('Workflow tools not properly registered');
    }
    
    // Test 2: End-to-end workflow execution via MCP
    console.log('\nTest 2: End-to-end workflow via MCP tools');
    const workflowResult = await server.handleToolCall('execute_workflow', {
      workflowName: 'location_weather',
      parameters: {}
    });
    
    if (!workflowResult.isError) {
      console.log('✅ End-to-end workflow execution successful');
    } else {
      throw new Error('End-to-end workflow failed: ' + workflowResult.content[0].text);
    }
    
    // Test 3: Custom workflow planning
    console.log('\nTest 3: Custom workflow planning via MCP');
    const planResult = await server.handleToolCall('plan_workflow', {
      request: 'I want comprehensive information about Tokyo'
    });
    
    if (!planResult.isError) {
      console.log('✅ Workflow planning via MCP working');
    } else {
      throw new Error('Workflow planning failed');
    }
    
    // Test 4: Backward compatibility validation
    console.log('\nTest 4: Complete backward compatibility');
    
    // Test Phase 1 weather still works
    const weatherTest = await server.handleToolCall('getCurrentWeather', { q: 'London,UK' });
    if (weatherTest.isError) throw new Error('Phase 1 weather broken');
    
    // Test Phase 2 multiple APIs still work
    const currencyTest = await server.handleToolCall('getExchangeRates', { base: 'USD' });
    if (currencyTest.isError) throw new Error('Phase 2 currency broken');
    
    console.log('✅ Full backward compatibility maintained');
    
    // Test 5: Performance validation
    console.log('\nTest 5: Workflow performance validation');
    const startTime = Date.now();
    const perfResult = await server.handleToolCall('execute_workflow', {
      workflowName: 'quick_info',
      parameters: {}
    });
    const executionTime = Date.now() - startTime;
    
    if (executionTime < 30000) { // 30 second max for complex workflows
      console.log(`✅ Workflow performance acceptable: ${executionTime}ms`);
    } else {
      console.log(`⚠️  Workflow performance slow: ${executionTime}ms`);
    }
    
    console.log('\n🎉 PHASE 3 IMPLEMENTATION COMPLETE!');
    console.log('\n📊 Final Phase 3 Statistics:');
    console.log(`   - Single API Operations: ${registry.getAllOperations().length}`);
    console.log(`   - Workflow Definitions: ${workflowEngine.getAllWorkflows().length}`);
    console.log(`   - Total MCP Tools: ${tools.tools.length}`);
    console.log(`   - Workflow Tools: ${workflowTools.length}`);
    console.log(`   - Backward Compatibility: ✅ Full`);
    console.log(`   - Performance: ${executionTime < 20000 ? '✅ Excellent' : '⚠️ Acceptable'}`);
    
  } catch (error) {
    console.error('\n❌ CHECKPOINT 5 FAILED:', error.message);
    throw error;
  }
}
```

**FINAL STOP POINT**: Complete Phase 3 validation and user approval for Phase 4

## 📋 DETAILED IMPLEMENTATION SPECIFICATIONS

### 1. Workflow Engine (workflows/workflow-engine.js)
**COMPLETE NEW CLASS** - Add to existing project structure

```javascript
class WorkflowEngine {
  constructor(registry, executor) {
    this.registry = registry;
    this.executor = executor;
    this.workflows = new Map();
    this.executionHistory = [];
  }

  async initialize() {
    // COMPLETE IMPLEMENTATION:
    // 1. Load workflow definitions from workflow-definitions.js
    // 2. Validate each workflow against available APIs
    // 3. Build workflow execution plans
    // 4. Register workflow patterns
  }

  async executeWorkflow(workflowName, parameters) {
    // COMPLETE IMPLEMENTATION:
    // 1. Get workflow definition
    // 2. Plan execution steps
    // 3. Execute steps in sequence
    // 4. Handle data flow between steps
    // 5. Aggregate results
    // 6. Handle partial failures
    // 7. Return comprehensive result
  }

  async executeStep(step, previousResults, parameters) {
    // COMPLETE IMPLEMENTATION:
    // 1. Extract parameters from previous results
    // 2. Map data according to step configuration
    // 3. Execute API call via existing executor
    // 4. Validate step result
    // 5. Prepare data for next step
  }

  planWorkflowFromIntent(userIntent, availableAPIs) {
    // COMPLETE IMPLEMENTATION:
    // 1. Analyze intent complexity
    // 2. Identify required API types
    // 3. Plan optimal execution sequence
    // 4. Estimate execution time
    // 5. Return workflow plan
  }

  aggregateResults(stepResults, aggregationRules) {
    // COMPLETE IMPLEMENTATION:
    // 1. Combine results from multiple API calls
    // 2. Apply formatting rules
    // 3. Resolve data conflicts
    // 4. Create unified response
  }

  handleWorkflowError(error, currentStep, completedSteps) {
    // COMPLETE IMPLEMENTATION:
    // 1. Categorize error type
    // 2. Determine if workflow can continue
    // 3. Implement retry logic if appropriate
    // 4. Return partial results if applicable
  }

  getAllWorkflows() {
    // COMPLETE IMPLEMENTATION:
    // Return all available workflow templates
  }

  validateWorkflow(workflowDefinition) {
    // COMPLETE IMPLEMENTATION:
    // 1. Check all required APIs are available
    // 2. Validate data flow between steps
    // 3. Check for circular dependencies
    // 4. Validate parameter mappings
  }
}
```

### 2. Workflow Definitions (workflows/workflow-definitions.js)
**COMPLETE WORKFLOW CONFIGURATION FILE**

```javascript
export const workflowDefinitions = {
  // Simple 2-step workflows (Checkpoint 2)
  location_weather: {
    name: "Current Location Weather",
    description: "Get weather for current location",
    steps: [
      {
        id: "get_location",
        operation: "getCurrentLocation",
        parameters: {},
        outputMapping: {
          "country": "location.country",
          "city": "location.city"
        }
      },
      {
        id: "get_weather", 
        operation: "getCurrentWeather",
        parameters: {
          "q": "${location.city}"
        },
        dependencies: ["get_location"]
      }
    ],
    aggregation: {
      format: "combined",
      includeSteps: true
    }
  },

  currency_location: {
    name: "Currency Rates for Current Location",
    description: "Get local currency exchange rates",
    steps: [
      {
        id: "get_location",
        operation: "getCurrentLocation", 
        parameters: {},
        outputMapping: {
          "countryCode": "location.country"
        }
      },
      {
        id: "get_rates",
        operation: "getExchangeRates",
        parameters: {
          "base": "USD" // Could be mapped from location
        },
        dependencies: ["get_location"]
      }
    ]
  },

  // Complex multi-step workflows (Checkpoint 3)
  trip_planning: {
    name: "Trip Planning Assistant", 
    description: "Comprehensive trip information for destination",
    steps: [
      {
        id: "get_current_location",
        operation: "getCurrentLocation",
        parameters: {}
      },
      {
        id: "get_exchange_rate",
        operation: "getExchangeRates", 
        parameters: {
          "base": "USD"
        }
      },
      {
        id: "get_destination_weather",
        operation: "getCurrentWeather",
        parameters: {
          "q": "${parameters.destination}"
        }
      },
      {
        id: "get_destination_news",
        operation: "searchNews",
        parameters: {
          "q": "${parameters.destination} travel"
        },
        conditional: {
          "executeIf": "previous_steps_successful",
          "maxRetries": 2
        }
      }
    ],
    aggregation: {
      format: "travel_summary",
      includeMetadata: true
    }
  },

  comprehensive_location_info: {
    name: "Complete Location Analysis",
    description: "Everything about current or specified location",
    steps: [
      {
        id: "location",
        operation: "getCurrentLocation",
        parameters: {}
      },
      {
        id: "weather", 
        operation: "getCurrentWeather",
        parameters: {
          "q": "${location.city}"
        },
        dependencies: ["location"]
      },
      {
        id: "local_news",
        operation: "searchNews", 
        parameters: {
          "q": "${location.country}"
        },
        dependencies: ["location"],
        conditional: {
          "executeIf": "news_api_available"
        }
      },
      {
        id: "random_fact",
        operation: "getRandomFact",
        parameters: {}
      }
    ],
    aggregation: {
      format: "location_report",
      sections: ["location", "weather", "news", "trivia"]
    }
  }
};

export const workflowPatterns = {
  // Intent patterns that trigger workflows
  patterns: [
    {
      regex: /weather\s+(at\s+my\s+location|here|current)/i,
      workflow: "location_weather"
    },
    {
      regex: /(trip|travel|visit)\s+.*?(to|in)\s+(\w+)/i,
      workflow: "trip_planning",
      parameterExtraction: {
        destination: 3 // Capture group index
      }
    },
    {
      regex: /(everything|all|complete|full)\s+.*?(about|info|information)\s+(\w+)/i,
      workflow: "comprehensive_location_info"
    },
    {
      regex: /current\s+location\s+(and|with|plus)\s+/i,
      workflow: "comprehensive_location_info"
    }
  ]
};
```

### 3. Enhanced Intent Parser (parsers/intent-parser.js)
**ADD WORKFLOW METHODS TO EXISTING CLASS** - Do not change existing methods

```javascript
// ADD THESE METHODS TO EXISTING IntentParser CLASS

detectWorkflowIntent(userInput) {
  // COMPLETE IMPLEMENTATION:
  // 1. Check input against workflow patterns
  // 2. Determine if request needs multiple APIs
  // 3. Return workflow detection result
  // 4. Extract workflow parameters if pattern matches
}

planCustomWorkflow(userIntent) {
  // COMPLETE IMPLEMENTATION:
  // 1. Analyze intent complexity
  // 2. Identify required API operations
  // 3. Determine optimal execution order
  // 4. Create custom workflow definition
  // 5. Return workflow plan
}

extractWorkflowParameters(userInput, workflowDefinition) {
  // COMPLETE IMPLEMENTATION:
  // 1. Use regex patterns to extract parameters
  // 2. Map extracted values to workflow parameter names
  // 3. Apply parameter validation
  // 4. Return parameter mapping
}

// ENHANCE EXISTING parseIntent METHOD
parseIntent(userInput) {
  // COMPLETE IMPLEMENTATION:
  // 1. First check if input matches workflow patterns
  // 2. If workflow detected, return workflow intent
  // 3. Otherwise, use existing single-API logic
  // 4. Return enhanced intent object with workflow info
  
  // Enhanced return format:
  // {
  //   operationId: string | null,
  //   parameters: object,
  //   apiType: string,
  //   confidence: number,
  //   isWorkflow: boolean,
  //   workflowName: string | null,
  //   plannedSteps: array | null
  // }
}
```

### 4. Enhanced MCP Server (server.js)
**ADD WORKFLOW TOOLS TO EXISTING SERVER** - Do not change existing structure

```javascript
// ADD TO EXISTING MCPGatewayServer CLASS

async initialize() {
  // EXISTING INITIALIZATION CODE UNCHANGED
  // ADD THESE LINES:
  
  // Initialize workflow engine
  this.workflowEngine = new WorkflowEngine(this.registry, this.executor);
  await this.workflowEngine.initialize();
  
  // Register workflow tools in addition to existing tools
  this.registerWorkflowTools();
}

registerWorkflowTools() {
  // COMPLETE IMPLEMENTATION:
  // 1. Register execute_workflow tool
  // 2. Register plan_workflow tool
  // 3. Register list_workflows tool
  // 4. Register execute_custom_workflow tool
  // 5. Set up workflow tool handlers
}

async handleWorkflowToolCall(toolName, args) {
  // COMPLETE IMPLEMENTATION:
  // Handle workflow-specific tool calls
  // Route to appropriate workflow engine methods
  // Format responses for MCP
}

// ADD THESE NEW TOOL DEFINITIONS
getWorkflowToolDefinitions() {
  return [
    {
      name: "execute_workflow",
      description: "Execute a predefined workflow",
      inputSchema: {
        type: "object",
        properties: {
          workflowName: {
            type: "string",
            description: "Name of the workflow to execute"
          },
          parameters: {
            type: "object",
            description: "Parameters for the workflow"
          }
        },
        required: ["workflowName"]
      }
    },
    {
      name: "plan_workflow", 
      description: "Plan a custom workflow for complex requests",
      inputSchema: {
        type: "object",
        properties: {
          request: {
            type: "string",
            description: "Complex request that needs multiple API calls"
          }
        },
        required: ["request"]
      }
    },
    {
      name: "list_workflows",
      description: "List all available workflow templates",
      inputSchema: {
        type: "object",
        properties: {}
      }
    },
    {
      name: "execute_custom_workflow",
      description: "Execute a custom sequence of API calls",
      inputSchema: {
        type: "object", 
        properties: {
          steps: {
            type: "array",
            description: "Array of API operations to execute in sequence"
          },
          parameters: {
            type: "object",
            description: "Parameters for the workflow steps"
          }
        },
        required: ["steps"]
      }
    }
  ];
}
```

## PHASE 3 SUCCESS CRITERIA

After all checkpoints complete, the system must demonstrate:

- [ ] **Single API calls still work** (Phase 1 & 2 compatibility)
- [ ] **Simple 2-step workflows execute successfully**
- [ ] **Complex 3+ step workflows with data flow**
- [ ] **Intelligent workflow planning from natural language**
- [ ] **MCP tools for workflow execution and planning**
- [ ] **Error recovery in multi-step workflows**
- [ ] **Result aggregation from multiple APIs**
- [ ] **Performance within acceptable limits** (<30 seconds for complex workflows)

## TESTING SCENARIOS FOR PHASE 3

The system should successfully handle:

```bash
# Single API (Phase 1 & 2 - should still work)
"Get weather for Tokyo"
"Convert 100 USD to EUR"

# Simple workflows (Phase 3 - new)
"Weather at my current location"
"Currency rates for where I am"

# Complex workflows (Phase 3 - new)
"Plan a trip to Tokyo" 
"Tell me everything about my current location"
"I'm traveling to Paris, what should I know?"

# Custom workflows (Phase 3 - advanced)
"Get weather, news, and exchange rates for London"
"Compare current location with New York weather and news"
```

## 🚦 CHECKPOINT EXECUTION INSTRUCTIONS

### For Claude Code:
```
MANDATORY CHECKPOINT PROCESS FOR PHASE 3:

1. **Implement ONLY the current checkpoint scope**
2. **Create the checkpoint test file with complete validation**
3. **Run the test and show detailed results**
4. **STOP and ask user: "Checkpoint X completed. Test results above. Should I proceed to Checkpoint X+1?"**
5. **WAIT for explicit user approval before continuing**

CRITICAL: Do NOT implement multiple checkpoints in one response.
CRITICAL: ALWAYS preserve existing Phase 1 & 2 functionality.
CRITICAL: Create comprehensive test files that prove each checkpoint works.

Focus on incremental enhancement, not system rebuilding.
```

## FINAL DELIVERY REQUIREMENTS

1. **Complete workflow engine** with chaining capabilities
2. **Workflow definitions** for common use cases
3. **Enhanced intent parser** with workflow detection
4. **MCP workflow tools** integrated into server
5. **Comprehensive validation** proving all functionality works
6. **Performance optimization** for multi-API workflows
7. **Error recovery** mechanisms for workflow failures
8. **Complete backward compatibility** with Phase 1 & 2

**CRITICAL**: The existing Phase 1 & 2 architecture must remain unchanged. This is pure feature addition for workflow capabilities.