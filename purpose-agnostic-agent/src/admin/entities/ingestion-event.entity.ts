import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { KnowledgeDocument } from '../../rag/entities/knowledge-document.entity.js';

export enum IngestionEventType {
  START = 'start',
  COMPLETE = 'complete',
  FAIL = 'fail',
}

@Entity('ingestion_events')
export class IngestionEvent {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid', name: 'document_id' })
  documentId!: string;

  @Column({
    type: 'varchar',
    length: 50,
    name: 'event_type',
  })
  eventType!: IngestionEventType;

  @CreateDateColumn({ name: 'timestamp' })
  timestamp!: Date;

  @Column({ type: 'integer', nullable: true, name: 'processing_time_ms' })
  processingTimeMs?: number;

  @Column({
    type: 'varchar',
    length: 100,
    nullable: true,
    name: 'embedding_provider',
  })
  embeddingProvider?: string;

  @Column({ type: 'text', nullable: true, name: 'error_message' })
  errorMessage?: string;

  @ManyToOne(() => KnowledgeDocument, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'document_id' })
  document?: KnowledgeDocument;
}
