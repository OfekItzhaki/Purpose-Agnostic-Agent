import { ApiProperty } from '@nestjs/swagger';

export class AuditLogDto {
  @ApiProperty({
    description: 'Unique audit log identifier',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  id!: string;

  @ApiProperty({
    description: 'Admin user ID who performed the action',
    example: 'admin-123',
  })
  adminUserId!: string;

  @ApiProperty({
    description: 'Type of action performed',
    example: 'PERSONA_CREATE',
    enum: [
      'LOGIN_SUCCESS',
      'LOGIN_FAILED',
      'LOGOUT',
      'PERSONA_CREATE',
      'PERSONA_UPDATE',
      'PERSONA_DELETE',
      'KNOWLEDGE_UPLOAD',
      'KNOWLEDGE_UPDATE',
      'KNOWLEDGE_DELETE',
      'KNOWLEDGE_BULK_DELETE',
      'KNOWLEDGE_BULK_REASSIGN',
      'CATEGORY_CREATE',
      'CATEGORY_UPDATE',
      'CATEGORY_DELETE',
    ],
  })
  actionType!: string;

  @ApiProperty({
    description: 'Type of entity affected',
    example: 'PERSONA',
    enum: ['ADMIN_USER', 'PERSONA', 'KNOWLEDGE_DOCUMENT', 'KNOWLEDGE_CATEGORY'],
  })
  entityType!: string;

  @ApiProperty({
    description: 'ID of the affected entity',
    example: 'tech-support',
    required: false,
  })
  entityId?: string;

  @ApiProperty({
    description: 'Additional details about the action',
    example: { name: 'Tech Support', category: 'general' },
    required: false,
  })
  details?: Record<string, any>;

  @ApiProperty({
    description: 'IP address from which the action was performed',
    example: '192.168.1.1',
    required: false,
  })
  ipAddress?: string;

  @ApiProperty({
    description: 'Timestamp when the action was performed',
    example: '2024-01-15T10:30:00Z',
  })
  timestamp!: Date;
}

export class AuditLogsResponseDto {
  @ApiProperty({
    description: 'List of audit logs',
    type: [AuditLogDto],
  })
  logs!: AuditLogDto[];

  @ApiProperty({
    description: 'Total number of logs matching the filters',
    example: 42,
  })
  total!: number;
}
