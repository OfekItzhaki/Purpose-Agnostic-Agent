# Observability Stack

The Purpose-Agnostic Agent uses a modular observability architecture that allows you to easily swap between different monitoring providers.

## Current Stack (Default)

- **Logging**: Seq (structured log aggregation)
- **Metrics**: Prometheus (time-series metrics)
- **Visualization**: Grafana (dashboards and graphs)

## Architecture

The observability layer is abstracted through interfaces:
- `LogTransport` - for logging providers
- `MetricsProvider` - for metrics collection
- `TracingProvider` - for distributed tracing (future)

## Running with Observability

### Start Core Services Only
```bash
docker-compose up -d
```

### Start with Observability Stack
```bash
docker-compose up -d
docker-compose -f docker-compose.observability.yml --profile observability up -d
```

### Access Dashboards
- **Seq**: http://localhost:5341 (Logs)
- **Prometheus**: http://localhost:9090 (Metrics)
- **Grafana**: http://localhost:3001 (Dashboards)
  - Username: `admin`
  - Password: `admin`

## Swapping Providers

### Option 1: Datadog

1. Install Datadog agent:
```yaml
# docker-compose.observability.yml
datadog:
  image: datadog/agent:latest
  environment:
    - DD_API_KEY=${DATADOG_API_KEY}
    - DD_SITE=datadoghq.com
```

2. Update environment variables:
```env
DATADOG_API_KEY=your_api_key
SEQ_URL=  # Leave empty to disable Seq
```

3. Implement provider:
```typescript
// src/common/observability/providers/datadog.provider.ts
export class DatadogLogTransport implements LogTransport {
  // Implementation
}
```

### Option 2: New Relic

1. Update docker-compose:
```yaml
newrelic:
  image: newrelic/infrastructure:latest
  environment:
    - NRIA_LICENSE_KEY=${NEW_RELIC_LICENSE_KEY}
```

2. Update environment:
```env
NEW_RELIC_LICENSE_KEY=your_license_key
SEQ_URL=  # Leave empty
```

### Option 3: Elastic Stack (ELK)

1. Use docker-compose.elk.yml:
```yaml
elasticsearch:
  image: docker.elastic.co/elasticsearch/elasticsearch:8.11.0
  
logstash:
  image: docker.elastic.co/logstash/logstash:8.11.0
  
kibana:
  image: docker.elastic.co/kibana/kibana:8.11.0
```

2. Implement Elastic provider:
```typescript
export class ElasticLogTransport implements LogTransport {
  // Implementation
}
```

### Option 4: Console Only (No External Services)

```env
SEQ_URL=
PROMETHEUS_ENABLED=false
```

Logs will output to console in JSON format.

## Adding a New Provider

1. Create provider implementation:
```typescript
// src/common/observability/providers/your-provider.provider.ts
import { LogTransport } from '../observability.interface.js';

export class YourProviderLogTransport implements LogTransport {
  constructor(apiKey: string) {
    // Initialize your provider SDK
  }

  log(level: string, message: string, metadata: Record<string, any>): void {
    // Send logs to your provider
  }
}
```

2. Update factory:
```typescript
// src/common/observability/observability.factory.ts
createLogTransport(): LogTransport {
  const yourProviderKey = this.configService.get<string>('YOUR_PROVIDER_KEY');
  
  if (yourProviderKey) {
    return new YourProviderLogTransport(yourProviderKey);
  }
  
  // ... existing providers
}
```

3. Update environment variables:
```env
YOUR_PROVIDER_KEY=your_api_key
```

## Metrics Available

- `http_request_duration_ms` - HTTP request latency
- `llm_request_duration_ms` - LLM provider latency
- `llm_failover_count` - Number of failover events
- `rag_search_duration_ms` - RAG search latency
- `pdf_ingestion_duration_ms` - PDF processing time
- `embedding_generation_duration_ms` - Embedding generation time

## Best Practices

1. **Use environment variables** for all provider configuration
2. **Implement the interface** for consistent behavior
3. **Handle errors gracefully** - observability should never crash the app
4. **Test locally** with console provider before deploying
5. **Monitor costs** - some providers charge per log/metric

## Cost Considerations

| Provider | Free Tier | Pricing Model |
|----------|-----------|---------------|
| Seq | Self-hosted (free) | One-time license or self-host |
| Datadog | 14-day trial | Per host + logs/metrics |
| New Relic | 100GB/month free | Per GB ingested |
| Elastic | Self-hosted (free) | Self-host or cloud pricing |
| Prometheus + Grafana | Self-hosted (free) | Self-host only |

## Troubleshooting

### Logs not appearing in Seq
- Check `SEQ_URL` is set correctly
- Verify Seq container is running: `docker ps | grep seq`
- Check Seq logs: `docker logs purpose-agnostic-agent-seq`

### Metrics not in Prometheus
- Verify `PROMETHEUS_ENABLED=true`
- Check Prometheus targets: http://localhost:9090/targets
- Ensure API exposes `/metrics` endpoint

### Grafana dashboards empty
- Verify Prometheus datasource is configured
- Check Prometheus is scraping metrics
- Import dashboard from `config/grafana/dashboards/`
