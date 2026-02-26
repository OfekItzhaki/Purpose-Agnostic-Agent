import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { AuthService } from './auth.service';

describe('AuthService', () => {
  let service: AuthService;
  let jwtService: JwtService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: JwtService,
          useValue: {
            sign: jest.fn().mockReturnValue('mock-jwt-token'),
            verify: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    jwtService = module.get<JwtService>(JwtService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('validateApiKey', () => {
    it('should return null for invalid API key', async () => {
      const result = await service.validateApiKey('invalid-key');
      expect(result).toBeNull();
    });

    it('should return user for valid API key', async () => {
      process.env.API_KEYS = 'valid-key-1,valid-key-2';
      const result = await service.validateApiKey('valid-key-1');

      expect(result).toEqual({
        id: 'api-key-user',
        email: 'api@service.local',
        role: 'user',
      });
    });
  });

  describe('validateJwt', () => {
    it('should return user from JWT payload', async () => {
      const payload = {
        sub: 'user-123',
        email: 'test@example.com',
        role: 'admin' as const,
      };

      const result = await service.validateJwt(payload);

      expect(result).toEqual({
        id: 'user-123',
        email: 'test@example.com',
        role: 'admin',
      });
    });
  });

  describe('generateToken', () => {
    it('should generate JWT token for user', async () => {
      const user = {
        id: 'user-123',
        email: 'test@example.com',
        role: 'user' as const,
      };

      const token = await service.generateToken(user);

      expect(token).toBe('mock-jwt-token');
      expect(jwtService.sign).toHaveBeenCalledWith({
        sub: 'user-123',
        email: 'test@example.com',
        role: 'user',
      });
    });
  });

  describe('generateApiKey', () => {
    it('should generate API key with pak_ prefix', () => {
      const apiKey = service.generateApiKey();

      expect(apiKey).toMatch(/^pak_[a-f0-9]{64}$/);
    });

    it('should generate unique API keys', () => {
      const key1 = service.generateApiKey();
      const key2 = service.generateApiKey();

      expect(key1).not.toBe(key2);
    });
  });
});
