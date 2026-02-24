import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance } from 'axios';
import {
  LLMProvider,
  GenerateRequest,
  GenerateResponse,
} from '../interfaces/llm-provider.interface.js';

@Injectable()
export class OpenRouterGPT4Provider implements LLMProvider {
  private readonly httpClient: AxiosInstance;
  private readonly apiKey: string;

  constructor(private readonly configService: ConfigService) {
    this.apiKey = this.configService.get<string>('OPENROUTER_API_KEY') || '';
    this.httpClient = axios.create({
      baseURL: 'https://openrouter.ai/api/v1',
      timeout: 30000, // 30 second timeout
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'HTTP-Referer': 'https://purpose-agnostic-agent.ai',
        'X-Title': 'Purpose Agnostic Agent',
      },
    });
  }

  async generate(request: GenerateRequest): Promise<GenerateResponse> {
    const startTime = Date.now();

    const messages = [
      { role: 'system', content: request.systemPrompt },
      ...request.messages,
    ];

    try {
      const response = await this.httpClient.post('/chat/completions', {
        model: 'openai/gpt-4o',
        messages,
        temperature: request.temperature || 0.7,
        max_tokens: request.maxTokens || 2000,
      });

      const latencyMs = Date.now() - startTime;

      return {
        content: response.data.choices[0].message.content,
        modelUsed: 'gpt-4o',
        tokensUsed: response.data.usage?.total_tokens || 0,
        latencyMs,
      };
    } catch (error) {
      throw error;
    }
  }

  getName(): string {
    return 'gpt-4o';
  }

  getTier(): 'primary' {
    return 'primary';
  }

  async isAvailable(): Promise<boolean> {
    try {
      await this.httpClient.get('/models', { timeout: 5000 });
      return true;
    } catch {
      return false;
    }
  }
}
