import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty } from 'class-validator';

/**
 * DTO for testing a persona with a query
 * Requirements: 12.1, 12.2
 */
export class TestPersonaDto {
  @ApiProperty({
    description: 'Test query to send to the persona',
    example: 'How do I deploy a Kubernetes cluster?',
    type: String,
  })
  @IsString()
  @IsNotEmpty()
  query: string;
}

/**
 * Retrieved knowledge chunk with relevance score
 * Requirements: 12.3, 12.4
 */
export class RetrievedChunkDto {
  @ApiProperty({
    description: 'Content of the retrieved knowledge chunk',
    example: 'Kubernetes is a container orchestration platform...',
    type: String,
  })
  content: string;

  @ApiProperty({
    description: 'Source path of the knowledge document',
    example: 'knowledge/general/kubernetes-guide.txt',
    type: String,
  })
  sourcePath: string;

  @ApiProperty({
    description: 'Knowledge category',
    example: 'general',
    type: String,
  })
  category: string;

  @ApiProperty({
    description: 'Relevance score (0.0 to 1.0)',
    example: 0.85,
    type: Number,
  })
  relevanceScore: number;
}

/**
 * Response from testing a persona
 * Requirements: 12.2, 12.3, 12.4, 12.6
 */
export class TestPersonaResponseDto {
  @ApiProperty({
    description: 'Generated answer from the persona',
    example: 'To deploy a Kubernetes cluster, you need to...',
    type: String,
  })
  answer: string;

  @ApiProperty({
    description: 'Knowledge chunks retrieved during the query',
    type: [RetrievedChunkDto],
  })
  retrievedChunks: RetrievedChunkDto[];

  @ApiProperty({
    description: 'Model provider used for generation',
    example: 'openai/gpt-4',
    type: String,
  })
  modelProvider: string;

  @ApiProperty({
    description: 'Total tokens used in the generation',
    example: 450,
    type: Number,
  })
  tokensUsed: number;

  @ApiProperty({
    description: 'Total latency in milliseconds',
    example: 1250,
    type: Number,
  })
  latencyMs: number;
}
