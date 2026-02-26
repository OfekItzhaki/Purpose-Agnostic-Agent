import { IsNumber, IsArray, ValidateNested, IsString } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

/**
 * DTO for individual operation error in bulk operations
 */
export class BulkOperationErrorDto {
  @ApiProperty({
    description: 'Document ID that failed',
    example: 'doc-123',
  })
  @IsString()
  id!: string;

  @ApiProperty({
    description: 'Error message',
    example: 'Document not found',
  })
  @IsString()
  error!: string;
}

/**
 * DTO for bulk operation results (delete, reassign)
 * Requirements 6.4, 6.5, 6.6: Track success/failure for bulk operations
 */
export class BulkOperationResultDto {
  @ApiProperty({
    description: 'Total number of documents in the operation',
    example: 10,
  })
  @IsNumber()
  total!: number;

  @ApiProperty({
    description: 'Number of successful operations',
    example: 8,
  })
  @IsNumber()
  successful!: number;

  @ApiProperty({
    description: 'Number of failed operations',
    example: 2,
  })
  @IsNumber()
  failed!: number;

  @ApiProperty({
    description: 'Array of errors for failed operations',
    type: [BulkOperationErrorDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BulkOperationErrorDto)
  errors!: BulkOperationErrorDto[];
}
