# Workflow Schema Documentation

## Overview
This document describes the workflow structure and schema used in the Phoenix-ME MCP API Gateway system.

## Workflow Structure

### Basic Workflow Schema
```javascript
{
  "id": "string",           // Optional: Auto-generated if not provided (format: wf_timestamp_random)
  "name": "string",         // Optional: Human-readable workflow name
  "description": "string",  // Optional: Detailed description of what the workflow does
  "steps": [                // REQUIRED: Array of workflow steps
    {
      "id": "string",       // Optional: Step ID (auto-generated as step_1, step_2, etc.)
      "operation": "string", // REQUIRED: API operation ID (e.g., "getCurrentWeather")
      "parameters": {},      // Optional: Parameters for the operation
      "order": 1,           // Optional: Execution order (auto-assigned based on array position)
      "dependencies": []    // Optional: Array of step IDs this step depends on
    }
  ],
  "dataFlowMap": {},       // Optional: Defines how data flows between steps
  "tags": [],              // Optional: Array of tags for categorization
  "metadata": {}           // Optional: Additional metadata
}
```

## Available Operations

### Weather APIs
- `getCurrentWeather` - Get current weather for a location
  - Parameters: `{ q: "city name" }`

### Banking APIs (Maybank)
- `getBalance` - Get account balance
  - Parameters: `{}` (uses authenticated session)
- `getExpensesSummary` - Get expenses summary
  - Parameters: `{ period: "day" | "week" | "month" | "year" }`
- `getBillPaymentStatus` - Get bill payment status
  - Parameters: `{}`

### Currency APIs
- `getCurrencyRates` - Get currency exchange rates
  - Parameters: `{ base: "currency code" }` (e.g., "MYR", "USD")

### Expense APIs
- `listExpenses` - List expenses
  - Parameters: `{ limit: number, offset: number }`
- `getExpenseById` - Get specific expense
  - Parameters: `{ id: "expense_id" }`
- `createExpense` - Create new expense
  - Parameters: `{ amount: number, category: string, description: string }`

### Goals APIs
- `listGoals` - List all goals
  - Parameters: `{ status: "active" | "completed" | "all" }`
- `createGoal` - Create a new goal
  - Parameters: `{ name: string, target: number, deadline: string }`

### Payment APIs
- `listPaymentMethods` - List payment methods
  - Parameters: `{}`
- `initiatePayment` - Initiate a payment
  - Parameters: `{ amount: number, recipient: string, method: string }`

## Workflow Examples

### 1. Simple Single-Step Workflow
```json
{
  "name": "Check Weather",
  "steps": [
    {
      "operation": "getCurrentWeather",
      "parameters": { "q": "Kuala Lumpur" }
    }
  ]
}
```

### 2. Multi-Step Banking Dashboard
```json
{
  "name": "Financial Overview",
  "description": "Get complete financial status",
  "steps": [
    {
      "id": "step_1",
      "operation": "getBalance",
      "parameters": {}
    },
    {
      "id": "step_2", 
      "operation": "getExpensesSummary",
      "parameters": { "period": "month" }
    },
    {
      "id": "step_3",
      "operation": "getBillPaymentStatus",
      "parameters": {}
    }
  ]
}
```

### 3. Cross-Domain Workflow with Dependencies
```json
{
  "name": "Weather-Adjusted Financial Planning",
  "description": "Combine weather and financial data for insights",
  "steps": [
    {
      "id": "weather",
      "operation": "getCurrentWeather",
      "parameters": { "q": "Kuala Lumpur" },
      "order": 1
    },
    {
      "id": "balance",
      "operation": "getBalance",
      "parameters": {},
      "order": 2
    },
    {
      "id": "currency",
      "operation": "getCurrencyRates",
      "parameters": { "base": "MYR" },
      "order": 3
    },
    {
      "id": "synthesis",
      "operation": "synthesize_financial_overview",
      "parameters": {},
      "order": 4,
      "dependencies": ["weather", "balance", "currency"]
    }
  ]
}
```

### 4. Workflow with Data Flow
```json
{
  "name": "Currency Conversion Flow",
  "steps": [
    {
      "id": "get_balance",
      "operation": "getBalance",
      "parameters": {}
    },
    {
      "id": "get_rates",
      "operation": "getCurrencyRates", 
      "parameters": { "base": "MYR" }
    },
    {
      "id": "convert",
      "operation": "convert_balance_currency",
      "parameters": { "targetCurrency": "USD" },
      "dependencies": ["get_balance", "get_rates"]
    }
  ],
  "dataFlowMap": {
    "convert": [
      {
        "from": "get_balance",
        "to": "convert",
        "field": "balance",
        "transformation": "extract_amount"
      },
      {
        "from": "get_rates",
        "to": "convert", 
        "field": "exchangeRate",
        "transformation": "extract_usd_rate"
      }
    ]
  }
}
```

## Synthetic Operations (Phase 4.9)
These are special operations created by the composition system:

- `synthesize_response` - Combine multiple API responses
- `synthesize_financial_overview` - Create comprehensive financial summary
- `analyze_weather_spending_patterns` - Analyze spending based on weather
- `convert_balance_currency` - Convert balance to different currency
- `create_comprehensive_dashboard` - Create full dashboard from multiple sources

## Best Practices

1. **Use descriptive names** - Help users understand what the workflow does
2. **Add descriptions** - Explain the workflow's purpose and value
3. **Use tags** - Make workflows discoverable (e.g., "daily", "financial", "weather")
4. **Order steps logically** - Put dependencies before dependent steps
5. **Minimize parameters** - Only include necessary parameters
6. **Test before saving** - Execute the workflow to ensure it works

## Tools for Workflow Management

### Saving Workflows
- `save_workflow` - Save any workflow (no restrictions)
- `save_workflow_innovation` - Save innovative cross-domain workflows

### Discovering Workflows
- `get_workflow_library` - List all saved workflows
- `recall_similar_workflows` - Find workflows similar to your intent
- `discover_workflow_innovations` - Get AI-suggested innovative workflows

### Executing Workflows
- `execute_dynamic_workflow` - Execute a workflow plan
- `execute_workflow` - Execute a saved workflow by ID

## Integration with Claude Desktop

When using Claude Desktop, you can:
1. Describe what you want in natural language
2. The system will compose a workflow using available operations
3. Execute the workflow to test it
4. Save it if you want to reuse it later

Example prompts:
- "Check the weather and my bank balance"
- "Create a financial dashboard with all my banking info"
- "Convert my balance to USD using current rates"
- "Show me weather-based spending insights"