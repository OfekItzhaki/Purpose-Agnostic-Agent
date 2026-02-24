export interface RetryConfig {
  maxAttempts: number;
  initialDelayMs: number;
  maxDelayMs: number;
  backoffMultiplier: number;
  retryableErrors: string[];
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function isRetryable(error: any, config: RetryConfig): boolean {
  if (!error) return false;
  const errorType = error.code || error.name || error.message || '';
  return config.retryableErrors.some((retryable) =>
    errorType.includes(retryable),
  );
}

export function Retry(config: RetryConfig) {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor,
  ) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      let lastError: Error;
      let delay = config.initialDelayMs;

      for (let attempt = 1; attempt <= config.maxAttempts; attempt++) {
        try {
          return await originalMethod.apply(this, args);
        } catch (error) {
          lastError = error as Error;

          if (attempt === config.maxAttempts || !isRetryable(error, config)) {
            throw error;
          }

          await sleep(delay);
          delay = Math.min(delay * config.backoffMultiplier, config.maxDelayMs);
        }
      }

      throw lastError!;
    };

    return descriptor;
  };
}
