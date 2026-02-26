import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { AdminKnowledgeController } from './admin-knowledge.controller.js';
import { AdminKnowledgeService } from '../services/admin-knowledge.service.js';
import { AdminDocumentUploadService } from '../services/admin-document-upload.service.js';
import { AdminAuthGuard } from '../guards/admin-auth.guard.js';
import { BulkDeleteDto } from '../dto/bulk-delete.dto.js';
import { BulkReassignDto } from '../dto/bulk-reassign.dto.js';

describe('AdminKnowledgeController', () => {
  let controller: AdminKnowledgeController;
  let adminKnowledgeService: jest.Mocked<AdminKnowledgeService>;
  let adminDocumentUploadService: jest.Mocked<AdminDocumentUploadService>;

  beforeEach(async () => {
    const mockAdminKnowledgeService = {
      listDocuments: jest.fn(),
      getDocumentById: jest.fn(),
      searchDocuments: jest.fn(),
      getStatistics: jest.fn(),
      deleteDocument: jest.fn(),
      bulkDeleteDocuments: jest.fn(),
      bulkReassignCategory: jest.fn(),
    };

    const mockAdminDocumentUploadService = {
      uploadDocument: jest.fn(),
      bulkUploadDocuments: jest.fn(),
      getIngestionStatus: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AdminKnowledgeController],
      providers: [
        {
          provide: AdminKnowledgeService,
          useValue: mockAdminKnowledgeService,
        },
        {
          provide: AdminDocumentUploadService,
          useValue: mockAdminDocumentUploadService,
        },
      ],
    })
      .overrideGuard(AdminAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<AdminKnowledgeController>(AdminKnowledgeController);
    adminKnowledgeService = module.get(AdminKnowledgeService);
    adminDocumentUploadService = module.get(AdminDocumentUploadService);
  });

  describe('listDocuments', () => {
    it('should return all documents when no filters provided', async () => {
      const mockDocuments = [
        {
          id: 'doc-1',
          source_path: 'knowledge/general/test.txt',
          category: 'general',
          total_chunks: 10,
          ingested_at: new Date(),
          status: 'completed',
          retry_count: 0,
        },
      ];

      adminKnowledgeService.listDocuments.mockResolvedValue(mockDocuments);

      const result = await controller.listDocuments();

      expect(result).toEqual(mockDocuments);
      expect(adminKnowledgeService.listDocuments).toHaveBeenCalledWith(
        undefined,
      );
    });

    it('should filter documents by category', async () => {
      const mockDocuments = [
        {
          id: 'doc-1',
          source_path: 'knowledge/technical/guide.txt',
          category: 'technical',
          total_chunks: 15,
          ingested_at: new Date(),
          status: 'completed',
          retry_count: 0,
        },
      ];

      adminKnowledgeService.listDocuments.mockResolvedValue(mockDocuments);

      const result = await controller.listDocuments('technical');

      expect(result).toEqual(mockDocuments);
      expect(adminKnowledgeService.listDocuments).toHaveBeenCalledWith(
        'technical',
      );
    });

    it('should search documents when search query provided', async () => {
      const mockDocuments = [
        {
          id: 'doc-1',
          source_path: 'knowledge/general/troubleshooting.txt',
          category: 'general',
          total_chunks: 12,
          ingested_at: new Date(),
          status: 'completed',
          retry_count: 0,
        },
      ];

      adminKnowledgeService.searchDocuments.mockResolvedValue(mockDocuments);

      const result = await controller.listDocuments(
        undefined,
        'troubleshooting',
      );

      expect(result).toEqual(mockDocuments);
      expect(adminKnowledgeService.searchDocuments).toHaveBeenCalledWith(
        'troubleshooting',
      );
    });
  });

  describe('getDocument', () => {
    it('should return document details by id', async () => {
      const mockDocument = {
        id: 'doc-1',
        source_path: 'knowledge/general/test.txt',
        category: 'general',
        file_hash: 'sha256:abc123',
        total_chunks: 10,
        ingested_at: new Date(),
        status: 'completed',
        retry_count: 0,
        chunk_count: 10,
      };

      adminKnowledgeService.getDocumentById.mockResolvedValue(mockDocument);

      const result = await controller.getDocument('doc-1');

      expect(result).toEqual(mockDocument);
      expect(adminKnowledgeService.getDocumentById).toHaveBeenCalledWith(
        'doc-1',
      );
    });

    it('should throw NotFoundException when document not found', async () => {
      adminKnowledgeService.getDocumentById.mockRejectedValue(
        new NotFoundException("Document with id 'doc-999' not found"),
      );

      await expect(controller.getDocument('doc-999')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('getStatistics', () => {
    it('should return knowledge base statistics', async () => {
      const mockStats = {
        total_documents: 150,
        total_chunks: 2500,
        documents_by_category: { general: 50, technical: 75, support: 25 },
        chunks_by_category: { general: 800, technical: 1200, support: 500 },
        recent_documents: [
          {
            id: 'doc-1',
            source_path: 'knowledge/general/test.txt',
            category: 'general',
            ingested_at: new Date(),
          },
        ],
      };

      adminKnowledgeService.getStatistics.mockResolvedValue(mockStats);

      const result = await controller.getStatistics();

      expect(result).toEqual(mockStats);
      expect(adminKnowledgeService.getStatistics).toHaveBeenCalled();
    });
  });

  describe('deleteDocument', () => {
    it('should delete document and return success message', async () => {
      adminKnowledgeService.deleteDocument.mockResolvedValue(undefined);

      const result = await controller.deleteDocument('doc-1');

      expect(result).toEqual({
        message: "Document 'doc-1' deleted successfully",
        id: 'doc-1',
      });
      expect(adminKnowledgeService.deleteDocument).toHaveBeenCalledWith(
        'doc-1',
      );
    });

    it('should throw NotFoundException when document not found', async () => {
      adminKnowledgeService.deleteDocument.mockRejectedValue(
        new NotFoundException("Document with id 'doc-999' not found"),
      );

      await expect(controller.deleteDocument('doc-999')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('bulkDeleteDocuments', () => {
    it('should delete multiple documents and return results', async () => {
      const dto: BulkDeleteDto = {
        documentIds: ['doc-1', 'doc-2', 'doc-3'],
      };

      const mockResult = {
        total: 3,
        successful: 2,
        failed: 1,
        errors: [
          {
            id: 'doc-3',
            error: "Document with id 'doc-3' not found",
          },
        ],
      };

      adminKnowledgeService.bulkDeleteDocuments.mockResolvedValue(mockResult);

      const result = await controller.bulkDeleteDocuments(dto);

      expect(result).toEqual(mockResult);
      expect(adminKnowledgeService.bulkDeleteDocuments).toHaveBeenCalledWith(
        dto.documentIds,
      );
    });

    it('should handle all successful deletions', async () => {
      const dto: BulkDeleteDto = {
        documentIds: ['doc-1', 'doc-2'],
      };

      const mockResult = {
        total: 2,
        successful: 2,
        failed: 0,
        errors: [],
      };

      adminKnowledgeService.bulkDeleteDocuments.mockResolvedValue(mockResult);

      const result = await controller.bulkDeleteDocuments(dto);

      expect(result).toEqual(mockResult);
      expect(result.failed).toBe(0);
    });
  });

  describe('bulkReassignCategory', () => {
    it('should reassign category for multiple documents', async () => {
      const dto: BulkReassignDto = {
        documentIds: ['doc-1', 'doc-2', 'doc-3'],
        newCategory: 'technical',
      };

      const mockResult = {
        total: 3,
        successful: 3,
        failed: 0,
        errors: [],
      };

      adminKnowledgeService.bulkReassignCategory.mockResolvedValue(mockResult);

      const result = await controller.bulkReassignCategory(dto);

      expect(result).toEqual(mockResult);
      expect(adminKnowledgeService.bulkReassignCategory).toHaveBeenCalledWith(
        dto.documentIds,
        dto.newCategory,
      );
    });

    it('should handle partial failures in reassignment', async () => {
      const dto: BulkReassignDto = {
        documentIds: ['doc-1', 'doc-2', 'doc-999'],
        newCategory: 'support',
      };

      const mockResult = {
        total: 3,
        successful: 2,
        failed: 1,
        errors: [
          {
            id: 'doc-999',
            error: "Document with id 'doc-999' not found",
          },
        ],
      };

      adminKnowledgeService.bulkReassignCategory.mockResolvedValue(mockResult);

      const result = await controller.bulkReassignCategory(dto);

      expect(result).toEqual(mockResult);
      expect(result.successful).toBe(2);
      expect(result.failed).toBe(1);
    });
  });

  describe('uploadDocument', () => {
    it('should upload a single document successfully', async () => {
      const mockFile: Express.Multer.File = {
        fieldname: 'file',
        originalname: 'test-document.txt',
        encoding: '7bit',
        mimetype: 'text/plain',
        size: 1024,
        buffer: Buffer.from('test content'),
        stream: null as any,
        destination: '',
        filename: '',
        path: '',
      };

      const dto = {
        category: 'general',
      };

      const mockResult = {
        success: true,
        jobId: '12345',
        filePath: 'uploads/documents/1234567890_test-document.txt',
      };

      adminDocumentUploadService.uploadDocument.mockResolvedValue(mockResult);

      const result = await controller.uploadDocument(mockFile, dto);

      expect(result).toEqual(mockResult);
      expect(adminDocumentUploadService.uploadDocument).toHaveBeenCalledWith(
        {
          originalname: mockFile.originalname,
          mimetype: mockFile.mimetype,
          size: mockFile.size,
        },
        dto.category,
        mockFile.buffer,
      );
    });

    it('should handle upload failure', async () => {
      const mockFile: Express.Multer.File = {
        fieldname: 'file',
        originalname: 'invalid.exe',
        encoding: '7bit',
        mimetype: 'application/x-msdownload',
        size: 1024,
        buffer: Buffer.from('test content'),
        stream: null as any,
        destination: '',
        filename: '',
        path: '',
      };

      const dto = {
        category: 'general',
      };

      const mockResult = {
        success: false,
        error: 'Invalid file type',
      };

      adminDocumentUploadService.uploadDocument.mockResolvedValue(mockResult);

      const result = await controller.uploadDocument(mockFile, dto);

      expect(result).toEqual(mockResult);
      expect(result.success).toBe(false);
    });
  });

  describe('bulkUploadDocuments', () => {
    it('should upload multiple documents successfully', async () => {
      const mockFiles: Express.Multer.File[] = [
        {
          fieldname: 'files',
          originalname: 'doc1.txt',
          encoding: '7bit',
          mimetype: 'text/plain',
          size: 1024,
          buffer: Buffer.from('content 1'),
          stream: null as any,
          destination: '',
          filename: '',
          path: '',
        },
        {
          fieldname: 'files',
          originalname: 'doc2.pdf',
          encoding: '7bit',
          mimetype: 'application/pdf',
          size: 2048,
          buffer: Buffer.from('content 2'),
          stream: null as any,
          destination: '',
          filename: '',
          path: '',
        },
      ];

      const dto = {
        category: 'technical',
      };

      const mockResult = {
        total: 2,
        successful: 2,
        failed: 0,
        results: [
          {
            filename: 'doc1.txt',
            success: true,
            jobId: '12345',
            filePath: 'uploads/documents/1234567890_doc1.txt',
          },
          {
            filename: 'doc2.pdf',
            success: true,
            jobId: '12346',
            filePath: 'uploads/documents/1234567891_doc2.pdf',
          },
        ],
      };

      adminDocumentUploadService.bulkUploadDocuments.mockResolvedValue(
        mockResult,
      );

      const result = await controller.bulkUploadDocuments(mockFiles, dto);

      expect(result).toEqual(mockResult);
      expect(
        adminDocumentUploadService.bulkUploadDocuments,
      ).toHaveBeenCalledWith(
        [
          {
            file: {
              originalname: 'doc1.txt',
              mimetype: 'text/plain',
              size: 1024,
            },
            buffer: mockFiles[0].buffer,
          },
          {
            file: {
              originalname: 'doc2.pdf',
              mimetype: 'application/pdf',
              size: 2048,
            },
            buffer: mockFiles[1].buffer,
          },
        ],
        dto.category,
      );
    });

    it('should handle partial failures in bulk upload', async () => {
      const mockFiles: Express.Multer.File[] = [
        {
          fieldname: 'files',
          originalname: 'valid.txt',
          encoding: '7bit',
          mimetype: 'text/plain',
          size: 1024,
          buffer: Buffer.from('content'),
          stream: null as any,
          destination: '',
          filename: '',
          path: '',
        },
        {
          fieldname: 'files',
          originalname: 'invalid.exe',
          encoding: '7bit',
          mimetype: 'application/x-msdownload',
          size: 1024,
          buffer: Buffer.from('content'),
          stream: null as any,
          destination: '',
          filename: '',
          path: '',
        },
      ];

      const dto = {
        category: 'general',
      };

      const mockResult = {
        total: 2,
        successful: 1,
        failed: 1,
        results: [
          {
            filename: 'valid.txt',
            success: true,
            jobId: '12345',
            filePath: 'uploads/documents/1234567890_valid.txt',
          },
          {
            filename: 'invalid.exe',
            success: false,
            error: 'Invalid file type',
          },
        ],
      };

      adminDocumentUploadService.bulkUploadDocuments.mockResolvedValue(
        mockResult,
      );

      const result = await controller.bulkUploadDocuments(mockFiles, dto);

      expect(result).toEqual(mockResult);
      expect(result.successful).toBe(1);
      expect(result.failed).toBe(1);
    });
  });
});
