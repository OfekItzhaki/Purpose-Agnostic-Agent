/**
 * Persona-specific Arbitraries for Property-Based Testing
 */

import * as fc from 'fast-check';
import {
  agentIdArbitrary,
  personaNameArbitrary,
  systemPromptArbitrary,
  knowledgeCategoryArbitrary,
  temperatureArbitrary,
  maxTokensArbitrary,
} from './common.arbitraries';

/**
 * Generate valid Persona objects (RAG-only architecture)
 */
export const personaArbitrary = (): fc.Arbitrary<{
  id: string;
  name: string;
  description: string;
  extraInstructions: string | null;
  knowledgeCategory: string;
  temperature: number;
  maxTokens: number;
}> =>
  fc.record({
    id: agentIdArbitrary(),
    name: personaNameArbitrary(),
    description: fc.string({ minLength: 10, maxLength: 500 }),
    extraInstructions: fc.option(systemPromptArbitrary(), { nil: null }),
    knowledgeCategory: knowledgeCategoryArbitrary(),
    temperature: temperatureArbitrary(),
    maxTokens: maxTokensArbitrary(),
  });

/**
 * Generate invalid Persona objects (missing required fields)
 */
export const invalidPersonaArbitrary = (): fc.Arbitrary<
  Partial<{
    id: string;
    name: string;
    description: string;
    extraInstructions: string | null;
    knowledgeCategory: string;
    temperature: number;
    maxTokens: number;
  }>
> =>
  fc.oneof(
    // Missing id
    fc.record({
      name: personaNameArbitrary(),
      description: fc.string(),
      extraInstructions: fc.option(systemPromptArbitrary(), { nil: null }),
      knowledgeCategory: knowledgeCategoryArbitrary(),
      temperature: temperatureArbitrary(),
      maxTokens: maxTokensArbitrary(),
    }),
    // Missing name
    fc.record({
      id: agentIdArbitrary(),
      description: fc.string(),
      extraInstructions: fc.option(systemPromptArbitrary(), { nil: null }),
      knowledgeCategory: knowledgeCategoryArbitrary(),
      temperature: temperatureArbitrary(),
      maxTokens: maxTokensArbitrary(),
    }),
    // Missing knowledgeCategory
    fc.record({
      id: agentIdArbitrary(),
      name: personaNameArbitrary(),
      description: fc.string(),
      extraInstructions: fc.option(systemPromptArbitrary(), { nil: null }),
      temperature: temperatureArbitrary(),
      maxTokens: maxTokensArbitrary(),
    }),
    // Invalid temperature (negative)
    fc.record({
      id: agentIdArbitrary(),
      name: personaNameArbitrary(),
      description: fc.string(),
      extraInstructions: fc.option(systemPromptArbitrary(), { nil: null }),
      knowledgeCategory: knowledgeCategoryArbitrary(),
      temperature: fc.double({ min: -10, max: -0.1 }),
      maxTokens: maxTokensArbitrary(),
    }),
  );

/**
 * Generate CreatePersonaDto objects (RAG-only architecture)
 */
export const createPersonaDtoArbitrary = (): fc.Arbitrary<{
  id: string;
  name: string;
  description: string;
  extraInstructions?: string | null;
  knowledgeCategory: string;
  temperature?: number;
  maxTokens?: number;
}> =>
  fc.record({
    id: agentIdArbitrary(),
    name: personaNameArbitrary(),
    description: fc.string({ minLength: 10, maxLength: 500 }),
    extraInstructions: fc.option(systemPromptArbitrary(), { nil: undefined }),
    knowledgeCategory: knowledgeCategoryArbitrary(),
    temperature: fc.option(temperatureArbitrary(), { nil: undefined }),
    maxTokens: fc.option(maxTokensArbitrary(), { nil: undefined }),
  });

/**
 * Generate UpdatePersonaDto objects (RAG-only architecture)
 */
export const updatePersonaDtoArbitrary = (): fc.Arbitrary<
  Partial<{
    name: string;
    description: string;
    extraInstructions: string | null;
    knowledgeCategory: string;
    temperature: number;
    maxTokens: number;
  }>
> =>
  fc.record(
    {
      name: fc.option(personaNameArbitrary(), { nil: undefined }),
      description: fc.option(fc.string({ minLength: 10, maxLength: 500 }), {
        nil: undefined,
      }),
      extraInstructions: fc.option(systemPromptArbitrary(), { nil: undefined }),
      knowledgeCategory: fc.option(knowledgeCategoryArbitrary(), {
        nil: undefined,
      }),
      temperature: fc.option(temperatureArbitrary(), { nil: undefined }),
      maxTokens: fc.option(maxTokensArbitrary(), { nil: undefined }),
    },
    { requiredKeys: [] },
  );
