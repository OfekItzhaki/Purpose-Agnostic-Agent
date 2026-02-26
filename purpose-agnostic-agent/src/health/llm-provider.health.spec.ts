import { Test, TestingModule } from '@nestjs/testing';
import { HealthCheckError } from '@nestjs/terminus';
import { LLMProviderHealthIndicator } from './llm-provider.health';
import { ModelRouterService } from '../model-router/model-router.service';

describe('LLMProviderHealthIndicator', () => {
  let indicator: LLMProviderHealthIndicator;
  let modelRouter: jest.Mocked<ModelRouterService>;

  beforeEach(async () => {
    const mockModelRouter = {
      getProviderStatus: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LLMProviderHealthIndicator,
        {
          provide: ModelRouterService,
          useValue: mockModelRouter,
        },
      ],
    }).compile();

    indicator = module.get<LLMProviderHealthIndicator>(
      LLMProviderHealthIndicator,
    );
    modelRouter = module.get(ModelRouterService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('isHealthy', () => {
    it('should return healthy status when all providers are healthy', async () => {
      const mockProviders = [
        { name: 'gpt-4o', isHealthy: true, tier: 'primary' },
        { name: 'claude-3.5', isHealthy: true, tier: 'fallback' },
        { name: 'ollama', isHealthy: true, tier: 'local' },
      ];

      modelRouter.getProviderStatus.mockResolvedValue(mockProviders);

      const result = await indicator.isHealthy('llm-providers');

      expect(result).toEqual({
        'llm-providers': {
          status: 'up',
          providers: mockProviders,
          healthyCount: 3,
          totalCount: 3,
        },
      });
    });

    it('should return healthy status when some providers are healthy', async () => {
      const mockProviders = [
        { name: 'gpt-4o', isHealthy: true, tier: 'primary' },
        { name: 'claude-3.5', isHealthy: false, tier: 'fallback' },
        { name: 'ollama', isHealthy: true, tier: 'local' },
      ];

      modelRouter.getProviderStatus.mockResolvedValue(mockProviders);

      const result = await indicator.isHealthy('llm-providers');

      expect(result).toEqual({
        'llm-providers': {
          status: 'up',
          providers: mockProviders,
          healthyCount: 2,
          totalCount: 3,
        },
      });
    });

    it('should throw HealthCheckError when no providers are healthy', async () => {
      const mockProviders = [
        { name: 'gpt-4o', isHealthy: false, tier: 'primary' },
        { name: 'claude-3.5', isHealthy: false, tier: 'fallback' },
        { name: 'ollama', isHealthy: false, tier: 'local' },
      ];

      modelRouter.getProviderStatus.mockResolvedValue(mockProviders);

      await expect(indicator.isHealthy('llm-providers')).rejects.toThrow(
        HealthCheckError,
      );

      try {
        await indicator.isHealthy('llm-providers');
      } catch (error) {
        expect(error.message).toBeDefined();
        expect(error.causes).toBeDefined();
        expect(error.causes['llm-providers'].status).toBe('down');
      }
    });

    it('should handle model router errors', async () => {
      modelRouter.getProviderStatus.mockRejectedValue(
        new Error('Service unavailable'),
      );

      await expect(indicator.isHealthy('llm-providers')).rejects.toThrow(
        HealthCheckError,
      );

      try {
        await indicator.isHealthy('llm-providers');
      } catch (error) {
        expect(error.message).toBeDefined();
        expect(error.causes).toBeDefined();
        expect(error.causes['llm-providers'].status).toBe('down');
      }
    });

    it('should handle empty provider list', async () => {
      modelRouter.getProviderStatus.mockResolvedValue([]);

      await expect(indicator.isHealthy('llm-providers')).rejects.toThrow(
        HealthCheckError,
      );
    });

    it('should include provider details in healthy response', async () => {
      const mockProviders = [
        {
          name: 'gpt-4o',
          isHealthy: true,
          tier: 'primary',
          lastCheck: new Date(),
        },
      ];

      modelRouter.getProviderStatus.mockResolvedValue(mockProviders);

      const result = await indicator.isHealthy('llm-providers');

      expect(result['llm-providers'].providers).toEqual(mockProviders);
    });

    it('should count healthy providers correctly', async () => {
      const mockProviders = [
        { name: 'provider1', isHealthy: true },
        { name: 'provider2', isHealthy: false },
        { name: 'provider3', isHealthy: true },
        { name: 'provider4', isHealthy: false },
        { name: 'provider5', isHealthy: true },
      ];

      modelRouter.getProviderStatus.mockResolvedValue(mockProviders);

      const result = await indicator.isHealthy('llm-providers');

      expect(result['llm-providers'].healthyCount).toBe(3);
      expect(result['llm-providers'].totalCount).toBe(5);
    });
  });
});
