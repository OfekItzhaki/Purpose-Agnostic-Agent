import { Injectable } from '@nestjs/common';
import { RAGService } from '../../rag/rag.service';
import {
  MCPTool,
  MCPToolDefinition,
  MCPToolResult,
} from '../interfaces/mcp-tool.interface';
import { StructuredLogger } from '../../common/logger.service';

@Injectable()
export class SearchKnowledgeTool implements MCPTool {
  constructor(
    private readonly ragService: RAGService,
    private readonly logger: StructuredLogger,
  ) {}

  getDefinition(): MCPToolDefinition {
    return {
      name: 'search_knowledge',
      description:
        'Search the knowledge base for relevant information. Returns chunks of text with similarity scores and metadata.',
      inputSchema: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: 'The search query',
          },
          category: {
            type: 'string',
            description: 'Optional category filter to narrow search results',
          },
          top_k: {
            type: 'number',
            description: 'Number of results to return (default: 5)',
          },
        },
        required: ['query'],
      },
    };
  }

  async execute(args: Record<string, any>): Promise<MCPToolResult> {
    const { query, category, top_k } = args;

    if (!query) {
      return {
        content: [
          {
            type: 'text',
            text: 'Error: query is a required parameter',
          },
        ],
        isError: true,
      };
    }

    try {
      this.logger.logWithContext('info', 'MCP search_knowledge tool invoked', {
        category,
        top_k: top_k || 5,
      });

      const results = await this.ragService.search(query, {
        category,
        topK: top_k || 5,
        minScore: 0.5,
      });

      const resultText = JSON.stringify(
        {
          query,
          category: category || 'all',
          resultCount: results.length,
          results: results.map((r) => ({
            content: r.content,
            sourcePath: r.metadata.sourcePath,
            category: r.metadata.category,
            chunkIndex: r.metadata.chunkIndex,
            score: r.score,
          })),
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
      this.logger.logWithContext('error', 'MCP search_knowledge tool failed', {
        query,
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
