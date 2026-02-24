import { Injectable } from '@nestjs/common';
import { HealthIndicator, HealthIndicatorResult, HealthCheckError } from '@nestjs/terminus';
import { ModelRouterService } from '../model-router/model-router.service';

@Injectable()
export class LLMProviderHealthIndicator extends HealthIndicator {
  constructor(private readonly modelRouter: ModelRouterService) {
    super();
  }

  async isHealthy(key: string): Promise<HealthIndicatorResult> {
    try {
      const providers = await this.modelRouter.getProviderStatus();
      const healthyProviders = providers.filter((p) => p.isHealthy);

      if (healthyProviders.length === 0) {
        throw new HealthCheckError(
          'No LLM providers available',
          this.getStatus(key, false, { providers }),
        );
      }

      return this.getStatus(key, true, {
        providers,
        healthyCount: healthyProviders.length,
        totalCount: providers.length,
      });
    } catch (error) {
      throw new HealthCheckError(
        'LLM provider health check failed',
        this.getStatus(key, false, { error: error.message }),
      );
    }
  }
}
