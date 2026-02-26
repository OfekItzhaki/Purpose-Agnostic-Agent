import {
  IsNumber,
  IsArray,
  ValidateNested,
  IsString,
  IsBoolean,
  IsOptional,
} from 'class-validator';
import { Type } from 'class-transformer';

/**
 * DTO for individual file result in bulk upload
 * Requirements 6.2, 6.3: Show per-file results with success/failure status
 */
export class FileUploadResultDto {
  @IsString()
  filename!: string;

  @IsBoolean()
  success!: boolean;

  @IsString()
  @IsOptional()
  jobId?: string;

  @IsString()
  @IsOptional()
  filePath?: string;

  @IsString()
  @IsOptional()
  error?: string;
}

/**
 * DTO for bulk upload operation results
 * Requirements 6.2, 6.3: Display progress and results for bulk uploads
 */
export class BulkUploadResultDto {
  @IsNumber()
  total!: number;

  @IsNumber()
  successful!: number;

  @IsNumber()
  failed!: number;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => FileUploadResultDto)
  results!: FileUploadResultDto[];
}
