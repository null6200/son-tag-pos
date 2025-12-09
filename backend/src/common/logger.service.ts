import { Injectable, LoggerService as NestLoggerService } from '@nestjs/common';
import * as winston from 'winston';
import 'winston-daily-rotate-file';

/**
 * Production-grade structured logging service using Winston.
 * 
 * Features:
 * - JSON structured logs for production (easy to parse by log aggregators)
 * - Pretty console output for development
 * - Daily rotating file logs
 * - Request correlation via requestId
 * - Error stack traces
 */
@Injectable()
export class LoggerService implements NestLoggerService {
  private logger: winston.Logger;

  constructor() {
    const isProduction = process.env.NODE_ENV === 'production';
    
    // Define log format
    const jsonFormat = winston.format.combine(
      winston.format.timestamp(),
      winston.format.errors({ stack: true }),
      winston.format.json()
    );

    const prettyFormat = winston.format.combine(
      winston.format.timestamp({ format: 'HH:mm:ss' }),
      winston.format.errors({ stack: true }),
      winston.format.colorize(),
      winston.format.printf(({ timestamp, level, message, context, requestId, ...meta }) => {
        const ctx = context ? `[${context}]` : '';
        const reqId = requestId ? `(${requestId})` : '';
        const metaStr = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
        return `${timestamp} ${level} ${ctx}${reqId} ${message}${metaStr}`;
      })
    );

    // Transports
    const transports: winston.transport[] = [
      // Console output
      new winston.transports.Console({
        format: isProduction ? jsonFormat : prettyFormat,
        level: process.env.LOG_LEVEL || (isProduction ? 'info' : 'debug'),
      }),
    ];

    // Add file transport in production
    if (isProduction) {
      // Daily rotating file for all logs
      transports.push(
        new (winston.transports as any).DailyRotateFile({
          filename: 'logs/app-%DATE%.log',
          datePattern: 'YYYY-MM-DD',
          maxSize: '20m',
          maxFiles: '14d', // Keep 14 days of logs
          format: jsonFormat,
          level: 'info',
        })
      );

      // Separate file for errors only
      transports.push(
        new (winston.transports as any).DailyRotateFile({
          filename: 'logs/error-%DATE%.log',
          datePattern: 'YYYY-MM-DD',
          maxSize: '20m',
          maxFiles: '30d', // Keep 30 days of error logs
          format: jsonFormat,
          level: 'error',
        })
      );
    }

    this.logger = winston.createLogger({
      level: process.env.LOG_LEVEL || (isProduction ? 'info' : 'debug'),
      defaultMeta: { service: 'sontag-pos-api' },
      transports,
    });
  }

  log(message: string, context?: string) {
    this.logger.info(message, { context });
  }

  error(message: string, trace?: string, context?: string) {
    this.logger.error(message, { context, stack: trace });
  }

  warn(message: string, context?: string) {
    this.logger.warn(message, { context });
  }

  debug(message: string, context?: string) {
    this.logger.debug(message, { context });
  }

  verbose(message: string, context?: string) {
    this.logger.verbose(message, { context });
  }

  // Extended methods for structured logging
  info(message: string, meta?: Record<string, any>) {
    this.logger.info(message, meta);
  }

  // Log with request context
  logRequest(message: string, requestId: string, meta?: Record<string, any>) {
    this.logger.info(message, { requestId, ...meta });
  }

  // Log API call
  logApiCall(method: string, path: string, statusCode: number, durationMs: number, requestId?: string, userId?: string) {
    this.logger.info('API Request', {
      method,
      path,
      statusCode,
      durationMs,
      requestId,
      userId,
    });
  }

  // Log database query (for slow query detection)
  logDbQuery(query: string, durationMs: number, requestId?: string) {
    const level = durationMs > 1000 ? 'warn' : 'debug';
    this.logger[level]('DB Query', {
      query: query.substring(0, 200), // Truncate long queries
      durationMs,
      slow: durationMs > 1000,
      requestId,
    });
  }

  // Log business event
  logEvent(event: string, data: Record<string, any>, requestId?: string) {
    this.logger.info(`Event: ${event}`, { event, ...data, requestId });
  }

  // Log security event
  logSecurity(event: string, data: Record<string, any>) {
    this.logger.warn(`Security: ${event}`, { securityEvent: event, ...data });
  }

  // Get the underlying Winston logger for advanced use
  getWinstonLogger(): winston.Logger {
    return this.logger;
  }
}

// Singleton instance for use outside of NestJS DI
let loggerInstance: LoggerService | null = null;

export function getLogger(): LoggerService {
  if (!loggerInstance) {
    loggerInstance = new LoggerService();
  }
  return loggerInstance;
}
