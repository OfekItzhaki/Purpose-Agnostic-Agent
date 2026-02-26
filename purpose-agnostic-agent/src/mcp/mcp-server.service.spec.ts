import { Test, TestingModule } from '@nestjs/testing';
import { MCPServerService } from './mcp-server.service';
import { StructuredLogger } from '../common/logger.service';
import { MCPTool, MCPToolDefinition } from './interfaces/mcp-tool.interface';

describe('MCPServerService', () => {
  let service: MCPServerService;
  let logger: jest.Mocked<StructuredLogger>;

  const mockTool: MCPTool = {
    getDefinition: jest.fn().mockReturnValue({
      name: 'test_tool',
      description: 'A test tool',
      inputSchema: {
        type: 'object',
        properties: {
          param1: { type: 'string' },
        },
        required: ['param1'],
      },
    }),
    execute: jest.fn(),
  };

  beforeEach(async () => {
    const mockLogger = {
      logWithContext: jest.fn(),
      log: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MCPServerService,
        {
          provide: StructuredLogger,
          useValue: mockLogger,
        },
      ],
    }).compile();

    service = module.get<MCPServerService>(MCPServerService);
    logger = module.get(StructuredLogger);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('registerTool', () => {
    it('should register a tool', () => {
      service.registerTool(mockTool);

      const definitions = service.getToolDefinitions();
      expect(definitions).toHaveLength(1);
      expect(definitions[0].name).toBe('test_tool');
      expect(logger.logWithContext).toHaveBeenCalledWith(
        'info',
        'MCP tool registered',
        { toolName: 'test_tool' },
      );
    });

    it('should register multiple tools', () => {
      const tool2: MCPTool = {
        getDefinition: jest.fn().mockReturnValue({
          name: 'tool2',
          description: 'Second tool',
          inputSchema: { type: 'object', properties: {}, required: [] },
        }),
        execute: jest.fn(),
      };

      service.registerTool(mockTool);
      service.registerTool(tool2);

      const definitions = service.getToolDefinitions();
      expect(definitions).toHaveLength(2);
    });
  });

  describe('handleRequest - initialize', () => {
    it('should handle initialize request', async () => {
      const request = {
        jsonrpc: '2.0' as const,
        id: 1,
        method: 'initialize',
      };

      const response = await service.handleRequest(request);

      expect(response).toEqual({
        jsonrpc: '2.0',
        id: 1,
        result: {
          protocolVersion: '2024-11-05',
          capabilities: {
            tools: {},
          },
          serverInfo: {
            name: 'purpose-agnostic-agent',
            version: '1.0.0',
          },
        },
      });
    });
  });

  describe('handleRequest - tools/list', () => {
    it('should list registered tools', async () => {
      service.registerTool(mockTool);

      const request = {
        jsonrpc: '2.0' as const,
        id: 2,
        method: 'tools/list',
      };

      const response = await service.handleRequest(request);

      expect(response).toEqual({
        jsonrpc: '2.0',
        id: 2,
        result: {
          tools: [
            {
              name: 'test_tool',
              description: 'A test tool',
              inputSchema: {
                type: 'object',
                properties: {
                  param1: { type: 'string' },
                },
                required: ['param1'],
              },
            },
          ],
        },
      });
    });

    it('should return empty list when no tools registered', async () => {
      const request = {
        jsonrpc: '2.0' as const,
        id: 3,
        method: 'tools/list',
      };

      const response = await service.handleRequest(request);

      expect(response).toEqual({
        jsonrpc: '2.0',
        id: 3,
        result: {
          tools: [],
        },
      });
    });
  });

  describe('handleRequest - tools/call', () => {
    beforeEach(() => {
      service.registerTool(mockTool);
    });

    it('should call tool with valid inputs', async () => {
      const mockResult = {
        content: [{ type: 'text', text: 'Tool executed successfully' }],
      };
      (mockTool.execute as jest.Mock).mockResolvedValue(mockResult);

      const request = {
        jsonrpc: '2.0' as const,
        id: 4,
        method: 'tools/call',
        params: {
          name: 'test_tool',
          arguments: { param1: 'value1' },
        },
      };

      const response = await service.handleRequest(request);

      expect(response).toEqual({
        jsonrpc: '2.0',
        id: 4,
        result: mockResult,
      });
      expect(mockTool.execute).toHaveBeenCalledWith({ param1: 'value1' });
    });

    it('should return error when tool name is missing', async () => {
      const request = {
        jsonrpc: '2.0' as const,
        id: 5,
        method: 'tools/call',
        params: {
          arguments: { param1: 'value1' },
        },
      };

      const response = await service.handleRequest(request);

      expect(response).toEqual({
        jsonrpc: '2.0',
        id: 5,
        error: {
          code: -32602,
          message: 'Invalid params: missing tool name',
        },
      });
    });

    it('should return error when tool not found', async () => {
      const request = {
        jsonrpc: '2.0' as const,
        id: 6,
        method: 'tools/call',
        params: {
          name: 'nonexistent_tool',
          arguments: {},
        },
      };

      const response = await service.handleRequest(request);

      expect(response).toEqual({
        jsonrpc: '2.0',
        id: 6,
        error: {
          code: -32602,
          message: 'Tool not found: nonexistent_tool',
        },
      });
    });

    it('should handle tool execution errors', async () => {
      (mockTool.execute as jest.Mock).mockRejectedValue(
        new Error('Tool execution failed'),
      );

      const request = {
        jsonrpc: '2.0' as const,
        id: 7,
        method: 'tools/call',
        params: {
          name: 'test_tool',
          arguments: { param1: 'value1' },
        },
      };

      const response = await service.handleRequest(request);

      expect(response).toEqual({
        jsonrpc: '2.0',
        id: 7,
        error: {
          code: -32603,
          message: 'Tool execution failed: Tool execution failed',
        },
      });
      expect(logger.logWithContext).toHaveBeenCalledWith(
        'error',
        'MCP tool execution failed',
        expect.objectContaining({
          toolName: 'test_tool',
          error: 'Tool execution failed',
        }),
      );
    });

    it('should handle missing arguments', async () => {
      const mockResult = {
        content: [{ type: 'text', text: 'Executed with empty args' }],
      };
      (mockTool.execute as jest.Mock).mockResolvedValue(mockResult);

      const request = {
        jsonrpc: '2.0' as const,
        id: 8,
        method: 'tools/call',
        params: {
          name: 'test_tool',
        },
      };

      const response = await service.handleRequest(request);

      expect(response).toEqual({
        jsonrpc: '2.0',
        id: 8,
        result: mockResult,
      });
      expect(mockTool.execute).toHaveBeenCalledWith({});
    });
  });

  describe('handleRequest - unknown method', () => {
    it('should return method not found error', async () => {
      const request = {
        jsonrpc: '2.0' as const,
        id: 9,
        method: 'unknown_method',
      };

      const response = await service.handleRequest(request);

      expect(response).toEqual({
        jsonrpc: '2.0',
        id: 9,
        error: {
          code: -32601,
          message: 'Method not found: unknown_method',
        },
      });
    });
  });

  describe('error handling', () => {
    it('should handle unexpected errors gracefully', async () => {
      // Create a tool that throws during getDefinition
      const badTool: MCPTool = {
        getDefinition: jest.fn().mockImplementation(() => {
          throw new Error('Unexpected error');
        }),
        execute: jest.fn(),
      };

      // This should not throw
      expect(() => service.registerTool(badTool)).toThrow();
    });
  });

  describe('MCP protocol serialization', () => {
    it('should maintain JSON-RPC 2.0 format in responses', async () => {
      const request = {
        jsonrpc: '2.0' as const,
        id: 'test-id',
        method: 'initialize',
      };

      const response = await service.handleRequest(request);

      expect(response.jsonrpc).toBe('2.0');
      expect(response.id).toBe('test-id');
      expect(response).toHaveProperty('result');
    });

    it('should handle string IDs', async () => {
      const request = {
        jsonrpc: '2.0' as const,
        id: 'string-id-123',
        method: 'tools/list',
      };

      const response = await service.handleRequest(request);

      expect(response.id).toBe('string-id-123');
    });

    it('should handle numeric IDs', async () => {
      const request = {
        jsonrpc: '2.0' as const,
        id: 42,
        method: 'tools/list',
      };

      const response = await service.handleRequest(request);

      expect(response.id).toBe(42);
    });
  });
});
