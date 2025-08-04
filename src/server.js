import {
  CallToolRequestSchema,
  ListResourcesRequestSchema,
  ListResourceTemplatesRequestSchema,
  ReadResourceRequestSchema,
  ListToolsRequestSchema,
  GetPromptRequestSchema,
  ListPromptsRequestSchema,
  ErrorCode,
  McpError
} from "@modelcontextprotocol/sdk/types.js";
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { ApiRegistry } from './registry/api-registry.js';
import { ApiExecutor } from './execution/executor.js';
import { IntentParser } from './parsers/intent-parser.js';
import { WorkflowEngine } from './workflows/workflow-engine.js';
import { initializeConfig, config } from './config/server-config.js';
import { logger } from './utils/logger.js';
// import { Validators } from './utils/validators.js';
import { debugLogger } from './utils/debug-logger.js';
import { MaybankInteractiveTool } from './interaction/maybank-interactive-tool.js';

// PHASE 4.5: Advanced Interactive Components
import { AIWorkflowPlanner } from './workflow/ai-workflow-planner.js';
import { DynamicParameterCollector } from './workflow/dynamic-parameter-collector.js';
import { EnhancedSemanticMatcher } from './nlp/enhanced-semantic-matcher.js';
import { WorkflowExecutionEngine } from './execution/workflow-execution-engine.js';
import { ConversationalWorkflowManager } from './interaction/conversational-workflow-manager.js';
import { InteractiveUXEnhancements } from './interaction/interactive-ux-enhancements.js';
import { WorkflowIntelligence } from './intelligence/workflow-intelligence.js';

// PHASE 4.7: Enhanced Validation & Retry System
import { EnhancedApiExecutor } from './execution/enhanced-api-executor.js';
import { EnhancedRequestBuilder } from './execution/enhanced-request-builder.js';
import { InteractiveParameterCollector } from './interaction/interactive-parameter-collector.js';
import { RequestBodyValidator } from './validation/request-body-validator.js';
import { ValidationErrorFormatter } from './validation/validation-error-formatter.js';
import { AdvancedValidator } from './validation/advanced-validator.js';
import { RetryManager } from './execution/retry-manager.js';

// PHASE 4.9: Dynamic API Composition & Learning System
import { CompositionCoordinator } from './composition/composition-coordinator.js';
import { ApiCatalogProvider } from './composition/api-catalog-provider.js';
import { ClaudeWorkflowComposer } from './composition/claude-workflow-composer.js';
import { WorkflowPlanParser } from './composition/workflow-plan-parser.js';
import { DynamicWorkflowExecutor } from './execution/dynamic-workflow-executor.js';
import { DataFlowManager } from './execution/data-flow-manager.js';
import { WorkflowOrchestrator } from './execution/workflow-orchestrator.js';
import { AdaptiveErrorRecovery } from './execution/adaptive-error-recovery.js';
import { AiResponseSynthesizer } from './fusion/ai-response-synthesizer.js';
import { ContextFusionEngine } from './fusion/context-fusion-engine.js';
import { InsightGenerator } from './fusion/insight-generator.js';
import { AdaptiveFormatter } from './fusion/adaptive-formatter.js';
import { WorkflowMemoryManager } from './learning/workflow-memory-manager.js';
import { PatternRecognizer } from './learning/pattern-recognizer.js';
import { SuccessMetricsTracker } from './learning/success-metrics-tracker.js';
import { AdaptiveLearner } from './learning/adaptive-learner.js';
import { InnovationEngine } from './innovation/innovation-engine.js';
import { WorkflowPersistenceManager } from './innovation/workflow-persistence-manager.js';
import { SmartWorkflowBuilder } from './innovation/smart-workflow-builder.js';
import { UsageAnalytics } from './innovation/usage-analytics.js';
import { JWTPromptManager } from './authentication/jwt-prompt-manager.js';

class MCPGatewayServer {
  constructor() {
    this.server = new Server(
      { 
        name: "api-gateway", 
        version: "1.0.0" 
      },
      { 
        capabilities: { 
          tools: {} 
        } 
      }
    );
    
    this.registry = null;
    this.executor = null;
    this.intentParser = null;
    this.workflowEngine = null;
    this.maybankInteractiveTool = null;
    this.config = null;
    this.initialized = false;
    this.mcpTools = [];

    // PHASE 4.5: Advanced Interactive Components
    this.semanticMatcher = null;
    this.aiWorkflowPlanner = null;
    this.parameterCollector = null;
    this.workflowExecutionEngine = null;
    this.conversationManager = null;
    this.uxEnhancements = null;
    this.workflowIntelligence = null;
    
    // PHASE 4.9: Dynamic API Composition & Learning System
    this.compositionCoordinator = null;
    this.catalogProvider = null;
    this.workflowComposer = null;
    this.planParser = null;
    this.dynamicExecutor = null;
    this.dataFlowManager = null;
    this.workflowOrchestrator = null;
    this.adaptiveErrorRecovery = null;
    this.responseSynthesizer = null;
    this.contextFusion = null;
    this.insightGenerator = null;
    this.adaptiveFormatter = null;
    this.memoryManager = null;
    this.patternRecognizer = null;
    this.metricsTracker = null;
    this.adaptiveLearner = null;
    this.innovationEngine = null;
    this.persistenceManager = null;
    this.smartBuilder = null;
    this.usageAnalytics = null;
    
    // Set up MCP handlers in constructor
    this.setupMCPHandlers();
  }

  setupMCPHandlers() {
    // Try alternative handler setup approaches
    try {
      // Method 1: Try with string method names
      this.server.setRequestHandler(ListToolsRequestSchema, async () => {
        logger.debug('Tools list requested', { count: this.mcpTools.length });
        return { tools: this.mcpTools };
      });
      
      this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
        const toolName = request.params?.name;
        const toolArgs = request.params?.arguments || {};
        logger.debug('Tool call received', { tool: toolName });
        
        return await this.handleToolCall(toolName, toolArgs);
      });
      
      logger.info('MCP handlers set up successfully with string methods');
      return;
      
    } catch (error) {
      logger.debug('String method approach failed', { error: error.message });
    }
    
    // Method 2: Try with object method names
    try {
      this.server.setRequestHandler({ method: ListToolsRequestSchema }, async () => {
        logger.debug('Tools list requested', { count: this.mcpTools.length });
        return { tools: this.mcpTools };
      });
      
      this.server.setRequestHandler({ method: CallToolRequestSchema }, async (request) => {
        const toolName = request.params?.name;
        const toolArgs = request.params?.arguments || {};
        logger.debug('Tool call received', { tool: toolName });
        
        return await this.handleToolCall(toolName, toolArgs);
      });
      
      logger.info('MCP handlers set up successfully with object methods');
      return;
      
    } catch (error) {
      logger.debug('Object method approach failed', { error: error.message });
    }
    
    // If both methods fail, continue without handlers
    logger.warn('Could not set up MCP handlers with any method - server will still function for manual testing');
  }

  async initialize() {
    try {
      logger.info('Initializing MCP Gateway Server...');
      
      // 1. Load and validate configuration
      this.config = initializeConfig();
      logger.info('Configuration loaded successfully');
      
      // 2. Initialize API registry
      this.registry = new ApiRegistry();
      await this.registry.initialize();
      logger.registryInit(this.registry.specs.size, this.registry.operations.size);
      
      // 3. Initialize executor and intent parser
      this.executor = new ApiExecutor(this.registry, this.config.apis);
      this.intentParser = new IntentParser(this.registry);
      
      // 4. Initialize workflow engine (Phase 4.1)
      this.workflowEngine = new WorkflowEngine(this.registry, this.executor);
      logger.info('Workflow engine initialized successfully');
      
      // 5. Initialize Maybank interactive tool (Phase 4.2)
      this.maybankInteractiveTool = new MaybankInteractiveTool(this.registry, this.executor);
      logger.info('Maybank interactive tool initialized successfully');

      // 6. PHASE 4.5: Initialize advanced interactive components
      await this.initializePhase45Components();
      
      // 6.5. PHASE 4.7: Initialize enhanced validation and retry system
      await this.initializePhase47Components();
      
      // 6.6. PHASE 4.9: Initialize Dynamic API Composition & Learning System
      await this.initializePhase49Components();
      
      // 7. Register MCP tools dynamically (including all workflow and interactive tools)
      await this.setupMCPTools();
      
      // 8. Set up error handlers
      this.setupErrorHandlers();
      
      // 9. Validate all components work
      this.validateComponents();
      
      this.initialized = true;
      logger.info('MCP Gateway Server initialized successfully');
      
    } catch (error) {
      logger.error('Failed to initialize MCP Gateway Server', { error: error.message });
      throw new Error(`Server initialization failed: ${error.message}`);
    }
  }

  // PHASE 4.5: Initialize advanced interactive components
  async initializePhase45Components() {
    try {
      logger.info('Initializing Phase 4.5 advanced components...');

      // 1. Initialize semantic matcher
      this.semanticMatcher = new EnhancedSemanticMatcher(this.registry);
      logger.info('Enhanced semantic matcher initialized');

      // 2. Initialize AI workflow planner
      this.aiWorkflowPlanner = new AIWorkflowPlanner(this.registry, this.semanticMatcher);
      logger.info('AI workflow planner initialized');

      // 3. Initialize dynamic parameter collector
      this.parameterCollector = new DynamicParameterCollector(this.registry);
      logger.info('Dynamic parameter collector initialized');

      // 4. Initialize workflow execution engine
      this.workflowExecutionEngine = new WorkflowExecutionEngine(this.registry, this.parameterCollector);
      logger.info('Workflow execution engine initialized');

      // 5. Initialize conversational workflow manager
      this.conversationManager = new ConversationalWorkflowManager(
        this.aiWorkflowPlanner,
        this.parameterCollector,
        this.workflowExecutionEngine
      );
      logger.info('Conversational workflow manager initialized');

      // 6. Initialize interactive UX enhancements
      this.uxEnhancements = new InteractiveUXEnhancements();
      logger.info('Interactive UX enhancements initialized');

      // 7. Initialize workflow intelligence
      this.workflowIntelligence = new WorkflowIntelligence();
      logger.info('Workflow intelligence initialized');

      logger.info('✅ Phase 4.5 advanced components initialized successfully');

    } catch (error) {
      logger.error('Failed to initialize Phase 4.5 components', { error: error.message });
      throw new Error(`Phase 4.5 initialization failed: ${error.message}`);
    }
  }

  // PHASE 4.7: Initialize enhanced validation and retry system
  async initializePhase47Components() {
    try {
      logger.info('Initializing Phase 4.7 enhanced validation and retry system...');

      // 1. Initialize advanced validator
      this.advancedValidator = new AdvancedValidator();
      logger.info('Advanced validator initialized');

      // 2. Initialize request body validator
      this.requestBodyValidator = new RequestBodyValidator();
      logger.info('Request body validator initialized');

      // 3. Initialize validation error formatter
      this.validationErrorFormatter = new ValidationErrorFormatter();
      logger.info('Validation error formatter initialized');

      // 4. Initialize enhanced request builder
      this.enhancedRequestBuilder = new EnhancedRequestBuilder();
      logger.info('Enhanced request builder initialized');

      // 5. Initialize interactive parameter collector (Phase 4.7 version)
      this.interactiveParameterCollector = new InteractiveParameterCollector();
      logger.info('Interactive parameter collector initialized');

      // 6. Initialize retry manager
      this.retryManager = new RetryManager();
      logger.info('Retry manager initialized');

      // 7. Initialize enhanced API executor (wraps existing executor)
      this.enhancedApiExecutor = new EnhancedApiExecutor(this.executor);
      logger.info('Enhanced API executor initialized');

      // 8. Create conversational interface for enhanced execution
      this.conversationalApiInterface = this.enhancedApiExecutor.createConversationalInterface();
      logger.info('Conversational API interface created');

      logger.info('✅ Phase 4.7 enhanced validation and retry system initialized successfully');

    } catch (error) {
      logger.error('Failed to initialize Phase 4.7 components', { error: error.message });
      throw new Error(`Phase 4.7 initialization failed: ${error.message}`);
    }
  }

  // PHASE 4.9: Initialize Dynamic API Composition & Learning System
  async initializePhase49Components() {
    try {
      logger.info('Initializing Phase 4.9 Dynamic API Composition & Learning System...');

      // 1. Initialize composition layer components
      this.catalogProvider = new ApiCatalogProvider(this.registry);
      logger.info('API catalog provider initialized');

      this.workflowComposer = new ClaudeWorkflowComposer();
      logger.info('Claude workflow composer initialized');

      this.planParser = new WorkflowPlanParser();
      logger.info('Workflow plan parser initialized');

      this.compositionCoordinator = new CompositionCoordinator(
        this.catalogProvider,
        this.workflowComposer,
        this.planParser
      );
      logger.info('Composition coordinator initialized');

      // 2. Initialize execution layer components
      this.dataFlowManager = new DataFlowManager();
      logger.info('Data flow manager initialized');

      this.adaptiveErrorRecovery = new AdaptiveErrorRecovery();
      logger.info('Adaptive error recovery initialized');

      this.workflowOrchestrator = new WorkflowOrchestrator(
        this.dataFlowManager,
        this.adaptiveErrorRecovery
      );
      logger.info('Workflow orchestrator initialized');

      this.dynamicExecutor = new DynamicWorkflowExecutor(
        this.registry,
        this.workflowOrchestrator,
        this.executor
      );
      logger.info('Dynamic workflow executor initialized');

      // 3. Initialize fusion layer components
      this.responseSynthesizer = new AiResponseSynthesizer();
      logger.info('AI response synthesizer initialized');

      this.contextFusion = new ContextFusionEngine();
      logger.info('Context fusion engine initialized');

      this.insightGenerator = new InsightGenerator();
      logger.info('Insight generator initialized');

      this.adaptiveFormatter = new AdaptiveFormatter();
      logger.info('Adaptive formatter initialized');

      // 4. Initialize learning layer components
      this.memoryManager = new WorkflowMemoryManager();
      logger.info('Workflow memory manager initialized');

      this.patternRecognizer = new PatternRecognizer();
      logger.info('Pattern recognizer initialized');

      this.metricsTracker = new SuccessMetricsTracker();
      logger.info('Success metrics tracker initialized');

      this.adaptiveLearner = new AdaptiveLearner(
        this.memoryManager,
        this.patternRecognizer,
        this.metricsTracker
      );
      logger.info('Adaptive learner initialized');

      // 5. Initialize innovation layer components
      this.persistenceManager = new WorkflowPersistenceManager();
      logger.info('Workflow persistence manager initialized');

      this.usageAnalytics = new UsageAnalytics();
      logger.info('Usage analytics initialized');
      
      this.jwtPromptManager = new JWTPromptManager();
      logger.info('JWT prompt manager initialized');

      this.smartBuilder = new SmartWorkflowBuilder(
        this.registry,
        this.memoryManager,
        this.patternRecognizer
      );
      logger.info('Smart workflow builder initialized');

      this.innovationEngine = new InnovationEngine(
        this.persistenceManager,
        this.smartBuilder,
        this.usageAnalytics,
        this.adaptiveLearner
      );
      logger.info('Innovation engine initialized');

      logger.info('✅ Phase 4.9 Dynamic API Composition & Learning System initialized successfully');

    } catch (error) {
      logger.error('Failed to initialize Phase 4.9 components', { error: error.message });
      throw new Error(`Phase 4.9 initialization failed: ${error.message}`);
    }
  }

  async setupMCPTools() {
    try {
      logger.info('Setting up MCP tools...');
      
      // Get all operations from registry
      const operations = this.registry.getAllOperations();
      logger.debug('Retrieved operations', { count: operations.length });
      
      // Store tools for list handler
      const tools = [];
      
      for (const operation of operations) {
        logger.debug('Processing operation', { operation });
        const operationDetails = this.registry.getOperationDetails(operation.operationId);
        logger.debug('Got operation details', { operationId: operation.operationId });
        // const tool = this.createToolFromOperation(operationDetails);
        // logger.debug('Created tool', { toolName: tool.name });
        // tools.push(tool);
        
        // logger.debug('Created MCP tool', { 
        //   toolName: tool.name, 
        //   operationId: operation.operationId 
        // });
      }
      
      // PHASE 3: Add workflow tools
      if (this.workflowEngine) {
        const workflowTools = this.createWorkflowTools();
        tools.push(...workflowTools);
        logger.info('Added workflow tools', { count: workflowTools.length });
      }
      
      // PHASE 4.2: Add Maybank interactive tool
      if (this.maybankInteractiveTool) {
        const maybankTool = this.maybankInteractiveTool.toolDefinition;
        tools.push(maybankTool);
        logger.info('Added Maybank interactive tool');
      }

      // PHASE 4.5: Add advanced interactive tools
      if (this.conversationManager && this.uxEnhancements && this.workflowIntelligence) {
        const advancedTools = this.createAdvancedInteractiveTools();
        tools.push(...advancedTools);
        logger.info('Added Phase 4.5 advanced interactive tools', { count: advancedTools.length });
      }

      // PHASE 4.7: Add enhanced validation tools
      if (this.enhancedApiExecutor && this.retryManager) {
        const validationTools = this.createValidationTools();
        tools.push(...validationTools);
        logger.info('Added Phase 4.7 validation tools', { count: validationTools.length });
      }

      // PHASE 4.9: Add dynamic API composition and learning tools
      if (this.innovationEngine && this.compositionCoordinator && this.dynamicExecutor) {
        const phase49Tools = this.createPhase49Tools();
        tools.push(...phase49Tools);
        logger.info('Added Phase 4.9 dynamic composition tools', { count: phase49Tools.length });
      }
      
      // Add Phase 5 JWT management tools
      if (this.jwtPromptManager) {
        const jwtTools = this.createJWTTools();
        tools.push(...jwtTools);
        logger.info('Added Phase 5 JWT management tools', { count: jwtTools.length });
      }
      
      // Store tools for the handlers (set up in constructor)
      this.mcpTools = tools;
      logger.info('Tools populated for MCP handlers', { count: tools.length });
      
      logger.debug('Set up MCP request handlers');
      
      logger.info(`Set up ${tools.length} total MCP tools (${operations.length} operations + workflow tools)`);
      
    } catch (error) {
      logger.error('Failed to setup MCP tools', { error: error.message });
      throw new Error(`MCP tools setup failed: ${error.message}`);
    }
  }

  createToolFromOperation(operationDetails) {
    const toolName = operationDetails.operationId;
    const description = operationDetails.summary || operationDetails.description || 'API operation';
    
    // Build input schema from OpenAPI parameters
    const inputSchema = {
      type: "object",
      properties: {},
      required: []
    };
    
    for (const param of operationDetails.parameters) {
      // Map OpenAPI parameter to JSON schema
      const propSchema = {
        type: param.schema?.type || "string",
        description: param.description || `${param.name} parameter`
      };
      
      // Add enum values if specified
      if (param.schema?.enum) {
        propSchema.enum = param.schema.enum;
      }
      
      // Add default value if specified
      if (param.schema?.default !== undefined) {
        propSchema.default = param.schema.default;
      }
      
      inputSchema.properties[param.name] = propSchema;
      
      // Add to required if parameter is required
      if (param.required) {
        inputSchema.required.push(param.name);
      }
    }
    
    return {
      name: toolName,
      description: description,
      inputSchema: inputSchema
    };
  }

  // PHASE 3: Create workflow tools for MCP
  createWorkflowTools() {
    const workflowTools = [
      // Tool 1: Execute predefined workflow
      {
        name: "execute_workflow",
        description: "Execute a predefined workflow by name or saved workflow by ID",
        inputSchema: {
          type: "object",
          properties: {
            workflowName: {
              type: "string",
              description: "Name of predefined workflow to execute (e.g., location_weather, trip_planning, market_overview)"
            },
            workflowId: {
              type: "string",
              description: "ID of saved workflow to execute (e.g., wf_1754302151056_x15mix)"
            },
            parameters: {
              type: "object",
              description: "Parameters for the workflow execution",
              additionalProperties: true
            }
          },
          oneOf: [
            { required: ["workflowName"] },
            { required: ["workflowId"] }
          ]
        }
      },
      
      // Tool 2: Plan custom workflow from natural language
      {
        name: "plan_workflow",
        description: "Plan a custom workflow from a natural language request",
        inputSchema: {
          type: "object",
          properties: {
            request: {
              type: "string",
              description: "Natural language description of what you want to accomplish"
            }
          },
          required: ["request"]
        }
      },
      
      // Tool 3: List available workflows
      {
        name: "list_workflows",
        description: "List all available predefined workflow templates",
        inputSchema: {
          type: "object",
          properties: {}
        }
      },
      
      // Tool 4: Get workflow suggestions
      {
        name: "suggest_workflows", 
        description: "Get workflow suggestions based on a request",
        inputSchema: {
          type: "object",
          properties: {
            request: {
              type: "string",
              description: "Description of what you want to accomplish"
            }
          },
          required: ["request"]
        }
      },
      
      // Tool 5: Execute custom workflow with steps
      {
        name: "execute_custom_workflow",
        description: "Execute a custom sequence of API operations",
        inputSchema: {
          type: "object",
          properties: {
            steps: {
              type: "array",
              description: "Array of operation names to execute in sequence",
              items: {
                type: "string"
              }
            },
            parameters: {
              type: "object",
              description: "Parameters for the workflow steps",
              additionalProperties: true
            }
          },
          required: ["steps"]
        }
      }
    ];

    return workflowTools;
  }

  // PHASE 4.5: Create advanced interactive tools for MCP
  createAdvancedInteractiveTools() {
    const advancedTools = [
      // Tool 1: Start conversational workflow
      {
        name: "start_conversation",
        description: "Start a multi-turn conversational workflow with natural language intent",
        inputSchema: {
          type: "object",
          properties: {
            intent: {
              type: "string",
              description: "Natural language description of what you want to accomplish"
            },
            userId: {
              type: "string",
              description: "User identifier for conversation context (optional)",
              default: "default_user"
            },
            context: {
              type: "object",
              description: "Additional context (location, preferences, etc.)",
              additionalProperties: true
            }
          },
          required: ["intent"]
        }
      },

      // Tool 2: Continue existing conversation
      {
        name: "continue_conversation",
        description: "Continue an existing multi-turn conversation with user input",
        inputSchema: {
          type: "object",
          properties: {
            conversationId: {
              type: "string",
              description: "ID of the conversation to continue"
            },
            userInput: {
              type: "string",
              description: "User's response or input"
            }
          },
          required: ["conversationId", "userInput"]
        }
      },

      // Tool 3: Execute workflow from conversation
      {
        name: "execute_conversation_workflow",
        description: "Execute the workflow from a completed conversation",
        inputSchema: {
          type: "object",
          properties: {
            conversationId: {
              type: "string",
              description: "ID of the conversation with collected parameters"
            }
          },
          required: ["conversationId"]
        }
      },

      // Tool 4: Get workflow suggestions with AI
      {
        name: "get_workflow_suggestions",
        description: "Get AI-powered workflow suggestions based on user intent and context",
        inputSchema: {
          type: "object",
          properties: {
            intent: {
              type: "string",
              description: "User's intent or request"
            },
            userId: {
              type: "string",
              description: "User identifier for personalized suggestions",
              default: "default_user"
            },
            context: {
              type: "object",
              description: "Context for suggestions (location, time, etc.)",
              additionalProperties: true
            }
          },
          required: ["intent"]
        }
      },

      // Tool 5: Get smart parameter defaults
      {
        name: "get_smart_defaults",
        description: "Get intelligent parameter defaults based on user patterns and context",
        inputSchema: {
          type: "object",
          properties: {
            workflowContext: {
              type: "object",
              description: "Workflow context for generating defaults",
              additionalProperties: true
            },
            userId: {
              type: "string",
              description: "User identifier for personalized defaults",
              default: "default_user"
            }
          },
          required: ["workflowContext"]
        }
      },

      // Tool 6: Monitor workflow progress
      {
        name: "monitor_workflow_progress",
        description: "Monitor real-time progress of a workflow execution",
        inputSchema: {
          type: "object",
          properties: {
            workflowId: {
              type: "string",
              description: "ID of the workflow to monitor"
            }
          },
          required: ["workflowId"]
        }
      },

      // Tool 7: Get optimization recommendations
      {
        name: "get_optimization_recommendations",
        description: "Get AI-powered recommendations for workflow optimization",
        inputSchema: {
          type: "object",
          properties: {
            workflowSpec: {
              type: "object",
              description: "Workflow specification to analyze",
              additionalProperties: true
            },
            executionHistory: {
              type: "array",
              description: "Historical execution data for analysis",
              items: { type: "object", additionalProperties: true }
            }
          },
          required: ["workflowSpec"]
        }
      }
    ];

    return advancedTools;
  }

  // PHASE 4.7: Create validation tools for MCP
  createValidationTools() {
    const validationTools = [
      // Tool 1: Enhanced API execution with validation
      {
        name: "execute_api_with_validation",
        description: "Execute API with comprehensive validation, interactive parameter collection, and retry",
        inputSchema: {
          type: "object",
          properties: {
            operationId: {
              type: "string",
              description: "The API operation ID to execute"
            },
            parameters: {
              type: "object",
              description: "Parameters for the API call",
              additionalProperties: true
            },
            enableInteractiveCollection: {
              type: "boolean",
              description: "Enable interactive parameter collection for missing data",
              default: true
            }
          },
          required: ["operationId"]
        }
      },

      // Tool 2: Continue after user provides data
      {
        name: "continue_api_execution",
        description: "Continue API execution after user provides missing parameter data",
        inputSchema: {
          type: "object",
          properties: {
            sessionId: {
              type: "string",
              description: "The execution session ID"
            },
            collectionId: {
              type: "string",
              description: "The parameter collection session ID"
            },
            userInput: {
              type: "string",
              description: "User's input for the requested parameter"
            }
          },
          required: ["sessionId", "collectionId", "userInput"]
        }
      },

      // Tool 3: Validate request body
      {
        name: "validate_request_body",
        description: "Validate a request body against OpenAPI schema without execution",
        inputSchema: {
          type: "object",
          properties: {
            operationId: {
              type: "string",
              description: "The API operation ID for schema lookup"
            },
            body: {
              type: "object",
              description: "The request body to validate",
              additionalProperties: true
            }
          },
          required: ["operationId", "body"]
        }
      }
    ];

    return validationTools;
  }

  // PHASE 4.9: Create dynamic API composition and learning tools for MCP
  createPhase49Tools() {
    const phase49Tools = [
      // Tool 1: Compose workflow from natural language
      {
        name: "compose_intelligent_workflow",
        description: "Use AI to compose innovative workflows from natural language requests that combine multiple APIs",
        inputSchema: {
          type: "object",
          properties: {
            userRequest: {
              type: "string",
              description: "Natural language description of what you want to accomplish"
            },
            context: {
              type: "object",
              description: "Additional context (user preferences, location, etc.)",
              additionalProperties: true
            },
            innovationLevel: {
              type: "string",
              description: "Level of innovation desired",
              enum: ["standard", "enhanced", "innovative", "cutting_edge"],
              default: "enhanced"
            }
          },
          required: ["userRequest"]
        }
      },

      // Tool 2: Execute dynamic workflow
      {
        name: "execute_dynamic_workflow",
        description: "Execute a dynamically composed workflow with cross-API data flow and adaptive error recovery",
        inputSchema: {
          type: "object",
          properties: {
            workflowPlan: {
              type: "object",
              description: "The workflow plan to execute",
              additionalProperties: true
            },
            parameters: {
              type: "object",
              description: "Parameters for workflow execution",
              additionalProperties: true
            },
            enableLearning: {
              type: "boolean",
              description: "Enable learning from execution results",
              default: true
            },
            sessionId: {
              type: "string",
              description: "Session ID for JWT token management (Phase 5)",
              default: "default_session"
            },
            userId: {
              type: "string", 
              description: "User ID for multi-user JWT sessions (Phase 5)",
              default: "default"
            }
          },
          required: ["workflowPlan"]
        }
      },

      // Tool 3: Get workflow recommendations
      {
        name: "get_intelligent_workflow_recommendations",
        description: "Get AI-powered workflow recommendations based on user intent and learned patterns",
        inputSchema: {
          type: "object",
          properties: {
            userIntent: {
              type: "string",
              description: "User's intent or goal"
            },
            context: {
              type: "object",
              description: "User context and preferences",
              additionalProperties: true
            },
            includeInnovative: {
              type: "boolean",
              description: "Include innovative workflow suggestions",
              default: true
            }
          },
          required: ["userIntent"]
        }
      },

      // Tool 4: Discover workflow innovations
      {
        name: "discover_workflow_innovations",
        description: "Discover and create innovative workflow combinations that haven't been seen before",
        inputSchema: {
          type: "object",
          properties: {
            problemDescription: {
              type: "string",
              description: "Description of the problem or use case"
            },
            creativityLevel: {
              type: "number",
              description: "Creativity level from 0.1 to 1.0",
              minimum: 0.1,
              maximum: 1.0,
              default: 0.7
            },
            domainHints: {
              type: "array",
              description: "Domains to consider for innovation",
              items: { type: "string" }
            }
          },
          required: ["problemDescription"]
        }
      },

      // Tool 5: Get workflow library
      {
        name: "get_workflow_library",
        description: "Browse the persistent workflow library with filtering and sorting options",
        inputSchema: {
          type: "object",
          properties: {
            filterBy: {
              type: "object",
              description: "Filters to apply",
              properties: {
                innovationType: { type: "string" },
                minNovelty: { type: "number", minimum: 0, maximum: 1 },
                tags: { type: "array", items: { type: "string" } }
              }
            },
            sortBy: {
              type: "string",
              description: "Sort criteria",
              enum: ["innovation", "novelty", "usage", "recent"],
              default: "innovation"
            },
            limit: {
              type: "number",
              description: "Maximum number of workflows to return",
              minimum: 1,
              maximum: 50,
              default: 10
            }
          }
        }
      },

      // Tool 6: Analyze workflow patterns
      {
        name: "analyze_workflow_patterns",
        description: "Analyze patterns in workflow usage and success to identify optimization opportunities",
        inputSchema: {
          type: "object",
          properties: {
            timeframe: {
              type: "string",
              description: "Time frame for analysis",
              enum: ["1d", "7d", "30d", "90d"],
              default: "30d"
            },
            includeRecommendations: {
              type: "boolean",
              description: "Include optimization recommendations",
              default: true
            }
          }
        }
      },

      // Tool 7: Save workflow innovation
      {
        name: "save_workflow_innovation",
        description: "Save an innovative workflow to the persistent library for future reuse",
        inputSchema: {
          type: "object",
          properties: {
            workflow: {
              type: "object",
              description: "The workflow to save",
              additionalProperties: true
            },
            metadata: {
              type: "object",
              description: "Additional metadata about the workflow",
              additionalProperties: true
            }
          },
          required: ["workflow"]
        }
      },

      // Tool 8: Save any workflow (explicit user control)
      {
        name: "save_workflow",
        description: "Save any workflow to persistent storage for future reuse (no innovation criteria required)",
        inputSchema: {
          type: "object",
          properties: {
            workflow: {
              type: "object",
              description: "The workflow to save (with id, name, description, and steps)",
              properties: {
                id: { type: "string", description: "Workflow ID (auto-generated if not provided)" },
                name: { type: "string", description: "Workflow name" },
                description: { type: "string", description: "Workflow description" },
                steps: { type: "array", description: "Workflow steps", items: { type: "object" } }
              },
              required: ["steps"]
            },
            tags: {
              type: "array",
              description: "Tags to categorize the workflow",
              items: { type: "string" }
            }
          },
          required: ["workflow"]
        }
      },

      // Tool 9: Get workflow schema and documentation
      {
        name: "get_workflow_schema",
        description: "Get workflow structure schema, available operations, and examples to understand how to create workflows",
        inputSchema: {
          type: "object",
          properties: {
            includeExamples: {
              type: "boolean",
              description: "Include example workflows",
              default: true
            },
            operationFilter: {
              type: "string",
              description: "Filter operations by domain (e.g., 'banking', 'weather', 'currency')"
            }
          }
        }
      },

      // Tool 10: Get fusion insights
      {
        name: "get_fusion_insights",
        description: "Get intelligent insights by fusing data from multiple API responses",
        inputSchema: {
          type: "object",
          properties: {
            apiResponses: {
              type: "array",
              description: "Array of API responses to fuse",
              items: { type: "object", additionalProperties: true }
            },
            fusionType: {
              type: "string",
              description: "Type of fusion to perform",
              enum: ["contextual", "analytical", "predictive", "comprehensive"],
              default: "contextual"
            },
            outputFormat: {
              type: "string",
              description: "Desired output format",
              enum: ["text", "json", "cards", "chart"],
              default: "text"
            }
          },
          required: ["apiResponses"]
        }
      }
    ];

    return phase49Tools;
  }

  // PHASE 5: Create JWT management tools for Claude Desktop integration
  createJWTTools() {
    const jwtTools = [
      // Tool 1: Check JWT status for a session
      {
        name: "check_jwt_status",
        description: "Check if the current session has a valid JWT token for Maybank operations",
        inputSchema: {
          type: "object",
          properties: {
            sessionId: {
              type: "string",
              description: "Session ID to check JWT status for",
              default: "default_session"
            },
            userId: {
              type: "string",
              description: "User ID for multi-user sessions",
              default: "default"
            }
          }
        }
      },

      // Tool 2: Provide JWT token for pending prompts
      {
        name: "provide_jwt_token",
        description: "Provide a JWT token to fulfill a pending prompt and continue execution",
        inputSchema: {
          type: "object",
          properties: {
            promptId: {
              type: "string",
              description: "The prompt ID requesting the JWT token"
            },
            jwtToken: {
              type: "string",
              description: "The JWT token to provide (full Bearer token with proper format)"
            }
          },
          required: ["promptId", "jwtToken"]
        }
      },

      // Tool 3: Get pending JWT prompts for a session
      {
        name: "get_jwt_prompts",
        description: "Get all pending JWT token prompts for a session",
        inputSchema: {
          type: "object",
          properties: {
            sessionId: {
              type: "string",
              description: "Session ID to get prompts for",
              default: "default_session"
            }
          }
        }
      }
    ];

    return jwtTools;
  }

  // PHASE 3: Check if tool is a workflow tool
  isWorkflowTool(toolName) {
    const workflowToolNames = [
      'execute_workflow',
      'plan_workflow', 
      'list_workflows',
      'suggest_workflows',
      'execute_custom_workflow'
    ];
    return workflowToolNames.includes(toolName);
  }

  // PHASE 4.5: Check if tool is an advanced interactive tool
  isAdvancedInteractiveTool(toolName) {
    const advancedToolNames = [
      'start_conversation',
      'continue_conversation',
      'execute_conversation_workflow',
      'get_workflow_suggestions',
      'get_smart_defaults',
      'monitor_workflow_progress',
      'get_optimization_recommendations'
    ];
    return advancedToolNames.includes(toolName);
  }

  // PHASE 4.7: Check if tool is a validation tool
  isValidationTool(toolName) {
    const validationToolNames = [
      'execute_api_with_validation',
      'continue_api_execution',
      'validate_request_body'
    ];
    return validationToolNames.includes(toolName);
  }

  // PHASE 4.9: Check if tool is a dynamic composition tool
  isPhase49Tool(toolName) {
    const phase49ToolNames = [
      'compose_intelligent_workflow',
      'execute_dynamic_workflow',
      'get_intelligent_workflow_recommendations',
      'discover_workflow_innovations',
      'get_workflow_library',
      'analyze_workflow_patterns',
      'save_workflow_innovation',
      'save_workflow',
      'get_workflow_schema',
      'get_fusion_insights'
    ];
    return phase49ToolNames.includes(toolName);
  }

  // PHASE 5: Check if tool is a JWT management tool
  isJWTTool(toolName) {
    const jwtToolNames = [
      'check_jwt_status',
      'provide_jwt_token',
      'get_jwt_prompts'
    ];
    return jwtToolNames.includes(toolName);
  }

  // Helper method to extract operation domain
  extractOperationDomain(operationId) {
    if (operationId.includes('weather') || operationId.includes('Weather')) return 'weather';
    if (operationId.includes('banking') || operationId.includes('Balance') || operationId.includes('expense')) return 'banking';
    if (operationId.includes('currency') || operationId.includes('Currency')) return 'currency';
    if (operationId.includes('payment') || operationId.includes('Payment')) return 'payment';
    if (operationId.includes('goal') || operationId.includes('Goal')) return 'goals';
    if (operationId.includes('news') || operationId.includes('News')) return 'news';
    if (operationId.includes('geo') || operationId.includes('location')) return 'geolocation';
    return 'general';
  }

  // Helper method to get workflow examples
  getWorkflowExamples() {
    return [
      {
        name: "Simple Weather Check",
        description: "Single-step workflow to check weather",
        workflow: {
          name: "Check Weather",
          steps: [
            { operation: "getCurrentWeather", parameters: { q: "Kuala Lumpur" } }
          ]
        }
      },
      {
        name: "Banking Dashboard",
        description: "Multi-step banking overview",
        workflow: {
          name: "Financial Overview",
          steps: [
            { operation: "getBalance", parameters: {} },
            { operation: "getExpensesSummary", parameters: { period: "month" } },
            { operation: "getBillPaymentStatus", parameters: {} }
          ]
        }
      },
      {
        name: "Cross-Domain Analysis",
        description: "Combine weather and financial data",
        workflow: {
          name: "Weather-Based Financial Insights",
          steps: [
            { id: "weather", operation: "getCurrentWeather", parameters: { q: "KL" } },
            { id: "balance", operation: "getBalance", parameters: {} },
            { id: "synthesis", operation: "synthesize_financial_overview", dependencies: ["weather", "balance"] }
          ]
        }
      }
    ];
  }

  // Helper method to identify innovative workflows worth saving
  isInnovativeWorkflow(workflowPlan) {
    try {
      if (!workflowPlan || !workflowPlan.steps || !Array.isArray(workflowPlan.steps)) {
        return false;
      }
      
      // Consider it innovative if:
      // 1. Has multiple steps (composition)
      const multiStep = workflowPlan.steps.length > 1;
      
      // 2. Combines different domains
      const domains = new Set();
      for (const step of workflowPlan.steps) {
        if (!step || !step.operation) continue;
        
        if (step.operation.includes('weather')) domains.add('weather');
        if (step.operation.includes('banking') || step.operation.includes('Balance')) domains.add('banking');
        if (step.operation.includes('currency')) domains.add('currency');
        if (step.operation.includes('expense')) domains.add('expenses');
      }
      const crossDomain = domains.size > 1;
      
      // 3. Has synthesize or analyze operations
      const hasSynthesis = workflowPlan.steps.some(step => 
        step && step.operation && (
          step.operation.includes('synthesize') || 
          step.operation.includes('analyze') ||
          step.operation.includes('create_comprehensive')
        )
      );
      
      // 4. Has data flow connections
      const hasDataFlow = workflowPlan.dataFlowMap && workflowPlan.dataFlowMap.size > 0;
      
      return multiStep && (crossDomain || hasSynthesis || hasDataFlow);
    } catch (error) {
      logger.warn('Error checking if workflow is innovative', { error: error.message });
      return false;
    }
  }

  // PHASE 3: Handle workflow tool calls
  async handleWorkflowToolCall(toolName, arguments_) {
    const startTime = Date.now();
    
    try {
      let result;
      
      switch (toolName) {
        case 'execute_workflow':
          // Handle both old workflowName and new workflowId
          if (arguments_.workflowId) {
            // Phase 4.9: Execute saved workflow by ID
            try {
              // Load workflow from persistence
              const workflow = await this.persistenceManager.getWorkflow(arguments_.workflowId);
              if (!workflow) {
                throw new Error(`Workflow '${arguments_.workflowId}' not found`);
              }
              
              logger.info('Executing saved workflow', {
                workflowId: arguments_.workflowId,
                name: workflow.name
              });
              
              result = await this.dynamicExecutor.executeWorkflow(workflow);
            } catch (error) {
              logger.error('Saved workflow execution failed', { 
                workflowId: arguments_.workflowId,
                error: error.message 
              });
              result = {
                success: false,
                error: `Workflow execution failed: ${error.message}`
              };
            }
          } else if (arguments_.workflowName) {
            // Legacy: Execute predefined workflow by name
            result = await this.workflowEngine.executeWorkflow(
              arguments_.workflowName, 
              arguments_.parameters || {}
            );
          } else {
            result = {
              success: false,
              error: 'Either workflowId or workflowName is required'
            };
          }
          break;
          
        case 'plan_workflow':
          const plan = this.intentParser.planCustomWorkflow(arguments_.request);
          result = {
            success: true,
            data: {
              plan: plan,
              steps: plan.steps,
              estimatedTime: plan.estimatedTime,
              confidence: plan.confidence,
              workflowType: plan.workflowType,
              complexity: plan.complexity,
              reasoning: plan.reasoning || []
            }
          };
          break;
          
        case 'list_workflows':
          try {
            // Get both predefined workflows and saved workflows
            const predefinedWorkflows = this.workflowEngine?.getAllWorkflows() || [];
            const savedWorkflows = await this.persistenceManager.getWorkflowLibrary({ limit: 50 });
            
            result = {
              success: true,
              data: {
                predefinedWorkflows: predefinedWorkflows,
                savedWorkflows: savedWorkflows.workflows || [],
                total: predefinedWorkflows.length + (savedWorkflows.workflows || []).length,
                metadata: savedWorkflows.metadata || {}
              }
            };
          } catch (error) {
            logger.error('Failed to list workflows', { error: error.message });
            result = {
              success: false,
              error: `Failed to list workflows: ${error.message}`
            };
          }
          break;
          
        case 'suggest_workflows':
          const suggestions = this.intentParser.suggestWorkflows 
            ? this.intentParser.suggestWorkflows(arguments_.request)
            : [];
          result = {
            success: true,
            data: {
              suggestions: suggestions,
              requestAnalyzed: arguments_.request
            }
          };
          break;
          
        case 'execute_custom_workflow':
          // Execute using workflow engine's step execution logic
          result = await this.executeCustomWorkflowSteps(arguments_.steps, arguments_.parameters || {});
          break;
          
        default:
          throw new Error(`Unknown workflow tool: ${toolName}`);
      }
      
      const duration = Date.now() - startTime;
      logger.mcpToolResponse(toolName, result.success, duration);
      
      if (result.success) {
        return {
          content: [
            {
              type: "text",
              text: this.formatWorkflowResponse(result, toolName)
            }
          ]
        };
      } else {
        return {
          content: [
            {
              type: "text",
              text: `Workflow tool '${toolName}' failed: ${result.error}`
            }
          ],
          isError: true
        };
      }
      
    } catch (error) {
      const duration = Date.now() - startTime;
      logger.mcpToolResponse(toolName, false, duration);
      
      return {
        content: [
          {
            type: "text",
            text: `Error in workflow tool '${toolName}': ${error.message}`
          }
        ],
        isError: true
      };
    }
  }

  // PHASE 3: Execute custom workflow steps  
  async executeCustomWorkflowSteps(steps, parameters) {
    const startTime = Date.now();
    
    try {
      const results = {
        success: true,
        workflowName: 'Custom Workflow',
        startTime: new Date().toISOString(),
        steps: [],
        data: {},
        metadata: {
          totalSteps: steps.length,
          executedSteps: 0
        }
      };

      const stepResults = new Map();
      
      for (let i = 0; i < steps.length; i++) {
        const stepName = steps[i];
        const stepId = `step_${i + 1}`;
        
        try {
          // Execute the operation
          const operationResult = await this.executor.executeOperation(stepName, parameters);
          
          stepResults.set(stepId, operationResult);
          
          results.steps.push({
            id: stepId,
            operation: stepName,
            success: operationResult.success,
            data: operationResult.success ? operationResult.data : null,
            error: operationResult.success ? null : operationResult.error
          });
          
          results.metadata.executedSteps++;
          
          if (!operationResult.success) {
            results.success = false;
            results.error = `Step '${stepName}' failed: ${operationResult.error}`;
            break;
          }
          
        } catch (error) {
          results.steps.push({
            id: stepId,
            operation: stepName,
            success: false,
            error: error.message
          });
          
          results.success = false;
          results.error = `Step '${stepName}' failed: ${error.message}`;
          break;
        }
      }

      // Aggregate results if successful
      if (results.success) {
        const aggregated = {};
        for (const [stepId, result] of stepResults) {
          if (result.success) {
            aggregated[stepId] = result.data;
          }
        }
        results.data = aggregated;
      }

      const duration = Date.now() - startTime;
      results.duration = duration;
      results.endTime = new Date().toISOString();
      
      return results;
      
    } catch (error) {
      const duration = Date.now() - startTime;
      return {
        success: false,
        workflowName: 'Custom Workflow',
        error: error.message,
        duration: duration,
        startTime: new Date().toISOString(),
        endTime: new Date().toISOString()
      };
    }
  }

  // PHASE 3: Format workflow tool responses
  formatWorkflowResponse(result, toolName) {
    try {
      if (!result.success) {
        return `❌ Workflow failed: ${result.error}`;
      }

      switch (toolName) {
        case 'execute_workflow':
          // Handle both old and new response formats
          const executedSteps = result.metrics?.stepsExecuted || result.metadata?.executedSteps || 0;
          const totalSteps = result.summary?.totalSteps || result.metadata?.totalSteps || 0;
          const workflowName = result.workflowName || result.name || 'Workflow';
          const duration = result.metrics?.totalTime || result.duration || 0;
          
          if (result.partialSuccess) {
            return `🔄 Workflow '${workflowName}' completed with partial success\n\n` +
                   `Executed ${executedSteps}/${totalSteps} steps\n` +
                   `Duration: ${duration}ms\n\n` +
                   `Warning: ${result.error}\n\n` +
                   `Results:\n${JSON.stringify(result.stepResults || result.data, null, 2)}`;
          } else {
            return `✅ Workflow '${workflowName}' completed successfully\n\n` +
                   `Executed ${executedSteps}/${totalSteps} steps\n` +
                   `Duration: ${duration}ms\n\n` +
                   `Success Rate: ${result.metrics?.successRate || '100'}%\n\n` +
                   `Results:\n${JSON.stringify(result.stepResults || result.data, null, 2)}`;
          }
          
        case 'plan_workflow':
          const plan = result.data.plan;
          return `📋 Workflow Plan Generated\n\n` +
                 `Workflow Type: ${plan.workflowType}\n` +
                 `Complexity: ${plan.complexity}\n` +
                 `Confidence: ${(plan.confidence * 100).toFixed(1)}%\n` +
                 `Estimated Time: ${plan.estimatedTime}ms\n\n` +
                 `Planned Steps:\n${plan.steps.map((step, i) => `${i + 1}. ${step}`).join('\n')}\n\n` +
                 `Reasoning:\n${plan.reasoning.join('\n')}`;
          
        case 'list_workflows':
          const predefinedWorkflows = result.data.predefinedWorkflows || [];
          const savedWorkflows = result.data.savedWorkflows || [];
          const total = result.data.total || 0;
          
          let output = `📚 Available Workflows (${total})\n\n`;
          
          if (predefinedWorkflows.length > 0) {
            output += `**Predefined Workflows (${predefinedWorkflows.length}):**\n`;
            output += predefinedWorkflows.map(w => 
              `• ${w.displayName || w.name}\n  Steps: ${w.stepCount || 'N/A'}, Est. Time: ${w.estimatedTime || 'N/A'}ms\n  ${w.description || 'No description'}`
            ).join('\n\n') + '\n\n';
          }
          
          if (savedWorkflows.length > 0) {
            output += `**Saved Workflows (${savedWorkflows.length}):**\n`;
            output += savedWorkflows.map(w => 
              `• ${w.name} (ID: ${w.id})\n  Steps: ${w.steps?.length || 0}, Tags: ${w.tags?.join(', ') || 'none'}\n  ${w.description || 'No description'}`
            ).join('\n\n');
          }
          
          return output;
          
        case 'suggest_workflows':
          const suggestions = result.data.suggestions;
          if (suggestions.length === 0) {
            return `💡 No workflow suggestions found for: "${result.data.requestAnalyzed}"`;
          }
          return `💡 Workflow Suggestions for: "${result.data.requestAnalyzed}"\n\n` +
                 suggestions.map((s, i) => 
                   `${i + 1}. ${s.workflowType} (confidence: ${(s.confidence * 100).toFixed(1)}%)\n` +
                   `   Reasoning: ${s.reasoning}`
                 ).join('\n\n');
          
        case 'execute_custom_workflow':
          return `🔧 Custom workflow completed\n\n` +
                 `Executed ${result.metrics?.stepsExecuted || result.metadata?.executedSteps || 0}/${result.summary?.totalSteps || result.metadata?.totalSteps || 0} steps\n` +
                 `Duration: ${result.duration}ms\n\n` +
                 `Results:\n${JSON.stringify(result.data, null, 2)}`;
          
        default:
          return `Workflow tool '${toolName}' completed successfully\n\n${JSON.stringify(result.data, null, 2)}`;
      }
      
    } catch (error) {
      return `Error formatting workflow response: ${error.message}\n\nRaw result:\n${JSON.stringify(result, null, 2)}`;
    }
  }

  async handleToolCall(toolName, arguments_) {
    const startTime = Date.now();
    
    // Start debug logging session for payment operations
    if (toolName === 'get_payment_favList_1' || 
        (toolName === 'execute_api_with_validation' && arguments_.operationId === 'get_payment_favList_1')) {
      debugLogger.startSession(toolName);
      debugLogger.log('ENTRY_POINT', {
        toolName,
        arguments: arguments_,
        timestamp: new Date().toISOString()
      });
    }
    
    try {
      logger.mcpToolCall(toolName, arguments_);
      
      // PHASE 4.7: Check if this is a validation tool
      if (this.isValidationTool(toolName)) {
        return await this.handleValidationToolCall(toolName, arguments_);
      }

      // PHASE 4.9: Check if this is a dynamic composition tool
      if (this.isPhase49Tool(toolName)) {
        return await this.handlePhase49ToolCall(toolName, arguments_);
      }

      // PHASE 5: Check if this is a JWT management tool
      if (this.isJWTTool(toolName)) {
        return await this.handleJWTToolCall(toolName, arguments_);
      }

      // PHASE 4.2: Check if this is the Maybank interactive tool
      if (toolName === 'maybank_interactive') {
        return await this.handleMaybankInteractiveTool(arguments_);
      }

      // PHASE 4.5: Check if this is an advanced interactive tool
      if (this.isAdvancedInteractiveTool(toolName)) {
        return await this.handleAdvancedInteractiveTool(toolName, arguments_);
      }
      
      // PHASE 3: Check if this is a workflow tool
      if (this.isWorkflowTool(toolName)) {
        return await this.handleWorkflowToolCall(toolName, arguments_);
      }
      
      // 1. Map tool name to operation (existing single API logic)
      const operationId = toolName; // For Phase 1, tool name = operation ID
      const operationDetails = this.registry.getOperationDetails(operationId);
      
      if (!operationDetails) {
        throw new Error(`Operation '${operationId}' not found`);
      }
      
      // 2. Validate input arguments
      // const tool = this.createToolFromOperation(operationDetails);
      // const validation = Validators.validateToolArguments(arguments_, tool.inputSchema);
      
      // if (!validation.valid) {
      //   throw new Error(`Argument validation failed: ${validation.errors.join(', ')}`);
      // }
      
      // 3. Execute operation via executor
      const result = await this.executor.executeOperation(operationId, arguments_);
      
      const duration = Date.now() - startTime;
      
      // Debug logging completion for payment operations
      if (toolName === 'get_payment_favList_1') {
        debugLogger.endSession({
          result: result.success ? 'SUCCESS' : 'FAILED',
          statusCode: result.status || result.httpStatus || 'Unknown',
          error: result.error || result.errorMessage || null
        });
      }
      
      if (result.success) {
        logger.mcpToolResponse(toolName, true, duration);
        
        // Format successful response for MCP
        return {
          content: [
            {
              type: "text",
              text: this.formatSuccessResponse(result, operationDetails)
            }
          ]
        };
      } else {
        logger.mcpToolResponse(toolName, false, duration);
        
        // Format error response for MCP
        return {
          content: [
            {
              type: "text", 
              text: this.formatErrorResponse(result, operationDetails)
            }
          ],
          isError: true
        };
      }
      
    } catch (error) {
      const duration = Date.now() - startTime;
      logger.mcpToolResponse(toolName, false, duration);
      logger.error('Tool call failed', { 
        toolName, 
        error: error.message,
        duration: `${duration}ms`
      });
      
      return {
        content: [
          {
            type: "text",
            text: `Error: ${error.message}`
          }
        ],
        isError: true
      };
    }
  }

  // PHASE 4.5: Handle advanced interactive tool calls
  async handleAdvancedInteractiveTool(toolName, arguments_) {
    const startTime = Date.now();
    
    try {
      let result;
      
      switch (toolName) {
        case 'start_conversation':
          result = await this.conversationManager.startConversation(
            arguments_.userId || 'default_user',
            arguments_.intent,
            arguments_.context || {}
          );
          break;
          
        case 'continue_conversation':
          result = await this.conversationManager.continueConversation(
            arguments_.conversationId,
            arguments_.userInput
          );
          break;
          
        case 'execute_conversation_workflow':
          result = await this.conversationManager.executeWorkflow(arguments_.conversationId);
          break;
          
        case 'get_workflow_suggestions':
          const suggestions = this.workflowIntelligence.suggestWorkflows(
            arguments_.userId || 'default_user',
            arguments_.intent,
            arguments_.context || {}
          );
          result = {
            success: true,
            suggestions: suggestions,
            intent: arguments_.intent
          };
          break;
          
        case 'get_smart_defaults':
          const smartDefaults = this.workflowIntelligence.generateSmartDefaults(
            arguments_.userId || 'default_user',
            arguments_.workflowContext
          );
          result = {
            success: true,
            defaults: smartDefaults.defaults,
            confidence: smartDefaults.confidence,
            sources: smartDefaults.sources
          };
          break;
          
        case 'monitor_workflow_progress':
          const progressIndicators = this.uxEnhancements.getActiveProgressIndicators();
          const isActive = progressIndicators.includes(arguments_.workflowId);
          result = {
            success: true,
            workflowId: arguments_.workflowId,
            isActive: isActive,
            activeWorkflows: progressIndicators.length
          };
          break;
          
        case 'get_optimization_recommendations':
          const recommendations = this.workflowIntelligence.generateOptimizationRecommendations(
            arguments_.workflowSpec,
            arguments_.executionHistory || []
          );
          result = {
            success: true,
            recommendations: recommendations,
            totalRecommendations: recommendations.length
          };
          break;
          
        default:
          throw new Error(`Unknown advanced interactive tool: ${toolName}`);
      }
      
      const duration = Date.now() - startTime;
      logger.mcpToolResponse(toolName, result.success !== false, duration);
      
      return {
        content: [
          {
            type: "text",
            text: this.formatAdvancedInteractiveResponse(result, toolName)
          }
        ]
      };
      
    } catch (error) {
      const duration = Date.now() - startTime;
      logger.mcpToolResponse(toolName, false, duration);
      
      return {
        content: [
          {
            type: "text",
            text: `❌ Advanced Interactive Tool Error: ${error.message}`
          }
        ],
        isError: true
      };
    }
  }

  // PHASE 4.5: Format advanced interactive tool responses
  formatAdvancedInteractiveResponse(result, toolName) {
    try {
      switch (toolName) {
        case 'start_conversation':
          return `🎯 **Conversation Started**\n\n` +
                 `**Conversation ID:** ${result.conversationId}\n` +
                 `**Status:** ${result.status || 'active'}\n` +
                 `**Needs Input:** ${result.needsInput ? 'Yes' : 'No'}\n\n` +
                 `**Assistant Response:**\n${result.response}`;
          
        case 'continue_conversation':
          return `💬 **Conversation Continued**\n\n` +
                 `**Conversation ID:** ${result.conversationId}\n` +
                 `**Status:** ${result.status || 'active'}\n` +
                 `**Needs Input:** ${result.needsInput ? 'Yes' : 'No'}\n` +
                 `**Progress:** ${result.progress?.percent || 0}%\n\n` +
                 `**Assistant Response:**\n${result.response}`;
          
        case 'execute_conversation_workflow':
          return `🚀 **Workflow Executed**\n\n` +
                 `**Conversation ID:** ${result.conversationId}\n` +
                 `**Status:** ${result.executionResult?.status || 'unknown'}\n` +
                 `**Duration:** ${result.duration || 0}ms\n\n` +
                 `**Execution completed successfully!**`;
          
        case 'get_workflow_suggestions':
          if (result.suggestions.length === 0) {
            return `💡 **No Workflow Suggestions**\n\nNo suggestions found for: "${result.intent}"`;
          }
          return `💡 **Workflow Suggestions** (${result.suggestions.length})\n\n` +
                 `For: "${result.intent}"\n\n` +
                 result.suggestions.map((s, i) => 
                   `**${i + 1}. ${s.workflow.name}**\n` +
                   `   Type: ${s.type}\n` +
                   `   Confidence: ${Math.round(s.confidence * 100)}%\n` +
                   `   Reason: ${s.reason}\n`
                 ).join('\n');
          
        case 'get_smart_defaults':
          const defaultCount = Object.keys(result.defaults).length;
          if (defaultCount === 0) {
            return `🧠 **Smart Defaults**\n\nNo intelligent defaults generated.`;
          }
          return `🧠 **Smart Defaults Generated** (${defaultCount})\n\n` +
                 `**Overall Confidence:** ${Math.round(result.confidence * 100)}%\n\n` +
                 `**Generated Defaults:**\n` +
                 Object.entries(result.defaults).slice(0, 10).map(([param, info]) => 
                   `• **${param}:** ${info.value} (${Math.round(info.confidence * 100)}% confidence)`
                 ).join('\n') +
                 (defaultCount > 10 ? `\n\n...and ${defaultCount - 10} more parameters` : '');
          
        case 'monitor_workflow_progress':
          return `📊 **Workflow Progress Monitor**\n\n` +
                 `**Workflow ID:** ${result.workflowId}\n` +
                 `**Status:** ${result.isActive ? 'Active' : 'Not Active'}\n` +
                 `**Total Active Workflows:** ${result.activeWorkflows}`;
          
        case 'get_optimization_recommendations':
          if (result.recommendations.length === 0) {
            return `⚡ **Optimization Recommendations**\n\nNo optimization recommendations available.`;
          }
          return `⚡ **Optimization Recommendations** (${result.totalRecommendations})\n\n` +
                 result.recommendations.slice(0, 5).map((rec, i) => 
                   `**${i + 1}. ${rec.title}** (${rec.priority} priority)\n` +
                   `   ${rec.description}\n` +
                   `   Impact: ${rec.impact}\n`
                 ).join('\n') +
                 (result.totalRecommendations > 5 ? `\n\n...and ${result.totalRecommendations - 5} more recommendations` : '');
          
        default:
          return `Advanced interactive tool '${toolName}' completed successfully\n\n${JSON.stringify(result, null, 2)}`;
      }
      
    } catch (error) {
      return `Error formatting advanced interactive response: ${error.message}\n\nRaw result:\n${JSON.stringify(result, null, 2)}`;
    }
  }

  // PHASE 4.7: Handle validation tool calls
  async handleValidationToolCall(toolName, arguments_) {
    const startTime = Date.now();
    
    try {
      let result;
      
      switch (toolName) {
        case 'execute_api_with_validation':
          result = await this.enhancedApiExecutor.executeWithValidation(
            this.registry.getOperationDetails(arguments_.operationId),
            arguments_.parameters || {},
            this.config.apis || {},
            this.registry.getComponents(),
            { enableInteractiveCollection: arguments_.enableInteractiveCollection !== false }
          );
          break;
          
        case 'continue_api_execution':
          result = await this.enhancedApiExecutor.continueAfterUserInput(
            arguments_.sessionId,
            arguments_.collectionId,
            arguments_.userInput
          );
          break;
          
        case 'validate_request_body':
          const operationDetails = this.registry.getOperationDetails(arguments_.operationId);
          const components = this.registry.getComponents();
          
          result = await this.requestBodyValidator.validateRequestBody(
            arguments_.body,
            operationDetails,
            components
          );
          
          // Add additional metadata for MCP response
          result.operationId = arguments_.operationId;
          result.type = 'validation_result';
          break;
          
        default:
          throw new Error(`Unknown validation tool: ${toolName}`);
      }
      
      const duration = Date.now() - startTime;
      logger.mcpToolResponse(toolName, result.success !== false, duration);
      
      return {
        content: [
          {
            type: "text",
            text: this.formatValidationResponse(result, toolName)
          }
        ]
      };
      
    } catch (error) {
      const duration = Date.now() - startTime;
      logger.mcpToolResponse(toolName, false, duration);
      
      return {
        content: [
          {
            type: "text",
            text: `❌ Validation Tool Error: ${error.message}`
          }
        ],
        isError: true
      };
    }
  }

  // PHASE 4.9: Handle dynamic composition tool calls
  async handlePhase49ToolCall(toolName, arguments_) {
    const startTime = Date.now();
    
    try {
      let result;
      
      switch (toolName) {
        case 'compose_intelligent_workflow':
          result = await this.compositionCoordinator.composeWorkflow(
            arguments_.userRequest,
            arguments_.context || {},
            { innovationLevel: arguments_.innovationLevel || 'enhanced' }
          );
          break;
          
        case 'execute_dynamic_workflow':
          // PHASE 5: Pass JWT session context to dynamic workflow execution
          result = await this.dynamicExecutor.executeWorkflow(
            arguments_.workflowPlan,
            { 
              parameters: arguments_.parameters || {},
              enableLearning: arguments_.enableLearning !== false,
              sessionId: arguments_.sessionId || 'default_session',
              userId: arguments_.userId || 'default'
            }
          );
          
          // Learn from execution if enabled
          if (arguments_.enableLearning !== false && result.success) {
            await this.adaptiveLearner.learnFromExecution(arguments_.workflowPlan, result);
            
            // Auto-save innovative workflows to persistent storage
            if (this.isInnovativeWorkflow(arguments_.workflowPlan)) {
              try {
                // Ensure workflowPlan has all required properties
                const workflowToSave = {
                  id: arguments_.workflowPlan.id || `wf_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
                  name: arguments_.workflowPlan.name || 'Auto-saved Innovative Workflow',
                  description: arguments_.workflowPlan.description || 'Automatically saved innovative workflow from desktop execution',
                  steps: arguments_.workflowPlan.steps || [],
                  dataFlowMap: arguments_.workflowPlan.dataFlowMap || null,
                  executionResults: result,
                  metadata: {
                    autoSaved: true,
                    savedAt: new Date().toISOString(),
                    successfulExecution: true,
                    originalPlan: arguments_.workflowPlan
                  }
                };
                
                logger.debug('Attempting to auto-save workflow', {
                  workflowId: workflowToSave.id,
                  stepCount: workflowToSave.steps.length,
                  hasDataFlow: !!workflowToSave.dataFlowMap
                });
                
                const saveResult = await this.persistenceManager.saveInnovativeWorkflow(workflowToSave);
                
                logger.info('Innovative workflow auto-saved', {
                  workflowId: saveResult.workflowId,
                  success: saveResult.success,
                  location: saveResult.location
                });
              } catch (saveError) {
                logger.error('Failed to auto-save innovative workflow', {
                  error: saveError.message,
                  stack: saveError.stack,
                  workflowPlan: JSON.stringify(arguments_.workflowPlan, null, 2)
                });
              }
            }
          }
          break;
          
        case 'get_intelligent_workflow_recommendations':
          const recommendations = await this.innovationEngine.recommendInnovations(
            { userRequest: arguments_.userIntent, context: arguments_.context || {} },
            { includeInnovative: arguments_.includeInnovative !== false }
          );
          result = {
            success: true,
            recommendations,
            userIntent: arguments_.userIntent
          };
          break;
          
        case 'discover_workflow_innovations':
          const innovation = await this.innovationEngine.discoverInnovativeWorkflow(
            arguments_.problemDescription,
            { 
              creativityLevel: arguments_.creativityLevel || 0.7,
              domainHints: arguments_.domainHints || []
            }
          );
          result = {
            success: true,
            innovation,
            problemDescription: arguments_.problemDescription
          };
          break;
          
        case 'get_workflow_library':
          const library = await this.persistenceManager.getWorkflowLibrary({
            filterBy: arguments_.filterBy,
            sortBy: arguments_.sortBy || 'innovation',
            limit: arguments_.limit || 10
          });
          result = {
            success: true,
            library
          };
          break;
          
        case 'analyze_workflow_patterns':
          const patterns = await this.usageAnalytics.analyzePopularity({
            timeframe: arguments_.timeframe || '30d',
            includeRecommendations: arguments_.includeRecommendations !== false
          });
          result = {
            success: true,
            patterns,
            timeframe: arguments_.timeframe || '30d'
          };
          break;
          
        case 'save_workflow_innovation':
          const saveResult = await this.persistenceManager.saveInnovativeWorkflow({
            ...arguments_.workflow,
            metadata: arguments_.metadata || {}
          });
          result = {
            success: saveResult.success,
            workflowId: saveResult.workflowId,
            version: saveResult.version
          };
          break;
          
        case 'get_workflow_schema':
          // Generate schema documentation dynamically
          const operations = this.registry.getAllOperations();
          const operationsByDomain = {};
          
          // Group operations by domain
          for (const op of operations) {
            const domain = this.extractOperationDomain(op.operationId);
            if (!operationsByDomain[domain]) {
              operationsByDomain[domain] = [];
            }
            operationsByDomain[domain].push({
              id: op.operationId,
              description: op.description,
              parameters: op.parameters || {}
            });
          }
          
          // Filter by domain if requested
          const filteredOperations = arguments_.operationFilter
            ? { [arguments_.operationFilter]: operationsByDomain[arguments_.operationFilter] || [] }
            : operationsByDomain;
          
          result = {
            success: true,
            schema: {
              basic: {
                id: "string (optional, auto-generated)",
                name: "string (optional)",
                description: "string (optional)",
                steps: [{
                  id: "string (optional)",
                  operation: "string (required)",
                  parameters: "object (optional)",
                  order: "number (optional)",
                  dependencies: "array of step IDs (optional)"
                }],
                tags: "array of strings (optional)"
              },
              required: ["steps"],
              stepRequired: ["operation"]
            },
            operations: filteredOperations,
            operationCount: Object.values(filteredOperations).flat().length,
            examples: arguments_.includeExamples !== false ? this.getWorkflowExamples() : null
          };
          break;
          
        case 'save_workflow':
          // Prepare workflow with defaults if needed
          const workflowToSave = {
            id: arguments_.workflow.id || `wf_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
            name: arguments_.workflow.name || 'User Saved Workflow',
            description: arguments_.workflow.description || 'Workflow saved by user request',
            steps: arguments_.workflow.steps || [],
            tags: arguments_.tags || [],
            userSaved: true,
            savedAt: new Date().toISOString()
          };
          
          logger.info('User explicitly saving workflow', {
            workflowId: workflowToSave.id,
            stepCount: workflowToSave.steps.length,
            tags: workflowToSave.tags
          });
          
          const userSaveResult = await this.persistenceManager.saveInnovativeWorkflow({
            ...workflowToSave,
            metadata: {
              source: 'user_explicit_save',
              tags: arguments_.tags || []
            }
          });
          
          result = {
            success: userSaveResult.success,
            workflowId: userSaveResult.workflowId,
            version: userSaveResult.version,
            location: userSaveResult.location
          };
          break;
          
        case 'get_fusion_insights':
          const fusedResponse = await this.contextFusion.fuseResponses(
            arguments_.apiResponses,
            { fusionType: arguments_.fusionType || 'contextual' }
          );
          
          const formattedInsights = await this.adaptiveFormatter.formatResponse(
            fusedResponse,
            { format: arguments_.outputFormat || 'text' }
          );
          
          result = {
            success: true,
            insights: formattedInsights,
            fusionType: arguments_.fusionType || 'contextual',
            outputFormat: arguments_.outputFormat || 'text'
          };
          break;
          
        default:
          throw new Error(`Unknown Phase 4.9 tool: ${toolName}`);
      }
      
      const duration = Date.now() - startTime;
      logger.mcpToolResponse(toolName, result.success !== false, duration);
      
      return {
        content: [
          {
            type: "text",
            text: this.formatPhase49Response(result, toolName)
          }
        ]
      };
      
    } catch (error) {
      const duration = Date.now() - startTime;
      logger.mcpToolResponse(toolName, false, duration);
      
      return {
        content: [
          {
            type: "text",
            text: `❌ Phase 4.9 Tool Error: ${error.message}`
          }
        ],
        isError: true
      };
    }
  }

  // PHASE 4.9: Format Phase 4.9 tool responses
  formatPhase49Response(result, toolName) {
    try {
      switch (toolName) {
        case 'compose_intelligent_workflow':
          if (!result.success) {
            return `❌ **Workflow Composition Failed**\n\n${result.error}`;
          }
          
          const workflow = result.workflowPlan || result.workflow;
          return `🧠 **Intelligent Workflow Composed**\n\n` +
                 `**Workflow Name:** ${workflow.name || 'Untitled Workflow'}\n` +
                 `**Type:** ${workflow.type || 'dynamic'}\n` +
                 `**Steps:** ${workflow.steps?.length || 0}\n` +
                 `**Innovation Level:** ${result.innovationLevel || 'enhanced'}\n` +
                 `**Confidence:** ${Math.round((result.confidence || 0.8) * 100)}%\n\n` +
                 `**Description:** ${workflow.description || workflow.intent || 'AI-composed workflow'}\n\n` +
                 `**Workflow Steps:**\n${workflow.steps?.map((step, i) => 
                   `${i + 1}. ${step.operation || step.name || 'Unknown step'}`
                 ).join('\n') || 'No steps defined'}`;
          
        case 'execute_dynamic_workflow':
          if (!result.success) {
            return `❌ **Dynamic Workflow Execution Failed**\n\n${result.error}`;
          }
          
          return `🚀 **Dynamic Workflow Executed Successfully**\n\n` +
                 `**Execution ID:** ${result.executionId || 'N/A'}\n` +
                 `**Duration:** ${result.duration || 0}ms\n` +
                 `**Steps Completed:** ${result.completedSteps || 0}/${result.totalSteps || 0}\n` +
                 `**Data Flow Status:** ${result.dataFlowStatus || 'completed'}\n` +
                 `**Learning Enabled:** ${result.learningEnabled ? 'Yes' : 'No'}\n\n` +
                 `**Results Summary:**\n${JSON.stringify(result.summary || result.data, null, 2)}`;
          
        case 'get_intelligent_workflow_recommendations':
          if (result.recommendations.length === 0) {
            return `💡 **No Workflow Recommendations**\n\nNo intelligent recommendations found for: "${result.userIntent}"`;
          }
          
          return `💡 **Intelligent Workflow Recommendations** (${result.recommendations.length})\n\n` +
                 `**For Intent:** "${result.userIntent}"\n\n` +
                 result.recommendations.slice(0, 8).map((rec, i) => 
                   `**${i + 1}. ${rec.title || rec.type}**\n` +
                   `   Priority: ${rec.priority || 'medium'}\n` +
                   `   Description: ${rec.description}\n` +
                   `   Innovation Level: ${rec.innovationLevel || 'standard'}\n`
                 ).join('\n') +
                 (result.recommendations.length > 8 ? `\n...and ${result.recommendations.length - 8} more recommendations` : '');
          
        case 'discover_workflow_innovations':
          const innovation = result.innovation;
          if (!innovation || !innovation.workflow) {
            return `🔬 **No Innovations Discovered**\n\nNo innovative workflows found for: "${result.problemDescription}"`;
          }
          
          return `🔬 **Workflow Innovation Discovered**\n\n` +
                 `**Problem:** "${result.problemDescription}"\n\n` +
                 `**Innovation Metrics:**\n` +
                 `• Novelty: ${Math.round((innovation.innovation?.novelty || 0) * 100)}%\n` +
                 `• Value: ${Math.round((innovation.innovation?.value || 0) * 100)}%\n` +
                 `• Feasibility: ${Math.round((innovation.innovation?.feasibility || 0) * 100)}%\n` +
                 `• Overall Score: ${Math.round((innovation.innovation?.overall || 0) * 100)}%\n\n` +
                 `**Innovative Workflow:**\n` +
                 `Name: ${innovation.workflow.name || 'Innovative Solution'}\n` +
                 `Type: ${innovation.workflow.innovationType || 'novel'}\n` +
                 `Steps: ${innovation.workflow.steps?.length || 0}`;
          
        case 'get_workflow_library':
          const library = result.library;
          if (!library.workflows || library.workflows.length === 0) {
            return `📚 **Workflow Library Empty**\n\nNo workflows found matching your criteria.`;
          }
          
          return `📚 **Workflow Library** (${library.workflows.length}/${library.metadata.totalAvailable})\n\n` +
                 `**Total Innovations:** ${library.metadata.totalInnovations || 0}\n` +
                 `**Categories:** ${Object.keys(library.metadata.categories || {}).length}\n\n` +
                 `**Workflows:**\n` +
                 library.workflows.slice(0, 10).map((w, i) => 
                   `${i + 1}. **${w.name || 'Untitled'}**\n` +
                   `   Type: ${w.innovationType || 'standard'}\n` +
                   `   Innovation: ${Math.round((w.innovation?.overall || 0) * 100)}%\n` +
                   `   Steps: ${w.steps?.length || 0}\n`
                 ).join('\n') +
                 (library.workflows.length > 10 ? `\n...and ${library.workflows.length - 10} more workflows` : '');
          
        case 'analyze_workflow_patterns':
          const patterns = result.patterns;
          return `📊 **Workflow Pattern Analysis** (${result.timeframe})\n\n` +
                 `**Top Patterns:**\n${patterns.rankings?.slice(0, 5).map((pattern, i) => 
                   `${i + 1}. ${pattern.pattern || pattern.id}: ${pattern.usage || 0} uses`
                 ).join('\n') || 'No patterns found'}\n\n` +
                 `**Analysis Summary:**\n` +
                 `• Total Workflows: ${patterns.totalWorkflows || 0}\n` +
                 `• Success Rate: ${Math.round((patterns.averageSuccessRate || 0) * 100)}%\n` +
                 `• Avg Execution Time: ${patterns.averageExecutionTime || 0}ms`;
          
        case 'save_workflow_innovation':
          if (!result.success) {
            return `❌ **Failed to Save Innovation**\n\n${result.error}`;
          }
          
          return `💾 **Innovation Saved Successfully**\n\n` +
                 `**Workflow ID:** ${result.workflowId}\n` +
                 `**Version:** ${result.version}\n` +
                 `**Status:** Saved to persistent library\n\n` +
                 `The innovative workflow is now available for future reuse and learning.`;
          
        case 'save_workflow':
          if (!result.success) {
            return `❌ **Failed to Save Workflow**\n\n${result.error}`;
          }
          
          return `💾 **Workflow Saved Successfully**\n\n` +
                 `**Workflow ID:** ${result.workflowId}\n` +
                 `**Version:** ${result.version}\n` +
                 `**Location:** ${result.location}\n` +
                 `**Status:** Saved to persistent storage\n\n` +
                 `Your workflow has been saved and is available for future use. You can recall it using the workflow ID.`;
          
        case 'get_workflow_schema':
          if (!result.success) {
            return `❌ **Failed to Get Schema**\n\n${result.error}`;
          }
          
          let response = `📋 **Workflow Schema Documentation**\n\n`;
          
          // Schema section
          response += `**Basic Workflow Structure:**\n\`\`\`json\n${JSON.stringify(result.schema.basic, null, 2)}\n\`\`\`\n\n`;
          response += `**Required Fields:** ${result.schema.required.join(', ')}\n`;
          response += `**Required Step Fields:** ${result.schema.stepRequired.join(', ')}\n\n`;
          
          // Operations section
          response += `**Available Operations (${result.operationCount} total):**\n`;
          for (const [domain, ops] of Object.entries(result.operations)) {
            response += `\n📁 **${domain.charAt(0).toUpperCase() + domain.slice(1)} APIs:**\n`;
            for (const op of ops) {
              response += `• \`${op.id}\` - ${op.description}\n`;
            }
          }
          
          // Examples section
          if (result.examples) {
            response += `\n**Example Workflows:**\n`;
            for (const example of result.examples) {
              response += `\n🔹 **${example.name}**\n`;
              response += `${example.description}\n`;
              response += `\`\`\`json\n${JSON.stringify(example.workflow, null, 2)}\n\`\`\`\n`;
            }
          }
          
          return response;
          
        case 'get_fusion_insights':
          if (!result.success) {
            return `❌ **Fusion Failed**\n\n${result.error}`;
          }
          
          return `🧩 **Data Fusion Insights**\n\n` +
                 `**Fusion Type:** ${result.fusionType}\n` +
                 `**Output Format:** ${result.outputFormat}\n` +
                 `**Sources:** ${result.sourceCount || 'Multiple'} API responses\n\n` +
                 `**Fused Insights:**\n${result.insights}`;
          
        default:
          return `Phase 4.9 tool '${toolName}' completed successfully\n\n${JSON.stringify(result, null, 2)}`;
      }
      
    } catch (error) {
      return `Error formatting Phase 4.9 response: ${error.message}\n\nRaw result:\n${JSON.stringify(result, null, 2)}`;
    }
  }

  // PHASE 4.7: Format validation tool responses
  formatValidationResponse(result, toolName) {
    try {
      switch (toolName) {
        case 'execute_api_with_validation':
          if (result.requiresUserInput) {
            return `💬 **Parameter Collection Required**\n\n` +
                   `**Session ID:** ${result.sessionId}\n` +
                   `**Collection ID:** ${result.collectionId}\n` +
                   `**Current Field:** ${result.currentField}\n\n` +
                   `**Prompt:**\n${result.message}\n\n` +
                   `*Use the continue_api_execution tool with your input to proceed.*`;
          } else if (result.success && result.type === 'execution_success') {
            return `✅ **API Execution Successful**\n\n` +
                   `**Operation:** ${result.operationId || 'Unknown'}\n` +
                   `**Attempts:** ${result.attempts}\n` +
                   `**Duration:** ${result.duration || 0}ms\n\n` +
                   `**Result:**\n${JSON.stringify(result.data, null, 2)}`;
          } else {
            return `❌ **API Execution Failed**\n\n` +
                   `**Error:** ${result.error}\n` +
                   `**Type:** ${result.type}`;
          }
          
        case 'continue_api_execution':
          if (result.requiresUserInput) {
            return `💬 **Additional Input Required**\n\n` +
                   `**Session ID:** ${result.sessionId}\n` +
                   `**Collection ID:** ${result.collectionId}\n` +
                   `**Current Field:** ${result.currentField}\n` +
                   `**Attempts:** ${result.attempts}\n\n` +
                   `**Message:**\n${result.message}\n\n` +
                   `${result.error ? `**Previous Error:** ${result.error}\n\n` : ''}` +
                   `*Please provide the correct information.*`;
          } else if (result.success && result.type === 'execution_success') {
            return `✅ **API Execution Completed**\n\n` +
                   `**Total Attempts:** ${result.attempts}\n` +
                   `**Duration:** ${result.duration || 0}ms\n\n` +
                   `**Final Result:**\n${JSON.stringify(result.data, null, 2)}`;
          } else {
            return `❌ **Execution Failed**\n\n` +
                   `**Error:** ${result.error}\n` +
                   `**Attempts:** ${result.attempts}`;
          }
          
        case 'validate_request_body':
          if (result.valid) {
            return `✅ **Request Body Valid**\n\n` +
                   `**Operation:** ${result.operationId}\n` +
                   `**Status:** All validation checks passed\n` +
                   `${result.warnings && result.warnings.length > 0 ? 
                     `**Warnings:** ${result.warnings.length}\n${result.warnings.map(w => `• ${w}`).join('\n')}` : 
                     '**No warnings**'}`;
          } else {
            const errorCount = result.errors?.length || 0;
            const missingCount = result.missingFields?.length || 0;
            
            return `❌ **Request Body Validation Failed**\n\n` +
                   `**Operation:** ${result.operationId}\n` +
                   `**Errors:** ${errorCount}\n` +
                   `**Missing Fields:** ${missingCount}\n\n` +
                   `${result.missingFields && result.missingFields.length > 0 ? 
                     `**Missing Required Fields:**\n${result.missingFields.map(f => `• ${f}`).join('\n')}\n\n` : ''}` +
                   `${result.errors && result.errors.length > 0 ? 
                     `**Validation Errors:**\n${result.errors.slice(0, 10).map(e => `• ${e}`).join('\n')}` + 
                     (result.errors.length > 10 ? `\n• ...and ${result.errors.length - 10} more errors` : '') : ''}`;
          }
          
        default:
          return `Validation tool '${toolName}' completed\n\n${JSON.stringify(result, null, 2)}`;
      }
      
    } catch (error) {
      return `Error formatting validation response: ${error.message}\n\nRaw result:\n${JSON.stringify(result, null, 2)}`;
    }
  }

  // PHASE 5: Handle JWT management tool calls
  async handleJWTToolCall(toolName, arguments_) {
    const startTime = Date.now();
    
    try {
      let result;
      
      switch (toolName) {
        case 'check_jwt_status':
          const sessionId = arguments_.sessionId || 'default_session';
          const userId = arguments_.userId || 'default';
          
          // Check if session has valid JWT token
          try {
            const validToken = await this.executor.jwtSessionManager.getValidToken(sessionId, userId);
            const hasValidToken = !!validToken;
            
            result = {
              success: true,
              sessionId: sessionId,
              userId: userId, 
              hasValidToken: hasValidToken,
              tokenStatus: hasValidToken ? 'valid' : 'missing_or_expired',
              timestamp: new Date().toISOString()
            };
          } catch (error) {
            result = {
              success: true,
              sessionId: sessionId,
              userId: userId,
              hasValidToken: false,
              tokenStatus: 'error',
              error: error.message,
              timestamp: new Date().toISOString()
            };
          }
          break;
          
        case 'provide_jwt_token':
          if (!arguments_.promptId || !arguments_.jwtToken) {
            result = {
              success: false,
              error: 'Both promptId and jwtToken are required'
            };
            break;
          }
          
          try {
            // PHASE 5 FIX: Use JWT Session Manager to resolve prompts
            const completedSessionId = await this.executor.jwtSessionManager.provideTokenByPromptId(
              arguments_.promptId, 
              arguments_.jwtToken
            );
            
            // Also complete in prompt manager for tracking
            this.jwtPromptManager.completePrompt(arguments_.promptId, arguments_.jwtToken);
            
            result = {
              success: true,
              promptId: arguments_.promptId,
              sessionId: completedSessionId,
              status: 'token_provided',
              message: 'JWT token provided successfully. Operations can now continue.',
              timestamp: new Date().toISOString()
            };
          } catch (error) {
            result = {
              success: false,
              error: `Failed to provide JWT token: ${error.message}`,
              promptId: arguments_.promptId
            };
          }
          break;
          
        case 'get_jwt_prompts':
          const sessionIdForPrompts = arguments_.sessionId || 'default_session';
          
          try {
            const pendingPrompts = this.jwtPromptManager.getPendingPrompts(sessionIdForPrompts);
            const stats = this.jwtPromptManager.getStats();
            
            result = {
              success: true,
              sessionId: sessionIdForPrompts,
              pendingPrompts: pendingPrompts,
              promptCount: pendingPrompts.length,
              totalPrompts: stats.totalPrompts,
              timestamp: new Date().toISOString()
            };
          } catch (error) {
            result = {
              success: false,
              error: `Failed to get JWT prompts: ${error.message}`,
              sessionId: sessionIdForPrompts
            };
          }
          break;
          
        default:
          throw new Error(`Unknown JWT tool: ${toolName}`);
      }
      
      const duration = Date.now() - startTime;
      logger.mcpToolResponse(toolName, result.success !== false, duration);
      
      return {
        content: [
          {
            type: "text",
            text: this.formatJWTResponse(result, toolName)
          }
        ]
      };
      
    } catch (error) {
      const duration = Date.now() - startTime;
      logger.mcpToolResponse(toolName, false, duration);
      
      return {
        content: [
          {
            type: "text",
            text: `❌ JWT Tool Error: ${error.message}`
          }
        ],
        isError: true
      };
    }
  }

  // PHASE 5: Format JWT tool responses
  formatJWTResponse(result, toolName) {
    try {
      switch (toolName) {
        case 'check_jwt_status':
          const statusIcon = result.hasValidToken ? '✅' : '⚠️';
          return `${statusIcon} **JWT Token Status**\n\n` +
                 `**Session:** ${result.sessionId}\n` +
                 `**User:** ${result.userId}\n` +
                 `**Status:** ${result.tokenStatus}\n` +
                 `**Has Valid Token:** ${result.hasValidToken ? 'Yes' : 'No'}\n` +
                 `${result.error ? `**Error:** ${result.error}\n` : ''}` +
                 `**Checked:** ${result.timestamp}`;
          
        case 'provide_jwt_token':
          if (!result.success) {
            return `❌ **Failed to Provide JWT Token**\n\n${result.error}`;
          }
          
          return `✅ **JWT Token Provided Successfully**\n\n` +
                 `**Prompt ID:** ${result.promptId}\n` +
                 `**Session:** ${result.sessionId}\n` +
                 `**Status:** ${result.status}\n\n` +
                 `${result.message}`;
          
        case 'get_jwt_prompts':
          if (!result.success) {
            return `❌ **Failed to Get JWT Prompts**\n\n${result.error}`;
          }
          
          if (result.promptCount === 0) {
            return `💡 **No Pending JWT Prompts**\n\n` +
                   `**Session:** ${result.sessionId}\n` +
                   `**Status:** No JWT tokens are currently being requested.`;
          }
          
          return `🔑 **Pending JWT Prompts** (${result.promptCount})\n\n` +
                 `**Session:** ${result.sessionId}\n` +
                 `**Total Active Prompts:** ${result.totalPrompts}\n\n` +
                 `**Pending Requests:**\n` +
                 result.pendingPrompts.map((prompt, i) => 
                   `${i + 1}. **Prompt ID:** ${prompt.promptId}\n` +
                   `   **Operation:** ${prompt.operation}\n` +
                   `   **Message:** ${prompt.message}\n` +
                   `   **Requested:** ${prompt.timestamp}\n`
                 ).join('\n') + 
                 `\n*Use provide_jwt_token with the prompt ID and your JWT token to continue.*`;
          
        default:
          return `JWT tool '${toolName}' completed\n\n${JSON.stringify(result, null, 2)}`;
      }
      
    } catch (error) {
      return `Error formatting JWT response: ${error.message}\n\nRaw result:\n${JSON.stringify(result, null, 2)}`;
    }
  }

  // PHASE 4.2: Handle Maybank interactive tool calls
  async handleMaybankInteractiveTool(arguments_) {
    const startTime = Date.now();
    
    try {
      // Execute the Maybank interactive tool
      const result = await this.maybankInteractiveTool.execute(arguments_);
      
      const duration = Date.now() - startTime;
      logger.mcpToolResponse('maybank_interactive', !result.isError, duration);
      
      // Return the result directly as it's already formatted by the tool
      return result;
      
    } catch (error) {
      const duration = Date.now() - startTime;
      logger.mcpToolResponse('maybank_interactive', false, duration);
      logger.error('Maybank interactive tool call failed', { 
        error: error.message,
        duration: `${duration}ms`
      });
      
      return {
        content: [
          {
            type: "text",
            text: `❌ Maybank Interactive Error\n\n${error.message}`
          }
        ],
        isError: true
      };
    }
  }

  formatSuccessResponse(result, operationDetails) {
    if (operationDetails.operationId === 'getCurrentWeather') {
      return this.formatWeatherResponse(result.data);
    }
    
    // Generic formatting for other operations
    return `Operation ${operationDetails.operationId} completed successfully.\n\nResult:\n${JSON.stringify(result.data, null, 2)}`;
  }

  formatWeatherResponse(weatherData) {
    try {
      const parts = [];
      
      // Header
      parts.push(`🌤️ Current Weather for ${weatherData.location}`);
      
      if (weatherData.country && weatherData.country !== 'Unknown') {
        parts[0] += `, ${weatherData.country}`;
      }
      
      parts.push(''); // Empty line
      
      // Current conditions
      if (weatherData.weather) {
        parts.push(`Condition: ${weatherData.weather.description}`);
      }
      
      // Temperature info
      if (weatherData.temperature) {
        const temp = weatherData.temperature;
        parts.push(`Temperature: ${temp.current}°C (feels like ${temp.feels_like}°C)`);
        
        if (temp.min !== undefined && temp.max !== undefined) {
          parts.push(`Range: ${temp.min}°C to ${temp.max}°C`);
        }
      }
      
      // Atmospheric conditions
      if (weatherData.atmospheric) {
        const atm = weatherData.atmospheric;
        const atmParts = [];
        
        if (atm.humidity) atmParts.push(`Humidity: ${atm.humidity}%`);
        if (atm.pressure) atmParts.push(`Pressure: ${atm.pressure} hPa`);
        
        if (atmParts.length > 0) {
          parts.push(atmParts.join(', '));
        }
      }
      
      // Wind information
      if (weatherData.wind && Object.keys(weatherData.wind).length > 0) {
        const windParts = [];
        if (weatherData.wind.speed) windParts.push(`Speed: ${weatherData.wind.speed} m/s`);
        if (weatherData.wind.deg) windParts.push(`Direction: ${weatherData.wind.deg}°`);
        
        if (windParts.length > 0) {
          parts.push(`Wind: ${windParts.join(', ')}`);
        }
      }
      
      // Coordinates
      if (weatherData.coordinates) {
        parts.push(''); // Empty line
        parts.push(`📍 Location: ${weatherData.coordinates.latitude}°N, ${weatherData.coordinates.longitude}°E`);
      }
      
      return parts.join('\n');
      
    } catch (error) {
      logger.warn('Weather response formatting failed, using fallback', { error: error.message });
      return `Weather data for ${weatherData.location || 'Unknown location'}:\n\n${JSON.stringify(weatherData, null, 2)}`;
    }
  }

  formatErrorResponse(result, operationDetails) {
    const errorMsg = result.error || 'Unknown error occurred';
    const operationName = operationDetails.summary || operationDetails.operationId;
    
    return `❌ ${operationName} failed: ${errorMsg}`;
  }

  setupErrorHandlers() {
    // Handle uncaught exceptions
    process.on('uncaughtException', (error) => {
      logger.error('Uncaught exception', { error: error.message, stack: error.stack });
      process.exit(1);
    });
    
    // Handle unhandled promise rejections
    process.on('unhandledRejection', (reason) => {
      logger.error('Unhandled promise rejection', { reason: reason?.message || reason });
      process.exit(1);
    });
    
    // Handle graceful shutdown
    process.on('SIGINT', () => {
      logger.info('Received SIGINT, shutting down gracefully...');
      this.shutdown();
    });
    
    process.on('SIGTERM', () => {
      logger.info('Received SIGTERM, shutting down gracefully...');
      this.shutdown();
    });
  }

  validateComponents() {
    if (!this.registry || !this.registry.initialized) {
      throw new Error('Registry not properly initialized');
    }
    
    if (!this.executor) {
      throw new Error('Executor not initialized');
    }
    
    if (!this.intentParser) {
      throw new Error('Intent parser not initialized');
    }
    
    const executorStatus = this.executor.getStatus();
    if (!executorStatus.registryInitialized || !executorStatus.authConfigured) {
      throw new Error('Executor not properly configured');
    }
    
    logger.info('All components validated successfully');
  }

  async start() {
    try {
      if (!this.initialized) {
        await this.initialize();
      }
      
      logger.serverStart();
      
      // Start MCP server with stdio transport
      const transport = new StdioServerTransport();
      await this.server.connect(transport);
      
      logger.info('MCP Gateway Server is running and ready to accept connections');
      
    } catch (error) {
      logger.error('Failed to start server', { error: error.message });
      throw new Error(`Server startup failed: ${error.message}`);
    }
  }

  shutdown() {
    try {
      logger.serverStop();
      process.exit(0);
    } catch (error) {
      logger.error('Error during shutdown', { error: error.message });
      process.exit(1);
    }
  }

  // Utility methods for debugging
  getStatus() {
    return {
      initialized: this.initialized,
      registry: this.registry?.initialized || false,
      operations: this.registry?.operations?.size || 0,
      executor: !!this.executor,
      intentParser: !!this.intentParser,
      config: !!this.config
    };
  }
}

// Main execution
async function main() {
  try {
    const server = new MCPGatewayServer();
    await server.start();
  } catch (error) {
    logger.error('Failed to start MCP Gateway Server', { error: error.message });
    process.exit(1);
  }
}

// Start the server if this file is run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    console.error('Fatal error:', error.message);
    process.exit(1);
  });
}

export { MCPGatewayServer };