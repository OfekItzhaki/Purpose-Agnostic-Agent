import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  UseInterceptors,
  UploadedFile,
  UploadedFiles,
} from '@nestjs/common';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
  ApiParam,
  ApiConsumes,
  ApiBody,
} from '@nestjs/swagger';
import { AdminAuthGuard } from '../guards/admin-auth.guard.js';
import { AuditLog } from '../decorators/audit-log.decorator.js';
import { ActionType, EntityType } from '../services/audit-log.service.js';
import { AdminKnowledgeService } from '../services/admin-knowledge.service.js';
import { AdminDocumentUploadService } from '../services/admin-document-upload.service.js';
import { UploadDocumentDto } from '../dto/upload-document.dto.js';
import { BulkDeleteDto } from '../dto/bulk-delete.dto.js';
import { BulkReassignDto } from '../dto/bulk-reassign.dto.js';
import { BulkOperationResultDto } from '../dto/bulk-operation-result.dto.js';
import { BulkUploadResultDto } from '../dto/bulk-upload-result.dto.js';
import {
  DocumentListItemDto,
  DocumentDetailDto,
  KnowledgeStatisticsDto,
} from '../dto/knowledge-response.dto.js';
import {
  UnauthorizedErrorDto,
  NotFoundErrorDto,
} from '../dto/persona-response.dto.js';

@ApiTags('Admin - Knowledge')
@ApiBearerAuth()
@Controller('admin/knowledge')
@UseGuards(AdminAuthGuard)
export class AdminKnowledgeController {
  constructor(
    private readonly adminKnowledgeService: AdminKnowledgeService,
    private readonly adminDocumentUploadService: AdminDocumentUploadService,
  ) {}

  /**
   * GET /admin/knowledge/documents - List all documents with optional filtering
   * Requirements: 4.1, 4.5, 10.2
   */
  @Get('documents')
  @ApiOperation({
    summary: 'List all knowledge documents',
    description:
      'Retrieves a list of all knowledge documents with optional category filtering. Documents are ordered by ingestion date (newest first). Requires admin authentication via Bearer token.',
  })
  @ApiQuery({
    name: 'category',
    required: false,
    type: String,
    description: 'Filter documents by knowledge category',
    example: 'general',
  })
  @ApiQuery({
    name: 'search',
    required: false,
    type: String,
    description: 'Search documents by source path or category',
    example: 'troubleshooting',
  })
  @ApiResponse({
    status: 200,
    description: 'Documents retrieved successfully',
    type: [DocumentListItemDto],
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Missing or invalid authentication token',
    type: UnauthorizedErrorDto,
  })
  async listDocuments(
    @Query('category') category?: string,
    @Query('search') search?: string,
  ): Promise<DocumentListItemDto[]> {
    if (search) {
      return this.adminKnowledgeService.searchDocuments(search);
    }
    return this.adminKnowledgeService.listDocuments(category);
  }

  /**
   * GET /admin/knowledge/documents/:id - Get document details
   * Requirements: 4.2, 10.2
   */
  @Get('documents/:id')
  @ApiOperation({
    summary: 'Get document details by ID',
    description:
      'Retrieves complete details for a specific knowledge document including metadata, chunk count, and ingestion status. Requires admin authentication via Bearer token.',
  })
  @ApiParam({
    name: 'id',
    description: 'Unique document identifier',
    example: 'doc-123',
    type: String,
  })
  @ApiResponse({
    status: 200,
    description: 'Document retrieved successfully',
    type: DocumentDetailDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Document not found',
    type: NotFoundErrorDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Missing or invalid authentication token',
    type: UnauthorizedErrorDto,
  })
  async getDocument(@Param('id') id: string): Promise<DocumentDetailDto> {
    return this.adminKnowledgeService.getDocumentById(id);
  }

  /**
   * GET /admin/knowledge/statistics - Get knowledge base statistics
   * Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 10.2
   */
  @Get('statistics')
  @ApiOperation({
    summary: 'Get knowledge base statistics',
    description:
      'Retrieves comprehensive statistics about the knowledge base including total documents, chunks, category breakdowns, and recently ingested documents. Requires admin authentication via Bearer token.',
  })
  @ApiResponse({
    status: 200,
    description: 'Statistics retrieved successfully',
    type: KnowledgeStatisticsDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Missing or invalid authentication token',
    type: UnauthorizedErrorDto,
  })
  async getStatistics(): Promise<KnowledgeStatisticsDto> {
    return this.adminKnowledgeService.getStatistics();
  }

  /**
   * POST /admin/knowledge/documents/upload - Upload single document
   * Requirements: 3.1, 3.2, 3.3, 3.7, 3.8, 6.1, 10.2
   */
  @Post('documents/upload')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: {
        fileSize: 10 * 1024 * 1024, // 10MB limit per requirement 3.7
      },
    }),
  )
  @AuditLog({
    actionType: ActionType.KNOWLEDGE_UPLOAD,
    entityType: EntityType.KNOWLEDGE_DOCUMENT,
    includeBody: true,
    includeResult: true,
  })
  @ApiOperation({
    summary: 'Upload a single knowledge document',
    description:
      'Uploads a single document to the knowledge base. Validates file type (PDF, TXT, MD) and size (max 10MB). Requires category assignment. Triggers the ingestion pipeline to process the document. Requires admin authentication via Bearer token. This action is logged in the audit log.',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['file', 'category'],
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: 'Document file (PDF, TXT, or MD format, max 10MB)',
        },
        category: {
          type: 'string',
          description: 'Knowledge category for the document',
          example: 'general',
        },
        metadata: {
          type: 'object',
          description: 'Optional metadata for the document',
          additionalProperties: true,
        },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Document uploaded and queued for ingestion',
    schema: {
      example: {
        success: true,
        jobId: '12345',
        filePath: 'uploads/documents/1234567890_troubleshooting.txt',
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid file or missing category',
    schema: {
      example: {
        statusCode: 400,
        message: 'Category is required',
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Missing or invalid authentication token',
    type: UnauthorizedErrorDto,
  })
  @HttpCode(HttpStatus.CREATED)
  async uploadDocument(
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: UploadDocumentDto,
  ) {
    // Convert Express.Multer.File to UploadedFile format expected by service
    const uploadedFile = {
      originalname: file.originalname,
      mimetype: file.mimetype,
      size: file.size,
    };

    return this.adminDocumentUploadService.uploadDocument(
      uploadedFile,
      dto.category,
      file.buffer,
    );
  }

  /**
   * POST /admin/knowledge/documents/bulk-upload - Upload multiple documents
   * Requirements: 6.1, 6.2, 6.3, 3.7, 3.8, 10.2
   */
  @Post('documents/bulk-upload')
  @UseInterceptors(
    FilesInterceptor('files', 20, {
      // Allow up to 20 files per bulk upload
      limits: {
        fileSize: 10 * 1024 * 1024, // 10MB limit per file per requirement 3.7
      },
    }),
  )
  @AuditLog({
    actionType: ActionType.KNOWLEDGE_UPLOAD,
    entityType: EntityType.KNOWLEDGE_DOCUMENT,
    includeBody: true,
    includeResult: true,
  })
  @ApiOperation({
    summary: 'Upload multiple knowledge documents',
    description:
      'Uploads multiple documents to the knowledge base in parallel. Validates each file type (PDF, TXT, MD) and size (max 10MB). Requires category assignment. Triggers the ingestion pipeline for each document. Returns per-file results with success/failure status. Requires admin authentication via Bearer token. This action is logged in the audit log.',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['files', 'category'],
      properties: {
        files: {
          type: 'array',
          items: {
            type: 'string',
            format: 'binary',
          },
          description:
            'Array of document files (PDF, TXT, or MD format, max 10MB each)',
        },
        category: {
          type: 'string',
          description: 'Knowledge category for all documents',
          example: 'general',
        },
        metadata: {
          type: 'object',
          description: 'Optional metadata for the documents',
          additionalProperties: true,
        },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Documents uploaded with per-file results',
    type: BulkUploadResultDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid files or missing category',
    schema: {
      example: {
        statusCode: 400,
        message: 'Category is required for bulk upload',
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Missing or invalid authentication token',
    type: UnauthorizedErrorDto,
  })
  @HttpCode(HttpStatus.CREATED)
  async bulkUploadDocuments(
    @UploadedFiles() files: Express.Multer.File[],
    @Body() dto: UploadDocumentDto,
  ): Promise<BulkUploadResultDto> {
    // Convert Express.Multer.File[] to format expected by service
    const uploadedFiles = files.map((file) => ({
      file: {
        originalname: file.originalname,
        mimetype: file.mimetype,
        size: file.size,
      },
      buffer: file.buffer,
    }));

    return this.adminDocumentUploadService.bulkUploadDocuments(
      uploadedFiles,
      dto.category,
    );
  }

  /**
   * DELETE /admin/knowledge/documents/:id - Delete document
   * Requirements: 4.4, 6.4, 10.2
   */
  @Delete('documents/:id')
  @AuditLog({
    actionType: ActionType.KNOWLEDGE_DELETE,
    entityType: EntityType.KNOWLEDGE_DOCUMENT,
    entityIdParam: 'id',
  })
  @ApiOperation({
    summary: 'Delete a knowledge document',
    description:
      'Deletes a knowledge document and all associated chunks from the database. Uses CASCADE delete to automatically remove related chunks. Updates category document counts. Requires admin authentication via Bearer token. This action is logged in the audit log.',
  })
  @ApiParam({
    name: 'id',
    description: 'Unique document identifier',
    example: 'doc-123',
    type: String,
  })
  @ApiResponse({
    status: 200,
    description: 'Document deleted successfully',
    schema: {
      example: {
        message: "Document 'doc-123' deleted successfully",
        id: 'doc-123',
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Document not found',
    type: NotFoundErrorDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Missing or invalid authentication token',
    type: UnauthorizedErrorDto,
  })
  async deleteDocument(@Param('id') id: string) {
    await this.adminKnowledgeService.deleteDocument(id);
    return {
      message: `Document '${id}' deleted successfully`,
      id,
    };
  }

  /**
   * POST /admin/knowledge/documents/bulk-delete - Bulk delete documents
   * Requirements: 6.4, 6.5, 10.2
   *
   * Example curl command:
   * ```bash
   * curl -X POST http://localhost:3000/admin/knowledge/documents/bulk-delete \
   *   -H "Authorization: Bearer YOUR_JWT_TOKEN" \
   *   -H "Content-Type: application/json" \
   *   -d '{
   *     "documentIds": ["doc-123", "doc-456", "doc-789"]
   *   }'
   * ```
   */
  @Post('documents/bulk-delete')
  @AuditLog({
    actionType: ActionType.KNOWLEDGE_BULK_DELETE,
    entityType: EntityType.KNOWLEDGE_DOCUMENT,
    includeBody: true,
    includeResult: true,
  })
  @ApiOperation({
    summary: 'Delete multiple knowledge documents',
    description:
      'Deletes multiple knowledge documents and their associated chunks in a single transaction. Returns success/failure status for each document. Updates category document counts for all affected categories. Requires admin authentication via Bearer token. This action is logged in the audit log.',
  })
  @ApiBody({
    type: BulkDeleteDto,
    examples: {
      'delete-three': {
        summary: 'Delete three documents',
        value: {
          documentIds: ['doc-123', 'doc-456', 'doc-789'],
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Bulk delete completed with results',
    type: BulkOperationResultDto,
    schema: {
      example: {
        successCount: 2,
        failureCount: 1,
        results: [
          {
            id: 'doc-123',
            success: true,
          },
          {
            id: 'doc-456',
            success: true,
          },
          {
            id: 'doc-789',
            success: false,
            error: 'Document not found',
          },
        ],
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid request - Empty document IDs array',
    schema: {
      example: {
        statusCode: 400,
        message: 'Document IDs array cannot be empty',
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Missing or invalid authentication token',
    type: UnauthorizedErrorDto,
  })
  async bulkDeleteDocuments(
    @Body() dto: BulkDeleteDto,
  ): Promise<BulkOperationResultDto> {
    return this.adminKnowledgeService.bulkDeleteDocuments(dto.documentIds);
  }

  /**
   * PUT /admin/knowledge/documents/bulk-reassign - Bulk reassign category
   * Requirements: 6.6, 10.2
   *
   * Example curl command:
   * ```bash
   * curl -X PUT http://localhost:3000/admin/knowledge/documents/bulk-reassign \
   *   -H "Authorization: Bearer YOUR_JWT_TOKEN" \
   *   -H "Content-Type: application/json" \
   *   -d '{
   *     "documentIds": ["doc-123", "doc-456"],
   *     "newCategory": "technical"
   *   }'
   * ```
   */
  @Put('documents/bulk-reassign')
  @AuditLog({
    actionType: ActionType.KNOWLEDGE_BULK_REASSIGN,
    entityType: EntityType.KNOWLEDGE_DOCUMENT,
    includeBody: true,
    includeResult: true,
  })
  @ApiOperation({
    summary: 'Reassign category for multiple documents',
    description:
      'Reassigns the knowledge category for multiple documents in a single transaction. Returns success/failure status for each document. Updates category document counts for all affected categories (old and new). Requires admin authentication via Bearer token. This action is logged in the audit log.',
  })
  @ApiBody({
    type: BulkReassignDto,
    examples: {
      'reassign-to-technical': {
        summary: 'Reassign documents to technical category',
        value: {
          documentIds: ['doc-123', 'doc-456'],
          newCategory: 'technical',
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Bulk reassignment completed with results',
    type: BulkOperationResultDto,
    schema: {
      example: {
        successCount: 2,
        failureCount: 0,
        results: [
          {
            id: 'doc-123',
            success: true,
          },
          {
            id: 'doc-456',
            success: true,
          },
        ],
      },
    },
  })
  @ApiResponse({
    status: 400,
    description:
      'Invalid request - Empty document IDs array or missing category',
    schema: {
      example: {
        statusCode: 400,
        message: 'Document IDs array cannot be empty',
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Missing or invalid authentication token',
    type: UnauthorizedErrorDto,
  })
  async bulkReassignCategory(
    @Body() dto: BulkReassignDto,
  ): Promise<BulkOperationResultDto> {
    return this.adminKnowledgeService.bulkReassignCategory(
      dto.documentIds,
      dto.newCategory,
    );
  }
}
