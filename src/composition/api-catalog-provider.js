import { logger } from '../utils/logger.js';

/**
 * API Catalog Provider - Phase 4.9 Checkpoint 1
 * Provides API capabilities information to Claude for intelligent workflow composition
 */
export class ApiCatalogProvider {
  constructor(registry) {
    this.registry = registry;
    this.capabilities = null;
    logger.info('API Catalog Provider initialized');
  }

  /**
   * Get comprehensive API capabilities catalog
   */
  async getApiCapabilities() {
    try {
      if (!this.capabilities) {
        await this.buildCapabilitiesCatalog();
      }
      return this.capabilities;
    } catch (error) {
      logger.error('Failed to get API capabilities', { error: error.message });
      throw error;
    }
  }

  /**
   * Build capabilities catalog from registry
   */
  async buildCapabilitiesCatalog() {
    try {
      const operations = this.registry.getAllOperations();
      const domains = new Set();
      const capabilities = {
        domains: [],
        operations: [],
        totalOperations: operations.length,
        lastUpdated: new Date().toISOString()
      };

      // Process each operation
      for (const operation of operations) {  
        const domain = this.extractDomain(operation.operationId);
        domains.add(domain);

        const operationInfo = {
          id: operation.operationId,
          domain: domain,
          method: operation.method,
          path: operation.path,
          description: operation.description || operation.summary || `${operation.method} ${operation.path}`,
          parameters: this.extractParameters(operation),
          responseType: this.extractResponseType(operation),
          complexity: this.assessComplexity(operation),
          tags: operation.tags || [domain]
        };

        capabilities.operations.push(operationInfo);
      }

      // Build domain summary
      capabilities.domains = Array.from(domains).map(domain => ({
        name: domain,
        operationCount: capabilities.operations.filter(op => op.domain === domain).length,
        operations: capabilities.operations.filter(op => op.domain === domain).map(op => ({
          id: op.id,
          description: op.description,
          method: op.method
        }))
      }));

      this.capabilities = capabilities;
      
      logger.info('API capabilities catalog built', {
        domains: capabilities.domains.length,
        operations: capabilities.operations.length
      });

    } catch (error) {
      logger.error('Failed to build capabilities catalog', { error: error.message });
      throw error;
    }
  }

  /**
   * Get capabilities for specific domain
   */
  async getDomainCapabilities(domainName) {
    try {
      const catalog = await this.getApiCapabilities();
      const domain = catalog.domains.find(d => d.name.toLowerCase() === domainName.toLowerCase());
      
      if (!domain) {
        return { operations: [] };
      }

      const operations = catalog.operations.filter(op => op.domain.toLowerCase() === domainName.toLowerCase());
      
      return {
        domain: domain.name,
        operationCount: operations.length,
        operations: operations
      };
    } catch (error) {
      logger.error('Failed to get domain capabilities', { domain: domainName, error: error.message });
      throw error;
    }
  }

  /**
   * Generate Claude-friendly summary of API capabilities
   */
  async generateClaudeSummary() {
    try {
      const catalog = await this.getApiCapabilities();
      
      let summary = `# Phoenix-ME API Capabilities\n\n`;
      summary += `Total APIs: ${catalog.totalOperations} operations across ${catalog.domains.length} domains\n\n`;
      
      // Domain overview
      summary += `## Available Domains:\n`;
      for (const domain of catalog.domains) {
        summary += `- **${domain.name}**: ${domain.operationCount} operations\n`;
      }
      summary += `\n`;
      
      // Detailed operations by domain
      for (const domain of catalog.domains) {
        summary += `## ${domain.name.toUpperCase()} Domain Operations:\n`;
        
        const domainOps = catalog.operations.filter(op => op.domain === domain.name);
        for (const op of domainOps) {
          summary += `- **${op.id}**: ${op.description}\n`;
          summary += `  - Method: ${op.method}\n`;
          summary += `  - Parameters: ${op.parameters.required.length} required, ${op.parameters.optional.length} optional\n`;
          if (op.parameters.required.length > 0) {
            summary += `  - Required params: ${op.parameters.required.join(', ')}\n`;
          }
          summary += `\n`;
        }
      }
      
      // Usage guidelines
      summary += `## Composition Guidelines:\n`;
      summary += `- Banking operations require JWT token authentication\n`;
      summary += `- Weather operations require location parameter (city)\n`;
      summary += `- Currency operations can be combined with any financial data\n`;
      summary += `- News operations provide context for financial decisions\n`;
      summary += `- Payment operations handle bill payments and transfers\n\n`;
      
      summary += `## Data Flow Capabilities:\n`;
      summary += `- Account balance → Currency conversion\n`;
      summary += `- Weather data → Spending pattern analysis\n`;
      summary += `- Transaction history → Budget recommendations\n`;
      summary += `- Goals data → Progress tracking\n\n`;
      
      return summary;
      
    } catch (error) {
      logger.error('Failed to generate Claude summary', { error: error.message });
      throw error;
    }
  }

  /**
   * Extract domain from operation ID
   */
  extractDomain(operationId) {
    // Handle different operation ID formats
    if (operationId.includes('_')) {
      const parts = operationId.split('_');
      if (parts.length >= 2) {
        return parts[1]; // e.g., 'get_banking_balance' → 'banking'
      }
    }
    
    // Handle camelCase operation IDs by mapping to domains
    const lowerOp = operationId.toLowerCase();
    if (lowerOp.includes('weather')) return 'weather';
    if (lowerOp.includes('currency') || lowerOp.includes('exchange')) return 'currency';
    if (lowerOp.includes('banking') || lowerOp.includes('balance') || lowerOp.includes('account')) return 'banking';
    if (lowerOp.includes('payment') || lowerOp.includes('pay')) return 'payment';
    if (lowerOp.includes('bill')) return 'bill';
    if (lowerOp.includes('news')) return 'news';
    if (lowerOp.includes('goal')) return 'goal';
    if (lowerOp.includes('expense')) return 'expense';
    
    return 'unknown';
  }

  /**
   * Extract parameters from operation
   */
  extractParameters(operation) {
    const required = [];
    const optional = [];
    const parameters = operation.parameters || [];

    for (const param of parameters) {
      if (param.required) {
        required.push(param.name);
      } else {
        optional.push(param.name);
      }
    }

    return { required, optional };
  }

  /**
   * Extract response type from operation
   */
  extractResponseType(operation) {
    if (operation.responses && operation.responses['200']) {
      const response = operation.responses['200'];
      if (response.content && response.content['application/json']) {
        return 'json';
      }
    }
    return 'unknown';
  }

  /**
   * Assess operation complexity
   */
  assessComplexity(operation) {
    const paramCount = (operation.parameters || []).length;
    const hasAuth = operation.security && operation.security.length > 0;
    
    let score = 1;
    if (paramCount > 3) score += 1;
    if (hasAuth) score += 1;
    if (operation.method === 'POST') score += 1;
    
    if (score >= 4) return 'high';
    if (score >= 2) return 'medium';
    return 'low';
  }

  /**
   * Find operations by capability
   */
  async findOperationsByCapability(capability) {
    try {
      const catalog = await this.getApiCapabilities();
      const matchingOps = catalog.operations.filter(op => 
        op.description.toLowerCase().includes(capability.toLowerCase()) ||
        op.tags.some(tag => tag.toLowerCase().includes(capability.toLowerCase()))
      );
      
      return matchingOps;
    } catch (error) {
      logger.error('Failed to find operations by capability', { capability, error: error.message });
      return [];
    }
  }

  /**
   * Get operation compatibility matrix
   */
  async getCompatibilityMatrix() {
    try {
      const catalog = await this.getApiCapabilities();
      const matrix = {};
      
      // Build compatibility based on data flow potential
      for (const op1 of catalog.operations) {
        matrix[op1.id] = {};
        for (const op2 of catalog.operations) {
          if (op1.id !== op2.id) {
            matrix[op1.id][op2.id] = this.assessCompatibility(op1, op2);
          }
        }
      }
      
      return matrix;
    } catch (error) {
      logger.error('Failed to get compatibility matrix', { error: error.message });
      throw error;
    }
  }

  /**
   * Assess compatibility between two operations
   */
  assessCompatibility(op1, op2) {
    // Same domain operations are usually compatible
    if (op1.domain === op2.domain) return 'high';
    
    // Banking + Currency operations are compatible
    if ((op1.domain === 'banking' && op2.domain === 'currency') ||
        (op1.domain === 'currency' && op2.domain === 'banking')) return 'high';
    
    // Weather + any financial operation (spending patterns)
    if ((op1.domain === 'weather' && ['banking', 'payment', 'goals'].includes(op2.domain)) ||
        (['banking', 'payment', 'goals'].includes(op1.domain) && op2.domain === 'weather')) return 'medium';
    
    // News + financial operations (context)
    if ((op1.domain === 'news' && ['banking', 'payment', 'goals'].includes(op2.domain)) ||
        (['banking', 'payment', 'goals'].includes(op1.domain) && op2.domain === 'news')) return 'medium';
    
    return 'low';
  }
}