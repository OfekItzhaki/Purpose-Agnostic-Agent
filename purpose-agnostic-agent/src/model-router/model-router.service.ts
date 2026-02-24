import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  LLMProvider,
  GenerateRequest,
  GenerateResponse,
  ProviderHealthStatus,
} from './interfaces/llm-provider.interface.js';
import { LLMProviderFactory } from './provider.factory.js';
import { CircuitBreaker, CircuitBreakerConfig } from '../common/circuit-breaker.js';
import { StructuredLogger } from '../common/logger.service.js';
import { FailoverEvent } from './entities/failover-event.entity.js';
import { UsageTrackerService } from './usage-tracker.service.js';

@Injectable()
export class ModelRouterService {
  private readonly logger = new StructuredLogger();
  private readonly circuitBreakers = new Map<string, CircuitBreaker>();
  private readonly circuitBreakerConfig: CircuitBreakerConfig = {
    failureThreshold: 5,
    successThreshold: 2,
    timeout: 30000,
    resetTimeout: 60000,
  };

  constructor(
    private readonly providerFactory: LLMProviderFactory,
    private readonly usageTracker: UsageTrackerService,
    @InjectRepository(FailoverEvent)
    private readonly failoverEventRepository: Repository<FailoverEvent>,
  ) {
    // Initialize circuit breakers for each provider
    const providers = this.providerFactory.getAllProviders();
    for (const provider of providers) {
      this.circuitBreakers.set(
        provider.getName(),
        new CircuitBreaker(this.circuitBreakerConfig),
      );
    }
  }

  async generate(request: GenerateRequest): Promise<GenerateResponse> {
    const canProceed = this.usageTracker.canMakeRequest('gemini-pro');
    
    if (!canProceed.allowed) {
      this.logger.warn(
        `Gemini usage limit reached: ${canProceed.reason}`,
        'ModelRouterService',
      );
      throw new Error(`Usage limit: ${canProceed.reason}`);
    }

    const providers = this.getProvidersInOrder();

    let lastError: Error | null = null;

    for (const provider of providers) {
      try {
        this.logger.log(
          `Attempting to generate with provider: ${provider.getName()}`,
          'ModelRouterService',
        );

        const circuitBreaker = this.circuitBreakers.get(provider.getName())!;
        const response = await circuitBreaker.execute(() =>
          provider.generate(request),
        );

        // Track usage for Gemini
        if (provider.getName() === 'gemini-pro') {
          this.usageTracker.trackUsage('gemini-pro', response.tokensUsed || 0);
        }

        this.logger.log(
          `Successfully generated with provider: ${provider.getName()}`,
          'ModelRouterService',
        );

        return response;
      } catch (error) {
        lastError = error as Error;
        const reason = this.getFailureReason(error);

        this.logger.error(
          `Provider ${provider.getName()} failed: ${reason}`,
          (error as Error).stack,
          'ModelRouterService',
        );

        // Log failover event
        await this.logFailoverEvent(
          provider.getName(),
          this.getNextProviderName(providers, provider),
          reason,
        );

        // Continue to next provider
        continue;
      }
    }

    // All providers failed
    throw new Error(
      `All LLM providers failed. Last error: ${lastError?.message}`,
    );
  }

  async getProviderHealth(): Promise<ProviderHealthStatus[]> {
    const providers = this.providerFactory.getAllProviders();
    const healthStatuses: ProviderHealthStatus[] = [];

    for (const provider of providers) {
      const available = await provider.isAvailable();
      healthStatuses.push({
        name: provider.getName(),
        tier: provider.getTier(),
        available,
      });
    }

    return healthStatuses;
  }

  async getProviderStatus(): Promise<Array<{ name: string; tier: string; isHealthy: boolean }>> {
    const healthStatuses = await this.getProviderHealth();
    return healthStatuses.map((status) => ({
      name: status.name,
      tier: status.tier,
      isHealthy: status.available,
    }));
  }

  private getProvidersInOrder(): LLMProvider[] {
    const byTier = this.providerFactory.getProvidersByTier();
    const ordered: LLMProvider[] = [];

    // Primary tier first
    if (byTier.has('primary')) {
      ordered.push(...byTier.get('primary')!);
    }

    // Fallback tier second
    if (byTier.has('fallback')) {
      ordered.push(...byTier.get('fallback')!);
    }

    // Local tier last
    if (byTier.has('local')) {
      ordered.push(...byTier.get('local')!);
    }

    return ordered;
  }

  private getFailureReason(error: any): string {
    if (error.code === 'ECONNREFUSED') {
      return 'Connection refused';
    }
    if (error.code === 'ETIMEDOUT' || error.name === 'TimeoutError') {
      return 'Request timeout';
    }
    if (error.response?.status === 429) {
      return 'Rate limit exceeded';
    }
    if (error.response?.status >= 500) {
      return `Server error: ${error.response.status}`;
    }
    return error.message || 'Unknown error';
  }

  private getNextProviderName(
    providers: LLMProvider[],
    currentProvider: LLMProvider,
  ): string {
    const currentIndex = providers.indexOf(currentProvider);
    if (currentIndex < providers.length - 1) {
      return providers[currentIndex + 1].getName();
    }
    return 'none';
  }

  private async logFailoverEvent(
    failedProvider: string,
    successfulProvider: string,
    reason: string,
  ): Promise<void> {
    try {
      const event = this.failoverEventRepository.create({
        failed_provider: failedProvider,
        successful_provider: successfulProvider,
        reason,
        occurred_at: new Date(),
      });

      await this.failoverEventRepository.save(event);

      this.logger.logWithContext('warn', 'Failover event occurred', {
        failedProvider,
        successfulProvider,
        reason,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      this.logger.error(
        'Failed to log failover event',
        (error as Error).stack,
        'ModelRouterService',
      );
    }
  }
}
