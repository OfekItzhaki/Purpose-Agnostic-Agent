import { Module } from '@nestjs/common';
import { TerminusModule } from '@nestjs/terminus';
import { HealthController } from './health.controller';
import { LLMProviderHealthIndicator } from './llm-provider.health';
import { ModelRouterModule } from '../model-router/model-router.module';

@Module({
  imports: [TerminusModule, ModelRouterModule],
  controllers: [HealthController],
  providers: [LLMProviderHealthIndicator],
})
export class HealthModule {}
