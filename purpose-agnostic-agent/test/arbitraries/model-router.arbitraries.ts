/**
 * Model Router-specific Arbitraries for Property-Based Testing
 */

import * as fc from 'fast-check';
import {
  providerNameArbitrary,
  providerTierArbitrary,
  httpStatusCodeArbitrary,
} from './common.arbitraries';

/**
 * Generate valid GenerateRequest objects
 */
export const generateRequestArbitrary = (): fc.Arbitrary<{
  systemPrompt: string;
  userMessage: string;
  context?: string;
  temperature?: number;
  maxTokens?: number;
}> =>
  fc.record({
    systemPrompt: fc.string({ minLength: 10, maxLength: 500 }),
    userMessage: fc.string({ minLength: 1, maxLength: 1000 }),
    context: fc.option(fc.string({ minLength: 0, maxLength: 2000 }), {
      nil: undefined,
    }),
    temperature: fc.option(fc.double({ min: 0.0, max: 2.0 }), { nil: undefined }),
    maxTokens: fc.option(fc.integer({ min: 100, max: 4096 }), { nil: undefined }),
  });

/**
 * Generate valid GenerateResponse objects
 */
export const generateResponseArbitrary = (): fc.Arbitrary<{
  text: string;
  provider: string;
  tokensUsed?: number;
}> =>
  fc.record({
    text: fc.string({ minLength: 10, maxLength: 2000 }),
    provider: providerNameArbitrary(),
    tokensUsed: fc.option(fc.integer({ min: 10, max: 4096 }), { nil: undefined }),
  });

/**
 * Generate provider health status objects
 */
export const providerHealthStatusArbitrary = (): fc.Arbitrary<{
  name: string;
  tier: string;
  isAvailable: boolean;
  lastChecked: Date;
  errorMessage?: string;
}> =>
  fc.record({
    name: providerNameArbitrary(),
    tier: providerTierArbitrary(),
    isAvailable: fc.boolean(),
    lastChecked: fc.date(),
    errorMessage: fc.option(fc.string({ minLength: 10, maxLength: 200 }), {
      nil: undefined,
    }),
  });

/**
 * Generate failover event objects
 */
export const failoverEventArbitrary = (): fc.Arbitrary<{
  timestamp: Date;
  failedProvider: string;
  successfulProvider: string;
  reason: string;
  requestId: string;
}> =>
  fc.record({
    timestamp: fc.date(),
    failedProvider: providerNameArbitrary(),
    successfulProvider: providerNameArbitrary(),
    reason: fc.constantFrom(
      'timeout',
      'http_5xx',
      'connection_error',
      'rate_limit',
      'circuit_open',
    ),
    requestId: fc.uuid(),
  });

/**
 * Generate LLM provider error objects
 */
export const llmProviderErrorArbitrary = (): fc.Arbitrary<{
  provider: string;
  statusCode?: number;
  message: string;
  isRetryable: boolean;
}> =>
  fc.record({
    provider: providerNameArbitrary(),
    statusCode: fc.option(httpStatusCodeArbitrary(), { nil: undefined }),
    message: fc.string({ minLength: 10, maxLength: 200 }),
    isRetryable: fc.boolean(),
  });

/**
 * Generate circuit breaker state objects
 */
export const circuitBreakerStateArbitrary = (): fc.Arbitrary<{
  state: 'CLOSED' | 'OPEN' | 'HALF_OPEN';
  failureCount: number;
  lastFailureTime?: Date;
  nextRetryTime?: Date;
}> =>
  fc.record({
    state: fc.constantFrom('CLOSED' as const, 'OPEN' as const, 'HALF_OPEN' as const),
    failureCount: fc.integer({ min: 0, max: 10 }),
    lastFailureTime: fc.option(fc.date(), { nil: undefined }),
    nextRetryTime: fc.option(fc.date(), { nil: undefined }),
  });
