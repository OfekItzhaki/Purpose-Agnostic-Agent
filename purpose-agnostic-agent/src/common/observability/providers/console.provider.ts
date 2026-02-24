import { LogTransport } from '../observability.interface.js';

export class ConsoleLogTransport implements LogTransport {
  log(level: string, message: string, metadata: Record<string, any>): void {
    const logEntry = {
      level,
      message,
      ...metadata,
      timestamp: new Date().toISOString(),
    };
    console.log(JSON.stringify(logEntry));
  }
}
