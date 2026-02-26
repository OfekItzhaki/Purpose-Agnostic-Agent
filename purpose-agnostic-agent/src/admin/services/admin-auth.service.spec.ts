import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { Repository } from 'typeorm';
import { getRepositoryToken } from '@nestjs/typeorm';
import { UnauthorizedException, BadRequestException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import {
  AdminAuthService,
  AdminJwtPayload,
  LoginResult,
} from './admin-auth.service.js';
import { AdminUser } from '../entities/admin-user.entity.js';
import { AuditLogService, ActionType } from './audit-log.service.js';

// Mock bcrypt
jest.mock('bcrypt');

describe('AdminAuthService', () => {
  let service: AdminAuthService;
  let adminUserRepository: jest.Mocked<Repository<AdminUser>>;
  let jwtService: jest.Mocked<JwtService>;
  let auditLogService: jest.Mocked<AuditLogService>;

  const mockAdminUser: AdminUser = {
    id: 'test-admin-id',
    username: 'testadmin',
    password_hash: '$2b$10$hashedpassword',
    email: 'admin@test.com',
    role: 'admin',
    created_at: new Date('2024-01-01'),
    updated_at: new Date('2024-01-01'),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminAuthService,
        {
          provide: getRepositoryToken(AdminUser),
          useValue: {
            findOne: jest.fn(),
            save: jest.fn(),
            create: jest.fn(),
          },
        },
        {
          provide: JwtService,
          useValue: {
            sign: jest.fn(),
            verify: jest.fn(),
          },
        },
        {
          provide: AuditLogService,
          useValue: {
            logAuthEvent: jest.fn().mockResolvedValue({}),
            logAction: jest.fn().mockResolvedValue({}),
          },
        },
      ],
    }).compile();

    service = module.get<AdminAuthService>(AdminAuthService);
    adminUserRepository = module.get(getRepositoryToken(AdminUser));
    jwtService = module.get(JwtService);
    auditLogService = module.get(AuditLogService);

    // Reset mocks
    jest.clearAllMocks();
  });

  afterEach(() => {
    // Clear rate limit state between tests
    (service as any).loginAttempts.clear();
  });

  describe('login - successful authentication', () => {
    it('should successfully login with valid credentials', async () => {
      // Arrange
      const username = 'testadmin';
      const password = 'validPassword123';
      const ipAddress = '192.168.1.1';
      const mockToken = 'jwt.token.here';

      adminUserRepository.findOne.mockResolvedValue(mockAdminUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      jwtService.sign.mockReturnValue(mockToken);

      // Act
      const result: LoginResult = await service.login(
        username,
        password,
        ipAddress,
      );

      // Assert
      expect(result).toEqual({
        access_token: mockToken,
        user: {
          id: mockAdminUser.id,
          username: mockAdminUser.username,
          email: mockAdminUser.email,
          role: mockAdminUser.role,
        },
      });

      expect(adminUserRepository.findOne).toHaveBeenCalledWith({
        where: { username },
      });
      expect(bcrypt.compare).toHaveBeenCalledWith(
        password,
        mockAdminUser.password_hash,
      );
      expect(jwtService.sign).toHaveBeenCalledWith({
        sub: mockAdminUser.id,
        username: mockAdminUser.username,
        email: mockAdminUser.email,
        role: mockAdminUser.role,
      });
      expect(auditLogService.logAuthEvent).toHaveBeenCalledWith(
        mockAdminUser.id,
        ActionType.LOGIN_SUCCESS,
        ipAddress,
        { username },
      );
    });

    it('should clear failed login attempts after successful login', async () => {
      // Arrange
      const username = 'testadmin';
      const password = 'validPassword123';
      const ipAddress = '192.168.1.1';

      adminUserRepository.findOne.mockResolvedValue(mockAdminUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      jwtService.sign.mockReturnValue('token');

      // Simulate previous failed attempts
      const loginAttempts = (service as any).loginAttempts;
      loginAttempts.set(`${username}:${ipAddress}`, {
        count: 3,
        lastAttempt: new Date(),
      });

      // Act
      await service.login(username, password, ipAddress);

      // Assert
      expect(loginAttempts.has(`${username}:${ipAddress}`)).toBe(false);
    });

    it('should generate JWT token with correct payload structure', async () => {
      // Arrange
      const username = 'testadmin';
      const password = 'validPassword123';

      adminUserRepository.findOne.mockResolvedValue(mockAdminUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      jwtService.sign.mockReturnValue('token');

      // Act
      await service.login(username, password);

      // Assert
      const expectedPayload: AdminJwtPayload = {
        sub: mockAdminUser.id,
        username: mockAdminUser.username,
        email: mockAdminUser.email,
        role: mockAdminUser.role,
      };
      expect(jwtService.sign).toHaveBeenCalledWith(expectedPayload);
    });
  });

  describe('login - failed authentication', () => {
    it('should throw UnauthorizedException when user does not exist', async () => {
      // Arrange
      const username = 'nonexistent';
      const password = 'anyPassword';
      const ipAddress = '192.168.1.1';

      adminUserRepository.findOne.mockResolvedValue(null);

      // Act & Assert
      await expect(
        service.login(username, password, ipAddress),
      ).rejects.toThrow(UnauthorizedException);
      await expect(
        service.login(username, password, ipAddress),
      ).rejects.toThrow('Invalid credentials');

      expect(auditLogService.logAuthEvent).toHaveBeenCalledWith(
        null,
        ActionType.LOGIN_FAILED,
        ipAddress,
        { username, reason: 'User not found' },
      );
    });

    it('should throw UnauthorizedException when password is invalid', async () => {
      // Arrange
      const username = 'testadmin';
      const password = 'wrongPassword';
      const ipAddress = '192.168.1.1';

      adminUserRepository.findOne.mockResolvedValue(mockAdminUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      // Act & Assert
      await expect(
        service.login(username, password, ipAddress),
      ).rejects.toThrow(UnauthorizedException);
      await expect(
        service.login(username, password, ipAddress),
      ).rejects.toThrow('Invalid credentials');

      expect(auditLogService.logAuthEvent).toHaveBeenCalledWith(
        mockAdminUser.id,
        ActionType.LOGIN_FAILED,
        ipAddress,
        { username, reason: 'Invalid password' },
      );
    });

    it('should record failed login attempt when user not found', async () => {
      // Arrange
      const username = 'nonexistent';
      const password = 'anyPassword';
      const ipAddress = '192.168.1.1';

      adminUserRepository.findOne.mockResolvedValue(null);

      // Act
      try {
        await service.login(username, password, ipAddress);
      } catch (error) {
        // Expected to throw
      }

      // Assert
      const loginAttempts = (service as any).loginAttempts;
      const attempts = loginAttempts.get(`${username}:${ipAddress}`);
      expect(attempts).toBeDefined();
      expect(attempts.count).toBe(1);
    });

    it('should record failed login attempt when password is wrong', async () => {
      // Arrange
      const username = 'testadmin';
      const password = 'wrongPassword';
      const ipAddress = '192.168.1.1';

      adminUserRepository.findOne.mockResolvedValue(mockAdminUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      // Act
      try {
        await service.login(username, password, ipAddress);
      } catch (error) {
        // Expected to throw
      }

      // Assert
      const loginAttempts = (service as any).loginAttempts;
      const attempts = loginAttempts.get(`${username}:${ipAddress}`);
      expect(attempts).toBeDefined();
      expect(attempts.count).toBe(1);
    });

    it('should not throw if audit logging fails', async () => {
      // Arrange
      const username = 'testadmin';
      const password = 'validPassword123';

      adminUserRepository.findOne.mockResolvedValue(mockAdminUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      jwtService.sign.mockReturnValue('token');
      auditLogService.logAuthEvent.mockRejectedValue(
        new Error('Audit log failed'),
      );

      // Act & Assert - should not throw
      const result = await service.login(username, password);
      expect(result.access_token).toBe('token');
    });
  });

  describe('login - rate limiting', () => {
    it('should allow login attempts below rate limit threshold', async () => {
      // Arrange
      const username = 'testadmin';
      const password = 'wrongPassword';
      const ipAddress = '192.168.1.1';

      adminUserRepository.findOne.mockResolvedValue(mockAdminUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      // Act - Make 4 failed attempts (below MAX_ATTEMPTS of 5)
      for (let i = 0; i < 4; i++) {
        try {
          await service.login(username, password, ipAddress);
        } catch (error) {
          // Expected to throw UnauthorizedException
        }
      }

      // Assert - 5th attempt should still be allowed (not rate limited)
      await expect(
        service.login(username, password, ipAddress),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should block login attempts after exceeding rate limit', async () => {
      // Arrange
      const username = 'testadmin';
      const password = 'wrongPassword';
      const ipAddress = '192.168.1.1';

      adminUserRepository.findOne.mockResolvedValue(mockAdminUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      // Act - Make 5 failed attempts to hit the limit
      for (let i = 0; i < 5; i++) {
        try {
          await service.login(username, password, ipAddress);
        } catch (error) {
          // Expected to throw
        }
      }

      // Assert - 6th attempt should be rate limited
      await expect(
        service.login(username, password, ipAddress),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.login(username, password, ipAddress),
      ).rejects.toThrow(/Too many login attempts/);
    });

    it('should include remaining time in rate limit error message', async () => {
      // Arrange
      const username = 'testadmin';
      const password = 'wrongPassword';
      const ipAddress = '192.168.1.1';

      adminUserRepository.findOne.mockResolvedValue(mockAdminUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      // Make 5 failed attempts
      for (let i = 0; i < 5; i++) {
        try {
          await service.login(username, password, ipAddress);
        } catch (error) {
          // Expected
        }
      }

      // Act & Assert
      try {
        await service.login(username, password, ipAddress);
        fail('Should have thrown BadRequestException');
      } catch (error) {
        expect(error).toBeInstanceOf(BadRequestException);
        expect(error.message).toMatch(/Please try again in \d+ minutes/);
      }
    });

    it('should reset rate limit after time window expires', async () => {
      // Arrange
      const username = 'testadmin';
      const password = 'wrongPassword';
      const ipAddress = '192.168.1.1';

      adminUserRepository.findOne.mockResolvedValue(mockAdminUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      // Simulate old failed attempts (beyond 15 minute window)
      const loginAttempts = (service as any).loginAttempts;
      const oldDate = new Date(Date.now() - 16 * 60 * 1000); // 16 minutes ago
      loginAttempts.set(`${username}:${ipAddress}`, {
        count: 5,
        lastAttempt: oldDate,
      });

      // Act - Should be allowed since window expired
      await expect(
        service.login(username, password, ipAddress),
      ).rejects.toThrow(UnauthorizedException);

      // Assert - Should not throw BadRequestException (rate limit)
      expect(loginAttempts.has(`${username}:${ipAddress}`)).toBe(true);
      const attempts = loginAttempts.get(`${username}:${ipAddress}`);
      expect(attempts.count).toBe(1); // Reset and new attempt recorded
    });

    it('should use username-only key when IP address not provided', async () => {
      // Arrange
      const username = 'testadmin';
      const password = 'wrongPassword';

      adminUserRepository.findOne.mockResolvedValue(mockAdminUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      // Act - Make failed attempts without IP
      for (let i = 0; i < 5; i++) {
        try {
          await service.login(username, password);
        } catch (error) {
          // Expected
        }
      }

      // Assert
      const loginAttempts = (service as any).loginAttempts;
      expect(loginAttempts.has(username)).toBe(true);
      await expect(service.login(username, password)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should track rate limits separately for different IP addresses', async () => {
      // Arrange
      const username = 'testadmin';
      const password = 'wrongPassword';
      const ip1 = '192.168.1.1';
      const ip2 = '192.168.1.2';

      adminUserRepository.findOne.mockResolvedValue(mockAdminUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      // Act - Make 5 failed attempts from IP1
      for (let i = 0; i < 5; i++) {
        try {
          await service.login(username, password, ip1);
        } catch (error) {
          // Expected
        }
      }

      // Assert - IP1 should be rate limited
      await expect(service.login(username, password, ip1)).rejects.toThrow(
        BadRequestException,
      );

      // Assert - IP2 should still be allowed
      await expect(service.login(username, password, ip2)).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  describe('validateToken', () => {
    it('should return admin user for valid token payload', async () => {
      // Arrange
      const payload: AdminJwtPayload = {
        sub: mockAdminUser.id,
        username: mockAdminUser.username,
        email: mockAdminUser.email,
        role: mockAdminUser.role,
      };

      adminUserRepository.findOne.mockResolvedValue(mockAdminUser);

      // Act
      const result = await service.validateToken(payload);

      // Assert
      expect(result).toEqual(mockAdminUser);
      expect(adminUserRepository.findOne).toHaveBeenCalledWith({
        where: { id: payload.sub },
      });
    });

    it('should return null when user not found', async () => {
      // Arrange
      const payload: AdminJwtPayload = {
        sub: 'non-existent-id',
        username: 'unknown',
        email: 'unknown@test.com',
        role: 'admin',
      };

      adminUserRepository.findOne.mockResolvedValue(null);

      // Act
      const result = await service.validateToken(payload);

      // Assert
      expect(result).toBeNull();
    });

    it('should handle token expiration by returning null for deleted users', async () => {
      // Arrange - Simulate a token for a user that was deleted
      const payload: AdminJwtPayload = {
        sub: 'deleted-user-id',
        username: 'deleteduser',
        email: 'deleted@test.com',
        role: 'admin',
      };

      adminUserRepository.findOne.mockResolvedValue(null);

      // Act
      const result = await service.validateToken(payload);

      // Assert
      expect(result).toBeNull();
    });
  });

  describe('hashPassword', () => {
    it('should hash password using bcrypt with 10 salt rounds', async () => {
      // Arrange
      const password = 'mySecurePassword123';
      const hashedPassword = '$2b$10$hashedResult';
      (bcrypt.hash as jest.Mock).mockResolvedValue(hashedPassword);

      // Act
      const result = await service.hashPassword(password);

      // Assert
      expect(result).toBe(hashedPassword);
      expect(bcrypt.hash).toHaveBeenCalledWith(password, 10);
    });

    it('should produce different hashes for same password on multiple calls', async () => {
      // Arrange
      const password = 'myPassword';
      (bcrypt.hash as jest.Mock)
        .mockResolvedValueOnce('$2b$10$hash1')
        .mockResolvedValueOnce('$2b$10$hash2');

      // Act
      const hash1 = await service.hashPassword(password);
      const hash2 = await service.hashPassword(password);

      // Assert
      expect(hash1).not.toBe(hash2);
    });
  });

  describe('edge cases and error handling', () => {
    it('should handle database errors during user lookup', async () => {
      // Arrange
      const username = 'testadmin';
      const password = 'password';

      adminUserRepository.findOne.mockRejectedValue(
        new Error('Database connection failed'),
      );

      // Act & Assert
      await expect(service.login(username, password)).rejects.toThrow(
        'Database connection failed',
      );
    });

    it('should handle bcrypt comparison errors', async () => {
      // Arrange
      const username = 'testadmin';
      const password = 'password';

      adminUserRepository.findOne.mockResolvedValue(mockAdminUser);
      (bcrypt.compare as jest.Mock).mockRejectedValue(
        new Error('Bcrypt error'),
      );

      // Act & Assert
      await expect(service.login(username, password)).rejects.toThrow(
        'Bcrypt error',
      );
    });

    it('should handle JWT signing errors', async () => {
      // Arrange
      const username = 'testadmin';
      const password = 'validPassword';

      adminUserRepository.findOne.mockResolvedValue(mockAdminUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      jwtService.sign.mockImplementation(() => {
        throw new Error('JWT signing failed');
      });

      // Act & Assert
      await expect(service.login(username, password)).rejects.toThrow(
        'JWT signing failed',
      );
    });

    it('should handle empty username', async () => {
      // Arrange
      const username = '';
      const password = 'password';

      adminUserRepository.findOne.mockResolvedValue(null);

      // Act & Assert
      await expect(service.login(username, password)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should handle empty password', async () => {
      // Arrange
      const username = 'testadmin';
      const password = '';

      adminUserRepository.findOne.mockResolvedValue(mockAdminUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      // Act & Assert
      await expect(service.login(username, password)).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });
});
