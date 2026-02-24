export interface Message {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface GenerateRequest {
  systemPrompt: string;
  messages: Message[];
  temperature?: number;
  maxTokens?: number;
}

export interface GenerateResponse {
  content: string;
  modelUsed: string;
  tokensUsed: number;
  latencyMs: number;
}

export interface ProviderHealthStatus {
  name: string;
  tier: 'primary' | 'fallback' | 'local';
  available: boolean;
  lastFailure?: Date;
}

export interface LLMProvider {
  generate(request: GenerateRequest): Promise<GenerateResponse>;
  getName(): string;
  getTier(): 'primary' | 'fallback' | 'local';
  isAvailable(): Promise<boolean>;
}
