import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Debug Logger for API Flow
 * Writes detailed logs to file for debugging 401 issues
 */
export class DebugLogger {
  constructor() {
    this.logDir = path.join(__dirname, '../../logs');
    this.currentLogFile = null;
    this.sessionId = null;
    this.ensureLogDirectory();
  }

  ensureLogDirectory() {
    if (!fs.existsSync(this.logDir)) {
      fs.mkdirSync(this.logDir, { recursive: true });
    }
  }

  startSession(operationId) {
    this.sessionId = `${operationId}_${new Date().toISOString().replace(/[:.]/g, '-')}`;
    this.currentLogFile = path.join(this.logDir, `${this.sessionId}.log`);
    
    const header = `
==========================================================================
API FLOW DEBUG LOG
==========================================================================
Session ID: ${this.sessionId}
Operation: ${operationId}
Started At: ${new Date().toISOString()}
==========================================================================

`;
    fs.writeFileSync(this.currentLogFile, header);
    return this.sessionId;
  }

  log(stage, data, isError = false) {
    if (!this.currentLogFile) return;

    const timestamp = new Date().toISOString();
    const prefix = isError ? '❌ ERROR' : '✅';
    
    let logEntry = `
[${timestamp}] ${prefix} ${stage}
${'='.repeat(70)}
`;

    // Format data based on type
    if (typeof data === 'object') {
      // Special handling for sensitive data
      const sanitized = this.sanitizeData(data);
      logEntry += JSON.stringify(sanitized, null, 2);
    } else {
      logEntry += data;
    }

    logEntry += '\n\n';

    fs.appendFileSync(this.currentLogFile, logEntry);
  }

  sanitizeData(data) {
    const sanitized = JSON.parse(JSON.stringify(data));
    
    // Mask JWT tokens but keep first/last 20 chars for identification
    const maskToken = (token) => {
      if (!token || token.length < 50) return token;
      return `${token.substring(0, 20)}...${token.substring(token.length - 20)}`;
    };

    // Recursively sanitize
    const sanitizeObject = (obj) => {
      for (const key in obj) {
        if (obj[key] && typeof obj[key] === 'object') {
          sanitizeObject(obj[key]);
        } else if (typeof obj[key] === 'string') {
          // Check for JWT patterns
          if (key.toLowerCase().includes('token') || 
              key.toLowerCase().includes('authorization') ||
              (obj[key].startsWith('eyJ') && obj[key].length > 100)) {
            obj[key] = maskToken(obj[key]);
          }
          // Check for bearer tokens
          if (obj[key].toLowerCase().startsWith('bearer ')) {
            const token = obj[key].substring(7);
            obj[key] = `bearer ${maskToken(token)}`;
          }
        }
      }
    };

    sanitizeObject(sanitized);
    return sanitized;
  }

  logJWTAnalysis(token) {
    if (!token) return;

    try {
      // Decode JWT without verification
      const parts = token.split('.');
      if (parts.length !== 3) {
        this.log('JWT_ANALYSIS', 'Invalid JWT format - not 3 parts', true);
        return;
      }

      const header = JSON.parse(Buffer.from(parts[0], 'base64').toString());
      const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
      
      const now = Math.floor(Date.now() / 1000);
      const analysis = {
        header,
        payload: this.sanitizeData(payload),
        metadata: {
          isExpired: payload.exp ? payload.exp < now : 'No expiry',
          expiresIn: payload.exp ? `${Math.floor((payload.exp - now) / 3600)} hours` : 'No expiry',
          issuedAt: payload.iat ? new Date(payload.iat * 1000).toISOString() : 'Unknown',
          expiresAt: payload.exp ? new Date(payload.exp * 1000).toISOString() : 'No expiry',
          userId: payload.userId || payload.user_id || 'Unknown',
          scopes: payload.scope || [],
          sessionId: payload.maya_session_id || 'Unknown'
        }
      };

      this.log('JWT_ANALYSIS', analysis);
    } catch (error) {
      this.log('JWT_ANALYSIS', `Failed to decode JWT: ${error.message}`, true);
    }
  }

  logApiCall(method, url, headers, body = null) {
    const logData = {
      method,
      url,
      headers: this.sanitizeData(headers),
      body: body ? this.sanitizeData(body) : 'No body',
      curlCommand: this.generateCurlCommand(method, url, headers, body)
    };

    this.log('API_CALL', logData);
  }

  generateCurlCommand(method, url, headers, body) {
    let curl = `curl -X ${method} "${url}"`;
    
    for (const [key, value] of Object.entries(headers)) {
      curl += ` \\\n  -H "${key}: ${value}"`;
    }

    if (body) {
      curl += ` \\\n  -d '${JSON.stringify(body)}'`;
    }

    curl += ' \\\n  -v';
    return curl;
  }

  logApiResponse(status, statusText, headers, data) {
    const logData = {
      status,
      statusText,
      headers: headers || {},
      data: data ? this.sanitizeData(data) : 'No data',
      timestamp: new Date().toISOString()
    };

    this.log('API_RESPONSE', logData, status >= 400);
  }

  endSession(summary = {}) {
    if (!this.currentLogFile) return;

    const footer = `
==========================================================================
SESSION SUMMARY
==========================================================================
Session ID: ${this.sessionId}
Ended At: ${new Date().toISOString()}
Result: ${summary.result || 'Unknown'}
Status Code: ${summary.statusCode || 'N/A'}
Error: ${summary.error || 'None'}
Log File: ${this.currentLogFile}
==========================================================================
`;

    fs.appendFileSync(this.currentLogFile, footer);
    
    console.log(`\n📁 Debug log written to: ${this.currentLogFile}`);
    return this.currentLogFile;
  }
}

// Singleton instance
export const debugLogger = new DebugLogger();