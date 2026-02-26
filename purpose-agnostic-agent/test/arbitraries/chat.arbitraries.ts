/**
 * Chat-specific Arbitraries for Property-Based Testing
 */

import * as fc from 'fast-check';
import {
  agentIdArbitrary,
  chatQuestionArbitrary,
  sessionIdArbitrary,
  similarityScoreArbitrary,
  filePathArbitrary,
  chunkContentArbitrary,
  providerNameArbitrary,
} from './common.arbitraries';

/**
 * Generate valid ChatRequestDto objects
 */
export const chatRequestDtoArbitrary = (): fc.Arbitrary<{
  agent_id: string;
  question: string;
  sessionId?: string;
}> =>
  fc.record({
    agent_id: agentIdArbitrary(),
    question: chatQuestionArbitrary(),
    sessionId: fc.option(sessionIdArbitrary(), { nil: undefined }),
  });

/**
 * Generate valid Citation objects
 */
export const citationArbitrary = (): fc.Arbitrary<{
  sourcePath: string;
  content: string;
  score: number;
}> =>
  fc.record({
    sourcePath: filePathArbitrary(),
    content: chunkContentArbitrary(),
    score: similarityScoreArbitrary(),
  });

/**
 * Generate valid ChatResponseDto objects
 */
export const chatResponseDtoArbitrary = (): fc.Arbitrary<{
  answer: string;
  citations: Array<{
    sourcePath: string;
    content: string;
    score: number;
  }>;
  modelUsed: string;
  sessionId: string;
}> =>
  fc.record({
    answer: fc.string({ minLength: 10, maxLength: 2000 }),
    citations: fc.array(citationArbitrary(), { minLength: 0, maxLength: 10 }),
    modelUsed: providerNameArbitrary(),
    sessionId: sessionIdArbitrary(),
  });

/**
 * Generate invalid ChatRequestDto objects
 */
export const invalidChatRequestDtoArbitrary = (): fc.Arbitrary<
  Partial<{
    agent_id: string;
    question: string;
    sessionId: string;
  }>
> =>
  fc.oneof(
    // Missing agent_id
    fc.record({
      question: chatQuestionArbitrary(),
      sessionId: fc.option(sessionIdArbitrary(), { nil: undefined }),
    }),
    // Missing question
    fc.record({
      agent_id: agentIdArbitrary(),
      sessionId: fc.option(sessionIdArbitrary(), { nil: undefined }),
    }),
    // Empty question
    fc.record({
      agent_id: agentIdArbitrary(),
      question: fc.constant(''),
      sessionId: fc.option(sessionIdArbitrary(), { nil: undefined }),
    }),
    // Invalid agent_id format
    fc.record({
      agent_id: fc.constant('INVALID ID WITH SPACES'),
      question: chatQuestionArbitrary(),
      sessionId: fc.option(sessionIdArbitrary(), { nil: undefined }),
    }),
  );

/**
 * Generate chat message objects
 */
export const chatMessageArbitrary = (): fc.Arbitrary<{
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}> =>
  fc.record({
    role: fc.constantFrom('user' as const, 'assistant' as const),
    content: fc.string({ minLength: 1, maxLength: 2000 }),
    timestamp: fc.date(),
  });

/**
 * Generate chat session objects
 */
export const chatSessionArbitrary = (): fc.Arbitrary<{
  id: string;
  agentId: string;
  messages: Array<{
    role: 'user' | 'assistant';
    content: string;
    timestamp: Date;
  }>;
  createdAt: Date;
  updatedAt: Date;
}> =>
  fc.record({
    id: sessionIdArbitrary(),
    agentId: agentIdArbitrary(),
    messages: fc.array(chatMessageArbitrary(), { minLength: 0, maxLength: 20 }),
    createdAt: fc.date(),
    updatedAt: fc.date(),
  });
