import { ExceptionFilter, Catch, ArgumentsHost } from '@nestjs/common';
import { ThrottlerException } from '@nestjs/throttler';
import { Response } from 'express';

@Catch(ThrottlerException)
export class ThrottlerExceptionFilter implements ExceptionFilter {
  catch(exception: ThrottlerException, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest();

    response.status(429).json({
      type: 'https://api.example.com/errors/rate-limit',
      title: 'Rate Limit Exceeded',
      status: 429,
      detail: 'Too many requests. Please try again later.',
      instance: request.url,
      retryAfter: 60,
    });
  }
}
