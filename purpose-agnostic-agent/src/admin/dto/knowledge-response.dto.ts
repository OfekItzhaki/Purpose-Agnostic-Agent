import { ApiProperty } from '@nestjs/swagger';

/**
 * DTO for document list item
 * Requirement 4.1: Display list of Knowledge_Documents
 */
export class DocumentListItemDto {
  @ApiProperty({
    description: 'Unique document identifier',
    example: 'doc-123',
  })
  id!: string;

  @ApiProperty({
    description: 'Source file path',
    example: 'knowledge/general/troubleshooting.txt',
  })
  source_path!: string;

  @ApiProperty({
    description: 'Knowledge category',
    example: 'general',
  })
  category!: string;

  @ApiProperty({
    description: 'Total number of chunks',
    example: 15,
  })
  total_chunks!: number;

  @ApiProperty({
    description: 'Ingestion timestamp',
    example: '2024-01-15T10:30:00Z',
  })
  ingested_at!: Date;

  @ApiProperty({
    description: 'Document status',
    example: 'completed',
  })
  status!: string;

  @ApiProperty({
    description: 'Error message if status is failed',
    example: null,
    required: false,
  })
  error_message?: string;

  @ApiProperty({
    description: 'Number of retry attempts',
    example: 0,
  })
  retry_count!: number;

  @ApiProperty({
    description: 'Additional metadata',
    example: { fileSize: 1024, mimeType: 'text/plain' },
    required: false,
  })
  metadata?: Record<string, any>;
}

/**
 * DTO for document detail
 * Requirement 4.2: Display document metadata including chunk count
 */
export class DocumentDetailDto {
  @ApiProperty({
    description: 'Unique document identifier',
    example: 'doc-123',
  })
  id!: string;

  @ApiProperty({
    description: 'Source file path',
    example: 'knowledge/general/troubleshooting.txt',
  })
  source_path!: string;

  @ApiProperty({
    description: 'Knowledge category',
    example: 'general',
  })
  category!: string;

  @ApiProperty({
    description: 'File hash for deduplication',
    example: 'sha256:abc123...',
    required: false,
  })
  file_hash?: string;

  @ApiProperty({
    description: 'Total number of chunks',
    example: 15,
  })
  total_chunks!: number;

  @ApiProperty({
    description: 'Ingestion timestamp',
    example: '2024-01-15T10:30:00Z',
  })
  ingested_at!: Date;

  @ApiProperty({
    description: 'Document status',
    example: 'completed',
  })
  status!: string;

  @ApiProperty({
    description: 'Error message if status is failed',
    example: null,
    required: false,
  })
  error_message?: string;

  @ApiProperty({
    description: 'Number of retry attempts',
    example: 0,
  })
  retry_count!: number;

  @ApiProperty({
    description: 'Additional metadata',
    example: { fileSize: 1024, mimeType: 'text/plain' },
    required: false,
  })
  metadata?: Record<string, any>;

  @ApiProperty({
    description: 'Actual chunk count from database',
    example: 15,
  })
  chunk_count!: number;
}

/**
 * DTO for knowledge statistics
 * Requirements 9.1-9.5: Display statistics about knowledge base
 */
export class KnowledgeStatisticsDto {
  @ApiProperty({
    description: 'Total number of documents',
    example: 150,
  })
  total_documents!: number;

  @ApiProperty({
    description: 'Total number of chunks',
    example: 2500,
  })
  total_chunks!: number;

  @ApiProperty({
    description: 'Document count by category',
    example: { general: 50, technical: 75, support: 25 },
  })
  documents_by_category!: Record<string, number>;

  @ApiProperty({
    description: 'Chunk count by category',
    example: { general: 800, technical: 1200, support: 500 },
  })
  chunks_by_category!: Record<string, number>;

  @ApiProperty({
    description: 'Recently ingested documents',
    type: [DocumentListItemDto],
  })
  recent_documents!: Array<{
    id: string;
    source_path: string;
    category: string;
    ingested_at: Date;
  }>;
}
