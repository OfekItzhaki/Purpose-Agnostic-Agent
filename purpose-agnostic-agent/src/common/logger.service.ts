import { Injectable, LoggerService } from '@nestjs/common';
import * as winston from 'winston';
import * as SeqTransport from 'winston-seq';

@Injectable()
export class StructuredLogger implements LoggerService {
  private logger: winston.Logger;

  constructor() {
    const transports: winston.transport[] = [
      new winston.transports.Console({
        format: winston.format.combine(
          winston.format.colorize(),
          winston.format.simple(),
        ),
      }),
    ];

    // Add Seq transport if configured
    if (process.env.SEQ_URL) {
      transports.push(
        new (SeqTransport as any)({
          serverUrl: process.env.SEQ_URL,
          apiKey: process.env.SEQ_API_KEY,
          onError: (e: Error) => {
            console.error('Seq logging error:', e);
          },
        }),
      );
    }

    this.logger = winston.createLogger({
      level: process.env.LOG_LEVEL || 'info',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.json(),
      ),
      defaultMeta: {
        service: 'purpose-agnostic-agent',
        environment: process.env.NODE_ENV || 'development',
        version: process.env.APP_VERSION || '1.0.0',
      },
      transports,
    });
  }

  log(message: string, context?: string): void {
    this.logger.info(message, { context });
  }

  error(message: string, trace?: string, context?: string): void {
    this.logger.error(message, { trace, context });
  }

  warn(message: string, context?: string): void {
    this.logger.warn(message, { context });
  }

  debug(message: string, context?: string): void {
    this.logger.debug(message, { context });
  }

  logWithContext(
    level: string,
    message: string,
    metadata: Record<string, any>,
  ): void {
    this.logger.log(level, message, {
      ...metadata,
      timestamp: new Date().toISOString(),
      requestId: metadata.requestId || 'unknown',
      userId: this.redactPII(metadata.userId),
    });
  }

  // Performance monitoring
  logPerformance(
    operation: string,
    duration: number,
    metadata?: Record<string, any>,
  ): void {
    this.logger.info('Performance metric', {
      operation,
      duration,
      ...metadata,
      metricType: 'performance',
    });
  }

  private redactPII(value: any): string {
    if (!value) return 'anonymous';
    return '***REDACTED***';
  }
}
