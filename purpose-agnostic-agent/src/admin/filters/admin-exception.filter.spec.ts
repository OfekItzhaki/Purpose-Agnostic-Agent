import { Test, TestingModule } from '@nestjs/testing';
import {
  HttpException,
  HttpStatus,
  BadRequestException,
  UnauthorizedException,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { AdminExceptionFilter } from './admin-exception.filter.js';
import { StructuredLogger } from '../../common/logger.service.js';
import { ErrorResponseDto } from '../dto/error-response.dto.js';

describe('AdminExceptionFilter', () => {
  let filter: AdminExceptionFilter;
  let logger: StructuredLogger;
  let mockResponse: any;
  let mockRequest: any;
  let mockArgumentsHost: any;

  beforeEach(async () => {
    // Mock logger
    logger = {
      error: jest.fn(),
    } as any;

    // Mock response
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };

    // Mock request
    mockRequest = {
      url: '/admin/personas/123',
      method: 'GET',
    };

    // Mock ArgumentsHost
    mockArgumentsHost = {
      switchToHttp: jest.fn().mockReturnValue({
        getResponse: () => mockResponse,
        getRequest: () => mockRequest,
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminExceptionFilter,
        {
          provide: StructuredLogger,
          useValue: logger,
        },
      ],
    }).compile();

    filter = module.get<AdminExceptionFilter>(AdminExceptionFilter);
  });

  it('should be defined', () => {
    expect(filter).toBeDefined();
  });

  describe('HTTP exceptions', () => {
    it('should format BadRequestException correctly', () => {
      const exception = new BadRequestException('Invalid input');

      filter.catch(exception, mockArgumentsHost);

      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'https://api.example.com/errors/validation-error',
          title: 'Validation Error',
          status: HttpStatus.BAD_REQUEST,
          detail: 'Invalid input',
          instance: '/admin/personas/123',
        }),
      );
    });

    it('should format UnauthorizedException correctly', () => {
      const exception = new UnauthorizedException('Invalid token');

      filter.catch(exception, mockArgumentsHost);

      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.UNAUTHORIZED);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'https://api.example.com/errors/authentication-error',
          title: 'Authentication Error',
          status: HttpStatus.UNAUTHORIZED,
          detail: 'Invalid token',
          instance: '/admin/personas/123',
        }),
      );
    });

    it('should format NotFoundException correctly', () => {
      const exception = new NotFoundException('Persona not found');

      filter.catch(exception, mockArgumentsHost);

      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.NOT_FOUND);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'https://api.example.com/errors/not-found',
          title: 'Resource Not Found',
          status: HttpStatus.NOT_FOUND,
          detail: 'Persona not found',
          instance: '/admin/personas/123',
        }),
      );
    });

    it('should format ConflictException correctly', () => {
      const exception = new ConflictException('Duplicate persona ID');

      filter.catch(exception, mockArgumentsHost);

      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.CONFLICT);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'https://api.example.com/errors/conflict',
          title: 'Resource Conflict',
          status: HttpStatus.CONFLICT,
          detail: 'Duplicate persona ID',
          instance: '/admin/personas/123',
        }),
      );
    });

    it('should handle validation errors with field details', () => {
      const exception = new BadRequestException({
        message: ['email must be a valid email', 'name should not be empty'],
        error: 'Bad Request',
        statusCode: 400,
      });

      filter.catch(exception, mockArgumentsHost);

      const response = mockResponse.json.mock.calls[0][0] as ErrorResponseDto;
      expect(response.status).toBe(HttpStatus.BAD_REQUEST);
      expect(response.detail).toBe('Validation failed for one or more fields');
      expect(response.errors).toBeDefined();
      expect(response.errors?.length).toBe(2);
    });
  });

  describe('Unknown exceptions', () => {
    it('should format Error as 500 Internal Server Error', () => {
      const exception = new Error('Database connection failed');

      filter.catch(exception, mockArgumentsHost);

      expect(mockResponse.status).toHaveBeenCalledWith(
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'https://api.example.com/errors/internal-server-error',
          title: 'Internal Server Error',
          status: HttpStatus.INTERNAL_SERVER_ERROR,
          detail: 'Database connection failed',
          instance: '/admin/personas/123',
        }),
      );
    });

    it('should format non-Error exceptions as 500', () => {
      const exception = 'Something went wrong';

      filter.catch(exception, mockArgumentsHost);

      expect(mockResponse.status).toHaveBeenCalledWith(
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'https://api.example.com/errors/internal-server-error',
          title: 'Internal Server Error',
          status: HttpStatus.INTERNAL_SERVER_ERROR,
          detail: 'An unexpected error occurred',
          instance: '/admin/personas/123',
        }),
      );
    });
  });

  describe('Logging', () => {
    it('should log all exceptions', () => {
      const exception = new BadRequestException('Invalid input');

      filter.catch(exception, mockArgumentsHost);

      expect(logger.error).toHaveBeenCalledWith(
        'Admin API error',
        expect.any(String),
        'GET /admin/personas/123 - Status: 400',
      );
    });

    it('should log stack trace for Error instances', () => {
      const exception = new Error('Database error');

      filter.catch(exception, mockArgumentsHost);

      expect(logger.error).toHaveBeenCalledWith(
        'Admin API error',
        expect.any(String),
        'GET /admin/personas/123 - Status: 500',
      );
    });
  });

  describe('RFC 7807 compliance', () => {
    it('should include all required RFC 7807 fields', () => {
      const exception = new BadRequestException('Invalid input');

      filter.catch(exception, mockArgumentsHost);

      const response = mockResponse.json.mock.calls[0][0] as ErrorResponseDto;
      expect(response).toHaveProperty('type');
      expect(response).toHaveProperty('title');
      expect(response).toHaveProperty('status');
      expect(response).toHaveProperty('detail');
      expect(response).toHaveProperty('instance');
    });

    it('should use consistent error type URIs', () => {
      const testCases = [
        {
          exception: new BadRequestException(),
          expectedType: 'validation-error',
        },
        {
          exception: new UnauthorizedException(),
          expectedType: 'authentication-error',
        },
        { exception: new NotFoundException(), expectedType: 'not-found' },
        { exception: new ConflictException(), expectedType: 'conflict' },
      ];

      testCases.forEach(({ exception, expectedType }) => {
        mockResponse.json.mockClear();
        filter.catch(exception, mockArgumentsHost);

        const response = mockResponse.json.mock.calls[0][0] as ErrorResponseDto;
        expect(response.type).toContain(expectedType);
      });
    });
  });
});
