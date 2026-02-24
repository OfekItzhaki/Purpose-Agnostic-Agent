import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PostgresSessionRepository } from '../../chat/repositories/postgres-session.repository';
import { StructuredLogger } from '../../common/logger.service';

@Injectable()
export class SessionCleanupProcessor {
  constructor(
    private readonly sessionRepository: PostgresSessionRepository,
    private readonly logger: StructuredLogger,
  ) {}

  @Cron(CronExpression.EVERY_HOUR)
  async handleSessionCleanup() {
    this.logger.logWithContext('info', 'Starting session cleanup job', {
      job: 'session-cleanup',
    });

    try {
      const deletedCount = await this.sessionRepository.deleteExpiredSessions();

      this.logger.logWithContext('info', 'Session cleanup completed', {
        job: 'session-cleanup',
        deletedCount,
      });
    } catch (error) {
      this.logger.logWithContext('error', 'Session cleanup failed', {
        job: 'session-cleanup',
        error: error.message,
      });
    }
  }
}
