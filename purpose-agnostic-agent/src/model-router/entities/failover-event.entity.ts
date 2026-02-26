import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
} from 'typeorm';

@Entity('failover_events')
export class FailoverEvent {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  failed_provider!: string;

  @Column()
  successful_provider!: string;

  @Column()
  reason!: string;

  @Column({ nullable: true })
  request_id?: string;

  @CreateDateColumn()
  occurred_at!: Date;
}
