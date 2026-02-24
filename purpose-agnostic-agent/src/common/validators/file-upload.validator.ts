import { BadRequestException } from '@nestjs/common';
import * as path from 'path';

export interface FileValidationOptions {
  maxSizeBytes?: number;
  allowedMimeTypes?: string[];
  allowedExtensions?: string[];
}

export interface UploadedFile {
  originalname: string;
  mimetype: string;
  size: number;
}

export class FileUploadValidator {
  private static readonly DEFAULT_MAX_SIZE = 10 * 1024 * 1024; // 10MB
  private static readonly DEFAULT_ALLOWED_MIME_TYPES = [
    'application/pdf',
    'text/plain',
    'text/markdown',
  ];
  private static readonly DEFAULT_ALLOWED_EXTENSIONS = ['.pdf', '.txt', '.md'];

  static validate(
    file: UploadedFile,
    options: FileValidationOptions = {},
  ): void {
    const maxSize = options.maxSizeBytes || this.DEFAULT_MAX_SIZE;
    const allowedMimeTypes =
      options.allowedMimeTypes || this.DEFAULT_ALLOWED_MIME_TYPES;
    const allowedExtensions =
      options.allowedExtensions || this.DEFAULT_ALLOWED_EXTENSIONS;

    // Validate file exists
    if (!file) {
      throw new BadRequestException('No file provided');
    }

    // Validate file size
    if (file.size > maxSize) {
      throw new BadRequestException(
        `File size exceeds maximum allowed size of ${maxSize / 1024 / 1024}MB`,
      );
    }

    // Validate MIME type
    if (!allowedMimeTypes.includes(file.mimetype)) {
      throw new BadRequestException(
        `File type ${file.mimetype} is not allowed. Allowed types: ${allowedMimeTypes.join(', ')}`,
      );
    }

    // Validate file extension
    const ext = path.extname(file.originalname).toLowerCase();
    if (!allowedExtensions.includes(ext)) {
      throw new BadRequestException(
        `File extension ${ext} is not allowed. Allowed extensions: ${allowedExtensions.join(', ')}`,
      );
    }

    // Validate filename (prevent path traversal)
    if (file.originalname.includes('..') || file.originalname.includes('/')) {
      throw new BadRequestException('Invalid filename');
    }
  }

  static validatePath(filePath: string): void {
    // Prevent path traversal attacks
    if (filePath.includes('..')) {
      throw new BadRequestException('Invalid file path: path traversal detected');
    }

    // Ensure path is within allowed directory
    const normalizedPath = path.normalize(filePath);
    if (normalizedPath.startsWith('/') || normalizedPath.includes('\\')) {
      throw new BadRequestException('Invalid file path: absolute paths not allowed');
    }
  }

  static sanitizeFilename(filename: string): string {
    // Remove any path components
    const basename = path.basename(filename);

    // Replace unsafe characters
    return basename
      .replace(/[^a-zA-Z0-9._-]/g, '_')
      .replace(/_{2,}/g, '_')
      .toLowerCase();
  }
}
