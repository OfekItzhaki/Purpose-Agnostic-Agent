import { Injectable, Logger } from '@nestjs/common';
import {
  AuditLogRepository,
  AuditLogFilters,
} from '../repositories/audit-log.repository.js';
import { AuditLog } from '../entities/audit-log.entity.js';

export enum ActionType {
  // Authentication events
  LOGIN_SUCCESS = 'LOGIN_SUCCESS',
  LOGIN_FAILED = 'LOGIN_FAILED',
  LOGOUT = 'LOGOUT',

  // Persona operations
  PERSONA_CREATE = 'PERSONA_CREATE',
  PERSONA_UPDATE = 'PERSONA_UPDATE',
  PERSONA_DELETE = 'PERSONA_DELETE',

  // Knowledge operations
  KNOWLEDGE_UPLOAD = 'KNOWLEDGE_UPLOAD',
  KNOWLEDGE_UPDATE = 'KNOWLEDGE_UPDATE',
  KNOWLEDGE_DELETE = 'KNOWLEDGE_DELETE',
  KNOWLEDGE_BULK_DELETE = 'KNOWLEDGE_BULK_DELETE',
  KNOWLEDGE_BULK_REASSIGN = 'KNOWLEDGE_BULK_REASSIGN',

  // Category operations
  CATEGORY_CREATE = 'CATEGORY_CREATE',
  CATEGORY_UPDATE = 'CATEGORY_UPDATE',
  CATEGORY_DELETE = 'CATEGORY_DELETE',
}

export enum EntityType {
  ADMIN_USER = 'ADMIN_USER',
  PERSONA = 'PERSONA',
  KNOWLEDGE_DOCUMENT = 'KNOWLEDGE_DOCUMENT',
  KNOWLEDGE_CATEGORY = 'KNOWLEDGE_CATEGORY',
}

@Injectable()
export class AuditLogService {
  private readonly logger = new Logger(AuditLogService.name);

  constructor(private readonly auditLogRepository: AuditLogRepository) {}

  /**
   * Log an admin action
   */
  async logAction(
    adminUserId: string,
    actionType: ActionType | string,
    entityType: EntityType | string,
    entityId?: string,
    details?: Record<string, any>,
    ipAddress?: string,
  ): Promise<AuditLog> {
    try {
      const auditLog = await this.auditLogRepository.create({
        admin_user_id: adminUserId,
        action_type: actionType,
        entity_type: entityType,
        entity_id: entityId,
        details,
        ip_address: ipAddress,
      });

      this.logger.log(
        `Audit log created: ${actionType} on ${entityType}${entityId ? ` (${entityId})` : ''} by user ${adminUserId}`,
      );

      return auditLog;
    } catch (error) {
      this.logger.error(`Failed to create audit log: ${error}`);
      throw error;
    }
  }

  /**
   * Log an authentication event
   */
  async logAuthEvent(
    adminUserId: string | null,
    eventType:
      | ActionType.LOGIN_SUCCESS
      | ActionType.LOGIN_FAILED
      | ActionType.LOGOUT,
    ipAddress?: string,
    details?: Record<string, any>,
  ): Promise<AuditLog> {
    try {
      const auditLog = await this.auditLogRepository.create({
        admin_user_id: adminUserId || 'unknown',
        action_type: eventType,
        entity_type: EntityType.ADMIN_USER,
        entity_id: adminUserId || undefined,
        details,
        ip_address: ipAddress,
      });

      this.logger.log(
        `Auth event logged: ${eventType} for user ${adminUserId || 'unknown'} from ${ipAddress || 'unknown IP'}`,
      );

      return auditLog;
    } catch (error) {
      this.logger.error(`Failed to log auth event: ${error}`);
      throw error;
    }
  }

  /**
   * Query audit logs with filtering
   */
  async queryLogs(filters: AuditLogFilters): Promise<AuditLog[]> {
    try {
      return await this.auditLogRepository.query(filters);
    } catch (error) {
      this.logger.error(`Failed to query audit logs: ${error}`);
      throw error;
    }
  }

  /**
   * Get recent audit logs
   */
  async getRecentLogs(limit: number = 100): Promise<AuditLog[]> {
    try {
      return await this.auditLogRepository.findAll(limit);
    } catch (error) {
      this.logger.error(`Failed to get recent audit logs: ${error}`);
      throw error;
    }
  }

  /**
   * Clean up old audit logs (for retention policy)
   */
  async cleanupOldLogs(retentionDays: number = 90): Promise<number> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

      const deletedCount =
        await this.auditLogRepository.deleteOlderThan(cutoffDate);

      this.logger.log(
        `Cleaned up ${deletedCount} audit logs older than ${retentionDays} days`,
      );

      return deletedCount;
    } catch (error) {
      this.logger.error(`Failed to cleanup old audit logs: ${error}`);
      throw error;
    }
  }
}
