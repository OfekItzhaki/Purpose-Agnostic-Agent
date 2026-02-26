import { NotFoundException } from '@nestjs/common';

/**
 * Exception thrown when a requested admin resource is not found.
 * Used for missing personas, knowledge documents, categories, or other entities.
 *
 * @extends NotFoundException
 */
export class AdminResourceNotFoundException extends NotFoundException {
  constructor(message: string = 'Resource not found') {
    super(message);
    this.name = 'AdminResourceNotFoundException';
  }
}
