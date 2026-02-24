export interface ChatSession {
  id: string;
  agent_id: string;
  created_at: Date;
  updated_at: Date;
  metadata?: Record<string, any>;
}

export interface ChatMessage {
  id: string;
  session_id: string;
  role: 'user' | 'assistant';
  content: string;
  model_used?: string;
  tokens_used?: number;
  created_at: Date;
}
