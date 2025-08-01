# Phase 4.9 Desktop Test Prompts
## AI-Powered Workflow Creation & Reuse Testing

These prompts are designed to test Phoenix-ME's Phase 4.9 Dynamic API Composition & Learning System through Claude Desktop. They demonstrate intelligent workflow creation, innovation discovery, and workflow reuse capabilities.

---

## 🚀 **Initial Workflow Creation Tests**

### Test 1: Smart Financial Overview
```
I want to create a smart financial overview that shows my account balance, recent spending patterns, and gives me insights based on current weather conditions. The idea is that weather affects spending behavior - sunny days might mean more outdoor activities, rainy days more online shopping.
```

**Expected Result:** Should compose a workflow combining banking APIs with weather APIs and create intelligent insights.

### Test 2: Travel Planning Assistant  
```
Create an innovative workflow that helps me plan my day by checking the weather forecast, finding nearby events or activities based on conditions, and giving me budget recommendations for different weather scenarios.
```

**Expected Result:** Should fuse weather, location, and financial planning into a comprehensive travel assistant.

### Test 3: Smart Expense Tracker
```
I need a revolutionary expense tracking system that not only shows my spending but also predicts future expenses based on patterns, considers seasonal trends, and gives me proactive savings recommendations.
```

**Expected Result:** Should create an AI-enhanced expense system with predictive capabilities.

---

## 🔄 **Workflow Reuse & Adaptation Tests**

### Test 4: Find Similar Workflows
```
I want something similar to financial planning but focused on investment decisions rather than daily spending.
```

**Expected Result:** Should find the previously created financial workflows and adapt them for investment focus.

### Test 5: Seasonal Variation
```
Create a summer version of my financial planning workflow that takes into account vacation spending, outdoor activities, and seasonal income changes.
```

**Expected Result:** Should adapt existing workflows for seasonal context.

### Test 6: Multi-User Adaptation
```
Take the smart financial overview workflow and create a family version that tracks multiple accounts and provides household budgeting insights.
```

**Expected Result:** Should scale the individual workflow to family/multi-user context.

---

## 🧠 **Innovation Discovery Tests**

### Test 7: Cross-Domain Innovation
```
Discover the most innovative way to combine my financial data with weather patterns and news trends to create something completely new that hasn't been done before.
```

**Expected Result:** Should generate novel workflow combinations with high innovation metrics.

### Test 8: Predictive Intelligence
```
Create a predictive financial assistant that anticipates my needs before I ask - combining spending patterns, calendar events, weather forecasts, and news trends to proactively suggest actions.
```

**Expected Result:** Should create a proactive, AI-enhanced system with multi-domain intelligence.

### Test 9: Personal Finance Revolution
```
Revolutionize personal finance management by creating the most advanced, AI-powered system possible using all available data sources and innovative combinations.
```

**Expected Result:** Should push creativity to maximum and generate cutting-edge workflow innovations.

---

## 📚 **Library Management Tests**

### Test 10: Browse Innovations
```
Show me all the innovative workflows in my library, sorted by innovation level, and tell me which ones are most successful.
```

**Expected Result:** Should display workflow library with innovation metrics and usage statistics.

### Test 11: Pattern Analysis
```
Analyze my workflow usage patterns over the last month and give me recommendations for optimizing my financial management.
```

**Expected Result:** Should provide analytics insights and optimization recommendations.

### Test 12: Workflow Enhancement
```
Take my most-used workflow and suggest 3 innovative enhancements that would make it even more valuable.
```

**Expected Result:** Should analyze existing workflows and propose intelligent improvements.

---

## 🔬 **Advanced Innovation Tests**

### Test 13: Data Fusion Challenge
```
Create insights by fusing data from my bank account, current weather, recent news about the economy, and my spending patterns to give me the smartest financial advice possible.
```

**Expected Result:** Should demonstrate cross-API data fusion with intelligent insight generation.

### Test 14: Workflow Composition Challenge
```
Compose the most complex yet useful workflow possible that helps me manage my entire financial life - from daily expenses to long-term planning, incorporating all available data sources.
```

**Expected Result:** Should create a comprehensive, multi-layered workflow with maximum utility.

### Test 15: Learning System Test
```
Create a workflow, use it several times with different parameters, then ask the system to learn from these executions and optimize it automatically.
```

**Expected Result:** Should demonstrate the learning and adaptation capabilities.

---

## 🎯 **Specific MCP Tool Tests**

### Test 16: Direct Tool Testing
Use these specific MCP tool calls to test individual components:

```javascript
// Compose intelligent workflow
compose_intelligent_workflow({
  userRequest: "Create a smart morning routine that checks weather, suggests outfit budget, and gives financial tips for the day",
  innovationLevel: "cutting_edge"
})

// Execute dynamic workflow  
execute_dynamic_workflow({
  workflowPlan: [generated_from_above],
  enableLearning: true
})

// Discover innovations
discover_workflow_innovations({
  problemDescription: "Smart home automation that considers financial impact",
  creativityLevel: 0.9
})

// Get workflow recommendations
get_intelligent_workflow_recommendations({
  userIntent: "optimize my daily financial decisions",
  includeInnovative: true
})
```

---

## 📊 **Success Criteria**

For each test, look for these indicators of success:

### ✅ **Workflow Creation**
- Intelligent composition from natural language
- Multi-API integration (2+ different domains)
- Innovation metrics (novelty, value, feasibility scores)
- Executable workflow steps with proper parameters

### ✅ **Workflow Reuse**  
- System finds similar existing workflows
- Adapts workflows for new contexts
- Maintains learned patterns and improvements
- Shows similarity scores and match reasons

### ✅ **Innovation Discovery**
- High novelty scores (>70%)
- Creative combinations not seen before
- Practical value and feasibility
- Unique workflow signatures

### ✅ **Learning & Adaptation**
- System learns from execution patterns
- Improves workflow performance over time
- Provides intelligent recommendations
- Tracks success metrics and user satisfaction

---

## 🚀 **Getting Started**

1. **Start the MCP Server:**
   ```bash
   cd /Users/80001411yasserbatole/Documents/GitHub/phoenix-me
   npm start
   ```

2. **Connect Claude Desktop** to the MCP server

3. **Begin with Test 1** and work through the prompts systematically

4. **Observe the Results:** Look for intelligent composition, innovation metrics, and workflow reuse

5. **Build Complexity:** Start simple, then use reuse tests to build on created workflows

6. **Explore Innovation:** Use the discovery tests to push the boundaries of what's possible

---

## 💡 **Pro Tips**

- **Be Specific:** The more detailed your request, the better the AI can compose workflows
- **Build Incrementally:** Start with simple workflows, then enhance and adapt them
- **Test Reuse:** Always try to find and adapt existing workflows before creating new ones
- **Push Innovation:** Use high creativity levels to discover truly novel combinations
- **Monitor Learning:** Pay attention to how the system improves workflows over time

---

**🎯 Goal:** Demonstrate that Phoenix-ME can intelligently "mix and match existing APIs to build new APIs in workflow format" with AI-powered innovation, learning, and reuse capabilities!