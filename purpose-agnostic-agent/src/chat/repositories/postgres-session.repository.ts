import { Injectable } from '@nestjs/common';
import { Pool } from 'pg';
import { v4 as uuidv4 } from 'uuid';
import { SessionRepository } from '../interfaces/session.repository.interface';
import { ChatSession, ChatMessage } from '../entities/chat-session.entity';

@Injectable()
export class PostgresSessionRepository implements SessionRepository {
  constructor(private readonly pool: Pool) {}

  async create(
    agentId: string,
    metadata?: Record<string, any>,
  ): Promise<ChatSession> {
    const id = uuidv4();
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000); // 24 hours from now

    const query = `
      INSERT INTO chat_sessions (id, agent_id, created_at, updated_at, expires_at, metadata)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `;

    const result = await this.pool.query(query, [
      id,
      agentId,
      now,
      now,
      expiresAt,
      metadata ? JSON.stringify(metadata) : null,
    ]);

    const row = result.rows[0];
    return {
      id: row.id,
      agent_id: row.agent_id,
      created_at: row.created_at,
      updated_at: row.updated_at,
      metadata: row.metadata ? JSON.parse(row.metadata) : undefined,
    };
  }

  async findById(sessionId: string): Promise<ChatSession | null> {
    const query = `
      SELECT * FROM chat_sessions 
      WHERE id = $1 
      AND (expires_at IS NULL OR expires_at > NOW())
    `;

    const result = await this.pool.query(query, [sessionId]);

    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];
    return {
      id: row.id,
      agent_id: row.agent_id,
      created_at: row.created_at,
      updated_at: row.updated_at,
      metadata: row.metadata ? JSON.parse(row.metadata) : undefined,
    };
  }

  async deleteExpiredSessions(): Promise<number> {
    const query = `
      DELETE FROM chat_sessions 
      WHERE expires_at IS NOT NULL AND expires_at < NOW()
    `;

    const result = await this.pool.query(query);
    return result.rowCount || 0;
  }

  async addMessage(
    sessionId: string,
    role: 'user' | 'assistant',
    content: string,
    modelUsed?: string,
    tokensUsed?: number,
  ): Promise<ChatMessage> {
    const id = uuidv4();
    const now = new Date();

    const query = `
      INSERT INTO chat_messages (id, session_id, role, content, model_used, tokens_used, created_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `;

    const result = await this.pool.query(query, [
      id,
      sessionId,
      role,
      content,
      modelUsed || null,
      tokensUsed || null,
      now,
    ]);

    // Update session updated_at
    await this.pool.query(
      'UPDATE chat_sessions SET updated_at = $1 WHERE id = $2',
      [now, sessionId],
    );

    const row = result.rows[0];
    return {
      id: row.id,
      session_id: row.session_id,
      role: row.role,
      content: row.content,
      model_used: row.model_used,
      tokens_used: row.tokens_used,
      created_at: row.created_at,
    };
  }

  async getMessages(
    sessionId: string,
    limit: number = 50,
  ): Promise<ChatMessage[]> {
    const query = `
      SELECT * FROM chat_messages
      WHERE session_id = $1
      ORDER BY created_at ASC
      LIMIT $2
    `;

    const result = await this.pool.query(query, [sessionId, limit]);

    return result.rows.map((row) => ({
      id: row.id,
      session_id: row.session_id,
      role: row.role,
      content: row.content,
      model_used: row.model_used,
      tokens_used: row.tokens_used,
      created_at: row.created_at,
    }));
  }

  async update(
    sessionId: string,
    metadata: Record<string, any>,
  ): Promise<void> {
    const query = `
      UPDATE chat_sessions
      SET metadata = $1, updated_at = $2
      WHERE id = $3
    `;

    await this.pool.query(query, [
      JSON.stringify(metadata),
      new Date(),
      sessionId,
    ]);
  }
}
