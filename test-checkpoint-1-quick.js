import { ApiRegistry } from './src/registry/api-registry.js';
import { AIWorkflowPlanner } from './src/workflow/ai-workflow-planner.js';

async function quickTest() {
  console.log('Quick test of AI Workflow Planner...\n');
  
  try {
    // Initialize
    const apiRegistry = new ApiRegistry();
    await apiRegistry.initialize();
    const planner = new AIWorkflowPlanner(apiRegistry);
    
    // Test cases
    const testCases = [
      { 
        name: "Multi-domain", 
        intent: "Check my balance and get weather for my location",
        expectedDomains: ['banking', 'weather']
      },
      {
        name: "Complex", 
        intent: "Get my account summary, check if it's raining in Bangkok, and show USD to MYR exchange rate",
        expectedDomains: ['banking', 'weather', 'currency']
      },
      {
        name: "Transfer + Location",
        intent: "Transfer $500 to John and find nearby ATMs for cash withdrawal",
        expectedDomains: ['banking', 'location']
      },
      {
        name: "Ambiguous",
        intent: "I need money and food",
        expectedDomains: ['banking', 'location']
      }
    ];
    
    let passed = 0;
    for (const test of testCases) {
      console.log(`\nTest: ${test.name}`);
      console.log(`Intent: "${test.intent}"`);
      
      const workflow = await planner.planFromIntent(test.intent);
      const domains = new Set();
      
      workflow.executionPlan.steps.forEach(step => {
        step.operations.forEach(op => {
          domains.add(op.domain);
          console.log(`  - ${op.subGoal} (${op.domain})`);
        });
      });
      
      const hasExpectedDomains = test.expectedDomains.every(d => domains.has(d));
      console.log(`Expected domains: ${test.expectedDomains.join(', ')}`);
      console.log(`Result: ${hasExpectedDomains ? '✅ PASSED' : '❌ FAILED'}`);
      
      if (hasExpectedDomains) passed++;
    }
    
    console.log(`\n\nOverall: ${passed}/${testCases.length} passed`);
    
  } catch (error) {
    console.error('Error:', error.message);
  }
}

quickTest();