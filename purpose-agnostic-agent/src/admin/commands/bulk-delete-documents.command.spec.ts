import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BulkDeleteDocumentsCommand } from './bulk-delete-documents.command';
import { KnowledgeDocument } from '../../rag/entities/knowledge-document.entity';

describe('BulkDeleteDocumentsCommand', () => {
  let documentRepository: jest.Mocked<Repository<KnowledgeDocument>>;

  beforeEach(async () => {
    const mockRepository = {
      findOne: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
      manager: {
        transaction: jest.fn(),
        query: jest.fn(),
      },
    };

    documentRepository = mockRepository as any;
  });

  describe('validate', () => {
    it('should return invalid when no document IDs provided', async () => {
      const command = new BulkDeleteDocumentsCommand(documentRepository, []);
      const result = await command.validate();

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('No document IDs provided for deletion');
    });

    it('should return invalid when duplicate IDs are provided', async () => {
      const command = new BulkDeleteDocumentsCommand(documentRepository, [
        'doc1',
        'doc2',
        'doc1',
      ]);
      const result = await command.validate();

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(
        'Duplicate document IDs detected in the request',
      );
    });

    it('should return invalid when document does not exist', async () => {
      documentRepository.findOne.mockResolvedValue(null);

      const command = new BulkDeleteDocumentsCommand(documentRepository, [
        'nonexistent',
      ]);
      const result = await command.validate();

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(
        "Document with id 'nonexistent' not found",
      );
    });

    it('should return valid when all documents exist', async () => {
      documentRepository.findOne.mockResolvedValue({
        id: 'doc1',
        category: 'general',
      } as KnowledgeDocument);

      const command = new BulkDeleteDocumentsCommand(documentRepository, [
        'doc1',
        'doc2',
      ]);
      const result = await command.validate();

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('execute', () => {
    it('should delete documents and track successes', async () => {
      const mockDoc1 = { id: 'doc1', category: 'general' } as KnowledgeDocument;
      const mockDoc2 = {
        id: 'doc2',
        category: 'technical',
      } as KnowledgeDocument;

      const transactionCallback = jest.fn(async (callback) => {
        const mockEntityManager = {
          findOne: jest
            .fn()
            .mockResolvedValueOnce(mockDoc1)
            .mockResolvedValueOnce(mockDoc2),
          delete: jest.fn().mockResolvedValue({}),
          count: jest.fn().mockResolvedValue(5),
          query: jest.fn().mockResolvedValue({}),
        };
        return callback(mockEntityManager);
      });

      documentRepository.manager.transaction = transactionCallback as any;

      const command = new BulkDeleteDocumentsCommand(documentRepository, [
        'doc1',
        'doc2',
      ]);
      const result = await command.execute();

      expect(result.total).toBe(2);
      expect(result.successful).toBe(2);
      expect(result.failed).toBe(0);
      expect(result.successes).toEqual(['doc1', 'doc2']);
      expect(result.failures).toHaveLength(0);
    });

    it('should track failures when document not found during execution', async () => {
      const transactionCallback = jest.fn(async (callback) => {
        const mockEntityManager = {
          findOne: jest.fn().mockResolvedValue(null),
          delete: jest.fn(),
          count: jest.fn(),
          query: jest.fn(),
        };
        return callback(mockEntityManager);
      });

      documentRepository.manager.transaction = transactionCallback as any;

      const command = new BulkDeleteDocumentsCommand(documentRepository, [
        'nonexistent',
      ]);
      const result = await command.execute();

      expect(result.total).toBe(1);
      expect(result.successful).toBe(0);
      expect(result.failed).toBe(1);
      expect(result.failures).toHaveLength(1);
      expect(result.failures[0].item).toBe('nonexistent');
      expect(result.failures[0].error).toContain('not found');
    });

    it('should handle partial failures', async () => {
      const mockDoc1 = { id: 'doc1', category: 'general' } as KnowledgeDocument;

      const transactionCallback = jest.fn(async (callback) => {
        const mockEntityManager = {
          findOne: jest
            .fn()
            .mockResolvedValueOnce(mockDoc1)
            .mockResolvedValueOnce(null),
          delete: jest.fn().mockResolvedValue({}),
          count: jest.fn().mockResolvedValue(4),
          query: jest.fn().mockResolvedValue({}),
        };
        return callback(mockEntityManager);
      });

      documentRepository.manager.transaction = transactionCallback as any;

      const command = new BulkDeleteDocumentsCommand(documentRepository, [
        'doc1',
        'doc2',
      ]);
      const result = await command.execute();

      expect(result.total).toBe(2);
      expect(result.successful).toBe(1);
      expect(result.failed).toBe(1);
      expect(result.successes).toEqual(['doc1']);
      expect(result.failures).toHaveLength(1);
      expect(result.failures[0].item).toBe('doc2');
    });

    it('should update category document counts', async () => {
      const mockDoc1 = { id: 'doc1', category: 'general' } as KnowledgeDocument;
      const mockDoc2 = { id: 'doc2', category: 'general' } as KnowledgeDocument;

      const mockQuery = jest.fn().mockResolvedValue({});
      const mockCount = jest.fn().mockResolvedValue(3);

      const transactionCallback = jest.fn(async (callback) => {
        const mockEntityManager = {
          findOne: jest
            .fn()
            .mockResolvedValueOnce(mockDoc1)
            .mockResolvedValueOnce(mockDoc2),
          delete: jest.fn().mockResolvedValue({}),
          count: mockCount,
          query: mockQuery,
        };
        return callback(mockEntityManager);
      });

      documentRepository.manager.transaction = transactionCallback as any;

      const command = new BulkDeleteDocumentsCommand(documentRepository, [
        'doc1',
        'doc2',
      ]);
      await command.execute();

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE knowledge_categories'),
        [3, 'general'],
      );
    });

    it('should update multiple category counts when documents from different categories', async () => {
      const mockDoc1 = { id: 'doc1', category: 'general' } as KnowledgeDocument;
      const mockDoc2 = {
        id: 'doc2',
        category: 'technical',
      } as KnowledgeDocument;

      const mockQuery = jest.fn().mockResolvedValue({});
      const mockCount = jest
        .fn()
        .mockResolvedValueOnce(5)
        .mockResolvedValueOnce(3);

      const transactionCallback = jest.fn(async (callback) => {
        const mockEntityManager = {
          findOne: jest
            .fn()
            .mockResolvedValueOnce(mockDoc1)
            .mockResolvedValueOnce(mockDoc2),
          delete: jest.fn().mockResolvedValue({}),
          count: mockCount,
          query: mockQuery,
        };
        return callback(mockEntityManager);
      });

      documentRepository.manager.transaction = transactionCallback as any;

      const command = new BulkDeleteDocumentsCommand(documentRepository, [
        'doc1',
        'doc2',
      ]);
      await command.execute();

      expect(mockQuery).toHaveBeenCalledTimes(2);
    });
  });

  describe('rollback', () => {
    it('should return true as rollback is handled by transaction', async () => {
      const command = new BulkDeleteDocumentsCommand(documentRepository, [
        'doc1',
      ]);
      const result = await command.rollback();

      expect(result).toBe(true);
    });
  });
});
