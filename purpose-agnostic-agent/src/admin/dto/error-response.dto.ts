import { ApiProperty } from '@nestjs/swagger';

/**
 * Validation error detail for field-level errors
 */
export class ValidationError {
  @ApiProperty({
    description: 'Field name that failed validation',
    example: 'email',
  })
  field: string;

  @ApiProperty({
    description: 'Validation error message',
    example: 'Email must be a valid email address',
  })
  message: string;
}

/**
 * RFC 7807 Problem Details error response format.
 * Used consistently across all admin API endpoints.
 *
 * @see https://tools.ietf.org/html/rfc7807
 */
export class ErrorResponseDto {
  @ApiProperty({
    description: 'URI reference that identifies the problem type',
    example: 'https://api.example.com/errors/validation-error',
  })
  type: string;

  @ApiProperty({
    description: 'Short, human-readable summary of the problem type',
    example: 'Validation Error',
  })
  title: string;

  @ApiProperty({
    description: 'HTTP status code',
    example: 400,
  })
  status: number;

  @ApiProperty({
    description: 'Human-readable explanation specific to this occurrence',
    example: 'The request body contains invalid fields',
  })
  detail: string;

  @ApiProperty({
    description: 'URI reference that identifies the specific occurrence',
    example: '/admin/personas/123',
    required: false,
  })
  instance?: string;

  @ApiProperty({
    description: 'Array of field-level validation errors',
    type: [ValidationError],
    required: false,
  })
  errors?: ValidationError[];
}
