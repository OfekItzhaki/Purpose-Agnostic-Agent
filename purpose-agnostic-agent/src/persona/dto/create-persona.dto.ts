import { IsString, IsNotEmpty, MaxLength, IsOptional, IsNumber, Min, Max } from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class CreatePersonaDto {
  @ApiProperty({
    description: 'Unique identifier for the persona (lowercase, no spaces)',
    example: 'tech-support',
    maxLength: 50,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  @Transform(({ value }) => value.trim().toLowerCase())
  id!: string;

  @ApiProperty({
    description: 'Display name of the persona',
    example: 'Technical Support Agent',
    maxLength: 100,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name!: string;

  @ApiProperty({
    description: 'Brief description of the persona role',
    example: 'Helps users with technical issues and troubleshooting',
    maxLength: 500,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  description!: string;

  @ApiProperty({
    description: 'System prompt that defines the persona behavior',
    example: 'You are a helpful technical support agent...',
    maxLength: 5000,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(5000)
  systemPrompt!: string;

  @ApiProperty({
    description: 'Knowledge category to filter RAG search results',
    example: 'support',
    maxLength: 50,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  knowledgeCategory!: string;

  @ApiProperty({
    description: 'LLM temperature for response generation (0-2)',
    example: 0.7,
    minimum: 0,
    maximum: 2,
    required: false,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(2)
  temperature?: number;

  @ApiProperty({
    description: 'Maximum tokens for LLM response',
    example: 2000,
    minimum: 1,
    maximum: 8000,
    required: false,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(8000)
  maxTokens?: number;
}
