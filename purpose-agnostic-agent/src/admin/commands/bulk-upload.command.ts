import { Injectable } from '@nestjs/common';
import {
  BulkOperationCommand,
  BulkOperationResult,
  ValidationResult,
} from './bulk-operation-command.interface.js';
import { AdminDocumentUploadService } from '../services/admin-document-upload.service.js';
import { UploadedFile } from '../../common/validators/file-upload.validator.js';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { KnowledgeCategory } from '../entities/knowledge-category.entity.js';

/**
 * Input for bulk upload operation
 */
export interface BulkUploadInput {
  file: UploadedFile;
  buffer: Buffer;
}

/**
 * Output for bulk upload operation
 */
export interface BulkUploadOutput {
  filename: string;
  jobId?: string;
  filePath?: string;
}

/**
 * Command for bulk upload of knowledge documents
 *
 * Implements the command pattern for bulk document uploads with:
 * - Pre-execution validation to ensure category exists and files are valid
 * - Parallel processing with concurrency limit to prevent resource exhaustion
 * - Per-file progress tracking with success/failure details
 * - Graceful handling of partial failures
 *
 * Requirements: 6.1, 6.2, 6.3
 */
@Injectable()
export class BulkUploadCommand implements BulkOperationCommand<
  BulkUploadInput,
  BulkUploadOutput
> {
  private files: BulkUploadInput[];
  private category: string;
  private readonly concurrencyLimit = 5; // Process 5 files at a time

  constructor(
    private readonly uploadService: AdminDocumentUploadService,
    @InjectRepository(KnowledgeCategory)
    private readonly categoryRepository: Repository<KnowledgeCategory>,
    files: BulkUploadInput[],
    category: string,
  ) {
    this.files = files;
    this.category = category;
  }

  /**
   * Validates files and category before upload
   *
   * Requirements: 6.1 - Validate files before bulk upload
   */
  async validate(): Promise<ValidationResult> {
    const errors: string[] = [];

    // Validate files array
    if (!this.files || this.files.length === 0) {
      errors.push('No files provided for upload');
      return { isValid: false, errors };
    }

    // Validate category
    if (!this.category || this.category.trim() === '') {
      errors.push('Category is required for bulk upload');
      return { isValid: false, errors };
    }

    // Check if category exists
    const categoryExists = await this.categoryRepository.findOne({
      where: { name: this.category },
    });

    if (!categoryExists) {
      errors.push(`Category '${this.category}' does not exist`);
    }

    // Validate each file
    for (const { file } of this.files) {
      try {
        this.uploadService.validateUpload(file);
      } catch (error) {
        errors.push(
          `File '${file.originalname}': ${error instanceof Error ? error.message : 'Invalid file'}`,
        );
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Executes bulk upload with parallel processing and concurrency limit
   *
   * Processes uploads in parallel (up to concurrency limit) to improve performance
   * while preventing resource exhaustion. Tracks success/failure for each file.
   *
   * Requirements: 6.1, 6.2, 6.3 - Parallel processing with concurrency limit and progress tracking
   */
  async execute(): Promise<BulkOperationResult<BulkUploadOutput>> {
    const result: BulkOperationResult<BulkUploadOutput> = {
      total: this.files.length,
      successful: 0,
      failed: 0,
      successes: [],
      failures: [],
    };

    // Process files in batches to implement concurrency limit
    const batches: BulkUploadInput[][] = [];
    for (let i = 0; i < this.files.length; i += this.concurrencyLimit) {
      batches.push(this.files.slice(i, i + this.concurrencyLimit));
    }

    // Process each batch sequentially, but files within a batch in parallel
    for (const batch of batches) {
      const uploadPromises = batch.map(async ({ file, buffer }) => {
        try {
          const uploadResult = await this.uploadService.uploadDocument(
            file,
            this.category,
            buffer,
          );

          if (uploadResult.success) {
            const output: BulkUploadOutput = {
              filename: file.originalname,
              jobId: uploadResult.jobId,
              filePath: uploadResult.filePath,
            };

            result.successful++;
            result.successes.push(output);
          } else {
            result.failed++;
            result.failures.push({
              item: {
                filename: file.originalname,
              },
              error: uploadResult.error || 'Unknown error',
            });
          }
        } catch (error) {
          result.failed++;
          result.failures.push({
            item: {
              filename: file.originalname,
            },
            error: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      });

      // Wait for current batch to complete before processing next batch
      await Promise.all(uploadPromises);
    }

    return result;
  }

  /**
   * Rolls back the upload operation
   *
   * Note: File uploads and ingestion jobs cannot be easily rolled back.
   * Failed uploads are tracked in the result, and the admin can manually
   * delete successfully uploaded documents if needed.
   *
   * Requirements: 6.3 - Handle partial failures gracefully
   */
  async rollback(): Promise<boolean> {
    // File uploads and ingestion jobs cannot be easily rolled back.
    // The execute method tracks failures, allowing the admin to handle
    // partial failures by reviewing the results and taking appropriate action.
    return true;
  }
}
