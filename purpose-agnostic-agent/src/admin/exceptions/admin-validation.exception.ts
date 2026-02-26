import { BadRequestException } from '@nestjs/common';

/**
 * Exception thrown when admin input validation fails.
 * Used for invalid request data, malformed inputs, or constraint violations.
 *
 * @extends BadRequestException
 */
export class AdminValidationException extends BadRequestException {
  constructor(message: string = 'Validation failed') {
    super(message);
    this.name = 'AdminValidationException';
  }
}
