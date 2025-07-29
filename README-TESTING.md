# 🧪 MCP API Gateway - Testing Guide

## Phase 4 Smart API Selection & Fallback Systems Testing

This guide provides comprehensive testing prompts for Claude Desktop to validate the Phase 4 implementation of the MCP API Gateway project.

---

## 🚀 Quick Start Testing

### Test 1: Run Complete Checkpoint Validation
```bash
node test-checkpoint-4.js
```

**Expected Output:** All 8 tests should pass with ✅ indicators showing:
- Smart API Selection working
- Quality Scoring functional (6-10 score range)
- Fallback System with circuit breaker active
- Performance Monitoring collecting metrics
- API Comparison and ranking working
- Complete system integration validated

---

## 🎯 Individual Component Testing

### Test 2: Smart API Selection
Test the multi-criteria API selection system:

```javascript
// Create and test SmartSelector
const { SmartSelector } = await import('./src/execution/smart-selector.js');

const mockRegistry = { getAPI: (id) => ({ id, available: true }) };
const selector = new SmartSelector(mockRegistry);

// Test with different priorities
const weatherAPIs = [
  { id: 'openweather', quality: 8, responseTime: 900, cost: 'free' },
  { id: 'weatherapi', quality: 9, responseTime: 650, cost: 'budget' }
];

// Test quality priority
const qualityResult = await selector.selectOptimalAPI('weather', weatherAPIs, { 
  priority: 'quality', 
  budget: 'free' 
});

// Test speed priority  
const speedResult = await selector.selectOptimalAPI('weather', weatherAPIs, { 
  priority: 'speed' 
});

console.log('Quality Priority:', qualityResult.selectedAPI);
console.log('Speed Priority:', speedResult.selectedAPI);
```

**Expected:** Different APIs selected based on priority criteria.

### Test 3: Quality Scoring System
Test the comprehensive response quality analysis:

```javascript
// Test QualityScorer
const { QualityScorer } = await import('./src/execution/quality-scorer.js');

const scorer = new QualityScorer();

// Test weather response quality
const weatherResponse = {
  data: {
    temp: 22.5,
    description: 'sunny',
    humidity: 65,
    pressure: 1013,
    wind_speed: 15,
    timestamp: new Date().toISOString()
  },
  responseTime: 850
};

const score = await scorer.scoreResponse(weatherResponse, 'weather');
console.log(`Weather Quality Score: ${score}/10`);

// Test incomplete response
const incompleteResponse = {
  data: { temp: 20 },
  responseTime: 2000
};

const lowScore = await scorer.scoreResponse(incompleteResponse, 'weather');
console.log(`Incomplete Response Score: ${lowScore}/10`);
```

**Expected:** Complete response scores 7-10, incomplete response scores lower.

### Test 4: Circuit Breaker & Fallback System
Test the fault tolerance mechanisms:

```javascript
// Test FallbackManager with circuit breaker
const { FallbackManager } = await import('./src/execution/fallback-manager.js');

const mockRegistry = { getAPI: (id) => ({ id, available: true }) };

// Create failing executor to test circuit breaker
const failingExecutor = {
  execute: async () => { throw new Error('API failure'); }
};

const fallbackManager = new FallbackManager(mockRegistry, failingExecutor);

// Test repeated failures to trigger circuit breaker
for (let i = 0; i < 6; i++) {
  try {
    const result = await fallbackManager.executeWithFallback(
      { type: 'test', domain: 'test' },
      { primaryAPI: 'test-api' }
    );
    console.log(`Attempt ${i + 1}:`, result.success ? 'Success' : 'Failed');
  } catch (error) {
    console.log(`Attempt ${i + 1}: Error -`, error.message);
  }
}

// Check circuit breaker stats
const stats = fallbackManager.getFallbackStats();
console.log('Circuit Breaker Status:', stats.circuitBreakerStatus);
```

**Expected:** Circuit breaker opens after 5 failures, subsequent calls are blocked.

### Test 5: Performance Monitoring
Test real-time performance metrics collection:

```javascript
// Test PerformanceMonitor
const { PerformanceMonitor } = await import('./src/execution/performance-monitor.js');

const monitor = new PerformanceMonitor();

// Simulate API calls with varying performance
const apiIds = ['openweather', 'weatherapi', 'weatherstack'];

for (let i = 0; i < 20; i++) {
  for (const apiId of apiIds) {
    const responseTime = 500 + Math.random() * 1000;
    const success = Math.random() > 0.1; // 90% success rate
    
    await monitor.recordAPICall(apiId, responseTime, success, {
      operation: 'get_weather',
      domain: 'weather'
    });
  }
}

// Get performance statistics
for (const apiId of apiIds) {
  const stats = await monitor.getAPIStats(apiId);
  console.log(`${apiId}:`, {
    totalCalls: stats.totalCalls,
    avgResponseTime: Math.round(stats.avgResponseTime),
    successRate: `${(stats.successRate * 100).toFixed(1)}%`
  });
}

// Compare API performance
const comparison = await monitor.compareAPIs(apiIds);
console.log('Best Performer:', comparison.bestPerforming.apiId);
```

**Expected:** Detailed performance metrics and rankings for each API.

---

## 🔄 Integration Testing

### Test 6: End-to-End Workflow
Test the complete integrated system:

```javascript
// Complete integration test
const { SmartSelector } = await import('./src/execution/smart-selector.js');
const { QualityScorer } = await import('./src/execution/quality-scorer.js');
const { FallbackManager } = await import('./src/execution/fallback-manager.js');
const { PerformanceMonitor } = await import('./src/execution/performance-monitor.js');

// Initialize all components
const mockRegistry = { getAPI: (id) => ({ id, available: true }) };
const mockExecutor = {
  execute: async (req) => ({
    data: { temp: 22, description: 'sunny' },
    responseTime: 800,
    cached: false
  })
};

const monitor = new PerformanceMonitor();
const selector = new SmartSelector(mockRegistry, monitor);
const scorer = new QualityScorer();
const fallbackManager = new FallbackManager(mockRegistry, mockExecutor);

// End-to-end workflow
const weatherAPIs = [
  { id: 'openweather', quality: 8, responseTime: 900 },
  { id: 'weatherapi', quality: 9, responseTime: 650 }
];

// Step 1: Select optimal API
const selection = await selector.selectOptimalAPI('weather', weatherAPIs, {
  priority: 'balanced'
});

// Step 2: Execute with fallback support
const execution = await fallbackManager.executeWithFallback(
  { type: 'get_weather', domain: 'weather' },
  { primaryAPI: selection.selectedAPI }
);

// Step 3: Score response quality
const qualityScore = await scorer.scoreResponse({
  data: execution.data,
  responseTime: execution.responseTime
}, 'weather');

// Step 4: Record performance
await monitor.recordAPICall(
  selection.selectedAPI,
  execution.responseTime,
  execution.success,
  { operation: 'integration_test' }
);

console.log('Integration Test Results:', {
  selectedAPI: selection.selectedAPI,
  executionSuccess: execution.success,
  qualityScore: qualityScore,
  responseTime: execution.responseTime
});
```

**Expected:** Complete workflow executes successfully with all components working together.

---

## 🎛️ Advanced Testing Scenarios

### Test 7: Quality-Aware Selection
Test API selection based on quality thresholds:

```javascript
// Test quality-aware selection with different thresholds
const weatherAPIs = [
  { id: 'high-quality', quality: 9, responseTime: 1000, cost: 'premium' },
  { id: 'medium-quality', quality: 7, responseTime: 600, cost: 'standard' },
  { id: 'low-quality', quality: 5, responseTime: 400, cost: 'free' }
];

// Test with high quality requirement
const highQualityResult = await selector.selectOptimalAPI('weather', weatherAPIs, {
  priority: 'quality',
  minQuality: 8
});

// Test with budget constraint
const budgetResult = await selector.selectOptimalAPI('weather', weatherAPIs, {
  priority: 'cost',
  budget: 'free'
});

console.log('High Quality Selection:', highQualityResult.selectedAPI);
console.log('Budget Selection:', budgetResult.selectedAPI);
```

### Test 8: Performance Trend Analysis
Test long-term performance monitoring:

```javascript
// Simulate performance degradation over time
const monitor = new PerformanceMonitor();

// Phase 1: Good performance
for (let i = 0; i < 50; i++) {
  await monitor.recordAPICall('test-api', 500 + Math.random() * 200, Math.random() > 0.05);
}

// Phase 2: Degrading performance
for (let i = 0; i < 50; i++) {
  await monitor.recordAPICall('test-api', 1000 + Math.random() * 500, Math.random() > 0.15);
}

const dashboard = monitor.getMonitoringDashboard();
console.log('System Health:', dashboard.systemHealth);
console.log('Active Alerts:', dashboard.activeAlerts);
```

### Test 9: Circuit Breaker Recovery
Test circuit breaker reset and recovery:

```javascript
// Test circuit breaker recovery
let callCount = 0;
const recoveringExecutor = {
  execute: async () => {
    callCount++;
    if (callCount <= 5) {
      throw new Error('Temporary failure');
    }
    return { data: { success: true }, responseTime: 600 };
  }
};

const recoveryManager = new FallbackManager(mockRegistry, recoveringExecutor);

// Trigger circuit breaker
for (let i = 0; i < 6; i++) {
  await recoveryManager.executeWithFallback(
    { type: 'test', domain: 'test' },
    { primaryAPI: 'recovery-test' }
  );
}

// Wait for circuit breaker timeout (simulate time passage)
console.log('Waiting for circuit breaker reset...');

// Test recovery after circuit breaker timeout
setTimeout(async () => {
  const recoveryResult = await recoveryManager.executeWithFallback(
    { type: 'test', domain: 'test' },
    { primaryAPI: 'recovery-test' }
  );
  console.log('Recovery Result:', recoveryResult.success);
}, 1000);
```

---

## 📊 Validation Checklist

When testing, verify these key behaviors:

### ✅ Smart API Selection
- [ ] Different APIs selected based on priority (quality vs speed vs cost)
- [ ] Budget constraints properly filter candidates
- [ ] Feature requirements respected
- [ ] Confidence scores reflect selection quality
- [ ] Alternative APIs provided in results

### ✅ Quality Scoring
- [ ] Scores range from 0-10
- [ ] Complete responses score higher than incomplete
- [ ] Fresh data scores higher than stale data
- [ ] Well-structured responses get higher structure scores
- [ ] Domain-specific validation works (weather, news, etc.)

### ✅ Fallback Management
- [ ] Primary API attempted first
- [ ] Fallback APIs tried in priority order
- [ ] Circuit breaker opens after failure threshold
- [ ] Circuit breaker prevents calls when open  
- [ ] Circuit breaker resets after timeout period

### ✅ Performance Monitoring
- [ ] Metrics collected for all API calls
- [ ] Statistics calculated correctly (avg response time, success rate)
- [ ] Performance alerts triggered for poor performance
- [ ] API comparison and ranking works
- [ ] Trend analysis detects performance changes

### ✅ System Integration
- [ ] All components work together seamlessly
- [ ] Quality scores influence API selection
- [ ] Performance data feeds into selection decisions
- [ ] Fallback system integrates with monitoring
- [ ] End-to-end workflows complete successfully

---

## 🚨 Troubleshooting

### Common Issues:

**"Cannot read properties of undefined (reading 'cost')"**
- Ensure all API objects have cost properties or default values
- Check that calculateCostScore handles various input types

**"Smart selection failed - no API selected"**
- Verify API candidates meet constraint requirements
- Check that budget constraints aren't too restrictive
- Ensure domain capabilities are properly configured

**"Circuit breaker not opening"**
- Confirm failure threshold is reached (default: 5 failures)
- Check that errors are being categorized correctly
- Verify circuit breaker configuration values

**Performance metrics not recording**
- Ensure recordAPICall is awaited properly
- Check that API IDs are consistent across calls
- Verify metadata objects are properly structured

---

## 🎉 Success Indicators

Your implementation is working correctly when you see:

1. **Checkpoint 4 test passes completely** with all ✅ indicators
2. **Different APIs selected** based on different priorities
3. **Quality scores vary** based on response completeness and structure
4. **Circuit breaker opens** after repeated failures and blocks subsequent calls
5. **Performance metrics show realistic** response times and success rates
6. **Integration workflow completes** end-to-end successfully
7. **Warning logs appear** for performance alerts and circuit breaker openings

This indicates your Phase 4 Smart API Selection & Fallback Systems implementation is fully functional! 🚀

---

*Generated for MCP API Gateway Phase 4 - Smart API Selection & Fallback Systems*