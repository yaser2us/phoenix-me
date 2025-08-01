#!/usr/bin/env node

/**
 * Quick token decoder to check expiration
 */

const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJjdXNfa2V5IjoiVTJGc2RHVmtYMTgoTlRIT1g3cmIwSDJKQUY0YmNIckp5d0dNSG5CZHZDU0F6cFhIanY0RHVHQmQyWUtuUk5LaEZRZWVCc1BLMWt2aGVOdkI2RDcrUGc9PSIsImF1ZCI6WyJ6dXVsR2F0ZXdheSJdLCJ1c2VyX25hbWUiOiJZYXNlcjJ1cyIsImN1c1R5cGUiOiIxMCIsInNjb3BlIjpbIkVESVRfQkFOS0lORyIsIkVESVRfTk9OX0JBTktJTkciLCJSRUFEX0JBTktJTkciLCJSRUFEX05PTl9CQU5LSU5HIl0sIm1heWFfc2Vzc2lvbl9pZCI6IkBAQEEyMDI1MDgwMTA3LjEyODA3NTU3OTVAQEBAIiwibTJ1X3VzZXJfaWQiOjE3ODI3NzEzLCJwYW4iOiJuTkxBSVNUQllSM1J4Uy81aHBxQnlJN1BlMTU1ck1YeE1EUkJpcUxxNUtDVHhaa2NTblRMT2Y0UW1TODgzbUdqNE9jWnhveStqYTlXQlA1WkQrOUxMRzdNNWhRZTdTYWgzbzNiQmRjMXV2QWtUd09vNnFZYW96TlpJb0ZURWovT2s2dVp0VVZtekRXZjlnbFdEZ0JNdWd2WncvcDUyOG1IZXlmSWRmY1JwUlE9IiwiZXhwIjoxNzg1NTc3MDE1LCJ1c2VySWQiOjUxMjYxMDksImp0aSI6ImNjYTkyZDViLTk0MjctNDY1MS1hMGU0LTdkNDE2Y2Y2MGY2NSIsImNsaWVudF9pZCI6Ik0yVUdBVEVXQVkifQ.vc5iWlr0qsXtvwGospoXjJDJAjgh8oKdvontdIdHF28';

try {
    const parts = token.split('.');
    if (parts.length !== 3) {
        throw new Error('Invalid JWT format');
    }
    
    const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
    
    console.log('🔍 Token Analysis:');
    console.log('================');
    console.log('User:', payload.user_name);
    console.log('Maya Session ID:', payload.maya_session_id);
    console.log('Expiration Timestamp:', payload.exp);
    
    const expDate = new Date(payload.exp * 1000);
    const now = new Date();
    
    console.log('Expiration Date:', expDate.toISOString());
    console.log('Current Date:', now.toISOString());
    console.log('Is Expired:', now > expDate ? '❌ YES' : '✅ NO');
    console.log('Time until expiry:', Math.round((expDate - now) / (1000 * 60 * 60 * 24)), 'days');
    
    console.log('\n🔧 Potential Issues:');
    
    // Check session ID format
    if (payload.maya_session_id) {
        console.log('Session ID Pattern:', payload.maya_session_id);
        if (payload.maya_session_id.includes('2025')) {
            console.log('⚠️  Session ID contains date - might be session-specific');
        }
    }
    
    // Check scopes
    console.log('Scopes:', payload.scope.join(', '));
    
} catch (error) {
    console.error('❌ Token decode error:', error.message);
}