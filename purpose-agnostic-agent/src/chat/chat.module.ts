import { Module, forwardRef } from '@nestjs/common';
import { Pool } from 'pg';
import { ChatController } from './chat.controller';
import { ChatService } from './chat.service';
import { PostgresSessionRepository } from './repositories/postgres-session.repository';
import { SessionRepository } from './interfaces/session.repository.interface';
import { PersonaModule } from '../persona/persona.module';
import { RAGModule } from '../rag/rag.module';
import { ModelRouterModule } from '../model-router/model-router.module';
import { StructuredLogger } from '../common/logger.service';
import { RAGSystemPromptService } from '../common/rag-system-prompt.service';

@Module({
  imports: [PersonaModule, forwardRef(() => RAGModule), ModelRouterModule],
  controllers: [ChatController],
  providers: [
    ChatService,
    StructuredLogger,
    RAGSystemPromptService,
    {
      provide: 'DATABASE_POOL',
      useFactory: () => {
        return new Pool({
          connectionString: process.env.DATABASE_URL,
        });
      },
    },
    {
      provide: 'SessionRepository',
      useFactory: (pool: Pool) => {
        return new PostgresSessionRepository(pool);
      },
      inject: ['DATABASE_POOL'],
    },
    {
      provide: PostgresSessionRepository,
      useFactory: (pool: Pool) => {
        return new PostgresSessionRepository(pool);
      },
      inject: ['DATABASE_POOL'],
    },
  ],
  exports: [ChatService, PostgresSessionRepository],
})
export class ChatModule {}
