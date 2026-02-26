import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BulkReassignCategoryCommand } from './bulk-reassign-category.command.js';
import { KnowledgeDocument } from '../../rag/entities/knowledge-document.entity.js';
import { KnowledgeCategory } from '../entities/knowledge-category.entity.js';

describe('BulkReassignCategoryCommand', () => {
  let documentRepository: Repository<KnowledgeDocument>;
  let categoryRepository: Repository<KnowledgeCategory>;

  const mockDocuments: KnowledgeDocument[] = [
    {
      id: 'doc-1',
      source_path: '/path/to/doc1.txt',
      category: 'general',
      total_chunks: 5,
      status: 'completed' as any,
      retry_count: 0,
      ingested_at: new Date(),
      updated_at: new Date(),
    } as KnowledgeDocument,
    {
      id: 'doc-2',
      source_path: '/path/to/doc2.txt',
      category: 'general',
      total_chunks: 3,
      status: 'completed' as any,
      retry_count: 0,
      ingested_at: new Date(),
      updated_at: new Date(),
    } as KnowledgeDocument,
    {
      id: 'doc-3',
      source_path: '/path/to/doc3.txt',
      category: 'technical',
      total_chunks: 8,
      status: 'completed' as any,
      retry_count: 0,
      ingested_at: new Date(),
      updated_at: new Date(),
    } as KnowledgeDocument,
  ];

  const mockCategories: KnowledgeCategory[] = [
    {
      id: 'cat-1',
      name: 'general',
      description: 'General knowledge',
      document_count: 2,
      created_at: new Date(),
      updated_at: new Date(),
    } as KnowledgeCategory,
    {
      id: 'cat-2',
      name: 'technical',
      description: 'Technical documentation',
      document_count: 1,
      created_at: new Date(),
      updated_at: new Date(),
    } as KnowledgeCategory,
    {
      id: 'cat-3',
      name: 'support',
      description: 'Support articles',
      document_count: 0,
      created_at: new Date(),
      updated_at: new Date(),
    } as KnowledgeCategory,
  ];

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        {
          provide: getRepositoryToken(KnowledgeDocument),
          useValue: {
            findOne: jest.fn(),
            manager: {
              transaction: jest.fn(),
            },
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

    documentRepository = module.get<Repository<KnowledgeDocument>>(
      getRepositoryToken(KnowledgeDocument),
    );
    categoryRepository = module.get<Repository<KnowledgeCategory>>(
      getRepositoryToken(KnowledgeCategory),
    );
  });

  describe('validate', () => {
    it('should pass validation when target category exists and all documents exist', async () => {
      const command = new BulkReassignCategoryCommand(
        documentRepository,
        categoryRepository,
        ['doc-1', 'doc-2'],
        'support',
      );

      jest
        .spyOn(categoryRepository, 'findOne')
        .mockResolvedValue(mockCategories[2]);
      jest
        .spyOn(documentRepository, 'findOne')
        .mockResolvedValueOnce(mockDocuments[0])
        .mockResolvedValueOnce(mockDocuments[1]);

      const result = await command.validate();

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should fail validation when no document IDs are provided', async () => {
      const command = new BulkReassignCategoryCommand(
        documentRepository,
        categoryRepository,
        [],
        'support',
      );

      const result = await command.validate();

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(
        'No document IDs provided for reassignment',
      );
    });

    it('should fail validation when target category is empty', async () => {
      const command = new BulkReassignCategoryCommand(
        documentRepository,
        categoryRepository,
        ['doc-1'],
        '',
      );

      const result = await command.validate();

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Target category is required');
    });

    it('should fail validation when target category does not exist', async () => {
      const command = new BulkReassignCategoryCommand(
        documentRepository,
        categoryRepository,
        ['doc-1'],
        'nonexistent',
      );

      jest.spyOn(categoryRepository, 'findOne').mockResolvedValue(null);

      const result = await command.validate();

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(
        "Target category 'nonexistent' does not exist",
      );
    });

    it('should fail validation when a document does not exist', async () => {
      const command = new BulkReassignCategoryCommand(
        documentRepository,
        categoryRepository,
        ['doc-1', 'nonexistent-doc'],
        'support',
      );

      jest
        .spyOn(categoryRepository, 'findOne')
        .mockResolvedValue(mockCategories[2]);
      jest
        .spyOn(documentRepository, 'findOne')
        .mockResolvedValueOnce(mockDocuments[0])
        .mockResolvedValueOnce(null);

      const result = await command.validate();

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(
        "Document with id 'nonexistent-doc' not found",
      );
    });

    it('should fail validation when duplicate document IDs are provided', async () => {
      const command = new BulkReassignCategoryCommand(
        documentRepository,
        categoryRepository,
        ['doc-1', 'doc-1'],
        'support',
      );

      const result = await command.validate();

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(
        'Duplicate document IDs detected in the request',
      );
    });
  });

  describe('execute', () => {
    it('should successfully reassign documents to target category', async () => {
      const command = new BulkReassignCategoryCommand(
        documentRepository,
        categoryRepository,
        ['doc-1', 'doc-2'],
        'support',
      );

      const mockTransaction = jest.fn(async (callback) => {
        const transactionalEntityManager = {
          findOne: jest
            .fn()
            .mockResolvedValueOnce(mockDocuments[0])
            .mockResolvedValueOnce(mockDocuments[1]),
          update: jest.fn().mockResolvedValue({ affected: 1 }),
          count: jest.fn().mockResolvedValue(2),
          query: jest.fn().mockResolvedValue(undefined),
        };
        return callback(transactionalEntityManager);
      });

      documentRepository.manager.transaction = mockTransaction;

      const result = await command.execute();

      expect(result.total).toBe(2);
      expect(result.successful).toBe(2);
      expect(result.failed).toBe(0);
      expect(result.successes).toEqual(['doc-1', 'doc-2']);
      expect(result.failures).toHaveLength(0);
    });

    it('should skip documents already in target category', async () => {
      const command = new BulkReassignCategoryCommand(
        documentRepository,
        categoryRepository,
        ['doc-1'],
        'general',
      );

      const mockTransaction = jest.fn(async (callback) => {
        const transactionalEntityManager = {
          findOne: jest.fn().mockResolvedValue(mockDocuments[0]),
          update: jest.fn(),
          count: jest.fn().mockResolvedValue(2),
          query: jest.fn().mockResolvedValue(undefined),
        };
        return callback(transactionalEntityManager);
      });

      documentRepository.manager.transaction = mockTransaction;

      const result = await command.execute();

      expect(result.total).toBe(1);
      expect(result.successful).toBe(1);
      expect(result.successes).toEqual(['doc-1']);
    });

    it('should track failures for documents that cannot be reassigned', async () => {
      const command = new BulkReassignCategoryCommand(
        documentRepository,
        categoryRepository,
        ['doc-1', 'doc-2'],
        'support',
      );

      const mockTransaction = jest.fn(async (callback) => {
        const transactionalEntityManager = {
          findOne: jest
            .fn()
            .mockResolvedValueOnce(mockDocuments[0])
            .mockResolvedValueOnce(null),
          update: jest.fn().mockResolvedValue({ affected: 1 }),
          count: jest.fn().mockResolvedValue(1),
          query: jest.fn().mockResolvedValue(undefined),
        };
        return callback(transactionalEntityManager);
      });

      documentRepository.manager.transaction = mockTransaction;

      const result = await command.execute();

      expect(result.total).toBe(2);
      expect(result.successful).toBe(1);
      expect(result.failed).toBe(1);
      expect(result.successes).toEqual(['doc-1']);
      expect(result.failures).toHaveLength(1);
      expect(result.failures[0].item).toBe('doc-2');
      expect(result.failures[0].error).toContain('not found');
    });

    it('should update document counts for affected categories', async () => {
      const command = new BulkReassignCategoryCommand(
        documentRepository,
        categoryRepository,
        ['doc-1', 'doc-3'],
        'support',
      );

      const mockQuery = jest.fn();
      const mockTransaction = jest.fn(async (callback) => {
        const transactionalEntityManager = {
          findOne: jest
            .fn()
            .mockResolvedValueOnce(mockDocuments[0])
            .mockResolvedValueOnce(mockDocuments[2]),
          update: jest.fn().mockResolvedValue({ affected: 1 }),
          count: jest
            .fn()
            .mockResolvedValueOnce(2) // support category count
            .mockResolvedValueOnce(1) // general category count
            .mockResolvedValueOnce(0), // technical category count
          query: mockQuery,
        };
        return callback(transactionalEntityManager);
      });

      documentRepository.manager.transaction = mockTransaction;

      const result = await command.execute();

      expect(result.successful).toBe(2);
      // Should update counts for support, general, and technical categories
      expect(mockQuery).toHaveBeenCalledTimes(3);
    });

    it('should handle errors during reassignment gracefully', async () => {
      const command = new BulkReassignCategoryCommand(
        documentRepository,
        categoryRepository,
        ['doc-1', 'doc-2'],
        'support',
      );

      const mockTransaction = jest.fn(async (callback) => {
        const transactionalEntityManager = {
          findOne: jest
            .fn()
            .mockResolvedValueOnce(mockDocuments[0])
            .mockResolvedValueOnce(mockDocuments[1]),
          update: jest
            .fn()
            .mockResolvedValueOnce({ affected: 1 })
            .mockRejectedValueOnce(new Error('Database error')),
          count: jest.fn().mockResolvedValue(1),
          query: jest.fn().mockResolvedValue(undefined),
        };
        return callback(transactionalEntityManager);
      });

      documentRepository.manager.transaction = mockTransaction;

      const result = await command.execute();

      expect(result.total).toBe(2);
      expect(result.successful).toBe(1);
      expect(result.failed).toBe(1);
      expect(result.failures[0].error).toBe('Database error');
    });
  });

  describe('rollback', () => {
    it('should return true indicating transaction-based rollback', async () => {
      const command = new BulkReassignCategoryCommand(
        documentRepository,
        categoryRepository,
        ['doc-1'],
        'support',
      );

      const result = await command.rollback();

      expect(result).toBe(true);
    });
  });
});
