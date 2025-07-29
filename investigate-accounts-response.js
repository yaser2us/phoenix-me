#!/usr/bin/env node

/**
 * Investigate the successful /accounts/all response
 */

import axios from 'axios';
import crypto from 'crypto';

const JWT_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJjdXNfa2V5IjoiVTJGc2RHVmtYMThoTlRIT1g3cmIwSDJKQUY0YmNIckp5d0dNSG5CZHZDU0F6cFhIanY0RHVHQmQyWUtuUk5LaEZRZWVCc1BLMWt2aGVOdkk2RDcrUGc9PSIsImF1ZCI6WyJ6dXVsR2F0ZXdheSJdLCJ1c2VyX25hbWUiOiJZYXNlcjJ1cyIsImN1c1R5cGUiOiIxMCIsInNjb3BlIjpbIkVESVRfTk9OX0JBTktJTkciLCJSRUFEX0JBTktJTkciLCJSRUFEX05PTl9CQU5LSU5HIl0sIm1heWFfc2Vzc2lvbl9pZCI6IkBAQEAyMDI1MDcyOTE1LjAwNTk3NTU5MTdAQEBAIiwibTJ1X3VzZXJfaWQiOjE3ODI3NzEzLCJwYW4iOiJlRk9YT1ZmUTlaRjA3TVozSXNHaGU5UDVaY0JYUUN5R1dEd1lWUlp2aDh1Q3NhYmFXeVRsbkdCbjdwZHFrcjZ3a2xORGZTbjhrZDYwRlZKYmVzT1hnSm5GcGFLYWpuU1JxemNzb2RscmdVNktZM2h4ZnFwS05IWVFHcnlqY0FaVXR3TktMVlgyL0kwQVpUUnQrVFB1cDI3Y0ErWGswNFAwQnp5WVdSL3Z6bFU9IiwiZXhwIjoxNzg1MzQ1NTYxLCJ1c2VySWQiOjUxMjYxMDksImp0aSI6ImZiMmJlOTNjLTNkZDAtNGJlNi1hOTI0LTJkNWUzYjIwNjBkOSIsImNsaWVudF9pZCI6Ik0yVUdBVEVXQVkifQ.hMEH-zzCSV7tHYphdwEezQbSL6kbZCODVuydbKredqA';

function getMaybankHeaders() {
  return {
    'Accept': 'application/json',
    'X-APP-PLATFORM': 'IOS',
    'X-APP-VERSION': '0.9.38',
    'X-APP-ENVIRONMENT': '',
    'X-APP-BUILD-NO': '1203',
    'X-APP-RELEASE-NO': '25.5.0',
    'X-APP-SESSION-TRACE-ID': crypto.randomBytes(32).toString('base64'),
    'authorization': `bearer ${JWT_TOKEN}`,
    'maya-authorization': `bearer ${JWT_TOKEN}` // CRITICAL: This header fixes 400 Bad Request errors!
  };
}

async function investigateAccountsResponse() {
  console.log('🔍 Investigating /accounts/all Response');
  console.log('=====================================');

  try {
    const response = await axios({
      method: 'GET',
      url: 'https://maya.maybank2u.com.my/banking/v1/accounts/all',
      headers: getMaybankHeaders(),
      timeout: 10000,
      validateStatus: () => true
    });

    console.log(`📊 Status: ${response.status} ${response.statusText}`);
    console.log(`📄 Content-Type: ${response.headers['content-type']}`);
    console.log(`📏 Content-Length: ${response.headers['content-length']}`);
    console.log(`📋 All Headers:`, response.headers);

    console.log('\n📄 FULL RESPONSE DATA:');
    console.log('=' .repeat(50));
    
    if (response.data) {
      // Log raw response
      console.log('Raw Response:', response.data);
      
      // Try to pretty print if it's JSON
      if (typeof response.data === 'object') {
        console.log('\nFormatted JSON:');
        console.log(JSON.stringify(response.data, null, 2));
        
        // Analyze structure
        console.log('\n🔍 Response Analysis:');
        console.log('- Type:', typeof response.data);
        console.log('- Is Array:', Array.isArray(response.data));
        console.log('- Keys/Length:', Array.isArray(response.data) ? response.data.length : Object.keys(response.data));
        
        if (Array.isArray(response.data)) {
          console.log('\n📊 Array Contents:');
          response.data.forEach((item, index) => {
            console.log(`  [${index}]:`, typeof item, Array.isArray(item) ? `Array(${item.length})` : Object.keys(item || {}));
          });
          
          if (response.data.length > 0 && response.data[0]) {
            console.log('\n🔍 First Item Analysis:');
            const firstItem = response.data[0];
            console.log('First Item Keys:', Object.keys(firstItem));
            console.log('First Item Sample:', firstItem);
            
            // Look for account information
            const accountFields = ['name', 'balance', 'accountType', 'code', 'number'];
            console.log('\n💰 Account Fields Found:');
            accountFields.forEach(field => {
              if (firstItem.hasOwnProperty(field)) {
                console.log(`  ✅ ${field}: ${firstItem[field]}`);
              } else {
                console.log(`  ❌ ${field}: not found`);
              }
            });
          }
        } else if (typeof response.data === 'object') {
          console.log('\n🔍 Object Keys:', Object.keys(response.data));
          
          // Check for standard Maybank response format
          console.log('\n📋 Maybank Format Check:');
          console.log(`  message: ${response.data.message}`);
          console.log(`  code: ${response.data.code}`);
          console.log(`  result: ${!!response.data.result}`);
          
          if (response.data.result) {
            console.log('\n📦 Result Data:');
            console.log('Result type:', typeof response.data.result);
            console.log('Result keys:', Object.keys(response.data.result));
          }
        }
      } else {
        console.log('Response is not JSON object:', typeof response.data);
        console.log('Raw content:', response.data.toString().substring(0, 500));
      }
    } else {
      console.log('❌ No response data');
    }

  } catch (error) {
    console.log(`❌ Error: ${error.message}`);
    if (error.response) {
      console.log(`Status: ${error.response.status}`);
      console.log(`Data:`, error.response.data);
    }
  }
}

investigateAccountsResponse().catch(console.error);