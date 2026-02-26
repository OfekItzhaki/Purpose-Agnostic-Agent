# Audit Log Usage Guide

This guide explains how to use the audit logging infrastructure in the admin panel.

## Overview

The audit logging system consists of:
- **AuditLog Entity**: Database entity for storing audit logs
- **AuditLogRepository**: Repository for querying audit logs
- **AuditLogService**: Service for creating and querying audit logs
- **@AuditLog Decorator**: Automatic logging for controller methods
- **AuditLogInterceptor**: Interceptor that processes the decorator

## Automatic Logging with @AuditLog Decorator

The easiest way to add audit logging is using the `@AuditLog` decorator on controller methods.

### Basic Usage

```typescript
import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { AdminAuthGuard } from '../guards/admin-auth.guard.js';
import { AuditLog } from '../decorators/audit-log.decorator.js';
import { ActionType, EntityType } from '../services/audit-log.service.js';

@Controller('admin/personas')
@UseGuards(AdminAuthGuard)
export class AdminPersonaController {
  
  @Post()
  @AuditLog({
    actionType: ActionType.PERSONA_CREATE,
    entityType: EntityType.PERSONA,
    includeBody: true,
    includeResult: true
  })
  async createPersona(@Body() dto: CreatePersonaDto) {
    // Your implementation
    return this.personaService.create(dto);
  }
}
```

### Decorator Options

- **actionType**: The type of action being performed (required)
- **entityType**: The type of entity being affected (required)
- **entityIdParam**: Name of the parameter containing the entity ID (optional)
- **includeBody**: Whether to include request body in audit log details (optional)
- **includeResult**: Whether to include method result in audit log details (optional)

### Example with Entity ID

```typescript
@Delete(':id')
@AuditLog({
  actionType: ActionType.PERSONA_DELETE,
  entityType: EntityType.PERSONA,
  entityIdParam: 'id'
})
async deletePersona(@Param('id') id: string) {
  return this.personaService.delete(id);
}
```

## Manual Logging with AuditLogService

For more control, you can inject and use `AuditLogService` directly.

### Logging Actions

```typescript
import { Injectable } from '@nestjs/common';
import { AuditLogService, ActionType, EntityType } from '../services/audit-log.service.js';

@Injectable()
export class MyService {
  constructor(private readonly auditLogService: AuditLogService) {}

  async performAction(adminUserId: string, ipAddress: string) {
    // Your business logic
    
    // Log the action
    await this.auditLogService.logAction(
      adminUserId,
      ActionType.PERSONA_UPDATE,
      EntityType.PERSONA,
      'persona-id-123',
      { changes: { name: 'New Name' } },
      ipAddress
    );
  }
}
```

### Logging Authentication Events

```typescript
// Log successful login
await this.auditLogService.logAuthEvent(
  adminUser.id,
  ActionType.LOGIN_SUCCESS,
  ipAddress,
  { username: adminUser.username }
);

// Log failed login
await this.auditLogService.logAuthEvent(
  null,
  ActionType.LOGIN_FAILED,
  ipAddress,
  { username, reason: 'Invalid password' }
);
```

### Querying Audit Logs

```typescript
// Get logs with filters
const logs = await this.auditLogService.queryLogs({
  actionType: ActionType.PERSONA_CREATE,
  userId: 'admin-user-id',
  startDate: new Date('2024-01-01'),
  endDate: new Date('2024-12-31')
});

// Get recent logs
const recentLogs = await this.auditLogService.getRecentLogs(50);
```

## Available Action Types

```typescript
enum ActionType {
  // Authentication
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
```

## Available Entity Types

```typescript
enum EntityType {
  ADMIN_USER = 'ADMIN_USER',
  PERSONA = 'PERSONA',
  KNOWLEDGE_DOCUMENT = 'KNOWLEDGE_DOCUMENT',
  KNOWLEDGE_CATEGORY = 'KNOWLEDGE_CATEGORY',
}
```

## Security Features

1. **Sensitive Data Redaction**: The interceptor automatically redacts sensitive fields like passwords, tokens, and API keys
2. **IP Address Tracking**: Automatically captures the client's IP address from request headers
3. **Error Logging**: Failed operations are also logged with error details
4. **Non-blocking**: Audit logging failures don't block the main operation

## Audit Log Retention

The system includes a cleanup method for managing log retention:

```typescript
// Clean up logs older than 90 days (default)
await this.auditLogService.cleanupOldLogs(90);
```

This can be scheduled as a cron job for automatic cleanup.
