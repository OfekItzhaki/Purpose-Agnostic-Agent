import { Test, TestingModule } from '@nestjs/testing';
import { AskAgentTool } from './ask-agent.tool';
import { ChatService } from '../../chat/chat.service';
import { StructuredLogger } from '../../common/logger.service';

describe('AskAgentTool', () => {
  let tool: AskAgentTool;
  let chatService: jest.Mocked<ChatService>;
  let logger: jest.Mocked<StructuredLogger>;

  beforeEach(async () => {
    const mockChatService = {
      chat: jest.fn(),
    };

    const mockLogger = {
      logWithContext: jest.fn(),
      log: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AskAgentTool,
        {
          provide: ChatService,
          useValue: mockChatService,
        },
        {
          provide: StructuredLogger,
          useValue: mockLogger,
        },
      ],
    }).compile();

    tool = module.get<AskAgentTool>(AskAgentTool);
    chatService = module.get(ChatService);
    logger = module.get(StructuredLogger);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getDefinition', () => {
    it('should return tool definition', () => {
      const definition = tool.getDefinition();

      expect(definition).toEqual({
        name: 'ask_agent',
        description: expect.any(String),
        inputSchema: {
          type: 'object',
          properties: {
            agent_id: {
              type: 'string',
              description: expect.any(String),
            },
            question: {
              type: 'string',
              description: expect.any(String),
            },
            session_id: {
              type: 'string',
              description: expect.any(String),
            },
          },
          required: ['agent_id', 'question'],
        },
      });
    });

    it('should have required fields in schema', () => {
      const definition = tool.getDefinition();

      expect(definition.inputSchema.required).toContain('agent_id');
      expect(definition.inputSchema.required).toContain('question');
      expect(definition.inputSchema.required).not.toContain('session_id');
    });
  });

  describe('execute', () => {
    it('should execute with valid inputs', async () => {
      const mockResponse = {
        answer: 'This is the answer',
        citations: [
          {
            sourcePath: 'knowledge/test.pdf',
            content: 'Citation content',
            score: 0.95,
          },
        ],
        modelUsed: 'gpt-4o',
        sessionId: 'session-123',
      };

      chatService.chat.mockResolvedValue(mockResponse);

      const result = await tool.execute({
        agent_id: 'tech-support',
        question: 'How do I reset my password?',
        session_id: 'session-123',
      });

      expect(result.isError).toBeUndefined();
      expect(result.content).toHaveLength(1);
      expect(result.content[0].type).toBe('text');

      const parsedText = JSON.parse(result.content[0].text);
      expect(parsedText.answer).toBe('This is the answer');
      expect(parsedText.citations).toHaveLength(1);
      expect(parsedText.modelUsed).toBe('gpt-4o');
      expect(parsedText.sessionId).toBe('session-123');

      expect(chatService.chat).toHaveBeenCalledWith({
        agent_id: 'tech-support',
        question: 'How do I reset my password?',
        sessionId: 'session-123',
      });
    });

    it('should execute without session_id', async () => {
      const mockResponse = {
        answer: 'Answer without session',
        citations: [],
        modelUsed: 'gpt-4o',
        sessionId: 'new-session-456',
      };

      chatService.chat.mockResolvedValue(mockResponse);

      const result = await tool.execute({
        agent_id: 'tech-support',
        question: 'What is the weather?',
      });

      expect(result.isError).toBeUndefined();
      expect(chatService.chat).toHaveBeenCalledWith({
        agent_id: 'tech-support',
        question: 'What is the weather?',
        sessionId: undefined,
      });
    });

    it('should return error when agent_id is missing', async () => {
      const result = await tool.execute({
        question: 'How do I reset my password?',
      });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('agent_id and question are required');
      expect(chatService.chat).not.toHaveBeenCalled();
    });

    it('should return error when question is missing', async () => {
      const result = await tool.execute({
        agent_id: 'tech-support',
      });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('agent_id and question are required');
      expect(chatService.chat).not.toHaveBeenCalled();
    });

    it('should handle chat service errors', async () => {
      chatService.chat.mockRejectedValue(new Error('Agent not found'));

      const result = await tool.execute({
        agent_id: 'nonexistent',
        question: 'Test question',
      });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Error: Agent not found');
      expect(logger.logWithContext).toHaveBeenCalledWith(
        'error',
        'MCP ask_agent tool failed',
        expect.objectContaining({
          agent_id: 'nonexistent',
          error: 'Agent not found',
        }),
      );
    });

    it('should log tool invocation', async () => {
      const mockResponse = {
        answer: 'Test answer',
        citations: [],
        modelUsed: 'gpt-4o',
        sessionId: 'session-789',
      };

      chatService.chat.mockResolvedValue(mockResponse);

      await tool.execute({
        agent_id: 'tech-support',
        question: 'Test question',
        session_id: 'session-789',
      });

      expect(logger.logWithContext).toHaveBeenCalledWith(
        'info',
        'MCP ask_agent tool invoked',
        {
          agent_id: 'tech-support',
          session_id: 'session-789',
        },
      );
    });
  });
});
