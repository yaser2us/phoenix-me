{
  "openapi": "3.0.3",
  "info": {
    "title": "Banking API Gateway",
    "description": "Secure banking API for account management, transactions, and financial data access",
    "version": "1.0.0",
    "contact": {
      "name": "Banking API Support",
      "email": "api-support@bank.example.com"
    }
  },
  "servers": [
    {
      "url": "https://api.bank.example.com/v1",
      "description": "Production Banking API"
    },
    {
      "url": "https://sandbox-api.bank.example.com/v1", 
      "description": "Sandbox Banking API for testing"
    }
  ],
  "security": [
    {
      "bearerAuth": []
    }
  ],
  "paths": {
    "/accounts": {
      "get": {
        "operationId": "getAccounts",
        "summary": "Get user accounts",
        "description": "Retrieve all bank accounts associated with the authenticated user",
        "tags": ["Accounts"],
        "security": [
          {
            "bearerAuth": []
          }
        ],
        "parameters": [
          {
            "name": "includeBalances",
            "in": "query",
            "description": "Include current account balances",
            "required": false,
            "schema": {
              "type": "boolean",
              "default": true
            }
          },
          {
            "name": "accountType",
            "in": "query", 
            "description": "Filter by account type",
            "required": false,
            "schema": {
              "type": "string",
              "enum": ["checking", "savings", "credit", "investment"]
            }
          }
        ],
        "responses": {
          "200": {
            "description": "List of user accounts",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "accounts": {
                      "type": "array",
                      "items": {
                        "$ref": "#/components/schemas/Account"
                      }
                    },
                    "totalAccounts": {
                      "type": "integer"
                    }
                  }
                }
              }
            }
          },
          "401": {
            "$ref": "#/components/responses/Unauthorized"
          },
          "403": {
            "$ref": "#/components/responses/Forbidden"
          }
        }
      }
    },
    "/accounts/{accountId}": {
      "get": {
        "operationId": "getAccount",
        "summary": "Get specific account details", 
        "description": "Retrieve detailed information for a specific bank account",
        "tags": ["Accounts"],
        "security": [
          {
            "bearerAuth": []
          }
        ],
        "parameters": [
          {
            "name": "accountId",
            "in": "path",
            "description": "Unique account identifier",
            "required": true,
            "schema": {
              "type": "string",
              "pattern": "^[A-Za-z0-9]{8,16}$"
            }
          }
        ],
        "responses": {
          "200": {
            "description": "Account details",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/AccountDetailed"
                }
              }
            }
          },
          "404": {
            "$ref": "#/components/responses/NotFound"
          },
          "401": {
            "$ref": "#/components/responses/Unauthorized"
          }
        }
      }
    },
    "/accounts/{accountId}/balance": {
      "get": {
        "operationId": "getAccountBalance",
        "summary": "Get account balance",
        "description": "Retrieve current balance for a specific account",
        "tags": ["Accounts", "Balances"],
        "security": [
          {
            "bearerAuth": []
          }
        ],
        "parameters": [
          {
            "name": "accountId", 
            "in": "path",
            "description": "Unique account identifier",
            "required": true,
            "schema": {
              "type": "string",
              "pattern": "^[A-Za-z0-9]{8,16}$"
            }
          }
        ],
        "responses": {
          "200": {
            "description": "Account balance information",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/Balance"
                }
              }
            }
          },
          "404": {
            "$ref": "#/components/responses/NotFound"
          },
          "401": {
            "$ref": "#/components/responses/Unauthorized"
          }
        }
      }
    },
    "/accounts/{accountId}/transactions": {
      "get": {
        "operationId": "getAccountTransactions",
        "summary": "Get account transactions",
        "description": "Retrieve transaction history for a specific account",
        "tags": ["Transactions"],
        "security": [
          {
            "bearerAuth": []
          }
        ],
        "parameters": [
          {
            "name": "accountId",
            "in": "path", 
            "description": "Unique account identifier",
            "required": true,
            "schema": {
              "type": "string",
              "pattern": "^[A-Za-z0-9]{8,16}$"
            }
          },
          {
            "name": "startDate",
            "in": "query",
            "description": "Start date for transaction history (ISO 8601)",
            "required": false,
            "schema": {
              "type": "string",
              "format": "date"
            }
          },
          {
            "name": "endDate",
            "in": "query",
            "description": "End date for transaction history (ISO 8601)",
            "required": false,
            "schema": {
              "type": "string",
              "format": "date"
            }
          },
          {
            "name": "limit",
            "in": "query",
            "description": "Maximum number of transactions to return",
            "required": false,
            "schema": {
              "type": "integer",
              "minimum": 1,
              "maximum": 100,
              "default": 50
            }
          },
          {
            "name": "offset",
            "in": "query",
            "description": "Number of transactions to skip",
            "required": false,
            "schema": {
              "type": "integer",
              "minimum": 0,
              "default": 0
            }
          }
        ],
        "responses": {
          "200": {
            "description": "List of account transactions",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "transactions": {
                      "type": "array",
                      "items": {
                        "$ref": "#/components/schemas/Transaction"
                      }
                    },
                    "totalTransactions": {
                      "type": "integer"
                    },
                    "pagination": {
                      "$ref": "#/components/schemas/Pagination"
                    }
                  }
                }
              }
            }
          },
          "404": {
            "$ref": "#/components/responses/NotFound"
          },
          "401": {
            "$ref": "#/components/responses/Unauthorized"
          }
        }
      }
    },
    "/transactions/{transactionId}": {
      "get": {
        "operationId": "getTransaction",
        "summary": "Get transaction details",
        "description": "Retrieve detailed information for a specific transaction",
        "tags": ["Transactions"],
        "security": [
          {
            "bearerAuth": []
          }
        ],
        "parameters": [
          {
            "name": "transactionId",
            "in": "path",
            "description": "Unique transaction identifier", 
            "required": true,
            "schema": {
              "type": "string",
              "pattern": "^[A-Za-z0-9]{12,24}$"
            }
          }
        ],
        "responses": {
          "200": {
            "description": "Transaction details",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/TransactionDetailed"
                }
              }
            }
          },
          "404": {
            "$ref": "#/components/responses/NotFound"
          },
          "401": {
            "$ref": "#/components/responses/Unauthorized"
          }
        }
      }
    },
    "/transfers": {
      "post": {
        "operationId": "createTransfer",
        "summary": "Create money transfer",
        "description": "Transfer money between accounts",
        "tags": ["Transfers"],
        "security": [
          {
            "bearerAuth": []
          }
        ],
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/TransferRequest"
              }
            }
          }
        },
        "responses": {
          "201": {
            "description": "Transfer created successfully",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/TransferResponse"
                }
              }
            }
          },
          "400": {
            "$ref": "#/components/responses/BadRequest"
          },
          "401": {
            "$ref": "#/components/responses/Unauthorized"
          },
          "403": {
            "$ref": "#/components/responses/Forbidden"
          }
        }
      }
    },
    "/user/profile": {
      "get": {
        "operationId": "getUserProfile",
        "summary": "Get user profile",
        "description": "Retrieve authenticated user's profile information",
        "tags": ["User"],
        "security": [
          {
            "bearerAuth": []
          }
        ],
        "responses": {
          "200": {
            "description": "User profile information",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/UserProfile"
                }
              }
            }
          },
          "401": {
            "$ref": "#/components/responses/Unauthorized"
          }
        }
      }
    }
  },
  "components": {
    "securitySchemes": {
      "bearerAuth": {
        "type": "http",
        "scheme": "bearer",
        "bearerFormat": "JWT",
        "description": "JWT token for banking API authentication"
      }
    },
    "schemas": {
      "Account": {
        "type": "object",
        "required": ["accountId", "accountType", "accountName"],
        "properties": {
          "accountId": {
            "type": "string",
            "description": "Unique account identifier",
            "example": "ACC123456789"
          },
          "accountType": {
            "type": "string",
            "enum": ["checking", "savings", "credit", "investment"],
            "description": "Type of bank account"
          },
          "accountName": {
            "type": "string",
            "description": "Display name for the account",
            "example": "Primary Checking"
          },
          "accountNumber": {
            "type": "string",
            "description": "Masked account number", 
            "example": "****1234"
          },
          "balance": {
            "$ref": "#/components/schemas/Balance"
          },
          "currency": {
            "type": "string",
            "description": "Account currency code",
            "example": "USD"
          },
          "status": {
            "type": "string",
            "enum": ["active", "inactive", "frozen", "closed"],
            "description": "Current account status"
          }
        }
      },
      "AccountDetailed": {
        "allOf": [
          {
            "$ref": "#/components/schemas/Account"
          },
          {
            "type": "object",
            "properties": {
              "openedDate": {
                "type": "string",
                "format": "date",
                "description": "Date account was opened"
              },
              "interestRate": {
                "type": "number",
                "multipleOf": 0.01,
                "description": "Current interest rate (if applicable)"
              },
              "minimumBalance": {
                "type": "number",
                "description": "Minimum required balance"
              },
              "overdraftLimit": {
                "type": "number", 
                "description": "Overdraft limit (if applicable)"
              }
            }
          }
        ]
      },
      "Balance": {
        "type": "object",
        "required": ["available", "current"],
        "properties": {
          "available": {
            "type": "number",
            "description": "Available balance for spending",
            "example": 2500.75
          },
          "current": {
            "type": "number", 
            "description": "Current account balance",
            "example": 2750.50
          },
          "pending": {
            "type": "number",
            "description": "Pending transactions amount",
            "example": 249.75
          },
          "currency": {
            "type": "string",
            "description": "Currency code",
            "example": "USD"
          },
          "asOfDate": {
            "type": "string",
            "format": "date-time",
            "description": "Balance as of this date/time"
          }
        }
      },
      "Transaction": {
        "type": "object",
        "required": ["transactionId", "amount", "date", "description"],
        "properties": {
          "transactionId": {
            "type": "string",
            "description": "Unique transaction identifier",
            "example": "TXN20240101ABC123"
          },
          "amount": {
            "type": "number",
            "description": "Transaction amount (negative for debits)",
            "example": -45.67
          },
          "currency": {
            "type": "string", 
            "description": "Transaction currency",
            "example": "USD"
          },
          "date": {
            "type": "string",
            "format": "date-time",
            "description": "Transaction date and time"
          },
          "description": {
            "type": "string",
            "description": "Transaction description", 
            "example": "ATM Withdrawal"
          },
          "category": {
            "type": "string",
            "description": "Transaction category",
            "example": "Cash Withdrawal"
          },
          "type": {
            "type": "string",
            "enum": ["debit", "credit", "transfer", "fee", "interest"],
            "description": "Transaction type"
          },
          "status": {
            "type": "string",
            "enum": ["pending", "completed", "failed", "cancelled"],
            "description": "Transaction status"
          },
          "merchant": {
            "type": "object",
            "properties": {
              "name": {
                "type": "string",
                "description": "Merchant name"
              },
              "category": {
                "type": "string", 
                "description": "Merchant category"
              },
              "location": {
                "type": "string",
                "description": "Transaction location"
              }
            }
          }
        }
      },
      "TransactionDetailed": {
        "allOf": [
          {
            "$ref": "#/components/schemas/Transaction"
          },
          {
            "type": "object",
            "properties": {
              "runningBalance": {
                "type": "number",
                "description": "Account balance after this transaction"
              },
              "checkNumber": {
                "type": "string",
                "description": "Check number (if applicable)"
              },
              "reference": {
                "type": "string", 
                "description": "External reference number"
              },
              "tags": {
                "type": "array",
                "items": {
                  "type": "string"
                },
                "description": "User-defined tags"
              }
            }
          }
        ]
      },
      "TransferRequest": {
        "type": "object",
        "required": ["fromAccountId", "toAccountId", "amount"],
        "properties": {
          "fromAccountId": {
            "type": "string",
            "description": "Source account ID",
            "example": "ACC123456789"
          },
          "toAccountId": {
            "type": "string",
            "description": "Destination account ID",
            "example": "ACC987654321"
          },
          "amount": {
            "type": "number",
            "minimum": 0.01,
            "description": "Transfer amount",
            "example": 500.00
          },
          "currency": {
            "type": "string",
            "description": "Transfer currency",
            "example": "USD"
          },
          "description": {
            "type": "string",
            "maxLength": 200,
            "description": "Transfer description",
            "example": "Monthly savings transfer"
          },
          "scheduledDate": {
            "type": "string",
            "format": "date",
            "description": "Scheduled transfer date (if not immediate)"
          }
        }
      },
      "TransferResponse": {
        "type": "object",
        "properties": {
          "transferId": {
            "type": "string",
            "description": "Unique transfer identifier"
          },
          "status": {
            "type": "string",
            "enum": ["pending", "processing", "completed", "failed"],
            "description": "Transfer status"
          },
          "transactionId": {
            "type": "string",
            "description": "Associated transaction ID"
          },
          "amount": {
            "type": "number",
            "description": "Transfer amount"
          },
          "fee": {
            "type": "number",
            "description": "Transfer fee (if applicable)"
          },
          "estimatedCompletionTime": {
            "type": "string",
            "format": "date-time",
            "description": "Estimated completion time"
          }
        }
      },
      "UserProfile": {
        "type": "object",
        "properties": {
          "userId": {
            "type": "string",
            "description": "Unique user identifier"
          },
          "firstName": {
            "type": "string",
            "description": "User's first name"
          },
          "lastName": {
            "type": "string", 
            "description": "User's last name"
          },
          "email": {
            "type": "string",
            "format": "email",
            "description": "User's email address"
          },
          "phone": {
            "type": "string",
            "description": "User's phone number (masked)"
          },
          "address": {
            "type": "object",
            "properties": {
              "street": {
                "type": "string"
              },
              "city": {
                "type": "string"
              },
              "state": {
                "type": "string"
              },
              "zipCode": {
                "type": "string"
              },
              "country": {
                "type": "string"
              }
            }
          },
          "preferences": {
            "type": "object",
            "properties": {
              "currency": {
                "type": "string",
                "description": "Preferred currency"
              },
              "language": {
                "type": "string",
                "description": "Preferred language"
              },
              "notifications": {
                "type": "object",
                "properties": {
                  "email": {
                    "type": "boolean"
                  },
                  "sms": {
                    "type": "boolean"
                  },
                  "push": {
                    "type": "boolean"
                  }
                }
              }
            }
          }
        }
      },
      "Pagination": {
        "type": "object",
        "properties": {
          "limit": {
            "type": "integer",
            "description": "Number of items per page"
          },
          "offset": {
            "type": "integer",
            "description": "Number of items skipped"
          },
          "total": {
            "type": "integer",
            "description": "Total number of items"
          },
          "hasMore": {
            "type": "boolean",
            "description": "Whether more items are available"
          }
        }
      },
      "Error": {
        "type": "object",
        "required": ["error", "message"],
        "properties": {
          "error": {
            "type": "string",
            "description": "Error code"
          },
          "message": {
            "type": "string",
            "description": "Human-readable error message"
          },
          "details": {
            "type": "object",
            "description": "Additional error details"
          },
          "requestId": {
            "type": "string",
            "description": "Unique request identifier for support"
          }
        }
      }
    },
    "responses": {
      "Unauthorized": {
        "description": "Authentication required or invalid",
        "content": {
          "application/json": {
            "schema": {
              "$ref": "#/components/schemas/Error"
            },
            "example": {
              "error": "unauthorized",
              "message": "Invalid or expired JWT token",
              "requestId": "req_123456789"
            }
          }
        }
      },
      "Forbidden": {
        "description": "Access denied - insufficient permissions",
        "content": {
          "application/json": {
            "schema": {
              "$ref": "#/components/schemas/Error"
            },
            "example": {
              "error": "forbidden", 
              "message": "Insufficient permissions to access this resource",
              "requestId": "req_123456789"
            }
          }
        }
      },
      "NotFound": {
        "description": "Resource not found",
        "content": {
          "application/json": {
            "schema": {
              "$ref": "#/components/schemas/Error"
            },
            "example": {
              "error": "not_found",
              "message": "The requested resource was not found",
              "requestId": "req_123456789"
            }
          }
        }
      },
      "BadRequest": {
        "description": "Invalid request parameters",
        "content": {
          "application/json": {
            "schema": {
              "$ref": "#/components/schemas/Error"
            },
            "example": {
              "error": "bad_request",
              "message": "Invalid request parameters",
              "details": {
                "validationErrors": [
                  {
                    "field": "amount",
                    "message": "Amount must be greater than 0"
                  }
                ]
              },
              "requestId": "req_123456789"
            }
          }
        }
      }
    }
  },
  "tags": [
    {
      "name": "Accounts",
      "description": "Bank account management operations"
    },
    {
      "name": "Balances",
      "description": "Account balance inquiries"
    },
    {
      "name": "Transactions", 
      "description": "Transaction history and details"
    },
    {
      "name": "Transfers",
      "description": "Money transfer operations"
    },
    {
      "name": "User",
      "description": "User profile and preferences"
    }
  ]
}