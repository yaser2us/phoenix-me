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
import { initializeConfig, config } from './config/server-config.js';
import { logger } from './utils/logger.js';
import { Validators } from './utils/validators.js';

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
    this.config = null;
    this.initialized = false;
    this.mcpTools = [];
    
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
      
      // 4. Register MCP tools dynamically
      await this.setupMCPTools();
      
      // 5. Set up error handlers
      this.setupErrorHandlers();
      
      // 6. Validate all components work
      this.validateComponents();
      
      this.initialized = true;
      logger.info('MCP Gateway Server initialized successfully');
      
    } catch (error) {
      logger.error('Failed to initialize MCP Gateway Server', { error: error.message });
      throw new Error(`Server initialization failed: ${error.message}`);
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
      
      // Store tools for the handlers (set up in constructor)
      this.mcpTools = tools;
      logger.info('Tools populated for MCP handlers', { count: tools.length });
      
      logger.debug('Set up MCP request handlers');
      
      logger.info(`Set up ${operations.length} MCP tools`);
      
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

  async handleToolCall(toolName, arguments_) {
    const startTime = Date.now();
    
    try {
      logger.mcpToolCall(toolName, arguments_);
      
      // 1. Map tool name to operation
      const operationId = toolName; // For Phase 1, tool name = operation ID
      const operationDetails = this.registry.getOperationDetails(operationId);
      
      if (!operationDetails) {
        throw new Error(`Operation '${operationId}' not found`);
      }
      
      // 2. Validate input arguments
      const tool = this.createToolFromOperation(operationDetails);
      const validation = Validators.validateToolArguments(arguments_, tool.inputSchema);
      
      if (!validation.valid) {
        throw new Error(`Argument validation failed: ${validation.errors.join(', ')}`);
      }
      
      // 3. Execute operation via executor
      const result = await this.executor.executeOperation(operationId, arguments_);
      
      const duration = Date.now() - startTime;
      
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
    process.on('unhandledRejection', (reason, promise) => {
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