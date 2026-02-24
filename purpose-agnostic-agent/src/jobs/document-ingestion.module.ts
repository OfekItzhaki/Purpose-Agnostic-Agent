import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DocumentIngestionProcessor } from './processors/document-ingestion.processor';
import { RAGModule } from '../rag/rag.module';
import { KnowledgeDocument } from '../rag/entities/knowledge-document.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([KnowledgeDocument]),
    RAGModule,
  ],
  providers: [DocumentIngestionProcessor],
  exports: [DocumentIngestionProcessor],
})
export class DocumentIngestionModule {}
