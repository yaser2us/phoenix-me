#!/usr/bin/env node

/**
 * Test get_payment_favList_1 with comprehensive debug logging
 * This will create a detailed log file for analysis
 */

import { MCPGatewayServer } from './src/server.js';
import fs from 'fs';
import path from 'path';

const JWT_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJjdXNfa2V5IjoiVTJGc2RHVmtYMThoTlRIT1g3cmIwSDJKQUY0YmNIckp5d0dNSG5CZHZDU0F6cFhIanY0RHVHQmQyWUtuUk5LaEZRZWVCc1BLMWt2aGVOdkI2RDcrUGc9PSIsImF1ZCI6WyJ6dXVsR2F0ZXdheSJdLCJ1c2VyX25hbWUiOiJZYXNlcjJ1cyIsImN1c1R5cGUiOiIxMCIsInNjb3BlIjpbIkVESVRfQkFOS0lORyIsIkVESVRfTk9OX0JBTktJTkciLCJSRUFEX0JBTktJTkciLCJSRUFEX05PTl9CQU5LSU5HIl0sIm1heWFfc2Vzc2lvbl9pZCI6IkBAQEAyMDI1MDczMTIxLjQzMDE0MTI4MDhAQEBAIiwibTJ1X3VzZXJfaWQiOjE3ODI3NzEzLCJwYW4iOiJZVTNDQjNveWcrK0pOVTJwcFpGNTZ1djVxQ3NtZ01sb3RYY0VtVFNLRVBzNG55T3R2TjBlc1pQRTBCSGJlWXZGNmRBdCtta2ExM2NZRmtId3NHejg2T1ZyL0ZOTlZmWk8ya1E2cjYyYTNkOFNrQzhzb01EN2k2VGYwcWpYczY4UFlVZDRabE1YYXNlWWk3Vkg1U1E0a2tUa1dSUHhxRjZOOElGb1ByOGkzOVU9IiwiZXhwIjoxNzg1NTQwNzU4LCJ1c2VySWQiOjUxMjYxMDksImp0aSI6Ijk5NmY3MTc4LWM4MDItNGIzZC1hYjM2LTc0MDYwYmZhNWY4NiIsImNsaWVudF9pZCI6Ik0yVUdBVEVXQVkifQ.MzsEONGYtBbT62PpUNbfVcX-dGk1-vonEQ0DZ0gL5jA';

async function testWithDebugLogging() {
  console.log('🔍 Testing get_payment_favList_1 with Debug Logging');
  console.log('='.repeat(60));
  
  try {
    const server = new MCPGatewayServer();
    await server.initialize();
    
    // Parameters with all required headers
    const parameters = {
      'Accept': 'application/json',
      'X-APP-PLATFORM': 'IOS',
      'X-APP-VERSION': '0.9.38',
      'X-APP-ENVIRONMENT': '',
      'X-APP-BUILD-NO': '1203',
      'X-APP-RELEASE-NO': '25.5.0',
      'X-APP-SESSION-TRACE-ID': 'T0h2a0s5WXA3eG5xZHBkanUyR3JqNEdzS0xBemhZeWc=',
      'x-mb-client-adapter': 'mae-favorites-bill-payment-inquiry',
      'X-MB-E2E-Id': 'T0h2a0s5WXA3eG5xZHBkanUyR3JqNEdzS0xBemhZeWc=',
      'X-MB-Timestamp': Date.now().toString(),
      'X-MB-ENV': 'S',
      'X-MB-Client-Id': 'mae-fe-iv5p7',
      'maya-authorization': `bearer ${JWT_TOKEN}`,
      'authorization': `bearer ${JWT_TOKEN}`
    };

    console.log('\n📡 Making API call with debug logging enabled...');
    console.log('🔑 JWT Token:', JWT_TOKEN.substring(0, 50) + '...');
    
    const result = await server.handleToolCall('get_payment_favList_1', parameters);
    
    console.log('\n📨 Response received');
    
    if (result && result.content && result.content[0]) {
      const responseText = result.content[0].text;
      console.log('Response preview:', responseText.substring(0, 200) + '...');
    }
    
    // Wait a moment for log file to be written
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Find and display the log file
    const logsDir = path.join(process.cwd(), 'logs');
    if (fs.existsSync(logsDir)) {
      const files = fs.readdirSync(logsDir);
      const latestLog = files
        .filter(f => f.includes('get_payment_favList_1'))
        .sort((a, b) => b.localeCompare(a))[0];
      
      if (latestLog) {
        const logPath = path.join(logsDir, latestLog);
        console.log('\n' + '='.repeat(60));
        console.log('📁 DEBUG LOG FILE CREATED:');
        console.log('='.repeat(60));
        console.log(`📄 ${logPath}`);
        console.log('\n💡 You can now:');
        console.log('1. Open this file in Claude Desktop to analyze the complete flow');
        console.log('2. Share this file to debug the 401 error');
        console.log('3. View the exact headers, tokens, and API calls made');
        
        // Show a preview of the log
        const logContent = fs.readFileSync(logPath, 'utf8');
        const lines = logContent.split('\n');
        console.log('\n📋 LOG PREVIEW (first 50 lines):');
        console.log('='.repeat(60));
        console.log(lines.slice(0, 50).join('\n'));
        console.log('... (see full log file for complete details)');
      }
    }
    
  } catch (error) {
    console.log(`\n❌ Error: ${error.message}`);
  }
}

testWithDebugLogging().catch(console.error);