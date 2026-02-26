import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, FindOptionsWhere } from 'typeorm';
import { AuditLog } from '../entities/audit-log.entity.js';

export interface AuditLogFilters {
  actionType?: string;
  userId?: string;
  startDate?: Date;
  endDate?: Date;
}

@Injectable()
export class AuditLogRepository {
  constructor(
    @InjectRepository(AuditLog)
    private readonly repository: Repository<AuditLog>,
  ) {}

  async create(auditLog: Partial<AuditLog>): Promise<AuditLog> {
    const newAuditLog = this.repository.create(auditLog);
    return this.repository.save(newAuditLog);
  }

  async findById(id: string): Promise<AuditLog | null> {
    return this.repository.findOne({ where: { id } });
  }

  async query(filters: AuditLogFilters): Promise<AuditLog[]> {
    const where: FindOptionsWhere<AuditLog> = {};

    if (filters.actionType) {
      where.action_type = filters.actionType;
    }

    if (filters.userId) {
      where.admin_user_id = filters.userId;
    }

    if (filters.startDate && filters.endDate) {
      where.timestamp = Between(filters.startDate, filters.endDate);
    } else if (filters.startDate) {
      // If only startDate is provided, get logs from startDate onwards
      where.timestamp = Between(filters.startDate, new Date());
    } else if (filters.endDate) {
      // If only endDate is provided, get logs up to endDate
      where.timestamp = Between(new Date(0), filters.endDate);
    }

    return this.repository.find({
      where,
      order: { timestamp: 'DESC' },
      relations: ['admin_user'],
    });
  }

  async findAll(limit?: number): Promise<AuditLog[]> {
    return this.repository.find({
      order: { timestamp: 'DESC' },
      take: limit,
      relations: ['admin_user'],
    });
  }

  async deleteOlderThan(date: Date): Promise<number> {
    const result = await this.repository
      .createQueryBuilder()
      .delete()
      .where('timestamp < :date', { date })
      .execute();

    return result.affected ?? 0;
  }
}
