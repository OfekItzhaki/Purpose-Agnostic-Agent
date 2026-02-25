import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
} from 'typeorm';

@Entity('knowledge_chunks')
export class KnowledgeChunk {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  document_id!: string;

  @Column()
  chunk_index!: number;

  @Column('text')
  content!: string;

  @Column('vector', { length: 1536 })
  embedding!: string;

  @Column()
  token_count!: number;

  @CreateDateColumn()
  created_at!: Date;
}
