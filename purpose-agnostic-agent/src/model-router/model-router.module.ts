import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ModelRouterService } from './model-router.service.js';
import { LLMProviderFactory } from './provider.factory.js';
import { GeminiProvider } from './providers/gemini.provider.js';
import { OpenRouterGPT4Provider } from './providers/gpt4.provider.js';
import { ClaudeProvider } from './providers/claude.provider.js';
import { OllamaProvider } from './providers/ollama.provider.js';
import { FailoverEvent } from './entities/failover-event.entity.js';
import { UsageTrackerService } from './usage-tracker.service.js';

@Module({
  imports: [TypeOrmModule.forFeature([FailoverEvent])],
  providers: [
    ModelRouterService,
    LLMProviderFactory,
    UsageTrackerService,
    {
      provide: GeminiProvider,
      useFactory: () => {
        const apiKey = process.env.GOOGLE_AI_API_KEY || '';
        return new GeminiProvider(apiKey);
      },
    },
    OpenRouterGPT4Provider,
    ClaudeProvider,
    OllamaProvider,
  ],
  exports: [ModelRouterService],
})
export class ModelRouterModule {}
