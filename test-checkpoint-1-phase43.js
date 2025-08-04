#!/usr/bin/env node

/**
 * Phase 4.3 - Checkpoint 1: Codebase Hardcode Analysis
 * 
 * This test analyzes the Phoenix-ME codebase to identify:
 * 1. Hardcoded workflows and operations
 * 2. API-specific logic embedded in code
 * 3. Component coupling and dependencies
 * 4. Technical debt metrics
 * 
 * CRITICAL: This checkpoint requires USER PERMISSION before proceeding to Checkpoint 2
 */

import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Test results collector
const results = {
  passed: 0,
  failed: 0,
  checkpointComplete: false
};

// Hardcode patterns to search for
const HARDCODE_PATTERNS = {
  workflows: {
    pattern: /['"](maybank_[^'"]+|location_weather|trip_planning|market_overview|comprehensive_location_info|currency_location|quick_info|test_recovery|transferMoney|monthlyFinancialSummary|accountVerification|transactionHistoryExport)['"]/g,
    description: 'Hardcoded workflow names'
  },
  apiEndpoints: {
    pattern: /https?:\/\/[^\s'"]+|\/banking\/v1\/|\/api\/v[0-9]\//g,
    description: 'Hardcoded API endpoints'
  },
  apiKeys: {
    pattern: /['"](api_key|apiKey|API_KEY|bearer|Authorization)['"]\s*[:=]/g,
    description: 'Hardcoded API key references'
  },
  maybankSpecific: {
    pattern: /maya\.maybank2u\.com\.my|X-APP-PLATFORM|X-APP-VERSION|maya-authorization/g,
    description: 'Maybank-specific hardcoded values'
  },
  operationIds: {
    pattern: /get_banking_|getCurrentWeather|getNews|getCurrency|getLocation/g,
    description: 'Hardcoded operation IDs'
  },
  businessLogic: {
    pattern: /if\s*\([^)]*===\s*['"][^'"]+['"]|switch\s*\([^)]+\)\s*{[^}]*case\s*['"]/g,
    description: 'Hardcoded business logic conditions'
  }
};

// Component coupling analysis
async function analyzeDependencies(directory) {
  const dependencies = new Map();
  const imports = new Map();
  
  async function scanFile(filePath) {
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      const fileName = path.basename(filePath);
      
      // Extract imports
      const importMatches = content.matchAll(/import\s+.*?\s+from\s+['"]([^'"]+)['"]/g);
      const fileImports = [];
      
      for (const match of importMatches) {
        const importPath = match[1];
        if (importPath.startsWith('.')) {
          fileImports.push(importPath);
        }
      }
      
      imports.set(fileName, fileImports);
      
      // Count dependencies
      if (!dependencies.has(fileName)) {
        dependencies.set(fileName, 0);
      }
      
      // Analyze class/function exports that others depend on
      const exportMatches = content.matchAll(/export\s+(class|function|const|default)\s+(\w+)/g);
      for (const match of exportMatches) {
        dependencies.set(fileName, dependencies.get(fileName) + 1);
      }
      
    } catch (error) {
      // Skip files that can't be read
    }
  }
  
  async function scanDirectory(dir) {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      
      if (entry.isDirectory() && !entry.name.includes('node_modules')) {
        await scanDirectory(fullPath);
      } else if (entry.isFile() && entry.name.endsWith('.js')) {
        await scanFile(fullPath);
      }
    }
  }
  
  await scanDirectory(directory);
  
  // Calculate coupling score
  const totalFiles = imports.size;
  let totalImports = 0;
  
  for (const [file, fileImports] of imports) {
    totalImports += fileImports.length;
  }
  
  const averageImports = totalFiles > 0 ? totalImports / totalFiles : 0;
  const couplingScore = Math.min(averageImports / 10, 1); // Normalize to 0-1
  
  return {
    totalFiles,
    totalImports,
    averageImports: averageImports.toFixed(2),
    couplingScore: couplingScore.toFixed(2),
    dependencies,
    imports
  };
}

// Scan codebase for hardcoded patterns
async function scanCodebase(directory) {
  const findings = {
    hardcodedWorkflows: new Set(),
    hardcodedEndpoints: new Set(),
    hardcodedOperations: new Set(),
    apiSpecificLogic: [],
    totalFiles: 0,
    affectedFiles: new Set(),
    patternCounts: {}
  };
  
  // Initialize pattern counts
  for (const key of Object.keys(HARDCODE_PATTERNS)) {
    findings.patternCounts[key] = 0;
  }
  
  async function scanFile(filePath) {
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      const relativePath = path.relative(__dirname, filePath);
      findings.totalFiles++;
      
      let fileHasHardcode = false;
      
      // Check each pattern
      for (const [key, pattern] of Object.entries(HARDCODE_PATTERNS)) {
        const matches = content.match(pattern.pattern);
        if (matches && matches.length > 0) {
          fileHasHardcode = true;
          findings.patternCounts[key] += matches.length;
          
          // Collect specific findings
          if (key === 'workflows') {
            matches.forEach(match => {
              const workflowName = match.replace(/['"]/g, '');
              findings.hardcodedWorkflows.add(workflowName);
            });
          } else if (key === 'apiEndpoints') {
            matches.forEach(match => {
              if (match.includes('http')) {
                findings.hardcodedEndpoints.add(match);
              }
            });
          } else if (key === 'operationIds') {
            matches.forEach(match => {
              findings.hardcodedOperations.add(match);
            });
          }
          
          // Record API-specific logic
          if (key === 'maybankSpecific' || key === 'businessLogic') {
            findings.apiSpecificLogic.push({
              file: relativePath,
              pattern: key,
              count: matches.length,
              samples: matches.slice(0, 3) // First 3 examples
            });
          }
        }
      }
      
      if (fileHasHardcode) {
        findings.affectedFiles.add(relativePath);
      }
      
    } catch (error) {
      // Skip files that can't be read
    }
  }
  
  async function scanDirectory(dir) {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      
      if (entry.isDirectory() && !entry.name.includes('node_modules') && !entry.name.startsWith('.')) {
        await scanDirectory(fullPath);
      } else if (entry.isFile() && entry.name.endsWith('.js')) {
        await scanFile(fullPath);
      }
    }
  }
  
  await scanDirectory(directory);
  
  return {
    ...findings,
    hardcodedWorkflows: Array.from(findings.hardcodedWorkflows),
    hardcodedEndpoints: Array.from(findings.hardcodedEndpoints),
    hardcodedOperations: Array.from(findings.hardcodedOperations),
    affectedFiles: Array.from(findings.affectedFiles)
  };
}

// Calculate technical debt metrics
async function calculateTechnicalDebt(scanResults, dependencyAnalysis) {
  const totalPatterns = Object.values(scanResults.patternCounts).reduce((a, b) => a + b, 0);
  const hardcodePercentage = scanResults.totalFiles > 0 
    ? ((scanResults.affectedFiles.length / scanResults.totalFiles) * 100).toFixed(2)
    : 0;
  
  const recommendations = [];
  
  // Generate recommendations based on findings
  if (scanResults.hardcodedWorkflows.length > 5) {
    recommendations.push({
      severity: 'HIGH',
      area: 'Workflows',
      issue: `${scanResults.hardcodedWorkflows.length} hardcoded workflows found`,
      recommendation: 'Implement dynamic workflow registry based on OpenAPI specs'
    });
  }
  
  if (scanResults.hardcodedEndpoints.length > 0) {
    recommendations.push({
      severity: 'HIGH',
      area: 'API Endpoints',
      issue: `${scanResults.hardcodedEndpoints.length} hardcoded API endpoints found`,
      recommendation: 'Move endpoints to configuration or derive from OpenAPI specs'
    });
  }
  
  if (parseFloat(dependencyAnalysis.couplingScore) > 0.7) {
    recommendations.push({
      severity: 'MEDIUM',
      area: 'Component Coupling',
      issue: `High coupling score: ${dependencyAnalysis.couplingScore}`,
      recommendation: 'Refactor to reduce inter-component dependencies'
    });
  }
  
  if (scanResults.apiSpecificLogic.length > 10) {
    recommendations.push({
      severity: 'HIGH',
      area: 'API-Specific Logic',
      issue: `${scanResults.apiSpecificLogic.length} files contain API-specific logic`,
      recommendation: 'Abstract API-specific logic into adapters or plugins'
    });
  }
  
  const debtScore = {
    hardcodePercentage: parseFloat(hardcodePercentage),
    totalPatterns,
    affectedFiles: scanResults.affectedFiles.length,
    couplingScore: parseFloat(dependencyAnalysis.couplingScore),
    recommendations,
    metrics: {
      workflows: scanResults.hardcodedWorkflows.length,
      endpoints: scanResults.hardcodedEndpoints.length,
      operations: scanResults.hardcodedOperations.length,
      apiSpecificFiles: scanResults.apiSpecificLogic.length
    }
  };
  
  return debtScore;
}

// Test 1: Scanner identifies all known hardcoded workflows
async function testHardcodedWorkflowDetection() {
  console.log('\n🧪 Test 1: Hardcoded Workflow Detection');
  console.log('=====================================');
  
  try {
    const analysis = await scanCodebase(path.join(__dirname, 'src'));
    
    const expectedWorkflows = [
      'maybank_financial_overview',
      'maybank_mae_focus',
      'maybank_account_comparison',
      'maybank_quick_balance',
      'maybank_health_check',
      'location_weather',
      'trip_planning'
    ];
    
    const foundExpected = expectedWorkflows.filter(w => 
      analysis.hardcodedWorkflows.includes(w)
    );
    
    console.log(`✅ Found ${foundExpected.length}/${expectedWorkflows.length} expected workflows`);
    console.log(`📊 Total hardcoded workflows: ${analysis.hardcodedWorkflows.length}`);
    console.log(`📁 Files with hardcoded patterns: ${analysis.affectedFiles.length}/${analysis.totalFiles}`);
    
    // Show pattern distribution
    console.log('\n📈 Pattern Distribution:');
    for (const [pattern, count] of Object.entries(analysis.patternCounts)) {
      console.log(`   ${HARDCODE_PATTERNS[pattern].description}: ${count}`);
    }
    
    if (foundExpected.length >= expectedWorkflows.length * 0.8) {
      console.log('\n✅ PASSED: Workflow detection working correctly');
      results.passed++;
      return analysis;
    } else {
      throw new Error('Failed to detect expected workflows');
    }
    
  } catch (error) {
    console.log(`\n❌ FAILED: ${error.message}`);
    results.failed++;
    return null;
  }
}

// Test 2: Dependency analyzer maps component relationships
async function testDependencyAnalysis() {
  console.log('\n🧪 Test 2: Component Dependency Analysis');
  console.log('======================================');
  
  try {
    const deps = await analyzeDependencies(path.join(__dirname, 'src'));
    
    console.log(`📊 Analysis Results:`);
    console.log(`   Total files analyzed: ${deps.totalFiles}`);
    console.log(`   Total imports: ${deps.totalImports}`);
    console.log(`   Average imports per file: ${deps.averageImports}`);
    console.log(`   Coupling score: ${deps.couplingScore} (lower is better)`);
    
    // Show most imported files
    const importCounts = new Map();
    for (const [file, imports] of deps.imports) {
      for (const imp of imports) {
        const importedFile = path.basename(imp);
        importCounts.set(importedFile, (importCounts.get(importedFile) || 0) + 1);
      }
    }
    
    const sortedImports = Array.from(importCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);
    
    console.log('\n🔗 Most imported modules:');
    for (const [file, count] of sortedImports) {
      console.log(`   ${file}: ${count} imports`);
    }
    
    if (deps.couplingScore < 0.8) {
      console.log('\n✅ PASSED: Coupling score within acceptable range');
      results.passed++;
      return deps;
    } else {
      throw new Error('Coupling score too high');
    }
    
  } catch (error) {
    console.log(`\n❌ FAILED: ${error.message}`);
    results.failed++;
    return null;
  }
}

// Test 3: Technical debt score calculation
async function testTechnicalDebtCalculation() {
  console.log('\n🧪 Test 3: Technical Debt Calculation');
  console.log('====================================');
  
  try {
    const scanResults = await scanCodebase(path.join(__dirname, 'src'));
    const deps = await analyzeDependencies(path.join(__dirname, 'src'));
    const debtScore = await calculateTechnicalDebt(scanResults, deps);
    
    console.log(`📊 Technical Debt Metrics:`);
    console.log(`   Hardcode percentage: ${debtScore.hardcodePercentage}%`);
    console.log(`   Total patterns found: ${debtScore.totalPatterns}`);
    console.log(`   Affected files: ${debtScore.affectedFiles}`);
    console.log(`   Coupling score: ${debtScore.couplingScore}`);
    
    console.log('\n🔍 Breakdown by category:');
    for (const [key, value] of Object.entries(debtScore.metrics)) {
      console.log(`   ${key}: ${value}`);
    }
    
    console.log(`\n💡 Recommendations (${debtScore.recommendations.length}):`);
    for (const rec of debtScore.recommendations) {
      console.log(`   [${rec.severity}] ${rec.area}: ${rec.issue}`);
      console.log(`   → ${rec.recommendation}`);
    }
    
    if (debtScore.hardcodePercentage > 0 && debtScore.recommendations.length > 0) {
      console.log('\n✅ PASSED: Technical debt analysis completed');
      results.passed++;
      return debtScore;
    } else {
      throw new Error('Technical debt analysis incomplete');
    }
    
  } catch (error) {
    console.log(`\n❌ FAILED: ${error.message}`);
    results.failed++;
    return null;
  }
}

// Test 4: API-specific logic identification
async function testAPISpecificLogic() {
  console.log('\n🧪 Test 4: API-Specific Logic Detection');
  console.log('======================================');
  
  try {
    const analysis = await scanCodebase(path.join(__dirname, 'src'));
    
    console.log(`📊 API-Specific Logic Found:`);
    console.log(`   Files with API logic: ${analysis.apiSpecificLogic.length}`);
    console.log(`   Maybank-specific patterns: ${analysis.patternCounts.maybankSpecific}`);
    console.log(`   Business logic conditions: ${analysis.patternCounts.businessLogic}`);
    
    // Group by pattern type
    const byPattern = {};
    for (const logic of analysis.apiSpecificLogic) {
      if (!byPattern[logic.pattern]) {
        byPattern[logic.pattern] = [];
      }
      byPattern[logic.pattern].push(logic);
    }
    
    console.log('\n📁 Files with API-specific logic:');
    for (const [pattern, files] of Object.entries(byPattern)) {
      console.log(`\n   ${pattern}:`);
      for (const file of files.slice(0, 5)) {
        console.log(`   - ${file.file} (${file.count} occurrences)`);
        if (file.samples.length > 0) {
          console.log(`     Example: ${file.samples[0].substring(0, 60)}...`);
        }
      }
      if (files.length > 5) {
        console.log(`   ... and ${files.length - 5} more files`);
      }
    }
    
    if (analysis.apiSpecificLogic.length > 0) {
      console.log('\n✅ PASSED: API-specific logic identified');
      results.passed++;
      return true;
    } else {
      throw new Error('No API-specific logic found');
    }
    
  } catch (error) {
    console.log(`\n❌ FAILED: ${error.message}`);
    results.failed++;
    return false;
  }
}

// Generate comprehensive audit report
async function generateAuditReport() {
  console.log('\n📊 Generating Comprehensive Audit Report...');
  console.log('=========================================');
  
  const scanResults = await scanCodebase(path.join(__dirname, 'src'));
  const deps = await analyzeDependencies(path.join(__dirname, 'src'));
  const debtScore = await calculateTechnicalDebt(scanResults, deps);
  
  const report = `# Phase 4.3 Checkpoint 1: Hardcode Analysis Report

Generated: ${new Date().toISOString()}

## Executive Summary

The Phoenix-ME codebase analysis reveals significant hardcoding throughout the system, with ${debtScore.hardcodePercentage}% of files containing hardcoded patterns. This technical debt impacts maintainability and limits the system's ability to dynamically integrate new APIs.

## Key Findings

### 1. Hardcoded Elements
- **Workflows**: ${scanResults.hardcodedWorkflows.length} hardcoded workflow definitions
- **API Endpoints**: ${scanResults.hardcodedEndpoints.length} hardcoded URLs
- **Operations**: ${scanResults.hardcodedOperations.length} hardcoded operation IDs
- **Affected Files**: ${scanResults.affectedFiles.length} out of ${scanResults.totalFiles} files (${debtScore.hardcodePercentage}%)

### 2. Component Coupling
- **Coupling Score**: ${deps.couplingScore} (0 = loosely coupled, 1 = tightly coupled)
- **Average Imports**: ${deps.averageImports} per file
- **Total Dependencies**: ${deps.totalImports}

### 3. API-Specific Logic
- **Files with API logic**: ${scanResults.apiSpecificLogic.length}
- **Maybank-specific patterns**: ${scanResults.patternCounts.maybankSpecific} occurrences
- **Business logic conditions**: ${scanResults.patternCounts.businessLogic} occurrences

## Detailed Analysis

### Hardcoded Workflows
${scanResults.hardcodedWorkflows.map(w => `- ${w}`).join('\n')}

### Most Affected Files
${scanResults.affectedFiles.slice(0, 10).map(f => `- ${f}`).join('\n')}
${scanResults.affectedFiles.length > 10 ? `... and ${scanResults.affectedFiles.length - 10} more files` : ''}

### Pattern Distribution
${Object.entries(scanResults.patternCounts).map(([k, v]) => `- ${HARDCODE_PATTERNS[k].description}: ${v}`).join('\n')}

## Recommendations

${debtScore.recommendations.map(r => `### ${r.area} [${r.severity}]
**Issue**: ${r.issue}
**Recommendation**: ${r.recommendation}
`).join('\n')}

## Technical Debt Score

**Overall Hardcode Percentage**: ${debtScore.hardcodePercentage}%

This represents the percentage of files containing hardcoded patterns that would need refactoring for a fully dynamic system.

## Next Steps

1. **Checkpoint 1 Approval Required**: Review these findings and approve before proceeding
2. **OpenAPI Specification Audit**: Analyze existing specs and design universal registry
3. **Refactoring Strategy**: Develop plan to eliminate hardcoding systematically

---

**Checkpoint 1 Status**: COMPLETE - Awaiting user approval to proceed to Checkpoint 2`;

  // Save report
  const reportPath = path.join(__dirname, 'PHASE43_CHECKPOINT1_AUDIT.md');
  await fs.writeFile(reportPath, report);
  console.log(`\n✅ Report saved to: ${reportPath}`);
  
  return report;
}

// Main test execution
async function runCheckpoint1Tests() {
  console.log('🚀 Phase 4.3 - Checkpoint 1: Codebase Hardcode Analysis');
  console.log('======================================================');
  console.log('Analyzing Phoenix-ME codebase for hardcoded elements...\n');
  
  // Run all tests
  await testHardcodedWorkflowDetection();
  await testDependencyAnalysis();
  await testTechnicalDebtCalculation();
  await testAPISpecificLogic();
  
  // Generate final report
  await generateAuditReport();
  
  // Summary
  console.log('\n📊 Checkpoint 1 Test Summary');
  console.log('===========================');
  console.log(`✅ Passed: ${results.passed}`);
  console.log(`❌ Failed: ${results.failed}`);
  console.log(`📈 Success Rate: ${((results.passed / (results.passed + results.failed)) * 100).toFixed(0)}%`);
  
  if (results.failed === 0) {
    console.log('\n✅ CHECKPOINT 1 COMPLETE: All tests passed!');
    console.log('\n⏸️  USER PERMISSION REQUIRED');
    console.log('================================');
    console.log('Please review the analysis results in PHASE43_CHECKPOINT1_AUDIT.md');
    console.log('Validate the findings accuracy and approve proceeding to Checkpoint 2');
    console.log('\nTo approve, the user must explicitly confirm they have reviewed the audit.');
    results.checkpointComplete = true;
  } else {
    console.log('\n❌ CHECKPOINT 1 INCOMPLETE: Some tests failed');
    console.log('Please fix the issues and run again.');
  }
  
  return results;
}

// Execute tests
runCheckpoint1Tests().catch(console.error);