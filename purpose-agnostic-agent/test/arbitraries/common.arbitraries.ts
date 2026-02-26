/**
 * Common Arbitraries for Property-Based Testing
 *
 * This file provides reusable fast-check arbitraries for generating
 * test data across the application.
 */

import * as fc from 'fast-check';

/**
 * Generate valid UUID v4 strings
 */
export const uuidArbitrary = (): fc.Arbitrary<string> =>
  fc
    .tuple(
      fc
        .array(fc.constantFrom(...'0123456789abcdef'), {
          minLength: 8,
          maxLength: 8,
        })
        .map((arr) => arr.join('')),
      fc
        .array(fc.constantFrom(...'0123456789abcdef'), {
          minLength: 4,
          maxLength: 4,
        })
        .map((arr) => arr.join('')),
      fc
        .array(fc.constantFrom(...'0123456789abcdef'), {
          minLength: 4,
          maxLength: 4,
        })
        .map((arr) => arr.join('')),
      fc
        .array(fc.constantFrom(...'0123456789abcdef'), {
          minLength: 4,
          maxLength: 4,
        })
        .map((arr) => arr.join('')),
      fc
        .array(fc.constantFrom(...'0123456789abcdef'), {
          minLength: 12,
          maxLength: 12,
        })
        .map((arr) => arr.join('')),
    )
    .map(([a, b, c, d, e]) => `${a}-${b}-4${c.slice(1)}-${d}-${e}`);

/**
 * Generate valid agent IDs (lowercase alphanumeric with hyphens)
 */
export const agentIdArbitrary = (): fc.Arbitrary<string> =>
  fc
    .stringMatching(/^[a-z0-9]+(-[a-z0-9]+)*$/)
    .filter((s) => s.length >= 3 && s.length <= 50);

/**
 * Generate valid persona names
 */
export const personaNameArbitrary = (): fc.Arbitrary<string> =>
  fc
    .string({ minLength: 1, maxLength: 100 })
    .filter((s) => s.trim().length > 0);

/**
 * Generate valid system prompts
 */
export const systemPromptArbitrary = (): fc.Arbitrary<string> =>
  fc.string({ minLength: 10, maxLength: 2000 });

/**
 * Generate valid knowledge categories
 */
export const knowledgeCategoryArbitrary = (): fc.Arbitrary<string> =>
  fc.constantFrom('general', 'technical', 'support', 'sales', 'hr', 'legal');

/**
 * Generate valid temperature values (0.0 to 2.0)
 */
export const temperatureArbitrary = (): fc.Arbitrary<number> =>
  fc.double({ min: 0.0, max: 2.0, noNaN: true });

/**
 * Generate valid max token values
 */
export const maxTokensArbitrary = (): fc.Arbitrary<number> =>
  fc.integer({ min: 100, max: 4096 });

/**
 * Generate valid chat questions
 */
export const chatQuestionArbitrary = (): fc.Arbitrary<string> =>
  fc
    .string({ minLength: 1, maxLength: 1000 })
    .filter((s) => s.trim().length > 0);

/**
 * Generate valid session IDs
 */
export const sessionIdArbitrary = (): fc.Arbitrary<string> => uuidArbitrary();

/**
 * Generate valid similarity scores (0.0 to 1.0)
 */
export const similarityScoreArbitrary = (): fc.Arbitrary<number> =>
  fc.double({ min: 0.0, max: 1.0, noNaN: true });

/**
 * Generate valid file paths
 */
export const filePathArbitrary = (): fc.Arbitrary<string> =>
  fc
    .array(fc.stringMatching(/^[a-zA-Z0-9_-]+$/), {
      minLength: 1,
      maxLength: 5,
    })
    .map((parts) => parts.join('/') + '.pdf');

/**
 * Generate valid embedding vectors (1536 dimensions for OpenAI)
 */
export const embeddingVectorArbitrary = (): fc.Arbitrary<number[]> =>
  fc.array(fc.double({ min: -1, max: 1, noNaN: true }), {
    minLength: 1536,
    maxLength: 1536,
  });

/**
 * Generate valid chunk content
 */
export const chunkContentArbitrary = (): fc.Arbitrary<string> =>
  fc.string({ minLength: 50, maxLength: 2000 });

/**
 * Generate valid HTTP status codes
 */
export const httpStatusCodeArbitrary = (): fc.Arbitrary<number> =>
  fc.constantFrom(200, 201, 204, 400, 401, 403, 404, 429, 500, 502, 503, 504);

/**
 * Generate valid error types (RFC 7807)
 */
export const errorTypeArbitrary = (): fc.Arbitrary<string> =>
  fc.constantFrom(
    'about:blank',
    '/errors/validation-error',
    '/errors/not-found',
    '/errors/rate-limit-exceeded',
    '/errors/internal-server-error',
  );

/**
 * Generate valid log levels
 */
export const logLevelArbitrary = (): fc.Arbitrary<string> =>
  fc.constantFrom('error', 'warn', 'info', 'debug');

/**
 * Generate valid provider names
 */
export const providerNameArbitrary = (): fc.Arbitrary<string> =>
  fc.constantFrom('gemini', 'gpt-4o', 'claude-3.5', 'ollama');

/**
 * Generate valid provider tiers
 */
export const providerTierArbitrary = (): fc.Arbitrary<string> =>
  fc.constantFrom('primary', 'fallback', 'local');
