import { NestFactory } from '@nestjs/core';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { StructuredLogger } from './common/logger.service';
import * as express from 'express';

async function bootstrap() {
  const logger = new StructuredLogger();

  try {
    const app = await NestFactory.create(AppModule, {
      logger: logger,
    });

    // Request size limits (prevent DoS attacks)
    app.use(express.json({ limit: '1mb' }));
    app.use(express.urlencoded({ limit: '1mb', extended: true }));

    // CORS configuration with security
    const corsOrigins = process.env.CORS_ORIGIN
      ? process.env.CORS_ORIGIN.split(',').map((origin) => origin.trim())
      : ['http://localhost:3000', 'http://localhost:3001'];

    app.enableCors({
      origin: corsOrigins,
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key'],
      exposedHeaders: ['X-Request-ID'],
      maxAge: 3600, // Cache preflight requests for 1 hour
    });

    // Set global prefix (exclude health endpoints)
    app.setGlobalPrefix('api', {
      exclude: ['health', 'health/ready'],
    });

    // Swagger documentation for main API
    const config = new DocumentBuilder()
      .setTitle('Purpose-Agnostic Agent API')
      .setDescription(
        'Intelligent agent system with LLM routing, RAG, and dynamic persona management',
      )
      .setVersion('1.0')
      .addTag('chat', 'Chat endpoints for agent interactions')
      .addTag('personas', 'Persona management endpoints')
      .addTag('agents', 'Agent listing endpoints')
      .addTag('health', 'Health check endpoints')
      .build();

    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api/docs', app, document);

    // Swagger documentation for Admin API
    const adminConfig = new DocumentBuilder()
      .setTitle('Admin Panel API')
      .setDescription(
        'Administrative API for managing personas, knowledge documents, and system monitoring. ' +
          'All endpoints require authentication via Bearer token.',
      )
      .setVersion('1.0')
      .addBearerAuth(
        {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description:
            'Enter your JWT token obtained from the admin authentication endpoint',
        },
        'bearer',
      )
      .addTag('Admin - Personas', 'Persona CRUD operations and testing')
      .addTag('Admin - Knowledge', 'Knowledge document management and upload')
      .addTag('Admin - Categories', 'Knowledge category management')
      .addTag(
        'Admin - Monitoring',
        'Ingestion pipeline monitoring and statistics',
      )
      .addTag('Admin - Audit', 'Audit log access and filtering')
      .build();

    const adminDocument = SwaggerModule.createDocument(app, adminConfig, {
      include: [], // We'll manually filter by path prefix
      operationIdFactory: (controllerKey: string, methodKey: string) =>
        methodKey,
    });

    // Filter to only include admin routes
    const filteredAdminDocument = {
      ...adminDocument,
      paths: Object.keys(adminDocument.paths)
        .filter((path) => path.startsWith('/admin'))
        .reduce((acc, path) => {
          acc[path] = adminDocument.paths[path];
          return acc;
        }, {} as any),
    };

    SwaggerModule.setup('admin/api-docs', app, filteredAdminDocument, {
      customSiteTitle: 'Admin Panel API Documentation',
      customCss: '.swagger-ui .topbar { display: none }',
    });

    // Graceful shutdown
    app.enableShutdownHooks();

    const port = process.env.PORT || 3000;
    await app.listen(port);

    logger.log(
      `Application is running on: http://localhost:${port}`,
      'Bootstrap',
    );
    logger.log(
      `API Documentation: http://localhost:${port}/api/docs`,
      'Bootstrap',
    );
    logger.log(
      `Admin API Documentation: http://localhost:${port}/admin/api-docs`,
      'Bootstrap',
    );
    logger.log(`Health Check: http://localhost:${port}/health`, 'Bootstrap');
  } catch (error) {
    logger.error(
      'Failed to start application',
      (error as Error).stack,
      'Bootstrap',
    );
    process.exit(1);
  }
}

bootstrap();
