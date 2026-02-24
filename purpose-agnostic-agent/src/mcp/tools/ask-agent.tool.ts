import { Injectable } from '@nestjs/common';
import { ChatService } from '../../chat/chat.service';
import { MCPTool, MCPToolDefinition, MCPToolResult } from '../interfaces/mcp-tool.interface';
import { StructuredLogger } from '../../common/logger.service';

@Injectable()
export class AskAgentTool implements MCPTool {
  constructor(
    private readonly chatService: ChatService,
    private readonly logger: StructuredLogger,
  ) {}

  getDefinition(): MCPToolDefinition {
    return {
      name: 'ask_agent',
      description:
        'Ask a question to a specific agent persona. The agent will use its knowledge base and system prompt to provide an answer.',
      inputSchema: {
        type: 'object',
        properties: {
          agent_id: {
            type: 'string',
            description: 'The unique identifier of the agent persona to query',
          },
          question: {
            type: 'string',
            description: 'The question to ask the agent',
          },
          session_id: {
            type: 'string',
            description: 'Optional session ID for conversation continuity',
          },
        },
        required: ['agent_id', 'question'],
      },
    };
  }

  async execute(args: Record<string, any>): Promise<MCPToolResult> {
    const { agent_id, question, session_id } = args;

    if (!agent_id || !question) {
      return {
        content: [
          {
            type: 'text',
            text: 'Error: agent_id and question are required parameters',
          },
        ],
        isError: true,
      };
    }

    try {
      this.logger.logWithContext('info', 'MCP ask_agent tool invoked', {
        agent_id,
        session_id,
      });

      const response = await this.chatService.chat({
        agent_id,
        question,
        sessionId: session_id,
      });

      const resultText = JSON.stringify(
        {
          answer: response.answer,
          citations: response.citations,
          modelUsed: response.modelUsed,
          sessionId: response.sessionId,
        },
        null,
        2,
      );

      return {
        content: [
          {
            type: 'text',
            text: resultText,
          },
        ],
      };
    } catch (error) {
      this.logger.logWithContext('error', 'MCP ask_agent tool failed', {
        agent_id,
        error: error.message,
      });

      return {
        content: [
          {
            type: 'text',
            text: `Error: ${error.message}`,
          },
        ],
        isError: true,
      };
    }
  }
}
