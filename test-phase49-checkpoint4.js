#!/usr/bin/env node

/**
 * Phase 4.9 Checkpoint 4 Test: Learning & Memory System
 * Tests the system's ability to learn from successful workflows and recall patterns
 */

import { logger } from './src/utils/logger.js';
import { ApiRegistry } from './src/registry/api-registry.js';
import { CompositionCoordinator } from './src/composition/composition-coordinator.js';
import { ApiCatalogProvider } from './src/composition/api-catalog-provider.js';
import { ClaudeWorkflowComposer } from './src/composition/claude-workflow-composer.js';
import { WorkflowPlanParser } from './src/composition/workflow-plan-parser.js';
import { DynamicWorkflowExecutor } from './src/execution/dynamic-workflow-executor.js';
import { DataFlowManager } from './src/execution/data-flow-manager.js';
import { WorkflowOrchestrator } from './src/execution/workflow-orchestrator.js';
import { AdaptiveErrorRecovery } from './src/execution/adaptive-error-recovery.js';
import { AiResponseSynthesizer } from './src/fusion/ai-response-synthesizer.js';
import { ContextFusionEngine } from './src/fusion/context-fusion-engine.js';
import { InsightGenerator } from './src/fusion/insight-generator.js';
import { AdaptiveFormatter } from './src/fusion/adaptive-formatter.js';
// New Checkpoint 4 components
import { WorkflowMemoryManager } from './src/learning/workflow-memory-manager.js';
import { PatternRecognizer } from './src/learning/pattern-recognizer.js';
import { SuccessMetricsTracker } from './src/learning/success-metrics-tracker.js';
import { AdaptiveLearner } from './src/learning/adaptive-learner.js';

/**
 * Test Suite for Phase 4.9 Checkpoint 4
 */
class Phase49Checkpoint4Test {
  constructor() {
    this.testResults = [];
    this.components = {};
  }

  async runAllTests() {
    console.log('\n🚀 Phase 4.9 Checkpoint 4: Learning & Memory System Tests\n');
    
    try {
      // Initialize components
      await this.initializeComponents();
      
      // Run test suite
      await this.testWorkflowMemoryManager();
      await this.testPatternRecognizer();
      await this.testSuccessMetricsTracker();
      await this.testAdaptiveLearner();
      await this.testEndToEndLearning();
      
      // Generate results
      this.generateTestReport();
      
    } catch (error) {
      console.error('❌ Test suite failed:', error.message);
      process.exit(1);
    }
  }

  async initializeComponents() {
    console.log('📋 Initializing Phase 4.9 Checkpoint 4 components...');
    
    try {
      // Initialize existing components
      this.components.registry = new ApiRegistry();
      await this.components.registry.initialize();
      
      this.components.catalogProvider = new ApiCatalogProvider(this.components.registry);
      this.components.workflowComposer = new ClaudeWorkflowComposer();
      this.components.planParser = new WorkflowPlanParser();
      this.components.coordinator = new CompositionCoordinator(
        this.components.catalogProvider,
        this.components.workflowComposer,
        this.components.planParser
      );
      
      this.components.dataFlowManager = new DataFlowManager();
      this.components.errorRecovery = new AdaptiveErrorRecovery();
      this.components.orchestrator = new WorkflowOrchestrator(
        this.components.dataFlowManager,
        this.components.errorRecovery
      );
      this.components.executor = new DynamicWorkflowExecutor(
        this.components.registry,
        this.components.orchestrator
      );
      
      this.components.responseSynthesizer = new AiResponseSynthesizer();
      this.components.contextFusion = new ContextFusionEngine();
      this.components.insightGenerator = new InsightGenerator();
      this.components.adaptiveFormatter = new AdaptiveFormatter();
      
      // Initialize new Checkpoint 4 components
      this.components.memoryManager = new WorkflowMemoryManager();
      this.components.patternRecognizer = new PatternRecognizer();
      this.components.metricsTracker = new SuccessMetricsTracker();
      this.components.adaptiveLearner = new AdaptiveLearner(
        this.components.memoryManager,
        this.components.patternRecognizer,
        this.components.metricsTracker
      );
      
      console.log('✅ All Checkpoint 4 components initialized');
      
    } catch (error) {
      console.error('❌ Component initialization failed:', error.message);
      throw error;
    }
  }

  async testWorkflowMemoryManager() {
    console.log('\n🧪 Testing Workflow Memory Manager...');
    
    try {
      // Test 1: Store successful workflow execution
      const successfulWorkflow = {
        id: 'workflow_test_001',
        userIntent: 'check my balance and weather together',
        pattern: 'financial_weather_overview',
        plan: {
          steps: [
            { operation: 'get_banking_getBalance', dependencies: [] },
            { operation: 'getCurrentWeather', dependencies: [] }
          ]
        },
        executionResults: {
          success: true,
          duration: 1250,
          dataQuality: 0.95
        },
        userFeedback: {
          satisfaction: 'positive',
          rating: 5
        }
      };
      
      await this.components.memoryManager.storeWorkflow(successfulWorkflow);
      console.log('✅ Stored successful workflow execution');
      
      // Test 2: Recall similar workflows
      const similarIntent = 'show me my account balance and current weather';
      const recalledWorkflows = await this.components.memoryManager.recallSimilarWorkflows(
        similarIntent,
        { threshold: 0.5 }
      );
      
      this.assert(recalledWorkflows && recalledWorkflows.length > 0, 'Should recall similar workflows');
      console.log(`✅ Recalled ${recalledWorkflows.length} similar workflows`);
      
      // Test 3: Get workflow statistics
      const stats = await this.components.memoryManager.getWorkflowStatistics();
      this.assert(stats && stats.totalWorkflows >= 1, 'Should have workflow statistics');
      console.log(`✅ Workflow statistics: ${stats.totalWorkflows} total workflows`);
      
      // Test 4: Memory optimization (remove old/unused workflows)
      const beforeOptimization = await this.components.memoryManager.getMemoryUsage();
      await this.components.memoryManager.optimizeMemory({ 
        maxAge: 30, // days
        minSuccessRate: 0.5 
      });
      const afterOptimization = await this.components.memoryManager.getMemoryUsage();
      
      console.log(`✅ Memory optimization: ${beforeOptimization.size} → ${afterOptimization.size} bytes`);
      
      this.recordTest('Workflow Memory Manager', 'PASS', 'All memory management tests passed');
      
    } catch (error) {
      this.recordTest('Workflow Memory Manager', 'FAIL', error.message);
      throw error;
    }
  }

  async testPatternRecognizer() {
    console.log('\n🧪 Testing Pattern Recognizer...');
    
    try {
      // Test 1: Identify patterns from user intents
      const userIntents = [
        'check my balance and weather',
        'show me account balance with current weather',
        'balance and weather report',
        'what is my balance and how is the weather',
        'financial status and weather conditions'
      ];
      
      const patterns = await this.components.patternRecognizer.identifyPatterns(userIntents);
      this.assert(patterns && patterns.length > 0, 'Should identify intent patterns');
      console.log(`✅ Identified ${patterns.length} patterns from user intents`);
      
      // Test 2: Recognize workflow sequences
      const workflowSequences = [
        ['getBalance', 'getCurrentWeather', 'generateInsights'],
        ['getBalance', 'getCurrentWeather', 'formatReport'],
        ['checkAccount', 'getWeather', 'createSummary'],
        ['getBalance', 'getCurrentWeather', 'generateInsights']
      ];
      
      const sequencePatterns = await this.components.patternRecognizer.recognizeSequencePatterns(
        workflowSequences
      );
      
      this.assert(sequencePatterns && sequencePatterns.commonSequences, 'Should recognize common sequences');
      console.log(`✅ Found ${sequencePatterns.commonSequences.length} common workflow sequences`);
      
      // Test 3: Extract API combination patterns
      const apiCombinations = [
        { apis: ['banking', 'weather'], success: 0.9, usage: 150 },
        { apis: ['banking', 'currency'], success: 0.85, usage: 120 },
        { apis: ['weather', 'news'], success: 0.75, usage: 80 },
        { apis: ['banking', 'weather', 'currency'], success: 0.95, usage: 200 }
      ];
      
      const combinationInsights = await this.components.patternRecognizer.analyzeCombinationPatterns(
        apiCombinations
      );
      
      this.assert(combinationInsights && combinationInsights.topCombinations, 'Should analyze API combinations');
      console.log(`✅ Top API combinations: ${combinationInsights.topCombinations.length}`);
      
      // Test 4: Temporal pattern analysis
      const temporalData = [
        { pattern: 'morning_financial_check', hour: 8, dayOfWeek: 1, frequency: 0.8 },
        { pattern: 'evening_weather_check', hour: 18, dayOfWeek: 1, frequency: 0.7 },
        { pattern: 'weekend_planning', hour: 10, dayOfWeek: 6, frequency: 0.9 }
      ];
      
      const temporalPatterns = await this.components.patternRecognizer.analyzeTemporalPatterns(
        temporalData
      );
      
      this.assert(temporalPatterns && temporalPatterns.patterns, 'Should analyze temporal patterns');
      console.log(`✅ Temporal patterns identified: ${temporalPatterns.patterns.length}`);
      
      this.recordTest('Pattern Recognizer', 'PASS', 'All pattern recognition tests passed');
      
    } catch (error) {
      this.recordTest('Pattern Recognizer', 'FAIL', error.message);
      throw error;
    }
  }

  async testSuccessMetricsTracker() {
    console.log('\n🧪 Testing Success Metrics Tracker...');
    
    try {
      // Test 1: Track workflow execution metrics
      const executionMetrics = {
        workflowId: 'wf_001',
        startTime: Date.now() - 2000,
        endTime: Date.now(),
        success: true,
        apiCalls: 3,
        dataPoints: 15,
        userSatisfaction: 4.5
      };
      
      await this.components.metricsTracker.trackExecution(executionMetrics);
      console.log('✅ Tracked workflow execution metrics');
      
      // Test 2: Calculate success rates
      const successRates = await this.components.metricsTracker.calculateSuccessRates({
        timeframe: '7d',
        groupBy: 'pattern'
      });
      
      this.assert(successRates && typeof successRates.overall === 'number', 'Should calculate success rates');
      console.log(`✅ Overall success rate: ${(successRates.overall * 100).toFixed(1)}%`);
      
      // Test 3: Performance benchmarking
      const benchmarks = await this.components.metricsTracker.getBenchmarks();
      this.assert(benchmarks && benchmarks.avgExecutionTime, 'Should provide performance benchmarks');
      console.log(`✅ Average execution time: ${benchmarks.avgExecutionTime}ms`);
      
      // Test 4: User satisfaction analysis
      const satisfactionData = [
        { workflowId: 'wf_001', rating: 5, feedback: 'excellent' },
        { workflowId: 'wf_002', rating: 4, feedback: 'good' },
        { workflowId: 'wf_003', rating: 5, feedback: 'perfect' },
        { workflowId: 'wf_004', rating: 3, feedback: 'okay' }
      ];
      
      for (const data of satisfactionData) {
        await this.components.metricsTracker.trackUserSatisfaction(data);
      }
      
      const satisfactionAnalysis = await this.components.metricsTracker.analyzeSatisfaction();
      this.assert(satisfactionAnalysis && satisfactionAnalysis.avgRating, 'Should analyze user satisfaction');
      console.log(`✅ Average user satisfaction: ${satisfactionAnalysis.avgRating.toFixed(1)}/5`);
      
      // Test 5: Generate improvement recommendations
      const recommendations = await this.components.metricsTracker.generateImprovementRecommendations();
      this.assert(Array.isArray(recommendations), 'Should generate improvement recommendations');
      console.log(`✅ Generated ${recommendations.length} improvement recommendations`);
      
      this.recordTest('Success Metrics Tracker', 'PASS', 'All metrics tracking tests passed');
      
    } catch (error) {
      this.recordTest('Success Metrics Tracker', 'FAIL', error.message);
      throw error;
    }
  }

  async testAdaptiveLearner() {
    console.log('\n🧪 Testing Adaptive Learner...');
    
    try {
      // Test 1: Learn from successful workflow
      const successfulExecution = {
        workflow: {
          id: 'wf_success_001',
          intent: 'check balance and weather for planning',
          plan: {
            steps: [
              { operation: 'getBalance', params: {} },
              { operation: 'getWeather', params: {} },
              { operation: 'generateInsights', params: {} }
            ]
          }
        },
        results: {
          success: true,
          executionTime: 1500,
          dataQuality: 0.92,
          userRating: 5
        }
      };
      
      await this.components.adaptiveLearner.learnFromExecution(successfulExecution);
      console.log('✅ Learned from successful workflow execution');
      
      // Test 2: Improve workflow suggestions
      const userIntent = 'I want to see my financial status and weather forecast';
      const improvedSuggestion = await this.components.adaptiveLearner.suggestOptimalWorkflow(
        userIntent
      );
      
      this.assert(improvedSuggestion && improvedSuggestion.workflow, 'Should suggest optimal workflow');
      this.assert(improvedSuggestion.confidence > 0, 'Should have confidence score');
      console.log(`✅ Suggested optimal workflow with ${(improvedSuggestion.confidence * 100).toFixed(0)}% confidence`);
      
      // Test 3: Adapt to user preferences
      const userPreferences = {
        userId: 'user_001',
        preferences: {
          preferredFormat: 'executive_summary',
          dataDetail: 'high',
          responseTime: 'fast',
          accuracy: 'high'
        },
        history: [
          { pattern: 'financial_overview', satisfaction: 5 },
          { pattern: 'weather_report', satisfaction: 4 },
          { pattern: 'comprehensive_analysis', satisfaction: 3 }
        ]
      };
      
      await this.components.adaptiveLearner.adaptToUserPreferences(userPreferences);
      console.log('✅ Adapted to user preferences');
      
      // Test 4: Continuous improvement
      const improvementCycle = await this.components.adaptiveLearner.runImprovementCycle();
      this.assert(improvementCycle && improvementCycle.improvements, 'Should run improvement cycle');
      console.log(`✅ Improvement cycle completed: ${improvementCycle.improvements.length} improvements`);
      
      // Test 5: Knowledge consolidation
      const knowledge = await this.components.adaptiveLearner.consolidateKnowledge();
      this.assert(knowledge && knowledge.patterns, 'Should consolidate learned knowledge');
      console.log(`✅ Knowledge consolidated: ${knowledge.patterns.length} patterns, ${knowledge.rules.length} rules`);
      
      this.recordTest('Adaptive Learner', 'PASS', 'All adaptive learning tests passed');
      
    } catch (error) {
      this.recordTest('Adaptive Learner', 'FAIL', error.message);
      throw error;
    }
  }

  async testEndToEndLearning() {
    console.log('\n🧪 Testing End-to-End Learning System...');
    
    try {
      // Test 1: Complete learning cycle
      console.log('📝 Testing complete learning cycle...');
      
      // Simulate multiple workflow executions
      const workflowExecutions = [
        {
          intent: 'show me my balance and weather',
          pattern: 'financial_weather',
          success: true,
          satisfaction: 5,
          executionTime: 1200
        },
        {
          intent: 'check account status with weather forecast',
          pattern: 'financial_weather',
          success: true,
          satisfaction: 4,
          executionTime: 1400
        },
        {
          intent: 'balance overview and current conditions',
          pattern: 'financial_weather',
          success: true,
          satisfaction: 5,
          executionTime: 1100
        },
        {
          intent: 'financial summary with exchange rates',
          pattern: 'financial_currency',
          success: true,
          satisfaction: 4,
          executionTime: 1600
        }
      ];
      
      // Process each execution through the learning system
      for (const execution of workflowExecutions) {
        // Store in memory
        await this.components.memoryManager.storeWorkflow({
          id: `wf_${Date.now()}_${Math.random()}`,
          userIntent: execution.intent,
          pattern: execution.pattern,
          executionResults: {
            success: execution.success,
            duration: execution.executionTime
          },
          userFeedback: {
            rating: execution.satisfaction
          }
        });
        
        // Track metrics
        await this.components.metricsTracker.trackExecution({
          success: execution.success,
          userSatisfaction: execution.satisfaction,
          executionTime: execution.executionTime
        });
        
        // Learn from execution
        await this.components.adaptiveLearner.learnFromExecution({
          workflow: { intent: execution.intent, pattern: execution.pattern },
          results: {
            success: execution.success,
            executionTime: execution.executionTime,
            userRating: execution.satisfaction
          }
        });
      }
      
      console.log('✅ Processed multiple workflow executions');
      
      // Test 2: Pattern emergence
      console.log('📝 Testing pattern emergence...');
      
      const emergentPatterns = await this.components.patternRecognizer.identifyPatterns(
        workflowExecutions.map(e => e.intent)
      );
      
      this.assert(emergentPatterns.length > 0, 'Should identify emergent patterns');
      console.log(`✅ Identified ${emergentPatterns.length} emergent patterns`);
      
      // Test 3: Optimization suggestions
      console.log('📝 Testing optimization suggestions...');
      
      const newIntent = 'I need my financial overview with weather data';
      const optimizedWorkflow = await this.components.adaptiveLearner.suggestOptimalWorkflow(
        newIntent
      );
      
      this.assert(optimizedWorkflow.confidence > 0.4, 'Should suggest with reasonable confidence');
      console.log(`✅ Suggested optimized workflow with ${(optimizedWorkflow.confidence * 100).toFixed(0)}% confidence`);
      
      // Test 4: System performance improvement
      console.log('📝 Testing system performance improvement...');
      
      const initialMetrics = await this.components.metricsTracker.getBenchmarks();
      const improvementPlan = await this.components.adaptiveLearner.runImprovementCycle();
      
      console.log('📊 Learning System Metrics:');
      console.log(`   - Workflows learned: ${workflowExecutions.length}`);
      console.log(`   - Average execution time: ${initialMetrics.avgExecutionTime}ms`);
      console.log(`   - Success rate: ${(initialMetrics.successRate * 100).toFixed(1)}%`);
      console.log(`   - Improvements identified: ${improvementPlan.improvements.length}`);
      
      this.recordTest('End-to-End Learning', 'PASS', 'All learning system tests passed');
      
    } catch (error) {
      this.recordTest('End-to-End Learning', 'FAIL', error.message);
      throw error;
    }
  }

  assert(condition, message) {
    if (!condition) {
      throw new Error(`Assertion failed: ${message}`);
    }
  }

  recordTest(testName, status, details) {
    this.testResults.push({
      test: testName,
      status,
      details,
      timestamp: new Date().toISOString()
    });
  }

  generateTestReport() {
    console.log('\n📊 Phase 4.9 Checkpoint 4 Test Results\n');
    
    const passed = this.testResults.filter(r => r.status === 'PASS').length;
    const failed = this.testResults.filter(r => r.status === 'FAIL').length;
    
    this.testResults.forEach(result => {
      const icon = result.status === 'PASS' ? '✅' : '❌';
      console.log(`${icon} ${result.test}: ${result.details}`);
    });
    
    console.log(`\n📈 Summary: ${passed} passed, ${failed} failed`);
    
    if (failed === 0) {
      console.log('\n🎉 All Checkpoint 4 tests passed! Ready for implementation.');
    } else {
      console.log('\n⚠️ Some tests failed. Fix issues before proceeding.');
      process.exit(1);
    }
  }
}

// Run tests if this file is executed directly
if (import.meta.url === new URL(process.argv[1], 'file://').href) {
  const test = new Phase49Checkpoint4Test();
  test.runAllTests().catch(console.error);
}

export { Phase49Checkpoint4Test };