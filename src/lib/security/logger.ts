// OWASP A09:2021 - Security Logging and Monitoring
// Secure logger to avoid exposing sensitive data in production

type LogLevel = 'info' | 'warn' | 'error' | 'debug';

interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: string;
  context?: Record<string, unknown>;
}

class SecurityLogger {
  private isProduction = process.env.NODE_ENV === 'production';

  private sanitizeError(error: unknown): string {
    if (error instanceof Error) {
      // In production, don't expose stack traces
      return this.isProduction ? error.message : error.stack || error.message;
    }
    return String(error);
  }

  private sanitizeContext(context?: Record<string, unknown>): Record<string, unknown> | undefined {
    if (!context) return undefined;
    
    const sanitized: Record<string, unknown> = {};
    const sensitiveKeys = ['password', 'token', 'secret', 'apikey', 'api_key', 'authorization'];
    
    for (const [key, value] of Object.entries(context)) {
      if (sensitiveKeys.some(sk => key.toLowerCase().includes(sk))) {
        sanitized[key] = '[REDACTED]';
      } else {
        sanitized[key] = value;
      }
    }
    
    return sanitized;
  }

  private log(level: LogLevel, message: string, context?: Record<string, unknown>): void {
    const entry: LogEntry = {
      level,
      message,
      timestamp: new Date().toISOString(),
      context: this.sanitizeContext(context),
    };

    // In production, only log errors and warnings
    if (this.isProduction && (level === 'debug' || level === 'info')) {
      return;
    }

    // Use appropriate console method
    const consoleMethod = console[level] || console.log;
    consoleMethod(JSON.stringify(entry));
  }

  info(message: string, context?: Record<string, unknown>): void {
    this.log('info', message, context);
  }

  warn(message: string, context?: Record<string, unknown>): void {
    this.log('warn', message, context);
  }

  error(message: string, error?: unknown, context?: Record<string, unknown>): void {
    const errorMessage = error ? `${message}: ${this.sanitizeError(error)}` : message;
    this.log('error', errorMessage, context);
  }

  debug(message: string, context?: Record<string, unknown>): void {
    this.log('debug', message, context);
  }

  // Security event logging
  securityEvent(event: string, details?: Record<string, unknown>): void {
    this.log('warn', `SECURITY EVENT: ${event}`, details);
  }
}

export const logger = new SecurityLogger();
