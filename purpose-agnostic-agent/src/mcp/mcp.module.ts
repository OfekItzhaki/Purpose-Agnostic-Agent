import { Module, OnModuleInit } from '@nestjs/common';
import { MCPServerService } from './mcp-server.service';
import { MCPController } from './mcp.controller';
import { AskAgentTool } from './tools/ask-agent.tool';
import { SearchKnowledgeTool } from './tools/search-knowledge.tool';
import { ChatModule } from '../chat/chat.module';
import { RAGModule } from '../rag/rag.module';
import { StructuredLogger } from '../common/logger.service';

@Module({
  imports: [ChatModule, RAGModule],
  controllers: [MCPController],
  providers: [MCPServerService, AskAgentTool, SearchKnowledgeTool, StructuredLogger],
  exports: [MCPServerService],
})
export class MCPModule implements OnModuleInit {
  constructor(
    private readonly mcpServer: MCPServerService,
    private readonly askAgentTool: AskAgentTool,
    private readonly searchKnowledgeTool: SearchKnowledgeTool,
  ) {}

  onModuleInit() {
    this.mcpServer.registerTool(this.askAgentTool);
    this.mcpServer.registerTool(this.searchKnowledgeTool);
  }
}
