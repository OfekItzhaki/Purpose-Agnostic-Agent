import { ChatSession, ChatMessage } from '../entities/chat-session.entity';

export interface SessionRepository {
  create(agentId: string, metadata?: Record<string, any>): Promise<ChatSession>;
  findById(sessionId: string): Promise<ChatSession | null>;
  addMessage(
    sessionId: string,
    role: 'user' | 'assistant',
    content: string,
    modelUsed?: string,
    tokensUsed?: number,
  ): Promise<ChatMessage>;
  getMessages(sessionId: string, limit?: number): Promise<ChatMessage[]>;
  update(sessionId: string, metadata: Record<string, any>): Promise<void>;
}
