import { Process, Processor } from '@nestjs/bull';
import type { Job } from 'bull';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { createHash } from 'crypto';
import { PDFParserService } from '../pdf-parser.service.js';
import { EmbeddingRouterService } from '../services/embedding-router.service.js';
import { PostgresKnowledgeChunkRepository } from '../repositories/postgres-knowledge-chunk.repository.js';
import {
  KnowledgeDocument,
  IngestionStatus,
} from '../entities/knowledge-document.entity.js';
import {
  IngestionEvent,
  IngestionEventType,
} from '../../admin/entities/ingestion-event.entity.js';
import { StructuredLogger } from '../../common/logger.service.js';
import * as fs from 'fs/promises';

interface IngestDocumentJob {
  filePath: string;
  category: string;
  documentId?: string;
}

@Processor('document-ingestion')
@Injectable()
export class DocumentIngestionProcessor {
  private readonly logger = new StructuredLogger();

  constructor(
    private readonly pdfParser: PDFParserService,
    private readonly embeddingService: EmbeddingRouterService,
    private readonly chunkRepository: PostgresKnowledgeChunkRepository,
    @InjectRepository(KnowledgeDocument)
    private readonly documentRepository: Repository<KnowledgeDocument>,
    @InjectRepository(IngestionEvent)
    private readonly ingestionEventRepository: Repository<IngestionEvent>,
  ) {}

  @Process()
  async processIngestion(job: Job<IngestDocumentJob>): Promise<void> {
    const { filePath, category, documentId } = job.data;
    const startTime = Date.now();

    this.logger.log(
      `Starting document ingestion: ${filePath}`,
      'DocumentIngestionProcessor',
    );

    let document: KnowledgeDocument | null = null;

    try {
      // Calculate file hash
      await job.progress(5);
      const fileBuffer = await fs.readFile(filePath);
      const fileHash = createHash('sha256').update(fileBuffer).digest('hex');

      // Find or create document record
      if (documentId) {
        document = await this.documentRepository.findOne({
          where: { id: documentId },
        });
      } else {
        document = await this.documentRepository.findOne({
          where: { source_path: filePath },
        });
      }

      // Check if already ingested with same hash
      if (
        document &&
        document.file_hash === fileHash &&
        document.status === IngestionStatus.COMPLETED
      ) {
        this.logger.log(
          `Document already ingested: ${filePath}`,
          'DocumentIngestionProcessor',
        );
        return;
      }

      // Create or update document record with PROCESSING status
      if (!document) {
        document = this.documentRepository.create({
          source_path: filePath,
          category,
          file_hash: fileHash,
          status: IngestionStatus.PROCESSING,
          total_chunks: 0,
          retry_count: 0,
        });
        document = await this.documentRepository.save(document);
      } else {
        // Update existing document to PROCESSING status
        document.status = IngestionStatus.PROCESSING;
        document.file_hash = fileHash;
        document.error_message = undefined;
        document.retry_count =
          (document.retry_count || 0) + (job.attemptsMade > 0 ? 1 : 0);
        await this.documentRepository.save(document);
      }

      // Log START event
      await this.logIngestionEvent(document.id, IngestionEventType.START);

      // Extract text from PDF
      await job.progress(10);
      const text = await this.pdfParser.extractText(filePath);

      // Split into chunks
      await job.progress(30);
      const chunks = await this.pdfParser.chunkText(text, {
        maxTokens: 512,
        overlap: 50,
      });

      this.logger.log(
        `Created ${chunks.length} chunks from ${filePath}`,
        'DocumentIngestionProcessor',
      );

      // Get embedding provider before generating embeddings
      const embeddingProvider =
        this.embeddingService.getActiveProvider() || 'unknown';

      // Generate embeddings
      await job.progress(50);
      const embeddings = await this.embeddingService.generateBatchEmbeddings(
        chunks.map((c) => c.content),
      );

      // Update document with chunk count
      await job.progress(70);
      document.total_chunks = chunks.length;
      await this.documentRepository.save(document);

      // Store chunks with embeddings
      await job.progress(80);
      const chunkData = chunks.map((chunk, index) => ({
        documentId: document!.id,
        chunkIndex: chunk.chunkIndex,
        content: chunk.content,
        embedding: embeddings[index],
        tokenCount: chunk.tokenCount,
        category,
      }));

      await this.chunkRepository.saveBatch(chunkData);

      // Mark as COMPLETED
      await job.progress(90);
      document.status = IngestionStatus.COMPLETED;
      document.error_message = undefined;
      await this.documentRepository.save(document);

      await job.progress(100);

      const duration = Date.now() - startTime;

      // Log COMPLETE event with processing time and embedding provider
      await this.logIngestionEvent(
        document.id,
        IngestionEventType.COMPLETE,
        duration,
        embeddingProvider,
      );

      this.logger.logPerformance('pdf_ingestion', duration, {
        filePath,
        category,
        chunksCreated: chunks.length,
        retryCount: document.retry_count,
      });

      this.logger.log(
        `Document ingestion completed: ${filePath} (${duration}ms)`,
        'DocumentIngestionProcessor',
      );
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';

      this.logger.error(
        `Document ingestion failed: ${filePath} (attempt ${job.attemptsMade + 1})`,
        (error as Error).stack,
        'DocumentIngestionProcessor',
      );

      // Update document status to FAILED
      if (document) {
        document.status = IngestionStatus.FAILED;
        document.error_message = errorMessage;
        await this.documentRepository.save(document);

        // Log FAIL event with error message
        await this.logIngestionEvent(
          document.id,
          IngestionEventType.FAIL,
          undefined,
          undefined,
          errorMessage,
        );
      }

      // Re-throw to trigger Bull's retry mechanism
      throw error;
    }
  }

  /**
   * Log an ingestion event for audit trail and performance tracking
   * Requirements: 7.5 (audit trail), 11.3 (performance tracking), 11.6 (embedding provider tracking)
   */
  private async logIngestionEvent(
    documentId: string,
    eventType: IngestionEventType,
    processingTimeMs?: number,
    embeddingProvider?: string,
    errorMessage?: string,
  ): Promise<void> {
    try {
      const event = this.ingestionEventRepository.create({
        documentId,
        eventType,
        processingTimeMs,
        embeddingProvider,
        errorMessage,
      });
      await this.ingestionEventRepository.save(event);
    } catch (error) {
      // Don't fail the ingestion if event logging fails
      this.logger.error(
        `Failed to log ingestion event: ${error instanceof Error ? error.message : 'Unknown error'}`,
        (error as Error)?.stack,
        'DocumentIngestionProcessor',
      );
    }
  }
}
