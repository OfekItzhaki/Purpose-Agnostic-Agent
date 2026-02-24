import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { randomUUID } from 'crypto';
import { StructuredLogger } from '../logger.service.js';

@Injectable()
export class RequestContextMiddleware implements NestMiddleware {
  private readonly logger = new StructuredLogger();

  use(req: Request, res: Response, next: NextFunction): void {
    (req as any).requestId = randomUUID();
    (req as any).startTime = Date.now();

    res.on('finish', () => {
      const duration = Date.now() - (req as any).startTime;

      // Log request completion
      this.logger.logWithContext('info', 'Request completed', {
        requestId: (req as any).requestId,
        method: req.method,
        path: req.path,
        statusCode: res.statusCode,
        duration,
        userAgent: req.get('user-agent'),
      });

      // Log performance metric
      this.logger.logPerformance(`${req.method} ${req.path}`, duration, {
        requestId: (req as any).requestId,
        statusCode: res.statusCode,
        method: req.method,
        path: req.path,
      });
    });

    next();
  }
}
