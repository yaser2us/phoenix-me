#!/usr/bin/env node

/**
 * Test with new JWT token and comprehensive debug logging
 */

import { MCPGatewayServer } from './src/server.js';
import fs from 'fs';
import path from 'path';

// Your new JWT token
const NEW_JWT_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJjdXNfa2V5IjoiVTJGc2RHVmtYMThoTlRIT1g3cmIwSDJKQUY0YmNIckp5d0dNSG5CZHZDU0F6cFhIanY0RHVHQmQyWUtuUk5LaEZRZWVCc1BLMWt2aGVOdkk2RDcrUGc9PSIsImF1ZCI6WyJ6dXVsR2F0ZXdheSJdLCJ1c2VyX25hbWUiOiJZYXNlcjJ1cyIsImN1c1R5cGUiOiIxMCIsInNjb3BlIjpbIkVESVRfQkFOS0lORyIsIkVESVRfTk9OX0JBTktJTkciLCJSRUFEX0JBTktJTkciLCJSRUFEX05PTl9CQU5LSU5HIl0sIm1heWFfc2Vzc2lvbl9pZCI6IkBAQEAyMDI1MDgwMTA3LjEyODA3NTU3OTVAQEBAIiwibTJ1X3VzZXJfaWQiOjE3ODI3NzEzLCJwYW4iOiJuTkxBSVNUQllSM1J4Uy81aHBxQnlJN1BlMTU1ck1YeE1EUkJpcUxxNUtDVHhaa2NTblRMT2Y0UW1TODgzbUdqNE9jWnhveStqYTlXQlA1WkQrOUxMRzdNNWhRZTdTYWgzbzNiQmRjMXV2QWtUd09vNnFZYW96TlpJb0ZURWovT2s2dVp0VVZtekRXZjlnbFdEZ0JNdWd2WncvcDUyOG1IZXlmSWRmY1JwUlE9IiwiZXhwIjoxNzg1NTc3MDE1LCJ1c2VySWQiOjUxMjYxMDksImp0aSI6ImNjYTkyZDViLTk0MjctNDY1MS1hMGU0LTdkNDE2Y2Y2MGY2NSIsImNsaWVudF9pZCI6Ik0yVUdBVEVXQVkifQ.vc5iWlr0qsXtvwGospoXjJDJAjgh8oKdvontdIdHF28';

async function testNewTokenWithDebug() {
  console.log('🔑 Testing with NEW JWT Token and Debug Logging');
  console.log('='.repeat(60));
  console.log('📅 Token Session: @@@@20250801‌07.1280755795@@@@');
  console.log('🆔 Token ID: cca92d5b-9427-4651-a0e4-7d416cf60f65');
  
  try {
    const server = new MCPGatewayServer();
    await server.initialize();
    
    // Parameters with your new JWT token
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
      'maya-authorization': `bearer ${NEW_JWT_TOKEN}`,
      'authorization': `bearer ${NEW_JWT_TOKEN}`,
      'Authorization': `bearer ${NEW_JWT_TOKEN}` // Try with capital A too
    };

    console.log('\n📡 Making API call with NEW token...');
    console.log(`🔑 Token: ${NEW_JWT_TOKEN.substring(0, 50)}...`);
    console.log(`   Last 20 chars: ...${NEW_JWT_TOKEN.substring(NEW_JWT_TOKEN.length - 20)}`);
    
    const result = await server.handleToolCall('get_payment_favList_1', parameters);
    
    console.log('\n📨 Response received');
    
    if (result && result.content && result.content[0]) {
      const responseText = result.content[0].text;
      
      // Check if successful
      if (responseText.includes('resultList') || responseText.includes('success')) {
        console.log('\n🎉 SUCCESS! API call worked with new token!');
        console.log('Response:', responseText);
        
        // Try to parse and show favorites
        try {
          const jsonMatch = responseText.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            const data = JSON.parse(jsonMatch[0]);
            if (data.data && data.data.resultList) {
              console.log(`\n📋 Found ${data.data.resultList.length} payment favorites!`);
              data.data.resultList.forEach((fav, idx) => {
                console.log(`${idx + 1}. ${fav.fullName || fav.shortName || 'Unknown'}`);
              });
            }
          }
        } catch (e) {
          // Ignore parsing errors
        }
      } else if (responseText.includes('401')) {
        console.log('\n❌ Still getting 401 error with new token');
        console.log('Response:', responseText.substring(0, 300) + '...');
      } else {
        console.log('\n📄 Response:', responseText.substring(0, 300) + '...');
      }
    }
    
    // Wait for log file
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
        console.log('📁 DEBUG LOG CREATED:');
        console.log(`📄 ${logPath}`);
        console.log('='.repeat(60));
        
        // Show key parts of the log
        const logContent = fs.readFileSync(logPath, 'utf8');
        
        // Extract key information
        console.log('\n🔍 KEY LOG INFORMATION:');
        
        // JWT Analysis
        const jwtAnalysisMatch = logContent.match(/JWT_ANALYSIS[\s\S]*?metadata": \{[\s\S]*?\}/);
        if (jwtAnalysisMatch) {
          console.log('\n📊 JWT Token Analysis:');
          const metadataMatch = jwtAnalysisMatch[0].match(/"metadata": (\{[\s\S]*?\})/);
          if (metadataMatch) {
            try {
              const metadata = JSON.parse(metadataMatch[1]);
              console.log(`   Expired: ${metadata.isExpired}`);
              console.log(`   Expires: ${metadata.expiresAt}`);
              console.log(`   Session: ${metadata.sessionId}`);
            } catch (e) {}
          }
        }
        
        // API Response
        const responseMatch = logContent.match(/API_RESPONSE[\s\S]*?"data": \{[\s\S]*?\}/);
        if (responseMatch) {
          console.log('\n📨 API Response Status:');
          const statusMatch = responseMatch[0].match(/"status": (\d+)/);
          const dataMatch = responseMatch[0].match(/"data": (\{[\s\S]*?\})/);
          if (statusMatch) console.log(`   Status: ${statusMatch[1]}`);
          if (dataMatch) {
            try {
              const data = JSON.parse(dataMatch[1]);
              console.log(`   Data: ${JSON.stringify(data, null, 2)}`);
            } catch (e) {}
          }
        }
        
        // Curl command
        const curlMatch = logContent.match(/"curlCommand": "([^"]+)"/);
        if (curlMatch) {
          console.log('\n📋 Generated CURL Command:');
          console.log(curlMatch[1].replace(/\\n/g, '\n').replace(/\\\\/g, '\\'));
        }
      }
    }
    
  } catch (error) {
    console.log(`\n❌ Error: ${error.message}`);
  }
}

testNewTokenWithDebug().catch(console.error);