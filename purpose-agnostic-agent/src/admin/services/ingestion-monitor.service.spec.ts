import { Test, TestingModule } from '@nestjs/testing';
import { getQueueToken } from '@nestjs/bull';
import { getRepositoryToken } from '@nestjs/typeorm';
import { IngestionMonitorService } from './ingestion-monitor.service.js';
import {
  KnowledgeDocument,
  IngestionStatus,
} from '../../rag/entities/knowledge-document.entity.js';
import {
  IngestionEvent,
  IngestionEventType,
} from '../entities/ingestion-event.entity.js';

describe('IngestionMonitorService', () => {
  let service: IngestionMonitorService;
  let mockQueue: any;
  let mockDocumentRepository: any;
  let mockEventRepository: any;

  beforeEach(async () => {
    mockQueue = {
      getJobCounts: jest.fn(),
      add: jest.fn(),
    };

    mockDocumentRepository = {
      find: jest.fn(),
      findOne: jest.fn(),
      save: jest.fn(),
    };

    mockEventRepository = {
      find: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        IngestionMonitorService,
        {
          provide: getQueueToken('document-ingestion'),
          useValue: mockQueue,
        },
        {
          provide: getRepositoryToken(KnowledgeDocument),
          useValue: mockDocumentRepository,
        },
        {
          provide: getRepositoryToken(IngestionEvent),
          useValue: mockEventRepository,
        },
      ],
    }).compile();

    service = module.get<IngestionMonitorService>(IngestionMonitorService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getQueueStatus', () => {
    it('should return queue status with all job counts', async () => {
      // Arrange
      const mockCounts = {
        waiting: 5,
        active: 2,
        completed: 100,
        failed: 3,
        delayed: 1,
        paused: 0,
      };
      mockQueue.getJobCounts.mockResolvedValue(mockCounts);

      // Act
      const result = await service.getQueueStatus();

      // Assert
      expect(result).toEqual({
        waiting: 5,
        active: 2,
        completed: 100,
        failed: 3,
        delayed: 1,
        paused: 0,
      });
      expect(mockQueue.getJobCounts).toHaveBeenCalledTimes(1);
    });

    it('should handle missing counts with defaults', async () => {
      // Arrange
      mockQueue.getJobCounts.mockResolvedValue({});

      // Act
      const result = await service.getQueueStatus();

      // Assert
      expect(result).toEqual({
        waiting: 0,
        active: 0,
        completed: 0,
        failed: 0,
        delayed: 0,
        paused: 0,
      });
    });
  });

  describe('getProcessingStatistics', () => {
    it('should return statistics for completed documents', async () => {
      // Arrange
      const now = new Date();
      const oneMinuteAgo = new Date(now.getTime() - 60000);
      const twoMinutesAgo = new Date(now.getTime() - 120000);
      const threeMinutesAgo = new Date(now.getTime() - 180000);

      const mockDocs = [
        {
          id: '1',
          source_path: 'doc1.pdf',
          status: IngestionStatus.COMPLETED,
          ingested_at: twoMinutesAgo,
          updated_at: oneMinuteAgo,
        },
        {
          id: '2',
          source_path: 'doc2.txt',
          status: IngestionStatus.COMPLETED,
          ingested_at: threeMinutesAgo,
          updated_at: twoMinutesAgo,
        },
        {
          id: '3',
          source_path: 'doc3.pdf',
          status: IngestionStatus.COMPLETED,
          ingested_at: threeMinutesAgo,
          updated_at: now,
        },
      ];

      mockDocumentRepository.find.mockResolvedValue(mockDocs);

      // Act
      const result = await service.getProcessingStatistics();

      // Assert
      expect(result.total_processed).toBe(3);
      expect(result.average_processing_time_ms).toBeGreaterThan(0);
      expect(result.min_processing_time_ms).toBeGreaterThan(0);
      expect(result.max_processing_time_ms).toBeGreaterThan(0);
      expect(result.statistics_by_type).toHaveProperty('PDF');
      expect(result.statistics_by_type).toHaveProperty('Text');
      expect(result.statistics_by_type.PDF.count).toBe(2);
      expect(result.statistics_by_type.Text.count).toBe(1);
    });

    it('should return zero statistics when no completed documents', async () => {
      // Arrange
      mockDocumentRepository.find.mockResolvedValue([]);

      // Act
      const result = await service.getProcessingStatistics();

      // Assert
      expect(result).toEqual({
        total_processed: 0,
        average_processing_time_ms: 0,
        min_processing_time_ms: 0,
        max_processing_time_ms: 0,
        statistics_by_type: {},
      });
    });

    it('should categorize file types correctly', async () => {
      // Arrange
      const now = new Date();
      const oneMinuteAgo = new Date(now.getTime() - 60000);

      const mockDocs = [
        {
          id: '1',
          source_path: 'document.pdf',
          status: IngestionStatus.COMPLETED,
          ingested_at: oneMinuteAgo,
          updated_at: now,
        },
        {
          id: '2',
          source_path: 'notes.txt',
          status: IngestionStatus.COMPLETED,
          ingested_at: oneMinuteAgo,
          updated_at: now,
        },
        {
          id: '3',
          source_path: 'readme.md',
          status: IngestionStatus.COMPLETED,
          ingested_at: oneMinuteAgo,
          updated_at: now,
        },
      ];

      mockDocumentRepository.find.mockResolvedValue(mockDocs);

      // Act
      const result = await service.getProcessingStatistics();

      // Assert
      expect(result.statistics_by_type).toHaveProperty('PDF');
      expect(result.statistics_by_type).toHaveProperty('Text');
      expect(result.statistics_by_type).toHaveProperty('Markdown');
      expect(result.statistics_by_type.PDF.count).toBe(1);
      expect(result.statistics_by_type.Text.count).toBe(1);
      expect(result.statistics_by_type.Markdown.count).toBe(1);
    });
  });

  describe('getFailedIngestions', () => {
    it('should return list of failed ingestions with error details', async () => {
      // Arrange
      const mockFailedDocs = [
        {
          id: '1',
          source_path: 'failed1.pdf',
          category: 'general',
          status: IngestionStatus.FAILED,
          error_message: 'Failed to parse PDF',
          retry_count: 2,
          updated_at: new Date('2024-01-15'),
        },
        {
          id: '2',
          source_path: 'failed2.txt',
          category: 'technical',
          status: IngestionStatus.FAILED,
          error_message: 'Embedding service unavailable',
          retry_count: 1,
          updated_at: new Date('2024-01-14'),
        },
      ];

      mockDocumentRepository.find.mockResolvedValue(mockFailedDocs);

      // Act
      const result = await service.getFailedIngestions();

      // Assert
      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        id: '1',
        source_path: 'failed1.pdf',
        category: 'general',
        error_message: 'Failed to parse PDF',
        retry_count: 2,
        failed_at: new Date('2024-01-15'),
      });
      expect(result[1]).toEqual({
        id: '2',
        source_path: 'failed2.txt',
        category: 'technical',
        error_message: 'Embedding service unavailable',
        retry_count: 1,
        failed_at: new Date('2024-01-14'),
      });
      expect(mockDocumentRepository.find).toHaveBeenCalledWith({
        where: { status: IngestionStatus.FAILED },
        order: { updated_at: 'DESC' },
      });
    });

    it('should return empty array when no failed ingestions', async () => {
      // Arrange
      mockDocumentRepository.find.mockResolvedValue([]);

      // Act
      const result = await service.getFailedIngestions();

      // Assert
      expect(result).toEqual([]);
    });

    it('should handle failed documents without error messages', async () => {
      // Arrange
      const mockFailedDocs = [
        {
          id: '1',
          source_path: 'failed.pdf',
          category: 'general',
          status: IngestionStatus.FAILED,
          error_message: undefined,
          retry_count: 0,
          updated_at: new Date('2024-01-15'),
        },
      ];

      mockDocumentRepository.find.mockResolvedValue(mockFailedDocs);

      // Act
      const result = await service.getFailedIngestions();

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0].error_message).toBeUndefined();
    });
  });

  describe('getDocumentEvents', () => {
    it('should return events for a specific document', async () => {
      // Arrange
      const documentId = 'doc-123';
      const mockEvents = [
        {
          id: 'event-1',
          documentId,
          eventType: IngestionEventType.START,
          timestamp: new Date('2024-01-15T10:00:00'),
          processingTimeMs: null,
          embeddingProvider: null,
          errorMessage: null,
        },
        {
          id: 'event-2',
          documentId,
          eventType: IngestionEventType.COMPLETE,
          timestamp: new Date('2024-01-15T10:05:00'),
          processingTimeMs: 300000,
          embeddingProvider: 'ollama',
          errorMessage: null,
        },
      ];

      mockEventRepository.find.mockResolvedValue(mockEvents);

      // Act
      const result = await service.getDocumentEvents(documentId);

      // Assert
      expect(result).toHaveLength(2);
      expect(result[0].eventType).toBe(IngestionEventType.START);
      expect(result[1].eventType).toBe(IngestionEventType.COMPLETE);
      expect(result[1].processingTimeMs).toBe(300000);
      expect(result[1].embeddingProvider).toBe('ollama');
      expect(mockEventRepository.find).toHaveBeenCalledWith({
        where: { documentId },
        order: { timestamp: 'ASC' },
      });
    });

    it('should return empty array when no events for document', async () => {
      // Arrange
      mockEventRepository.find.mockResolvedValue([]);

      // Act
      const result = await service.getDocumentEvents('non-existent');

      // Assert
      expect(result).toEqual([]);
    });
  });

  describe('getRecentEvents', () => {
    it('should return recent events with default limit', async () => {
      // Arrange
      const mockEvents = [
        {
          id: 'event-1',
          documentId: 'doc-1',
          eventType: IngestionEventType.COMPLETE,
          timestamp: new Date('2024-01-15T10:05:00'),
          processingTimeMs: 300000,
          embeddingProvider: 'ollama',
          errorMessage: null,
          document: { id: 'doc-1', source_path: 'doc1.pdf' },
        },
        {
          id: 'event-2',
          documentId: 'doc-2',
          eventType: IngestionEventType.FAIL,
          timestamp: new Date('2024-01-15T10:03:00'),
          processingTimeMs: null,
          embeddingProvider: null,
          errorMessage: 'Failed to parse',
          document: { id: 'doc-2', source_path: 'doc2.pdf' },
        },
      ];

      mockEventRepository.find.mockResolvedValue(mockEvents);

      // Act
      const result = await service.getRecentEvents();

      // Assert
      expect(result).toHaveLength(2);
      expect(mockEventRepository.find).toHaveBeenCalledWith({
        order: { timestamp: 'DESC' },
        take: 50,
        relations: ['document'],
      });
    });

    it('should respect custom limit', async () => {
      // Arrange
      mockEventRepository.find.mockResolvedValue([]);

      // Act
      await service.getRecentEvents(10);

      // Assert
      expect(mockEventRepository.find).toHaveBeenCalledWith({
        order: { timestamp: 'DESC' },
        take: 10,
        relations: ['document'],
      });
    });
  });

  describe('getEventBasedStatistics', () => {
    it('should return statistics from ingestion events', async () => {
      // Arrange
      const mockEvents = [
        {
          id: 'event-1',
          documentId: 'doc-1',
          eventType: IngestionEventType.COMPLETE,
          timestamp: new Date('2024-01-15T10:05:00'),
          processingTimeMs: 60000,
          embeddingProvider: 'ollama',
          errorMessage: null,
          document: { id: 'doc-1', source_path: 'doc1.pdf' },
        },
        {
          id: 'event-2',
          documentId: 'doc-2',
          eventType: IngestionEventType.COMPLETE,
          timestamp: new Date('2024-01-15T10:10:00'),
          processingTimeMs: 120000,
          embeddingProvider: 'openai',
          errorMessage: null,
          document: { id: 'doc-2', source_path: 'doc2.txt' },
        },
        {
          id: 'event-3',
          documentId: 'doc-3',
          eventType: IngestionEventType.COMPLETE,
          timestamp: new Date('2024-01-15T10:15:00'),
          processingTimeMs: 90000,
          embeddingProvider: 'ollama',
          errorMessage: null,
          document: { id: 'doc-3', source_path: 'doc3.pdf' },
        },
      ];

      mockEventRepository.find.mockResolvedValue(mockEvents);

      // Act
      const result = await service.getEventBasedStatistics();

      // Assert
      expect(result.total_processed).toBe(3);
      expect(result.average_processing_time_ms).toBe(90000);
      expect(result.min_processing_time_ms).toBe(60000);
      expect(result.max_processing_time_ms).toBe(120000);
      expect(result.statistics_by_type).toHaveProperty('PDF');
      expect(result.statistics_by_type).toHaveProperty('Text');
      expect(result.statistics_by_type.PDF.count).toBe(2);
      expect(result.statistics_by_type.Text.count).toBe(1);
    });

    it('should return zero statistics when no events', async () => {
      // Arrange
      mockEventRepository.find.mockResolvedValue([]);

      // Act
      const result = await service.getEventBasedStatistics();

      // Assert
      expect(result).toEqual({
        total_processed: 0,
        average_processing_time_ms: 0,
        min_processing_time_ms: 0,
        max_processing_time_ms: 0,
        statistics_by_type: {},
      });
    });

    it('should handle events without processing time', async () => {
      // Arrange
      const mockEvents = [
        {
          id: 'event-1',
          documentId: 'doc-1',
          eventType: IngestionEventType.COMPLETE,
          timestamp: new Date('2024-01-15T10:05:00'),
          processingTimeMs: null,
          embeddingProvider: 'ollama',
          errorMessage: null,
          document: { id: 'doc-1', source_path: 'doc1.pdf' },
        },
      ];

      mockEventRepository.find.mockResolvedValue(mockEvents);

      // Act
      const result = await service.getEventBasedStatistics();

      // Assert
      expect(result.total_processed).toBe(1);
      expect(result.average_processing_time_ms).toBe(0);
    });
  });

  describe('retryIngestion', () => {
    it('should successfully retry a failed ingestion', async () => {
      // Arrange
      const documentId = 'doc-123';
      const mockDocument = {
        id: documentId,
        source_path: 'failed-doc.pdf',
        category: 'general',
        status: IngestionStatus.FAILED,
        error_message: 'Previous error',
        retry_count: 1,
      };

      const mockJob = {
        id: 'job-456',
      };

      mockDocumentRepository.findOne.mockResolvedValue(mockDocument);
      mockDocumentRepository.save.mockResolvedValue(mockDocument);
      mockQueue.add.mockResolvedValue(mockJob);

      // Act
      const result = await service.retryIngestion(documentId);

      // Assert
      expect(result.success).toBe(true);
      expect(result.message).toBe('Document re-queued for ingestion');
      expect(result.jobId).toBe('job-456');
      expect(mockDocumentRepository.findOne).toHaveBeenCalledWith({
        where: { id: documentId },
      });
      expect(mockDocumentRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          status: IngestionStatus.PENDING,
          error_message: undefined,
        }),
      );
      expect(mockQueue.add).toHaveBeenCalledWith({
        filePath: 'failed-doc.pdf',
        category: 'general',
        documentId: documentId,
      });
    });

    it('should return error when document not found', async () => {
      // Arrange
      mockDocumentRepository.findOne.mockResolvedValue(null);

      // Act
      const result = await service.retryIngestion('non-existent');

      // Assert
      expect(result.success).toBe(false);
      expect(result.message).toContain('not found');
      expect(mockQueue.add).not.toHaveBeenCalled();
    });

    it('should return error when document is not in FAILED status', async () => {
      // Arrange
      const mockDocument = {
        id: 'doc-123',
        source_path: 'doc.pdf',
        category: 'general',
        status: IngestionStatus.COMPLETED,
        retry_count: 0,
      };

      mockDocumentRepository.findOne.mockResolvedValue(mockDocument);

      // Act
      const result = await service.retryIngestion('doc-123');

      // Assert
      expect(result.success).toBe(false);
      expect(result.message).toContain('not in FAILED status');
      expect(result.message).toContain('completed');
      expect(mockQueue.add).not.toHaveBeenCalled();
    });

    it('should return error when max retry attempts reached', async () => {
      // Arrange
      const mockDocument = {
        id: 'doc-123',
        source_path: 'doc.pdf',
        category: 'general',
        status: IngestionStatus.FAILED,
        retry_count: 3,
      };

      mockDocumentRepository.findOne.mockResolvedValue(mockDocument);

      // Act
      const result = await service.retryIngestion('doc-123');

      // Assert
      expect(result.success).toBe(false);
      expect(result.message).toContain('Maximum retry attempts');
      expect(result.message).toContain('3');
      expect(mockQueue.add).not.toHaveBeenCalled();
    });

    it('should revert status to FAILED if re-queuing fails', async () => {
      // Arrange
      const mockDocument = {
        id: 'doc-123',
        source_path: 'doc.pdf',
        category: 'general',
        status: IngestionStatus.FAILED,
        error_message: 'Previous error',
        retry_count: 1,
      };

      mockDocumentRepository.findOne.mockResolvedValue(mockDocument);
      mockDocumentRepository.save.mockResolvedValue(mockDocument);
      mockQueue.add.mockRejectedValue(new Error('Queue is full'));

      // Act
      const result = await service.retryIngestion('doc-123');

      // Assert
      expect(result.success).toBe(false);
      expect(result.message).toContain('Failed to re-queue document');
      expect(result.message).toContain('Queue is full');
      expect(mockDocumentRepository.save).toHaveBeenCalledTimes(2);
      expect(mockDocumentRepository.save).toHaveBeenLastCalledWith(
        expect.objectContaining({
          status: IngestionStatus.FAILED,
        }),
      );
    });

    it('should allow retry when retry_count is less than 3', async () => {
      // Arrange
      const mockDocument = {
        id: 'doc-123',
        source_path: 'doc.pdf',
        category: 'general',
        status: IngestionStatus.FAILED,
        retry_count: 2,
      };

      const mockJob = {
        id: 'job-456',
      };

      mockDocumentRepository.findOne.mockResolvedValue(mockDocument);
      mockDocumentRepository.save.mockResolvedValue(mockDocument);
      mockQueue.add.mockResolvedValue(mockJob);

      // Act
      const result = await service.retryIngestion('doc-123');

      // Assert
      expect(result.success).toBe(true);
      expect(mockQueue.add).toHaveBeenCalled();
    });
  });
});
