import { Entity, Column, PrimaryColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('personas')
export class PersonaEntity {
  @PrimaryColumn()
  id!: string;

  @Column()
  name!: string;

  @Column()
  description!: string;

  @Column({ type: 'text', nullable: true })
  extra_instructions?: string;

  @Column()
  knowledge_category!: string;

  @Column({ type: 'decimal', nullable: true })
  temperature?: number;

  @Column({ nullable: true })
  max_tokens?: number;

  @CreateDateColumn()
  created_at!: Date;

  @UpdateDateColumn()
  updated_at!: Date;
}
