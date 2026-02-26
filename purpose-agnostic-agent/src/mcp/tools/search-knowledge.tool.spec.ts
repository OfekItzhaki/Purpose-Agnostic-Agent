import { Test, TestingModule } from '@nestjs/testing';
import { SearchKnowledgeTool } from './search-knowledge.tool';
import { RAGService } from '../../rag/rag.service';
import { StructuredLogger } from '../../common/logger.service';

describe('SearchKnowledgeTool', () => {
  let tool: SearchKnowledgeTool;
  let ragService: jest.Mocked<RAGService>;
  let logger: jest.Mocked<StructuredLogger>;

  beforeEach(async () => {
    const mockRAGService = {
      search: jest.fn(),
    };

    const mockLogger = {
      logWithContext: jest.fn(),
      log: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SearchKnowledgeTool,
        {
          provide: RAGService,
          useValue: mockRAGService,
        },
        {
          provide: StructuredLogger,
          useValue: mockLogger,
        },
      ],
    }).compile();

    tool = module.get<SearchKnowledgeTool>(SearchKnowledgeTool);
    ragService = module.get(RAGService);
    logger = module.get(StructuredLogger);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getDefinition', () => {
    it('should return tool definition', () => {
      const definition = tool.getDefinition();

      expect(definition).toEqual({
        name: 'search_knowledge',
        description: expect.any(String),
        inputSchema: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: expect.any(String),
            },
            category: {
              type: 'string',
              description: expect.any(String),
            },
            top_k: {
              type: 'number',
              description: expect.any(String),
            },
          },
          required: ['query'],
        },
      });
    });

    it('should have query as required field', () => {
      const definition = tool.getDefinition();

      expect(definition.inputSchema.required).toContain('query');
      expect(definition.inputSchema.required).not.toContain('category');
      expect(definition.inputSchema.required).not.toContain('top_k');
    });
  });

  describe('execute', () => {
    it('should search with valid query', async () => {
      const mockResults = [
        {
          content: 'Knowledge chunk 1',
          metadata: {
            sourcePath: 'knowledge/medical/doc1.pdf',
            category: 'medical',
            chunkIndex: 0,
            timestamp: new Date(),
          },
          score: 0.95,
        },
        {
          content: 'Knowledge chunk 2',
          metadata: {
            sourcePath: 'knowledge/medical/doc2.pdf',
            category: 'medical',
            chunkIndex: 1,
            timestamp: new Date(),
          },
          score: 0.88,
        },
      ];

      ragService.search.mockResolvedValue(mockResults);

      const result = await tool.execute({
        query: 'medical procedures',
      });

      expect(result.isError).toBeUndefined();
      expect(result.content).toHaveLength(1);
      expect(result.content[0].type).toBe('text');

      const parsedText = JSON.parse(result.content[0].text);
      expect(parsedText.query).toBe('medical procedures');
      expect(parsedText.resultCount).toBe(2);
      expect(parsedText.results).toHaveLength(2);
      expect(parsedText.results[0].content).toBe('Knowledge chunk 1');
      expect(parsedText.results[0].score).toBe(0.95);

      expect(ragService.search).toHaveBeenCalledWith('medical procedures', {
        topK: 5,
        minScore: 0.5,
      });
    });

    it('should apply category filter when specified', async () => {
      ragService.search.mockResolvedValue([]);

      await tool.execute({
        query: 'test query',
        category: 'medical',
      });

      expect(ragService.search).toHaveBeenCalledWith('test query', {
        category: 'medical',
        topK: 5,
        minScore: 0.5,
      });
    });

    it('should respect custom top_k parameter', async () => {
      ragService.search.mockResolvedValue([]);

      await tool.execute({
        query: 'test query',
        top_k: 10,
      });

      expect(ragService.search).toHaveBeenCalledWith('test query', {
        topK: 10,
        minScore: 0.5,
      });
    });

    it('should handle both category and top_k', async () => {
      ragService.search.mockResolvedValue([]);

      await tool.execute({
        query: 'test query',
        category: 'legal',
        top_k: 3,
      });

      expect(ragService.search).toHaveBeenCalledWith('test query', {
        category: 'legal',
        topK: 3,
        minScore: 0.5,
      });
    });

    it('should return error when query is missing', async () => {
      const result = await tool.execute({
        category: 'medical',
      });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('query is a required parameter');
      expect(ragService.search).not.toHaveBeenCalled();
    });

    it('should handle empty search results', async () => {
      ragService.search.mockResolvedValue([]);

      const result = await tool.execute({
        query: 'nonexistent query',
      });

      expect(result.isError).toBeUndefined();
      const parsedText = JSON.parse(result.content[0].text);
      expect(parsedText.resultCount).toBe(0);
      expect(parsedText.results).toEqual([]);
    });

    it('should handle RAG service errors', async () => {
      ragService.search.mockRejectedValue(
        new Error('Embedding service unavailable'),
      );

      const result = await tool.execute({
        query: 'test query',
      });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain(
        'Error: Embedding service unavailable',
      );
      expect(logger.logWithContext).toHaveBeenCalledWith(
        'error',
        'MCP search_knowledge tool failed',
        expect.objectContaining({
          query: 'test query',
          error: 'Embedding service unavailable',
        }),
      );
    });

    it('should log tool invocation', async () => {
      ragService.search.mockResolvedValue([]);

      await tool.execute({
        query: 'test query',
        category: 'medical',
        top_k: 7,
      });

      expect(logger.logWithContext).toHaveBeenCalledWith(
        'info',
        'MCP search_knowledge tool invoked',
        {
          category: 'medical',
          top_k: 7,
        },
      );
    });

    it('should include all metadata in results', async () => {
      const mockResults = [
        {
          content: 'Test content',
          metadata: {
            sourcePath: 'knowledge/test/doc.pdf',
            category: 'test',
            chunkIndex: 5,
            timestamp: new Date(),
          },
          score: 0.92,
        },
      ];

      ragService.search.mockResolvedValue(mockResults);

      const result = await tool.execute({
        query: 'test',
      });

      const parsedText = JSON.parse(result.content[0].text);
      expect(parsedText.results[0]).toMatchObject({
        content: 'Test content',
        sourcePath: 'knowledge/test/doc.pdf',
        category: 'test',
        chunkIndex: 5,
        score: 0.92,
      });
    });
  });
});
