import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { ScheduleModule } from '@nestjs/schedule';
import { SessionCleanupProcessor } from './processors/session-cleanup.processor';
import { ChatModule } from '../chat/chat.module';
import { StructuredLogger } from '../common/logger.service';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    BullModule.registerQueue({
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
    }),
    ChatModule,
  ],
  providers: [SessionCleanupProcessor, StructuredLogger],
  exports: [BullModule],
})
export class JobsModule {}
