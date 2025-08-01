import { logger } from '../utils/logger.js';

/**
 * Data Flow Manager - Phase 4.9 Checkpoint 2
 * Manages cross-API data flow and intelligent transformations
 */
export class DataFlowManager {
  constructor() {
    this.transformationRegistry = new Map();
    this.dataLineage = new Map();
    this.initializeTransformations();
    
    logger.info('Data Flow Manager initialized');
  }

  /**
   * Transform data from one step to another
   */
  async transformData(sourceData, transformation, fieldName) {
    try {
      logger.debug('Transforming data', { 
        transformation, 
        fieldName,
        hasSourceData: !!sourceData 
      });
      
      // Get transformation function
      const transformFunc = this.transformationRegistry.get(transformation);
      
      if (!transformFunc) {
        logger.warn('Unknown transformation, using default', { transformation });
        return this.defaultTransformation(sourceData, fieldName);
      }
      
      // Apply transformation
      const result = await transformFunc(sourceData, fieldName);
      
      // Record data lineage
      this.recordDataLineage(sourceData, result, transformation, fieldName);
      
      logger.debug('Data transformation completed', { 
        transformation,
        fieldName,
        resultType: typeof result
      });
      
      return result;
      
    } catch (error) {
      logger.error('Data transformation failed', {
        transformation,
        fieldName,
        error: error.message
      });
      
      // Return source data as fallback
      return this.extractFieldValue(sourceData, fieldName);
    }
  }

  /**
   * Execute data flow between steps
   */
  async executeDataFlow(dataFlow, stepResults) {
    try {
      logger.debug('Executing data flow', { 
        from: dataFlow.from, 
        to: dataFlow.to,
        field: dataFlow.field 
      });
      
      // Get source step result
      const sourceResult = stepResults.get(dataFlow.from);
      if (!sourceResult || !sourceResult.success) {
        throw new Error(`Source step '${dataFlow.from}' failed or not found`);
      }
      
      // Transform the data
      const transformedData = await this.transformData(
        sourceResult.data,
        dataFlow.transformation,
        dataFlow.field
      );
      
      return {
        field: dataFlow.field,
        value: transformedData,
        sourceStep: dataFlow.from,
        targetStep: dataFlow.to,
        transformation: dataFlow.transformation,
        processedAt: new Date().toISOString()
      };
      
    } catch (error) {
      logger.error('Data flow execution failed', {
        dataFlow,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Execute multiple data flows
   */
  async executeMultipleDataFlows(dataFlows, stepResults) {
    const results = {};
    
    try {
      // Process all data flows
      const flowPromises = dataFlows.map(async (flow) => {
        try {
          const result = await this.executeDataFlow(flow, stepResults);
          return { success: true, flow, result };
        } catch (error) {
          return { success: false, flow, error: error.message };
        }
      });
      
      const flowResults = await Promise.allSettled(flowPromises);
      
      // Collect successful results
      for (const promiseResult of flowResults) {
        if (promiseResult.status === 'fulfilled') {
          const { success, flow, result, error } = promiseResult.value;
          
          if (success) {
            results[flow.field] = result.value;
          } else {
            logger.warn('Data flow failed', { flow, error });
            results[flow.field] = null;
          }
        }
      }
      
      logger.info('Multiple data flows executed', {
        totalFlows: dataFlows.length,
        successfulFlows: Object.keys(results).filter(key => results[key] !== null).length
      });
      
      return results;
      
    } catch (error) {
      logger.error('Multiple data flow execution failed', { error: error.message });
      throw error;
    }
  }

  /**
   * Initialize transformation functions
   */
  initializeTransformations() {
    // Financial data transformations
    this.transformationRegistry.set('extract_balance_value', (data, field) => {
      if (data.balance && typeof data.balance === 'object') {
        return data.balance.amount || data.balance.value || 0;
      }
      return this.extractFieldValue(data, 'balance') || 0;
    });
    
    this.transformationRegistry.set('extract_balance', (data, field) => {
      return data.balance || data.accountBalance || this.extractFieldValue(data, 'balance');
    });
    
    this.transformationRegistry.set('extract_financial', (data, field) => {
      return {
        balance: this.extractFieldValue(data, 'balance'),
        currency: this.extractFieldValue(data, 'currency') || 'MYR',
        timestamp: new Date().toISOString()
      };
    });
    
    // Weather data transformations
    this.transformationRegistry.set('extract_weather', (data, field) => {
      return {
        temperature: this.extractFieldValue(data, 'temperature') || this.extractFieldValue(data, 'temp'),
        condition: this.extractFieldValue(data, 'condition') || this.extractFieldValue(data, 'weather'),
        humidity: this.extractFieldValue(data, 'humidity'),
        timestamp: new Date().toISOString()
      };
    });
    
    this.transformationRegistry.set('extract_weather_conditions', (data, field) => {
      return this.extractFieldValue(data, 'condition') || 
             this.extractFieldValue(data, 'weather') || 
             this.extractFieldValue(data, 'description') || 'unknown';
    });
    
    // Currency transformations
    this.transformationRegistry.set('extract_exchange_rate', (data, field) => {
      if (data.rates) {
        return data.rates.USD || data.rates.usd || 0.21; // Default USD rate
      }
      return this.extractFieldValue(data, 'rate') || 0.21;
    });
    
    this.transformationRegistry.set('extract_currency_rates', (data, field) => {
      return data.rates || data.exchangeRates || { USD: 0.21 };
    });
    
    // Generic transformations
    this.transformationRegistry.set('extract_key_insights', (data, field) => {
      const insights = [];
      
      if (data.balance) {
        insights.push(`Balance: ${data.balance.amount || data.balance} ${data.balance.currency || 'MYR'}`);
      }
      
      if (data.weather || data.temperature) {
        insights.push(`Weather: ${data.weather || data.temperature}°C`);
      }
      
      if (data.rates || data.exchangeRate) {
        insights.push(`Exchange rate available`);
      }
      
      return insights.length > 0 ? insights : ['No key insights available'];
    });
    
    this.transformationRegistry.set('combine_data', (data, field) => {
      return { combinedData: data, processedAt: new Date().toISOString() };
    });
    
    this.transformationRegistry.set('normalize_data', (data, field) => {
      if (typeof data === 'object' && data !== null) {
        return this.normalizeObject(data);
      }
      return data;
    });
    
    logger.debug('Transformation functions initialized', {
      transformationCount: this.transformationRegistry.size
    });
  }

  /**
   * Default transformation when specific transformation not found
   */
  defaultTransformation(data, fieldName) {
    // Try to extract the field value directly
    const value = this.extractFieldValue(data, fieldName);
    if (value !== undefined) {
      return value;
    }
    
    // If no specific field, return the whole data
    return data;
  }

  /**
   * Extract field value from nested object
   */
  extractFieldValue(data, fieldPath) {
    if (!data || typeof data !== 'object') {
      return data;
    }
    
    // Handle simple field names
    if (data.hasOwnProperty(fieldPath)) {
      return data[fieldPath];
    }
    
    // Handle nested field paths (e.g., 'balance.amount')
    const pathParts = fieldPath.split('.');
    let current = data;
    
    for (const part of pathParts) {
      if (current && typeof current === 'object' && current.hasOwnProperty(part)) {
        current = current[part];
      } else {
        return undefined;
      }
    }
    
    return current;
  }

  /**
   * Normalize object structure
   */
  normalizeObject(obj) {
    const normalized = {};
    
    for (const [key, value] of Object.entries(obj)) {
      // Convert camelCase to snake_case for consistency
      const normalizedKey = key.replace(/([A-Z])/g, '_$1').toLowerCase();
      
      if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        normalized[normalizedKey] = this.normalizeObject(value);
      } else {
        normalized[normalizedKey] = value;
      }
    }
    
    return normalized;
  }

  /**
   * Record data lineage for traceability
   */
  recordDataLineage(sourceData, resultData, transformation, fieldName) {
    const lineageRecord = {
      sourceDataHash: this.hashData(sourceData),
      resultDataHash: this.hashData(resultData),
      transformation,
      fieldName,
      timestamp: new Date().toISOString()
    };
    
    const lineageKey = `${transformation}_${fieldName}_${Date.now()}`;
    this.dataLineage.set(lineageKey, lineageRecord);
    
    // Keep only last 100 lineage records to prevent memory issues
    if (this.dataLineage.size > 100) {
      const firstKey = this.dataLineage.keys().next().value;
      this.dataLineage.delete(firstKey);
    }
  }

  /**
   * Hash data for lineage tracking
   */
  hashData(data) {
    try {
      const jsonString = JSON.stringify(data);
      return this.simpleHash(jsonString);
    } catch (error) {
      return 'unhashable_data';
    }
  }

  /**
   * Simple hash function
   */
  simpleHash(str) {
    let hash = 0;
    if (str.length === 0) return hash;
    
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    
    return hash.toString(36);
  }

  /**
   * Validate data flow compatibility
   */
  async validateDataFlowCompatibility(sourceData, targetParameters, transformation) {
    try {
      // Attempt the transformation
      const result = await this.transformData(sourceData, transformation, 'test_field');
      
      return {
        compatible: true,
        result,
        confidence: this.calculateCompatibilityConfidence(sourceData, result)
      };
      
    } catch (error) {
      return {
        compatible: false,
        error: error.message,
        confidence: 0
      };
    }
  }

  /**
   * Calculate compatibility confidence score
   */
  calculateCompatibilityConfidence(sourceData, transformedData) {
    let confidence = 0.5; // Base confidence
    
    // Higher confidence if transformation preserved data structure
    if (typeof sourceData === typeof transformedData) {
      confidence += 0.2;
    }
    
    // Higher confidence if transformation extracted meaningful data
    if (transformedData !== null && transformedData !== undefined) {
      confidence += 0.2;
    }
    
    // Higher confidence if transformation is registered
    confidence += 0.1;
    
    return Math.min(1.0, confidence);
  }

  /**
   * Get data flow metrics
   */
  getDataFlowMetrics() {
    return {
      registeredTransformations: this.transformationRegistry.size,
      lineageRecords: this.dataLineage.size,
      transformationTypes: Array.from(this.transformationRegistry.keys()),
      lastLineageUpdate: this.dataLineage.size > 0 ? 
        Array.from(this.dataLineage.values()).pop().timestamp : null
    };
  }

  /**
   * Add custom transformation
   */
  addTransformation(name, transformFunction) {
    this.transformationRegistry.set(name, transformFunction);
    logger.info('Custom transformation added', { name });
  }

  /**
   * Remove transformation
   */
  removeTransformation(name) {
    const removed = this.transformationRegistry.delete(name);
    if (removed) {
      logger.info('Transformation removed', { name });
    }
    return removed;
  }

  /**
   * Clear data lineage
   */
  clearLineage() {
    this.dataLineage.clear();
    logger.info('Data lineage cleared');
  }
}