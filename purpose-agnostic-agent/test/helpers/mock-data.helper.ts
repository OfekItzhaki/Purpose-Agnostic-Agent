import { v4 as uuidv4 } from 'uuid';

/**
 * Mock data generators for testing
 */

export const mockPersona = {
  id: 'test-persona',
  name: 'Test Persona',
  description: 'A test persona for unit testing',
  systemPrompt: 'You are a helpful test assistant.',
  knowledgeCategory: 'test',
  temperature: 0.7,
  maxTokens: 1000,
};

export const mockChatRequest = {
  agent_id: 'test-persona',
  question: 'What is the meaning of life?',
  sessionId: uuidv4(),
};

export const mockChatResponse = {
  answer: 'The meaning of life is 42.',
  citations: [
    {
      sourcePath: '/knowledge/test/guide.pdf',
      content: 'The answer to life, the universe, and everything is 42.',
      score: 0.95,
    },
  ],
  modelUsed: 'gpt-4o',
  sessionId: uuidv4(),
};

export const mockChatSession = {
  id: uuidv4(),
  agent_id: 'test-persona',
  created_at: new Date(),
  updated_at: new Date(),
  metadata: {},
};

export const mockKnowledgeChunk = {
  id: uuidv4(),
  document_id: uuidv4(),
  chunk_index: 0,
  content: 'This is a test knowledge chunk.',
  embedding: new Array(1536).fill(0.1),
  token_count: 10,
  created_at: new Date(),
};

export const mockSearchResult = {
  content: 'This is a test search result.',
  metadata: {
    sourcePath: '/knowledge/test/document.pdf',
    category: 'test',
    chunkIndex: 0,
    timestamp: new Date(),
  },
  score: 0.92,
};

export const mockLLMResponse = {
  content: 'This is a test LLM response.',
  modelUsed: 'gpt-4o',
  tokensUsed: 50,
  latencyMs: 1000,
};

export const mockGenerateRequest = {
  systemPrompt: 'You are a helpful assistant.',
  messages: [{ role: 'user' as const, content: 'Hello!' }],
  temperature: 0.7,
  maxTokens: 1000,
};

export function createMockPersona(overrides: Partial<typeof mockPersona> = {}) {
  return { ...mockPersona, ...overrides };
}

export function createMockChatRequest(
  overrides: Partial<typeof mockChatRequest> = {},
) {
  return { ...mockChatRequest, ...overrides };
}

export function createMockSearchResult(
  overrides: Partial<typeof mockSearchResult> = {},
) {
  return { ...mockSearchResult, ...overrides };
}
