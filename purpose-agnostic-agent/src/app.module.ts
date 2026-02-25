import { Module, ValidationPipe, MiddlewareConsumer, NestModule } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ThrottlerModule } from '@nestjs/throttler';
import { BullModule } from '@nestjs/bull';
import { APP_FILTER, APP_PIPE } from '@nestjs/core';
import configuration from './config/configuration.js';
import { GlobalExceptionFilter } from './common/filters/global-exception.filter.js';
import { SecurityHeadersMiddleware } from './common/middleware/security-headers.middleware.js';
import { RequestContextMiddleware } from './common/middleware/request-context.middleware.js';
import { ModelRouterModule } from './model-router/model-router.module.js';
import { RAGModule } from './rag/rag.module.js';
import { PersonaModule } from './persona/persona.module.js';
import { ChatModule } from './chat/chat.module.js';
import { JobsModule } from './jobs/jobs.module.js';
import { HealthModule } from './health/health.module.js';
import { MCPModule } from './mcp/mcp.module.js';

@Module({
  imports: [
    // Global configuration
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
    }),

    // Database
    TypeOrmModule.forRoot({
      type: 'postgres',
      url: process.env.DATABASE_URL,
      entities: [__dirname + '/**/*.entity{.ts,.js}'],
      synchronize: false, // Use migrations in production
      logging: process.env.NODE_ENV === 'development',
    }),

    // Rate limiting
    ThrottlerModule.forRoot([
      {
        ttl: 60000, // 1 minute
        limit: 100, // 100 requests per minute
      },
    ]),

    // Background jobs
    BullModule.forRoot({
      redis: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379', 10),
      },
    }),

    // Feature modules
    ModelRouterModule,
    RAGModule,
    PersonaModule,
    ChatModule,
    JobsModule,
    HealthModule,
    MCPModule,
  ],
  providers: [
    // Global validation pipe
    {
      provide: APP_PIPE,
      useValue: new ValidationPipe({
        whitelist: true,
        transform: true,
        forbidNonWhitelisted: true,
      }),
    },
    // Global exception filter
    {
      provide: APP_FILTER,
      useClass: GlobalExceptionFilter,
    },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(SecurityHeadersMiddleware, RequestContextMiddleware)
      .forRoutes('*');
  }
}
