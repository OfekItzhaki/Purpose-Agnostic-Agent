import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { StructuredLogger } from '../logger.service.js';

interface ProblemDetails {
  type: string;
  title: string;
  status: number;
  detail: string;
  instance: string;
  [key: string]: any;
}

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new StructuredLogger();

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const problemDetails = this.createProblemDetails(exception, request);

    // Log error with full context before returning response
    this.logger.error(
      `Error occurred: ${problemDetails.title}`,
      exception instanceof Error ? exception.stack : undefined,
      'GlobalExceptionFilter',
    );

    this.logger.logWithContext('error', problemDetails.detail, {
      requestId: (request as any).requestId || 'unknown',
      method: request.method,
      path: request.path,
      statusCode: problemDetails.status,
      errorType: this.classifyError(exception),
    });

    response.status(problemDetails.status).json(problemDetails);
  }

  private createProblemDetails(
    exception: unknown,
    request: Request,
  ): ProblemDetails {
    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let title = 'Internal Server Error';
    let detail = 'An unexpected error occurred';
    const type = 'https://api.example.com/errors/internal-error';
    const instance = request.url;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const response = exception.getResponse();

      if (typeof response === 'string') {
        detail = response;
        title = this.getHttpStatusTitle(status);
      } else if (typeof response === 'object' && response !== null) {
        const responseObj = response as any;
        detail = responseObj.message || responseObj.error || detail;
        title = responseObj.error || this.getHttpStatusTitle(status);
      }
    } else if (exception instanceof Error) {
      detail = exception.message;
    }

    return {
      type,
      title,
      status,
      detail,
      instance,
    };
  }

  private getHttpStatusTitle(status: number): string {
    const titles: Record<number, string> = {
      400: 'Bad Request',
      401: 'Unauthorized',
      403: 'Forbidden',
      404: 'Not Found',
      429: 'Too Many Requests',
      500: 'Internal Server Error',
      503: 'Service Unavailable',
    };
    return titles[status] || 'Error';
  }

  private classifyError(exception: unknown): 'operational' | 'programmer' {
    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      // 4xx errors are typically operational (user errors)
      // 5xx errors are typically programmer errors
      return status < 500 ? 'operational' : 'programmer';
    }
    return 'programmer';
  }
}
