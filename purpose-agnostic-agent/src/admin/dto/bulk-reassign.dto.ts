import { IsArray, IsString, ArrayNotEmpty, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/**
 * DTO for bulk category reassignment
 * Requirement 6.6: Support bulk category reassignment
 */
export class BulkReassignDto {
  @ApiProperty({
    description: 'Array of document IDs to reassign',
    example: ['doc-123', 'doc-456', 'doc-789'],
    type: [String],
  })
  @IsArray()
  @ArrayNotEmpty({ message: 'Document IDs array cannot be empty' })
  @IsString({ each: true })
  documentIds!: string[];

  @ApiProperty({
    description: 'New category to assign to the documents',
    example: 'technical',
  })
  @IsString()
  @IsNotEmpty({ message: 'New category is required' })
  newCategory!: string;
}
