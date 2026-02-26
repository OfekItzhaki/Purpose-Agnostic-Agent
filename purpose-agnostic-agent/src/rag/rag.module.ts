import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bull';
import { RAGService } from './rag.service.js';
import { PDFParserService } from './pdf-parser.service.js';
import { OpenAIEmbeddingService } from './services/openai-embedding.service.js';
import { OllamaEmbeddingService } from './services/ollama-embedding.service.js';
import { EmbeddingRouterService } from './services/embedding-router.service.js';
import { PostgresKnowledgeChunkRepository } from './repositories/postgres-knowledge-chunk.repository.js';
import { KnowledgeDocument } from './entities/knowledge-document.entity.js';
import { KnowledgeChunk } from './entities/knowledge-chunk.entity.js';
import { IngestionEvent } from '../admin/entities/ingestion-event.entity.js';
import { DocumentIngestionProcessor } from './processors/document-ingestion.processor.js';
import { StructuredLogger } from '../common/logger.service.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      KnowledgeDocument,
      KnowledgeChunk,
      IngestionEvent,
    ]),
    BullModule.registerQueue({
      name: 'document-ingestion',
      defaultJobOptions: {
        attempts: 3, // Retry up to 3 times (Requirements 3.6, 11.5)
        backoff: {
          type: 'exponential',
          delay: 5000, // Start with 5 second delay, doubles each retry
        },
        removeOnComplete: false, // Keep completed jobs for status tracking
        removeOnFail: false, // Keep failed jobs for retry and monitoring
      },
    }),
  ],
  providers: [
    RAGService,
    PDFParserService,
    OpenAIEmbeddingService,
    OllamaEmbeddingService,
    EmbeddingRouterService,
    PostgresKnowledgeChunkRepository,
    DocumentIngestionProcessor,
    StructuredLogger,
  ],
  exports: [
    RAGService,
    PDFParserService,
    EmbeddingRouterService,
    PostgresKnowledgeChunkRepository,
  ],
})
export class RAGModule {}
