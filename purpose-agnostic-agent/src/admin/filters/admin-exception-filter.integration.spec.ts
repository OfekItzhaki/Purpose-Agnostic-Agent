import { Test, TestingModule } from '@nestjs/testing';
import {
  INestApplication,
  Controller,
  Get,
  UseFilters,
  BadRequestException,
} from '@nestjs/common';
import request from 'supertest';
import { AdminExceptionFilter } from './admin-exception.filter.js';
import { StructuredLogger } from '../../common/logger.service.js';
import { ErrorResponseDto } from '../dto/error-response.dto.js';

// Test controller to trigger exceptions
@Controller('test')
@UseFilters(AdminExceptionFilter)
class TestController {
  @Get('bad-request')
  throwBadRequest() {
    throw new BadRequestException('Test validation error');
  }

  @Get('server-error')
  throwServerError() {
    throw new Error('Test server error');
  }
}

describe('AdminExceptionFilter Integration', () => {
  let app: INestApplication;
  let logger: StructuredLogger;

  beforeAll(async () => {
    // Mock logger
    logger = {
      error: jest.fn(),
      log: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn(),
    } as any;

    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [TestController],
      providers: [
        {
          provide: StructuredLogger,
          useValue: logger,
        },
        AdminExceptionFilter,
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('should return RFC 7807 formatted error for BadRequestException', async () => {
    const response = await request(app.getHttpServer())
      .get('/test/bad-request')
      .expect(400);

    const body = response.body as ErrorResponseDto;

    expect(body).toHaveProperty('type');
    expect(body).toHaveProperty('title');
    expect(body).toHaveProperty('status');
    expect(body).toHaveProperty('detail');
    expect(body).toHaveProperty('instance');

    expect(body.type).toContain('validation-error');
    expect(body.title).toBe('Validation Error');
    expect(body.status).toBe(400);
    expect(body.detail).toBe('Test validation error');
    expect(body.instance).toBe('/test/bad-request');
  });

  it('should return RFC 7807 formatted error for server errors', async () => {
    const response = await request(app.getHttpServer())
      .get('/test/server-error')
      .expect(500);

    const body = response.body as ErrorResponseDto;

    expect(body).toHaveProperty('type');
    expect(body).toHaveProperty('title');
    expect(body).toHaveProperty('status');
    expect(body).toHaveProperty('detail');
    expect(body).toHaveProperty('instance');

    expect(body.type).toContain('internal-server-error');
    expect(body.title).toBe('Internal Server Error');
    expect(body.status).toBe(500);
    expect(body.detail).toBe('Test server error');
    expect(body.instance).toBe('/test/server-error');
  });

  it('should log errors when exceptions occur', async () => {
    await request(app.getHttpServer()).get('/test/bad-request').expect(400);

    expect(logger.error).toHaveBeenCalled();
  });
});
