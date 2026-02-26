import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EmbeddingService } from '../interfaces/embedding.service.interface.js';
import { OpenAIEmbeddingService } from './openai-embedding.service.js';
import { OllamaEmbeddingService } from './ollama-embedding.service.js';
import { StructuredLogger } from '../../common/logger.service.js';

interface EmbeddingProvider {
  name: string;
  service: EmbeddingService;
  dimensions: number;
  enabled: boolean;
}

@Injectable()
export class EmbeddingRouterService implements EmbeddingService {
  private readonly logger = new StructuredLogger();
  private readonly providers: Map<string, EmbeddingProvider> = new Map();
  private readonly providerOrder: string[];
  private readonly failureCount: Map<string, number> = new Map();
  private readonly FAILURE_THRESHOLD = 3;

  constructor(
    private readonly configService: ConfigService,
    private readonly ollamaService: OllamaEmbeddingService,
    private readonly openaiService: OpenAIEmbeddingService,
  ) {
    // Register available providers
    this.registerProvider('ollama', this.ollamaService, 768);
    this.registerProvider('openai', this.openaiService, 1536);

    // Get provider order from config (default: ollama,openai)
    const providersConfig =
      this.configService.get<string>('EMBEDDING_PROVIDERS') || 'ollama,openai';
    this.providerOrder = providersConfig.split(',').map((p) => p.trim());

    this.logger.log(
      `Embedding router initialized with providers: ${this.providerOrder.join(' → ')}`,
      'EmbeddingRouterService',
    );
  }

  private registerProvider(
    name: string,
    service: EmbeddingService,
    dimensions: number,
  ): void {
    this.providers.set(name, {
      name,
      service,
      dimensions,
      enabled: true,
    });
    this.failureCount.set(name, 0);
  }

  private isProviderAvailable(name: string): boolean {
    const provider = this.providers.get(name);
    if (!provider || !provider.enabled) {
      return false;
    }

    // Circuit breaker: disable provider if it has failed too many times
    const failures = this.failureCount.get(name) || 0;
    if (failures >= this.FAILURE_THRESHOLD) {
      this.logger.warn(
        `Provider ${name} disabled due to ${failures} consecutive failures`,
        'EmbeddingRouterService',
      );
      return false;
    }

    return true;
  }

  private recordSuccess(providerName: string): void {
    this.failureCount.set(providerName, 0);
  }

  private recordFailure(providerName: string): void {
    const current = this.failureCount.get(providerName) || 0;
    this.failureCount.set(providerName, current + 1);
  }

  async generateEmbedding(text: string): Promise<number[]> {
    const errors: Array<{ provider: string; error: string }> = [];

    for (const providerName of this.providerOrder) {
      if (!this.isProviderAvailable(providerName)) {
        continue;
      }

      const provider = this.providers.get(providerName);
      if (!provider) {
        continue;
      }

      try {
        this.logger.log(
          `Attempting embedding generation with ${providerName}`,
          'EmbeddingRouterService',
        );

        const embedding = await provider.service.generateEmbedding(text);

        this.recordSuccess(providerName);

        this.logger.log(
          `Successfully generated embedding with ${providerName} (${embedding.length} dimensions)`,
          'EmbeddingRouterService',
        );

        return embedding;
      } catch (error) {
        this.recordFailure(providerName);

        const errorMessage =
          error instanceof Error ? error.message : String(error);
        errors.push({ provider: providerName, error: errorMessage });

        this.logger.warn(
          `Failed to generate embedding with ${providerName}: ${errorMessage}`,
          'EmbeddingRouterService',
        );
      }
    }

    // All providers failed
    const errorSummary = errors
      .map((e) => `${e.provider}: ${e.error}`)
      .join('; ');
    throw new Error(`All embedding providers failed. Errors: ${errorSummary}`);
  }

  async generateBatchEmbeddings(texts: string[]): Promise<number[][]> {
    const errors: Array<{ provider: string; error: string }> = [];

    for (const providerName of this.providerOrder) {
      if (!this.isProviderAvailable(providerName)) {
        continue;
      }

      const provider = this.providers.get(providerName);
      if (!provider) {
        continue;
      }

      try {
        this.logger.log(
          `Attempting batch embedding generation with ${providerName} (${texts.length} texts)`,
          'EmbeddingRouterService',
        );

        const embeddings =
          await provider.service.generateBatchEmbeddings(texts);

        this.recordSuccess(providerName);

        this.logger.log(
          `Successfully generated ${embeddings.length} embeddings with ${providerName}`,
          'EmbeddingRouterService',
        );

        return embeddings;
      } catch (error) {
        this.recordFailure(providerName);

        const errorMessage =
          error instanceof Error ? error.message : String(error);
        errors.push({ provider: providerName, error: errorMessage });

        this.logger.warn(
          `Failed to generate batch embeddings with ${providerName}: ${errorMessage}`,
          'EmbeddingRouterService',
        );
      }
    }

    // All providers failed
    const errorSummary = errors
      .map((e) => `${e.provider}: ${e.error}`)
      .join('; ');
    throw new Error(
      `All embedding providers failed for batch operation. Errors: ${errorSummary}`,
    );
  }

  getDimensions(): number {
    // Return dimensions of the first available provider
    for (const providerName of this.providerOrder) {
      const provider = this.providers.get(providerName);
      if (provider && this.isProviderAvailable(providerName)) {
        return provider.dimensions;
      }
    }

    // Default to 768 (Ollama)
    return 768;
  }

  /**
   * Get the name of the currently active embedding provider
   * Used for tracking which provider was used for ingestion
   */
  getActiveProvider(): string | null {
    for (const providerName of this.providerOrder) {
      if (this.isProviderAvailable(providerName)) {
        return providerName;
      }
    }
    return null;
  }
}
