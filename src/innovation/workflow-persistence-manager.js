import { logger } from '../utils/logger.js';
import fs from 'fs/promises';
import path from 'path';

/**
 * Workflow Persistence Manager - Phase 4.9 Checkpoint 5
 * Manages saving and retrieving innovative workflows with versioning and library management
 */
export class WorkflowPersistenceManager {
  constructor() {
    this.persistenceDir = './data/workflows';
    this.workflowLibrary = new Map();
    this.workflowVersions = new Map();
    this.libraryMetadata = {
      totalWorkflows: 0,
      totalInnovations: 0,
      lastUpdated: null,
      version: '1.0.0'
    };
    
    this.initializePersistence();
    
    logger.info('Workflow Persistence Manager initialized');
  }

  /**
   * Save an innovative workflow to persistent storage
   */
  async saveInnovativeWorkflow(workflow) {
    try {
      logger.debug('Saving innovative workflow', {
        id: workflow.id,
        name: workflow.name
      });

      const workflowId = workflow.id || `wf_${Date.now()}_${Math.random().toString(36).substr(2, 8)}`;
      const timestamp = new Date().toISOString();

      const persistentWorkflow = {
        ...workflow,
        id: workflowId,
        persistedAt: timestamp,
        version: '1.0',
        metadata: {
          ...workflow.metadata,
          persistenceVersion: '1.0.0',
          checksums: this.calculateChecksums(workflow),
          tags: this.generateTags(workflow)
        }
      };

      // Store in memory library
      this.workflowLibrary.set(workflowId, persistentWorkflow);

      // Save to file system
      await this.saveToFileSystem(workflowId, persistentWorkflow);

      // Update library metadata
      this.libraryMetadata.totalWorkflows++;
      if (workflow.innovation || workflow.innovationType) {
        this.libraryMetadata.totalInnovations++;
      }
      this.libraryMetadata.lastUpdated = timestamp;

      logger.info('Innovative workflow saved successfully', {
        workflowId,
        totalWorkflows: this.libraryMetadata.totalWorkflows
      });

      return {
        success: true,
        workflowId,
        version: '1.0',
        persistedAt: timestamp,
        location: `${this.persistenceDir}/${workflowId}.json`
      };

    } catch (error) {
      logger.error('Workflow save failed', { error: error.message });
      throw error;
    }
  }

  /**
   * Find similar workflows based on intent or pattern
   */
  async findSimilarWorkflows(searchQuery, options = {}) {
    try {
      logger.debug('Finding similar workflows', {
        query: searchQuery,
        threshold: options.threshold || 0.6
      });

      const threshold = options.threshold || 0.6;
      const includeMetrics = options.includeMetrics || false;
      const maxResults = options.maxResults || 10;

      const similarities = [];
      const queryFeatures = this.extractQueryFeatures(searchQuery);

      for (const [workflowId, workflow] of this.workflowLibrary) {
        const workflowFeatures = this.extractWorkflowFeatures(workflow);
        const similarity = this.calculateSimilarity(queryFeatures, workflowFeatures);

        if (similarity >= threshold) {
          const result = {
            workflowId,
            workflow: includeMetrics ? workflow : this.sanitizeWorkflow(workflow),
            similarity,
            matchReasons: this.getMatchReasons(queryFeatures, workflowFeatures, similarity)
          };

          if (includeMetrics) {
            result.metrics = {
              performance: workflow.performance,
              innovation: workflow.innovation,
              usage: workflow.metadata?.usage || {}
            };
          }

          similarities.push(result);
        }
      }

      // Sort by similarity and limit results
      const sortedResults = similarities
        .sort((a, b) => b.similarity - a.similarity)
        .slice(0, maxResults);

      logger.info('Similar workflows found', {
        query: searchQuery,
        foundCount: sortedResults.length,
        topSimilarity: sortedResults[0]?.similarity || 0
      });

      return sortedResults;

    } catch (error) {
      logger.error('Similar workflow search failed', { error: error.message });
      throw error;
    }
  }

  /**
   * Save a new version of an existing workflow
   */
  async saveWorkflowVersion(updatedWorkflow) {
    try {
      logger.debug('Saving workflow version', {
        id: updatedWorkflow.id,
        version: updatedWorkflow.version
      });

      const workflowId = updatedWorkflow.id;
      const version = updatedWorkflow.version || this.generateNextVersion(workflowId);
      const timestamp = new Date().toISOString();

      // Get version history
      let versionHistory = this.workflowVersions.get(workflowId) || [];
      
      // Create versioned workflow
      const versionedWorkflow = {
        ...updatedWorkflow,
        version,
        versionedAt: timestamp,
        previousVersion: versionHistory.length > 0 ? versionHistory[versionHistory.length - 1].version : null,
        versionMetadata: {
          changeType: this.detectChangeType(workflowId, updatedWorkflow),
          changeDescription: this.generateChangeDescription(workflowId, updatedWorkflow),
          checksums: this.calculateChecksums(updatedWorkflow)
        }
      };

      // Update version history
      versionHistory.push({
        version,
        timestamp,
        checksum: versionedWorkflow.versionMetadata.checksums.content
      });
      this.workflowVersions.set(workflowId, versionHistory);

      // Update main library with latest version
      this.workflowLibrary.set(workflowId, versionedWorkflow);

      // Save to file system
      await this.saveToFileSystem(workflowId, versionedWorkflow);
      await this.saveVersionHistory(workflowId, versionHistory);

      logger.info('Workflow version saved successfully', {
        workflowId,
        version,
        changeType: versionedWorkflow.versionMetadata.changeType
      });

      return {
        success: true,
        workflowId,
        version,
        versionedAt: timestamp,
        changeType: versionedWorkflow.versionMetadata.changeType
      };

    } catch (error) {
      logger.error('Workflow version save failed', { error: error.message });
      throw error;
    }
  }

  /**
   * Get the workflow library with filtering and sorting options
   */
  async getWorkflowLibrary(options = {}) {
    try {
      logger.debug('Getting workflow library', {
        sortBy: options.sortBy || 'innovation',
        limit: options.limit || 20
      });

      let workflows = Array.from(this.workflowLibrary.values());

      // Apply filters
      if (options.filterBy) {
        workflows = this.applyFilters(workflows, options.filterBy);
      }

      // Sort workflows
      workflows = this.sortWorkflows(workflows, options.sortBy || 'innovation');

      // Limit results
      if (options.limit) {
        workflows = workflows.slice(0, options.limit);
      }

      const library = {
        workflows: workflows.map(w => this.sanitizeWorkflow(w)),
        metadata: {
          ...this.libraryMetadata,
          filteredCount: workflows.length,
          totalAvailable: this.workflowLibrary.size,
          categories: this.generateCategories(),
          topInnovations: this.getTopInnovations(5)
        }
      };

      logger.info('Workflow library retrieved', {
        totalWorkflows: library.workflows.length,
        categories: Object.keys(library.metadata.categories).length
      });

      return library;

    } catch (error) {
      logger.error('Workflow library retrieval failed', { error: error.message });
      throw error;
    }
  }

  /**
   * Export workflows to various formats
   */
  async exportWorkflows(options = {}) {
    try {
      logger.debug('Exporting workflows', {
        format: options.format || 'json',
        workflowIds: options.workflows?.length || 'all'
      });

      const format = options.format || 'json';
      const includeMetrics = options.includeMetrics || false;
      const workflowIds = options.workflows || Array.from(this.workflowLibrary.keys());

      const exportData = {
        exportedAt: new Date().toISOString(),
        format,
        version: this.libraryMetadata.version,
        workflows: [],
        metadata: {
          totalExported: 0,
          includeMetrics,
          exportOptions: options
        }
      };

      for (const workflowId of workflowIds) {
        const workflow = this.workflowLibrary.get(workflowId);
        if (workflow) {
          const exportWorkflow = includeMetrics ? workflow : this.sanitizeWorkflow(workflow);
          exportData.workflows.push({
            id: workflowId,
            workflow: exportWorkflow,
            versions: this.workflowVersions.get(workflowId) || []
          });
        }
      }

      exportData.metadata.totalExported = exportData.workflows.length;

      logger.info('Workflows exported successfully', {
        format,
        workflowCount: exportData.workflows.length
      });

      return exportData;

    } catch (error) {
      logger.error('Workflow export failed', { error: error.message });
      throw error;
    }
  }

  /**
   * Import workflows from export data
   */
  async importWorkflows(importData, options = {}) {
    try {
      logger.debug('Importing workflows', {
        sourceFormat: importData.format,
        workflowCount: importData.workflows?.length || 0
      });

      const validateIntegrity = options.validateIntegrity || true;
      const skipDuplicates = options.skipDuplicates || false;
      let imported = 0;
      let skipped = 0;
      const errors = [];

      for (const workflowData of importData.workflows || []) {
        try {
          const workflowId = workflowData.id;
          const workflow = workflowData.workflow;

          // Check for duplicates
          if (skipDuplicates && this.workflowLibrary.has(workflowId)) {
            skipped++;
            continue;
          }

          // Validate integrity
          if (validateIntegrity && !this.validateWorkflowIntegrity(workflow)) {
            errors.push(`Integrity validation failed for workflow ${workflowId}`);
            continue;
          }

          // Import workflow
          const importedWorkflow = {
            ...workflow,
            importedAt: new Date().toISOString(),
            originalSource: importData.version || 'unknown'
          };

          this.workflowLibrary.set(workflowId, importedWorkflow);

          // Import version history if available
          if (workflowData.versions && workflowData.versions.length > 0) {
            this.workflowVersions.set(workflowId, workflowData.versions);
          }

          // Save to file system
          await this.saveToFileSystem(workflowId, importedWorkflow);

          imported++;

        } catch (error) {
          errors.push(`Failed to import workflow ${workflowData.id}: ${error.message}`);
        }
      }

      // Update metadata
      this.libraryMetadata.totalWorkflows = this.workflowLibrary.size;
      this.libraryMetadata.lastUpdated = new Date().toISOString();

      logger.info('Workflow import completed', {
        imported,
        skipped,
        errors: errors.length
      });

      return {
        imported,
        skipped,
        errors,
        totalWorkflows: this.workflowLibrary.size
      };

    } catch (error) {
      logger.error('Workflow import failed', { error: error.message });
      throw error;
    }
  }

  /**
   * Initialize persistence system
   */
  async initializePersistence() {
    try {
      // Create persistence directory
      await fs.mkdir(this.persistenceDir, { recursive: true });

      // Load existing workflows
      await this.loadExistingWorkflows();

      logger.info('Persistence system initialized', {
        persistenceDir: this.persistenceDir,
        loadedWorkflows: this.workflowLibrary.size
      });

    } catch (error) {
      logger.warn('Persistence initialization warning', { error: error.message });
      // Continue without persistence if directory creation fails
    }
  }

  /**
   * Load existing workflows from file system
   */
  async loadExistingWorkflows() {
    try {
      const files = await fs.readdir(this.persistenceDir);
      const workflowFiles = files.filter(file => file.endsWith('.json') && !file.includes('_versions'));

      for (const file of workflowFiles) {
        try {
          const filePath = path.join(this.persistenceDir, file);
          const data = await fs.readFile(filePath, 'utf8');
          const workflow = JSON.parse(data);
          
          const workflowId = path.basename(file, '.json');
          this.workflowLibrary.set(workflowId, workflow);

          // Load version history if exists
          const versionFile = path.join(this.persistenceDir, `${workflowId}_versions.json`);
          try {
            const versionData = await fs.readFile(versionFile, 'utf8');
            const versions = JSON.parse(versionData);
            this.workflowVersions.set(workflowId, versions);
          } catch (versionError) {
            // Version file doesn't exist, that's okay
          }

        } catch (fileError) {
          logger.warn('Failed to load workflow file', { file, error: fileError.message });
        }
      }

      // Update metadata
      this.libraryMetadata.totalWorkflows = this.workflowLibrary.size;
      this.libraryMetadata.totalInnovations = Array.from(this.workflowLibrary.values())
        .filter(w => w.innovation || w.innovationType).length;

    } catch (error) {
      logger.warn('Failed to load existing workflows', { error: error.message });
    }
  }

  /**
   * Save workflow to file system
   */
  async saveToFileSystem(workflowId, workflow) {
    try {
      const filePath = path.join(this.persistenceDir, `${workflowId}.json`);
      await fs.writeFile(filePath, JSON.stringify(workflow, null, 2), 'utf8');
    } catch (error) {
      logger.warn('Failed to save workflow to file system', { 
        workflowId, 
        error: error.message 
      });
    }
  }

  /**
   * Save version history to file system
   */
  async saveVersionHistory(workflowId, versionHistory) {
    try {
      const filePath = path.join(this.persistenceDir, `${workflowId}_versions.json`);
      await fs.writeFile(filePath, JSON.stringify(versionHistory, null, 2), 'utf8');
    } catch (error) {
      logger.warn('Failed to save version history', { 
        workflowId, 
        error: error.message 
      });
    }
  }

  /**
   * Helper methods for workflow processing
   */
  extractQueryFeatures(query) {
    const words = query.toLowerCase().split(/\s+/);
    return {
      words: new Set(words),
      hasFinancial: /balance|account|money|financial|bank|payment/i.test(query),
      hasWeather: /weather|temperature|forecast|climate/i.test(query),
      hasCurrency: /currency|exchange|rate/i.test(query),
      hasAnalytics: /analyze|insight|pattern|trend/i.test(query),
      hasAutomation: /smart|automatic|intelligent|ai/i.test(query),
      length: query.length
    };
  }

  extractWorkflowFeatures(workflow) {
    const description = (workflow.description || workflow.intent || '').toLowerCase();
    const steps = workflow.steps || [];
    
    return {
      words: new Set(description.split(/\s+/)),
      hasFinancial: /balance|account|money|financial|bank/i.test(description),
      hasWeather: /weather|temperature|forecast/i.test(description),
      hasCurrency: /currency|exchange|rate/i.test(description),
      hasAnalytics: /analyze|insight|pattern|trend/i.test(description),
      hasAutomation: /smart|automatic|intelligent|ai/i.test(description),
      stepCount: steps.length,
      domains: this.extractDomains(workflow),
      innovationType: workflow.innovationType || 'standard'
    };
  }

  calculateSimilarity(queryFeatures, workflowFeatures) {
    let similarity = 0;
    let totalWeight = 0;

    // Word overlap (40% weight)
    const wordWeight = 0.4;
    const queryWords = Array.from(queryFeatures.words);
    const workflowWords = Array.from(workflowFeatures.words);
    const intersection = queryWords.filter(word => workflowWords.includes(word));
    const union = [...new Set([...queryWords, ...workflowWords])];
    const wordSimilarity = union.length > 0 ? intersection.length / union.length : 0;
    similarity += wordSimilarity * wordWeight;
    totalWeight += wordWeight;

    // Domain similarity (30% weight)
    const domainWeight = 0.3;
    const domainMatches = [
      queryFeatures.hasFinancial && workflowFeatures.hasFinancial,
      queryFeatures.hasWeather && workflowFeatures.hasWeather,
      queryFeatures.hasCurrency && workflowFeatures.hasCurrency,
      queryFeatures.hasAnalytics && workflowFeatures.hasAnalytics,
      queryFeatures.hasAutomation && workflowFeatures.hasAutomation
    ].filter(match => match).length;
    
    const totalDomains = [
      queryFeatures.hasFinancial || workflowFeatures.hasFinancial,
      queryFeatures.hasWeather || workflowFeatures.hasWeather,
      queryFeatures.hasCurrency || workflowFeatures.hasCurrency,
      queryFeatures.hasAnalytics || workflowFeatures.hasAnalytics,
      queryFeatures.hasAutomation || workflowFeatures.hasAutomation
    ].filter(domain => domain).length;
    
    const domainSimilarity = totalDomains > 0 ? domainMatches / totalDomains : 0;
    similarity += domainSimilarity * domainWeight;
    totalWeight += domainWeight;

    // Lower the threshold by being more generous with similarity
    // If there's any domain overlap or word overlap, give some base similarity
    const baseBonus = (domainMatches > 0 || intersection.length > 0) ? 0.3 : 0;
    similarity += baseBonus * 0.3;
    totalWeight += 0.3;

    return totalWeight > 0 ? similarity / totalWeight : 0;
  }

  getMatchReasons(queryFeatures, workflowFeatures, similarity) {
    const reasons = [];
    
    if (similarity > 0.8) reasons.push('High overall similarity');
    if (queryFeatures.hasFinancial && workflowFeatures.hasFinancial) reasons.push('Financial domain match');
    if (queryFeatures.hasWeather && workflowFeatures.hasWeather) reasons.push('Weather domain match');
    if (queryFeatures.hasCurrency && workflowFeatures.hasCurrency) reasons.push('Currency domain match');
    if (workflowFeatures.innovationType !== 'standard') reasons.push('Innovative workflow type');
    
    return reasons;
  }

  calculateChecksums(workflow) {
    const contentString = JSON.stringify({
      steps: workflow.steps,
      pattern: workflow.pattern,
      intent: workflow.intent
    });
    
    // Simple checksum calculation (in real implementation, use crypto hash)
    let checksum = 0;
    for (let i = 0; i < contentString.length; i++) {
      checksum = ((checksum << 5) - checksum + contentString.charCodeAt(i)) & 0xffffffff;
    }
    
    return {
      content: Math.abs(checksum).toString(16),
      metadata: Date.now().toString(16)
    };
  }

  generateTags(workflow) {
    const tags = new Set();
    
    const text = (workflow.description || workflow.intent || '').toLowerCase();
    if (/financial|balance|account|money/i.test(text)) tags.add('financial');
    if (/weather|temperature|forecast/i.test(text)) tags.add('weather');
    if (/currency|exchange|rate/i.test(text)) tags.add('currency');
    if (/smart|intelligent|ai|adaptive/i.test(text)) tags.add('ai-enhanced');
    if (workflow.innovationType) tags.add(workflow.innovationType);
    if ((workflow.steps || []).length > 5) tags.add('complex');
    
    return Array.from(tags);
  }

  sanitizeWorkflow(workflow) {
    // Remove sensitive data and reduce size for public consumption
    const { 
      checksums, 
      internalMetrics, 
      debugInfo, 
      ...sanitized 
    } = workflow;
    
    return sanitized;
  }

  generateNextVersion(workflowId) {
    const versionHistory = this.workflowVersions.get(workflowId) || [];
    if (versionHistory.length === 0) return '1.1';
    
    const lastVersion = versionHistory[versionHistory.length - 1].version;
    const [major, minor] = lastVersion.split('.').map(Number);
    return `${major}.${minor + 1}`;
  }

  detectChangeType(workflowId, updatedWorkflow) {
    const existing = this.workflowLibrary.get(workflowId);
    if (!existing) return 'creation';
    
    const existingSteps = (existing.steps || []).length;
    const updatedSteps = (updatedWorkflow.steps || []).length;
    
    if (updatedSteps > existingSteps) return 'enhancement';
    if (updatedSteps < existingSteps) return 'simplification';
    return 'modification';
  }

  generateChangeDescription(workflowId, updatedWorkflow) {
    const changeType = this.detectChangeType(workflowId, updatedWorkflow);
    const changeMap = {
      creation: 'Initial workflow creation',
      enhancement: 'Added new steps and capabilities',
      simplification: 'Removed steps for better performance',
      modification: 'Modified existing workflow logic'
    };
    
    return changeMap[changeType] || 'Workflow updated';
  }

  applyFilters(workflows, filters) {
    return workflows.filter(workflow => {
      if (filters.minNovelty && (!workflow.innovation || workflow.innovation.novelty < filters.minNovelty)) {
        return false;
      }
      if (filters.minValue && (!workflow.innovation || workflow.innovation.value < filters.minValue)) {
        return false;
      }
      if (filters.tags && !filters.tags.some(tag => workflow.metadata?.tags?.includes(tag))) {
        return false;
      }
      return true;
    });
  }

  sortWorkflows(workflows, sortBy) {
    const sortFunctions = {
      innovation: (a, b) => (b.innovation?.overall || 0) - (a.innovation?.overall || 0),
      novelty: (a, b) => (b.innovation?.novelty || 0) - (a.innovation?.novelty || 0),
      usage: (a, b) => (b.metadata?.usage?.count || 0) - (a.metadata?.usage?.count || 0),
      recent: (a, b) => new Date(b.persistedAt || 0) - new Date(a.persistedAt || 0)
    };
    
    return workflows.sort(sortFunctions[sortBy] || sortFunctions.innovation);
  }

  generateCategories() {
    const categories = {};
    
    for (const workflow of this.workflowLibrary.values()) {
      const tags = workflow.metadata?.tags || [];
      for (const tag of tags) {
        categories[tag] = (categories[tag] || 0) + 1;
      }
    }
    
    return categories;
  }

  getTopInnovations(limit = 5) {
    return Array.from(this.workflowLibrary.values())
      .filter(w => w.innovation?.overall > 0.7)
      .sort((a, b) => (b.innovation?.overall || 0) - (a.innovation?.overall || 0))
      .slice(0, limit)
      .map(w => ({
        id: w.id,
        name: w.name,
        innovation: w.innovation?.overall,
        type: w.innovationType
      }));
  }

  extractDomains(workflow) {
    const domains = new Set();
    const text = (workflow.description || workflow.intent || '').toLowerCase();
    
    if (/financial|balance|account|money/i.test(text)) domains.add('financial');
    if (/weather|temperature|forecast/i.test(text)) domains.add('weather');
    if (/currency|exchange|rate/i.test(text)) domains.add('currency');
    if (/news|article|update/i.test(text)) domains.add('news');
    
    return Array.from(domains);
  }

  validateWorkflowIntegrity(workflow) {
    // Basic integrity checks
    if (!workflow.id || !workflow.name) return false;
    if (!workflow.steps || !Array.isArray(workflow.steps)) return false;
    if (workflow.steps.length === 0) return false;
    
    // Check step integrity
    for (const step of workflow.steps) {
      if (!step.operation) return false;
    }
    
    return true;
  }
}