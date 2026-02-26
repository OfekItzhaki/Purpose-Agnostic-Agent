import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum IngestionStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
}

@Entity('knowledge_documents')
export class KnowledgeDocument {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ unique: true })
  source_path!: string;

  @Column()
  category!: string;

  @Column({ nullable: true })
  file_hash?: string;

  @Column({ default: 0 })
  total_chunks!: number;

  @Column({
    type: 'enum',
    enum: IngestionStatus,
    default: IngestionStatus.PENDING,
  })
  status!: IngestionStatus;

  @Column({ type: 'text', nullable: true })
  error_message?: string;

  @Column({ default: 0 })
  retry_count!: number;

  @CreateDateColumn()
  ingested_at!: Date;

  @UpdateDateColumn()
  updated_at!: Date;

  @Column({ type: 'jsonb', nullable: true })
  metadata?: Record<string, any>;
}
