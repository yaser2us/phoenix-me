# Phase 4.8: Spec-Driven API Architecture
## Making the System Truly Dynamic

---

## 🎯 Phase Objective
Transform the hardcoded API adapter into a fully spec-driven system that can handle any OpenAPI spec without code changes.

---

## 📋 Implementation Checkpoints

### **Checkpoint 1: Dynamic URL & Method Resolution** ⏳
**Goal**: Remove hardcoded URL mappings

**Changes**:
1. Enhance `ApiRegistry` to provide full operation details
2. Update `MaybankAdapter.buildURL()` to use registry data
3. Update `MaybankAdapter.prepareRequest()` to get method from spec
4. Remove all hardcoded switch statements for URLs

**Success Criteria**:
- Any operation ID automatically resolves to correct URL/method
- No hardcoded paths in adapter

---

### **Checkpoint 2: Generic Request Body Builder** 
**Goal**: Build request bodies from OpenAPI schemas

**Changes**:
1. Create `SchemaBasedRequestBuilder` class
2. Parse OpenAPI requestBody schemas
3. Map parameters to request body structure
4. Handle required/optional fields from schema

**Success Criteria**:
- POST/PUT/PATCH operations work without custom code
- Request bodies match OpenAPI schema definitions

---

### **Checkpoint 3: Schema-Based Response Validation**
**Goal**: Validate responses using OpenAPI schemas

**Changes**:
1. Create `SchemaBasedValidator` class
2. Parse OpenAPI response schemas
3. Validate response structure and types
4. Handle different response formats generically

**Success Criteria**:
- All API response formats validated correctly
- No hardcoded validation logic

---

### **Checkpoint 4: Automatic Data Extraction**
**Goal**: Extract data based on response schemas

**Changes**:
1. Create `SchemaBasedExtractor` class
2. Map response data to useful output
3. Handle nested structures from schemas
4. Provide consistent output format

**Success Criteria**:
- Response data extracted without custom logic
- Consistent data format across all APIs

---

### **Checkpoint 5: Multi-API Testing & Integration**
**Goal**: Verify system with diverse API specs

**Changes**:
1. Add 3-5 new diverse API specs
2. Test GET, POST, PUT, DELETE operations
3. Verify different auth methods
4. Document any remaining limitations

**Success Criteria**:
- New APIs work with zero code changes
- System handles diverse API patterns

---

## 🏗️ Architecture Overview

```
┌─────────────────┐
│   API Specs     │
│  (JSON files)   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  ApiRegistry    │ ← Enhanced to provide full operation details
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ MaybankAdapter  │ ← Made fully generic
├─────────────────┤
│ - No hardcoding │
│ - Uses registry │
│ - Schema-based  │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  New Classes    │
├─────────────────┤
│ - RequestBuilder│
│ - Validator     │
│ - Extractor     │
└─────────────────┘
```

---

## 🚀 Let's Start!

Beginning with **Checkpoint 1: Dynamic URL & Method Resolution**...