import { GoogleGenerativeAI } from '@google/generative-ai';
import {
  LLMProvider,
  GenerateRequest,
  GenerateResponse,
} from '../interfaces/llm-provider.interface';

export class GeminiProvider implements LLMProvider {
  private genAI: GoogleGenerativeAI;
  private model: any;
  private hasValidApiKey: boolean;

  constructor(apiKey: string) {
    this.hasValidApiKey = !!apiKey && apiKey.length > 0;
    
    if (!this.hasValidApiKey) {
      console.warn('GeminiProvider: API key is missing or empty. Provider will be unavailable.');
    }
    
    this.genAI = new GoogleGenerativeAI(apiKey || 'dummy-key');
    this.model = this.genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
  }

  getName(): string {
    return 'gemini-pro';
  }

  getTier(): 'primary' | 'fallback' | 'local' {
    return 'primary';
  }

  async generate(request: GenerateRequest): Promise<GenerateResponse> {
    try {
      const userMessage =
        request.messages.find((m) => m.role === 'user')?.content || '';
      const prompt = `${request.systemPrompt}\n\n${userMessage}`;

      // Enforce conservative limits to stay within free tier
      const maxTokens = Math.min(request.maxTokens || 1000, 2048); // Cap at 2048 tokens

      const result = await this.model.generateContent({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: request.temperature || 0.7,
          maxOutputTokens: maxTokens,
        },
      });

      const response = await result.response;
      const text = response.text();

      return {
        content: text,
        modelUsed: this.getName(),
        tokensUsed: response.usageMetadata?.totalTokenCount || 0,
        latencyMs: 0,
      };
    } catch (error: any) {
      // Check for authentication errors
      const isAuthError = 
        error.status === 401 || 
        error.status === 403 ||
        error.message?.includes('API key not valid') ||
        error.message?.includes('API key expired');
      
      if (isAuthError) {
        throw new Error(
          'Google AI Studio API key is invalid or expired. Please check your GOOGLE_AI_API_KEY configuration.'
        );
      }
      
      throw new Error(`Gemini API error: ${error.message}`);
    }
  }

  async isAvailable(): Promise<boolean> {
    // If API key is missing or invalid, provider is not available
    if (!this.hasValidApiKey) {
      return false;
    }
    
    try {
      // Simple health check - try to generate a minimal response
      const result = await this.model.generateContent({
        contents: [{ role: 'user', parts: [{ text: 'ping' }] }],
        generationConfig: {
          maxOutputTokens: 10,
        },
      });
      await result.response;
      return true;
    } catch (error) {
      return false;
    }
  }
}
