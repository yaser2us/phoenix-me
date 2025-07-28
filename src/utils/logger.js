import { getServerConfig } from '../config/server-config.js';

class Logger {
  constructor() {
    this.logLevel = 'info';
    this.logLevels = {
      error: 0,
      warn: 1,
      info: 2,
      debug: 3
    };
    
    // Initialize with config if available
    try {
      const serverConfig = getServerConfig();
      this.logLevel = serverConfig.logLevel || 'info';
    } catch (error) {
      // Config not available yet, use default
      this.logLevel = 'info';
    }
  }

  setLogLevel(level) {
    if (this.logLevels.hasOwnProperty(level)) {
      this.logLevel = level;
    } else {
      this.warn(`Invalid log level: ${level}. Using 'info' instead.`);
      this.logLevel = 'info';
    }
  }

  shouldLog(level) {
    return this.logLevels[level] <= this.logLevels[this.logLevel];
  }

  formatMessage(level, message, meta = {}) {
    const timestamp = new Date().toISOString();
    const metaStr = Object.keys(meta).length > 0 ? ` ${JSON.stringify(meta)}` : '';
    return `[${timestamp}] ${level.toUpperCase()}: ${message}${metaStr}`;
  }

  error(message, meta = {}) {
    if (this.shouldLog('error')) {
      console.error(this.formatMessage('error', message, meta));
    }
  }

  warn(message, meta = {}) {
    if (this.shouldLog('warn')) {
      console.warn(this.formatMessage('warn', message, meta));
    }
  }

  info(message, meta = {}) {
    if (this.shouldLog('info')) {
      console.error(this.formatMessage('info', message, meta));
    }
  }

  debug(message, meta = {}) {
    if (this.shouldLog('debug')) {
      console.error(this.formatMessage('debug', message, meta));
    }
  }

  // Specialized logging methods
  apiRequest(method, url, params = {}) {
    this.debug('API Request', {
      method: method.toUpperCase(),
      url: url,
      params: Object.keys(params).length > 0 ? params : undefined
    });
  }

  apiResponse(status, url, duration = null) {
    const meta = { status, url };
    if (duration !== null) {
      meta.duration = `${duration}ms`;
    }
    
    if (status >= 200 && status < 300) {
      this.info('API Response Success', meta);
    } else if (status >= 400 && status < 500) {
      this.warn('API Response Client Error', meta);
    } else if (status >= 500) {
      this.error('API Response Server Error', meta);
    } else {
      this.info('API Response', meta);
    }
  }

  operationStart(operationId, parameters = {}) {
    this.info('Operation Started', {
      operationId,
      parameters: Object.keys(parameters).length > 0 ? parameters : undefined
    });
  }

  operationSuccess(operationId, duration = null) {
    const meta = { operationId };
    if (duration !== null) {
      meta.duration = `${duration}ms`;
    }
    this.info('Operation Completed', meta);
  }

  operationError(operationId, error, duration = null) {
    const meta = { 
      operationId, 
      error: error.message || error 
    };
    if (duration !== null) {
      meta.duration = `${duration}ms`;
    }
    this.error('Operation Failed', meta);
  }

  mcpToolCall(toolName, args = {}) {
    this.debug('MCP Tool Called', {
      tool: toolName,
      args: Object.keys(args).length > 0 ? args : undefined
    });
  }

  mcpToolResponse(toolName, success, duration = null) {
    const meta = { tool: toolName, success };
    if (duration !== null) {
      meta.duration = `${duration}ms`;
    }
    
    if (success) {
      this.info('MCP Tool Success', meta);
    } else {
      this.warn('MCP Tool Failed', meta);
    }
  }

  serverStart(port = null) {
    const meta = {};
    if (port) {
      meta.port = port;
    }
    this.info('Server Started', meta);
  }

  serverStop() {
    this.info('Server Stopped');
  }

  registryInit(specsCount, operationsCount) {
    this.info('Registry Initialized', {
      specs: specsCount,
      operations: operationsCount
    });
  }

  // Utility method to get current log level
  getLogLevel() {
    return this.logLevel;
  }

  // Utility method to check if debug logging is enabled
  isDebugEnabled() {
    return this.shouldLog('debug');
  }
}

// Create singleton instance
const logger = new Logger();

export { logger };
export default logger;