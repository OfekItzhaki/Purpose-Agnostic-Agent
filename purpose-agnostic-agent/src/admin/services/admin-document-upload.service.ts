import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import type { Queue } from 'bull';
import {
  FileUploadValidator,
  UploadedFile,
} from '../../common/validators/file-upload.validator.js';
import { StructuredLogger } from '../../common/logger.service.js';
import * as fs from 'fs/promises';
import * as path from 'path';

export interface UploadResult {
  success: boolean;
  jobId?: string;
  filePath?: string;
  error?: string;
}

export interface BulkUploadResult {
  total: number;
  successful: number;
  failed: number;
  results: Array<{
    filename: string;
    success: boolean;
    jobId?: string;
    filePath?: string;
    error?: string;
  }>;
}

@Injectable()
export class AdminDocumentUploadService {
  private readonly logger = new StructuredLogger();
  private readonly uploadDir = 'uploads/documents';

  constructor(
    @InjectQueue('document-ingestion')
    private readonly ingestionQueue: Queue,
  ) {
    // Ensure upload directory exists
    this.ensureUploadDirectory();
  }

  /**
   * Validate uploaded file against requirements
   * Requirements 3.7, 3.8: Validate file size (max 10MB) and file types (PDF, TXT, MD)
   */
  validateUpload(file: UploadedFile): void {
    FileUploadValidator.validate(file, {
      maxSizeBytes: 10 * 1024 * 1024, // 10MB per requirement 3.7
      allowedMimeTypes: ['application/pdf', 'text/plain', 'text/markdown'],
      allowedExtensions: ['.pdf', '.txt', '.md'], // Per requirement 3.8
    });
  }

  /**
   * Upload a single document and trigger ingestion
   * Requirements 3.1, 3.2, 3.3: Support document upload, require category assignment, trigger ingestion
   */
  async uploadDocument(
    file: UploadedFile,
    category: string,
    fileBuffer: Buffer,
  ): Promise<UploadResult> {
    try {
      // Validate the upload
      this.validateUpload(file);

      // Validate category is provided
      if (!category || category.trim() === '') {
        throw new BadRequestException('Category is required');
      }

      // Sanitize filename
      const sanitizedFilename = FileUploadValidator.sanitizeFilename(
        file.originalname,
      );
      const timestamp = Date.now();
      const uniqueFilename = `${timestamp}_${sanitizedFilename}`;
      const filePath = path.join(this.uploadDir, uniqueFilename);

      // Save file to temporary location
      await fs.writeFile(filePath, fileBuffer);

      this.logger.log(
        `File saved to ${filePath}, queuing for ingestion`,
        'AdminDocumentUploadService',
      );

      // Queue document for ingestion
      const job = await this.ingestionQueue.add({
        filePath,
        category,
      });

      this.logger.log(
        `Document queued for ingestion: ${filePath} (Job ID: ${job.id})`,
        'AdminDocumentUploadService',
      );

      return {
        success: true,
        jobId: job.id.toString(),
        filePath,
      };
    } catch (error) {
      this.logger.error(
        `Failed to upload document: ${file.originalname}`,
        (error as Error).stack,
        'AdminDocumentUploadService',
      );

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Upload multiple documents with parallel processing
   * Requirements 6.1, 6.2: Support bulk upload and parallel processing
   */
  async bulkUploadDocuments(
    files: Array<{ file: UploadedFile; buffer: Buffer }>,
    category: string,
  ): Promise<BulkUploadResult> {
    const result: BulkUploadResult = {
      total: files.length,
      successful: 0,
      failed: 0,
      results: [],
    };

    // Validate category once for all files
    if (!category || category.trim() === '') {
      throw new BadRequestException('Category is required for bulk upload');
    }

    // Process all files in parallel
    const uploadPromises = files.map(async ({ file, buffer }) => {
      const uploadResult = await this.uploadDocument(file, category, buffer);

      const fileResult = {
        filename: file.originalname,
        success: uploadResult.success,
        jobId: uploadResult.jobId,
        filePath: uploadResult.filePath,
        error: uploadResult.error,
      };

      if (uploadResult.success) {
        result.successful++;
      } else {
        result.failed++;
      }

      return fileResult;
    });

    result.results = await Promise.all(uploadPromises);

    this.logger.log(
      `Bulk upload completed: ${result.successful}/${result.total} successful`,
      'AdminDocumentUploadService',
    );

    return result;
  }

  /**
   * Get the status of a document ingestion job
   * Requirement 3.4: Display processing status
   */
  async getIngestionStatus(jobId: string): Promise<any> {
    const job = await this.ingestionQueue.getJob(jobId);

    if (!job) {
      return { status: 'not_found' };
    }

    const state = await job.getState();
    const progress = job.progress();

    return {
      status: state,
      progress,
      data: job.data,
    };
  }

  /**
   * Ensure upload directory exists
   */
  private async ensureUploadDirectory(): Promise<void> {
    try {
      await fs.mkdir(this.uploadDir, { recursive: true });
    } catch (error) {
      this.logger.error(
        `Failed to create upload directory: ${this.uploadDir}`,
        (error as Error).stack,
        'AdminDocumentUploadService',
      );
    }
  }
}
