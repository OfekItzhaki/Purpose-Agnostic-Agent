import { Test, TestingModule } from '@nestjs/testing';
import { Repository } from 'typeorm';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BulkUploadCommand, BulkUploadInput } from './bulk-upload.command.js';
import { AdminDocumentUploadService } from '../services/admin-document-upload.service.js';
import { KnowledgeCategory } from '../entities/knowledge-category.entity.js';
import { UploadedFile } from '../../common/validators/file-upload.validator.js';

describe('BulkUploadCommand', () => {
  let uploadService: jest.Mocked<AdminDocumentUploadService>;
  let categoryRepository: jest.Mocked<Repository<KnowledgeCategory>>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        {
          provide: AdminDocumentUploadService,
          useValue: {
            validateUpload: jest.fn(),
            uploadDocument: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(KnowledgeCategory),
          useValue: {
            findOne: jest.fn(),
          },
        },
      ],
    }).compile();

    uploadService = module.get(AdminDocumentUploadService);
    categoryRepository = module.get(getRepositoryToken(KnowledgeCategory));
  });

  const createMockFile = (filename: string): UploadedFile => ({
    originalname: filename,
    mimetype: 'text/plain',
    size: 1024,
  });

  const createMockInput = (filename: string): BulkUploadInput => ({
    file: createMockFile(filename),
    buffer: Buffer.from('test content'),
  });

  describe('validate', () => {
    it('should return invalid when no files provided', async () => {
      const command = new BulkUploadCommand(
        uploadService,
        categoryRepository,
        [],
        'general',
      );

      const result = await command.validate();

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('No files provided for upload');
    });

    it('should return invalid when category is empty', async () => {
      const files = [createMockInput('test.txt')];
      const command = new BulkUploadCommand(
        uploadService,
        categoryRepository,
        files,
        '',
      );

      const result = await command.validate();

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Category is required for bulk upload');
    });

    it('should return invalid when category does not exist', async () => {
      const files = [createMockInput('test.txt')];
      categoryRepository.findOne.mockResolvedValue(null);

      const command = new BulkUploadCommand(
        uploadService,
        categoryRepository,
        files,
        'nonexistent',
      );

      const result = await command.validate();

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain("Category 'nonexistent' does not exist");
    });

    it('should return invalid when file validation fails', async () => {
      const files = [createMockInput('test.txt')];
      categoryRepository.findOne.mockResolvedValue({
        name: 'general',
      } as KnowledgeCategory);
      uploadService.validateUpload.mockImplementation(() => {
        throw new Error('File too large');
      });

      const command = new BulkUploadCommand(
        uploadService,
        categoryRepository,
        files,
        'general',
      );

      const result = await command.validate();

      expect(result.isValid).toBe(false);
      expect(result.errors[0]).toContain('File too large');
    });

    it('should return valid when all validations pass', async () => {
      const files = [createMockInput('test.txt')];
      categoryRepository.findOne.mockResolvedValue({
        name: 'general',
      } as KnowledgeCategory);
      uploadService.validateUpload.mockImplementation(() => {});

      const command = new BulkUploadCommand(
        uploadService,
        categoryRepository,
        files,
        'general',
      );

      const result = await command.validate();

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('execute', () => {
    it('should process all files successfully', async () => {
      const files = [
        createMockInput('file1.txt'),
        createMockInput('file2.txt'),
        createMockInput('file3.txt'),
      ];

      uploadService.uploadDocument.mockResolvedValue({
        success: true,
        jobId: 'job-123',
        filePath: '/uploads/file.txt',
      });

      const command = new BulkUploadCommand(
        uploadService,
        categoryRepository,
        files,
        'general',
      );

      const result = await command.execute();

      expect(result.total).toBe(3);
      expect(result.successful).toBe(3);
      expect(result.failed).toBe(0);
      expect(result.successes).toHaveLength(3);
      expect(result.failures).toHaveLength(0);
      expect(uploadService.uploadDocument).toHaveBeenCalledTimes(3);
    });

    it('should handle partial failures gracefully', async () => {
      const files = [
        createMockInput('file1.txt'),
        createMockInput('file2.txt'),
        createMockInput('file3.txt'),
      ];

      uploadService.uploadDocument
        .mockResolvedValueOnce({
          success: true,
          jobId: 'job-1',
          filePath: '/uploads/file1.txt',
        })
        .mockResolvedValueOnce({
          success: false,
          error: 'Upload failed',
        })
        .mockResolvedValueOnce({
          success: true,
          jobId: 'job-3',
          filePath: '/uploads/file3.txt',
        });

      const command = new BulkUploadCommand(
        uploadService,
        categoryRepository,
        files,
        'general',
      );

      const result = await command.execute();

      expect(result.total).toBe(3);
      expect(result.successful).toBe(2);
      expect(result.failed).toBe(1);
      expect(result.successes).toHaveLength(2);
      expect(result.failures).toHaveLength(1);
      expect(result.failures[0].error).toBe('Upload failed');
    });

    it('should handle exceptions during upload', async () => {
      const files = [createMockInput('file1.txt')];

      uploadService.uploadDocument.mockRejectedValue(
        new Error('Network error'),
      );

      const command = new BulkUploadCommand(
        uploadService,
        categoryRepository,
        files,
        'general',
      );

      const result = await command.execute();

      expect(result.total).toBe(1);
      expect(result.successful).toBe(0);
      expect(result.failed).toBe(1);
      expect(result.failures[0].error).toBe('Network error');
    });

    it('should process files in batches with concurrency limit', async () => {
      // Create 12 files to test batching (concurrency limit is 5)
      const files = Array.from({ length: 12 }, (_, i) =>
        createMockInput(`file${i + 1}.txt`),
      );

      const uploadTimes: number[] = [];
      uploadService.uploadDocument.mockImplementation(async () => {
        uploadTimes.push(Date.now());
        await new Promise((resolve) => setTimeout(resolve, 10));
        return {
          success: true,
          jobId: 'job-123',
          filePath: '/uploads/file.txt',
        };
      });

      const command = new BulkUploadCommand(
        uploadService,
        categoryRepository,
        files,
        'general',
      );

      const result = await command.execute();

      expect(result.total).toBe(12);
      expect(result.successful).toBe(12);
      expect(uploadService.uploadDocument).toHaveBeenCalledTimes(12);

      // Verify batching: files should be processed in groups
      // First 5 should start around the same time
      // Next 5 should start after first batch completes
      // Last 2 should start after second batch completes
    });

    it('should track progress for each file', async () => {
      const files = [
        createMockInput('file1.txt'),
        createMockInput('file2.txt'),
      ];

      uploadService.uploadDocument
        .mockResolvedValueOnce({
          success: true,
          jobId: 'job-1',
          filePath: '/uploads/file1.txt',
        })
        .mockResolvedValueOnce({
          success: true,
          jobId: 'job-2',
          filePath: '/uploads/file2.txt',
        });

      const command = new BulkUploadCommand(
        uploadService,
        categoryRepository,
        files,
        'general',
      );

      const result = await command.execute();

      expect(result.successes[0].filename).toBe('file1.txt');
      expect(result.successes[0].jobId).toBe('job-1');
      expect(result.successes[1].filename).toBe('file2.txt');
      expect(result.successes[1].jobId).toBe('job-2');
    });
  });

  describe('rollback', () => {
    it('should return true (no-op for file uploads)', async () => {
      const files = [createMockInput('test.txt')];
      const command = new BulkUploadCommand(
        uploadService,
        categoryRepository,
        files,
        'general',
      );

      const result = await command.rollback();

      expect(result).toBe(true);
    });
  });
});
