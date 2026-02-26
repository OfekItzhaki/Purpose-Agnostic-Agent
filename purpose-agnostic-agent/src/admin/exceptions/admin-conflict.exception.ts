import { ConflictException } from '@nestjs/common';

/**
 * Exception thrown when an admin operation conflicts with existing resources.
 * Used for duplicate IDs, name conflicts, or constraint violations.
 *
 * @extends ConflictException
 */
export class AdminConflictException extends ConflictException {
  constructor(message: string = 'Resource conflict') {
    super(message);
    this.name = 'AdminConflictException';
  }
}
