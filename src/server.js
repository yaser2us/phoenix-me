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
import { Validators } from './utils/validators.js';
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
        const tool = this.createToolFromOperation(operationDetails);
        logger.debug('Created tool', { toolName: tool.name });
        tools.push(tool);
        
        logger.debug('Created MCP tool', { 
          toolName: tool.name, 
          operationId: operation.operationId 
        });
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
        description: "Execute a predefined workflow by name with parameters",
        inputSchema: {
          type: "object",
          properties: {
            workflowName: {
              type: "string",
              description: "Name of the workflow to execute (e.g., location_weather, trip_planning, market_overview)"
            },
            parameters: {
              type: "object",
              description: "Parameters for the workflow execution",
              additionalProperties: true
            }
          },
          required: ["workflowName"]
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

  // PHASE 3: Handle workflow tool calls
  async handleWorkflowToolCall(toolName, arguments_) {
    const startTime = Date.now();
    
    try {
      let result;
      
      switch (toolName) {
        case 'execute_workflow':
          result = await this.workflowEngine.executeWorkflow(
            arguments_.workflowName, 
            arguments_.parameters || {}
          );
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
          const workflows = this.workflowEngine.getAllWorkflows();
          result = {
            success: true,
            data: {
              workflows: workflows,
              totalCount: workflows.length
            }
          };
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
          if (result.partialSuccess) {
            return `🔄 Workflow '${result.workflowName}' completed with partial success\n\n` +
                   `Executed ${result.metadata.executedSteps}/${result.metadata.totalSteps} steps\n` +
                   `Duration: ${result.duration}ms\n\n` +
                   `Warning: ${result.error}\n\n` +
                   `Results:\n${JSON.stringify(result.data, null, 2)}`;
          } else {
            return `✅ Workflow '${result.workflowName}' completed successfully\n\n` +
                   `Executed ${result.metadata.executedSteps}/${result.metadata.totalSteps} steps\n` +
                   `Duration: ${result.duration}ms\n\n` +
                   `Results:\n${JSON.stringify(result.data, null, 2)}`;
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
          const workflows = result.data.workflows;
          return `📚 Available Workflows (${workflows.length})\n\n` +
                 workflows.map(w => 
                   `• ${w.displayName}\n  Steps: ${w.stepCount}, Est. Time: ${w.estimatedTime}ms\n  ${w.description}`
                 ).join('\n\n');
          
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
                 `Executed ${result.metadata.executedSteps}/${result.metadata.totalSteps} steps\n` +
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
      const tool = this.createToolFromOperation(operationDetails);
      const validation = Validators.validateToolArguments(arguments_, tool.inputSchema);
      
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