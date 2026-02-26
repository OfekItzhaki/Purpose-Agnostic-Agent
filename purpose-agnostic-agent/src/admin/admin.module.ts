import { Module, forwardRef, ValidationPipe } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { BullModule } from '@nestjs/bull';
import { APP_INTERCEPTOR, APP_FILTER, APP_PIPE } from '@nestjs/core';
import { AdminUser } from './entities/admin-user.entity.js';
import { AuditLog } from './entities/audit-log.entity.js';
import { KnowledgeCategory } from './entities/knowledge-category.entity.js';
import { IngestionEvent } from './entities/ingestion-event.entity.js';
import { KnowledgeDocument } from '../rag/entities/knowledge-document.entity.js';
import { KnowledgeChunk } from '../rag/entities/knowledge-chunk.entity.js';
import { PersonaEntity } from '../persona/entities/persona.entity.js';
import { AdminAuthService } from './services/admin-auth.service.js';
import { AuditLogService } from './services/audit-log.service.js';
import { AdminKnowledgeCategoryService } from './services/admin-knowledge-category.service.js';
import { AdminKnowledgeService } from './services/admin-knowledge.service.js';
import { AdminPersonaService } from './services/admin-persona.service.js';
import { AdminPersonaTestService } from './services/admin-persona-test.service.js';
import { AdminDocumentUploadService } from './services/admin-document-upload.service.js';
import { IngestionMonitorService } from './services/ingestion-monitor.service.js';
import { AdminAuthController } from './controllers/admin-auth.controller.js';
import { AdminPersonaController } from './controllers/admin-persona.controller.js';
import { AdminKnowledgeController } from './controllers/admin-knowledge.controller.js';
import { AdminCategoryController } from './controllers/admin-category.controller.js';
import { AdminMonitoringController } from './controllers/admin-monitoring.controller.js';
import { AdminAuditController } from './controllers/admin-audit.controller.js';
import { AdminAuthGuard } from './guards/admin-auth.guard.js';
import { AdminUserRepository } from './repositories/admin-user.repository.js';
import { AuditLogRepository } from './repositories/audit-log.repository.js';
import { KnowledgeCategoryRepository } from './repositories/knowledge-category.repository.js';
import { AuditLogInterceptor } from './interceptors/audit-log.interceptor.js';
import { AdminExceptionFilter } from './filters/admin-exception.filter.js';
import { PersonaModule } from '../persona/persona.module.js';
import { RAGModule } from '../rag/rag.module.js';
import { ModelRouterModule } from '../model-router/model-router.module.js';
import { StructuredLogger } from '../common/logger.service.js';
import { RAGSystemPromptService } from '../common/rag-system-prompt.service.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      AdminUser,
      AuditLog,
      KnowledgeCategory,
      IngestionEvent,
      KnowledgeDocument,
      KnowledgeChunk,
      PersonaEntity,
    ]),
    JwtModule.register({
      secret:
        process.env.ADMIN_JWT_SECRET ||
        process.env.JWT_SECRET ||
        'change-me-in-production',
      signOptions: {
        expiresIn: (process.env.ADMIN_JWT_EXPIRATION as any) || '8h',
      },
    }),
    BullModule.registerQueue({
      name: 'document-ingestion',
      defaultJobOptions: {
        attempts: 3, // Retry up to 3 times (Requirements 3.6, 11.5)
        backoff: {
          type: 'exponential',
          delay: 5000, // Start with 5 second delay, doubles each retry
        },
        removeOnComplete: false, // Keep completed jobs for status tracking
        removeOnFail: false, // Keep failed jobs for retry and monitoring
      },
    }),
    PersonaModule,
    forwardRef(() => RAGModule),
    ModelRouterModule,
  ],
  controllers: [
    AdminAuthController,
    AdminPersonaController,
    AdminKnowledgeController,
    AdminCategoryController,
    AdminMonitoringController,
    AdminAuditController,
  ],
  providers: [
    AdminAuthService,
    AdminAuthGuard,
    AdminUserRepository,
    AuditLogService,
    AuditLogRepository,
    AdminKnowledgeCategoryService,
    KnowledgeCategoryRepository,
    AdminKnowledgeService,
    AdminPersonaService,
    AdminPersonaTestService,
    AdminDocumentUploadService,
    IngestionMonitorService,
    StructuredLogger,
    RAGSystemPromptService,
    {
      provide: APP_INTERCEPTOR,
      useClass: AuditLogInterceptor,
    },
    {
      provide: APP_FILTER,
      useClass: AdminExceptionFilter,
    },
    {
      provide: APP_PIPE,
      useValue: new ValidationPipe({
        whitelist: true, // Strip properties that don't have decorators (Requirements 2.1, 10.6)
        transform: true, // Automatically transform payloads to DTO instances (Requirements 2.1, 10.6)
        forbidNonWhitelisted: true, // Throw error if non-whitelisted properties are present
        transformOptions: {
          enableImplicitConversion: true, // Enable implicit type conversion
        },
      }),
    },
  ],
  exports: [
    AdminAuthService,
    AdminAuthGuard,
    AdminUserRepository,
    AuditLogService,
    AdminKnowledgeCategoryService,
    AdminKnowledgeService,
    AdminPersonaService,
    AdminPersonaTestService,
    AdminDocumentUploadService,
    IngestionMonitorService,
  ],
})
export class AdminModule {}
