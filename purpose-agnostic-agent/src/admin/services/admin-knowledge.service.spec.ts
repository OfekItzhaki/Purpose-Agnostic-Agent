import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotFoundException } from '@nestjs/common';
import { AdminKnowledgeService } from './admin-knowledge.service.js';
import {
  KnowledgeDocument,
  IngestionStatus,
} from '../../rag/entities/knowledge-document.entity.js';
import { KnowledgeChunk } from '../../rag/entities/knowledge-chunk.entity.js';

describe('AdminKnowledgeService', () => {
  let service: AdminKnowledgeService;
  let documentRepository: jest.Mocked<Repository<KnowledgeDocument>>;
  let chunkRepository: jest.Mocked<Repository<KnowledgeChunk>>;

  const mockDocument: KnowledgeDocument = {
    id: 'doc-123',
    source_path: '/path/to/document.pdf',
    category: 'general',
    file_hash: 'abc123',
    total_chunks: 5,
    status: IngestionStatus.COMPLETED,
    retry_count: 0,
    ingested_at: new Date('2024-01-01'),
    updated_at: new Date('2024-01-01'),
    metadata: { author: 'Test Author' },
  };

  const mockDocuments: KnowledgeDocument[] = [
    mockDocument,
    {
      id: 'doc-456',
      source_path: '/path/to/technical.pdf',
      category: 'technical',
      file_hash: 'def456',
      total_chunks: 3,
      status: IngestionStatus.COMPLETED,
      retry_count: 0,
      ingested_at: new Date('2024-01-02'),
      updated_at: new Date('2024-01-02'),
      metadata: {},
    },
  ];

  beforeEach(async () => {
    const mockDocumentRepo = {
      find: jest.fn(),
      findOne: jest.fn(),
      count: jest.fn(),
      delete: jest.fn(),
      createQueryBuilder: jest.fn(),
      manager: {
        query: jest.fn(),
      },
    };

    const mockChunkRepo = {
      count: jest.fn(),
      createQueryBuilder: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminKnowledgeService,
        {
          provide: getRepositoryToken(KnowledgeDocument),
          useValue: mockDocumentRepo,
        },
        {
          provide: getRepositoryToken(KnowledgeChunk),
          useValue: mockChunkRepo,
        },
      ],
    }).compile();

    service = module.get<AdminKnowledgeService>(AdminKnowledgeService);
    documentRepository = module.get(getRepositoryToken(KnowledgeDocument));
    chunkRepository = module.get(getRepositoryToken(KnowledgeChunk));
  });

  describe('listDocuments', () => {
    it('should return all documents when no category filter is provided', async () => {
      documentRepository.find.mockResolvedValue(mockDocuments);

      const result = await service.listDocuments();

      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('doc-123');
      expect(result[1].id).toBe('doc-456');
      expect(documentRepository.find).toHaveBeenCalledWith({
        where: {},
        order: { ingested_at: 'DESC' },
      });
    });

    it('should filter documents by category when provided', async () => {
      const filteredDocs = [mockDocuments[0]];
      documentRepository.find.mockResolvedValue(filteredDocs);

      const result = await service.listDocuments('general');

      expect(result).toHaveLength(1);
      expect(result[0].category).toBe('general');
      expect(documentRepository.find).toHaveBeenCalledWith({
        where: { category: 'general' },
        order: { ingested_at: 'DESC' },
      });
    });

    it('should return empty array when no documents exist', async () => {
      documentRepository.find.mockResolvedValue([]);

      const result = await service.listDocuments();

      expect(result).toEqual([]);
    });
  });

  describe('getDocumentById', () => {
    it('should return document with chunk count', async () => {
      documentRepository.findOne.mockResolvedValue(mockDocument);
      chunkRepository.count.mockResolvedValue(5);

      const result = await service.getDocumentById('doc-123');

      expect(result.id).toBe('doc-123');
      expect(result.chunk_count).toBe(5);
      expect(result.source_path).toBe('/path/to/document.pdf');
      expect(documentRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'doc-123' },
      });
      expect(chunkRepository.count).toHaveBeenCalledWith({
        where: { document_id: 'doc-123' },
      });
    });

    it('should throw NotFoundException when document does not exist', async () => {
      documentRepository.findOne.mockResolvedValue(null);

      await expect(service.getDocumentById('nonexistent')).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.getDocumentById('nonexistent')).rejects.toThrow(
        "Document with id 'nonexistent' not found",
      );
    });
  });

  describe('searchDocuments', () => {
    it('should search documents by source path', async () => {
      documentRepository.find.mockResolvedValue([mockDocuments[1]]);

      const result = await service.searchDocuments('technical');

      expect(result).toHaveLength(1);
      expect(result[0].source_path).toContain('technical');
    });

    it('should search documents by category', async () => {
      documentRepository.find.mockResolvedValue([mockDocuments[0]]);

      const result = await service.searchDocuments('general');

      expect(result).toHaveLength(1);
      expect(result[0].category).toBe('general');
    });

    it('should return empty array when no matches found', async () => {
      documentRepository.find.mockResolvedValue([]);

      const result = await service.searchDocuments('nonexistent');

      expect(result).toEqual([]);
    });
  });

  describe('getStatistics', () => {
    it('should return comprehensive knowledge base statistics', async () => {
      documentRepository.count.mockResolvedValue(10);
      chunkRepository.count.mockResolvedValue(50);

      const mockDocsByCategory = [
        { category: 'general', count: '5' },
        { category: 'technical', count: '5' },
      ];

      const mockChunksByCategory = [
        { category: 'general', count: '25' },
        { category: 'technical', count: '25' },
      ];

      const mockRecentDocs = mockDocuments.slice(0, 2);

      const docQueryBuilder = {
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockReturnThis(),
        getRawMany: jest.fn().mockResolvedValue(mockDocsByCategory),
      };

      const chunkQueryBuilder = {
        leftJoin: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockReturnThis(),
        getRawMany: jest.fn().mockResolvedValue(mockChunksByCategory),
      };

      documentRepository.createQueryBuilder
        .mockReturnValueOnce(docQueryBuilder as any)
        .mockReturnValueOnce(mockRecentDocs as any);

      chunkRepository.createQueryBuilder.mockReturnValue(
        chunkQueryBuilder as any,
      );

      documentRepository.find.mockResolvedValue(mockRecentDocs);

      const result = await service.getStatistics();

      expect(result.total_documents).toBe(10);
      expect(result.total_chunks).toBe(50);
      expect(result.documents_by_category).toEqual({
        general: 5,
        technical: 5,
      });
      expect(result.chunks_by_category).toEqual({
        general: 25,
        technical: 25,
      });
      expect(result.recent_documents).toHaveLength(2);
      expect(result.recent_documents[0].id).toBe('doc-123');
    });

    it('should handle empty knowledge base', async () => {
      documentRepository.count.mockResolvedValue(0);
      chunkRepository.count.mockResolvedValue(0);

      const docQueryBuilder = {
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockReturnThis(),
        getRawMany: jest.fn().mockResolvedValue([]),
      };

      const chunkQueryBuilder = {
        leftJoin: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockReturnThis(),
        getRawMany: jest.fn().mockResolvedValue([]),
      };

      documentRepository.createQueryBuilder.mockReturnValue(
        docQueryBuilder as any,
      );
      chunkRepository.createQueryBuilder.mockReturnValue(
        chunkQueryBuilder as any,
      );
      documentRepository.find.mockResolvedValue([]);

      const result = await service.getStatistics();

      expect(result.total_documents).toBe(0);
      expect(result.total_chunks).toBe(0);
      expect(result.documents_by_category).toEqual({});
      expect(result.chunks_by_category).toEqual({});
      expect(result.recent_documents).toEqual([]);
    });
  });

  describe('deleteDocument', () => {
    it('should delete document and update category document count', async () => {
      const mockDoc = {
        id: 'doc-123',
        category: 'general',
      };

      documentRepository.findOne.mockResolvedValue(mockDoc as any);
      documentRepository.delete.mockResolvedValue({
        affected: 1,
        raw: [],
      } as any);
      documentRepository.count.mockResolvedValue(4); // 4 remaining documents
      (documentRepository as any).manager.query.mockResolvedValue(undefined);

      await service.deleteDocument('doc-123');

      expect(documentRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'doc-123' },
      });
      expect(documentRepository.delete).toHaveBeenCalledWith('doc-123');
      expect(documentRepository.count).toHaveBeenCalledWith({
        where: { category: 'general' },
      });
      expect((documentRepository as any).manager.query).toHaveBeenCalledWith(
        'UPDATE knowledge_categories SET document_count = $1, updated_at = NOW() WHERE name = $2',
        [4, 'general'],
      );
    });

    it('should throw NotFoundException when document does not exist', async () => {
      documentRepository.findOne.mockResolvedValue(null);

      await expect(service.deleteDocument('nonexistent')).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.deleteDocument('nonexistent')).rejects.toThrow(
        "Document with id 'nonexistent' not found",
      );

      expect(documentRepository.delete).not.toHaveBeenCalled();
    });

    it('should handle deletion when category has no remaining documents', async () => {
      const mockDoc = {
        id: 'doc-last',
        category: 'technical',
      };

      documentRepository.findOne.mockResolvedValue(mockDoc as any);
      documentRepository.delete.mockResolvedValue({
        affected: 1,
        raw: [],
      } as any);
      documentRepository.count.mockResolvedValue(0); // No remaining documents
      (documentRepository as any).manager.query.mockResolvedValue(undefined);

      await service.deleteDocument('doc-last');

      expect(documentRepository.delete).toHaveBeenCalledWith('doc-last');
      expect((documentRepository as any).manager.query).toHaveBeenCalledWith(
        'UPDATE knowledge_categories SET document_count = $1, updated_at = NOW() WHERE name = $2',
        [0, 'technical'],
      );
    });
  });

  describe('bulkDeleteDocuments', () => {
    it('should successfully delete multiple documents with transaction support', async () => {
      const documentIds = ['doc-1', 'doc-2', 'doc-3'];
      const mockDocs = [
        { id: 'doc-1', category: 'general' },
        { id: 'doc-2', category: 'general' },
        { id: 'doc-3', category: 'technical' },
      ];

      const mockTransactionManager = {
        findOne: jest
          .fn()
          .mockResolvedValueOnce(mockDocs[0])
          .mockResolvedValueOnce(mockDocs[1])
          .mockResolvedValueOnce(mockDocs[2]),
        delete: jest.fn().mockResolvedValue({ affected: 1 }),
        count: jest
          .fn()
          .mockResolvedValueOnce(3) // general category count
          .mockResolvedValueOnce(2), // technical category count
        query: jest.fn().mockResolvedValue(undefined),
      };

      (documentRepository as any).manager.transaction = jest.fn(
        async (callback) => {
          return await callback(mockTransactionManager);
        },
      );

      const result = await service.bulkDeleteDocuments(documentIds);

      expect(result.total).toBe(3);
      expect(result.successful).toBe(3);
      expect(result.failed).toBe(0);
      expect(result.errors).toHaveLength(0);
      expect(mockTransactionManager.delete).toHaveBeenCalledTimes(3);
      expect(mockTransactionManager.query).toHaveBeenCalledTimes(2); // Two categories updated
    });

    it('should handle partial failures and track errors', async () => {
      const documentIds = ['doc-1', 'doc-2', 'doc-nonexistent'];
      const mockDocs = [
        { id: 'doc-1', category: 'general' },
        { id: 'doc-2', category: 'general' },
      ];

      const mockTransactionManager = {
        findOne: jest
          .fn()
          .mockResolvedValueOnce(mockDocs[0])
          .mockResolvedValueOnce(mockDocs[1])
          .mockResolvedValueOnce(null), // Document not found
        delete: jest.fn().mockResolvedValue({ affected: 1 }),
        count: jest.fn().mockResolvedValue(1), // general category count
        query: jest.fn().mockResolvedValue(undefined),
      };

      (documentRepository as any).manager.transaction = jest.fn(
        async (callback) => {
          return await callback(mockTransactionManager);
        },
      );

      const result = await service.bulkDeleteDocuments(documentIds);

      expect(result.total).toBe(3);
      expect(result.successful).toBe(2);
      expect(result.failed).toBe(1);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].id).toBe('doc-nonexistent');
      expect(result.errors[0].error).toContain('not found');
    });

    it('should handle deletion errors and continue processing', async () => {
      const documentIds = ['doc-1', 'doc-2'];
      const mockDocs = [
        { id: 'doc-1', category: 'general' },
        { id: 'doc-2', category: 'general' },
      ];

      const mockTransactionManager = {
        findOne: jest
          .fn()
          .mockResolvedValueOnce(mockDocs[0])
          .mockResolvedValueOnce(mockDocs[1]),
        delete: jest
          .fn()
          .mockRejectedValueOnce(new Error('Database error'))
          .mockResolvedValueOnce({ affected: 1 }),
        count: jest.fn().mockResolvedValue(1),
        query: jest.fn().mockResolvedValue(undefined),
      };

      (documentRepository as any).manager.transaction = jest.fn(
        async (callback) => {
          return await callback(mockTransactionManager);
        },
      );

      const result = await service.bulkDeleteDocuments(documentIds);

      expect(result.total).toBe(2);
      expect(result.successful).toBe(1);
      expect(result.failed).toBe(1);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].error).toBe('Database error');
    });

    it('should update category counts for all affected categories', async () => {
      const documentIds = ['doc-1', 'doc-2', 'doc-3'];
      const mockDocs = [
        { id: 'doc-1', category: 'general' },
        { id: 'doc-2', category: 'technical' },
        { id: 'doc-3', category: 'support' },
      ];

      const mockTransactionManager = {
        findOne: jest
          .fn()
          .mockResolvedValueOnce(mockDocs[0])
          .mockResolvedValueOnce(mockDocs[1])
          .mockResolvedValueOnce(mockDocs[2]),
        delete: jest.fn().mockResolvedValue({ affected: 1 }),
        count: jest
          .fn()
          .mockResolvedValueOnce(5) // general
          .mockResolvedValueOnce(3) // technical
          .mockResolvedValueOnce(2), // support
        query: jest.fn().mockResolvedValue(undefined),
      };

      (documentRepository as any).manager.transaction = jest.fn(
        async (callback) => {
          return await callback(mockTransactionManager);
        },
      );

      await service.bulkDeleteDocuments(documentIds);

      expect(mockTransactionManager.query).toHaveBeenCalledTimes(3);
      expect(mockTransactionManager.query).toHaveBeenCalledWith(
        'UPDATE knowledge_categories SET document_count = $1, updated_at = NOW() WHERE name = $2',
        [5, 'general'],
      );
      expect(mockTransactionManager.query).toHaveBeenCalledWith(
        'UPDATE knowledge_categories SET document_count = $1, updated_at = NOW() WHERE name = $2',
        [3, 'technical'],
      );
      expect(mockTransactionManager.query).toHaveBeenCalledWith(
        'UPDATE knowledge_categories SET document_count = $1, updated_at = NOW() WHERE name = $2',
        [2, 'support'],
      );
    });
  });

  describe('bulkReassignCategory', () => {
    it('should successfully reassign category for multiple documents', async () => {
      const documentIds = ['doc-1', 'doc-2', 'doc-3'];
      const newCategory = 'technical';
      const mockDocs = [
        { id: 'doc-1', category: 'general' },
        { id: 'doc-2', category: 'general' },
        { id: 'doc-3', category: 'support' },
      ];

      const mockTransactionManager = {
        findOne: jest
          .fn()
          .mockResolvedValueOnce(mockDocs[0])
          .mockResolvedValueOnce(mockDocs[1])
          .mockResolvedValueOnce(mockDocs[2]),
        update: jest.fn().mockResolvedValue({ affected: 1 }),
        count: jest
          .fn()
          .mockResolvedValueOnce(3) // technical (new category)
          .mockResolvedValueOnce(0) // general (old category)
          .mockResolvedValueOnce(1), // support (old category)
        query: jest.fn().mockResolvedValue(undefined),
      };

      (documentRepository as any).manager.transaction = jest.fn(
        async (callback) => {
          return await callback(mockTransactionManager);
        },
      );

      const result = await service.bulkReassignCategory(
        documentIds,
        newCategory,
      );

      expect(result.total).toBe(3);
      expect(result.successful).toBe(3);
      expect(result.failed).toBe(0);
      expect(result.errors).toHaveLength(0);
      expect(mockTransactionManager.update).toHaveBeenCalledTimes(3);
      expect(mockTransactionManager.update).toHaveBeenCalledWith(
        KnowledgeDocument,
        { id: 'doc-1' },
        { category: newCategory },
      );
    });

    it('should handle documents not found during reassignment', async () => {
      const documentIds = ['doc-1', 'doc-nonexistent', 'doc-2'];
      const newCategory = 'technical';
      const mockDocs = [
        { id: 'doc-1', category: 'general' },
        { id: 'doc-2', category: 'general' },
      ];

      const mockTransactionManager = {
        findOne: jest
          .fn()
          .mockResolvedValueOnce(mockDocs[0])
          .mockResolvedValueOnce(null) // Document not found
          .mockResolvedValueOnce(mockDocs[1]),
        update: jest.fn().mockResolvedValue({ affected: 1 }),
        count: jest
          .fn()
          .mockResolvedValueOnce(2) // technical
          .mockResolvedValueOnce(0), // general
        query: jest.fn().mockResolvedValue(undefined),
      };

      (documentRepository as any).manager.transaction = jest.fn(
        async (callback) => {
          return await callback(mockTransactionManager);
        },
      );

      const result = await service.bulkReassignCategory(
        documentIds,
        newCategory,
      );

      expect(result.total).toBe(3);
      expect(result.successful).toBe(2);
      expect(result.failed).toBe(1);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].id).toBe('doc-nonexistent');
      expect(result.errors[0].error).toContain('not found');
    });

    it('should handle update errors and continue processing', async () => {
      const documentIds = ['doc-1', 'doc-2'];
      const newCategory = 'technical';
      const mockDocs = [
        { id: 'doc-1', category: 'general' },
        { id: 'doc-2', category: 'general' },
      ];

      const mockTransactionManager = {
        findOne: jest
          .fn()
          .mockResolvedValueOnce(mockDocs[0])
          .mockResolvedValueOnce(mockDocs[1]),
        update: jest
          .fn()
          .mockRejectedValueOnce(new Error('Update failed'))
          .mockResolvedValueOnce({ affected: 1 }),
        count: jest
          .fn()
          .mockResolvedValueOnce(1) // technical
          .mockResolvedValueOnce(1), // general
        query: jest.fn().mockResolvedValue(undefined),
      };

      (documentRepository as any).manager.transaction = jest.fn(
        async (callback) => {
          return await callback(mockTransactionManager);
        },
      );

      const result = await service.bulkReassignCategory(
        documentIds,
        newCategory,
      );

      expect(result.total).toBe(2);
      expect(result.successful).toBe(1);
      expect(result.failed).toBe(1);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].error).toBe('Update failed');
    });

    it('should update counts for both old and new categories', async () => {
      const documentIds = ['doc-1', 'doc-2'];
      const newCategory = 'technical';
      const mockDocs = [
        { id: 'doc-1', category: 'general' },
        { id: 'doc-2', category: 'support' },
      ];

      const mockTransactionManager = {
        findOne: jest
          .fn()
          .mockResolvedValueOnce(mockDocs[0])
          .mockResolvedValueOnce(mockDocs[1]),
        update: jest.fn().mockResolvedValue({ affected: 1 }),
        count: jest
          .fn()
          .mockResolvedValueOnce(2) // technical (new)
          .mockResolvedValueOnce(3) // general (old)
          .mockResolvedValueOnce(1), // support (old)
        query: jest.fn().mockResolvedValue(undefined),
      };

      (documentRepository as any).manager.transaction = jest.fn(
        async (callback) => {
          return await callback(mockTransactionManager);
        },
      );

      await service.bulkReassignCategory(documentIds, newCategory);

      expect(mockTransactionManager.query).toHaveBeenCalledTimes(3);
      expect(mockTransactionManager.count).toHaveBeenCalledTimes(3);
    });

    it('should handle reassigning documents from same category', async () => {
      const documentIds = ['doc-1', 'doc-2'];
      const newCategory = 'technical';
      const mockDocs = [
        { id: 'doc-1', category: 'general' },
        { id: 'doc-2', category: 'general' },
      ];

      const mockTransactionManager = {
        findOne: jest
          .fn()
          .mockResolvedValueOnce(mockDocs[0])
          .mockResolvedValueOnce(mockDocs[1]),
        update: jest.fn().mockResolvedValue({ affected: 1 }),
        count: jest
          .fn()
          .mockResolvedValueOnce(2) // technical (new)
          .mockResolvedValueOnce(0), // general (old, now empty)
        query: jest.fn().mockResolvedValue(undefined),
      };

      (documentRepository as any).manager.transaction = jest.fn(
        async (callback) => {
          return await callback(mockTransactionManager);
        },
      );

      const result = await service.bulkReassignCategory(
        documentIds,
        newCategory,
      );

      expect(result.successful).toBe(2);
      expect(mockTransactionManager.query).toHaveBeenCalledTimes(2); // Only 2 categories affected
    });
  });
});
