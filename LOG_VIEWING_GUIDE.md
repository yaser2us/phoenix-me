# 📋 Log Viewing Guide for Claude Desktop

## 🔍 Where to Find Debug Logs

When you use **Claude Desktop** to call the MCP server, debug logs are automatically written to:

```
/Users/80001411yasserbatole/Documents/GitHub/phoenix-me/logs/
```

## 📁 Log File Naming

Log files are named with timestamps:
```
get_payment_favList_1_2025-07-31T23-32-45-737Z.log
```

## 🖥️ How to View Logs in Claude Desktop

### Method 1: Read Log File Directly
```
Read the file: /Users/80001411yasserbatole/Documents/GitHub/phoenix-me/logs/get_payment_favList_1_[TIMESTAMP].log
```

### Method 2: List and Read Latest Log
```
1. List files in: /Users/80001411yasserbatole/Documents/GitHub/phoenix-me/logs/
2. Read the most recent get_payment_favList_1_*.log file
```

### Method 3: Use the MCP Server to Find Logs
Ask Claude Desktop:
```
"Show me the latest debug log file for get_payment_favList_1"
```

## 📊 What's in the Debug Logs

Each log contains:

1. **Entry Point** - Initial request with all parameters
2. **JWT Token Analysis** - Token validation and expiration info
3. **Header Building** - What headers are constructed
4. **API Call** - Exact HTTP request made (including curl command)
5. **API Response** - Full response from Maybank API
6. **Session Summary** - Final result and timing

## 🔧 Updated Configuration

✅ **Fixed Issues:**
- JWT token now uses your working token by default
- Debug logging captures every step
- Curl command generation for manual testing

## 🎯 Testing from Claude Desktop

You can now call:
```
get_payment_favList_1 with parameters:
{
  "Accept": "application/json",
  "X-APP-PLATFORM": "IOS",
  "X-APP-VERSION": "0.9.38"
}
```

The system will:
1. Use your working JWT token automatically
2. Generate a debug log
3. Return payment favorites or detailed error info

## 📝 Example Debug Log Analysis

When you read a log file, look for:

- **JWT_ANALYSIS** section - Shows if token is valid/expired
- **API_CALL** section - Shows exact headers sent
- **API_RESPONSE** section - Shows what Maybank returned
- **curlCommand** - Copy/paste to test manually

## 🚀 Next Steps

1. Try calling `get_payment_favList_1` from Claude Desktop
2. Check the logs directory for the debug file
3. Read the log file to see the complete flow
4. Compare successful vs failed attempts

The debug logging system will help you identify exactly why calls succeed or fail! 🎉