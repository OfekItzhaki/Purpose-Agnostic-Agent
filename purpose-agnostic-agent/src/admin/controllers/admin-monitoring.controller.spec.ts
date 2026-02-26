import { Test, TestingModule } from '@nestjs/testing';
import { AdminMonitoringController } from './admin-monitoring.controller.js';
import { IngestionMonitorService } from '../services/ingestion-monitor.service.js';
import { AdminKnowledgeService } from '../services/admin-knowledge.service.js';
import { AdminAuthGuard } from '../guards/admin-auth.guard.js';

describe('AdminMonitoringController', () => {
  let controller: AdminMonitoringController;
  let ingestionMonitorService: jest.Mocked<IngestionMonitorService>;
  let adminKnowledgeService: jest.Mocked<AdminKnowledgeService>;

  beforeEach(async () => {
    const mockIngestionMonitorService = {
      getQueueStatus: jest.fn(),
      getEventBasedStatistics: jest.fn(),
      getFailedIngestions: jest.fn(),
      retryIngestion: jest.fn(),
    };

    const mockAdminKnowledgeService = {
      getStatistics: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AdminMonitoringController],
      providers: [
        {
          provide: IngestionMonitorService,
          useValue: mockIngestionMonitorService,
        },
        {
          provide: AdminKnowledgeService,
          useValue: mockAdminKnowledgeService,
        },
      ],
    })
      .overrideGuard(AdminAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<AdminMonitoringController>(
      AdminMonitoringController,
    );
    ingestionMonitorService = module.get(IngestionMonitorService);
    adminKnowledgeService = module.get(AdminKnowledgeService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getIngestionStatus', () => {
    it('should return queue status', async () => {
      const mockStatus = {
        waiting: 5,
        active: 2,
        completed: 150,
        failed: 3,
        delayed: 0,
        paused: 0,
      };

      ingestionMonitorService.getQueueStatus.mockResolvedValue(mockStatus);

      const result = await controller.getIngestionStatus();

      expect(result).toEqual(mockStatus);
      expect(ingestionMonitorService.getQueueStatus).toHaveBeenCalledTimes(1);
    });
  });

  describe('getIngestionStatistics', () => {
    it('should return processing statistics', async () => {
      const mockStats = {
        total_processed: 150,
        average_processing_time_ms: 2500,
        min_processing_time_ms: 500,
        max_processing_time_ms: 8000,
        statistics_by_type: {
          PDF: {
            count: 80,
            average_time_ms: 3200,
          },
          Text: {
            count: 50,
            average_time_ms: 1500,
          },
        },
      };

      ingestionMonitorService.getEventBasedStatistics.mockResolvedValue(
        mockStats,
      );

      const result = await controller.getIngestionStatistics();

      expect(result).toEqual(mockStats);
      expect(
        ingestionMonitorService.getEventBasedStatistics,
      ).toHaveBeenCalledTimes(1);
    });
  });

  describe('getFailedIngestions', () => {
    it('should return list of failed ingestions', async () => {
      const mockFailedIngestions = [
        {
          id: 'doc-123',
          source_path: '/knowledge/general/corrupted-file.pdf',
          category: 'general',
          error_message: 'Failed to parse PDF: Invalid PDF structure',
          retry_count: 2,
          failed_at: new Date('2024-01-15T10:30:00Z'),
        },
      ];

      ingestionMonitorService.getFailedIngestions.mockResolvedValue(
        mockFailedIngestions,
      );

      const result = await controller.getFailedIngestions();

      expect(result).toEqual(mockFailedIngestions);
      expect(ingestionMonitorService.getFailedIngestions).toHaveBeenCalledTimes(
        1,
      );
    });
  });

  describe('retryIngestion', () => {
    it('should successfully retry a failed ingestion', async () => {
      const mockResult = {
        success: true,
        message: 'Document re-queued for ingestion',
        jobId: '12345',
      };

      ingestionMonitorService.retryIngestion.mockResolvedValue(mockResult);

      const result = await controller.retryIngestion('doc-123');

      expect(result).toEqual(mockResult);
      expect(ingestionMonitorService.retryIngestion).toHaveBeenCalledWith(
        'doc-123',
      );
    });

    it('should return error when document not found', async () => {
      const mockResult = {
        success: false,
        message: 'Document with ID doc-999 not found',
      };

      ingestionMonitorService.retryIngestion.mockResolvedValue(mockResult);

      const result = await controller.retryIngestion('doc-999');

      expect(result).toEqual(mockResult);
      expect(result.success).toBe(false);
    });

    it('should return error when max retries reached', async () => {
      const mockResult = {
        success: false,
        message: 'Maximum retry attempts (3) reached for this document',
      };

      ingestionMonitorService.retryIngestion.mockResolvedValue(mockResult);

      const result = await controller.retryIngestion('doc-123');

      expect(result).toEqual(mockResult);
      expect(result.success).toBe(false);
    });
  });

  describe('getKnowledgeStatistics', () => {
    it('should return knowledge base statistics', async () => {
      const mockStats = {
        total_documents: 150,
        total_chunks: 3500,
        documents_by_category: {
          general: 80,
          technical: 50,
          support: 20,
        },
        chunks_by_category: {
          general: 1800,
          technical: 1200,
          support: 500,
        },
        recent_documents: [
          {
            id: 'doc-150',
            source_path: '/knowledge/general/latest-guide.pdf',
            category: 'general',
            ingested_at: new Date('2024-01-15T14:30:00Z'),
          },
        ],
      };

      adminKnowledgeService.getStatistics.mockResolvedValue(mockStats);

      const result = await controller.getKnowledgeStatistics();

      expect(result).toEqual(mockStats);
      expect(adminKnowledgeService.getStatistics).toHaveBeenCalledTimes(1);
    });
  });
});
