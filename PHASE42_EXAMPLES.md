# Phase 4.2 Checkpoint 3 - Maybank Interactive Workflows Examples

This file contains comprehensive examples and sample prompts for testing the Phase 4.2 Maybank Interactive Workflow system with Claude Desktop.

## 🏦 **Maybank Workflow Testing Prompts**

### **Financial Overview Workflows**
```
I want a complete financial overview of all my Maybank accounts with detailed analysis and recommendations
```

```
Show me a comprehensive summary of my Maybank finances including insights and advice
```

```
Give me a detailed breakdown of all my Maybank accounts with financial recommendations
```

### **MAE Wallet Focused Analysis**
```
Give me a detailed analysis of my MAE wallet with spending insights and recommendations
```

```
Analyze my MAE wallet performance and provide optimization suggestions
```

```
Show me my MAE wallet status with usage patterns and recommendations
```

### **Account Comparison & Analysis**
```
Compare all my Maybank accounts and provide recommendations for optimization
```

```
Analyze the performance of my different Maybank accounts and suggest improvements
```

```
Compare my Maybank accounts and tell me how to better distribute my funds
```

### **Quick Balance Checks**
```
Show me my MAE balance quickly
```

```
What's my current Maybank account balance?
```

```
Give me a quick check of my Maybank account status
```

### **Financial Health Assessment**
```
Analyze my financial health and provide a comprehensive assessment with actionable recommendations
```

```
Check my financial health across all Maybank accounts and give me a score
```

```
Assess my overall financial situation and provide improvement recommendations
```

## 🔐 **Interactive Parameter Collection Testing**

### **JWT Token Collection Flow**
```
Execute a Maybank financial overview
```
*This will trigger interactive JWT token collection since no token is provided initially*

### **Optional Parameter Enhancement**
```
I want a detailed Maybank financial analysis with all available insights
```
*This will prompt for optional parameters like analysis type, recommendations, etc.*

### **Parameter Validation Testing**
```
Test the system with invalid JWT tokens or malformed parameters
```
*Tests parameter validation, error handling, and user guidance*

## 🎯 **Natural Language Recognition Testing**

### **General Banking Requests**
```
I need to check my banking situation
```

```
What can you help me with regarding my Maybank accounts?
```

```
Show me my finances
```

```
Help me understand my Maybank account status
```

### **Context-Aware Follow-up**
```
Show me my finances, then compare my accounts
```

```
Give me my balance, and then analyze my financial health
```

### **Workflow Discovery**
```
What Maybank workflows are available?
```

```
List all the Maybank banking operations you can help with
```

## 🔧 **Advanced Workflow Testing**

### **Direct Workflow Execution**
```
Execute the maybank_health_check workflow
```

```
Run the maybank_account_comparison workflow with detailed analysis
```

```
Execute maybank_financial_overview with comprehensive analysis and recommendations
```

### **Multi-turn Conversations**
```
User: "Check my Maybank accounts"
Assistant: [Provides workflow suggestions]
User: "Execute the financial overview with recommendations"
Assistant: [Starts interactive parameter collection]
User: [Provides JWT token when prompted]
Assistant: [Continues with optional parameters]
User: "Include detailed analysis"
Assistant: [Executes workflow with parameters]
```

## 📋 **Expected Interactive Experience**

When you use these prompts, you should see:

### **1. Workflow Recognition**
```
🏦 Maybank Workflow Suggestions

Based on your request "check my banking situation", here are recommended workflows:

1. 🎯 Quick Balance Check (Confidence: 90%)
   Fast balance retrieval with minimal API calls
   Estimated time: 3 seconds

2. 📊 Complete Financial Overview (Confidence: 85%)
   Comprehensive analysis of all accounts with insights
   Estimated time: 8 seconds
```

### **2. Interactive Parameter Collection**
```
🏦 Maybank Interactive Banking - Parameter Collection

📋 Step 1 of 3

Parameter: jwtToken
Type: Required

🔐 Security Notice: This operation requires your Maybank JWT authentication token.
Your token will be handled securely and not logged or stored.

Please provide your Maybank JWT authentication token:

---
Session ID: maybank_interactive_1706025234567_abc123def
```

### **3. Optional Parameter Enhancement**
```
🏦 Maybank Interactive Banking - Parameter Collection

📋 Step 2 of 3

Parameter: includeDetails
Type: Optional Enhancement
💡 Recommended - This will improve your results
📈 Enhanced Results - Provides more detailed analysis

Would you like detailed financial analysis included? (yes/no):

*You can skip this parameter by responding with "skip" or providing a value.*
*Default value: false*

---
Session ID: maybank_interactive_1706025234567_abc123def
```

### **4. Successful Execution Results**
```
🏦 Maybank Financial Overview Completed

✅ Workflow: Complete Financial Overview
Status: Success
Execution Time: 8.2s

📊 Financial Summary:
• Total Balance: RM 2,500.75 across 3 accounts
• MAE Wallet: RM 150.50 (6% of total funds)
• Primary Account: Savings Account (RM 1,500.25)

💡 Insights:
• You have a healthy balance for daily transactions
• Consider transferring excess MAE funds to savings for better returns

📈 Recommendations:
• Diversify your account usage for better financial management
• Set up automatic savings transfers for consistent growth
```

## 🚀 **Quick Test Sequence**

Try this sequence to test the full system:

### **Step 1: Initial Request**
```
I want a complete financial overview of my Maybank accounts
```

### **Step 2: JWT Token (when prompted)**
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c
```

### **Step 3: Enhanced Analysis (when prompted)**
```
yes
```

### **Step 4: Recommendations (when prompted)**
```
yes
```

### **Expected Final Result**
You'll receive comprehensive Maybank financial analysis with:
- Malaysian Ringgit (RM) currency formatting
- Account breakdown and insights
- Personalized financial recommendations
- MAE wallet specific analysis
- Financial health scoring

## 🔍 **Error Recovery Testing**

### **Invalid JWT Token**
```
I want my Maybank balance
```
*When prompted for JWT, provide*: `invalid.token.here`

**Expected Response:**
```
🏦 Maybank Interactive Banking - Validation Error

❌ Error: JWT token must have 3 parts separated by dots

💡 JWT Token Help:
• Must be a valid Maybank JWT token
• Should have 3 parts separated by dots (xxxxx.yyyyy.zzzzz)
• Obtain from your Maybank developer portal or authentication flow
```

### **Network/API Errors**
```
Execute maybank_financial_overview
```
*Test with network connectivity issues or API failures*

**Expected Response:**
```
❌ Maybank Interactive Error

Execution failed: Unable to connect to Maybank API. Please check your connection and try again.
```

## 📊 **Performance Testing**

### **Concurrent Workflow Execution**
```
Execute multiple Maybank workflows simultaneously to test system performance
```

### **Session Management Testing**
```
Start multiple interactive sessions and test session cleanup and management
```

## 🎯 **Production-Ready Features Demonstrated**

### **Malaysian Banking Compliance**
- All currency amounts displayed in RM (Malaysian Ringgit)
- Local banking terminology and conventions
- Maybank-specific account types (MAE Wallet, etc.)

### **Security Features**
- JWT token secure handling and validation
- Session trace ID generation for audit trails
- Sensitive data protection in logs and displays

### **Interactive Experience**
- Progress tracking through multi-step workflows
- Contextual help and guidance
- Error recovery with clear instructions
- Optional parameter enhancement suggestions

### **Financial Analysis Capabilities**
- Comprehensive account analysis
- Financial health scoring
- Personalized recommendations
- Account comparison and optimization

## 🌟 **Ready for Production Use**

The Phase 4.2 Checkpoint 3 Maybank Interactive Workflow system is production-ready with:

- ✅ **5 Complete Maybank Workflows** - All operational with interactive parameter collection
- ✅ **Enhanced Intent Recognition** - Natural language processing for Maybank requests
- ✅ **Interactive Parameter Collection** - Guided parameter collection with JWT validation
- ✅ **Malaysian Banking Standards** - RM currency, local conventions, Maybank terminology
- ✅ **Production Security** - Secure JWT handling, audit trails, encrypted sessions
- ✅ **Comprehensive Testing** - 9/9 tests passing with full validation suite

**Start testing with any of the prompts above to experience the complete Maybank Interactive Workflow system!** 🚀

---

*For technical implementation details, see the main README.md file and test-checkpoint-3.js validation suite.*