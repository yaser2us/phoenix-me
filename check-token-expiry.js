#!/usr/bin/env node

/**
 * Check JWT token expiration status
 */

// Token from maybank-adapter.js line 26
const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJjdXNfa2V5IjoiVTJGc2RHVmtYMThoTlRIT1g3cmIwSDJKQUY0YmNIckp5d0dNSG5CZHZDU0F6cFhIanY0RHVHQmQyWUtuUk5LaEZRZWVCc1BLMWt2aGVOdkI2RDcrUGc9PSIsImF1ZCI6WyJ6dXVsR2F0ZXdheSJdLCJ1c2VyX25hbWUiOiJZYXNlcjJ1cyIsImN1c1R5cGUiOiIxMCIsInNjb3BlIjpbIkVESVRfQkFOS0lORyIsIkVESVRfTk9OX0JBTktJTkciLCJSRUFEX0JBTktJTkciLCJSRUFEX05PTl9CQU5LSU5HIl0sIm1heWFfc2Vzc2lvbl9pZCI6IkBAQEEyMDI1MDgwMTA3LjEyODA3NTU3OTVAQEBAIiwibTJ1X3VzZXJfaWQiOjE3ODI3NzEzLCJwYW4iOiJuTkxBSVNUQllSM1J4Uy81aHBxQnlJN1BlMTU1ck1YeE1EUkJpcUxxNUtDVHhaa2NTblRMT2Y0UW1TODgzbUdqNE9jWnhveStqYTlXQlA1WkQrOUxMRzdNNWhRZTdTYWgzbzNiQmRjMXV2QWtUd09vNnFZYW96TlpJb0ZURWovT2s2dVp0VVZtekRXZjlnbFdEZ0JNdWd2WncvcDUyOG1IZXlmSWRmY1JwUlE9IiwiZXhwIjoxNzg1NTc3MDE1LCJ1c2VySWQiOjUxMjYxMDksImp0aSI6ImNjYTkyZDViLTk0MjctNDY1MS1hMGU0LTdkNDE2Y2Y2MGY2NSIsImNsaWVudF9pZCI6Ik0yVUdBVEVXQVkifQ.vc5iWlr0qsXtvwGospoXjJDJAjgh8oKdvontdIdHF28';

try {
  // Decode the JWT payload
  const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
  
  const now = Date.now() / 1000;
  const exp = payload.exp;
  const isExpired = now > exp;
  const timeUntilExpiry = exp - now;
  
  console.log('🔍 JWT Token Analysis');
  console.log('='.repeat(60));
  console.log('📅 Current time:', new Date(now * 1000).toISOString());
  console.log('⏰ Token expires:', new Date(exp * 1000).toISOString());
  console.log('❓ Is expired:', isExpired ? '❌ YES' : '✅ NO');
  
  if (!isExpired) {
    const hoursLeft = Math.floor(timeUntilExpiry / 3600);
    const minutesLeft = Math.floor((timeUntilExpiry % 3600) / 60);
    console.log(`⏳ Time remaining: ${hoursLeft}h ${minutesLeft}m`);
  } else {
    const hoursAgo = Math.floor(-timeUntilExpiry / 3600);
    const minutesAgo = Math.floor((-timeUntilExpiry % 3600) / 60);
    console.log(`⏰ Expired: ${hoursAgo}h ${minutesAgo}m ago`);
  }
  
  console.log('\n🆔 Token Details:');
  console.log('   Session ID:', payload.maya_session_id);
  console.log('   User ID:', payload.userId);
  console.log('   User Name:', payload.user_name);
  console.log('   Client ID:', payload.client_id);
  console.log('   JWT ID:', payload.jti);
  
  console.log('\n🔐 Scopes:');
  payload.scope.forEach(scope => {
    console.log(`   • ${scope}`);
  });
  
  console.log('\n📊 Summary:');
  if (isExpired) {
    console.log('❌ This token is EXPIRED - that\'s why you\'re getting 401 errors');
    console.log('💡 You need a fresh JWT token from your Maybank session');
  } else {
    console.log('✅ This token is still valid');
    console.log('🤔 401 errors might be due to other authentication issues');
  }
  
} catch (error) {
  console.error('❌ Failed to decode JWT token:', error.message);
}