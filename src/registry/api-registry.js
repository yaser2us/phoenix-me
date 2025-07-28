import { promises as fs } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export class ApiRegistry {
  constructor() {
    this.specs = new Map();           // Map<string, OpenAPISpec>
    this.operations = new Map();      // Map<operationId, OperationDetails>
    this.initialized = false;
  }

  async initialize() {
    try {
      const specsPath = join(__dirname, 'specs');
      const specs = await this.loadSpecsFromDirectory(specsPath);
      
      for (const spec of specs) {
        this.registerSpec(spec.name, spec.content);
      }
      
      this.initialized = true;
      console.error(`ApiRegistry initialized with ${this.specs.size} specs and ${this.operations.size} operations`);
    } catch (error) {
      throw new Error(`Failed to initialize ApiRegistry: ${error.message}`);
    }
  }

  async loadSpecsFromDirectory(specsPath) {
    try {
      const files = await fs.readdir(specsPath);
      const jsonFiles = files.filter(file => file.endsWith('.json'));
      const specs = [];

      for (const file of jsonFiles) {
        try {
          const filePath = join(specsPath, file);
          const fileContent = await fs.readFile(filePath, 'utf8');
          const spec = JSON.parse(fileContent);
          
          // Validate the spec before adding
          this.validateSpec(spec);
          
          specs.push({
            name: file.replace('.json', ''),
            content: spec
          });
        } catch (error) {
          if (error.code === 'ENOENT') {
            throw new Error(`OpenAPI spec file not found: ${file}`);
          } else if (error.code === 'EACCES') {
            throw new Error(`Permission denied reading spec file: ${file}`);
          } else if (error.name === 'SyntaxError') {
            throw new Error(`Invalid JSON format in spec file ${file}: ${error.message}`);
          } else {
            throw new Error(`Failed to read spec file ${file}: ${error.message}`);
          }
        }
      }

      if (specs.length === 0) {
        throw new Error(`No valid OpenAPI specs found in ${specsPath}`);
      }

      return specs;
    } catch (error) {
      if (error.code === 'ENOENT') {
        throw new Error(`Specs directory not found: ${specsPath}`);
      } else if (error.code === 'EACCES') {
        throw new Error(`Permission denied accessing specs directory: ${specsPath}`);
      } else {
        throw error;
      }
    }
  }

  registerSpec(specName, openApiSpec) {
    try {
      // Validate spec structure
      this.validateSpec(openApiSpec);
      
      // Store spec
      this.specs.set(specName, openApiSpec);
      
      // Extract and register all operations from paths
      if (openApiSpec.paths) {
        for (const [path, pathObj] of Object.entries(openApiSpec.paths)) {
          for (const [method, operation] of Object.entries(pathObj)) {
            if (operation.operationId) {
              const operationDetails = {
                operationId: operation.operationId,
                method: method.toUpperCase(),
                path: path,
                summary: operation.summary || '',
                description: operation.description || '',
                parameters: operation.parameters || [],
                responses: operation.responses || {},
                spec: openApiSpec,
                specName: specName,
                servers: openApiSpec.servers || [],
                security: operation.security || openApiSpec.security || []
              };
              
              this.operations.set(operation.operationId, operationDetails);
            }
          }
        }
      }
      
      console.error(`Registered spec '${specName}' with ${Object.keys(openApiSpec.paths || {}).length} paths`);
    } catch (error) {
      throw new Error(`Failed to register spec '${specName}': ${error.message}`);
    }
  }

  findOperationByIntent(userIntent) {
    if (!this.initialized) {
      throw new Error('ApiRegistry not initialized');
    }
    
    try {
      const normalizedIntent = this.normalizeIntent(userIntent);
      
      // Simple keyword matching for Phase 1
      const weatherKeywords = ['weather', 'temperature', 'temp', 'climate', 'forecast'];
      
      // Check if intent contains weather-related keywords
      const hasWeatherKeyword = weatherKeywords.some(keyword => 
        normalizedIntent.includes(keyword)
      );
      
      if (hasWeatherKeyword) {
        // Look for weather operation
        for (const [operationId, details] of this.operations.entries()) {
          if (details.summary.toLowerCase().includes('weather') || 
              details.description.toLowerCase().includes('weather') ||
              operationId.toLowerCase().includes('weather')) {
            return operationId;
          }
        }
      }
      
      // If no specific match found, return null
      return null;
    } catch (error) {
      throw new Error(`Failed to find operation for intent '${userIntent}': ${error.message}`);
    }
  }

  getOperationDetails(operationId) {
    if (!this.initialized) {
      throw new Error('ApiRegistry not initialized');
    }
    
    const operation = this.operations.get(operationId);
    if (!operation) {
      throw new Error(`Operation '${operationId}' not found`);
    }
    
    return operation;
  }

  getAllOperations() {
    if (!this.initialized) {
      throw new Error('ApiRegistry not initialized');
    }
    
    return Array.from(this.operations.values()).map(op => ({
      operationId: op.operationId,
      method: op.method,
      path: op.path,
      summary: op.summary,
      description: op.description,
      specName: op.specName
    }));
  }

  validateSpec(openApiSpec) {
    // Check required OpenAPI fields
    if (!openApiSpec.openapi) {
      throw new Error('Missing required field: openapi');
    }
    
    if (!openApiSpec.info) {
      throw new Error('Missing required field: info');
    }
    
    if (!openApiSpec.info.title) {
      throw new Error('Missing required field: info.title');
    }
    
    if (!openApiSpec.info.version) {
      throw new Error('Missing required field: info.version');
    }
    
    // Validate paths structure
    if (openApiSpec.paths) {
      for (const [path, pathObj] of Object.entries(openApiSpec.paths)) {
        if (typeof pathObj !== 'object' || pathObj === null) {
          throw new Error(`Invalid path object for path '${path}'`);
        }
        
        // Validate operation definitions
        for (const [method, operation] of Object.entries(pathObj)) {
          const validMethods = ['get', 'post', 'put', 'delete', 'patch', 'head', 'options', 'trace'];
          if (!validMethods.includes(method.toLowerCase())) {
            continue; // Skip non-HTTP method properties
          }
          
          if (typeof operation !== 'object' || operation === null) {
            throw new Error(`Invalid operation object for ${method.toUpperCase()} ${path}`);
          }
          
          if (!operation.operationId) {
            throw new Error(`Missing operationId for ${method.toUpperCase()} ${path}`);
          }
        }
      }
    }
    
    return { valid: true, errors: [] };
  }

  normalizeIntent(userIntent) {
    return userIntent
      .toLowerCase()
      .trim()
      .replace(/[^\w\s]/g, ' ')  // Replace non-word chars with spaces
      .replace(/\s+/g, ' ')      // Collapse multiple spaces
      .trim();
  }
}