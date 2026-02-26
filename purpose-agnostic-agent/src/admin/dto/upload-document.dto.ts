import { IsString, IsNotEmpty, IsOptional, IsObject } from 'class-validator';

/**
 * DTO for uploading a single document
 * Requirements 3.2: Category is required for document upload
 */
export class UploadDocumentDto {
  @IsString()
  @IsNotEmpty({ message: 'Category is required' })
  category!: string;

  @IsObject()
  @IsOptional()
  metadata?: Record<string, any>;
}
