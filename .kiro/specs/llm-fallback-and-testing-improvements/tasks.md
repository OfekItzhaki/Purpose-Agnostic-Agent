# Implementation Plan

- [x] 1. Write bug condition exploration test
  - **Property 1: Fault Condition** - Missing/Invalid API Keys Prevent Graceful Fallback
  - **CRITICAL**: This test MUST FAIL on unfixed code - failure confirms the bug exists
  - **DO NOT attempt to fix the test or the code when it fails**
  - **NOTE**: This test encodes the expected behavior - it will validate the fix when it passes after implementation
  - **GOAL**: Surface counterexamples that demonstrate the bug exists
  - **Scoped PBT Approach**: Scope the property to concrete failing cases: missing GOOGLE_AI_API_KEY at startup, invalid API key at runtime
  - Test that application fails to start when GOOGLE_AI_API_KEY is missing (from Fault Condition in design)
  - Test that requests with invalid API keys return HTTP 500 with generic errors instead of clear validation messages
  - Test that Ollama is not used as fallback when external API keys are missing
  - The test assertions should match the Expected Behavior Properties from design:
    - Application should start successfully with missing keys
    - Ollama should be used as primary provider when external keys are missing
    - Invalid API keys should return clear error messages (not HTTP 500)
  - Run test on UNFIXED code
  - **EXPECTED OUTCOME**: Test FAILS (this is correct - it proves the bug exists)
  - Document counterexamples found to understand root cause:
    - Application startup failure with "GOOGLE_AI_API_KEY is required"
    - HTTP 500 errors with "Gemini API error: ..." for invalid keys
    - No automatic fallback to Ollama when external keys are unavailable
  - Mark task complete when test is written, run, and failure is documented
  - _Requirements: 2.1, 2.2_

- [x] 2. Write preservation property tests (BEFORE implementing fix)
  - **Property 2: Preservation** - Valid API Key Behavior Unchanged
  - **IMPORTANT**: Follow observation-first methodology
  - Observe behavior on UNFIXED code for non-buggy inputs (valid API keys)
  - Observe: Valid Gemini key uses Gemini as primary provider
  - Observe: Failover chain works correctly (Gemini → GPT-4o → Claude → Ollama) when providers fail for non-auth reasons
  - Observe: Circuit breaker opens after repeated failures
  - Observe: Usage tracking for Gemini free tier limits functions correctly
  - Write property-based tests capturing observed behavior patterns from Preservation Requirements:
    - For all valid API key configurations, provider selection follows tier order (primary → fallback → local)
    - For all valid API key configurations with provider failures (rate limits, timeouts), failover logic works identically
    - For all valid API key configurations, circuit breaker behavior is unchanged
    - For all explicit Ollama configurations, Ollama is used without attempting other providers
  - Property-based testing generates many test cases for stronger guarantees
  - Run tests on UNFIXED code
  - **EXPECTED OUTCOME**: Tests PASS (this confirms baseline behavior to preserve)
  - Mark task complete when tests are written, run, and passing on unfixed code
  - _Requirements: 3.1, 3.2, 3.3, 3.4_

- [x] 3. Fix for LLM fallback and API key validation

  - [x] 3.1 Make API keys optional in configuration
    - Update `src/config/configuration.ts` to change `GOOGLE_AI_API_KEY` and `OPENAI_API_KEY` from `.required()` to `.optional()` in Joi schema
    - Update `AppConfig` interface to make `googleAiApiKey` and `openaiApiKey` optional (add `?` suffix)
    - _Bug_Condition: isBugCondition(input) where input.apiKey is undefined OR empty OR invalid_
    - _Expected_Behavior: Application starts successfully and uses Ollama when external API keys are missing_
    - _Preservation: Valid API key configurations continue to use configured providers in tier order_
    - _Requirements: 2.1_

  - [x] 3.2 Update provider factories to handle missing API keys
    - Update `src/model-router/model-router.module.ts` to remove startup validation that throws error when `GOOGLE_AI_API_KEY` is missing
    - Allow GeminiProvider, OpenRouterGPT4Provider, and ClaudeProvider factories to pass empty string or undefined when keys are missing
    - _Bug_Condition: isBugCondition(input) where input.apiKey is undefined at startup_
    - _Expected_Behavior: Providers instantiate successfully but mark themselves as unavailable_
    - _Preservation: Provider instantiation with valid keys remains unchanged_
    - _Requirements: 2.1_

  - [x] 3.3 Add API key validation to GeminiProvider
    - Update `src/model-router/providers/gemini.provider.ts`:
      - Add private `hasValidApiKey` flag set in constructor based on whether apiKey is non-empty
      - Update `isAvailable()` to return false immediately if `!this.hasValidApiKey`
      - In `generate()` catch block, check for authentication errors (401, 403) and throw specific error: "Google AI Studio API key is invalid or expired. Please check your GOOGLE_AI_API_KEY configuration."
      - If apiKey is empty/undefined in constructor, set `hasValidApiKey = false` and log warning
    - _Bug_Condition: isBugCondition(input) where input.apiKey is missing, invalid, or expired_
    - _Expected_Behavior: Provider marks itself unavailable when key is missing; returns clear error message when key is invalid/expired_
    - _Preservation: Valid API key behavior and error handling for non-auth failures unchanged_
    - _Requirements: 2.1, 2.2_

  - [x] 3.4 Add API key validation to GPT4Provider
    - Update `src/model-router/providers/gpt4.provider.ts`:
      - Add private `hasValidApiKey` flag
      - Update `isAvailable()` to return false if `!this.hasValidApiKey`
      - Add specific error messages for OpenRouter authentication failures
    - _Bug_Condition: isBugCondition(input) where input.apiKey is missing or invalid for OpenRouter_
    - _Expected_Behavior: Provider marks itself unavailable when key is missing; returns clear error message when key is invalid_
    - _Preservation: Valid API key behavior unchanged_
    - _Requirements: 2.1, 2.2_

  - [x] 3.5 Add API key validation to ClaudeProvider
    - Update `src/model-router/providers/claude.provider.ts`:
      - Add private `hasValidApiKey` flag
      - Update `isAvailable()` to return false if `!this.hasValidApiKey`
      - Add specific error messages for OpenRouter authentication failures
    - _Bug_Condition: isBugCondition(input) where input.apiKey is missing or invalid for OpenRouter_
    - _Expected_Behavior: Provider marks itself unavailable when key is missing; returns clear error message when key is invalid_
    - _Preservation: Valid API key behavior unchanged_
    - _Requirements: 2.1, 2.2_

  - [x] 3.6 Update ModelRouterService to filter unavailable providers
    - Update `src/model-router/model-router.service.ts`:
      - In provider selection logic, filter out providers where `isAvailable()` returns false
      - When all providers fail, include information about which providers were unavailable due to missing/invalid API keys
    - _Bug_Condition: isBugCondition(input) where external API keys are missing/invalid_
    - _Expected_Behavior: Ollama is automatically selected as primary when external providers are unavailable_
    - _Preservation: Provider selection with valid keys follows existing tier-based routing_
    - _Requirements: 2.1, 2.2_

  - [x] 3.7 Verify bug condition exploration test now passes
    - **Property 1: Expected Behavior** - Graceful Fallback and Clear Errors
    - **IMPORTANT**: Re-run the SAME test from task 1 - do NOT write a new test
    - The test from task 1 encodes the expected behavior
    - When this test passes, it confirms the expected behavior is satisfied:
      - Application starts successfully with missing API keys
      - Ollama is used as primary provider when external keys are missing
      - Invalid API keys return clear error messages (not HTTP 500)
    - Run bug condition exploration test from step 1
    - **EXPECTED OUTCOME**: Test PASSES (confirms bug is fixed)
    - _Requirements: 2.1, 2.2_

  - [x] 3.8 Verify preservation tests still pass
    - **Property 2: Preservation** - Valid API Key Behavior Unchanged
    - **IMPORTANT**: Re-run the SAME tests from task 2 - do NOT write new tests
    - Run preservation property tests from step 2
    - **EXPECTED OUTCOME**: Tests PASS (confirms no regressions)
    - Confirm all tests still pass after fix:
      - Valid API key configurations use configured providers in tier order
      - Failover logic works identically for non-auth failures
      - Circuit breaker behavior is unchanged
      - Explicit Ollama configurations work as before
    - _Requirements: 3.1, 3.2, 3.3, 3.4_

- [x] 4. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.
