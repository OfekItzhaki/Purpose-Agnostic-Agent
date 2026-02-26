import { IsArray, IsString, ArrayNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/**
 * DTO for bulk delete operation
 * Requirements 6.4, 6.5: Support bulk deletion with document ID array
 */
export class BulkDeleteDto {
  @ApiProperty({
    description: 'Array of document IDs to delete',
    example: ['doc-123', 'doc-456', 'doc-789'],
    type: [String],
  })
  @IsArray()
  @ArrayNotEmpty({ message: 'Document IDs array cannot be empty' })
  @IsString({ each: true })
  documentIds!: string[];
}
