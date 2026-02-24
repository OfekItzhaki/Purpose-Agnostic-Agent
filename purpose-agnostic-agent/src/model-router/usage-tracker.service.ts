import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { StructuredLogger } from '../common/logger.service';

interface UsageStats {
  requestCount: number;
  tokenCount: number;
  lastReset: Date;
}

@Injectable()
export class UsageTrackerService {
  private readonly logger = new StructuredLogger();
  private readonly stats = new Map<string, UsageStats>();

  // Configurable limits from environment variables
  private readonly DAILY_REQUEST_LIMIT: number;
  private readonly DAILY_TOKEN_LIMIT: number;
  private readonly RPM_LIMIT: number;
  private readonly ENABLED: boolean;

  private rpmCounter = 0;
  private rpmResetTime = Date.now() + 60000;

  constructor(private readonly configService: ConfigService) {
    // Load limits from environment or disable tracking
    this.ENABLED = this.configService.get<string>('USAGE_TRACKING_ENABLED') === 'true';
    this.DAILY_REQUEST_LIMIT = parseInt(
      this.configService.get<string>('DAILY_REQUEST_LIMIT') || '999999',
      10,
    );
    this.DAILY_TOKEN_LIMIT = parseInt(
      this.configService.get<string>('DAILY_TOKEN_LIMIT') || '999999999',
      10,
    );
    this.RPM_LIMIT = parseInt(
      this.configService.get<string>('RPM_LIMIT') || '999',
      10,
    );

    if (this.ENABLED) {
      this.logger.log(
        `Usage tracking enabled: ${this.DAILY_REQUEST_LIMIT} req/day, ${this.DAILY_TOKEN_LIMIT} tokens/day, ${this.RPM_LIMIT} req/min`,
        'UsageTrackerService',
      );

      // Reset RPM counter every minute
      setInterval(() => {
        this.rpmCounter = 0;
        this.rpmResetTime = Date.now() + 60000;
      }, 60000);
    } else {
      this.logger.log('Usage tracking disabled', 'UsageTrackerService');
    }
  }

  canMakeRequest(provider: string): { allowed: boolean; reason?: string } {
    // If tracking is disabled, always allow
    if (!this.ENABLED) {
      return { allowed: true };
    }

    // Check RPM limit
    if (this.rpmCounter >= this.RPM_LIMIT) {
      return {
        allowed: false,
        reason: `Rate limit exceeded: ${this.RPM_LIMIT} requests per minute`,
      };
    }

    const stats = this.getOrCreateStats(provider);

    // Reset daily stats if needed
    if (this.shouldResetDaily(stats.lastReset)) {
      stats.requestCount = 0;
      stats.tokenCount = 0;
      stats.lastReset = new Date();
    }

    // Check daily request limit
    if (stats.requestCount >= this.DAILY_REQUEST_LIMIT) {
      return {
        allowed: false,
        reason: `Daily request limit exceeded: ${this.DAILY_REQUEST_LIMIT} requests per day`,
      };
    }

    // Check daily token limit
    if (stats.tokenCount >= this.DAILY_TOKEN_LIMIT) {
      return {
        allowed: false,
        reason: `Daily token limit exceeded: ${this.DAILY_TOKEN_LIMIT} tokens per day`,
      };
    }

    return { allowed: true };
  }

  trackUsage(provider: string, tokensUsed: number): void {
    if (!this.ENABLED) {
      return;
    }

    const stats = this.getOrCreateStats(provider);
    
    stats.requestCount++;
    stats.tokenCount += tokensUsed;
    this.rpmCounter++;

    this.logger.logWithContext('info', 'Usage tracked', {
      provider,
      requestCount: stats.requestCount,
      tokenCount: stats.tokenCount,
      rpmCounter: this.rpmCounter,
      dailyRequestsRemaining: this.DAILY_REQUEST_LIMIT - stats.requestCount,
      dailyTokensRemaining: this.DAILY_TOKEN_LIMIT - stats.tokenCount,
      rpmRemaining: this.RPM_LIMIT - this.rpmCounter,
    });

    // Warn when approaching limits
    if (stats.requestCount > this.DAILY_REQUEST_LIMIT * 0.8) {
      this.logger.warn(
        `Approaching daily request limit: ${stats.requestCount}/${this.DAILY_REQUEST_LIMIT}`,
        'UsageTrackerService',
      );
    }

    if (stats.tokenCount > this.DAILY_TOKEN_LIMIT * 0.8) {
      this.logger.warn(
        `Approaching daily token limit: ${stats.tokenCount}/${this.DAILY_TOKEN_LIMIT}`,
        'UsageTrackerService',
      );
    }
  }

  getUsageStats(provider: string): UsageStats {
    return this.getOrCreateStats(provider);
  }

  private getOrCreateStats(provider: string): UsageStats {
    if (!this.stats.has(provider)) {
      this.stats.set(provider, {
        requestCount: 0,
        tokenCount: 0,
        lastReset: new Date(),
      });
    }
    return this.stats.get(provider)!;
  }

  private shouldResetDaily(lastReset: Date): boolean {
    const now = new Date();
    const resetDate = new Date(lastReset);
    
    // Reset if it's a new day
    return (
      now.getDate() !== resetDate.getDate() ||
      now.getMonth() !== resetDate.getMonth() ||
      now.getFullYear() !== resetDate.getFullYear()
    );
  }
}
