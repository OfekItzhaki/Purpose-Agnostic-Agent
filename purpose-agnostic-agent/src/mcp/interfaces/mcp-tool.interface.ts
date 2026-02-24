export interface MCPToolInputSchema {
  type: 'object';
  properties: Record<string, any>;
  required?: string[];
}

export interface MCPToolDefinition {
  name: string;
  description: string;
  inputSchema: MCPToolInputSchema;
}

export interface MCPToolResult {
  content: Array<{
    type: 'text';
    text: string;
  }>;
  isError?: boolean;
}

export interface MCPTool {
  getDefinition(): MCPToolDefinition;
  execute(args: Record<string, any>): Promise<MCPToolResult>;
}
