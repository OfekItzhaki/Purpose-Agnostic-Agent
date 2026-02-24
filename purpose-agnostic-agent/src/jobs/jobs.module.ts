import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { ConfigService } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { SessionCleanupProcessor } from './processors/session-cleanup.processor';
import { ChatModule } from '../chat/chat.module';
import { StructuredLogger } from '../common/logger.service';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        redis: configService.get<string>('REDIS_URL'),
      }),
    }),
    BullModule.registerQueue(
      {
        name: 'document-ingestion',
        defaultJobOptions: {
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 1000,
          },
          removeOnComplete: 100,
          removeOnFail: 1000,
        },
      },
      {
        name: 'embedding-generation',
        defaultJobOptions: {
          attempts: 5,
          backoff: {
            type: 'exponential',
            delay: 2000,
          },
          removeOnComplete: 100,
          removeOnFail: 1000,
        },
      },
    ),
    ChatModule,
  ],
  providers: [SessionCleanupProcessor, StructuredLogger],
  exports: [BullModule],
})
export class JobsModule {}
