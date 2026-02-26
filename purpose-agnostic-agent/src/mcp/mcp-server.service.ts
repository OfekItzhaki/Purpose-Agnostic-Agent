import { Injectable, OnModuleInit } from '@nestjs/common';
import { StructuredLogger } from '../common/logger.service';
import {
  MCPTool,
  MCPToolDefinition,
  MCPToolResult,
} from './interfaces/mcp-tool.interface';

interface MCPRequest {
  jsonrpc: '2.0';
  id: string | number;
  method: string;
  params?: any;
}

interface MCPResponse {
  jsonrpc: '2.0';
  id: string | number;
  result?: any;
  error?: {
    code: number;
    message: string;
    data?: any;
  };
}

@Injectable()
export class MCPServerService implements OnModuleInit {
  private tools: Map<string, MCPTool> = new Map();

  constructor(private readonly logger: StructuredLogger) {}

  onModuleInit() {
    this.logger.logWithContext('info', 'MCP Server initialized', {
      toolCount: this.tools.size,
    });
  }

  registerTool(tool: MCPTool): void {
    const definition = tool.getDefinition();
    this.tools.set(definition.name, tool);
    this.logger.logWithContext('info', 'MCP tool registered', {
      toolName: definition.name,
    });
  }

  async handleRequest(request: MCPRequest): Promise<MCPResponse> {
    try {
      switch (request.method) {
        case 'tools/list':
          return this.handleListTools(request);
        case 'tools/call':
          return await this.handleCallTool(request);
        case 'initialize':
          return this.handleInitialize(request);
        default:
          return this.createErrorResponse(
            request.id,
            -32601,
            `Method not found: ${request.method}`,
          );
      }
    } catch (error) {
      this.logger.logWithContext('error', 'MCP request handling failed', {
        method: request.method,
        error: error.message,
      });
      return this.createErrorResponse(request.id, -32603, 'Internal error', {
        message: error.message,
      });
    }
  }

  private handleInitialize(request: MCPRequest): MCPResponse {
    return {
      jsonrpc: '2.0',
      id: request.id,
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
    };
  }

  private handleListTools(request: MCPRequest): MCPResponse {
    const toolDefinitions: MCPToolDefinition[] = Array.from(
      this.tools.values(),
    ).map((tool) => tool.getDefinition());

    return {
      jsonrpc: '2.0',
      id: request.id,
      result: {
        tools: toolDefinitions,
      },
    };
  }

  private async handleCallTool(request: MCPRequest): Promise<MCPResponse> {
    const { name, arguments: args } = request.params || {};

    if (!name) {
      return this.createErrorResponse(
        request.id,
        -32602,
        'Invalid params: missing tool name',
      );
    }

    const tool = this.tools.get(name);
    if (!tool) {
      return this.createErrorResponse(
        request.id,
        -32602,
        `Tool not found: ${name}`,
      );
    }

    try {
      const result = await tool.execute(args || {});
      return {
        jsonrpc: '2.0',
        id: request.id,
        result,
      };
    } catch (error) {
      this.logger.logWithContext('error', 'MCP tool execution failed', {
        toolName: name,
        error: error.message,
      });
      return this.createErrorResponse(
        request.id,
        -32603,
        `Tool execution failed: ${error.message}`,
      );
    }
  }

  private createErrorResponse(
    id: string | number,
    code: number,
    message: string,
    data?: any,
  ): MCPResponse {
    return {
      jsonrpc: '2.0',
      id,
      error: {
        code,
        message,
        data,
      },
    };
  }

  getToolDefinitions(): MCPToolDefinition[] {
    return Array.from(this.tools.values()).map((tool) => tool.getDefinition());
  }
}
