import { Test, TestingModule } from '@nestjs/testing';
import { getQueueToken } from '@nestjs/bull';
import { RAGService } from './rag.service';
import { PostgresKnowledgeChunkRepository } from './repositories/postgres-knowledge-chunk.repository';
import { EmbeddingRouterService } from './services/embedding-router.service';
import type { Queue, Job } from 'bull';
import { FileUploadValidator } from '../common/validators/file-upload.validator';

// Mock the FileUploadValidator
jest.mock('../common/validators/file-upload.validator');

describe('RAGService', () => {
  let service: RAGService;
  let chunkRepository: jest.Mocked<PostgresKnowledgeChunkRepository>;
  let embeddingService: jest.Mocked<EmbeddingRouterService>;
  let ingestionQueue: jest.Mocked<Queue>;

  beforeEach(async () => {
    // Mock FileUploadValidator.validatePath to do nothing
    (FileUploadValidator.validatePath as jest.Mock) = jest.fn();

    const mockChunkRepository = {
      search: jest.fn(),
      save: jest.fn(),
      saveBatch: jest.fn(),
      findByDocumentId: jest.fn(),
    };

    const mockEmbeddingService = {
      generateEmbedding: jest.fn(),
      generateBatchEmbeddings: jest.fn(),
      getDimensions: jest.fn().mockReturnValue(768),
    };

    const mockQueue = {
      add: jest.fn(),
      getJob: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RAGService,
        {
          provide: PostgresKnowledgeChunkRepository,
          useValue: mockChunkRepository,
        },
        {
          provide: EmbeddingRouterService,
          useValue: mockEmbeddingService,
        },
        {
          provide: getQueueToken('document-ingestion'),
          useValue: mockQueue,
        },
      ],
    }).compile();

    service = module.get<RAGService>(RAGService);
    chunkRepository = module.get(PostgresKnowledgeChunkRepository);
    embeddingService = module.get(EmbeddingRouterService);
    ingestionQueue = module.get(getQueueToken('document-ingestion'));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('ingestDocument', () => {
    it('should queue document for ingestion and return job ID', async () => {
      const mockJob = { id: '12345' } as Job;
      ingestionQueue.add.mockResolvedValue(mockJob);

      const jobId = await service.ingestDocument(
        'knowledge/medical/doc.pdf',
        'medical',
      );

      expect(jobId).toBe('12345');
      expect(ingestionQueue.add).toHaveBeenCalledWith({
        filePath: 'knowledge/medical/doc.pdf',
        category: 'medical',
      });
    });

    it('should reject invalid file paths', async () => {
      // Mock validatePath to throw for invalid paths
      (FileUploadValidator.validatePath as jest.Mock).mockImplementation(
        (path: string) => {
          if (path.includes('..')) {
            throw new Error('Invalid file path: path traversal detected');
          }
        },
      );

      await expect(
        service.ingestDocument('../../../etc/passwd', 'medical'),
      ).rejects.toThrow();
    });

    it('should handle queue errors', async () => {
      ingestionQueue.add.mockRejectedValue(new Error('Queue full'));

      await expect(
        service.ingestDocument('knowledge/medical/doc.pdf', 'medical'),
      ).rejects.toThrow('Queue full');
    });
  });

  describe('search', () => {
    it('should generate embedding and search with known embeddings', async () => {
      const mockEmbedding = Array(768).fill(0.1);
      const mockResults = [
        {
          content: 'Test content',
          metadata: {
            sourcePath: 'knowledge/medical/doc.pdf',
            category: 'medical',
            chunkIndex: 0,
            timestamp: new Date(),
          },
          score: 0.95,
        },
      ];

      embeddingService.generateEmbedding.mockResolvedValue(mockEmbedding);
      chunkRepository.search.mockResolvedValue(mockResults);

      const results = await service.search('test query');

      expect(embeddingService.generateEmbedding).toHaveBeenCalledWith(
        'test query',
      );
      expect(chunkRepository.search).toHaveBeenCalledWith(mockEmbedding, {
        topK: 5,
        minScore: 0.7,
      });
      expect(results).toEqual(mockResults);
    });

    it('should apply category filter when specified', async () => {
      const mockEmbedding = Array(768).fill(0.1);
      embeddingService.generateEmbedding.mockResolvedValue(mockEmbedding);
      chunkRepository.search.mockResolvedValue([]);

      await service.search('test query', { category: 'medical' });

      expect(chunkRepository.search).toHaveBeenCalledWith(mockEmbedding, {
        category: 'medical',
        topK: 5,
        minScore: 0.7,
      });
    });

    it('should respect custom topK and minScore options', async () => {
      const mockEmbedding = Array(768).fill(0.1);
      embeddingService.generateEmbedding.mockResolvedValue(mockEmbedding);
      chunkRepository.search.mockResolvedValue([]);

      await service.search('test query', { topK: 10, minScore: 0.8 });

      expect(chunkRepository.search).toHaveBeenCalledWith(mockEmbedding, {
        topK: 10,
        minScore: 0.8,
      });
    });

    it('should return empty array when no results found', async () => {
      const mockEmbedding = Array(768).fill(0.1);
      embeddingService.generateEmbedding.mockResolvedValue(mockEmbedding);
      chunkRepository.search.mockResolvedValue([]);

      const results = await service.search('nonexistent query');

      expect(results).toEqual([]);
    });

    it('should handle embedding generation errors', async () => {
      embeddingService.generateEmbedding.mockRejectedValue(
        new Error('Embedding service unavailable'),
      );

      await expect(service.search('test query')).rejects.toThrow(
        'Embedding service unavailable',
      );
    });

    it('should handle repository search errors', async () => {
      const mockEmbedding = Array(768).fill(0.1);
      embeddingService.generateEmbedding.mockResolvedValue(mockEmbedding);
      chunkRepository.search.mockRejectedValue(
        new Error('Database connection failed'),
      );

      await expect(service.search('test query')).rejects.toThrow(
        'Database connection failed',
      );
    });
  });

  describe('getDocumentStatus', () => {
    it('should return job status when job exists', async () => {
      const mockJob = {
        getState: jest.fn().mockResolvedValue('completed'),
        progress: jest.fn().mockReturnValue(100),
        data: { filePath: 'knowledge/medical/doc.pdf', category: 'medical' },
      } as unknown as Job;

      ingestionQueue.getJob.mockResolvedValue(mockJob);

      const status = await service.getDocumentStatus('12345');

      expect(status).toEqual({
        status: 'completed',
        progress: 100,
        data: { filePath: 'knowledge/medical/doc.pdf', category: 'medical' },
      });
      expect(ingestionQueue.getJob).toHaveBeenCalledWith('12345');
    });

    it('should return not_found when job does not exist', async () => {
      ingestionQueue.getJob.mockResolvedValue(null);

      const status = await service.getDocumentStatus('nonexistent');

      expect(status).toEqual({ status: 'not_found' });
    });

    it('should handle various job states', async () => {
      const states = ['waiting', 'active', 'completed', 'failed'];

      for (const state of states) {
        const mockJob = {
          getState: jest.fn().mockResolvedValue(state),
          progress: jest.fn().mockReturnValue(50),
          data: {},
        } as unknown as Job;

        ingestionQueue.getJob.mockResolvedValue(mockJob);

        const status = await service.getDocumentStatus('12345');

        expect(status.status).toBe(state);
      }
    });
  });
});
