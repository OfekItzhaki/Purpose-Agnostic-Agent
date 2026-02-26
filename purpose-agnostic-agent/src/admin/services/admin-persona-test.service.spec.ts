import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { AdminPersonaTestService } from './admin-persona-test.service.js';
import { PersonaService } from '../../persona/persona.service.js';
import { RAGService } from '../../rag/rag.service.js';
import { ModelRouterService } from '../../model-router/model-router.service.js';
import { RAGSystemPromptService } from '../../common/rag-system-prompt.service.js';
import { StructuredLogger } from '../../common/logger.service.js';

describe('AdminPersonaTestService', () => {
  let service: AdminPersonaTestService;
  let personaService: jest.Mocked<PersonaService>;
  let ragService: jest.Mocked<RAGService>;
  let modelRouter: jest.Mocked<ModelRouterService>;
  let ragSystemPrompt: jest.Mocked<RAGSystemPromptService>;
  let logger: jest.Mocked<StructuredLogger>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminPersonaTestService,
        {
          provide: PersonaService,
          useValue: {
            getPersona: jest.fn(),
          } as any,
        },
        {
          provide: RAGService,
          useValue: {
            search: jest.fn(),
          } as any,
        },
        {
          provide: ModelRouterService,
          useValue: {
            generate: jest.fn(),
          } as any,
        },
        {
          provide: RAGSystemPromptService,
          useValue: {
            buildSystemPrompt: jest.fn(),
            buildUserMessage: jest.fn(),
          } as any,
        },
        {
          provide: StructuredLogger,
          useValue: {
            logWithContext: jest.fn(),
          } as any,
        },
      ],
    }).compile();

    service = module.get<AdminPersonaTestService>(AdminPersonaTestService);
    personaService = module.get(PersonaService);
    ragService = module.get(RAGService);
    modelRouter = module.get(ModelRouterService);
    ragSystemPrompt = module.get(RAGSystemPromptService);
    logger = module.get(StructuredLogger);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('testPersona', () => {
    it('should throw NotFoundException when persona does not exist', async () => {
      // Arrange
      (personaService.getPersona.mockResolvedValue as any)(null);

      // Act & Assert
      await expect(
        service.testPersona({
          personaId: 'non-existent',
          query: 'test query',
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should send query to persona and return response with retrieved chunks', async () => {
      // Arrange
      const mockPersona = {
        id: 'test-persona',
        name: 'Test Persona',
        description: 'Test',
        extraInstructions: 'Be helpful',
        knowledgeCategory: 'general',
        temperature: 0.7,
        maxTokens: 1000,
      };

      const mockRagResults = [
        {
          content: 'Kubernetes is a container orchestration platform',
          metadata: {
            sourcePath: '/knowledge/k8s.txt',
            category: 'general',
            chunkIndex: 0,
            timestamp: new Date(),
          },
          score: 0.95,
        },
        {
          content: 'Docker containers are lightweight',
          metadata: {
            sourcePath: '/knowledge/docker.txt',
            category: 'general',
            chunkIndex: 1,
            timestamp: new Date(),
          },
          score: 0.85,
        },
      ];

      const mockLlmResponse = {
        content: 'Kubernetes is a powerful orchestration tool for containers.',
        modelUsed: 'gemini-pro',
        tokensUsed: 150,
        latencyMs: 500,
      };

      (personaService.getPersona.mockResolvedValue as any)(mockPersona);
      (ragService.search.mockResolvedValue as any)(mockRagResults);
      ragSystemPrompt.buildSystemPrompt.mockReturnValue('System prompt');
      ragSystemPrompt.buildUserMessage.mockReturnValue(
        'User message with context',
      );
      modelRouter.generate.mockResolvedValue(mockLlmResponse);

      // Act
      const result = await service.testPersona({
        personaId: 'test-persona',
        query: 'What is Kubernetes?',
      });

      // Assert
      expect(result).toBeDefined();
      expect(result.answer).toBe(mockLlmResponse.content);
      expect(result.modelProvider).toBe('gemini-pro');
      expect(result.tokensUsed).toBe(150);
      expect(result.retrievedChunks).toHaveLength(2);
      expect(result.retrievedChunks[0].content).toBe(
        'Kubernetes is a container orchestration platform',
      );
      expect(result.retrievedChunks[0].relevanceScore).toBe(0.95);
      expect(result.retrievedChunks[1].relevanceScore).toBe(0.85);
    });

    it('should capture relevance scores for retrieved chunks', async () => {
      // Arrange
      const mockPersona = {
        id: 'test-persona',
        name: 'Test Persona',
        description: 'Test',
        extraInstructions: '',
        knowledgeCategory: 'technical',
        temperature: 0.5,
        maxTokens: 500,
      };

      const mockRagResults = [
        {
          content: 'Content 1',
          metadata: {
            sourcePath: '/doc1.txt',
            category: 'technical',
            chunkIndex: 0,
            timestamp: new Date(),
          },
          score: 0.92,
        },
      ];

      const mockLlmResponse = {
        content: 'Answer',
        modelUsed: 'ollama-llama3',
        tokensUsed: 100,
        latencyMs: 300,
      };

      (personaService.getPersona.mockResolvedValue as any)(mockPersona);
      (ragService.search.mockResolvedValue as any)(mockRagResults);
      ragSystemPrompt.buildSystemPrompt.mockReturnValue('System');
      ragSystemPrompt.buildUserMessage.mockReturnValue('User');
      modelRouter.generate.mockResolvedValue(mockLlmResponse);

      // Act
      const result = await service.testPersona({
        personaId: 'test-persona',
        query: 'test',
      });

      // Assert
      expect(result.retrievedChunks[0].relevanceScore).toBe(0.92);
      expect(result.retrievedChunks[0].sourcePath).toBe('/doc1.txt');
      expect(result.retrievedChunks[0].category).toBe('technical');
    });

    it('should track model provider and token usage', async () => {
      // Arrange
      const mockPersona = {
        id: 'test-persona',
        name: 'Test',
        description: 'Test',
        extraInstructions: '',
        knowledgeCategory: 'general',
      };

      const mockLlmResponse = {
        content: 'Response',
        modelUsed: 'gemini-pro',
        tokensUsed: 250,
        latencyMs: 400,
      };

      (personaService.getPersona.mockResolvedValue as any)(mockPersona);
      ragService.search.mockResolvedValue([]);
      ragSystemPrompt.buildSystemPrompt.mockReturnValue('System');
      ragSystemPrompt.buildUserMessage.mockReturnValue('User');
      modelRouter.generate.mockResolvedValue(mockLlmResponse);

      // Act
      const result = await service.testPersona({
        personaId: 'test-persona',
        query: 'test',
      });

      // Assert
      expect(result.modelProvider).toBe('gemini-pro');
      expect(result.tokensUsed).toBe(250);
      expect(result.latencyMs).toBeGreaterThanOrEqual(0);
    });

    it('should not create persistent sessions', async () => {
      // Arrange
      const mockPersona = {
        id: 'test-persona',
        name: 'Test',
        description: 'Test',
        extraInstructions: '',
        knowledgeCategory: 'general',
      };

      const mockLlmResponse = {
        content: 'Response',
        modelUsed: 'gemini-pro',
        tokensUsed: 100,
        latencyMs: 200,
      };

      (personaService.getPersona.mockResolvedValue as any)(mockPersona);
      ragService.search.mockResolvedValue([]);
      ragSystemPrompt.buildSystemPrompt.mockReturnValue('System');
      ragSystemPrompt.buildUserMessage.mockReturnValue('User');
      modelRouter.generate.mockResolvedValue(mockLlmResponse);

      // Act
      await service.testPersona({
        personaId: 'test-persona',
        query: 'test',
      });

      // Assert
      // Verify that no session-related methods were called
      // This is implicit - the service doesn't have SessionRepository injected
      expect(personaService.getPersona).toHaveBeenCalledWith('test-persona');
      expect(ragService.search).toHaveBeenCalled();
      expect(modelRouter.generate).toHaveBeenCalled();
    });

    it('should handle empty RAG results', async () => {
      // Arrange
      const mockPersona = {
        id: 'test-persona',
        name: 'Test',
        description: 'Test',
        extraInstructions: '',
        knowledgeCategory: 'general',
      };

      const mockLlmResponse = {
        content: "I don't have information about that.",
        modelUsed: 'gemini-pro',
        tokensUsed: 50,
        latencyMs: 150,
      };

      (personaService.getPersona.mockResolvedValue as any)(mockPersona);
      ragService.search.mockResolvedValue([]);
      ragSystemPrompt.buildSystemPrompt.mockReturnValue('System');
      ragSystemPrompt.buildUserMessage.mockReturnValue('User');
      modelRouter.generate.mockResolvedValue(mockLlmResponse);

      // Act
      const result = await service.testPersona({
        personaId: 'test-persona',
        query: 'unknown topic',
      });

      // Assert
      expect(result.retrievedChunks).toHaveLength(0);
      expect(result.answer).toBeDefined();
    });
  });
});
