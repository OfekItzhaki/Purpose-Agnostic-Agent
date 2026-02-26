// Abstraction for observability providers
// Allows swapping between Seq, Datadog, New Relic, Elastic, etc.

export interface LogTransport {
  log(level: string, message: string, metadata: Record<string, any>): void;
}

export interface MetricsProvider {
  recordMetric(
    name: string,
    value: number,
    labels?: Record<string, string>,
  ): void;
  incrementCounter(name: string, labels?: Record<string, string>): void;
  recordHistogram(
    name: string,
    value: number,
    labels?: Record<string, string>,
  ): void;
}

export interface TracingProvider {
  startSpan(name: string, parentSpan?: any): any;
  endSpan(span: any): void;
  recordException(span: any, error: Error): void;
}

export enum ObservabilityProvider {
  SEQ = 'seq',
  DATADOG = 'datadog',
  NEW_RELIC = 'newrelic',
  ELASTIC = 'elastic',
  PROMETHEUS = 'prometheus',
  CONSOLE = 'console', // Fallback
}
