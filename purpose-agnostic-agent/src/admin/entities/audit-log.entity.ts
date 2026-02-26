import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { AdminUser } from './admin-user.entity.js';

@Entity('audit_logs')
export class AuditLog {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  admin_user_id!: string;

  @ManyToOne(() => AdminUser, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'admin_user_id' })
  admin_user?: AdminUser;

  @Column()
  action_type!: string;

  @Column()
  entity_type!: string;

  @Column({ nullable: true })
  entity_id?: string;

  @Column({ type: 'jsonb', nullable: true })
  details?: Record<string, any>;

  @Column({ nullable: true })
  ip_address?: string;

  @CreateDateColumn()
  timestamp!: Date;
}
