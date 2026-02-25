import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bull';
import { RAGService } from './rag.service.js';
import { PDFParserService } from './pdf-parser.service.js';
import { OpenAIEmbeddingService } from './services/openai-embedding.service.js';
import { PostgresKnowledgeChunkRepository } from './repositories/postgres-knowledge-chunk.repository.js';
import { KnowledgeDocument } from './entities/knowledge-document.entity.js';
import { KnowledgeChunk } from './entities/knowledge-chunk.entity.js';
import { DocumentIngestionProcessor } from './processors/document-ingestion.processor.js';
import { StructuredLogger } from '../common/logger.service.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([KnowledgeDocument, KnowledgeChunk]),
    BullModule.registerQueue({
      name: 'document-ingestion',
    }),
  ],
  providers: [
    RAGService,
    PDFParserService,
    OpenAIEmbeddingService,
    PostgresKnowledgeChunkRepository,
    {
      provide: DocumentIngestionProcessor,
      useClass: DocumentIngestionProcessor,
    },
    StructuredLogger,
    {
      provide: 'EmbeddingService',
      useExisting: OpenAIEmbeddingService,
    },
    {
      provide: 'KnowledgeChunkRepository',
      useExisting: forwardRef(() => PostgresKnowledgeChunkRepository),
    },
  ],
  exports: [
    RAGService,
    PDFParserService,
    OpenAIEmbeddingService,
    PostgresKnowledgeChunkRepository,
    'EmbeddingService',
    'KnowledgeChunkRepository',
  ],
})
export class RAGModule {}
