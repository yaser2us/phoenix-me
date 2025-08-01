#!/usr/bin/env node

/**
 * Test Phase 4.5 Integration with MCP Server
 * Verifies all advanced interactive tools are available and working
 */

import { MCPGatewayServer } from './src/server.js';

async function testPhase45Integration() {
  console.log('🧪 Phase 4.5 Integration Test');
  console.log('===============================');
  
  try {
    // Create server instance
    console.log('🔧 Initializing MCP Gateway Server with Phase 4.5 features...');
    const server = new MCPGatewayServer();
    
    // Initialize (without starting MCP transport)
    await server.initialize();
    
    console.log('✅ Server initialized successfully\n');
    
    // Check server status
    const status = server.getStatus();
    console.log('📊 Server Status:');
    console.log(`• Initialized: ${status.initialized}`);
    console.log(`• Registry: ${status.registry}`);
    console.log(`• Operations: ${status.operations}`);
    console.log(`• Executor: ${status.executor}`);
    console.log(`• Intent Parser: ${status.intentParser}`);
    console.log(`• Config: ${status.config}`);
    
    // Check Phase 4.5 components
    console.log('\n🚀 Phase 4.5 Components:');
    console.log(`• Semantic Matcher: ${!!server.semanticMatcher}`);
    console.log(`• AI Workflow Planner: ${!!server.aiWorkflowPlanner}`);
    console.log(`• Parameter Collector: ${!!server.parameterCollector}`);
    console.log(`• Workflow Execution Engine: ${!!server.workflowExecutionEngine}`);
    console.log(`• Conversation Manager: ${!!server.conversationManager}`);
    console.log(`• UX Enhancements: ${!!server.uxEnhancements}`);
    console.log(`• Workflow Intelligence: ${!!server.workflowIntelligence}`);
    
    // Check MCP tools
    console.log(`\n🔧 Total MCP Tools: ${server.mcpTools.length}`);
    
    // Find Phase 4.5 tools
    const phase45Tools = server.mcpTools.filter(tool => 
      server.isAdvancedInteractiveTool(tool.name)
    );
    
    console.log(`\n💡 Phase 4.5 Advanced Interactive Tools: ${phase45Tools.length}`);
    phase45Tools.forEach(tool => {
      console.log(`• ${tool.name}: ${tool.description}`);
    });
    
    // Test workflow tools
    const workflowTools = server.mcpTools.filter(tool => 
      server.isWorkflowTool(tool.name)
    );
    
    console.log(`\n📋 Workflow Tools: ${workflowTools.length}`);
    workflowTools.forEach(tool => {
      console.log(`• ${tool.name}: ${tool.description}`);
    });
    
    // Test basic API tools
    const apiTools = server.mcpTools.filter(tool => 
      !server.isAdvancedInteractiveTool(tool.name) && 
      !server.isWorkflowTool(tool.name) &&
      tool.name !== 'maybank_interactive'
    );
    
    console.log(`\n🔌 API Tools: ${apiTools.length}`);
    apiTools.slice(0, 5).forEach(tool => {
      console.log(`• ${tool.name}: ${tool.description}`);
    });
    if (apiTools.length > 5) {
      console.log(`• ...and ${apiTools.length - 5} more API tools`);
    }
    
    // Integration Success Check
    const requiredPhase45Tools = [
      'start_conversation',
      'continue_conversation', 
      'execute_conversation_workflow',
      'get_workflow_suggestions',
      'get_smart_defaults',
      'monitor_workflow_progress',
      'get_optimization_recommendations'
    ];
    
    const availablePhase45Tools = phase45Tools.map(t => t.name);
    const missingTools = requiredPhase45Tools.filter(t => !availablePhase45Tools.includes(t));
    
    console.log('\n===============================');
    console.log('📊 Integration Test Results');
    console.log('===============================');
    
    if (missingTools.length === 0) {
      console.log('✅ SUCCESS: All Phase 4.5 features integrated successfully!');
      console.log(`🎉 Phoenix-ME now has ${server.mcpTools.length} total tools including:`);
      console.log(`   • ${phase45Tools.length} Advanced Interactive Tools`);
      console.log(`   • ${workflowTools.length} Workflow Tools`);
      console.log(`   • ${apiTools.length} API Tools`);
      console.log(`   • 1 Maybank Interactive Tool`);
      
      console.log('\n🚀 Ready for Claude Desktop integration!');
      console.log('Users can now start conversational workflows with:');
      console.log('   • start_conversation');
      console.log('   • continue_conversation');
      console.log('   • get_workflow_suggestions');
      console.log('   • And more advanced features!');
      
    } else {
      console.log(`❌ FAILED: Missing ${missingTools.length} Phase 4.5 tools:`);
      missingTools.forEach(tool => console.log(`   • ${tool}`));
    }
    
  } catch (error) {
    console.error('❌ Integration test failed:', error.message);
    console.error('Stack trace:', error.stack);
  }
}

testPhase45Integration();