import { Process, Processor } from '@nestjs/bull';
import type { Job } from 'bull';
import { Injectable, Inject } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { createHash } from 'crypto';
import { PDFParserService } from '../pdf-parser.service.js';
import type { EmbeddingService } from '../interfaces/embedding.service.interface.js';
import type { KnowledgeChunkRepository } from '../interfaces/knowledge-chunk.repository.interface.js';
import { KnowledgeDocument } from '../entities/knowledge-document.entity.js';
import { StructuredLogger } from '../../common/logger.service.js';
import * as fs from 'fs/promises';

interface IngestDocumentJob {
  filePath: string;
  category: string;
}

@Processor('document-ingestion')
@Injectable()
export class DocumentIngestionProcessor {
  private readonly logger = new StructuredLogger();

  constructor(
    private readonly pdfParser: PDFParserService,
    @Inject('EmbeddingService')
    private readonly embeddingService: EmbeddingService,
    @Inject('KnowledgeChunkRepository')
    private readonly chunkRepository: KnowledgeChunkRepository,
    @InjectRepository(KnowledgeDocument)
    private readonly documentRepository: Repository<KnowledgeDocument>,
  ) {}

  @Process()
  async processIngestion(job: Job<IngestDocumentJob>): Promise<void> {
    const { filePath, category } = job.data;
    const startTime = Date.now();

    this.logger.log(
      `Starting document ingestion: ${filePath}`,
      'DocumentIngestionProcessor',
    );

    try {
      // Calculate file hash
      await job.progress(5);
      const fileBuffer = await fs.readFile(filePath);
      const fileHash = createHash('sha256').update(fileBuffer).digest('hex');

      // Check if already ingested
      const existing = await this.documentRepository.findOne({
        where: { source_path: filePath },
      });

      if (existing && existing.file_hash === fileHash) {
        this.logger.log(
          `Document already ingested: ${filePath}`,
          'DocumentIngestionProcessor',
        );
        return;
      }

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

      // Generate embeddings
      await job.progress(50);
      const embeddings = await this.embeddingService.generateBatchEmbeddings(
        chunks.map((c) => c.content),
      );

      // Create document record
      await job.progress(70);
      const document = this.documentRepository.create({
        source_path: filePath,
        category,
        file_hash: fileHash,
        total_chunks: chunks.length,
      });

      const savedDocument = await this.documentRepository.save(document);

      // Store chunks with embeddings
      await job.progress(80);
      const chunkData = chunks.map((chunk, index) => ({
        documentId: savedDocument.id,
        chunkIndex: chunk.chunkIndex,
        content: chunk.content,
        embedding: embeddings[index],
        tokenCount: chunk.tokenCount,
        category,
      }));

      await this.chunkRepository.saveBatch(chunkData);

      await job.progress(100);

      const duration = Date.now() - startTime;

      this.logger.logPerformance('pdf_ingestion', duration, {
        filePath,
        category,
        chunksCreated: chunks.length,
      });

      this.logger.log(
        `Document ingestion completed: ${filePath} (${duration}ms)`,
        'DocumentIngestionProcessor',
      );
    } catch (error) {
      this.logger.error(
        `Document ingestion failed: ${filePath}`,
        (error as Error).stack,
        'DocumentIngestionProcessor',
      );

      throw error;
    }
  }
}
