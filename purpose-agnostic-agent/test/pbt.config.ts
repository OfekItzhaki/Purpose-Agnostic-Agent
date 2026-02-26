/**
 * Property-Based Testing Configuration
 *
 * This file configures fast-check for property-based testing across the application.
 * All property tests should use these settings for consistency.
 */

import * as fc from 'fast-check';

/**
 * Standard configuration for property-based tests
 *
 * - numRuns: 100+ iterations per property test (requirement 17.1)
 * - seed: Enables reproducibility (requirement 17.2)
 * - endOnFailure: Stop on first failure for faster feedback
 * - verbose: Show detailed shrinking information
 */
export const pbtConfig: fc.Parameters<unknown> = {
  numRuns: 100, // Minimum 100 iterations per test
  seed: process.env.PBT_SEED ? parseInt(process.env.PBT_SEED, 10) : Date.now(),
  endOnFailure: true,
  verbose: fc.VerbosityLevel.Verbose,
};

/**
 * Extended configuration for complex property tests
 * Uses more iterations for critical business logic
 */
export const pbtConfigExtended: fc.Parameters<unknown> = {
  ...pbtConfig,
  numRuns: 500,
};

/**
 * Configuration for fast smoke tests
 * Useful for quick validation during development
 */
export const pbtConfigSmoke: fc.Parameters<unknown> = {
  ...pbtConfig,
  numRuns: 20,
  verbose: fc.VerbosityLevel.None,
};

/**
 * Helper function to run a property test with standard configuration
 *
 * @example
 * ```typescript
 * import { runPropertyTest } from '@test/pbt.config';
 * import * as fc from 'fast-check';
 *
 * it('should satisfy property', () => {
 *   runPropertyTest(
 *     fc.property(fc.integer(), (n) => {
 *       return n + 0 === n;
 *     })
 *   );
 * });
 * ```
 */
export function runPropertyTest(property: fc.IProperty<unknown>): void {
  fc.assert(property, pbtConfig);
}

/**
 * Helper function to run an extended property test
 */
export function runExtendedPropertyTest(property: fc.IProperty<unknown>): void {
  fc.assert(property, pbtConfigExtended);
}

/**
 * Helper function to run a smoke property test
 */
export function runSmokePropertyTest(property: fc.IProperty<unknown>): void {
  fc.assert(property, pbtConfigSmoke);
}
