import { UnauthorizedException } from '@nestjs/common';

/**
 * Exception thrown when admin authentication fails.
 * Used for invalid credentials, expired tokens, or missing authentication.
 *
 * @extends UnauthorizedException
 */
export class AdminAuthenticationException extends UnauthorizedException {
  constructor(message: string = 'Authentication failed') {
    super(message);
    this.name = 'AdminAuthenticationException';
  }
}
