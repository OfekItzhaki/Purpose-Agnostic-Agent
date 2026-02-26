import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { getQueueToken } from '@nestjs/bull';
import { AdminDocumentUploadService } from './admin-document-upload.service.js';
import type { Queue, Job } from 'bull';
import * as fs from 'fs/promises';

// Mock fs module
jest.mock('fs/promises');

describe('AdminDocumentUploadService', () => {
  let service: AdminDocumentUploadService;
  let mockQueue: jest.Mocked<Queue>;

  const mockJob: Partial<Job> = {
    id: '12345',
    data: { filePath: 'test.pdf', category: 'general' },
    progress: jest.fn().mockReturnValue(50),
    getState: jest.fn().mockResolvedValue('active'),
  };

  beforeEach(async () => {
    mockQueue = {
      add: jest.fn().mockResolvedValue(mockJob),
      getJob: jest.fn().mockResolvedValue(mockJob),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminDocumentUploadService,
        {
          provide: getQueueToken('document-ingestion'),
          useValue: mockQueue,
        },
      ],
    }).compile();

    service = module.get<AdminDocumentUploadService>(
      AdminDocumentUploadService,
    );

    // Mock fs operations
    (fs.mkdir as jest.Mock).mockResolvedValue(undefined);
    (fs.writeFile as jest.Mock).mockResolvedValue(undefined);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('validateUpload', () => {
    it('should accept valid PDF file under 10MB', () => {
      const file = {
        originalname: 'test.pdf',
        mimetype: 'application/pdf',
        size: 5 * 1024 * 1024, // 5MB
      };

      expect(() => service.validateUpload(file)).not.toThrow();
    });

    it('should accept valid TXT file', () => {
      const file = {
        originalname: 'test.txt',
        mimetype: 'text/plain',
        size: 1024,
      };

      expect(() => service.validateUpload(file)).not.toThrow();
    });

    it('should accept valid MD file', () => {
      const file = {
        originalname: 'test.md',
        mimetype: 'text/markdown',
        size: 1024,
      };

      expect(() => service.validateUpload(file)).not.toThrow();
    });

    it('should reject file exceeding 10MB limit (Requirement 3.7)', () => {
      const file = {
        originalname: 'large.pdf',
        mimetype: 'application/pdf',
        size: 11 * 1024 * 1024, // 11MB
      };

      expect(() => service.validateUpload(file)).toThrow(BadRequestException);
      expect(() => service.validateUpload(file)).toThrow(/exceeds maximum/);
    });

    it('should reject unsupported file type (Requirement 3.8)', () => {
      const file = {
        originalname: 'test.docx',
        mimetype:
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        size: 1024,
      };

      expect(() => service.validateUpload(file)).toThrow(BadRequestException);
      expect(() => service.validateUpload(file)).toThrow(/not allowed/);
    });

    it('should reject file with invalid extension', () => {
      const file = {
        originalname: 'test.exe',
        mimetype: 'application/pdf', // Mimetype doesn't match extension
        size: 1024,
      };

      expect(() => service.validateUpload(file)).toThrow(BadRequestException);
    });

    it('should reject file with path traversal attempt', () => {
      const file = {
        originalname: '../../../etc/passwd',
        mimetype: 'text/plain',
        size: 1024,
      };

      expect(() => service.validateUpload(file)).toThrow(BadRequestException);
    });
  });

  describe('uploadDocument', () => {
    const validFile = {
      originalname: 'test.pdf',
      mimetype: 'application/pdf',
      size: 1024,
    };

    const fileBuffer = Buffer.from('test content');

    it('should successfully upload document and trigger ingestion (Requirements 3.1, 3.3)', async () => {
      const result = await service.uploadDocument(
        validFile,
        'general',
        fileBuffer,
      );

      expect(result.success).toBe(true);
      expect(result.jobId).toBe('12345');
      expect(result.filePath).toContain('test.pdf');
      expect(fs.writeFile).toHaveBeenCalled();
      expect(mockQueue.add).toHaveBeenCalledWith({
        filePath: expect.any(String),
        category: 'general',
      });
    });

    it('should require category assignment (Requirement 3.2)', async () => {
      const result = await service.uploadDocument(validFile, '', fileBuffer);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Category is required');
    });

    it('should sanitize filename', async () => {
      const unsafeFile = {
        originalname: 'test file (1).pdf',
        mimetype: 'application/pdf',
        size: 1024,
      };

      const result = await service.uploadDocument(
        unsafeFile,
        'general',
        fileBuffer,
      );

      expect(result.success).toBe(true);
      expect(result.filePath).toContain('test_file_');
      expect(result.filePath).toContain('.pdf');
    });

    it('should handle upload errors gracefully', async () => {
      (fs.writeFile as jest.Mock).mockRejectedValueOnce(new Error('Disk full'));

      const result = await service.uploadDocument(
        validFile,
        'general',
        fileBuffer,
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('Disk full');
    });

    it('should reject invalid file', async () => {
      const invalidFile = {
        originalname: 'test.exe',
        mimetype: 'application/x-msdownload',
        size: 1024,
      };

      const result = await service.uploadDocument(
        invalidFile,
        'general',
        fileBuffer,
      );

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('bulkUploadDocuments', () => {
    const files = [
      {
        file: {
          originalname: 'doc1.pdf',
          mimetype: 'application/pdf',
          size: 1024,
        },
        buffer: Buffer.from('content1'),
      },
      {
        file: {
          originalname: 'doc2.txt',
          mimetype: 'text/plain',
          size: 2048,
        },
        buffer: Buffer.from('content2'),
      },
      {
        file: {
          originalname: 'doc3.md',
          mimetype: 'text/markdown',
          size: 512,
        },
        buffer: Buffer.from('content3'),
      },
    ];

    it('should upload multiple documents successfully (Requirements 6.1, 6.2)', async () => {
      const result = await service.bulkUploadDocuments(files, 'technical');

      expect(result.total).toBe(3);
      expect(result.successful).toBe(3);
      expect(result.failed).toBe(0);
      expect(result.results).toHaveLength(3);
      expect(mockQueue.add).toHaveBeenCalledTimes(3);
    });

    it('should process files in parallel', async () => {
      const startTime = Date.now();
      await service.bulkUploadDocuments(files, 'general');
      const duration = Date.now() - startTime;

      // Parallel processing should be faster than sequential
      // This is a rough check - in real parallel processing, duration should be much less
      expect(duration).toBeLessThan(1000);
    });

    it('should handle partial failures in bulk upload', async () => {
      // Make the second file fail
      (fs.writeFile as jest.Mock)
        .mockResolvedValueOnce(undefined)
        .mockRejectedValueOnce(new Error('Write failed'))
        .mockResolvedValueOnce(undefined);

      const result = await service.bulkUploadDocuments(files, 'general');

      expect(result.total).toBe(3);
      expect(result.successful).toBe(2);
      expect(result.failed).toBe(1);
      expect(result.results[1].success).toBe(false);
      expect(result.results[1].error).toContain('Write failed');
    });

    it('should require category for bulk upload', async () => {
      await expect(service.bulkUploadDocuments(files, '')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should track individual file results', async () => {
      const result = await service.bulkUploadDocuments(files, 'general');

      expect(result.results[0].filename).toBe('doc1.pdf');
      expect(result.results[0].success).toBe(true);
      expect(result.results[0].jobId).toBeDefined();

      expect(result.results[1].filename).toBe('doc2.txt');
      expect(result.results[2].filename).toBe('doc3.md');
    });
  });

  describe('getIngestionStatus', () => {
    it('should return job status (Requirement 3.4)', async () => {
      const status = await service.getIngestionStatus('12345');

      expect(status.status).toBe('active');
      expect(status.progress).toBe(50);
      expect(status.data).toEqual({
        filePath: 'test.pdf',
        category: 'general',
      });
      expect(mockQueue.getJob).toHaveBeenCalledWith('12345');
    });

    it('should handle non-existent job', async () => {
      mockQueue.getJob.mockResolvedValueOnce(null as any);

      const status = await service.getIngestionStatus('invalid-id');

      expect(status.status).toBe('not_found');
    });

    it('should handle different job states', async () => {
      const completedJob = {
        ...mockJob,
        getState: jest.fn().mockResolvedValue('completed'),
        progress: jest.fn().mockReturnValue(100),
      };

      mockQueue.getJob.mockResolvedValueOnce(completedJob as any);

      const status = await service.getIngestionStatus('12345');

      expect(status.status).toBe('completed');
      expect(status.progress).toBe(100);
    });
  });
});
