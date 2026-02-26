import {
  IsString,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsObject,
  IsIn,
} from 'class-validator';

/**
 * DTO for representing document upload/ingestion status
 * Requirement 3.4: Display processing status from Bull queue
 */
export class UploadStatusDto {
  @IsString()
  @IsNotEmpty()
  jobId!: string;

  @IsString()
  @IsIn([
    'waiting',
    'active',
    'completed',
    'failed',
    'delayed',
    'paused',
    'not_found',
  ])
  status!:
    | 'waiting'
    | 'active'
    | 'completed'
    | 'failed'
    | 'delayed'
    | 'paused'
    | 'not_found';

  @IsNumber()
  @IsOptional()
  progress?: number;

  @IsObject()
  @IsOptional()
  data?: {
    filePath?: string;
    category?: string;
  };

  @IsString()
  @IsOptional()
  error?: string;
}
