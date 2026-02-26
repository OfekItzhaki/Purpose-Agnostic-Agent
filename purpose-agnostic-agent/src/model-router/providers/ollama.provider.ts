import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance } from 'axios';
import {
  LLMProvider,
  GenerateRequest,
  GenerateResponse,
} from '../interfaces/llm-provider.interface.js';

@Injectable()
export class OllamaProvider implements LLMProvider {
  private readonly httpClient: AxiosInstance;
  private readonly ollamaUrl: string;

  constructor(private readonly configService: ConfigService) {
    this.ollamaUrl =
      this.configService.get<string>('OLLAMA_URL') || 'http://localhost:11434';
    this.httpClient = axios.create({
      baseURL: this.ollamaUrl,
      timeout: 60000, // 60 second timeout for local inference
    });
  }

  async generate(request: GenerateRequest): Promise<GenerateResponse> {
    const startTime = Date.now();

    const prompt = `${request.systemPrompt}\n\n${request.messages.map((m) => `${m.role}: ${m.content}`).join('\n')}`;

    try {
      const response = await this.httpClient.post('/api/generate', {
        model: 'llama2',
        prompt,
        stream: false,
      });

      const latencyMs = Date.now() - startTime;

      return {
        content: response.data.response,
        modelUsed: 'ollama',
        tokensUsed: 0, // Ollama doesn't provide token count
        latencyMs,
      };
    } catch (error) {
      throw error;
    }
  }

  getName(): string {
    return 'ollama';
  }

  getTier(): 'local' {
    return 'local';
  }

  async isAvailable(): Promise<boolean> {
    try {
      await this.httpClient.get('/api/tags', { timeout: 5000 });
      return true;
    } catch {
      return false;
    }
  }
}
