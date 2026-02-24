import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance } from 'axios';
import { EmbeddingService } from '../interfaces/embedding.service.interface.js';
import { Retry } from '../../common/decorators/retry.decorator.js';

@Injectable()
export class OpenAIEmbeddingService implements EmbeddingService {
  private readonly httpClient: AxiosInstance;
  private readonly apiKey: string;

  constructor(private readonly configService: ConfigService) {
    this.apiKey = this.configService.get<string>('OPENAI_API_KEY') || '';
    this.httpClient = axios.create({
      baseURL: 'https://api.openai.com/v1',
      timeout: 30000,
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
      },
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
      const response = await this.httpClient.post('/embeddings', {
        model: 'text-embedding-3-small',
        input: text,
      });

      return response.data.data[0].embedding;
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
    // Process in batches of 100 to avoid rate limits
    const batchSize = 100;
    const results: number[][] = [];

    for (let i = 0; i < texts.length; i += batchSize) {
      const batch = texts.slice(i, i + batchSize);

      try {
        const response = await this.httpClient.post('/embeddings', {
          model: 'text-embedding-3-small',
          input: batch,
        });

        const embeddings = response.data.data.map((item: any) => item.embedding);
        results.push(...embeddings);

        // Rate limiting: wait 1 second between batches
        if (i + batchSize < texts.length) {
          await new Promise((resolve) => setTimeout(resolve, 1000));
        }
      } catch (error) {
        throw error;
      }
    }

    return results;
  }

  getDimensions(): number {
    return 1536;
  }
}
