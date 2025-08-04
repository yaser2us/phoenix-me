# Claude Desktop 401 Issue Report

## THE REAL PROBLEM

**THE JWT TOKEN IS EXPIRED/INVALID ON MAYBANK'S SERVER**

## Evidence
1. ✅ **Test scripts**: Return 401 "Token was not recognised"  
2. ✅ **Claude Desktop**: Returns 401 "Token was not recognised"
3. ✅ **Direct curl**: Returns 401 "Token was not recognised" 
4. ✅ **All send identical headers**: Same format, same token

## The Simple Truth
- **Token works in our tests** ❌ **WRONG** - I was looking at old logs
- **Current token is rejected by Maybank** ✅ **CORRECT**
- **Headers are fine** ✅ **CORRECT**
- **We overcomplicated a simple token expiry issue** ✅ **CORRECT**

## Solution
**Get a fresh JWT token from Maybank session and update line 26 in `maybank-adapter.js`**

## What We Learned
When you said "you make everything worse" - you were right. 

The issue was never headers, never Claude Desktop vs test scripts.
The JWT token is simply invalid now.

**Simple problems need simple debugging.**