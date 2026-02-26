import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Request } from 'express';
import { AuditLogService } from '../services/audit-log.service.js';
import {
  AUDIT_LOG_KEY,
  AuditLogMetadata,
} from '../decorators/audit-log.decorator.js';

export interface RequestWithUser extends Request {
  user?: {
    sub: string;
    username: string;
    email: string;
    role: string;
  };
}

@Injectable()
export class AuditLogInterceptor implements NestInterceptor {
  private readonly logger = new Logger(AuditLogInterceptor.name);

  constructor(
    private readonly reflector: Reflector,
    private readonly auditLogService: AuditLogService,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const metadata = this.reflector.get<AuditLogMetadata>(
      AUDIT_LOG_KEY,
      context.getHandler(),
    );

    // If no audit log metadata, skip logging
    if (!metadata) {
      return next.handle();
    }

    const request = context.switchToHttp().getRequest<RequestWithUser>();
    const adminUserId = request.user?.sub;

    // If no admin user in request, skip logging (guard should have caught this)
    if (!adminUserId) {
      this.logger.warn('No admin user found in request for audit logging');
      return next.handle();
    }

    // Extract entity ID from request parameters if specified
    let entityId: string | undefined;
    if (metadata.entityIdParam) {
      entityId =
        request.params[metadata.entityIdParam] ||
        request.body?.[metadata.entityIdParam];
    }

    // Extract IP address
    const ipAddress = this.getIpAddress(request);

    // Build details object
    const details: Record<string, any> = {};

    if (metadata.includeBody && request.body) {
      // Sanitize sensitive fields from body
      details.requestBody = this.sanitizeData(request.body);
    }

    // Execute the method and log after completion
    return next.handle().pipe(
      tap({
        next: (result) => {
          // Include result if specified
          if (metadata.includeResult && result) {
            details.result = this.sanitizeData(result);
          }

          // If entity ID wasn't in params, try to extract from result
          if (!entityId && result?.id) {
            entityId = result.id;
          }

          // Log the action asynchronously (don't block the response)
          this.auditLogService
            .logAction(
              adminUserId,
              metadata.actionType,
              metadata.entityType,
              entityId,
              Object.keys(details).length > 0 ? details : undefined,
              ipAddress,
            )
            .catch((error) => {
              this.logger.error(`Failed to log audit action: ${error.message}`);
            });
        },
        error: (error) => {
          // Log failed actions as well
          details.error = {
            message: error.message,
            statusCode: error.status,
          };

          this.auditLogService
            .logAction(
              adminUserId,
              `${metadata.actionType}_FAILED`,
              metadata.entityType,
              entityId,
              details,
              ipAddress,
            )
            .catch((logError) => {
              this.logger.error(
                `Failed to log audit action error: ${logError.message}`,
              );
            });
        },
      }),
    );
  }

  private getIpAddress(request: Request): string {
    // Try to get real IP from proxy headers
    const forwarded = request.headers['x-forwarded-for'];
    if (forwarded) {
      const ips = Array.isArray(forwarded) ? forwarded[0] : forwarded;
      return ips.split(',')[0].trim();
    }

    const realIp = request.headers['x-real-ip'];
    if (realIp) {
      return Array.isArray(realIp) ? realIp[0] : realIp;
    }

    return request.ip || 'unknown';
  }

  private sanitizeData(data: any): any {
    if (!data || typeof data !== 'object') {
      return data;
    }

    // Create a shallow copy
    const sanitized = Array.isArray(data) ? [...data] : { ...data };

    // List of sensitive field names to redact
    const sensitiveFields = [
      'password',
      'password_hash',
      'token',
      'secret',
      'api_key',
      'apiKey',
      'access_token',
      'refresh_token',
    ];

    // Recursively sanitize objects
    for (const key in sanitized) {
      if (
        sensitiveFields.some((field) =>
          key.toLowerCase().includes(field.toLowerCase()),
        )
      ) {
        sanitized[key] = '[REDACTED]';
      } else if (
        typeof sanitized[key] === 'object' &&
        sanitized[key] !== null
      ) {
        sanitized[key] = this.sanitizeData(sanitized[key]);
      }
    }

    return sanitized;
  }
}
