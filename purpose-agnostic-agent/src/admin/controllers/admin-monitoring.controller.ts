import {
  Controller,
  Get,
  Post,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { AdminAuthGuard } from '../guards/admin-auth.guard.js';
import { IngestionMonitorService } from '../services/ingestion-monitor.service.js';
import { AdminKnowledgeService } from '../services/admin-knowledge.service.js';
import {
  UnauthorizedErrorDto,
  NotFoundErrorDto,
} from '../dto/persona-response.dto.js';

@ApiTags('Admin - Monitoring')
@ApiBearerAuth()
@Controller('admin/monitoring')
@UseGuards(AdminAuthGuard)
export class AdminMonitoringController {
  constructor(
    private readonly ingestionMonitorService: IngestionMonitorService,
    private readonly adminKnowledgeService: AdminKnowledgeService,
  ) {}

  /**
   * GET /admin/monitoring/ingestion/status - Get queue status
   * Requirements: 11.1, 11.2
   */
  @Get('ingestion/status')
  @ApiOperation({
    summary: 'Get ingestion queue status',
    description:
      'Retrieves the current status of the document ingestion pipeline, including counts of waiting, active, completed, failed, delayed, and paused jobs. Requires admin authentication via Bearer token.',
  })
  @ApiResponse({
    status: 200,
    description: 'Queue status retrieved successfully',
    schema: {
      example: {
        waiting: 5,
        active: 2,
        completed: 150,
        failed: 3,
        delayed: 0,
        paused: 0,
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Missing or invalid authentication token',
    type: UnauthorizedErrorDto,
  })
  async getIngestionStatus() {
    return this.ingestionMonitorService.getQueueStatus();
  }

  /**
   * GET /admin/monitoring/ingestion/statistics - Get processing statistics
   * Requirements: 11.3, 11.6
   */
  @Get('ingestion/statistics')
  @ApiOperation({
    summary: 'Get ingestion processing statistics',
    description:
      'Retrieves processing time statistics for completed document ingestions, including average, minimum, and maximum processing times overall and broken down by document type (PDF, Text, Markdown). Requires admin authentication via Bearer token.',
  })
  @ApiResponse({
    status: 200,
    description: 'Processing statistics retrieved successfully',
    schema: {
      example: {
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
          Markdown: {
            count: 20,
            average_time_ms: 2000,
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Missing or invalid authentication token',
    type: UnauthorizedErrorDto,
  })
  async getIngestionStatistics() {
    return this.ingestionMonitorService.getEventBasedStatistics();
  }

  /**
   * GET /admin/monitoring/ingestion/failed - Get failed ingestions
   * Requirements: 11.4
   */
  @Get('ingestion/failed')
  @ApiOperation({
    summary: 'Get failed ingestions',
    description:
      'Retrieves a list of all failed document ingestions with error details, retry counts, and failure timestamps. Requires admin authentication via Bearer token.',
  })
  @ApiResponse({
    status: 200,
    description: 'Failed ingestions retrieved successfully',
    schema: {
      example: [
        {
          id: 'doc-123',
          source_path: '/knowledge/general/corrupted-file.pdf',
          category: 'general',
          error_message: 'Failed to parse PDF: Invalid PDF structure',
          retry_count: 2,
          failed_at: '2024-01-15T10:30:00Z',
        },
      ],
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Missing or invalid authentication token',
    type: UnauthorizedErrorDto,
  })
  async getFailedIngestions() {
    return this.ingestionMonitorService.getFailedIngestions();
  }

  /**
   * POST /admin/monitoring/ingestion/retry/:id - Retry failed ingestion
   * Requirements: 3.6, 11.5
   */
  @Post('ingestion/retry/:id')
  @ApiOperation({
    summary: 'Retry a failed ingestion',
    description:
      'Re-queues a failed document for ingestion processing. Validates that the document is in FAILED status and has not exceeded the maximum retry attempts (3). Requires admin authentication via Bearer token.',
  })
  @ApiParam({
    name: 'id',
    description: 'Document ID to retry',
    example: 'doc-123',
    type: String,
  })
  @ApiResponse({
    status: 200,
    description: 'Ingestion retry initiated successfully',
    schema: {
      example: {
        success: true,
        message: 'Document re-queued for ingestion',
        jobId: '12345',
      },
    },
  })
  @ApiResponse({
    status: 400,
    description:
      'Cannot retry - Document not in FAILED status or max retries reached',
    schema: {
      example: {
        success: false,
        message: 'Maximum retry attempts (3) reached for this document',
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Document not found',
    schema: {
      example: {
        success: false,
        message: 'Document with ID doc-123 not found',
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Missing or invalid authentication token',
    type: UnauthorizedErrorDto,
  })
  @HttpCode(HttpStatus.OK)
  async retryIngestion(@Param('id') id: string) {
    return this.ingestionMonitorService.retryIngestion(id);
  }

  /**
   * GET /admin/monitoring/statistics - Get knowledge base statistics
   * Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 9.6
   */
  @Get('statistics')
  @ApiOperation({
    summary: 'Get knowledge base statistics',
    description:
      'Retrieves comprehensive statistics about the knowledge base, including total documents and chunks, breakdowns by category, and recently ingested documents. Requires admin authentication via Bearer token.',
  })
  @ApiResponse({
    status: 200,
    description: 'Knowledge base statistics retrieved successfully',
    schema: {
      example: {
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
            ingested_at: '2024-01-15T14:30:00Z',
          },
        ],
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Missing or invalid authentication token',
    type: UnauthorizedErrorDto,
  })
  async getKnowledgeStatistics() {
    return this.adminKnowledgeService.getStatistics();
  }
}
