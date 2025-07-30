/**
 * Hardcode Scanner
 * Analyzes codebase for hardcoded patterns and technical debt
 */

import { promises as fs } from 'fs';
import path from 'path';

export class HardcodeScanner {
  constructor() {
    this.patterns = {
      workflows: {
        pattern: /['"](maybank_[^'"]+|location_weather|trip_planning|market_overview|comprehensive_location_info|currency_location|quick_info|test_recovery|transferMoney|monthlyFinancialSummary|accountVerification|transactionHistoryExport)['"]/g,
        description: 'Hardcoded workflow names',
        severity: 'HIGH'
      },
      apiEndpoints: {
        pattern: /https?:\/\/[^\s'"]+|\/banking\/v1\/|\/api\/v[0-9]\//g,
        description: 'Hardcoded API endpoints',
        severity: 'HIGH'
      },
      apiKeys: {
        pattern: /['"](api_key|apiKey|API_KEY|bearer|Authorization)['"]\s*[:=]/g,
        description: 'Hardcoded API key references',
        severity: 'CRITICAL'
      },
      maybankSpecific: {
        pattern: /maya\.maybank2u\.com\.my|X-APP-PLATFORM|X-APP-VERSION|maya-authorization/g,
        description: 'Maybank-specific hardcoded values',
        severity: 'MEDIUM'
      },
      operationIds: {
        pattern: /get_banking_|getCurrentWeather|getNews|getCurrency|getLocation/g,
        description: 'Hardcoded operation IDs',
        severity: 'MEDIUM'
      },
      businessLogic: {
        pattern: /if\s*\([^)]*===\s*['"][^'"]+['"]|switch\s*\([^)]+\)\s*{[^}]*case\s*['"]/g,
        description: 'Hardcoded business logic conditions',
        severity: 'MEDIUM'
      },
      magicNumbers: {
        pattern: /[^0-9]\d{4,}(?![0-9])|timeout:\s*\d+|retry:\s*\d+|limit:\s*\d+/g,
        description: 'Magic numbers and hardcoded limits',
        severity: 'LOW'
      }
    };
  }

  async scan(directory, options = {}) {
    const findings = {
      totalFiles: 0,
      scannedFiles: 0,
      skippedFiles: 0,
      patterns: {},
      fileFindings: new Map(),
      summary: {
        critical: 0,
        high: 0,
        medium: 0,
        low: 0
      }
    };

    // Initialize pattern tracking
    for (const key of Object.keys(this.patterns)) {
      findings.patterns[key] = {
        count: 0,
        files: new Set(),
        examples: []
      };
    }

    await this.scanDirectory(directory, findings, options);
    
    return this.generateReport(findings);
  }

  async scanDirectory(dir, findings, options) {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      
      if (entry.isDirectory()) {
        if (this.shouldScanDirectory(entry.name, options)) {
          await this.scanDirectory(fullPath, findings, options);
        }
      } else if (entry.isFile() && this.shouldScanFile(entry.name, options)) {
        findings.totalFiles++;
        await this.scanFile(fullPath, findings, options);
      }
    }
  }

  async scanFile(filePath, findings, options) {
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      const relativePath = path.relative(process.cwd(), filePath);
      findings.scannedFiles++;
      
      const fileFindings = [];
      
      for (const [key, pattern] of Object.entries(this.patterns)) {
        const matches = content.matchAll(pattern.pattern);
        const matchArray = Array.from(matches);
        
        if (matchArray.length > 0) {
          findings.patterns[key].count += matchArray.length;
          findings.patterns[key].files.add(relativePath);
          
          // Store examples (up to 3 per pattern per file)
          const examples = matchArray.slice(0, 3).map(match => ({
            file: relativePath,
            line: this.getLineNumber(content, match.index),
            match: match[0],
            context: this.getContext(content, match.index)
          }));
          
          findings.patterns[key].examples.push(...examples.slice(0, 3));
          
          fileFindings.push({
            pattern: key,
            count: matchArray.length,
            severity: pattern.severity,
            examples
          });
          
          // Update severity counts
          findings.summary[pattern.severity.toLowerCase()] += matchArray.length;
        }
      }
      
      if (fileFindings.length > 0) {
        findings.fileFindings.set(relativePath, fileFindings);
      }
      
    } catch (error) {
      findings.skippedFiles++;
      if (options.verbose) {
        console.error(`Error scanning ${filePath}: ${error.message}`);
      }
    }
  }

  shouldScanDirectory(dirName, options) {
    const excludeDirs = options.excludeDirs || ['node_modules', '.git', 'dist', 'build'];
    return !excludeDirs.includes(dirName) && !dirName.startsWith('.');
  }

  shouldScanFile(fileName, options) {
    const includeExts = options.includeExts || ['.js', '.ts', '.jsx', '.tsx'];
    return includeExts.some(ext => fileName.endsWith(ext));
  }

  getLineNumber(content, index) {
    return content.substring(0, index).split('\n').length;
  }

  getContext(content, index, contextSize = 50) {
    const start = Math.max(0, index - contextSize);
    const end = Math.min(content.length, index + contextSize);
    return content.substring(start, end).replace(/\s+/g, ' ').trim();
  }

  generateReport(findings) {
    const report = {
      summary: {
        totalFiles: findings.totalFiles,
        scannedFiles: findings.scannedFiles,
        affectedFiles: findings.fileFindings.size,
        hardcodePercentage: ((findings.fileFindings.size / findings.scannedFiles) * 100).toFixed(2),
        severityCounts: findings.summary,
        totalFindings: Object.values(findings.summary).reduce((a, b) => a + b, 0)
      },
      patterns: {},
      topFiles: [],
      recommendations: []
    };
    
    // Process pattern data
    for (const [key, data] of Object.entries(findings.patterns)) {
      report.patterns[key] = {
        description: this.patterns[key].description,
        severity: this.patterns[key].severity,
        count: data.count,
        fileCount: data.files.size,
        files: Array.from(data.files),
        examples: data.examples.slice(0, 5)
      };
    }
    
    // Find top affected files
    const fileCounts = new Map();
    for (const [file, fileData] of findings.fileFindings) {
      const totalCount = fileData.reduce((sum, item) => sum + item.count, 0);
      fileCounts.set(file, totalCount);
    }
    
    report.topFiles = Array.from(fileCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([file, count]) => ({ file, count }));
    
    // Generate recommendations
    report.recommendations = this.generateRecommendations(report);
    
    return report;
  }

  generateRecommendations(report) {
    const recommendations = [];
    
    if (report.summary.severityCounts.critical > 0) {
      recommendations.push({
        priority: 'IMMEDIATE',
        issue: 'Critical security patterns found',
        action: 'Remove hardcoded API keys and secrets immediately'
      });
    }
    
    if (report.patterns.workflows.count > 10) {
      recommendations.push({
        priority: 'HIGH',
        issue: `${report.patterns.workflows.count} hardcoded workflows found`,
        action: 'Implement dynamic workflow discovery from OpenAPI specs'
      });
    }
    
    if (report.patterns.apiEndpoints.count > 0) {
      recommendations.push({
        priority: 'HIGH',
        issue: `${report.patterns.apiEndpoints.count} hardcoded API endpoints`,
        action: 'Move endpoints to configuration or derive from specs'
      });
    }
    
    if (report.summary.hardcodePercentage > 50) {
      recommendations.push({
        priority: 'MEDIUM',
        issue: `${report.summary.hardcodePercentage}% of files contain hardcoding`,
        action: 'Plan systematic refactoring to reduce technical debt'
      });
    }
    
    return recommendations;
  }
}

export default HardcodeScanner;