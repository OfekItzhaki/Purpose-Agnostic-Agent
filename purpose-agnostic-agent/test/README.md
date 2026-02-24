# Testing Infrastructure

This directory contains the testing infrastructure for the Purpose-Agnostic Agent, including property-based testing configuration, arbitraries, and example tests.

## Overview

The project uses **property-based testing (PBT)** with [fast-check](https://github.com/dubzzz/fast-check) to validate universal correctness properties. PBT generates hundreds of random test cases to find edge cases that traditional example-based tests might miss.

## Directory Structure

```
test/
├── README.md                    # This file
├── setup.ts                     # Global test setup
├── pbt.config.ts               # Property-based testing configuration
├── helpers/                     # Test utilities
│   ├── test-module.helper.ts   # NestJS module creation helpers
│   └── mock-data.helper.ts     # Mock data generators
├── arbitraries/                 # fast-check arbitraries (data generators)
│   ├── common.arbitraries.ts   # Shared arbitraries (UUIDs, IDs, etc.)
│   ├── persona.arbitraries.ts  # Persona-specific arbitraries
│   ├── chat.arbitraries.ts     # Chat-specific arbitraries
│   ├── rag.arbitraries.ts      # RAG-specific arbitraries
│   └── model-router.arbitraries.ts  # Model router arbitraries
└── examples/                    # Example property tests
    ├── persona.pbt.spec.ts     # Persona property tests
    └── model-router.pbt.spec.ts # Model router property tests
```

## Configuration

### PBT Configuration (`pbt.config.ts`)

Three configurations are available:

1. **Standard** (`pbtConfig`): 100 iterations, verbose output
2. **Extended** (`pbtConfigExtended`): 500 iterations for critical logic
3. **Smoke** (`pbtConfigSmoke`): 20 iterations for quick validation

### Test Timeout

All property tests have a 30-second timeout (configured in `jest.config.js`).

### Seed-based Reproducibility

Tests use a seed for reproducibility. Set `PBT_SEED` environment variable to replay a specific test run:

```bash
PBT_SEED=12345 npm test
```

## Writing Property-Based Tests

### Basic Structure

```typescript
import * as fc from 'fast-check';
import { runPropertyTest } from '../pbt.config';
import { personaArbitrary } from '../arbitraries/persona.arbitraries';

describe('My Property Tests', () => {
  it('should satisfy some property', () => {
    runPropertyTest(
      fc.property(personaArbitrary(), (persona) => {
        // Test logic here
        // Return true if property holds, false otherwise
        return persona.temperature >= 0.0 && persona.temperature <= 2.0;
      })
    );
  });
});
```

### Using Arbitraries

Arbitraries generate random test data. Use existing arbitraries from the `arbitraries/` directory:

```typescript
import {
  personaArbitrary,
  chatRequestDtoArbitrary,
  generateRequestArbitrary,
} from '../arbitraries';

// Generate a random persona
fc.property(personaArbitrary(), (persona) => { /* ... */ });

// Generate multiple random values
fc.property(
  personaArbitrary(),
  chatRequestDtoArbitrary(),
  (persona, chatRequest) => { /* ... */ }
);
```

### Creating Custom Arbitraries

Add new arbitraries to the appropriate file in `arbitraries/`:

```typescript
export const myCustomArbitrary = (): fc.Arbitrary<MyType> =>
  fc.record({
    field1: fc.string(),
    field2: fc.integer({ min: 0, max: 100 }),
    field3: fc.constantFrom('option1', 'option2', 'option3'),
  });
```

## Available Arbitraries

### Common (`common.arbitraries.ts`)
- `uuidArbitrary()` - Valid UUID v4 strings
- `agentIdArbitrary()` - Valid agent IDs (kebab-case)
- `personaNameArbitrary()` - Valid persona names
- `systemPromptArbitrary()` - Valid system prompts
- `knowledgeCategoryArbitrary()` - Valid categories
- `temperatureArbitrary()` - Valid temperature values (0.0-2.0)
- `maxTokensArbitrary()` - Valid max token values (100-4096)
- `chatQuestionArbitrary()` - Valid chat questions
- `sessionIdArbitrary()` - Valid session IDs
- `similarityScoreArbitrary()` - Valid similarity scores (0.0-1.0)
- `filePathArbitrary()` - Valid file paths
- `embeddingVectorArbitrary()` - Valid embedding vectors (1536 dims)
- `chunkContentArbitrary()` - Valid chunk content
- `httpStatusCodeArbitrary()` - Valid HTTP status codes
- `errorTypeArbitrary()` - Valid RFC 7807 error types
- `logLevelArbitrary()` - Valid log levels
- `providerNameArbitrary()` - Valid LLM provider names
- `providerTierArbitrary()` - Valid provider tiers

### Persona (`persona.arbitraries.ts`)
- `personaArbitrary()` - Valid Persona objects
- `invalidPersonaArbitrary()` - Invalid Persona objects
- `createPersonaDtoArbitrary()` - Valid CreatePersonaDto
- `updatePersonaDtoArbitrary()` - Valid UpdatePersonaDto

### Chat (`chat.arbitraries.ts`)
- `chatRequestDtoArbitrary()` - Valid ChatRequestDto
- `citationArbitrary()` - Valid Citation objects
- `chatResponseDtoArbitrary()` - Valid ChatResponseDto
- `invalidChatRequestDtoArbitrary()` - Invalid ChatRequestDto
- `chatMessageArbitrary()` - Valid chat messages
- `chatSessionArbitrary()` - Valid chat sessions

### RAG (`rag.arbitraries.ts`)
- `knowledgeDocumentArbitrary()` - Valid KnowledgeDocument
- `knowledgeChunkArbitrary()` - Valid KnowledgeChunk
- `searchResultArbitrary()` - Valid search results
- `searchQueryArbitrary()` - Valid search queries
- `pdfTextArbitrary()` - Valid PDF text content
- `textChunkArbitrary()` - Valid text chunks
- `documentIngestionJobArbitrary()` - Valid ingestion jobs

### Model Router (`model-router.arbitraries.ts`)
- `generateRequestArbitrary()` - Valid GenerateRequest
- `generateResponseArbitrary()` - Valid GenerateResponse
- `providerHealthStatusArbitrary()` - Valid provider health status
- `failoverEventArbitrary()` - Valid failover events
- `llmProviderErrorArbitrary()` - Valid LLM errors
- `circuitBreakerStateArbitrary()` - Valid circuit breaker states

## Running Tests

### Run All Tests
```bash
npm test
```

### Run Tests in Watch Mode
```bash
npm run test:watch
```

### Run Tests with Coverage
```bash
npm run test:cov
```

### Run Specific Test File
```bash
npm test -- persona.pbt.spec.ts
```

### Run with Specific Seed
```bash
PBT_SEED=12345 npm test
```

## Property Test Examples

See `examples/` directory for complete examples:

- `persona.pbt.spec.ts` - Persona validation, round-trip serialization
- `model-router.pbt.spec.ts` - Failover logic, circuit breaker behavior

## Best Practices

### 1. Test Universal Properties

Property tests should validate universal truths that hold for ALL inputs:

✅ Good: "All personas should have temperature between 0.0 and 2.0"
❌ Bad: "Persona 'tech-support' should have temperature 0.7"

### 2. Use Descriptive Property Names

Name properties after the requirement they validate:

```typescript
describe('Property 10: Invalid Persona Rejection', () => {
  // Validates: Requirements 3.2
});
```

### 3. Keep Properties Simple

Each property should test ONE universal truth:

```typescript
// Good: Single property
return persona.temperature >= 0.0 && persona.temperature <= 2.0;

// Bad: Multiple unrelated properties
return persona.temperature >= 0.0 && 
       persona.name.length > 0 && 
       persona.id.includes('-');
```

### 4. Use Shrinking

fast-check automatically shrinks failing cases to minimal examples. Don't disable this feature.

### 5. Document Requirements

Always document which requirements each property validates:

```typescript
/**
 * Property 21: Persona Configuration Round-Trip
 * Validates: Requirements 10.4
 */
```

## Troubleshooting

### Test Timeout

If tests timeout, increase the timeout in `jest.config.js`:

```javascript
testTimeout: 60000, // 60 seconds
```

### Flaky Tests

If a test fails intermittently, note the seed and reproduce:

```bash
# Seed is printed in test output
PBT_SEED=<seed> npm test
```

### Slow Tests

Reduce iterations for faster feedback during development:

```typescript
import { runSmokePropertyTest } from '../pbt.config';

runSmokePropertyTest(/* ... */); // Only 20 iterations
```

## Resources

- [fast-check Documentation](https://github.com/dubzzz/fast-check)
- [Property-Based Testing Guide](https://github.com/dubzzz/fast-check/blob/main/documentation/Guides.md)
- [Arbitraries Reference](https://github.com/dubzzz/fast-check/blob/main/documentation/Arbitraries.md)

## Next Steps

1. ✅ Configure fast-check (DONE)
2. ✅ Create arbitraries (DONE)
3. ✅ Write example tests (DONE)
4. ⏳ Write property tests for all modules (see `tasks.md`)
5. ⏳ Write unit tests for specific examples
6. ⏳ Write integration tests for API endpoints
7. ⏳ Write E2E tests for complete flows

---

**Status:** ✅ Infrastructure Complete - Ready for Test Implementation  
**Last Updated:** 2026-02-24
