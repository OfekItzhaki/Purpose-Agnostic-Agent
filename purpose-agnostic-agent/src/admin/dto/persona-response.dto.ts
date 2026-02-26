import { ApiProperty } from '@nestjs/swagger';

export class PersonaWithDetailsDto {
  @ApiProperty({
    description: 'Unique identifier for the persona',
    example: 'tech-support',
  })
  id!: string;

  @ApiProperty({
    description: 'Display name of the persona',
    example: 'Technical Support Agent',
  })
  name!: string;

  @ApiProperty({
    description: 'Brief description of the persona role',
    example: 'Helps users with technical issues and troubleshooting',
  })
  description!: string;

  @ApiProperty({
    description: 'Optional style/tone instructions for the persona',
    example: 'Be concise and technical. Use bullet points when appropriate.',
    required: false,
  })
  extraInstructions?: string;

  @ApiProperty({
    description: 'Knowledge category to filter RAG search results',
    example: 'support',
  })
  knowledgeCategory!: string;

  @ApiProperty({
    description: 'LLM temperature for response generation (0.0-1.0)',
    example: 0.7,
    required: false,
  })
  temperature?: number;

  @ApiProperty({
    description: 'Maximum tokens for LLM response',
    example: 2000,
    required: false,
  })
  maxTokens?: number;

  @ApiProperty({
    description: 'Timestamp when the persona was created',
    example: '2024-01-15T10:30:00Z',
  })
  created_at!: Date;

  @ApiProperty({
    description: 'Timestamp when the persona was last updated',
    example: '2024-01-20T14:45:00Z',
  })
  updated_at!: Date;
}

export class PaginatedPersonasDto {
  @ApiProperty({
    description: 'Array of personas with details',
    type: [PersonaWithDetailsDto],
  })
  personas!: PersonaWithDetailsDto[];

  @ApiProperty({
    description: 'Total number of personas in the system',
    example: 25,
  })
  total!: number;

  @ApiProperty({
    description: 'Current page number',
    example: 1,
  })
  page!: number;

  @ApiProperty({
    description: 'Number of items per page',
    example: 10,
  })
  pageSize!: number;

  @ApiProperty({
    description: 'Total number of pages',
    example: 3,
  })
  totalPages!: number;
}

export class DeletePersonaResponseDto {
  @ApiProperty({
    description: 'Success message',
    example: "Persona 'tech-support' deleted successfully",
  })
  message!: string;

  @ApiProperty({
    description: 'ID of the deleted persona',
    example: 'tech-support',
  })
  id!: string;
}

export class ValidationErrorDto {
  @ApiProperty({
    description: 'Error message',
    example: 'Persona validation failed',
  })
  message!: string;

  @ApiProperty({
    description: 'Array of validation error messages',
    example: [
      'Temperature must be a number between 0.0 and 1.0',
      "Knowledge category 'invalid' does not exist",
    ],
    type: [String],
  })
  errors!: string[];
}

export class PersonaInUseErrorDto {
  @ApiProperty({
    description: 'Error message',
    example:
      "Cannot delete persona 'tech-support' as it is currently in use by 3 active chat session(s)",
  })
  message!: string;

  @ApiProperty({
    description: 'Number of active chat sessions using this persona',
    example: 3,
  })
  activeSessionCount!: number;
}

export class UnauthorizedErrorDto {
  @ApiProperty({
    description: 'HTTP status code',
    example: 401,
  })
  statusCode!: number;

  @ApiProperty({
    description: 'Error message',
    example: 'Unauthorized',
  })
  message!: string;
}

export class NotFoundErrorDto {
  @ApiProperty({
    description: 'HTTP status code',
    example: 404,
  })
  statusCode!: number;

  @ApiProperty({
    description: 'Error message',
    example: "Persona with id 'tech-support' not found",
  })
  message!: string;
}

export class ConflictErrorDto {
  @ApiProperty({
    description: 'HTTP status code',
    example: 409,
  })
  statusCode!: number;

  @ApiProperty({
    description: 'Error message',
    example: "Persona with id 'tech-support' already exists",
  })
  message!: string;
}
