import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance } from 'axios';
import { EmbeddingService } from '../interfaces/embedding.service.interface.js';
import { Retry } from '../../common/decorators/retry.decorator.js';

@Injectable()
export class OllamaEmbeddingService implements EmbeddingService {
  private readonly httpClient: AxiosInstance;
  private readonly ollamaUrl: string;
  private readonly model: string;

  constructor(private readonly configService: ConfigService) {
    this.ollamaUrl =
      this.configService.get<string>('OLLAMA_URL') || 'http://ollama:11434';
    this.model =
      this.configService.get<string>('OLLAMA_EMBEDDING_MODEL') ||
      'nomic-embed-text';
    this.httpClient = axios.create({
      baseURL: this.ollamaUrl,
      timeout: 60000, // Ollama can be slower
    });
  }

  @Retry({
    maxAttempts: 3,
    initialDelayMs: 1000,
    maxDelayMs: 10000,
    backoffMultiplier: 2,
    retryableErrors: ['TIMEOUT', 'CONNECTION_ERROR', 'ECONNREFUSED'],
  })
  async generateEmbedding(text: string): Promise<number[]> {
    try {
      const response = await this.httpClient.post('/api/embeddings', {
        model: this.model,
        prompt: text,
      });

      return response.data.embedding;
    } catch (error) {
      throw error;
    }
  }

  @Retry({
    maxAttempts: 3,
    initialDelayMs: 2000,
    maxDelayMs: 15000,
    backoffMultiplier: 2,
    retryableErrors: ['TIMEOUT', 'CONNECTION_ERROR', 'ECONNREFUSED'],
  })
  async generateBatchEmbeddings(texts: string[]): Promise<number[][]> {
    const results: number[][] = [];

    // Process sequentially for Ollama (no rate limits, but slower)
    for (const text of texts) {
      try {
        const response = await this.httpClient.post('/api/embeddings', {
          model: this.model,
          prompt: text,
        });

        results.push(response.data.embedding);
      } catch (error) {
        throw error;
      }
    }

    return results;
  }

  getDimensions(): number {
    // nomic-embed-text produces 768-dimensional embeddings
    return 768;
  }
}
