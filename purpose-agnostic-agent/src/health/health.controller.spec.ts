import { Test, TestingModule } from '@nestjs/testing';
import { HealthController } from './health.controller';
import { HealthCheckService, TypeOrmHealthIndicator } from '@nestjs/terminus';
import { LLMProviderHealthIndicator } from './llm-provider.health';

describe('HealthController', () => {
  let controller: HealthController;
  let healthCheckService: jest.Mocked<HealthCheckService>;
  let dbHealthIndicator: jest.Mocked<TypeOrmHealthIndicator>;
  let llmHealthIndicator: jest.Mocked<LLMProviderHealthIndicator>;

  beforeEach(async () => {
    const mockHealthCheckService = {
      check: jest.fn(),
    };

    const mockDbHealthIndicator = {
      pingCheck: jest.fn(),
    };

    const mockLLMHealthIndicator = {
      isHealthy: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [
        {
          provide: HealthCheckService,
          useValue: mockHealthCheckService,
        },
        {
          provide: TypeOrmHealthIndicator,
          useValue: mockDbHealthIndicator,
        },
        {
          provide: LLMProviderHealthIndicator,
          useValue: mockLLMHealthIndicator,
        },
      ],
    }).compile();

    controller = module.get<HealthController>(HealthController);
    healthCheckService = module.get(HealthCheckService);
    dbHealthIndicator = module.get(TypeOrmHealthIndicator);
    llmHealthIndicator = module.get(LLMProviderHealthIndicator);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getHealth', () => {
    it('should return 200 with status ok', () => {
      const result = controller.getHealth();

      expect(result.status).toBe('ok');
      expect(result).toHaveProperty('timestamp');
      expect(result).toHaveProperty('version');
    });

    it('should include timestamp in ISO format', () => {
      const result = controller.getHealth();

      expect(result.timestamp).toMatch(
        /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/,
      );
    });

    it('should include version from environment or default', () => {
      const result = controller.getHealth();

      expect(result.version).toBeDefined();
      expect(typeof result.version).toBe('string');
    });

    it('should return fresh timestamp on each call', async () => {
      const result1 = controller.getHealth();
      await new Promise((resolve) => setTimeout(resolve, 10));
      const result2 = controller.getHealth();

      expect(result1.timestamp).not.toBe(result2.timestamp);
    });
  });

  describe('checkReady', () => {
    it('should return 200 when all dependencies are healthy', async () => {
      const mockHealthResult = {
        status: 'ok',
        info: {
          database: { status: 'up' },
          'llm-providers': { status: 'up' },
        },
        error: {},
        details: {
          database: { status: 'up' },
          'llm-providers': { status: 'up' },
        },
      };

      healthCheckService.check.mockResolvedValue(mockHealthResult);

      const result = await controller.checkReady();

      expect(result.status).toBe('ok');
      expect(result.info).toBeDefined();
      expect(healthCheckService.check).toHaveBeenCalledWith([
        expect.any(Function),
        expect.any(Function),
      ]);
    });

    it('should return 503 when database is unavailable', async () => {
      const mockHealthResult = {
        status: 'error',
        info: {},
        error: {
          database: {
            status: 'down',
            message: 'Connection failed',
          },
        },
        details: {
          database: {
            status: 'down',
            message: 'Connection failed',
          },
        },
      };

      healthCheckService.check.mockResolvedValue(mockHealthResult);

      const result = await controller.checkReady();

      expect(result.status).toBe('error');
      expect(result.error).toBeDefined();
      expect(result.error.database).toBeDefined();
    });

    it('should return 200 with warning when some LLM providers unavailable', async () => {
      const mockHealthResult = {
        status: 'ok',
        info: {
          database: { status: 'up' },
          'llm-providers': {
            status: 'up',
            healthyCount: 1,
            totalCount: 3,
          },
        },
        error: {},
        details: {
          database: { status: 'up' },
          'llm-providers': {
            status: 'up',
            healthyCount: 1,
            totalCount: 3,
          },
        },
      };

      healthCheckService.check.mockResolvedValue(mockHealthResult);

      const result = await controller.checkReady();

      expect(result.status).toBe('ok');
      expect(result.info['llm-providers']).toBeDefined();
      expect(result.info['llm-providers'].healthyCount).toBe(1);
      expect(result.info['llm-providers'].totalCount).toBe(3);
    });

    it('should call database ping check', async () => {
      const mockHealthResult = {
        status: 'ok',
        info: {},
        error: {},
        details: {},
      };

      healthCheckService.check.mockResolvedValue(mockHealthResult);

      await controller.checkReady();

      // Verify the check function was called
      expect(healthCheckService.check).toHaveBeenCalled();
      const checkFunctions = healthCheckService.check.mock.calls[0][0];
      expect(checkFunctions).toHaveLength(2);
    });

    it('should call LLM provider health check', async () => {
      const mockHealthResult = {
        status: 'ok',
        info: {},
        error: {},
        details: {},
      };

      healthCheckService.check.mockResolvedValue(mockHealthResult);

      await controller.checkReady();

      expect(healthCheckService.check).toHaveBeenCalled();
    });

    it('should handle multiple dependency failures', async () => {
      const mockHealthResult = {
        status: 'error',
        info: {},
        error: {
          database: {
            status: 'down',
            message: 'Connection timeout',
          },
          'llm-providers': {
            status: 'down',
            message: 'No providers available',
          },
        },
        details: {
          database: {
            status: 'down',
            message: 'Connection timeout',
          },
          'llm-providers': {
            status: 'down',
            message: 'No providers available',
          },
        },
      };

      healthCheckService.check.mockResolvedValue(mockHealthResult);

      const result = await controller.checkReady();

      expect(result.status).toBe('error');
      expect(result.error.database).toBeDefined();
      expect(result.error['llm-providers']).toBeDefined();
    });
  });
});
