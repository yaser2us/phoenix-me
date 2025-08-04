# Phase 4.7: Enhanced API Parameter & Payload Validation

## Overview
Implement comprehensive parameter and request body validation with interactive user prompting and retry mechanisms. Ensure all OpenAPI spec requirements are validated before API calls.

## Current Gaps Analysis

### What We Have ✅
- Parameter validation for GET requests (query, path, header)
- Basic type validation (string, number, boolean)
- Required parameter checking
- Default value application
- Parameter alias mapping

### What's Missing ❌
1. **Request Body Validation**: No validation for POST/PUT request bodies
2. **Schema Reference Resolution**: No `$ref` support for complex schemas
3. **Interactive Parameter Collection**: Missing parameters don't prompt user interactively
4. **Nested Object Validation**: Complex objects not validated properly
5. **Retry After User Input**: No mechanism to retry API call after user provides data
6. **Real-time Validation Feedback**: Users don't get immediate validation errors


## Implementation Plan
## 📋 CHECKPOINT-BASED IMPLEMENTATION

### Phase 4.7.1: Enhanced Request Body Validation
**Goal**: Add comprehensive request body validation for POST/PUT requests

**Components to Build:**
1. **RequestBodyValidator** - Validates POST/PUT request bodies against OpenAPI schemas
2. **SchemaResolver** - Resolves `$ref` references in OpenAPI schemas
3. **NestedObjectValidator** - Validates complex nested objects and arrays

**Implementation:**
```javascript
// src/validation/request-body-validator.js
export class RequestBodyValidator {
  async validateRequestBody(body, operationSpec, apiRegistry) {
    // 1. Extract requestBody schema from operation
    // 2. Resolve any $ref references
    // 3. Validate body against resolved schema
    // 4. Return validation results with specific error paths
  }
}

// src/validation/schema-resolver.js
export class SchemaResolver {
  resolveSchema(schema, componentsSchemas) {
    // Handle $ref resolution recursively
    // Support both local (#/components/schemas/X) and external refs
  }
}
```

### Phase 4.7.2: Interactive Parameter Collection System
**Goal**: Prompt users for missing required parameters/body fields with retry

**Components to Build:**
1. **InteractiveParameterCollector** - Enhanced version with body field support
2. **ValidationErrorFormatter** - Formats validation errors for user-friendly prompts
3. **RetryManager** - Manages retry attempts after user provides missing data

**Implementation:**
```javascript
// src/interaction/interactive-parameter-collector.js
export class InteractiveParameterCollector {
  async collectMissingParameters(operation, userInput, validationResult) {
    // 1. Identify missing required parameters and body fields
    // 2. Generate user-friendly prompts for each missing field
    // 3. Support nested object field collection
    // 4. Handle parameter dependencies
  }
  
  async collectMissingBodyFields(schema, currentBody, path = '') {
    // Collect missing fields in request body interactively
  }
}
```

### Phase 4.7.3: Comprehensive Validation Pipeline
**Goal**: Integrate all validation into a unified pipeline with user interaction

**Components to Enhance:**
1. **RequestBuilder** - Add request body building and validation
2. **ApiExecutor** - Add pre-execution validation with user prompting
3. **ConversationalWorkflowManager** - Integrate validation into conversations

**Implementation Flow:**
```
1. User makes API request
2. Extract parameters and body from user input
3. Validate parameters (existing logic)
4. Validate request body (NEW)
5. If validation fails:
   a. Prompt user interactively for missing/invalid data
   b. Collect user response
   c. Re-validate with new data
   d. Repeat until valid or user cancels
6. Execute API call with fully validated data
```

### Phase 4.7.4: Advanced Schema Validation Features
**Goal**: Support advanced OpenAPI validation features

**Features to Add:**
1. **Enum Validation** - Validate against allowed values
2. **Pattern Validation** - Regex pattern matching
3. **Range Validation** - Min/max values for numbers
4. **Array Validation** - Min/max items, unique items
5. **Conditional Validation** - OneOf, AnyOf, AllOf schemas
6. **Custom Format Validation** - Date, email, UUID formats

## Detailed Implementation

### 1. Request Body Validation Enhancement

**Current RequestBuilder Enhancement:**
```javascript
// src/execution/request-builder.js
static buildRequest(operationDetails, userParameters, authConfig) {
  // ... existing parameter logic ...
  
  // NEW: Handle request body for POST/PUT requests
  if (operationDetails.requestBody) {
    const bodyValidation = this.validateAndBuildRequestBody(
      userParameters, 
      operationDetails.requestBody
    );
    
    if (!bodyValidation.valid) {
      return {
        success: false,
        errors: bodyValidation.errors,
        missingFields: bodyValidation.missingFields,
        needsUserInput: true
      };
    }
    
    requestConfig.data = bodyValidation.body;
    requestConfig.headers['Content-Type'] = 'application/json';
  }
  
  return { success: true, requestConfig };
}
```

### 2. Interactive Collection Integration

**Enhanced ConversationalWorkflowManager:**
```javascript
// src/interaction/conversational-workflow-manager.js
async executeApiOperation(operationId, userParameters) {
  let attempts = 0;
  const maxAttempts = 3;
  
  while (attempts < maxAttempts) {
    // Build and validate request
    const buildResult = RequestBuilder.buildRequest(operation, userParameters, auth);
    
    if (buildResult.success) {
      // Execute API call
      return await this.executor.execute(buildResult.requestConfig);
    }
    
    if (buildResult.needsUserInput) {
      // Collect missing data interactively
      const collectionResult = await this.collectMissingData(
        buildResult.errors,
        buildResult.missingFields,
        operation
      );
      
      if (collectionResult.cancelled) {
        return { cancelled: true };
      }
      
      // Merge collected data with existing parameters
      userParameters = { ...userParameters, ...collectionResult.data };
      attempts++;
    } else {
      throw new Error(`Validation failed: ${buildResult.errors.join(', ')}`);
    }
  }
  
  throw new Error('Max retry attempts reached');
}
```

### 3. Schema-Based Body Validation

**Example for Bill Payment API:**
```javascript
// Validate against: #/components/schemas/bills_getBillsTxnHistory_body
const schema = {
  type: 'object',
  required: ['payeeCode', 'billAcctNo'],
  properties: {
    payeeCode: { type: 'string', pattern: '^[0-9]{4}$' },
    billAcctNo: { type: 'string', minLength: 10 },
    favBillPaymentStep2: { type: 'string' },
    fullName: { type: 'string', maxLength: 100 },
    shortName: { type: 'string', maxLength: 50 }
  }
};

// Validation would check:
// ✅ payeeCode is 4 digits
// ✅ billAcctNo is at least 10 characters  
// ✅ All required fields present
// ✅ String lengths within limits
```

## Phase 4.7 Checkpoints

### Checkpoint 1: Request Body Validation Foundation
- [ ] RequestBodyValidator implementation
- [ ] SchemaResolver for $ref handling
- [ ] Enhanced RequestBuilder with body support
- [ ] Basic POST request validation working

### Checkpoint 2: Interactive Parameter Collection
- [ ] InteractiveParameterCollector enhanced for body fields
- [ ] ValidationErrorFormatter for user-friendly messages
- [ ] Basic user prompting for missing body fields working

### Checkpoint 3: Retry & Recovery System
- [ ] RetryManager implementation
- [ ] Integration with ConversationalWorkflowManager
- [ ] Full retry flow working end-to-end

### Checkpoint 4: Advanced Validation Features
- [ ] Enum, pattern, range validation
- [ ] Array and nested object validation
- [ ] Conditional schema validation (OneOf, AnyOf)

### Checkpoint 5: Production Integration
- [ ] Integration with all existing Phase 4.x features
- [ ] Comprehensive testing with Maybank APIs
- [ ] Performance optimization
- [ ] Documentation and examples

## Success Criteria

**Functional Requirements:**
1. ✅ All POST/PUT requests validated against OpenAPI request body schemas
2. ✅ Missing required parameters/body fields prompt user interactively
3. ✅ Users can provide missing data and retry API calls seamlessly
4. ✅ Complex nested objects validated properly
5. ✅ Schema references ($ref) resolved correctly
6. ✅ Validation errors provide clear, actionable feedback

**Technical Requirements:**
1. ✅ Zero breaking changes to existing functionality
2. ✅ Performance impact <50ms per validation
3. ✅ Full integration with conversational workflows
4. ✅ Support for all OpenAPI 3.0 validation features
5. ✅ Comprehensive error handling and recovery

**User Experience:**
1. ✅ Natural language prompts for missing data
2. ✅ Smart suggestions based on schema constraints
3. ✅ Progress indication during validation
4. ✅ Easy cancellation and recovery options

## Example User Experience

**Before Phase 4.7:**
```
User: "Pay my electricity bill"
System: Error - Required parameter 'payeeCode' is missing
```

**After Phase 4.7:**
```
User: "Pay my electricity bill"
System: I'll help you pay your electricity bill! I need some information:

💡 Payee Code: Which utility company? (4-digit code)
   Suggestions: 1111 (TNB), 2222 (Air Selangor), 3333 (IWK)

💡 Bill Account Number: Your account number on the bill
   Format: At least 10 characters

💡 Amount: How much would you like to pay?
   
Type the payee code first:

User: "1111"
System: ✅ Got it! Payee: Tenaga Nasional Berhad (TNB)
Now please provide your bill account number:

User: "210027549604"  
System: ✅ Perfect! Now how much would you like to pay?

User: "$50"
System: 🚀 Processing your TNB bill payment of $50 for account 210027549604...
✅ Payment successful! Transaction ID: TXN123456
```

This comprehensive approach ensures robust validation while maintaining an excellent user experience through intelligent prompting and retry mechanisms.