import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
} from 'typeorm';

@Entity('knowledge_documents')
export class KnowledgeDocument {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ unique: true })
  source_path!: string;

  @Column()
  category!: string;

  @Column()
  file_hash!: string;

  @Column()
  total_chunks!: number;

  @CreateDateColumn()
  ingested_at!: Date;

  @Column({ type: 'jsonb', nullable: true })
  metadata?: Record<string, any>;
}
