# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is an **MCP API Gateway** project that implements a Model Context Protocol (MCP) server for managing API calls through OpenAPI specifications. The system is designed to be API-agnostic, using OpenAPI specs as the single source of truth for API management.

## Commands

### Development Commands
```bash
# Install dependencies
npm install

# Start the MCP server
npm start

# Run validation tests
npm run validate
```

### Environment Setup
- Copy `.env.example` to `.env` and configure API keys
- Required: `WEATHER_API_KEY` for OpenWeatherMap API
- Optional: `LOG_LEVEL`, `DEFAULT_TIMEOUT`, `MAX_RETRIES`

## Architecture

### Core Architecture Pattern
The system follows a **registry-based, spec-driven architecture**:

1. **OpenAPI Specs** (`registry/specs/`) - Single source of truth for all APIs
2. **ApiRegistry** - Loads and manages OpenAPI specifications
3. **RequestBuilder** - Dynamically builds HTTP requests from specs
4. **ApiExecutor** - Executes API calls with error handling
5. **IntentParser** - Maps user intents to API operations
6. **MCP Server** - Exposes functionality through Model Context Protocol

### Directory Structure
```
src/
├── server.js              # Main MCP server entry point
├── validate.js            # Validation test suite  
├── registry/
│   ├── api-registry.js    # ApiRegistry class
│   └── specs/             # OpenAPI specification files
├── execution/
│   ├── executor.js        # ApiExecutor class
│   └── request-builder.js # RequestBuilder class
├── parsers/
│   └── intent-parser.js   # IntentParser class
├── config/
│   └── server-config.js   # Server configuration
└── utils/
    ├── logger.js          # Logging utilities
    └── validators.js      # Input validation
```

### Key Components

**ApiRegistry** (`registry/api-registry.js`)
- Loads OpenAPI specs from `registry/specs/` directory
- Registers operations and builds lookup tables
- Provides intent-to-operation mapping

**RequestBuilder** (`execution/request-builder.js`)
- Static methods for building HTTP requests from OpenAPI specs
- Handles parameter mapping, authentication, and validation
- Supports query, path, and header parameters

**ApiExecutor** (`execution/executor.js`)
- Executes HTTP requests with comprehensive error handling
- Formats responses according to OpenAPI schemas
- Handles timeouts, retries, and API-specific errors

**MCP Server** (`server.js`)
- Dynamically creates MCP tools from registered API operations
- Handles tool calls and routes to appropriate executors
- Uses MCP SDK with stdio transport

### Technical Stack
- **Node.js** with ES modules (`"type": "module"`)
- **MCP SDK** (`@modelcontextprotocol/sdk`) for MCP protocol
- **Axios** for HTTP client functionality
- **Environment variables** for configuration

### Adding New APIs
To add a new API:
1. Create OpenAPI 3.0 specification in `registry/specs/`
2. Add authentication configuration to `.env` and `config/server-config.js`
3. Restart server - no code changes needed

### Error Handling Patterns
The codebase implements comprehensive error handling for:
- File system operations (ENOENT, EACCES)
- Network operations (timeouts, HTTP status codes)  
- JSON parsing and validation
- API authentication failures
- OpenAPI spec validation

### Validation
Run `npm run validate` to verify:
- Registry initialization and spec loading
- Operation registration and lookup
- Request building and parameter validation
- Intent parsing functionality
- Full API execution (when API keys provided)

## Implementation Notes

- All classes are implemented without placeholder methods
- Uses ES6 modules with proper imports
- Follows async/await patterns throughout
- Comprehensive error handling for all external dependencies
- OpenAPI specs must be valid 3.0 format
- Supports API key authentication in query parameters or headers