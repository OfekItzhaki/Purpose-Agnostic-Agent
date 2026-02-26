import { DocumentBuilder } from '@nestjs/swagger';

describe('Main Application Bootstrap', () => {
  describe('Swagger Configuration', () => {
    it('should create admin API documentation with Bearer auth', () => {
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

      expect(adminConfig.info.title).toBe('Admin Panel API');
      expect(adminConfig.info.version).toBe('1.0');
      expect(adminConfig.components?.securitySchemes?.bearer).toBeDefined();
      expect(adminConfig.components?.securitySchemes?.bearer).toEqual({
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description:
          'Enter your JWT token obtained from the admin authentication endpoint',
      });
    });

    it('should include all admin tags in configuration', () => {
      const adminConfig = new DocumentBuilder()
        .setTitle('Admin Panel API')
        .setDescription('Admin API')
        .setVersion('1.0')
        .addTag('Admin - Personas', 'Persona CRUD operations and testing')
        .addTag('Admin - Knowledge', 'Knowledge document management and upload')
        .addTag('Admin - Categories', 'Knowledge category management')
        .addTag(
          'Admin - Monitoring',
          'Ingestion pipeline monitoring and statistics',
        )
        .addTag('Admin - Audit', 'Audit log access and filtering')
        .build();

      expect(adminConfig.tags).toHaveLength(5);
      expect(adminConfig.tags?.map((t) => t.name)).toEqual([
        'Admin - Personas',
        'Admin - Knowledge',
        'Admin - Categories',
        'Admin - Monitoring',
        'Admin - Audit',
      ]);
    });

    it('should filter admin routes correctly', () => {
      const mockDocument = {
        paths: {
          '/admin/personas': { get: {} },
          '/admin/knowledge': { post: {} },
          '/api/chat': { post: {} },
          '/health': { get: {} },
        } as Record<string, any>,
      };

      const filteredPaths = Object.keys(mockDocument.paths)
        .filter((path) => path.startsWith('/admin'))
        .reduce(
          (acc, path) => {
            acc[path] = mockDocument.paths[path];
            return acc;
          },
          {} as Record<string, any>,
        );

      expect(Object.keys(filteredPaths)).toEqual([
        '/admin/personas',
        '/admin/knowledge',
      ]);
      expect(filteredPaths['/api/chat']).toBeUndefined();
      expect(filteredPaths['/health']).toBeUndefined();
    });
  });

  describe('Main API Swagger Configuration', () => {
    it('should create main API documentation without auth', () => {
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

      expect(config.info.title).toBe('Purpose-Agnostic Agent API');
      expect(config.info.version).toBe('1.0');
      expect(config.components?.securitySchemes).toBeUndefined();
    });
  });
});
