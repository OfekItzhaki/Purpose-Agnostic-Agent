import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { AdminAuditController } from './admin-audit.controller.js';
import { AuditLogService } from '../services/audit-log.service.js';
import { AdminAuthGuard } from '../guards/admin-auth.guard.js';
import { AuditLog } from '../entities/audit-log.entity.js';

describe('AdminAuditController', () => {
  let controller: AdminAuditController;
  let auditLogService: jest.Mocked<AuditLogService>;

  beforeEach(async () => {
    const mockAuditLogService = {
      queryLogs: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AdminAuditController],
      providers: [
        {
          provide: AuditLogService,
          useValue: mockAuditLogService,
        },
      ],
    })
      .overrideGuard(AdminAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<AdminAuditController>(AdminAuditController);
    auditLogService = module.get(AuditLogService);
  });

  describe('getLogs', () => {
    it('should return audit logs without filters', async () => {
      const mockLogs: AuditLog[] = [
        {
          id: '123e4567-e89b-12d3-a456-426614174000',
          admin_user_id: 'admin-123',
          action_type: 'PERSONA_CREATE',
          entity_type: 'PERSONA',
          entity_id: 'tech-support',
          details: { name: 'Tech Support' },
          ip_address: '192.168.1.1',
          timestamp: new Date('2024-01-15T10:30:00Z'),
        },
      ];

      auditLogService.queryLogs.mockResolvedValue(mockLogs);

      const result = await controller.getLogs();

      expect(result.logs).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.logs[0].id).toBe('123e4567-e89b-12d3-a456-426614174000');
      expect(result.logs[0].actionType).toBe('PERSONA_CREATE');
      expect(auditLogService.queryLogs).toHaveBeenCalledWith({
        actionType: undefined,
        userId: undefined,
        startDate: undefined,
        endDate: undefined,
      });
    });

    it('should return audit logs with action type filter', async () => {
      const mockLogs: AuditLog[] = [
        {
          id: '123e4567-e89b-12d3-a456-426614174001',
          admin_user_id: 'admin-456',
          action_type: 'LOGIN_SUCCESS',
          entity_type: 'ADMIN_USER',
          entity_id: 'admin-456',
          details: {},
          ip_address: '192.168.1.2',
          timestamp: new Date('2024-01-15T11:00:00Z'),
        },
      ];

      auditLogService.queryLogs.mockResolvedValue(mockLogs);

      const result = await controller.getLogs('LOGIN_SUCCESS');

      expect(result.logs).toHaveLength(1);
      expect(result.logs[0].actionType).toBe('LOGIN_SUCCESS');
      expect(auditLogService.queryLogs).toHaveBeenCalledWith({
        actionType: 'LOGIN_SUCCESS',
        userId: undefined,
        startDate: undefined,
        endDate: undefined,
      });
    });

    it('should return audit logs with user ID filter', async () => {
      const mockLogs: AuditLog[] = [];

      auditLogService.queryLogs.mockResolvedValue(mockLogs);

      const result = await controller.getLogs(undefined, 'admin-789');

      expect(result.logs).toHaveLength(0);
      expect(result.total).toBe(0);
      expect(auditLogService.queryLogs).toHaveBeenCalledWith({
        actionType: undefined,
        userId: 'admin-789',
        startDate: undefined,
        endDate: undefined,
      });
    });

    it('should return audit logs with date range filter', async () => {
      const mockLogs: AuditLog[] = [
        {
          id: '123e4567-e89b-12d3-a456-426614174002',
          admin_user_id: 'admin-123',
          action_type: 'KNOWLEDGE_UPLOAD',
          entity_type: 'KNOWLEDGE_DOCUMENT',
          entity_id: 'doc-123',
          details: { filename: 'test.pdf' },
          ip_address: '192.168.1.1',
          timestamp: new Date('2024-01-10T10:00:00Z'),
        },
      ];

      auditLogService.queryLogs.mockResolvedValue(mockLogs);

      const result = await controller.getLogs(
        undefined,
        undefined,
        '2024-01-01T00:00:00Z',
        '2024-01-31T23:59:59Z',
      );

      expect(result.logs).toHaveLength(1);
      expect(auditLogService.queryLogs).toHaveBeenCalledWith({
        actionType: undefined,
        userId: undefined,
        startDate: new Date('2024-01-01T00:00:00Z'),
        endDate: new Date('2024-01-31T23:59:59Z'),
      });
    });

    it('should return audit logs with all filters', async () => {
      const mockLogs: AuditLog[] = [];

      auditLogService.queryLogs.mockResolvedValue(mockLogs);

      const result = await controller.getLogs(
        'PERSONA_UPDATE',
        'admin-123',
        '2024-01-01T00:00:00Z',
        '2024-01-31T23:59:59Z',
      );

      expect(result.total).toBe(0);
      expect(auditLogService.queryLogs).toHaveBeenCalledWith({
        actionType: 'PERSONA_UPDATE',
        userId: 'admin-123',
        startDate: new Date('2024-01-01T00:00:00Z'),
        endDate: new Date('2024-01-31T23:59:59Z'),
      });
    });

    it('should throw BadRequestException for invalid startDate format', async () => {
      await expect(
        controller.getLogs(undefined, undefined, 'invalid-date'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException for invalid endDate format', async () => {
      await expect(
        controller.getLogs(undefined, undefined, undefined, 'invalid-date'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when startDate is after endDate', async () => {
      await expect(
        controller.getLogs(
          undefined,
          undefined,
          '2024-01-31T23:59:59Z',
          '2024-01-01T00:00:00Z',
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should transform entity fields correctly', async () => {
      const mockLogs: AuditLog[] = [
        {
          id: 'test-id',
          admin_user_id: 'admin-test',
          action_type: 'CATEGORY_CREATE',
          entity_type: 'KNOWLEDGE_CATEGORY',
          entity_id: 'new-category',
          details: { categoryName: 'New Category' },
          ip_address: '10.0.0.1',
          timestamp: new Date('2024-01-20T15:30:00Z'),
        },
      ];

      auditLogService.queryLogs.mockResolvedValue(mockLogs);

      const result = await controller.getLogs();

      expect(result.logs[0]).toEqual({
        id: 'test-id',
        adminUserId: 'admin-test',
        actionType: 'CATEGORY_CREATE',
        entityType: 'KNOWLEDGE_CATEGORY',
        entityId: 'new-category',
        details: { categoryName: 'New Category' },
        ipAddress: '10.0.0.1',
        timestamp: new Date('2024-01-20T15:30:00Z'),
      });
    });
  });
});
