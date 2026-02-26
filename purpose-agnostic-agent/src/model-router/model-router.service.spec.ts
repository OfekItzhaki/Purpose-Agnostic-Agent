import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ModelRouterService } from './model-router.service';
import { LLMProviderFactory } from './provider.factory';
import { UsageTrackerService } from './usage-tracker.service';
import { FailoverEvent } from './entities/failover-event.entity';
import {
  LLMProvider,
  GenerateRequest,
  GenerateResponse,
} from './interfaces/llm-provider.interface';

describe('ModelRouterService', () => {
  let service: ModelRouterService;
  let providerFactory: jest.Mocked<LLMProviderFactory>;
  let usageTracker: jest.Mocked<UsageTrackerService>;
  let failoverEventRepository: jest.Mocked<Repository<FailoverEvent>>;

  const mockProvider = (
    name: string,
    tier: 'primary' | 'fallback' | 'local',
    shouldFail = false,
  ): jest.Mocked<LLMProvider> => ({
    getName: jest.fn().mockReturnValue(name),
    getTier: jest.fn().mockReturnValue(tier),
    generate: jest.fn().mockImplementation(async () => {
      if (shouldFail) {
        throw new Error(`${name} failed`);
      }
      return {
        content: `Response from ${name}`,
        modelUsed: name,
        tokensUsed: 100,
        latencyMs: 50,
      } as GenerateResponse;
    }),
    isAvailable: jest.fn().mockResolvedValue(!shouldFail),
  });

  beforeEach(async () => {
    const mockFailoverRepo = {
      create: jest.fn().mockImplementation((data) => data),
      save: jest.fn().mockResolvedValue({}),
    };

    // Create default providers for initialization
    const defaultProviders = [
      mockProvider('gemini-pro', 'primary'),
      mockProvider('gpt-4o', 'fallback'),
      mockProvider('claude-3.5', 'fallback'),
      mockProvider('ollama', 'local'),
    ];

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ModelRouterService,
        {
          provide: LLMProviderFactory,
          useValue: {
            getAllProviders: jest.fn().mockReturnValue(defaultProviders),
            getProvidersByTier: jest.fn().mockReturnValue(
              new Map([
                ['primary', [defaultProviders[0]]],
                ['fallback', [defaultProviders[1], defaultProviders[2]]],
                ['local', [defaultProviders[3]]],
              ]),
            ),
          },
        },
        {
          provide: UsageTrackerService,
          useValue: {
            canMakeRequest: jest.fn(),
            trackUsage: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(FailoverEvent),
          useValue: mockFailoverRepo,
        },
      ],
    }).compile();

    service = module.get<ModelRouterService>(ModelRouterService);
    providerFactory = module.get(LLMProviderFactory);
    usageTracker = module.get(UsageTrackerService);
    failoverEventRepository = module.get(getRepositoryToken(FailoverEvent));
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('generate', () => {
    it('should successfully generate with primary provider', async () => {
      const primaryProvider = mockProvider('gemini-pro', 'primary');
      const fallbackProvider = mockProvider('gpt-4o', 'fallback');
      const localProvider = mockProvider('ollama', 'local');

      providerFactory.getAllProviders.mockReturnValue([
        primaryProvider,
        fallbackProvider,
        localProvider,
      ]);
      providerFactory.getProvidersByTier.mockReturnValue(
        new Map([
          ['primary', [primaryProvider]],
          ['fallback', [fallbackProvider]],
          ['local', [localProvider]],
        ]),
      );

      usageTracker.canMakeRequest.mockReturnValue({
        allowed: true,
        reason: '',
      });

      const request: GenerateRequest = {
        systemPrompt: 'You are a helpful assistant',
        messages: [{ role: 'user', content: 'Hello' }],
      };

      const response = await service.generate(request);

      expect(response.content).toBe('Response from gemini-pro');
      expect(response.modelUsed).toBe('gemini-pro');
      expect(primaryProvider.generate).toHaveBeenCalledWith(request);
      expect(fallbackProvider.generate).not.toHaveBeenCalled();
      expect(localProvider.generate).not.toHaveBeenCalled();
    });

    it('should failover to fallback provider when primary fails', async () => {
      const primaryProvider = mockProvider('gemini-pro', 'primary', true);
      const fallbackProvider = mockProvider('gpt-4o', 'fallback');
      const localProvider = mockProvider('ollama', 'local');

      providerFactory.getAllProviders.mockReturnValue([
        primaryProvider,
        fallbackProvider,
        localProvider,
      ]);
      providerFactory.getProvidersByTier.mockReturnValue(
        new Map([
          ['primary', [primaryProvider]],
          ['fallback', [fallbackProvider]],
          ['local', [localProvider]],
        ]),
      );

      usageTracker.canMakeRequest.mockReturnValue({
        allowed: true,
        reason: '',
      });

      const request: GenerateRequest = {
        systemPrompt: 'You are a helpful assistant',
        messages: [{ role: 'user', content: 'Hello' }],
      };

      const response = await service.generate(request);

      expect(response.content).toBe('Response from gpt-4o');
      expect(response.modelUsed).toBe('gpt-4o');
      expect(primaryProvider.generate).toHaveBeenCalled();
      expect(fallbackProvider.generate).toHaveBeenCalled();
      expect(localProvider.generate).not.toHaveBeenCalled();
    });

    it('should failover to local provider when primary and fallback fail', async () => {
      const primaryProvider = mockProvider('gemini-pro', 'primary', true);
      const fallbackProvider = mockProvider('gpt-4o', 'fallback', true);
      const localProvider = mockProvider('ollama', 'local');

      providerFactory.getAllProviders.mockReturnValue([
        primaryProvider,
        fallbackProvider,
        localProvider,
      ]);
      providerFactory.getProvidersByTier.mockReturnValue(
        new Map([
          ['primary', [primaryProvider]],
          ['fallback', [fallbackProvider]],
          ['local', [localProvider]],
        ]),
      );

      usageTracker.canMakeRequest.mockReturnValue({
        allowed: true,
        reason: '',
      });

      const request: GenerateRequest = {
        systemPrompt: 'You are a helpful assistant',
        messages: [{ role: 'user', content: 'Hello' }],
      };

      const response = await service.generate(request);

      expect(response.content).toBe('Response from ollama');
      expect(response.modelUsed).toBe('ollama');
      expect(primaryProvider.generate).toHaveBeenCalled();
      expect(fallbackProvider.generate).toHaveBeenCalled();
      expect(localProvider.generate).toHaveBeenCalled();
    });

    it('should throw error when all providers fail', async () => {
      const primaryProvider = mockProvider('gemini-pro', 'primary', true);
      const fallbackProvider = mockProvider('gpt-4o', 'fallback', true);
      const localProvider = mockProvider('ollama', 'local', true);

      providerFactory.getAllProviders.mockReturnValue([
        primaryProvider,
        fallbackProvider,
        localProvider,
      ]);
      providerFactory.getProvidersByTier.mockReturnValue(
        new Map([
          ['primary', [primaryProvider]],
          ['fallback', [fallbackProvider]],
          ['local', [localProvider]],
        ]),
      );

      usageTracker.canMakeRequest.mockReturnValue({
        allowed: true,
        reason: '',
      });

      const request: GenerateRequest = {
        systemPrompt: 'You are a helpful assistant',
        messages: [{ role: 'user', content: 'Hello' }],
      };

      await expect(service.generate(request)).rejects.toThrow(
        'All LLM providers failed',
      );
    });

    it('should log failover events', async () => {
      const primaryProvider = mockProvider('gemini-pro', 'primary', true);
      const fallbackProvider = mockProvider('gpt-4o', 'fallback');

      providerFactory.getAllProviders.mockReturnValue([
        primaryProvider,
        fallbackProvider,
      ]);
      providerFactory.getProvidersByTier.mockReturnValue(
        new Map([
          ['primary', [primaryProvider]],
          ['fallback', [fallbackProvider]],
        ]),
      );

      usageTracker.canMakeRequest.mockReturnValue({
        allowed: true,
        reason: '',
      });

      const request: GenerateRequest = {
        systemPrompt: 'You are a helpful assistant',
        messages: [{ role: 'user', content: 'Hello' }],
      };

      await service.generate(request);

      expect(failoverEventRepository.create).toHaveBeenCalled();
      expect(failoverEventRepository.save).toHaveBeenCalled();
    });

    it('should track usage for gemini provider', async () => {
      const primaryProvider = mockProvider('gemini-pro', 'primary');

      providerFactory.getAllProviders.mockReturnValue([primaryProvider]);
      providerFactory.getProvidersByTier.mockReturnValue(
        new Map([['primary', [primaryProvider]]]),
      );

      usageTracker.canMakeRequest.mockReturnValue({
        allowed: true,
        reason: '',
      });

      const request: GenerateRequest = {
        systemPrompt: 'You are a helpful assistant',
        messages: [{ role: 'user', content: 'Hello' }],
      };

      await service.generate(request);

      expect(usageTracker.trackUsage).toHaveBeenCalledWith('gemini-pro', 100);
    });

    it('should throw error when usage limit is reached', async () => {
      usageTracker.canMakeRequest.mockReturnValue({
        allowed: false,
        reason: 'Daily limit exceeded',
      });

      const request: GenerateRequest = {
        systemPrompt: 'You are a helpful assistant',
        messages: [{ role: 'user', content: 'Hello' }],
      };

      await expect(service.generate(request)).rejects.toThrow(
        'Usage limit: Daily limit exceeded',
      );
    });
  });

  describe('getProviderHealth', () => {
    it('should return health status for all providers', async () => {
      const primaryProvider = mockProvider('gemini-pro', 'primary');
      const fallbackProvider = mockProvider('gpt-4o', 'fallback');
      const localProvider = mockProvider('ollama', 'local');

      providerFactory.getAllProviders.mockReturnValue([
        primaryProvider,
        fallbackProvider,
        localProvider,
      ]);

      const healthStatuses = await service.getProviderHealth();

      expect(healthStatuses).toHaveLength(3);
      expect(healthStatuses[0]).toEqual({
        name: 'gemini-pro',
        tier: 'primary',
        available: true,
      });
      expect(healthStatuses[1]).toEqual({
        name: 'gpt-4o',
        tier: 'fallback',
        available: true,
      });
      expect(healthStatuses[2]).toEqual({
        name: 'ollama',
        tier: 'local',
        available: true,
      });
    });

    it('should mark unavailable providers correctly', async () => {
      const primaryProvider = mockProvider('gemini-pro', 'primary', true);
      const fallbackProvider = mockProvider('gpt-4o', 'fallback');

      providerFactory.getAllProviders.mockReturnValue([
        primaryProvider,
        fallbackProvider,
      ]);

      const healthStatuses = await service.getProviderHealth();

      expect(healthStatuses[0].available).toBe(false);
      expect(healthStatuses[1].available).toBe(true);
    });
  });

  describe('getProviderStatus', () => {
    it('should return provider status in correct format', async () => {
      const primaryProvider = mockProvider('gemini-pro', 'primary');
      const fallbackProvider = mockProvider('gpt-4o', 'fallback');

      providerFactory.getAllProviders.mockReturnValue([
        primaryProvider,
        fallbackProvider,
      ]);

      const statuses = await service.getProviderStatus();

      expect(statuses).toHaveLength(2);
      expect(statuses[0]).toEqual({
        name: 'gemini-pro',
        tier: 'primary',
        isHealthy: true,
      });
      expect(statuses[1]).toEqual({
        name: 'gpt-4o',
        tier: 'fallback',
        isHealthy: true,
      });
    });
  });
});
