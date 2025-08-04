import { logger } from '../utils/logger.js';

/**
 * Phase 4.8 Checkpoint 4: Automatic Data Extraction
 * Intelligently extracts meaningful data from API responses
 */
export class AutoDataExtractor {
  constructor() {
    this.extractionRules = new Map();
    this.setupDefaultRules();
    logger.info('AutoDataExtractor initialized with intelligent extraction rules');
  }

  /**
   * Setup default extraction rules for common patterns
   */
  setupDefaultRules() {
    // Banking/Financial patterns
    this.addRule('balance', {
      keywords: ['balance', 'amount', 'total', 'currentBalance', 'availableBalance'],
      priority: 'high',
      type: 'financial'
    });

    this.addRule('account', {
      keywords: ['account', 'accountNumber', 'accountName', 'accountCode', 'accountType'],
      priority: 'high',
      type: 'identity'
    });

    this.addRule('transaction', {
      keywords: ['transaction', 'payment', 'transfer', 'history', 'txn'],
      priority: 'medium',
      type: 'activity'
    });

    // List/Array patterns
    this.addRule('list', {
      keywords: ['list', 'items', 'data', 'results', 'entries'],
      priority: 'medium',
      type: 'collection',
      isArray: true
    });

    // Status/Response patterns
    this.addRule('status', {
      keywords: ['status', 'code', 'message', 'success', 'error'],
      priority: 'low',
      type: 'metadata'
    });

    // Date/Time patterns
    this.addRule('datetime', {
      keywords: ['date', 'time', 'timestamp', 'created', 'updated', 'effective'],
      priority: 'low',
      type: 'temporal'
    });
  }

  /**
   * Add custom extraction rule
   */
  addRule(name, rule) {
    this.extractionRules.set(name, rule);
  }

  /**
   * Extract meaningful data from response using intelligent analysis
   */
  extractData(responseData, operation = null, options = {}) {
    try {
      if (!responseData || typeof responseData !== 'object') {
        return { extracted: null, confidence: 0, rules: [] };
      }

      const extracted = {};
      const appliedRules = [];
      let totalConfidence = 0;

      // 1. Schema-based extraction (highest priority)
      if (operation && operation.responses) {
        const schemaExtracted = this.extractFromSchema(responseData, operation);
        Object.assign(extracted, schemaExtracted.data);
        appliedRules.push(...schemaExtracted.rules);
        totalConfidence += schemaExtracted.confidence;
      }

      // 2. Operation-specific extraction
      if (operation && operation.operationId) {
        const operationExtracted = this.extractByOperation(responseData, operation.operationId);
        Object.assign(extracted, operationExtracted.data);
        appliedRules.push(...operationExtracted.rules);
        totalConfidence += operationExtracted.confidence;
      }

      // 3. Pattern-based extraction
      const patternExtracted = this.extractByPatterns(responseData);
      Object.assign(extracted, patternExtracted.data);
      appliedRules.push(...patternExtracted.rules);
      totalConfidence += patternExtracted.confidence;

      // 4. Smart field prioritization
      const prioritized = this.prioritizeFields(extracted, appliedRules);

      // 5. Clean and format extracted data
      const cleaned = this.cleanExtractedData(prioritized);

      const confidence = Math.min(totalConfidence / appliedRules.length || 0, 1);

      logger.debug('Data extraction complete', {
        operationId: operation?.operationId,
        extractedFields: Object.keys(cleaned).length,
        confidence: Math.round(confidence * 100),
        rulesApplied: appliedRules.length
      });

      return {
        extracted: cleaned,
        confidence,
        rules: appliedRules,
        metadata: {
          fieldCount: Object.keys(cleaned).length,
          dataTypes: this.analyzeDataTypes(cleaned),
          extractionMethods: [...new Set(appliedRules.map(r => r.method))]
        }
      };

    } catch (error) {
      logger.error('Data extraction failed', {
        operationId: operation?.operationId,
        error: error.message
      });

      return {
        extracted: responseData,
        confidence: 0,
        rules: [],
        error: error.message
      };
    }
  }

  /**
   * Extract data based on OpenAPI schema
   */
  extractFromSchema(responseData, operation) {
    const extracted = {};
    const rules = [];
    let confidence = 0.9; // High confidence for schema-based extraction

    try {
      // Get response schema (assume 200 status for now)
      const responseSchema = this.getResponseSchema(operation, 200);
      if (responseSchema && responseSchema.properties) {
        for (const [key, schema] of Object.entries(responseSchema.properties)) {
          if (key in responseData) {
            extracted[key] = responseData[key];
            rules.push({
              field: key,
              method: 'schema',
              confidence: 0.9,
              type: schema.type || 'unknown'
            });
          }
        }
      }
    } catch (error) {
      logger.debug('Schema extraction failed', { error: error.message });
      confidence = 0;
    }

    return { data: extracted, rules, confidence };
  }

  /**
   * Extract data based on operation-specific patterns
   */
  extractByOperation(responseData, operationId) {
    const extracted = {};
    const rules = [];
    let confidence = 0.8; // Good confidence for operation-specific extraction

    switch (operationId) {
      case 'get_banking_getBalance':
        if (responseData.result) {
          extracted.primaryBalance = responseData.result.balance || responseData.result.currentBalance;
          extracted.accountInfo = {
            name: responseData.result.name,
            code: responseData.result.code,
            type: responseData.result.type
          };
          rules.push({ field: 'primaryBalance', method: 'operation-specific', confidence: 0.9 });
          rules.push({ field: 'accountInfo', method: 'operation-specific', confidence: 0.8 });
        }
        break;

      case 'get_banking_summary':
        if (responseData.result) {
          extracted.accountSummary = {
            totalBalance: responseData.result.total,
            accountCount: responseData.result.accountListings?.length || 0,
            accounts: responseData.result.accountListings || []
          };
          rules.push({ field: 'accountSummary', method: 'operation-specific', confidence: 0.9 });
        }
        break;

      case 'get_payment_favList_1':
        if (responseData.result) {
          extracted.favoritePayments = {
            count: responseData.result.favList?.length || 0,
            list: responseData.result.favList || [],
            types: [...new Set(responseData.result.favList?.map(f => f.paymentType) || [])]
          };
          rules.push({ field: 'favoritePayments', method: 'operation-specific', confidence: 0.9 });
        }
        break;

      case 'post_bill_getBillsTxnHistory':
        if (responseData.statusCode === "0000") {
          extracted.billHistory = {
            recentPayments: responseData.lastThreePayment || [],
            effectiveDates: responseData.populateEffectiveDateList || [],
            companyInfo: responseData.ebppData?.companyHeader,
            status: 'success'
          };
          rules.push({ field: 'billHistory', method: 'operation-specific', confidence: 0.9 });
        }
        break;

      default:
        confidence = 0; // No operation-specific rules
    }

    return { data: extracted, rules, confidence };
  }

  /**
   * Extract data based on field name patterns and rules
   */
  extractByPatterns(responseData, path = '') {
    const extracted = {};
    const rules = [];
    let confidence = 0.6; // Moderate confidence for pattern-based extraction

    const traverse = (obj, currentPath = '') => {
      if (!obj || typeof obj !== 'object') return;

      for (const [key, value] of Object.entries(obj)) {
        const fullPath = currentPath ? `${currentPath}.${key}` : key;
        
        // Check against extraction rules
        for (const [ruleName, rule] of this.extractionRules) {
          if (this.matchesRule(key, value, rule)) {
            const extractedKey = this.generateExtractedKey(key, fullPath, rule);
            extracted[extractedKey] = this.formatExtractedValue(value, rule);
            
            rules.push({
              field: extractedKey,
              method: 'pattern',
              rule: ruleName,
              confidence: this.calculateRuleConfidence(key, value, rule),
              originalPath: fullPath
            });
          }
        }

        // Recursively traverse objects and arrays
        if (typeof value === 'object' && value !== null) {
          if (Array.isArray(value) && value.length > 0) {
            // For arrays, analyze first item to understand structure
            if (typeof value[0] === 'object') {
              traverse(value[0], `${fullPath}[0]`);
            }
          } else {
            traverse(value, fullPath);
          }
        }
      }
    };

    traverse(responseData);
    return { data: extracted, rules, confidence };
  }

  /**
   * Check if a field matches an extraction rule
   */
  matchesRule(key, value, rule) {
    const keyLower = key.toLowerCase();
    return rule.keywords.some(keyword => 
      keyLower.includes(keyword.toLowerCase()) ||
      keyword.toLowerCase().includes(keyLower)
    );
  }

  /**
   * Generate a meaningful key for extracted data
   */
  generateExtractedKey(originalKey, path, rule) {
    // For high-priority rules, use semantic names
    if (rule.priority === 'high') {
      if (rule.type === 'financial') return 'balance';
      if (rule.type === 'identity') return 'account';
    }
    
    // For collections, use plural forms
    if (rule.isArray) {
      return originalKey.endsWith('s') ? originalKey : `${originalKey}s`;
    }
    
    return originalKey;
  }

  /**
   * Format extracted value based on rule type
   */
  formatExtractedValue(value, rule) {
    if (rule.type === 'financial' && typeof value === 'string') {
      // Try to parse financial values
      const parsed = parseFloat(value.replace(/[^0-9.-]/g, ''));
      return !isNaN(parsed) ? parsed : value;
    }
    
    return value;
  }

  /**
   * Calculate confidence for a rule match
   */
  calculateRuleConfidence(key, value, rule) {
    let confidence = 0.5; // Base confidence
    
    // Exact keyword match
    if (rule.keywords.includes(key.toLowerCase())) {
      confidence += 0.3;
    }
    
    // Value type matching
    if (rule.type === 'financial' && (typeof value === 'number' || /^\d+\.?\d*$/.test(value))) {
      confidence += 0.2;
    }
    
    // Priority boost
    if (rule.priority === 'high') confidence += 0.1;
    if (rule.priority === 'medium') confidence += 0.05;
    
    return Math.min(confidence, 1);
  }

  /**
   * Prioritize extracted fields based on importance and confidence
   */
  prioritizeFields(extracted, rules) {
    // Create priority map
    const priorities = {};
    rules.forEach(rule => {
      priorities[rule.field] = rule.confidence * this.getPriorityWeight(rule);
    });

    // Sort fields by priority and keep top 10 most important
    const sortedFields = Object.entries(priorities)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([field]) => field);

    const prioritized = {};
    sortedFields.forEach(field => {
      if (field in extracted) {
        prioritized[field] = extracted[field];
      }
    });

    return prioritized;
  }

  /**
   * Get priority weight for different extraction methods
   */
  getPriorityWeight(rule) {
    const weights = {
      'schema': 1.0,
      'operation-specific': 0.9,
      'pattern': 0.6
    };
    return weights[rule.method] || 0.5;
  }

  /**
   * Clean and format extracted data
   */
  cleanExtractedData(extracted) {
    const cleaned = {};
    
    for (const [key, value] of Object.entries(extracted)) {
      // Skip null, undefined, empty strings, empty arrays, empty objects
      if (value == null || 
          value === '' || 
          (Array.isArray(value) && value.length === 0) ||
          (typeof value === 'object' && Object.keys(value).length === 0)) {
        continue;
      }
      
      cleaned[key] = value;
    }
    
    return cleaned;
  }

  /**
   * Analyze data types in extracted data
   */
  analyzeDataTypes(data) {
    const types = {};
    for (const [key, value] of Object.entries(data)) {
      types[key] = Array.isArray(value) ? 'array' : typeof value;
    }
    return types;
  }

  /**
   * Get response schema from operation (helper method)
   */
  getResponseSchema(operation, statusCode) {
    const responses = operation.responses;
    if (!responses) return null;

    let response = responses[statusCode.toString()] || responses.default;
    if (!response || !response.content) return null;

    const contentType = Object.keys(response.content)[0];
    return response.content[contentType]?.schema;
  }

  /**
   * Get extraction statistics
   */
  getExtractionStats() {
    return {
      totalRules: this.extractionRules.size,
      ruleTypes: [...new Set([...this.extractionRules.values()].map(r => r.type))],
      rulePriorities: [...new Set([...this.extractionRules.values()].map(r => r.priority))]
    };
  }
}

export default AutoDataExtractor;