import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import {
  HealthCheck,
  HealthCheckService,
  TypeOrmHealthIndicator,
} from '@nestjs/terminus';
import { LLMProviderHealthIndicator } from './llm-provider.health';

@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(
    private health: HealthCheckService,
    private db: TypeOrmHealthIndicator,
    private llmProvider: LLMProviderHealthIndicator,
  ) {}

  @Get()
  @ApiOperation({
    summary: 'Basic health check',
    description: 'Returns basic health status with timestamp and version.',
  })
  @ApiResponse({
    status: 200,
    description: 'Service is healthy',
    schema: {
      example: {
        status: 'ok',
        timestamp: '2024-01-15T10:30:00.000Z',
        version: '1.0.0',
      },
    },
  })
  getHealth() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || '1.0.0',
    };
  }

  @Get('ready')
  @HealthCheck()
  @ApiOperation({
    summary: 'Readiness check',
    description:
      'Checks if all dependencies (database, LLM providers) are available.',
  })
  @ApiResponse({
    status: 200,
    description: 'All dependencies are healthy',
    schema: {
      example: {
        status: 'ok',
        info: {
          database: { status: 'up' },
          'llm-providers': { status: 'up' },
        },
      },
    },
  })
  @ApiResponse({
    status: 503,
    description: 'One or more dependencies are unavailable',
    schema: {
      example: {
        status: 'error',
        error: {
          database: { status: 'down', message: 'Connection failed' },
        },
      },
    },
  })
  checkReady() {
    return this.health.check([
      () => this.db.pingCheck('database'),
      () => this.llmProvider.isHealthy('llm-providers'),
    ]);
  }
}
