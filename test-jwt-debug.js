#!/usr/bin/env node

// Quick JWT token analysis
const JWT_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJjdXNfa2V5IjoiVTJGc2RHVmtYMThoTlRIT1g3cmIwSDJKQUY0YmNIckp5d0dNSG5CZHZDU0F6cFhIanY0RHVHQmQyWUtuUk5LaEZRZWVCc1BLMWt2aGVOdkk2RDcrUGc9PSIsImF1ZCI6WyJ6dXVsR2F0ZXdheSJdLCJ1c2VyX25hbWUiOiJZYXNlcjJ1cyIsImN1c1R5cGUiOiIxMCIsInNjb3BlIjpbIkVESVRfQkFOS0lORyIsIkVESVRfTk9OX0JBTktJTkciLCJSRUFEX0JBTktJTkciLCJSRUFEX05PTl9CQU5LSU5HIl0sIm1heWFfc2Vzc2lvbl9pZCI6IkBAQEEyMDI1MDczMTIxLjQzMDE0MTI4MDhAQEBAIiwibTJ1X3VzZXJfaWQiOjE3ODI3NzEzLCJwYW4iOiJZVTNDQjNveWcrK0pOVTJwcFpGNTZ1djVxQ3NtZ01sb3RYY0VtVFNLRVBzNG55T3R2TjBlc1pQRTBCSGJlWXZGNmRBdCtta2ExM2NZRmtId3NHejg2T1ZyL0ZOTlZmWk8ya1E2cjYyYTNkOFNrQzhzb01EN2k2VGYwcWpYczY4UFlVZDRabE1YYXNlWWk3Vkg1U1E0a2tUa1dSUHhxRjZOOElGb1ByOGkzOVU9IiwiZXhwIjoxNzg1NTQwNzU4LCJ1c2VySWQiOjUxMjYxMDksImp0aSI6Ijk5NmY3MTc4LWM4MDItNGIzZC1hYjM2LTc0MDYwYmZhNWY4NiIsImNsaWVudF9pZCI6Ik0yVUdBVEVXQVkifQ.MzsEONGYtBbT62PpUNbfVcX-dGk1-vonEQ0DZ0gL5jA'

try {
  const [header, payload, signature] = JWT_TOKEN.split('.');
  const decodedPayload = JSON.parse(Buffer.from(payload, 'base64').toString());
  
  const currentTime = Math.floor(Date.now() / 1000);
  const isExpired = decodedPayload.exp < currentTime;
  
  console.log('🔍 JWT Token Analysis:');
  console.log('========================');
  console.log(`User: ${decodedPayload.user_name}`);
  console.log(`User ID: ${decodedPayload.userId}`);
  console.log(`Client ID: ${decodedPayload.client_id}`);
  console.log(`Maya Session ID: ${decodedPayload.maya_session_id}`);
  console.log(`Expires: ${new Date(decodedPayload.exp * 1000).toISOString()}`);
  console.log(`Current Time: ${new Date().toISOString()}`);
  console.log(`Is Expired: ${isExpired}`);
  console.log(`Time until expiry: ${Math.round((decodedPayload.exp - currentTime) / 3600)} hours`);
  console.log(`Scopes: ${decodedPayload.scope.join(', ')}`);
  
  if (isExpired) {
    console.log('\n❌ TOKEN EXPIRED - This is why you\'re getting 401 errors');
    console.log('You need to generate a fresh JWT token from Maybank API');
  } else {
    console.log('\n✅ Token is valid and not expired');
    console.log('The 401 error might be due to:');
    console.log('1. Token not being passed correctly (our fix should address this)');
    console.log('2. Missing required headers');
    console.log('3. API endpoint changes');
    console.log('4. Session ID mismatch');
  }
  
  // Check if token is being used (compare with hardcoded one)
  const HARDCODED_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJjdXNfa2V5IjoiVTJGc2RHVmtYMThoTlRIT1g3cmIwSDJKQUY0YmNIckp5d0dNSG5CZHZDU0F6cFhIanY0RHVHQmQyWUtuUk5LaEZRZWVCc1BLMWt2aGVOdkk2RDcrUGc9PSIsImF1ZCI6WyJ6dXVsR2F0ZXdheSJdLCJ1c2VyX25hbWUiOiJZYXNlcjJ1cyIsImN1c1R5cGUiOiIxMCIsInNjb3BlIjpbIkVESVRfQkFOS0lORyIsIkVESVRfTk9OX0JBTktJTkciLCJSRUFEX0JBTktJTkciLCJSRUFEX05PTl9CQU5LSU5HIl0sIm1heWFfc2Vzc2lvbl9pZCI6IkBAQEEyMDI1MDczMTIxLjQzMDE0MTI4MDhAQEBAIiwibTJ1X3VzZXJfaWQiOjE3ODI3NzEzLCJwYW4iOiJZVTNDQjNveWcrK0pOVTJwcFpGNTZ1djVxQ3NtZ01sb3RYY0VtVFNLRVBzNG55T3R2TjBlc1pQRTBCSGJlWXZGNmRBdCtta2ExM2NZRmtId3NHejg2T1ZyL0ZOTlZmWk8ya1E2cjYyYTNkOFNrQzhzb01EN2k2VGYwcWpYczY4UFlVZDRabE1YYXNlWWk3Vkg1U1E0a2tUa1dSUHhxRjZOOElGb1ByOGkzOVU9IiwiZXhwIjoxNzg1NTQwNzU4LCJ1c2VySWQiOjUxMjYxMDksImp0aSI6Ijk5NmY3MTc4LWM4MDItNGIzZC1hYjM2LTc0MDYwYmZhNWY4NiIsImNsaWVudF9pZCI6Ik0yVUdBVEVXQVkifQ.MzsEONGYtBbT62PpUNbfVcX-dGk1-vonEQ0DZ0gL5jA';
  
  if (JWT_TOKEN === HARDCODED_TOKEN) {
    console.log('\n⚠️ WARNING: Your token is identical to the hardcoded fallback token');
    console.log('This means either:');
    console.log('1. You copied the hardcoded token by mistake');
    console.log('2. The hardcoded token was originally your token');
  } else {
    console.log('\n✅ Your token is different from the hardcoded fallback');
    console.log('This confirms you have a unique token');
  }
  
} catch (error) {
  console.error('❌ Error analyzing JWT token:', error.message);
}