import { ApiRegistry } from './src/registry/api-registry.js';
import { AIWorkflowPlanner } from './src/workflow/ai-workflow-planner.js';

async function testPlannerDebug() {
  console.log('Testing AI Workflow Planner debug...\n');
  
  try {
    // Initialize API Registry
    console.log('1. Initializing registry...');
    const apiRegistry = new ApiRegistry();
    await apiRegistry.initialize();
    console.log('✅ Registry initialized\n');
    
    // Test operations available
    console.log('2. Available operations:');
    const allOps = apiRegistry.getAllOperations();
    for (const [apiId, ops] of Object.entries(allOps)) {
      console.log(`   ${apiId}:`, Object.keys(ops));
    }
    console.log('');
    
    // Create planner
    console.log('3. Creating planner...');
    const planner = new AIWorkflowPlanner(apiRegistry);
    console.log('✅ Planner created\n');
    
    // Test simple decomposition
    console.log('4. Testing intent decomposition...');
    const intent = "Check my balance";
    const subGoals = await planner.decomposeIntent(intent);
    console.log('Sub-goals:', subGoals);
    console.log('');
    
    // Test mapping to operations
    console.log('5. Testing operation mapping...');
    const mappings = await planner.mapSubGoalsToOperations(subGoals);
    console.log('Mappings:', mappings.map(m => ({
      subGoal: m.subGoal,
      apiId: m.apiId,
      hasOperation: !!m.operation
    })));
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('Stack:', error.stack);
  }
}

testPlannerDebug();