#!/usr/bin/env node

/**
 * Test for Claude Desktop usage - should work with 200 OK
 * Uses the default token from maybank-adapter.js
 */

import { MCPGatewayServer } from './src/server.js';
import fs from 'fs';
import path from 'path';

async function testClaudeDesktop() {
  console.log('🖥️  Testing Claude Desktop Integration');
  console.log('='.repeat(60));
  console.log('✅ Using working JWT token from maybank-adapter.js');
  console.log('🔍 Debug logging enabled for complete flow analysis');
  
  try {
    const server = new MCPGatewayServer();
    await server.initialize();
    
    // Minimal parameters - system will use default token
    const parameters = {
      'Accept': 'application/json',
      'X-APP-PLATFORM': 'IOS',
      'X-APP-VERSION': '0.9.38'
    };

    console.log('\n📡 Making API call (using default token)...');
    
    const result = await server.handleToolCall('get_payment_favList_1', parameters);
    
    console.log('\n📨 Response Analysis:');
    
    if (result && result.content && result.content[0]) {
      const responseText = result.content[0].text;
      
      if (responseText.includes('resultList')) {
        console.log('🎉 SUCCESS! API returned payment favorites');
        console.log('📋 Response contains resultList - operation successful');
      } else if (responseText.includes('401')) {
        console.log('❌ 401 Error - Token issue detected');
      } else {
        console.log('📄 Response received:', responseText.substring(0, 200) + '...');
      }
    }
    
    // Find latest log
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const logsDir = path.join(process.cwd(), 'logs');
    if (fs.existsSync(logsDir)) {
      const files = fs.readdirSync(logsDir);
      const latestLog = files
        .filter(f => f.includes('get_payment_favList_1'))
        .sort((a, b) => b.localeCompare(a))[0];
      
      if (latestLog) {
        const logPath = path.join(logsDir, latestLog);
        console.log('\n📁 Debug Log Created:');
        console.log(`📄 ${logPath}`);
        
        const logContent = fs.readFileSync(logPath, 'utf8');
        
        // Check if token worked
        if (logContent.includes('"status": 200')) {
          console.log('✅ Log shows 200 OK - Success!');
        } else if (logContent.includes('"status": 401')) {
          console.log('❌ Log shows 401 - Check token');
        }
        
        // Show session info
        const sessionMatch = logContent.match(/"maya_session_id": "([^"]+)"/);
        if (sessionMatch) {
          console.log(`🆔 Session: ${sessionMatch[1]}`);
        }
      }
    }
    
  } catch (error) {
    console.log(`\n❌ Error: ${error.message}`);
  }
}

testClaudeDesktop().catch(console.error);