/**
 * Result of a bulk operation execution
 */
export interface BulkOperationResult<T = any> {
  /**
   * Total number of items processed
   */
  total: number;

  /**
   * Number of successful operations
   */
  successful: number;

  /**
   * Number of failed operations
   */
  failed: number;

  /**
   * Details of successful operations
   */
  successes: T[];

  /**
   * Details of failed operations with error messages
   */
  failures: Array<{
    item: T;
    error: string;
  }>;
}

/**
 * Validation result for pre-execution checks
 */
export interface ValidationResult {
  /**
   * Whether validation passed
   */
  isValid: boolean;

  /**
   * Validation error messages if validation failed
   */
  errors: string[];
}

/**
 * Command pattern interface for bulk operations
 *
 * Provides a consistent structure for bulk operations with:
 * - Pre-execution validation
 * - Transactional execution with result tracking
 * - Rollback support for transaction safety
 *
 * Requirements: 6.1, 6.2, 6.3
 */
export interface BulkOperationCommand<TInput = any, TOutput = any> {
  /**
   * Validates the operation before execution
   *
   * Performs pre-execution checks to ensure:
   * - Input data is valid
   * - Required resources exist
   * - Operation can be safely executed
   *
   * @returns Validation result with any error messages
   */
  validate(): Promise<ValidationResult>;

  /**
   * Executes the bulk operation
   *
   * Processes all items and tracks success/failure for each.
   * Should be executed within a transaction context when possible.
   *
   * @returns Operation results with success/failure details
   */
  execute(): Promise<BulkOperationResult<TOutput>>;

  /**
   * Rolls back the operation if execution fails
   *
   * Provides transaction support by undoing changes made during execution.
   * Should restore the system to its pre-execution state.
   *
   * @returns True if rollback was successful, false otherwise
   */
  rollback(): Promise<boolean>;
}
