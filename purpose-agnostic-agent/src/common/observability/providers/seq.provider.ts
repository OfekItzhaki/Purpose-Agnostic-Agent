import { LogTransport } from '../observability.interface.js';
import * as SeqTransport from 'winston-seq';
import * as winston from 'winston';

export class SeqLogTransport implements LogTransport {
  private transport: any;

  constructor(serverUrl: string, apiKey?: string) {
    this.transport = new (SeqTransport as any)({
      serverUrl,
      apiKey,
      onError: (e: Error) => {
        console.error('Seq logging error:', e);
      },
    });
  }

  log(level: string, message: string, metadata: Record<string, any>): void {
    const logEntry = {
      level,
      message,
      ...metadata,
      timestamp: new Date().toISOString(),
    };

    this.transport.log(logEntry, () => {});
  }
}
