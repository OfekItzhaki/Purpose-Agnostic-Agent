import { Injectable } from '@nestjs/common';
import { LLMProvider } from './interfaces/llm-provider.interface.js';
import { GeminiProvider } from './providers/gemini.provider.js';
import { OpenRouterGPT4Provider } from './providers/gpt4.provider.js';
import { ClaudeProvider } from './providers/claude.provider.js';
import { OllamaProvider } from './providers/ollama.provider.js';

@Injectable()
export class LLMProviderFactory {
  constructor(
    private readonly geminiProvider: GeminiProvider,
    private readonly gpt4Provider: OpenRouterGPT4Provider,
    private readonly claudeProvider: ClaudeProvider,
    private readonly ollamaProvider: OllamaProvider,
  ) {}

  createProvider(name: string): LLMProvider {
    switch (name) {
      case 'gemini-pro':
        return this.geminiProvider;
      case 'gpt-4o':
        return this.gpt4Provider;
      case 'claude-3.5':
        return this.claudeProvider;
      case 'ollama':
        return this.ollamaProvider;
      default:
        throw new Error(`Unknown provider: ${name}`);
    }
  }

  getAllProviders(): LLMProvider[] {
    return [
      this.geminiProvider,
      this.gpt4Provider,
      this.claudeProvider,
      this.ollamaProvider,
    ];
  }

  getProvidersByTier(): Map<string, LLMProvider[]> {
    const providers = this.getAllProviders();
    const byTier = new Map<string, LLMProvider[]>();

    for (const provider of providers) {
      const tier = provider.getTier();
      if (!byTier.has(tier)) {
        byTier.set(tier, []);
      }
      byTier.get(tier)!.push(provider);
    }

    return byTier;
  }
}
