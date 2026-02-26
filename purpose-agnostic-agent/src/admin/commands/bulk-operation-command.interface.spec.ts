import {
  BulkOperationCommand,
  BulkOperationResult,
  ValidationResult,
} from './bulk-operation-command.interface';

/**
 * Mock implementation of BulkOperationCommand for testing
 */
class MockBulkOperationCommand implements BulkOperationCommand<string, string> {
  private items: string[];
  private shouldFail: boolean;
  private validationErrors: string[];

  constructor(
    items: string[],
    shouldFail = false,
    validationErrors: string[] = [],
  ) {
    this.items = items;
    this.shouldFail = shouldFail;
    this.validationErrors = validationErrors;
  }

  async validate(): Promise<ValidationResult> {
    return {
      isValid: this.validationErrors.length === 0,
      errors: this.validationErrors,
    };
  }

  async execute(): Promise<BulkOperationResult<string>> {
    const successes: string[] = [];
    const failures: Array<{ item: string; error: string }> = [];

    for (const item of this.items) {
      if (this.shouldFail && item.includes('fail')) {
        failures.push({ item, error: 'Simulated failure' });
      } else {
        successes.push(item);
      }
    }

    return {
      total: this.items.length,
      successful: successes.length,
      failed: failures.length,
      successes,
      failures,
    };
  }

  async rollback(): Promise<boolean> {
    return true;
  }
}

describe('BulkOperationCommand Interface', () => {
  describe('validate method', () => {
    it('should return valid result when no validation errors', async () => {
      const command = new MockBulkOperationCommand(['item1', 'item2']);
      const result = await command.validate();

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should return invalid result with errors when validation fails', async () => {
      const errors = ['Error 1', 'Error 2'];
      const command = new MockBulkOperationCommand([], false, errors);
      const result = await command.validate();

      expect(result.isValid).toBe(false);
      expect(result.errors).toEqual(errors);
    });
  });

  describe('execute method', () => {
    it('should return result with all successes when no failures', async () => {
      const items = ['item1', 'item2', 'item3'];
      const command = new MockBulkOperationCommand(items);
      const result = await command.execute();

      expect(result.total).toBe(3);
      expect(result.successful).toBe(3);
      expect(result.failed).toBe(0);
      expect(result.successes).toEqual(items);
      expect(result.failures).toHaveLength(0);
    });

    it('should track both successes and failures', async () => {
      const items = ['item1', 'fail-item', 'item3'];
      const command = new MockBulkOperationCommand(items, true);
      const result = await command.execute();

      expect(result.total).toBe(3);
      expect(result.successful).toBe(2);
      expect(result.failed).toBe(1);
      expect(result.successes).toEqual(['item1', 'item3']);
      expect(result.failures).toHaveLength(1);
      expect(result.failures[0].item).toBe('fail-item');
      expect(result.failures[0].error).toBe('Simulated failure');
    });

    it('should return result with all failures when all items fail', async () => {
      const items = ['fail-1', 'fail-2'];
      const command = new MockBulkOperationCommand(items, true);
      const result = await command.execute();

      expect(result.total).toBe(2);
      expect(result.successful).toBe(0);
      expect(result.failed).toBe(2);
      expect(result.successes).toHaveLength(0);
      expect(result.failures).toHaveLength(2);
    });
  });

  describe('rollback method', () => {
    it('should return true on successful rollback', async () => {
      const command = new MockBulkOperationCommand(['item1']);
      const result = await command.rollback();

      expect(result).toBe(true);
    });
  });

  describe('BulkOperationResult structure', () => {
    it('should have correct structure for result tracking', async () => {
      const command = new MockBulkOperationCommand(
        ['item1', 'fail-item'],
        true,
      );
      const result = await command.execute();

      expect(result).toHaveProperty('total');
      expect(result).toHaveProperty('successful');
      expect(result).toHaveProperty('failed');
      expect(result).toHaveProperty('successes');
      expect(result).toHaveProperty('failures');
      expect(typeof result.total).toBe('number');
      expect(typeof result.successful).toBe('number');
      expect(typeof result.failed).toBe('number');
      expect(Array.isArray(result.successes)).toBe(true);
      expect(Array.isArray(result.failures)).toBe(true);
    });
  });
});
