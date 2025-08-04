import { ApiRegistry } from './src/registry/api-registry.js';
import { AIWorkflowPlanner } from './src/workflow/ai-workflow-planner.js';

async function testSimpleWorkflow() {
  console.log('Testing simple workflow planning...\n');
  
  try {
    // Initialize API Registry
    const apiRegistry = new ApiRegistry();
    await apiRegistry.initialize();
    console.log('✅ Registry initialized\n');
    
    // Create AI Workflow Planner
    const planner = new AIWorkflowPlanner(apiRegistry);
    console.log('✅ Planner created\n');
    
    // Test 1: Simple intent
    console.log('Test 1: Simple balance check');
    const intent1 = "Check my balance";
    const workflow1 = await planner.planFromIntent(intent1);
    console.log('Result:', JSON.stringify(workflow1.metadata, null, 2));
    console.log('Operations:', workflow1.executionPlan.steps.map(s => 
      s.operations.map(op => op.subGoal)
    ));
    
    // Test 2: Multi-domain intent
    console.log('\nTest 2: Multi-domain intent');
    const intent2 = "Check my balance and get weather";
    const workflow2 = await planner.planFromIntent(intent2);
    console.log('Result:', JSON.stringify(workflow2.metadata, null, 2));
    console.log('Operations:', workflow2.executionPlan.steps.map(s => 
      s.operations.map(op => op.subGoal)
    ));
    
  } catch (error) {
    console.error('Test failed:', error);
    console.error('Stack:', error.stack);
  }
}

testSimpleWorkflow();