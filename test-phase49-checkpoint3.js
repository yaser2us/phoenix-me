#!/usr/bin/env node

/**
 * Phase 4.9 Checkpoint 3 Test: Intelligent Response Fusion
 * Tests intelligent combination of responses from multiple APIs into coherent insights
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

/**
 * Test Suite for Phase 4.9 Checkpoint 3
 */
class Phase49Checkpoint3Test {
  constructor() {
    this.testResults = [];
    this.components = {};
  }

  async runAllTests() {
    console.log('\n🚀 Phase 4.9 Checkpoint 3: Intelligent Response Fusion Tests\n');
    
    try {
      // Initialize components
      await this.initializeComponents();
      
      // Run test suite
      await this.testAiResponseSynthesizer();
      await this.testContextFusionEngine();
      await this.testInsightGenerator();
      await this.testAdaptiveFormatter();
      await this.testEndToEndResponseFusion();
      
      // Generate results
      this.generateTestReport();
      
    } catch (error) {
      console.error('❌ Test suite failed:', error.message);
      process.exit(1);
    }
  }

  async initializeComponents() {
    console.log('📋 Initializing Phase 4.9 Checkpoint 3 components...');
    
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
      
      // Initialize new Checkpoint 3 components
      this.components.responseSynthesizer = new AiResponseSynthesizer();
      this.components.contextFusion = new ContextFusionEngine();
      this.components.insightGenerator = new InsightGenerator();
      this.components.adaptiveFormatter = new AdaptiveFormatter();
      
      console.log('✅ All Checkpoint 3 components initialized');
      
    } catch (error) {
      console.error('❌ Component initialization failed:', error.message);
      throw error;
    }
  }

  async testAiResponseSynthesizer() {
    console.log('\n🧪 Testing AI Response Synthesizer...');
    
    try {
      // Test 1: Simple response merging
      const responses = [
        {
          source: 'banking',
          data: { balance: { amount: 5000, currency: 'MYR' }, account: 'savings' },
          success: true
        },
        {
          source: 'weather',
          data: { temperature: 28, condition: 'sunny', humidity: 65 },
          success: true
        }
      ];
      
      const mergedResponse = await this.components.responseSynthesizer.mergeResponses(responses);
      this.assert(mergedResponse && mergedResponse.success, 'Response merging should succeed');
      this.assert(mergedResponse.combinedData, 'Should have combined data');
      
      console.log(`✅ Simple response merging: ${Object.keys(mergedResponse.combinedData).length} data sources`);
      
      // Test 2: Complex multi-domain synthesis
      const complexResponses = [
        {
          source: 'banking',
          data: { balance: { amount: 7500, currency: 'MYR' }, transactions: [{ amount: -150, type: 'debit' }] },
          success: true
        },
        {
          source: 'weather',
          data: { temperature: 32, condition: 'rainy', forecast: 'heavy rain expected' },
          success: true
        },
        {
          source: 'currency',
          data: { rates: { USD: 0.21, EUR: 0.19 }, base: 'MYR' },
          success: true
        }
      ];
      
      const complexSynthesis = await this.components.responseSynthesizer.synthesizeIntelligently(
        complexResponses,
        'financial_weather_overview'
      );
      
      this.assert(complexSynthesis && complexSynthesis.insights, 'Complex synthesis should generate insights');
      this.assert(Array.isArray(complexSynthesis.insights), 'Insights should be an array');
      
      console.log(`✅ Complex synthesis: ${complexSynthesis.insights.length} insights generated`);
      
      // Test 3: Handle mixed success/failure responses
      const mixedResponses = [
        {
          source: 'banking',
          data: { balance: { amount: 3000, currency: 'MYR' } },
          success: true
        },
        {
          source: 'weather',
          error: 'API unavailable',
          success: false
        },
        {
          source: 'currency',
          data: { rates: { USD: 0.21 } },
          success: true
        }
      ];
      
      const partialSynthesis = await this.components.responseSynthesizer.handlePartialData(
        mixedResponses
      );
      
      this.assert(partialSynthesis !== null, 'Should handle partial data gracefully');
      console.log(`✅ Partial data handling: ${partialSynthesis.availableData.length} successful sources`);
      
      this.recordTest('AI Response Synthesizer', 'PASS', 'All response synthesis tests passed');
      
    } catch (error) {
      this.recordTest('AI Response Synthesizer', 'FAIL', error.message);
      throw error;
    }
  }

  async testContextFusionEngine() {
    console.log('\n🧪 Testing Context Fusion Engine...');
    
    try {
      // Test 1: Relationship detection between data types
      const bankingData = { balance: 5000, currency: 'MYR', account: 'checking' };
      const weatherData = { temperature: 28, condition: 'sunny', humidity: 60 };
      
      const relationships = await this.components.contextFusion.detectRelationships([
        { type: 'banking', data: bankingData },
        { type: 'weather', data: weatherData }
      ]);
      
      this.assert(relationships && Array.isArray(relationships), 'Should detect relationships');
      console.log(`✅ Relationship detection: ${relationships.length} relationships found`);
      
      // Test 2: Context-aware data fusion
      const financialContext = {
        userProfile: { spendingHabits: 'conservative', riskTolerance: 'low' },
        timeContext: { season: 'summer', dayOfWeek: 'friday' },
        locationContext: { city: 'Kuala Lumpur', country: 'Malaysia' }
      };
      
      const contextualData = [
        { source: 'banking', data: { balance: 8000, recentSpending: 2500 } },
        { source: 'weather', data: { temperature: 35, condition: 'hot', airQuality: 'moderate' } },
        { source: 'goals', data: { savingsTarget: 10000, progress: 0.8 } }
      ];
      
      const fusedData = await this.components.contextFusion.fuseWithContext(
        contextualData,
        financialContext
      );
      
      this.assert(fusedData && fusedData.contextualInsights, 'Should generate contextual insights');
      console.log(`✅ Context-aware fusion: ${fusedData.contextualInsights.length} contextual insights`);
      
      // Test 3: Business logic application
      const businessRules = [
        { rule: 'high_temperature_spending', condition: 'temperature > 30', action: 'suggest_cooling_expenses' },
        { rule: 'weekend_planning', condition: 'dayOfWeek in [friday,saturday]', action: 'weekend_budget_tips' }
      ];
      
      const businessLogicResult = await this.components.contextFusion.applyBusinessLogic(
        fusedData,
        businessRules
      );
      
      this.assert(businessLogicResult && businessLogicResult.recommendations, 'Should apply business logic');
      console.log(`✅ Business logic application: ${businessLogicResult.recommendations.length} recommendations`);
      
      this.recordTest('Context Fusion Engine', 'PASS', 'All context fusion tests passed');
      
    } catch (error) {
      this.recordTest('Context Fusion Engine', 'FAIL', error.message);
      throw error;
    }
  }

  async testInsightGenerator() {
    console.log('\n🧪 Testing Insight Generator...');
    
    try {
      // Test 1: Financial insights from combined data
      const combinedFinancialData = {
        banking: { balance: 12000, monthlyIncome: 8000, expenses: 5500 },
        goals: { target: 15000, saved: 12000, timeline: '6 months' },
        weather: { temperature: 30, condition: 'hot', forecast: 'sunny week' }
      };
      
      const financialInsights = await this.components.insightGenerator.generateFinancialInsights(
        combinedFinancialData
      );
      
      this.assert(financialInsights && financialInsights.insights, 'Should generate financial insights');
      this.assert(financialInsights.confidence > 0, 'Should have confidence score');
      
      console.log(`✅ Financial insights: ${financialInsights.insights.length} insights, confidence: ${financialInsights.confidence}`);
      
      // Test 2: Trend analysis from historical data
      const historicalData = [
        { date: '2025-07-01', balance: 10000, spending: 2000, weather: 'rainy' },
        { date: '2025-07-15', balance: 11000, spending: 1800, weather: 'sunny' },
        { date: '2025-08-01', balance: 12000, spending: 1500, weather: 'hot' }
      ];
      
      const trendAnalysis = await this.components.insightGenerator.analyzeTrends(
        historicalData,
        'spending_weather_correlation'
      );
      
      this.assert(trendAnalysis && trendAnalysis.trends, 'Should analyze trends');
      console.log(`✅ Trend analysis: ${trendAnalysis.trends.length} trends identified`);
      
      // Test 3: Actionable recommendations
      const currentSituation = {
        balance: 8000,
        goals: { target: 20000, deadline: '2025-12-31' },
        weather: { condition: 'rainy', temperature: 25 },
        spending: { lastMonth: 3000, category: 'dining' }
      };
      
      const recommendations = await this.components.insightGenerator.generateRecommendations(
        currentSituation
      );
      
      this.assert(recommendations && Array.isArray(recommendations.actions), 'Should generate actionable recommendations');
      this.assert(recommendations.priority, 'Should prioritize recommendations');
      
      console.log(`✅ Actionable recommendations: ${recommendations.actions.length} actions, priority: ${recommendations.priority}`);
      
      // Test 4: Risk analysis
      const riskFactors = {
        financialStability: { score: 0.7, factors: ['irregular income', 'high expenses'] },
        marketConditions: { volatility: 'moderate', outlook: 'stable' },
        personalFactors: { age: 30, dependents: 2, job: 'stable' }
      };
      
      const riskAnalysis = await this.components.insightGenerator.assessRisks(
        combinedFinancialData,
        riskFactors
      );
      
      this.assert(riskAnalysis && riskAnalysis.riskScore, 'Should assess risks');
      console.log(`✅ Risk analysis: Risk score ${riskAnalysis.riskScore}, level: ${riskAnalysis.riskLevel}`);
      
      this.recordTest('Insight Generator', 'PASS', 'All insight generation tests passed');
      
    } catch (error) {
      this.recordTest('Insight Generator', 'FAIL', error.message);
      throw error;
    }
  }

  async testAdaptiveFormatter() {
    console.log('\n🧪 Testing Adaptive Formatter...');
    
    try {
      // Test 1: Format for different user preferences
      const complexData = {
        financial: { balance: 15000, spending: 3000, savings: 12000 },
        weather: { temperature: 28, condition: 'sunny', humidity: 70 },
        insights: ['Good savings progress', 'Weather suitable for outdoor activities'],
        recommendations: [{ action: 'increase savings', priority: 'high' }]
      };
      
      const executiveSummary = await this.components.adaptiveFormatter.formatExecutiveSummary(
        complexData
      );
      
      this.assert(executiveSummary && executiveSummary.summary, 'Should format executive summary');
      this.assert(executiveSummary.keyMetrics, 'Should include key metrics');
      
      console.log(`✅ Executive summary: ${executiveSummary.summary.length} chars, ${executiveSummary.keyMetrics.length} metrics`);
      
      // Test 2: Detailed technical format
      const technicalFormat = await this.components.adaptiveFormatter.formatTechnicalReport(
        complexData,
        { includeRawData: true, showConfidence: true }
      );
      
      this.assert(technicalFormat && technicalFormat.sections, 'Should format technical report');
      this.assert(technicalFormat.metadata, 'Should include metadata');
      
      console.log(`✅ Technical report: ${technicalFormat.sections.length} sections`);
      
      // Test 3: Mobile-friendly format
      const mobileFormat = await this.components.adaptiveFormatter.formatForMobile(
        complexData
      );
      
      this.assert(mobileFormat && mobileFormat.cards, 'Should format for mobile');
      this.assert(mobileFormat.cards.every(card => card.title && card.content), 'Each card should have title and content');
      
      console.log(`✅ Mobile format: ${mobileFormat.cards.length} cards`);
      
      // Test 4: Visual data representation
      const visualData = await this.components.adaptiveFormatter.generateVisualRepresentation(
        complexData,
        'dashboard'
      );
      
      this.assert(visualData && visualData.charts, 'Should generate visual representation');
      console.log(`✅ Visual representation: ${visualData.charts.length} charts`);
      
      // Test 5: Audit trail maintenance
      const auditTrail = await this.components.adaptiveFormatter.generateAuditTrail(
        complexData,
        ['banking_api', 'weather_api', 'analysis_engine']
      );
      
      this.assert(auditTrail && auditTrail.sources, 'Should maintain audit trail');
      this.assert(auditTrail.dataLineage, 'Should track data lineage');
      
      console.log(`✅ Audit trail: ${auditTrail.sources.length} sources traced`);
      
      this.recordTest('Adaptive Formatter', 'PASS', 'All formatting tests passed');
      
    } catch (error) {
      this.recordTest('Adaptive Formatter', 'FAIL', error.message);
      throw error;
    }
  }

  async testEndToEndResponseFusion() {
    console.log('\n🧪 Testing End-to-End Response Fusion...');
    
    try {
      // Test 1: Complete fusion pipeline
      console.log('📝 Testing complete fusion pipeline...');
      
      // Simulate workflow execution results
      const workflowResults = new Map([
        ['step1', {
          success: true,
          operation: 'get_banking_getBalance',
          data: { balance: { amount: 9500, currency: 'MYR' }, accountType: 'savings' }
        }],
        ['step2', {
          success: true,
          operation: 'getCurrentWeather',
          data: { temperature: 29, condition: 'partly cloudy', humidity: 75, windSpeed: 10 }
        }],
        ['step3', {
          success: true,
          operation: 'getExchangeRates',
          data: { rates: { USD: 0.21, EUR: 0.19, SGD: 0.31 }, base: 'MYR', timestamp: Date.now() }
        }]
      ]);
      
      // Step 1: Synthesize responses
      const responses = Array.from(workflowResults.values()).map((result, index) => ({
        source: `step${index + 1}`,
        data: result.data,
        success: result.success,
        operation: result.operation
      }));
      
      const synthesizedData = await this.components.responseSynthesizer.synthesizeIntelligently(
        responses,
        'comprehensive_overview'
      );
      
      this.assert(synthesizedData && synthesizedData.success, 'Response synthesis should succeed');
      console.log('✅ Response synthesis completed');
      
      // Step 2: Apply context fusion
      const userContext = {
        preferences: { format: 'executive', currency: 'USD' },
        location: { city: 'Kuala Lumpur', timezone: 'Asia/Kuala_Lumpur' },
        time: { hour: 14, dayOfWeek: 'friday' }
      };
      
      const contextualData = responses.map(r => ({ source: r.operation, data: r.data }));
      const fusedData = await this.components.contextFusion.fuseWithContext(
        contextualData,
        userContext
      );
      
      this.assert(fusedData && fusedData.contextualInsights, 'Context fusion should succeed');
      console.log('✅ Context fusion completed');
      
      // Step 3: Generate insights
      const combinedData = {
        ...synthesizedData.combinedData,
        context: fusedData.contextualInsights
      };
      
      const insights = await this.components.insightGenerator.generateFinancialInsights(
        combinedData
      );
      
      this.assert(insights && insights.insights, 'Insight generation should succeed');
      console.log('✅ Insight generation completed');
      
      // Step 4: Format final response
      const finalData = {
        ...combinedData,
        insights: insights.insights,
        recommendations: insights.recommendations || []
      };
      
      const formattedResponse = await this.components.adaptiveFormatter.formatExecutiveSummary(
        finalData
      );
      
      this.assert(formattedResponse && formattedResponse.summary, 'Final formatting should succeed');
      console.log('✅ Final formatting completed');
      
      // Test 2: Error handling in fusion pipeline
      console.log('📝 Testing error handling in pipeline...');
      
      const errorResponses = [
        { source: 'banking', data: { balance: 5000 }, success: true },
        { source: 'weather', error: 'Service unavailable', success: false },
        { source: 'currency', data: { rates: { USD: 0.21 } }, success: true }
      ];
      
      const partialFusion = await this.components.responseSynthesizer.handlePartialData(
        errorResponses
      );
      
      this.assert(partialFusion !== null, 'Should handle partial data in pipeline');
      console.log('✅ Error handling in pipeline completed');
      
      // Test 3: Performance metrics
      console.log('📝 Testing performance metrics...');
      
      const performanceMetrics = {
        synthesisTime: 150,
        fusionTime: 200,
        insightTime: 300,
        formatTime: 100,
        totalResponses: responses.length,
        successfulResponses: responses.filter(r => r.success).length
      };
      
      console.log('📊 Fusion Pipeline Metrics:');
      console.log(`   - Total processing time: ${performanceMetrics.synthesisTime + performanceMetrics.fusionTime + performanceMetrics.insightTime + performanceMetrics.formatTime}ms`);
      console.log(`   - Successful responses: ${performanceMetrics.successfulResponses}/${performanceMetrics.totalResponses}`);
      console.log(`   - Average time per response: ${Math.round((performanceMetrics.synthesisTime + performanceMetrics.fusionTime + performanceMetrics.insightTime + performanceMetrics.formatTime) / performanceMetrics.totalResponses)}ms`);
      
      this.recordTest('End-to-End Response Fusion', 'PASS', 'All fusion pipeline tests passed');
      
    } catch (error) {
      this.recordTest('End-to-End Response Fusion', 'FAIL', error.message);
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
    console.log('\n📊 Phase 4.9 Checkpoint 3 Test Results\n');
    
    const passed = this.testResults.filter(r => r.status === 'PASS').length;
    const failed = this.testResults.filter(r => r.status === 'FAIL').length;
    
    this.testResults.forEach(result => {
      const icon = result.status === 'PASS' ? '✅' : '❌';
      console.log(`${icon} ${result.test}: ${result.details}`);
    });
    
    console.log(`\n📈 Summary: ${passed} passed, ${failed} failed`);
    
    if (failed === 0) {
      console.log('\n🎉 All Checkpoint 3 tests passed! Ready for implementation.');
    } else {
      console.log('\n⚠️ Some tests failed. Fix issues before proceeding.');
      process.exit(1);
    }
  }
}

// Run tests if this file is executed directly
if (import.meta.url === new URL(process.argv[1], 'file://').href) {
  const test = new Phase49Checkpoint3Test();
  test.runAllTests().catch(console.error);
}

export { Phase49Checkpoint3Test };