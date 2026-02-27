# LLM Fallback and API Key Validation Bugfix Design

## Overview

This bugfix addresses two critical issues in the LLM provider system that prevent graceful degradation and proper error reporting:

1. **Missing Fallback Logic**: The system requires `GOOGLE_AI_API_KEY` at startup (via Joi validation) and throws an error in `model-router.module.ts` if missing, preventing Ollama from being used as a fallback when external API keys are unavailable.

2. **Poor API Key Validation**: When the Google AI Studio API key is invalid or expired, the Gemini provider throws generic errors that propagate as HTTP 500 responses, instead of providing clear validation feedback to users.

The fix will make API keys optional, detect invalid/missing keys early, adjust provider tier selection dynamically, and provide clear error messages for API key validation failures.

## Glossary

- **Bug_Condition (C)**: The condition that triggers the bug - when API keys are missing, invalid, or expired
- **Property (P)**: The desired behavior - graceful fallback to Ollama and clear error messages
- **Preservation**: Existing provider selection and failover logic that must remain unchanged when API keys are valid
- **ModelRouterService**: The service in `src/model-router/model-router.service.ts` that orchestrates provider selection and failover
- **LLMProviderFactory**: The factory in `src/model-router/provider.factory.ts` that creates and manages provider instances
- **GeminiProvider**: The provider in `src/model-router/providers/gemini.provider.ts` that interfaces with Google AI Studio
- **OllamaProvider**: The local provider in `src/model-router/providers/ollama.provider.ts` that uses tinyllama model
- **Provider Tier**: Classification of providers as 'primary' (cloud APIs), 'fallback' (secondary cloud APIs), or 'local' (Ollama)

## Bug Details

### Fault Condition

The bug manifests in two scenarios:

**Scenario 1: Missing API Keys**
The application fails to start when `GOOGLE_AI_API_KEY` or `OPENAI_API_KEY` are missing because `configuration.ts` marks them as required via Joi validation, and `model-router.module.ts` throws an error if `GOOGLE_AI_API_KEY` is not present.

**Scenario 2: Invalid/Expired API Keys**
When the Google AI Studio API key is invalid or expired, the `GeminiProvider.generate()` method catches the error and throws a generic `Error` with message "Gemini API error: [original message]". This error propagates through the failover chain and eventually returns as an HTTP 500 error without clear indication that the API key is the problem.

**Formal Specification:**
```
FUNCTION isBugCondition(input)
  INPUT: input of type { apiKey: string | undefined, requestContext: 'startup' | 'runtime' }
  OUTPUT: boolean
  
  RETURN (input.apiKey IS undefined OR input.apiKey IS empty OR input.apiKey IS invalid)
         AND (input.requestContext == 'startup' AND applicationFailsToStart)
         OR (input.requestContext == 'runtime' AND returnsHTTP500WithoutClearError)
END FUNCTION
```

### Examples

- **Missing Key at Startup**: User starts application without `GOOGLE_AI_API_KEY` → Application throws "GOOGLE_AI_API_KEY is required" and fails to start → Expected: Application starts and uses Ollama as primary provider
- **Invalid Key at Runtime**: User makes chat request with invalid Google AI key → System returns HTTP 500 with "Gemini API error: ..." → Expected: System returns clear error "Google AI Studio API key is invalid or expired. Please check your GOOGLE_AI_API_KEY configuration."
- **Expired Key at Runtime**: User makes chat request with expired Google AI key → System attempts Gemini, fails, tries other providers, eventually fails → Expected: System detects invalid key early and provides clear feedback
- **Valid Keys**: User has valid API keys → System uses configured providers in tier order (primary → fallback → local) → Expected: Behavior unchanged (preservation requirement)

## Expected Behavior

### Preservation Requirements

**Unchanged Behaviors:**
- When valid LLM API keys are configured, the system must continue to use the configured external providers (Gemini, GPT-4o, Claude) as primary/fallback options
- When Ollama is explicitly configured as the primary provider (via tier assignment), the system must continue to use it without attempting other providers first
- The existing failover logic in `ModelRouterService.generate()` must continue to work for available providers
- Circuit breaker behavior for provider health monitoring must remain unchanged
- Usage tracking for Gemini free tier limits must continue to function

**Scope:**
All inputs that do NOT involve missing, invalid, or expired API keys should be completely unaffected by this fix. This includes:
- Valid API key scenarios with successful provider responses
- Provider failover due to rate limits, timeouts, or server errors (not auth errors)
- Health check endpoints and provider status reporting
- Circuit breaker state transitions for non-auth failures

## Hypothesized Root Cause

Based on the bug description and code analysis, the root causes are:

1. **Overly Strict Configuration Validation**: The `configuration.ts` file marks `GOOGLE_AI_API_KEY` and `OPENAI_API_KEY` as required via Joi schema, causing application startup to fail when these keys are missing. This prevents graceful degradation to Ollama.

2. **Provider Instantiation Without Validation**: In `model-router.module.ts`, the GeminiProvider factory throws an error if `GOOGLE_AI_API_KEY` is missing, but doesn't validate if the key is actually valid. Invalid keys are only discovered at runtime during the first API call.

3. **Generic Error Handling in GeminiProvider**: The `generate()` method in `gemini.provider.ts` catches all errors and wraps them in a generic "Gemini API error" message, losing important context about authentication failures (401, 403 status codes).

4. **No Early API Key Validation**: There's no mechanism to validate API keys at startup or before making requests, so invalid/expired keys aren't detected until a request fails, resulting in poor user experience.

5. **Static Provider Tier Assignment**: Providers have hardcoded tier assignments (e.g., GeminiProvider always returns 'primary'), so there's no way to dynamically adjust tiers based on API key availability.

## Correctness Properties

Property 1: Fault Condition - Graceful Fallback to Ollama

_For any_ application startup or runtime request where external LLM API keys (GOOGLE_AI_API_KEY, OPENAI_API_KEY, OPENROUTER_API_KEY) are missing, invalid, or expired, the system SHALL automatically detect this condition and use Ollama as the primary available provider, allowing the application to function without external API dependencies.

**Validates: Requirements 2.1**

Property 2: Fault Condition - Clear API Key Validation Errors

_For any_ runtime request where the Google AI Studio API key is invalid or expired, the system SHALL return a clear, user-friendly error message indicating the specific API key validation failure (e.g., "Google AI Studio API key is invalid or expired") without returning a generic HTTP 500 error.

**Validates: Requirements 2.2**

Property 3: Preservation - Valid API Key Behavior

_For any_ application startup or runtime request where valid LLM API keys are configured and providers are available, the system SHALL produce exactly the same provider selection and failover behavior as the original code, preserving the existing tier-based routing (primary → fallback → local).

**Validates: Requirements 3.1, 3.3, 3.4**

Property 4: Preservation - Explicit Ollama Configuration

_For any_ configuration where Ollama is explicitly set as the primary provider (via future configuration options), the system SHALL produce exactly the same behavior as the original code, using Ollama without attempting other providers first.

**Validates: Requirements 3.2**

## Fix Implementation

### Changes Required

Assuming our root cause analysis is correct:

**File 1**: `src/config/configuration.ts`

**Changes**:
1. **Make API Keys Optional**: Change `GOOGLE_AI_API_KEY` and `OPENAI_API_KEY` from `.required()` to `.optional()` in the Joi schema
2. **Update Interface**: Make `googleAiApiKey` and `openaiApiKey` optional in the `AppConfig` interface (add `?` suffix)

**File 2**: `src/model-router/model-router.module.ts`

**Changes**:
1. **Remove Startup Validation**: Remove the `if (!apiKey) throw new Error(...)` check in the GeminiProvider factory
2. **Allow Empty API Keys**: Pass empty string or undefined to GeminiProvider constructor when key is missing
3. **Apply Same Pattern**: Update OpenRouterGPT4Provider and ClaudeProvider factories to handle missing keys gracefully

**File 3**: `src/model-router/providers/gemini.provider.ts`

**Specific Changes**:
1. **Add API Key Validation**: Add a private `hasValidApiKey` flag set in constructor based on whether apiKey is non-empty
2. **Update isAvailable()**: Return `false` immediately if `!this.hasValidApiKey`, preventing this provider from being used
3. **Improve Error Messages**: In the `generate()` catch block, check for authentication errors (401, 403) and throw specific error messages like "Google AI Studio API key is invalid or expired. Please check your GOOGLE_AI_API_KEY configuration."
4. **Handle Missing Keys**: If apiKey is empty/undefined in constructor, set `hasValidApiKey = false` and log a warning

**File 4**: `src/model-router/providers/gpt4.provider.ts`

**Specific Changes**:
1. **Add API Key Validation**: Add private `hasValidApiKey` flag
2. **Update isAvailable()**: Return `false` if `!this.hasValidApiKey`
3. **Improve Error Messages**: Add specific error messages for OpenRouter authentication failures

**File 5**: `src/model-router/providers/claude.provider.ts`

**Specific Changes**:
1. **Add API Key Validation**: Add private `hasValidApiKey` flag
2. **Update isAvailable()**: Return `false` if `!this.hasValidApiKey`
3. **Improve Error Messages**: Add specific error messages for OpenRouter authentication failures

**File 6**: `src/model-router/model-router.service.ts`

**Specific Changes**:
1. **Filter Unavailable Providers**: In `getProvidersInOrder()`, filter out providers where `isAvailable()` returns false (this is async, so may need refactoring)
2. **Alternative Approach**: Keep synchronous filtering by checking provider health status before attempting generation
3. **Improve Error Messages**: When all providers fail, include information about which providers were unavailable due to missing/invalid API keys

## Testing Strategy

### Validation Approach

The testing strategy follows a two-phase approach: first, surface counterexamples that demonstrate the bug on unfixed code, then verify the fix works correctly and preserves existing behavior.

### Exploratory Fault Condition Checking

**Goal**: Surface counterexamples that demonstrate the bug BEFORE implementing the fix. Confirm or refute the root cause analysis. If we refute, we will need to re-hypothesize.

**Test Plan**: Write tests that attempt to start the application without API keys and make requests with invalid API keys. Run these tests on the UNFIXED code to observe failures and understand the root cause.

**Test Cases**:
1. **Missing API Key at Startup**: Remove `GOOGLE_AI_API_KEY` from environment, attempt to start application (will fail on unfixed code with "GOOGLE_AI_API_KEY is required")
2. **Invalid API Key at Runtime**: Set `GOOGLE_AI_API_KEY` to "invalid-key-12345", make chat request (will fail on unfixed code with HTTP 500 and generic error)
3. **Expired API Key at Runtime**: Use an expired Google AI key, make chat request (will fail on unfixed code with HTTP 500)
4. **All External Keys Missing**: Remove all external API keys, verify Ollama is not used (will fail on unfixed code at startup)

**Expected Counterexamples**:
- Application fails to start when `GOOGLE_AI_API_KEY` is missing
- HTTP 500 errors with generic messages when API keys are invalid
- Ollama is not used as fallback when external keys are missing
- Possible causes: required validation in configuration.ts, missing key validation in provider factories, generic error handling in providers

### Fix Checking

**Goal**: Verify that for all inputs where the bug condition holds (missing/invalid API keys), the fixed system produces the expected behavior (graceful fallback and clear errors).

**Pseudocode:**
```
FOR ALL input WHERE isBugCondition(input) DO
  IF input.requestContext == 'startup' THEN
    result := startApplication(input.apiKey)
    ASSERT result.started == true
    ASSERT result.primaryProvider == 'ollama'
  ELSE IF input.requestContext == 'runtime' THEN
    result := makeRequest(input.apiKey)
    IF input.apiKey IS missing THEN
      ASSERT result.usedProvider == 'ollama'
    ELSE IF input.apiKey IS invalid THEN
      ASSERT result.errorMessage CONTAINS 'API key is invalid or expired'
      ASSERT result.statusCode != 500
    END IF
  END IF
END FOR
```

### Preservation Checking

**Goal**: Verify that for all inputs where the bug condition does NOT hold (valid API keys), the fixed system produces the same result as the original system.

**Pseudocode:**
```
FOR ALL input WHERE NOT isBugCondition(input) DO
  originalResult := originalSystem.makeRequest(input)
  fixedResult := fixedSystem.makeRequest(input)
  ASSERT originalResult.usedProvider == fixedResult.usedProvider
  ASSERT originalResult.response == fixedResult.response
  ASSERT originalResult.failoverBehavior == fixedResult.failoverBehavior
END FOR
```

**Testing Approach**: Property-based testing is recommended for preservation checking because:
- It generates many test cases automatically across the input domain (various valid API keys, request types, provider states)
- It catches edge cases that manual unit tests might miss (e.g., rate limits during failover, circuit breaker state transitions)
- It provides strong guarantees that behavior is unchanged for all non-buggy inputs

**Test Plan**: Observe behavior on UNFIXED code first with valid API keys, then write property-based tests capturing that behavior.

**Test Cases**:
1. **Valid Gemini Key Preservation**: Observe that valid Gemini key uses Gemini as primary on unfixed code, verify same behavior after fix
2. **Failover Preservation**: Observe that failover from Gemini to GPT-4o to Claude to Ollama works on unfixed code (when Gemini rate limited), verify same behavior after fix
3. **Circuit Breaker Preservation**: Observe that circuit breaker opens after repeated failures on unfixed code, verify same behavior after fix
4. **Usage Tracking Preservation**: Observe that Gemini usage tracking works on unfixed code, verify same behavior after fix

### Unit Tests

- Test configuration validation allows missing API keys
- Test provider factories handle missing/empty API keys gracefully
- Test GeminiProvider.isAvailable() returns false when API key is missing/invalid
- Test GeminiProvider.generate() throws clear error messages for auth failures
- Test ModelRouterService filters out unavailable providers
- Test that Ollama is used when all external providers are unavailable

### Property-Based Tests

- Generate random API key states (missing, invalid, valid) and verify correct provider selection
- Generate random request sequences and verify failover behavior is preserved for valid keys
- Generate random provider failure scenarios and verify error messages are clear for auth failures
- Test that circuit breaker state transitions are preserved across API key states

### Integration Tests

- Test full application startup with missing API keys (should succeed and use Ollama)
- Test chat request flow with invalid Google AI key (should return clear error or use fallback)
- Test chat request flow with valid keys (should use configured providers in tier order)
- Test provider health endpoint reflects API key availability status
