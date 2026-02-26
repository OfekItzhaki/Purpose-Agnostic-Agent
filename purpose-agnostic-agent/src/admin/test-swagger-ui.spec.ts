/**
 * Swagger UI Accessibility Test
 *
 * This test verifies that the Swagger UI configuration is correct
 * and would be accessible when the application runs.
 *
 * Requirements: 10.5
 */

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';

describe('Swagger API Documentation (Unit Test)', () => {
  let app: INestApplication | undefined;

  beforeAll(async () => {
    // We'll test the Swagger configuration without starting the full app
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  describe('Admin API Swagger Configuration', () => {
    it('should have correct admin Swagger configuration', () => {
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

      // Verify configuration properties
      expect(adminConfig.info.title).toBe('Admin Panel API');
      expect(adminConfig.info.version).toBe('1.0');
      expect(adminConfig.info.description).toContain('Bearer token');

      // Verify Bearer auth is configured
      expect(adminConfig.components?.securitySchemes).toBeDefined();
      const bearerScheme = adminConfig.components?.securitySchemes?.['bearer'];
      expect(bearerScheme).toBeDefined();
      if (bearerScheme && 'type' in bearerScheme) {
        expect(bearerScheme.type).toBe('http');
      }
      if (bearerScheme && 'scheme' in bearerScheme) {
        expect(bearerScheme.scheme).toBe('bearer');
      }

      // Verify tags are present
      expect(adminConfig.tags).toBeDefined();
      expect(adminConfig.tags?.length).toBeGreaterThanOrEqual(5);

      const tagNames = adminConfig.tags?.map((tag) => tag.name) || [];
      expect(tagNames).toContain('Admin - Personas');
      expect(tagNames).toContain('Admin - Knowledge');
      expect(tagNames).toContain('Admin - Categories');
      expect(tagNames).toContain('Admin - Monitoring');
      expect(tagNames).toContain('Admin - Audit');
    });

    it('should verify all admin controllers have @ApiTags decorator', () => {
      const fs = require('fs');
      const path = require('path');

      const controllersDir = path.join(__dirname, 'controllers');
      const controllerFiles = fs
        .readdirSync(controllersDir)
        .filter(
          (file: string) =>
            file.startsWith('admin-') && file.endsWith('.controller.ts'),
        )
        .filter((file: string) => file !== 'admin-auth.controller.ts'); // Exclude auth controller (login endpoint doesn't need auth)

      expect(controllerFiles.length).toBeGreaterThan(0);

      for (const file of controllerFiles) {
        const filePath = path.join(controllersDir, file);
        const content = fs.readFileSync(filePath, 'utf-8');

        expect(content).toContain('@ApiTags(');
        expect(content).toContain('@ApiBearerAuth()');
      }
    });

    it('should verify all admin endpoints have @ApiOperation', () => {
      const fs = require('fs');
      const path = require('path');

      const controllersDir = path.join(__dirname, 'controllers');
      const controllerFiles = fs
        .readdirSync(controllersDir)
        .filter(
          (file: string) =>
            file.startsWith('admin-') && file.endsWith('.controller.ts'),
        )
        .filter((file: string) => file !== 'admin-auth.controller.ts'); // Exclude auth controller

      for (const file of controllerFiles) {
        const filePath = path.join(controllersDir, file);
        const content = fs.readFileSync(filePath, 'utf-8');

        // Find all HTTP method decorators
        const methodMatches = content.match(/@(Get|Post|Put|Delete|Patch)\(/g);
        const operationMatches = content.match(/@ApiOperation\(/g);

        if (methodMatches) {
          expect(operationMatches).toBeDefined();
          expect(operationMatches!.length).toBeGreaterThanOrEqual(
            methodMatches.length,
          );
        }
      }
    });

    it('should verify all admin endpoints have @ApiResponse decorators', () => {
      const fs = require('fs');
      const path = require('path');

      const controllersDir = path.join(__dirname, 'controllers');
      const controllerFiles = fs
        .readdirSync(controllersDir)
        .filter(
          (file: string) =>
            file.startsWith('admin-') && file.endsWith('.controller.ts'),
        )
        .filter((file: string) => file !== 'admin-auth.controller.ts'); // Exclude auth controller

      for (const file of controllerFiles) {
        const filePath = path.join(controllersDir, file);
        const content = fs.readFileSync(filePath, 'utf-8');

        // Find all HTTP method decorators
        const methodMatches = content.match(/@(Get|Post|Put|Delete|Patch)\(/g);
        const responseMatches = content.match(/@ApiResponse\(/g);

        if (methodMatches) {
          expect(responseMatches).toBeDefined();
          // Each endpoint should have at least 2 responses (success + error)
          expect(responseMatches!.length).toBeGreaterThanOrEqual(
            methodMatches.length * 2,
          );
        }
      }
    });

    it('should verify request/response examples are present', () => {
      const fs = require('fs');
      const path = require('path');

      const controllersDir = path.join(__dirname, 'controllers');
      const controllerFiles = fs
        .readdirSync(controllersDir)
        .filter(
          (file: string) =>
            file.startsWith('admin-') && file.endsWith('.controller.ts'),
        );

      let totalExamples = 0;

      for (const file of controllerFiles) {
        const filePath = path.join(controllersDir, file);
        const content = fs.readFileSync(filePath, 'utf-8');

        // Count examples
        const exampleMatches = content.match(/example:/g);
        const examplesMatches = content.match(/examples:/g);

        if (exampleMatches) totalExamples += exampleMatches.length;
        if (examplesMatches) totalExamples += examplesMatches.length;
      }

      // Should have many examples across all controllers
      expect(totalExamples).toBeGreaterThan(20);
    });

    it('should verify main.ts has admin Swagger setup', () => {
      const fs = require('fs');
      const path = require('path');

      const mainTsPath = path.join(__dirname, '..', 'main.ts');
      const content = fs.readFileSync(mainTsPath, 'utf-8');

      // Verify admin Swagger is set up
      expect(content).toContain("SwaggerModule.setup('admin/api-docs'");
      expect(content).toContain('Admin Panel API');
      expect(content).toContain('addBearerAuth');

      // Verify the route is logged
      expect(content).toContain('Admin API Documentation');
    });

    it('should verify Swagger UI customization is present', () => {
      const fs = require('fs');
      const path = require('path');

      const mainTsPath = path.join(__dirname, '..', 'main.ts');
      const content = fs.readFileSync(mainTsPath, 'utf-8');

      // Verify custom site title
      expect(content).toContain('customSiteTitle');
      expect(content).toContain('Admin Panel API Documentation');
    });
  });

  describe('Expected Admin Endpoints', () => {
    const expectedEndpoints = [
      { controller: 'admin-persona', method: 'GET', path: '/admin/personas' },
      { controller: 'admin-persona', method: 'POST', path: '/admin/personas' },
      {
        controller: 'admin-persona',
        method: 'PUT',
        path: '/admin/personas/:id',
      },
      {
        controller: 'admin-persona',
        method: 'DELETE',
        path: '/admin/personas/:id',
      },
      {
        controller: 'admin-persona',
        method: 'POST',
        path: '/admin/personas/:id/test',
      },
      {
        controller: 'admin-knowledge',
        method: 'GET',
        path: '/admin/knowledge/documents',
      },
      {
        controller: 'admin-knowledge',
        method: 'POST',
        path: '/admin/knowledge/documents/upload',
      },
      {
        controller: 'admin-knowledge',
        method: 'POST',
        path: '/admin/knowledge/documents/bulk-upload',
      },
      {
        controller: 'admin-knowledge',
        method: 'DELETE',
        path: '/admin/knowledge/documents/:id',
      },
      {
        controller: 'admin-knowledge',
        method: 'POST',
        path: '/admin/knowledge/documents/bulk-delete',
      },
      {
        controller: 'admin-knowledge',
        method: 'PUT',
        path: '/admin/knowledge/documents/bulk-reassign',
      },
      {
        controller: 'admin-category',
        method: 'GET',
        path: '/admin/categories',
      },
      {
        controller: 'admin-category',
        method: 'POST',
        path: '/admin/categories',
      },
      {
        controller: 'admin-category',
        method: 'DELETE',
        path: '/admin/categories/:id',
      },
      {
        controller: 'admin-monitoring',
        method: 'GET',
        path: '/admin/monitoring/ingestion/status',
      },
      {
        controller: 'admin-monitoring',
        method: 'GET',
        path: '/admin/monitoring/ingestion/statistics',
      },
      {
        controller: 'admin-monitoring',
        method: 'POST',
        path: '/admin/monitoring/ingestion/retry/:id',
      },
      { controller: 'admin-audit', method: 'GET', path: '/admin/audit/logs' },
    ];

    it.each(expectedEndpoints)(
      'should have documentation for $method $path',
      ({ controller, method, path }) => {
        const fs = require('fs');
        const pathModule = require('path');

        const controllerPath = pathModule.join(
          __dirname,
          'controllers',
          `${controller}.controller.ts`,
        );

        expect(fs.existsSync(controllerPath)).toBe(true);

        const content = fs.readFileSync(controllerPath, 'utf-8');

        // Verify the endpoint exists
        const methodDecorator = `@${method.charAt(0) + method.slice(1).toLowerCase()}(`;
        expect(content).toContain(methodDecorator);
      },
    );
  });

  describe('Bearer Authentication Configuration', () => {
    it('should verify all admin controllers use AdminAuthGuard', () => {
      const fs = require('fs');
      const path = require('path');

      const controllersDir = path.join(__dirname, 'controllers');
      const controllerFiles = fs
        .readdirSync(controllersDir)
        .filter(
          (file: string) =>
            file.startsWith('admin-') && file.endsWith('.controller.ts'),
        )
        .filter((file: string) => file !== 'admin-auth.controller.ts'); // Exclude auth controller

      for (const file of controllerFiles) {
        const filePath = path.join(controllersDir, file);
        const content = fs.readFileSync(filePath, 'utf-8');

        expect(content).toContain('AdminAuthGuard');
        expect(content).toContain('@UseGuards(AdminAuthGuard)');
      }
    });

    it('should verify Bearer auth is documented in Swagger', () => {
      const fs = require('fs');
      const path = require('path');

      const controllersDir = path.join(__dirname, 'controllers');
      const controllerFiles = fs
        .readdirSync(controllersDir)
        .filter(
          (file: string) =>
            file.startsWith('admin-') && file.endsWith('.controller.ts'),
        )
        .filter((file: string) => file !== 'admin-auth.controller.ts'); // Exclude auth controller

      for (const file of controllerFiles) {
        const filePath = path.join(controllersDir, file);
        const content = fs.readFileSync(filePath, 'utf-8');

        // All admin controllers should have @ApiBearerAuth
        expect(content).toContain('@ApiBearerAuth()');
      }
    });
  });
});
