function sanitizeArgs(args: any[]): any[] {
  return args.map((arg) => {
    if (typeof arg === 'object' && arg !== null) {
      return '[Object]';
    }
    if (typeof arg === 'string' && arg.length > 100) {
      return arg.substring(0, 100) + '...';
    }
    return arg;
  });
}

export function LogExecution(
  target: any,
  propertyKey: string,
  descriptor: PropertyDescriptor,
) {
  const originalMethod = descriptor.value;

  descriptor.value = async function (...args: any[]) {
    const logger = this.logger || console;
    const startTime = Date.now();

    logger.log({
      level: 'info',
      message: `Executing ${propertyKey}`,
      method: propertyKey,
      args: sanitizeArgs(args),
      timestamp: new Date().toISOString(),
    });

    try {
      const result = await originalMethod.apply(this, args);
      const duration = Date.now() - startTime;

      logger.log({
        level: 'info',
        message: `Completed ${propertyKey}`,
        method: propertyKey,
        duration,
        timestamp: new Date().toISOString(),
      });

      return result;
    } catch (error) {
      const duration = Date.now() - startTime;

      logger.log({
        level: 'error',
        message: `Failed ${propertyKey}`,
        method: propertyKey,
        error: (error as Error).message,
        duration,
        timestamp: new Date().toISOString(),
      });

      throw error;
    }
  };

  return descriptor;
}
