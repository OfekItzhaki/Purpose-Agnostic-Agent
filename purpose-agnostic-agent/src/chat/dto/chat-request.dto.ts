import { IsString, IsNotEmpty, MaxLength, IsUUID, IsOptional } from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import sanitizeHtml from 'sanitize-html';

export class ChatRequestDto {
  @ApiProperty({
    description: 'The unique identifier of the agent persona to query',
    example: 'tech-support',
    maxLength: 100,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  @Transform(({ value }) => sanitizeHtml(value, { allowedTags: [], allowedAttributes: {} }))
  agent_id: string;

  @ApiProperty({
    description: 'The question to ask the agent',
    example: 'How do I reset my password?',
    maxLength: 5000,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(5000)
  @Transform(({ value }) => sanitizeHtml(value, { allowedTags: [], allowedAttributes: {} }))
  question: string;

  @ApiProperty({
    description: 'Optional session ID for conversation continuity',
    example: '550e8400-e29b-41d4-a716-446655440000',
    required: false,
  })
  @IsOptional()
  @IsUUID()
  sessionId?: string;
}
