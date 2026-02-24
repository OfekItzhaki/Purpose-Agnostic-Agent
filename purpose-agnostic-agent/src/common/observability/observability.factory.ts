import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  LogTransport,
  MetricsProvider,
  ObservabilityProvider,
} from './observability.interface.js';
import { SeqLogTransport } from './providers/seq.provider.js';
import { PrometheusMetricsProvider } from './providers/prometheus.provider.js';
import { ConsoleLogTransport } from './providers/console.provider.js';

@Injectable()
export class ObservabilityFactory {
  constructor(private readonly configService: ConfigService) {}

  createLogTransport(): LogTransport {
    const seqUrl = this.configService.get<string>('SEQ_URL');

    if (seqUrl) {
      return new SeqLogTransport(seqUrl, this.configService.get<string>('SEQ_API_KEY'));
    }

    // Add other providers here:
    // if (datadogApiKey) return new DatadogLogTransport(datadogApiKey);
    // if (newRelicKey) return new NewRelicLogTransport(newRelicKey);

    // Fallback to console
    return new ConsoleLogTransport();
  }

  createMetricsProvider(): MetricsProvider {
    const prometheusEnabled = this.configService.get<boolean>('PROMETHEUS_ENABLED');

    if (prometheusEnabled) {
      return new PrometheusMetricsProvider();
    }

    // Add other providers here:
    // if (datadogApiKey) return new DatadogMetricsProvider(datadogApiKey);
    // if (newRelicKey) return new NewRelicMetricsProvider(newRelicKey);

    // Fallback to no-op provider
    return {
      recordMetric: () => {},
      incrementCounter: () => {},
      recordHistogram: () => {},
    };
  }

  getActiveProvider(): ObservabilityProvider {
    if (this.configService.get<string>('SEQ_URL')) {
      return ObservabilityProvider.SEQ;
    }
    if (this.configService.get<boolean>('PROMETHEUS_ENABLED')) {
      return ObservabilityProvider.PROMETHEUS;
    }
    return ObservabilityProvider.CONSOLE;
  }
}
