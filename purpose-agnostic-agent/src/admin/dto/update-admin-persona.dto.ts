import {
  IsString,
  IsOptional,
  MaxLength,
  IsNumber,
  Min,
  Max,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateAdminPersonaDto {
  @ApiProperty({
    description: 'Display name of the persona',
    example: 'Technical Support Agent',
    maxLength: 100,
    required: false,
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  name?: string;

  @ApiProperty({
    description: 'Brief description of the persona role',
    example: 'Helps users with technical issues and troubleshooting',
    maxLength: 500,
    required: false,
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @ApiProperty({
    description: 'Optional style/tone instructions for the persona',
    example: 'Be concise and technical. Use bullet points when appropriate.',
    maxLength: 2000,
    required: false,
  })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  extraInstructions?: string;

  @ApiProperty({
    description: 'Knowledge category to filter RAG search results',
    example: 'support',
    maxLength: 50,
    required: false,
  })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  knowledgeCategory?: string;

  @ApiProperty({
    description: 'LLM temperature for response generation (0.0-1.0)',
    example: 0.7,
    minimum: 0,
    maximum: 1,
    required: false,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  temperature?: number;

  @ApiProperty({
    description: 'Maximum tokens for LLM response',
    example: 2000,
    minimum: 1,
    required: false,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  maxTokens?: number;
}
