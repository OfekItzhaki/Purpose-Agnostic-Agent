import { MetricsProvider } from '../observability.interface.js';
import { Counter, Histogram, register } from 'prom-client';

export class PrometheusMetricsProvider implements MetricsProvider {
  private counters = new Map<string, Counter>();
  private histograms = new Map<string, Histogram>();

  recordMetric(
    name: string,
    value: number,
    labels?: Record<string, string>,
  ): void {
    // For Prometheus, we typically use histograms for metrics
    this.recordHistogram(name, value, labels);
  }

  incrementCounter(name: string, labels?: Record<string, string>): void {
    let counter = this.counters.get(name);

    if (!counter) {
      counter = new Counter({
        name,
        help: `Counter for ${name}`,
        labelNames: labels ? Object.keys(labels) : [],
      });
      this.counters.set(name, counter);
    }

    if (labels) {
      counter.inc(labels);
    } else {
      counter.inc();
    }
  }

  recordHistogram(
    name: string,
    value: number,
    labels?: Record<string, string>,
  ): void {
    let histogram = this.histograms.get(name);

    if (!histogram) {
      histogram = new Histogram({
        name,
        help: `Histogram for ${name}`,
        labelNames: labels ? Object.keys(labels) : [],
      });
      this.histograms.set(name, histogram);
    }

    if (labels) {
      histogram.observe(labels, value);
    } else {
      histogram.observe(value);
    }
  }
}
