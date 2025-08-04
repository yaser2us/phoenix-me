#!/usr/bin/env node

/**
 * Decode the token currently in the adapter
 */

import { MaybankAdapter } from './src/adapters/maybank-adapter.js';

const adapter = new MaybankAdapter();
const token = adapter.DEFAULT_JWT_TOKEN;

console.log('🔍 Current Token in Adapter:');
console.log('='.repeat(30));

try {
    const parts = token.split('.');
    if (parts.length !== 3) {
        throw new Error('Invalid JWT format');
    }
    
    const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
    
    console.log('User:', payload.user_name);
    console.log('Maya Session ID:', payload.maya_session_id);
    console.log('Token ID (jti):', payload.jti);
    console.log('Client ID:', payload.client_id);
    console.log('Expiration:', new Date(payload.exp * 1000).toISOString());
    console.log('Current Time:', new Date().toISOString());
    
    const expDate = new Date(payload.exp * 1000);
    const now = new Date();
    
    console.log('\n🕒 Time Analysis:');
    console.log('Is Expired (JWT):', now > expDate ? '❌ YES' : '✅ NO');
    console.log('Time until JWT expiry:', Math.round((expDate - now) / (1000 * 60 * 60 * 24)), 'days');
    
    // Analyze session ID
    console.log('\n🔑 Session Analysis:');
    if (payload.maya_session_id) {
        const sessionMatch = payload.maya_session_id.match(/@@@A(\d{10})\.(\d+)@@@@/);
        if (sessionMatch) {
            const dateStr = sessionMatch[1]; // YYYYMMDDHH format
            const timestamp = sessionMatch[2];
            
            const year = dateStr.substring(0, 4);
            const month = dateStr.substring(4, 6);
            const day = dateStr.substring(6, 8);
            const hour = dateStr.substring(8, 10);
            
            console.log('Session Date:', `${year}-${month}-${day} ${hour}:XX (Malaysia time)`);
            console.log('Session Timestamp:', timestamp);
            
            // Calculate session age
            const sessionDate = new Date(`${year}-${month}-${day}T${hour}:00:00+08:00`);
            const sessionAgeHours = (now - sessionDate) / (1000 * 60 * 60);
            
            console.log('Session Age:', Math.round(sessionAgeHours * 10) / 10, 'hours');
            console.log('Session Likely Expired:', sessionAgeHours > 0.5 ? '❌ YES (>30min)' : '✅ NO');
        }
    }
    
    console.log('\n💡 Next Steps:');
    if (payload.maya_session_id.includes('2025080107')) {
        console.log('• Token was created during 2025-08-01 07:XX Malaysia time');
        console.log('• Current time is much later - session expired');
        console.log('• Need fresh login session to get new JWT token');
    }
    
} catch (error) {
    console.error('❌ Token decode error:', error.message);
}