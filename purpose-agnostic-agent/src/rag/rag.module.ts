import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bull';
import { RAGService } from './rag.service.js';
import { PDFParserService } from './pdf-parser.service.js';
import { OpenAIEmbeddingService } from './services/openai-embedding.service.js';
import { PostgresKnowledgeChunkRepository } from './repositories/postgres-knowledge-chunk.repository.js';
import { KnowledgeDocument } from './entities/knowledge-document.entity.js';
import { KnowledgeChunk } from './entities/knowledge-chunk.entity.js';

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
      provide: 'EmbeddingService',
      useExisting: OpenAIEmbeddingService,
    },
    {
      provide: 'KnowledgeChunkRepository',
      useExisting: PostgresKnowledgeChunkRepository,
    },
  ],
  exports: [
    RAGService,
    PDFParserService,
    OpenAIEmbeddingService,
    'EmbeddingService',
    'KnowledgeChunkRepository',
  ],
})
export class RAGModule {}
