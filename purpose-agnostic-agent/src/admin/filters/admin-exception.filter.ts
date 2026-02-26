import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Request, Response } from 'express';
import {
  ErrorResponseDto,
  ValidationError,
} from '../dto/error-response.dto.js';
import { StructuredLogger } from '../../common/logger.service.js';

/**
 * Global exception filter for admin module.
 * Catches all exceptions and formats them according to RFC 7807 Problem Details.
 *
 * Validates: Requirements 10.7
 */
@Catch()
export class AdminExceptionFilter implements ExceptionFilter {
  constructor(private readonly logger: StructuredLogger) {}

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const errorResponse = this.buildErrorResponse(exception, request);

    // Log the error with context
    this.logger.error(
      'Admin API error',
      exception instanceof Error ? exception.stack : undefined,
      `${request.method} ${request.url} - Status: ${errorResponse.status}`,
    );

    response.status(errorResponse.status).json(errorResponse);
  }

  private buildErrorResponse(
    exception: unknown,
    request: Request,
  ): ErrorResponseDto {
    const instance = request.url;

    // Handle NestJS HttpException
    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      // Extract validation errors if present
      let errors: ValidationError[] | undefined;
      let detail = exception.message;

      if (typeof exceptionResponse === 'object' && exceptionResponse !== null) {
        const responseObj = exceptionResponse as any;

        // Handle class-validator errors
        if (Array.isArray(responseObj.message)) {
          errors = responseObj.message.map((msg: string) => {
            // Try to extract field name from message
            const match = msg.match(/^(\w+)\s/);
            return {
              field: match ? match[1] : 'unknown',
              message: msg,
            };
          });
          detail = 'Validation failed for one or more fields';
        } else if (responseObj.message) {
          detail = responseObj.message;
        }
      }

      return {
        type: this.getErrorType(status),
        title: this.getErrorTitle(status),
        status,
        detail,
        instance,
        errors,
      };
    }

    // Handle unknown errors as 500 Internal Server Error
    return {
      type: 'https://api.example.com/errors/internal-server-error',
      title: 'Internal Server Error',
      status: HttpStatus.INTERNAL_SERVER_ERROR,
      detail:
        exception instanceof Error
          ? exception.message
          : 'An unexpected error occurred',
      instance,
    };
  }

  private getErrorType(status: number): string {
    const baseUrl = 'https://api.example.com/errors';

    switch (status) {
      case HttpStatus.BAD_REQUEST:
        return `${baseUrl}/validation-error`;
      case HttpStatus.UNAUTHORIZED:
        return `${baseUrl}/authentication-error`;
      case HttpStatus.FORBIDDEN:
        return `${baseUrl}/authorization-error`;
      case HttpStatus.NOT_FOUND:
        return `${baseUrl}/not-found`;
      case HttpStatus.CONFLICT:
        return `${baseUrl}/conflict`;
      case HttpStatus.TOO_MANY_REQUESTS:
        return `${baseUrl}/rate-limit-exceeded`;
      case HttpStatus.INTERNAL_SERVER_ERROR:
        return `${baseUrl}/internal-server-error`;
      default:
        return `${baseUrl}/error`;
    }
  }

  private getErrorTitle(status: number): string {
    switch (status) {
      case HttpStatus.BAD_REQUEST:
        return 'Validation Error';
      case HttpStatus.UNAUTHORIZED:
        return 'Authentication Error';
      case HttpStatus.FORBIDDEN:
        return 'Authorization Error';
      case HttpStatus.NOT_FOUND:
        return 'Resource Not Found';
      case HttpStatus.CONFLICT:
        return 'Resource Conflict';
      case HttpStatus.TOO_MANY_REQUESTS:
        return 'Rate Limit Exceeded';
      case HttpStatus.INTERNAL_SERVER_ERROR:
        return 'Internal Server Error';
      default:
        return 'Error';
    }
  }
}
