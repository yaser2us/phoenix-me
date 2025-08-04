/**
 * Dependency Analyzer
 * Maps component relationships and measures coupling
 */

import { promises as fs } from 'fs';
import path from 'path';

export class DependencyAnalyzer {
  constructor() {
    this.dependencies = new Map();
    this.imports = new Map();
    this.exports = new Map();
    this.circularDeps = [];
  }

  async analyze(directory, options = {}) {
    await this.scanDirectory(directory, options);
    return this.generateAnalysis();
  }

  async scanDirectory(dir, options) {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      
      if (entry.isDirectory() && this.shouldScanDirectory(entry.name, options)) {
        await this.scanDirectory(fullPath, options);
      } else if (entry.isFile() && this.shouldScanFile(entry.name, options)) {
        await this.analyzeFile(fullPath, options);
      }
    }
  }

  async analyzeFile(filePath, options) {
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      const relativePath = path.relative(process.cwd(), filePath);
      
      // Extract imports
      const imports = this.extractImports(content, relativePath);
      this.imports.set(relativePath, imports);
      
      // Extract exports
      const exports = this.extractExports(content, relativePath);
      this.exports.set(relativePath, exports);
      
      // Build dependency graph
      for (const imp of imports) {
        if (imp.isLocal) {
          const resolvedPath = this.resolveImportPath(relativePath, imp.path);
          
          if (!this.dependencies.has(relativePath)) {
            this.dependencies.set(relativePath, new Set());
          }
          this.dependencies.get(relativePath).add(resolvedPath);
          
          // Track reverse dependencies
          if (!this.dependencies.has(resolvedPath)) {
            this.dependencies.set(resolvedPath, new Set());
          }
        }
      }
      
    } catch (error) {
      if (options.verbose) {
        console.error(`Error analyzing ${filePath}: ${error.message}`);
      }
    }
  }

  extractImports(content, filePath) {
    const imports = [];
    
    // ES6 imports
    const es6ImportRegex = /import\s+(?:(\{[^}]+\})|(\w+)|(\*\s+as\s+\w+))\s+from\s+['"]([^'"]+)['"]/g;
    let match;
    
    while ((match = es6ImportRegex.exec(content)) !== null) {
      const importPath = match[4];
      const isLocal = importPath.startsWith('.');
      const importedItems = match[1] || match[2] || match[3] || '';
      
      imports.push({
        path: importPath,
        isLocal,
        items: this.parseImportItems(importedItems),
        line: content.substring(0, match.index).split('\n').length
      });
    }
    
    // CommonJS requires
    const requireRegex = /(?:const|let|var)\s+(\w+)\s*=\s*require\s*\(\s*['"]([^'"]+)['"]\s*\)/g;
    
    while ((match = requireRegex.exec(content)) !== null) {
      const importPath = match[2];
      const isLocal = importPath.startsWith('.');
      
      imports.push({
        path: importPath,
        isLocal,
        items: [match[1]],
        line: content.substring(0, match.index).split('\n').length,
        type: 'commonjs'
      });
    }
    
    return imports;
  }

  extractExports(content, filePath) {
    const exports = [];
    
    // ES6 exports
    const exportRegex = /export\s+(?:(default)\s+)?(?:(class|function|const|let|var)\s+)?(\w+)?/g;
    let match;
    
    while ((match = exportRegex.exec(content)) !== null) {
      if (match[3]) {
        exports.push({
          name: match[3],
          type: match[2] || 'value',
          isDefault: !!match[1],
          line: content.substring(0, match.index).split('\n').length
        });
      }
    }
    
    // Export statements
    const exportStmtRegex = /export\s*\{([^}]+)\}/g;
    
    while ((match = exportStmtRegex.exec(content)) !== null) {
      const items = match[1].split(',').map(item => item.trim());
      items.forEach(item => {
        const [name, alias] = item.split(/\s+as\s+/);
        exports.push({
          name: name.trim(),
          alias: alias ? alias.trim() : undefined,
          type: 'named',
          isDefault: false,
          line: content.substring(0, match.index).split('\n').length
        });
      });
    }
    
    return exports;
  }

  parseImportItems(importString) {
    if (!importString) return [];
    
    // Remove braces and split by comma
    const cleaned = importString.replace(/[{}]/g, '').trim();
    if (!cleaned) return [];
    
    return cleaned.split(',').map(item => {
      const [name, alias] = item.trim().split(/\s+as\s+/);
      return {
        name: name.trim(),
        alias: alias ? alias.trim() : undefined
      };
    });
  }

  resolveImportPath(fromFile, importPath) {
    const dir = path.dirname(fromFile);
    let resolved = path.join(dir, importPath);
    
    // Add .js extension if not present
    if (!path.extname(resolved)) {
      resolved += '.js';
    }
    
    // Normalize the path
    return path.normalize(resolved);
  }

  detectCircularDependencies() {
    const visited = new Set();
    const recursionStack = new Set();
    const circular = [];
    
    const dfs = (node, path = []) => {
      if (recursionStack.has(node)) {
        const cycleStart = path.indexOf(node);
        circular.push(path.slice(cycleStart).concat(node));
        return;
      }
      
      if (visited.has(node)) return;
      
      visited.add(node);
      recursionStack.add(node);
      
      const deps = this.dependencies.get(node) || new Set();
      for (const dep of deps) {
        dfs(dep, [...path, node]);
      }
      
      recursionStack.delete(node);
    };
    
    for (const node of this.dependencies.keys()) {
      if (!visited.has(node)) {
        dfs(node);
      }
    }
    
    return circular;
  }

  calculateMetrics() {
    const fileCount = this.imports.size;
    const totalImports = Array.from(this.imports.values())
      .reduce((sum, imports) => sum + imports.filter(i => i.isLocal).length, 0);
    
    const avgImportsPerFile = fileCount > 0 ? totalImports / fileCount : 0;
    
    // Calculate fan-in and fan-out
    const fanIn = new Map();
    const fanOut = new Map();
    
    for (const [file, deps] of this.dependencies) {
      fanOut.set(file, deps.size);
      
      for (const dep of deps) {
        fanIn.set(dep, (fanIn.get(dep) || 0) + 1);
      }
    }
    
    // Find highly coupled files
    const highlyCoupled = Array.from(fanOut.entries())
      .filter(([file, count]) => count > 5)
      .sort((a, b) => b[1] - a[1]);
    
    // Calculate coupling score
    const maxCoupling = Math.max(...Array.from(fanOut.values()), 1);
    const avgCoupling = Array.from(fanOut.values()).reduce((a, b) => a + b, 0) / fanOut.size || 0;
    const couplingScore = avgCoupling / 10; // Normalize to 0-1
    
    return {
      fileCount,
      totalImports,
      avgImportsPerFile: avgImportsPerFile.toFixed(2),
      couplingScore: Math.min(couplingScore, 1).toFixed(2),
      highlyCoupled,
      fanIn,
      fanOut,
      maxCoupling
    };
  }

  generateAnalysis() {
    const metrics = this.calculateMetrics();
    const circular = this.detectCircularDependencies();
    
    // Find most imported modules
    const importCounts = new Map();
    for (const imports of this.imports.values()) {
      for (const imp of imports) {
        if (imp.isLocal) {
          const module = path.basename(imp.path);
          importCounts.set(module, (importCounts.get(module) || 0) + 1);
        }
      }
    }
    
    const topImports = Array.from(importCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);
    
    return {
      metrics,
      dependencies: Object.fromEntries(
        Array.from(this.dependencies.entries()).map(([k, v]) => [k, Array.from(v)])
      ),
      topImports,
      circularDependencies: circular,
      recommendations: this.generateRecommendations(metrics, circular)
    };
  }

  generateRecommendations(metrics, circular) {
    const recommendations = [];
    
    if (parseFloat(metrics.couplingScore) > 0.7) {
      recommendations.push({
        severity: 'HIGH',
        issue: `High coupling score: ${metrics.couplingScore}`,
        suggestion: 'Consider refactoring to reduce dependencies between modules'
      });
    }
    
    if (circular.length > 0) {
      recommendations.push({
        severity: 'CRITICAL',
        issue: `${circular.length} circular dependencies detected`,
        suggestion: 'Break circular dependencies to improve maintainability'
      });
    }
    
    if (metrics.highlyCoupled.length > 0) {
      recommendations.push({
        severity: 'MEDIUM',
        issue: `${metrics.highlyCoupled.length} highly coupled files found`,
        suggestion: 'Consider splitting large modules or using dependency injection'
      });
    }
    
    if (metrics.avgImportsPerFile > 5) {
      recommendations.push({
        severity: 'LOW',
        issue: `High average imports per file: ${metrics.avgImportsPerFile}`,
        suggestion: 'Consider consolidating related functionality'
      });
    }
    
    return recommendations;
  }

  shouldScanDirectory(dirName, options) {
    const excludeDirs = options.excludeDirs || ['node_modules', '.git', 'dist', 'build'];
    return !excludeDirs.includes(dirName) && !dirName.startsWith('.');
  }

  shouldScanFile(fileName, options) {
    const includeExts = options.includeExts || ['.js', '.ts', '.jsx', '.tsx'];
    return includeExts.some(ext => fileName.endsWith(ext));
  }
}

export default DependencyAnalyzer;