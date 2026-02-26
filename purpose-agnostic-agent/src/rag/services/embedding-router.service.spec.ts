import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { EmbeddingRouterService } from './embedding-router.service';
import { OpenAIEmbeddingService } from './openai-embedding.service';
import { OllamaEmbeddingService } from './ollama-embedding.service';

describe('EmbeddingRouterService', () => {
  let service: EmbeddingRouterService;
  let ollamaService: jest.Mocked<OllamaEmbeddingService>;
  let openaiService: jest.Mocked<OpenAIEmbeddingService>;
  let configService: jest.Mocked<ConfigService>;

  beforeEach(async () => {
    const mockOllamaService = {
      generateEmbedding: jest.fn(),
      generateBatchEmbeddings: jest.fn(),
      getDimensions: jest.fn().mockReturnValue(768),
    };

    const mockOpenAIService = {
      generateEmbedding: jest.fn(),
      generateBatchEmbeddings: jest.fn(),
      getDimensions: jest.fn().mockReturnValue(1536),
    };

    const mockConfigService = {
      get: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EmbeddingRouterService,
        {
          provide: OllamaEmbeddingService,
          useValue: mockOllamaService,
        },
        {
          provide: OpenAIEmbeddingService,
          useValue: mockOpenAIService,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<EmbeddingRouterService>(EmbeddingRouterService);
    ollamaService = module.get(OllamaEmbeddingService);
    openaiService = module.get(OpenAIEmbeddingService);
    configService = module.get(ConfigService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('generateEmbedding', () => {
    it('should use first provider in order (ollama by default)', async () => {
      const mockEmbedding = Array(768).fill(0.1);
      ollamaService.generateEmbedding.mockResolvedValue(mockEmbedding);

      const result = await service.generateEmbedding('test text');

      expect(result).toEqual(mockEmbedding);
      expect(ollamaService.generateEmbedding).toHaveBeenCalledWith(
        'test text',
      );
      expect(openaiService.generateEmbedding).not.toHaveBeenCalled();
    });

    it('should failover to second provider when first fails', async () => {
      const mockEmbedding = Array(1536).fill(0.2);
      ollamaService.generateEmbedding.mockRejectedValue(
        new Error('Ollama unavailable'),
      );
      openaiService.generateEmbedding.mockResolvedValue(mockEmbedding);

      const result = await service.generateEmbedding('test text');

      expect(result).toEqual(mockEmbedding);
      expect(ollamaService.generateEmbedding).toHaveBeenCalled();
      expect(openaiService.generateEmbedding).toHaveBeenCalledWith(
        'test text',
      );
    });

    it('should throw error when all providers fail', async () => {
      ollamaService.generateEmbedding.mockRejectedValue(
        new Error('Ollama error'),
      );
      openaiService.generateEmbedding.mockRejectedValue(
        new Error('OpenAI error'),
      );

      await expect(service.generateEmbedding('test text')).rejects.toThrow(
        'All embedding providers failed',
      );
    });

    it('should track failure count and disable provider after threshold', async () => {
      ollamaService.generateEmbedding.mockRejectedValue(
        new Error('Ollama error'),
      );
      openaiService.generateEmbedding.mockResolvedValue(Array(1536).fill(0.1));

      // Fail 3 times to reach threshold
      await service.generateEmbedding('test 1');
      await service.generateEmbedding('test 2');
      await service.generateEmbedding('test 3');

      // Fourth call should skip ollama entirely
      await service.generateEmbedding('test 4');

      // Ollama should only be called 3 times (not 4)
      expect(ollamaService.generateEmbedding).toHaveBeenCalledTimes(3);
      expect(openaiService.generateEmbedding).toHaveBeenCalledTimes(4);
    });

    it('should reset failure count on successful call', async () => {
      const mockEmbedding = Array(768).fill(0.1);

      // Fail once
      ollamaService.generateEmbedding.mockRejectedValueOnce(
        new Error('Temporary error'),
      );
      openaiService.generateEmbedding.mockResolvedValueOnce(
        Array(1536).fill(0.1),
      );
      await service.generateEmbedding('test 1');

      // Succeed
      ollamaService.generateEmbedding.mockResolvedValue(mockEmbedding);
      await service.generateEmbedding('test 2');

      // Failure count should be reset, so ollama should still be tried
      await service.generateEmbedding('test 3');

      // Ollama called 3 times: once failed, twice succeeded
      expect(ollamaService.generateEmbedding).toHaveBeenCalledTimes(3);
    });
  });

  describe('generateBatchEmbeddings', () => {
    it('should generate embeddings for multiple texts', async () => {
      const mockEmbeddings = [
        Array(768).fill(0.1),
        Array(768).fill(0.2),
        Array(768).fill(0.3),
      ];
      ollamaService.generateBatchEmbeddings.mockResolvedValue(mockEmbeddings);

      const texts = ['text 1', 'text 2', 'text 3'];
      const result = await service.generateBatchEmbeddings(texts);

      expect(result).toEqual(mockEmbeddings);
      expect(ollamaService.generateBatchEmbeddings).toHaveBeenCalledWith(
        texts,
      );
    });

    it('should failover to second provider for batch operations', async () => {
      const mockEmbeddings = [Array(1536).fill(0.1), Array(1536).fill(0.2)];
      ollamaService.generateBatchEmbeddings.mockRejectedValue(
        new Error('Batch failed'),
      );
      openaiService.generateBatchEmbeddings.mockResolvedValue(mockEmbeddings);

      const texts = ['text 1', 'text 2'];
      const result = await service.generateBatchEmbeddings(texts);

      expect(result).toEqual(mockEmbeddings);
      expect(openaiService.generateBatchEmbeddings).toHaveBeenCalledWith(
        texts,
      );
    });

    it('should throw error when all providers fail for batch', async () => {
      ollamaService.generateBatchEmbeddings.mockRejectedValue(
        new Error('Ollama batch error'),
      );
      openaiService.generateBatchEmbeddings.mockRejectedValue(
        new Error('OpenAI batch error'),
      );

      await expect(
        service.generateBatchEmbeddings(['text 1', 'text 2']),
      ).rejects.toThrow('All embedding providers failed for batch operation');
    });
  });

  describe('getDimensions', () => {
    it('should return dimensions of first available provider', () => {
      const dimensions = service.getDimensions();

      expect(dimensions).toBe(768); // Ollama default
    });

    it('should return default dimensions when no providers available', () => {
      // Create service with no providers by mocking config to return empty string
      configService.get.mockReturnValue('');

      const dimensions = service.getDimensions();

      expect(dimensions).toBe(768); // Default fallback
    });
  });

  describe('getActiveProvider', () => {
    it('should return name of first available provider', () => {
      const provider = service.getActiveProvider();

      expect(provider).toBe('ollama');
    });

    it('should return second provider when first is disabled', async () => {
      // Disable ollama by causing 3 failures
      ollamaService.generateEmbedding.mockRejectedValue(
        new Error('Ollama error'),
      );
      openaiService.generateEmbedding.mockResolvedValue(Array(1536).fill(0.1));

      await service.generateEmbedding('test 1');
      await service.generateEmbedding('test 2');
      await service.generateEmbedding('test 3');

      const provider = service.getActiveProvider();

      expect(provider).toBe('openai');
    });
  });

  describe('provider configuration', () => {
    it('should respect custom provider order from config', async () => {
      // Create new service with custom provider order
      configService.get.mockReturnValue('openai,ollama');

      const customService = new EmbeddingRouterService(
        configService,
        ollamaService,
        openaiService,
      );

      const mockEmbedding = Array(1536).fill(0.1);
      openaiService.generateEmbedding.mockResolvedValue(mockEmbedding);

      await customService.generateEmbedding('test text');

      // OpenAI should be called first
      expect(openaiService.generateEmbedding).toHaveBeenCalled();
      expect(ollamaService.generateEmbedding).not.toHaveBeenCalled();
    });
  });
});
