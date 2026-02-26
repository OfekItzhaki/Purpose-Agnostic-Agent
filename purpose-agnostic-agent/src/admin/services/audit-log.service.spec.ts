import { Test, TestingModule } from '@nestjs/testing';
import {
  AuditLogService,
  ActionType,
  EntityType,
} from './audit-log.service.js';
import {
  AuditLogRepository,
  AuditLogFilters,
} from '../repositories/audit-log.repository.js';
import { AuditLog } from '../entities/audit-log.entity.js';

describe('AuditLogService', () => {
  let service: AuditLogService;
  let repository: jest.Mocked<AuditLogRepository>;

  const mockAuditLog: AuditLog = {
    id: 'test-audit-id',
    admin_user_id: 'admin-123',
    action_type: ActionType.PERSONA_CREATE,
    entity_type: EntityType.PERSONA,
    entity_id: 'persona-456',
    details: { name: 'Test Persona' },
    ip_address: '192.168.1.1',
    timestamp: new Date('2024-01-15T10:30:00Z'),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuditLogService,
        {
          provide: AuditLogRepository,
          useValue: {
            create: jest.fn(),
            query: jest.fn(),
            findAll: jest.fn(),
            deleteOlderThan: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<AuditLogService>(AuditLogService);
    repository = module.get(AuditLogRepository);

    jest.clearAllMocks();
  });

  describe('logAction - action logging with correct timestamp and user', () => {
    it('should log action with correct timestamp and user ID', async () => {
      // Arrange
      const adminUserId = 'admin-123';
      const actionType = ActionType.PERSONA_CREATE;
      const entityType = EntityType.PERSONA;
      const entityId = 'persona-456';
      const details = { name: 'Test Persona', description: 'Test' };
      const ipAddress = '192.168.1.1';

      repository.create.mockResolvedValue(mockAuditLog);

      // Act
      const result = await service.logAction(
        adminUserId,
        actionType,
        entityType,
        entityId,
        details,
        ipAddress,
      );

      // Assert
      expect(result).toEqual(mockAuditLog);
      expect(repository.create).toHaveBeenCalledWith({
        admin_user_id: adminUserId,
        action_type: actionType,
        entity_type: entityType,
        entity_id: entityId,
        details,
        ip_address: ipAddress,
      });
      expect(result.admin_user_id).toBe(adminUserId);
      expect(result.timestamp).toBeInstanceOf(Date);
    });

    it('should log action without optional entity ID', async () => {
      // Arrange
      const adminUserId = 'admin-123';
      const actionType = ActionType.LOGIN_SUCCESS;
      const entityType = EntityType.ADMIN_USER;

      const logWithoutEntityId = { ...mockAuditLog, entity_id: undefined };
      repository.create.mockResolvedValue(logWithoutEntityId);

      // Act
      const result = await service.logAction(
        adminUserId,
        actionType,
        entityType,
      );

      // Assert
      expect(result).toEqual(logWithoutEntityId);
      expect(repository.create).toHaveBeenCalledWith({
        admin_user_id: adminUserId,
        action_type: actionType,
        entity_type: entityType,
        entity_id: undefined,
        details: undefined,
        ip_address: undefined,
      });
    });

    it('should log action without optional details', async () => {
      // Arrange
      const adminUserId = 'admin-123';
      const actionType = ActionType.PERSONA_DELETE;
      const entityType = EntityType.PERSONA;
      const entityId = 'persona-789';

      const logWithoutDetails = { ...mockAuditLog, details: undefined };
      repository.create.mockResolvedValue(logWithoutDetails);

      // Act
      const result = await service.logAction(
        adminUserId,
        actionType,
        entityType,
        entityId,
      );

      // Assert
      expect(result.details).toBeUndefined();
      expect(repository.create).toHaveBeenCalledWith({
        admin_user_id: adminUserId,
        action_type: actionType,
        entity_type: entityType,
        entity_id: entityId,
        details: undefined,
        ip_address: undefined,
      });
    });

    it('should log action without optional IP address', async () => {
      // Arrange
      const adminUserId = 'admin-123';
      const actionType = ActionType.CATEGORY_CREATE;
      const entityType = EntityType.KNOWLEDGE_CATEGORY;
      const entityId = 'category-001';

      const logWithoutIp = { ...mockAuditLog, ip_address: undefined };
      repository.create.mockResolvedValue(logWithoutIp);

      // Act
      const result = await service.logAction(
        adminUserId,
        actionType,
        entityType,
        entityId,
      );

      // Assert
      expect(result.ip_address).toBeUndefined();
    });

    it('should log knowledge upload action with file details', async () => {
      // Arrange
      const adminUserId = 'admin-456';
      const actionType = ActionType.KNOWLEDGE_UPLOAD;
      const entityType = EntityType.KNOWLEDGE_DOCUMENT;
      const entityId = 'doc-123';
      const details = {
        filename: 'document.pdf',
        category: 'technical',
        size: 1024000,
      };

      const knowledgeLog = {
        ...mockAuditLog,
        admin_user_id: adminUserId,
        action_type: actionType,
        entity_type: entityType,
        entity_id: entityId,
        details,
      };
      repository.create.mockResolvedValue(knowledgeLog);

      // Act
      const result = await service.logAction(
        adminUserId,
        actionType,
        entityType,
        entityId,
        details,
      );

      // Assert
      expect(result.details).toEqual(details);
      expect(result.action_type).toBe(ActionType.KNOWLEDGE_UPLOAD);
    });

    it('should log bulk operations with count in details', async () => {
      // Arrange
      const adminUserId = 'admin-789';
      const actionType = ActionType.KNOWLEDGE_BULK_DELETE;
      const entityType = EntityType.KNOWLEDGE_DOCUMENT;
      const details = { documentIds: ['doc-1', 'doc-2', 'doc-3'], count: 3 };

      const bulkLog = {
        ...mockAuditLog,
        action_type: actionType,
        details,
      };
      repository.create.mockResolvedValue(bulkLog);

      // Act
      const result = await service.logAction(
        adminUserId,
        actionType,
        entityType,
        undefined,
        details,
      );

      // Assert
      expect(result.details).toBeDefined();
      expect(result.details!.count).toBe(3);
      expect(result.details!.documentIds).toHaveLength(3);
    });

    it('should throw error when repository fails', async () => {
      // Arrange
      const adminUserId = 'admin-123';
      const actionType = ActionType.PERSONA_CREATE;
      const entityType = EntityType.PERSONA;

      repository.create.mockRejectedValue(
        new Error('Database connection failed'),
      );

      // Act & Assert
      await expect(
        service.logAction(adminUserId, actionType, entityType),
      ).rejects.toThrow('Database connection failed');
    });
  });

  describe('logAuthEvent - authentication event logging', () => {
    it('should log successful login with user ID and IP address', async () => {
      // Arrange
      const adminUserId = 'admin-123';
      const eventType = ActionType.LOGIN_SUCCESS;
      const ipAddress = '192.168.1.1';
      const details = { username: 'testadmin' };

      const authLog = {
        ...mockAuditLog,
        admin_user_id: adminUserId,
        action_type: eventType,
        entity_type: EntityType.ADMIN_USER,
        entity_id: adminUserId,
        details,
        ip_address: ipAddress,
      };
      repository.create.mockResolvedValue(authLog);

      // Act
      const result = await service.logAuthEvent(
        adminUserId,
        eventType,
        ipAddress,
        details,
      );

      // Assert
      expect(result).toEqual(authLog);
      expect(repository.create).toHaveBeenCalledWith({
        admin_user_id: adminUserId,
        action_type: eventType,
        entity_type: EntityType.ADMIN_USER,
        entity_id: adminUserId,
        details,
        ip_address: ipAddress,
      });
    });

    it('should log failed login with null user ID', async () => {
      // Arrange
      const eventType = ActionType.LOGIN_FAILED;
      const ipAddress = '192.168.1.1';
      const details = { username: 'unknown', reason: 'User not found' };

      const failedLog = {
        ...mockAuditLog,
        admin_user_id: 'unknown',
        action_type: eventType,
        entity_type: EntityType.ADMIN_USER,
        entity_id: undefined,
        details,
        ip_address: ipAddress,
      };
      repository.create.mockResolvedValue(failedLog);

      // Act
      const result = await service.logAuthEvent(
        null,
        eventType,
        ipAddress,
        details,
      );

      // Assert
      expect(result.admin_user_id).toBe('unknown');
      expect(repository.create).toHaveBeenCalledWith({
        admin_user_id: 'unknown',
        action_type: eventType,
        entity_type: EntityType.ADMIN_USER,
        entity_id: undefined,
        details,
        ip_address: ipAddress,
      });
    });

    it('should log logout event', async () => {
      // Arrange
      const adminUserId = 'admin-123';
      const eventType = ActionType.LOGOUT;
      const ipAddress = '192.168.1.1';

      const logoutLog = {
        ...mockAuditLog,
        action_type: eventType,
      };
      repository.create.mockResolvedValue(logoutLog);

      // Act
      const result = await service.logAuthEvent(
        adminUserId,
        eventType,
        ipAddress,
      );

      // Assert
      expect(result.action_type).toBe(ActionType.LOGOUT);
    });

    it('should log auth event without IP address', async () => {
      // Arrange
      const adminUserId = 'admin-123';
      const eventType = ActionType.LOGIN_SUCCESS;

      const authLogNoIp = {
        ...mockAuditLog,
        ip_address: undefined,
      };
      repository.create.mockResolvedValue(authLogNoIp);

      // Act
      const result = await service.logAuthEvent(adminUserId, eventType);

      // Assert
      expect(result.ip_address).toBeUndefined();
    });

    it('should throw error when auth event logging fails', async () => {
      // Arrange
      const adminUserId = 'admin-123';
      const eventType = ActionType.LOGIN_SUCCESS;

      repository.create.mockRejectedValue(new Error('Database error'));

      // Act & Assert
      await expect(
        service.logAuthEvent(adminUserId, eventType),
      ).rejects.toThrow('Database error');
    });
  });

  describe('queryLogs - query filtering by action type, user, and date', () => {
    it('should filter logs by action type', async () => {
      // Arrange
      const filters: AuditLogFilters = {
        actionType: ActionType.PERSONA_CREATE,
      };

      const filteredLogs = [
        mockAuditLog,
        { ...mockAuditLog, id: 'audit-2', entity_id: 'persona-789' },
      ];
      repository.query.mockResolvedValue(filteredLogs);

      // Act
      const result = await service.queryLogs(filters);

      // Assert
      expect(result).toEqual(filteredLogs);
      expect(repository.query).toHaveBeenCalledWith(filters);
      expect(
        result.every((log) => log.action_type === ActionType.PERSONA_CREATE),
      ).toBe(true);
    });

    it('should filter logs by user ID', async () => {
      // Arrange
      const filters: AuditLogFilters = {
        userId: 'admin-123',
      };

      const userLogs = [
        mockAuditLog,
        {
          ...mockAuditLog,
          id: 'audit-2',
          action_type: ActionType.PERSONA_UPDATE,
        },
      ];
      repository.query.mockResolvedValue(userLogs);

      // Act
      const result = await service.queryLogs(filters);

      // Assert
      expect(result).toEqual(userLogs);
      expect(repository.query).toHaveBeenCalledWith(filters);
      expect(result.every((log) => log.admin_user_id === 'admin-123')).toBe(
        true,
      );
    });

    it('should filter logs by date range', async () => {
      // Arrange
      const startDate = new Date('2024-01-01T00:00:00Z');
      const endDate = new Date('2024-01-31T23:59:59Z');
      const filters: AuditLogFilters = {
        startDate,
        endDate,
      };

      const dateRangeLogs = [
        mockAuditLog,
        {
          ...mockAuditLog,
          id: 'audit-2',
          timestamp: new Date('2024-01-20T10:00:00Z'),
        },
      ];
      repository.query.mockResolvedValue(dateRangeLogs);

      // Act
      const result = await service.queryLogs(filters);

      // Assert
      expect(result).toEqual(dateRangeLogs);
      expect(repository.query).toHaveBeenCalledWith(filters);
    });

    it('should filter logs by start date only', async () => {
      // Arrange
      const startDate = new Date('2024-01-15T00:00:00Z');
      const filters: AuditLogFilters = {
        startDate,
      };

      const logsFromDate = [mockAuditLog];
      repository.query.mockResolvedValue(logsFromDate);

      // Act
      const result = await service.queryLogs(filters);

      // Assert
      expect(result).toEqual(logsFromDate);
      expect(repository.query).toHaveBeenCalledWith(filters);
    });

    it('should filter logs by end date only', async () => {
      // Arrange
      const endDate = new Date('2024-01-31T23:59:59Z');
      const filters: AuditLogFilters = {
        endDate,
      };

      const logsUntilDate = [mockAuditLog];
      repository.query.mockResolvedValue(logsUntilDate);

      // Act
      const result = await service.queryLogs(filters);

      // Assert
      expect(result).toEqual(logsUntilDate);
      expect(repository.query).toHaveBeenCalledWith(filters);
    });

    it('should filter logs by multiple criteria', async () => {
      // Arrange
      const filters: AuditLogFilters = {
        actionType: ActionType.KNOWLEDGE_UPLOAD,
        userId: 'admin-456',
        startDate: new Date('2024-01-01T00:00:00Z'),
        endDate: new Date('2024-01-31T23:59:59Z'),
      };

      const multiFilterLogs = [
        {
          ...mockAuditLog,
          action_type: ActionType.KNOWLEDGE_UPLOAD,
          admin_user_id: 'admin-456',
        },
      ];
      repository.query.mockResolvedValue(multiFilterLogs);

      // Act
      const result = await service.queryLogs(filters);

      // Assert
      expect(result).toEqual(multiFilterLogs);
      expect(repository.query).toHaveBeenCalledWith(filters);
    });

    it('should return empty array when no logs match filters', async () => {
      // Arrange
      const filters: AuditLogFilters = {
        actionType: ActionType.PERSONA_DELETE,
        userId: 'non-existent-user',
      };

      repository.query.mockResolvedValue([]);

      // Act
      const result = await service.queryLogs(filters);

      // Assert
      expect(result).toEqual([]);
      expect(result).toHaveLength(0);
    });

    it('should throw error when query fails', async () => {
      // Arrange
      const filters: AuditLogFilters = {
        actionType: ActionType.PERSONA_CREATE,
      };

      repository.query.mockRejectedValue(new Error('Query execution failed'));

      // Act & Assert
      await expect(service.queryLogs(filters)).rejects.toThrow(
        'Query execution failed',
      );
    });
  });

  describe('getRecentLogs - retrieve recent audit logs', () => {
    it('should get recent logs with default limit of 100', async () => {
      // Arrange
      const recentLogs = Array.from({ length: 100 }, (_, i) => ({
        ...mockAuditLog,
        id: `audit-${i}`,
        timestamp: new Date(Date.now() - i * 60000),
      }));
      repository.findAll.mockResolvedValue(recentLogs);

      // Act
      const result = await service.getRecentLogs();

      // Assert
      expect(result).toEqual(recentLogs);
      expect(repository.findAll).toHaveBeenCalledWith(100);
      expect(result).toHaveLength(100);
    });

    it('should get recent logs with custom limit', async () => {
      // Arrange
      const limit = 50;
      const recentLogs = Array.from({ length: limit }, (_, i) => ({
        ...mockAuditLog,
        id: `audit-${i}`,
      }));
      repository.findAll.mockResolvedValue(recentLogs);

      // Act
      const result = await service.getRecentLogs(limit);

      // Assert
      expect(result).toEqual(recentLogs);
      expect(repository.findAll).toHaveBeenCalledWith(limit);
      expect(result).toHaveLength(limit);
    });

    it('should get recent logs with small limit', async () => {
      // Arrange
      const limit = 10;
      const recentLogs = Array.from({ length: limit }, (_, i) => ({
        ...mockAuditLog,
        id: `audit-${i}`,
      }));
      repository.findAll.mockResolvedValue(recentLogs);

      // Act
      const result = await service.getRecentLogs(limit);

      // Assert
      expect(result).toHaveLength(10);
      expect(repository.findAll).toHaveBeenCalledWith(10);
    });

    it('should return empty array when no logs exist', async () => {
      // Arrange
      repository.findAll.mockResolvedValue([]);

      // Act
      const result = await service.getRecentLogs();

      // Assert
      expect(result).toEqual([]);
      expect(result).toHaveLength(0);
    });

    it('should throw error when retrieval fails', async () => {
      // Arrange
      repository.findAll.mockRejectedValue(
        new Error('Database connection lost'),
      );

      // Act & Assert
      await expect(service.getRecentLogs()).rejects.toThrow(
        'Database connection lost',
      );
    });
  });

  describe('cleanupOldLogs - log retention logic', () => {
    it('should delete logs older than 90 days by default', async () => {
      // Arrange
      const deletedCount = 150;
      repository.deleteOlderThan.mockResolvedValue(deletedCount);

      // Act
      const result = await service.cleanupOldLogs();

      // Assert
      expect(result).toBe(deletedCount);
      expect(repository.deleteOlderThan).toHaveBeenCalledTimes(1);

      const callArg = repository.deleteOlderThan.mock.calls[0][0];
      const expectedDate = new Date();
      expectedDate.setDate(expectedDate.getDate() - 90);

      // Check that the date is approximately correct (within 1 second)
      expect(Math.abs(callArg.getTime() - expectedDate.getTime())).toBeLessThan(
        1000,
      );
    });

    it('should delete logs older than custom retention period', async () => {
      // Arrange
      const retentionDays = 30;
      const deletedCount = 75;
      repository.deleteOlderThan.mockResolvedValue(deletedCount);

      // Act
      const result = await service.cleanupOldLogs(retentionDays);

      // Assert
      expect(result).toBe(deletedCount);
      expect(repository.deleteOlderThan).toHaveBeenCalledTimes(1);

      const callArg = repository.deleteOlderThan.mock.calls[0][0];
      const expectedDate = new Date();
      expectedDate.setDate(expectedDate.getDate() - retentionDays);

      expect(Math.abs(callArg.getTime() - expectedDate.getTime())).toBeLessThan(
        1000,
      );
    });

    it('should delete logs older than 180 days', async () => {
      // Arrange
      const retentionDays = 180;
      const deletedCount = 500;
      repository.deleteOlderThan.mockResolvedValue(deletedCount);

      // Act
      const result = await service.cleanupOldLogs(retentionDays);

      // Assert
      expect(result).toBe(deletedCount);

      const callArg = repository.deleteOlderThan.mock.calls[0][0];
      const expectedDate = new Date();
      expectedDate.setDate(expectedDate.getDate() - retentionDays);

      expect(Math.abs(callArg.getTime() - expectedDate.getTime())).toBeLessThan(
        1000,
      );
    });

    it('should return 0 when no logs are old enough to delete', async () => {
      // Arrange
      repository.deleteOlderThan.mockResolvedValue(0);

      // Act
      const result = await service.cleanupOldLogs();

      // Assert
      expect(result).toBe(0);
    });

    it('should handle large deletion counts', async () => {
      // Arrange
      const deletedCount = 10000;
      repository.deleteOlderThan.mockResolvedValue(deletedCount);

      // Act
      const result = await service.cleanupOldLogs();

      // Assert
      expect(result).toBe(deletedCount);
    });

    it('should throw error when cleanup fails', async () => {
      // Arrange
      repository.deleteOlderThan.mockRejectedValue(
        new Error('Deletion failed'),
      );

      // Act & Assert
      await expect(service.cleanupOldLogs()).rejects.toThrow('Deletion failed');
    });

    it('should calculate correct cutoff date for retention', async () => {
      // Arrange
      const retentionDays = 60;
      repository.deleteOlderThan.mockResolvedValue(100);

      // Act
      await service.cleanupOldLogs(retentionDays);

      // Assert
      const callArg = repository.deleteOlderThan.mock.calls[0][0];
      const now = new Date();
      const daysDifference = Math.floor(
        (now.getTime() - callArg.getTime()) / (1000 * 60 * 60 * 24),
      );

      expect(daysDifference).toBeGreaterThanOrEqual(retentionDays - 1);
      expect(daysDifference).toBeLessThanOrEqual(retentionDays + 1);
    });
  });

  describe('edge cases and error handling', () => {
    it('should handle very long detail objects', async () => {
      // Arrange
      const adminUserId = 'admin-123';
      const actionType = ActionType.KNOWLEDGE_UPLOAD;
      const entityType = EntityType.KNOWLEDGE_DOCUMENT;
      const largeDetails = {
        metadata: Array.from({ length: 100 }, (_, i) => ({
          key: `field${i}`,
          value: `value${i}`,
        })),
        content: 'x'.repeat(10000),
      };

      const logWithLargeDetails = { ...mockAuditLog, details: largeDetails };
      repository.create.mockResolvedValue(logWithLargeDetails);

      // Act
      const result = await service.logAction(
        adminUserId,
        actionType,
        entityType,
        undefined,
        largeDetails,
      );

      // Assert
      expect(result.details).toEqual(largeDetails);
    });

    it('should handle special characters in entity IDs', async () => {
      // Arrange
      const adminUserId = 'admin-123';
      const actionType = ActionType.PERSONA_UPDATE;
      const entityType = EntityType.PERSONA;
      const entityId = 'persona-with-special-chars-!@#$%';

      const logWithSpecialChars = { ...mockAuditLog, entity_id: entityId };
      repository.create.mockResolvedValue(logWithSpecialChars);

      // Act
      const result = await service.logAction(
        adminUserId,
        actionType,
        entityType,
        entityId,
      );

      // Assert
      expect(result.entity_id).toBe(entityId);
    });

    it('should handle IPv6 addresses', async () => {
      // Arrange
      const adminUserId = 'admin-123';
      const actionType = ActionType.LOGIN_SUCCESS;
      const entityType = EntityType.ADMIN_USER;
      const ipv6Address = '2001:0db8:85a3:0000:0000:8a2e:0370:7334';

      const logWithIpv6 = { ...mockAuditLog, ip_address: ipv6Address };
      repository.create.mockResolvedValue(logWithIpv6);

      // Act
      const result = await service.logAction(
        adminUserId,
        actionType,
        entityType,
        undefined,
        undefined,
        ipv6Address,
      );

      // Assert
      expect(result.ip_address).toBe(ipv6Address);
    });

    it('should handle concurrent log creation', async () => {
      // Arrange
      const adminUserId = 'admin-123';
      const actionType = ActionType.PERSONA_CREATE;
      const entityType = EntityType.PERSONA;

      repository.create.mockResolvedValue(mockAuditLog);

      // Act - Create multiple logs concurrently
      const promises = Array.from({ length: 10 }, (_, i) =>
        service.logAction(adminUserId, actionType, entityType, `persona-${i}`),
      );
      const results = await Promise.all(promises);

      // Assert
      expect(results).toHaveLength(10);
      expect(repository.create).toHaveBeenCalledTimes(10);
    });

    it('should handle empty filters object', async () => {
      // Arrange
      const filters: AuditLogFilters = {};
      const allLogs = [mockAuditLog];
      repository.query.mockResolvedValue(allLogs);

      // Act
      const result = await service.queryLogs(filters);

      // Assert
      expect(result).toEqual(allLogs);
      expect(repository.query).toHaveBeenCalledWith(filters);
    });
  });
});
