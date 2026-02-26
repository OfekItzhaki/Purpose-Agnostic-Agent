import { Controller, Post, Body, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBody } from '@nestjs/swagger';
import { MCPServerService } from './mcp-server.service';

@ApiTags('mcp')
@Controller('mcp')
export class MCPController {
  constructor(private readonly mcpServer: MCPServerService) {}

  @Post()
  @ApiOperation({
    summary: 'Handle MCP protocol requests',
    description: 'Process MCP JSON-RPC 2.0 requests for tool invocation.',
  })
  @ApiBody({
    schema: {
      example: {
        jsonrpc: '2.0',
        id: 1,
        method: 'tools/call',
        params: {
          name: 'ask_agent',
          arguments: {
            agent_id: 'tech-support',
            question: 'How do I reset my password?',
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'MCP response',
    schema: {
      example: {
        jsonrpc: '2.0',
        id: 1,
        result: {
          content: [
            {
              type: 'text',
              text: '{"answer":"To reset your password...","citations":[]}',
            },
          ],
        },
      },
    },
  })
  async handleMCPRequest(@Body() request: any): Promise<any> {
    return this.mcpServer.handleRequest(request);
  }

  @Get('tools')
  @ApiOperation({
    summary: 'List available MCP tools',
    description:
      'Returns a list of all registered MCP tools with their schemas.',
  })
  @ApiResponse({
    status: 200,
    description: 'List of MCP tools',
    schema: {
      example: {
        tools: [
          {
            name: 'ask_agent',
            description: 'Ask a question to a specific agent persona',
            inputSchema: {
              type: 'object',
              properties: {
                agent_id: { type: 'string' },
                question: { type: 'string' },
              },
              required: ['agent_id', 'question'],
            },
          },
        ],
      },
    },
  })
  listTools() {
    return {
      tools: this.mcpServer.getToolDefinitions(),
    };
  }
}
