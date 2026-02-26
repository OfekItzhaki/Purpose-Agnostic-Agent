import { SetMetadata } from '@nestjs/common';
import { ActionType, EntityType } from '../services/audit-log.service.js';

export const AUDIT_LOG_KEY = 'audit_log';

export interface AuditLogMetadata {
  actionType: ActionType | string;
  entityType: EntityType | string;
  entityIdParam?: string; // Name of the parameter that contains the entity ID
  includeBody?: boolean; // Whether to include request body in details
  includeResult?: boolean; // Whether to include method result in details
}

/**
 * Decorator to mark controller methods for automatic audit logging
 *
 * @param metadata Configuration for audit logging
 *
 * @example
 * @AuditLog({
 *   actionType: ActionType.PERSONA_CREATE,
 *   entityType: EntityType.PERSONA,
 *   includeBody: true,
 *   includeResult: true
 * })
 * async createPersona(@Body() dto: CreatePersonaDto) {
 *   // ...
 * }
 *
 * @example
 * @AuditLog({
 *   actionType: ActionType.PERSONA_DELETE,
 *   entityType: EntityType.PERSONA,
 *   entityIdParam: 'id'
 * })
 * async deletePersona(@Param('id') id: string) {
 *   // ...
 * }
 */
export const AuditLog = (metadata: AuditLogMetadata) =>
  SetMetadata(AUDIT_LOG_KEY, metadata);
