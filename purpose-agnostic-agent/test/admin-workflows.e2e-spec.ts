import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { BullModule } from '@nestjs/bull';
import { AdminModule } from '../src/admin/admin.module';
import { AdminUser } from '../src/admin/entities/admin-user.entity';
import { AuditLog } from '../src/admin/entities/audit-log.entity';
import { KnowledgeCategory } from '../src/admin/entities/knowledge-category.entity';
import { IngestionEvent } from '../src/admin/entities/ingestion-event.entity';
import { KnowledgeDocument } from '../src/rag/entities/knowledge-document.entity';
import { KnowledgeChunk } from '../src/rag/entities/knowledge-chunk.entity';
import { PersonaEntity } from '../src/persona/entities/persona.entity';
import { AdminUserRepository } from '../src/admin/repositories/admin-user.repository';
import * as bcrypt from 'bcrypt';
import * as path from 'path';
import * as fs from 'fs';

/**
 * End-to-End Test for Admin Panel Workflows
 *
 * Task 21.3: Test end-to-end admin workflows
 * - Create admin user → login → create persona → upload document → test persona
 * - Verify audit logs capture all actions
 * - Test bulk operations with multiple documents
 *
 * Requirements: All
 */
describe('Admin Workflows (e2e)', () => {
  let app: INestApplication<App>;
  let adminUserRepository: AdminUserRepository;
  let authToken: string;
  let testPersonaId: string;
  let testCategoryName: string;
  const uploadedDocumentIds: string[] = [];

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          ignoreEnvFile: true,
          load: [
            () => ({
              NODE_ENV: 'test',
              JWT_SECRET: 'test-secret-key',
              ADMIN_JWT_SECRET: 'admin-test-secret-key',
              ADMIN_JWT_EXPIRATION: '8h',
              DATABASE_URL:
                process.env.DATABASE_URL ||
                'postgresql://test:test@localhost:5432/test_db',
              REDIS_URL: process.env.REDIS_URL || 'redis://localhost:6379',
              GOOGLE_AI_API_KEY:
                process.env.GOOGLE_AI_API_KEY || 'test-google-ai-key',
              OPENAI_API_KEY: process.env.OPENAI_API_KEY || 'test-openai-key',
            }),
          ],
        }),
        TypeOrmModule.forRoot({
          type: 'postgres',
          url:
            process.env.DATABASE_URL ||
            'postgresql://test:test@localhost:5432/test_db',
          entities: [
            AdminUser,
            AuditLog,
            KnowledgeCategory,
            IngestionEvent,
            KnowledgeDocument,
            KnowledgeChunk,
            PersonaEntity,
          ],
          synchronize: true, // Only for testing
          dropSchema: true, // Clean slate for each test run
        }),
        JwtModule.register({
          secret: 'admin-test-secret-key',
          signOptions: { expiresIn: '8h' },
        }),
        BullModule.forRoot({
          redis: {
            host: 'localhost',
            port: 6379,
          },
        }),
        AdminModule,
      ],
    }).compile();

    app = moduleFixture.createNestApplication();

    // Apply global validation pipe
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
        forbidNonWhitelisted: true,
      }),
    );

    await app.init();

    // Get repository for setup
    adminUserRepository =
      moduleFixture.get<AdminUserRepository>(AdminUserRepository);
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Complete Admin Workflow', () => {
    it('should create an admin user', async () => {
      // Create admin user directly in database
      const hashedPassword = await bcrypt.hash('testpassword123', 10);
      const adminUser = await adminUserRepository.create({
        username: 'testadmin',
        email: 'testadmin@example.com',
        password_hash: hashedPassword,
        role: 'admin',
      });

      expect(adminUser).toBeDefined();
      expect(adminUser.username).toBe('testadmin');
      expect(adminUser.email).toBe('testadmin@example.com');
    });

    it('should login with valid credentials and receive JWT token', async () => {
      const response = await request(app.getHttpServer())
        .post('/admin/auth/login')
        .send({
          username: 'testadmin',
          password: 'testpassword123',
        })
        .expect(200);

      expect(response.body).toHaveProperty('accessToken');
      expect(response.body).toHaveProperty('expiresIn');
      expect(response.body.user).toHaveProperty('username', 'testadmin');

      // Store token for subsequent requests
      authToken = response.body.accessToken;
    });

    it('should create a knowledge category', async () => {
      testCategoryName = `test-category-${Date.now()}`;

      const response = await request(app.getHttpServer())
        .post('/admin/categories')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: testCategoryName,
          description: 'Test category for e2e testing',
        })
        .expect(201);

      expect(response.body).toHaveProperty('name', testCategoryName);
      expect(response.body).toHaveProperty(
        'description',
        'Test category for e2e testing',
      );
    });

    it('should create a persona with the test category', async () => {
      testPersonaId = `test-persona-${Date.now()}`;

      const response = await request(app.getHttpServer())
        .post('/admin/personas')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          id: testPersonaId,
          name: 'Test Persona',
          description: 'A test persona for e2e testing',
          knowledgeCategory: testCategoryName,
          temperature: 0.7,
          maxTokens: 1000,
        })
        .expect(201);

      expect(response.body).toHaveProperty('id', testPersonaId);
      expect(response.body).toHaveProperty('name', 'Test Persona');
      expect(response.body).toHaveProperty(
        'knowledgeCategory',
        testCategoryName,
      );
    });

    it('should upload a document to the test category', async () => {
      // Create a test document
      const testContent =
        'This is a test document for e2e testing. It contains information about Kubernetes deployment.';
      const testFilePath = path.join(__dirname, 'test-document.txt');
      fs.writeFileSync(testFilePath, testContent);

      const response = await request(app.getHttpServer())
        .post('/admin/knowledge/documents/upload')
        .set('Authorization', `Bearer ${authToken}`)
        .attach('file', testFilePath)
        .field('category', testCategoryName)
        .expect(201);

      expect(response.body).toHaveProperty('documentId');
      expect(response.body).toHaveProperty('status');
      expect(response.body.category).toBe(testCategoryName);

      uploadedDocumentIds.push(response.body.documentId);

      // Clean up test file
      fs.unlinkSync(testFilePath);
    });

    it('should verify audit logs captured the persona creation', async () => {
      const response = await request(app.getHttpServer())
        .get('/admin/audit/logs')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ action: 'CREATE_PERSONA' })
        .expect(200);

      expect(response.body).toBeInstanceOf(Array);

      const personaCreationLog = response.body.find(
        (log: any) => log.resourceId === testPersonaId,
      );

      expect(personaCreationLog).toBeDefined();
      expect(personaCreationLog.action).toBe('CREATE_PERSONA');
      expect(personaCreationLog.userId).toBeDefined();
    });

    it('should verify audit logs captured the document upload', async () => {
      const response = await request(app.getHttpServer())
        .get('/admin/audit/logs')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ action: 'UPLOAD_DOCUMENT' })
        .expect(200);

      expect(response.body).toBeInstanceOf(Array);
      expect(response.body.length).toBeGreaterThan(0);

      const uploadLog = response.body.find(
        (log: any) => log.resourceId === uploadedDocumentIds[0],
      );

      expect(uploadLog).toBeDefined();
      expect(uploadLog.action).toBe('UPLOAD_DOCUMENT');
    });

    it('should test the persona with a query', async () => {
      const response = await request(app.getHttpServer())
        .post(`/admin/personas/${testPersonaId}/test`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          query: 'What is Kubernetes?',
        })
        .expect(200);

      expect(response.body).toHaveProperty('answer');
      expect(response.body).toHaveProperty('retrievedChunks');
      expect(response.body).toHaveProperty('modelProvider');
      expect(response.body).toHaveProperty('tokensUsed');
      expect(response.body).toHaveProperty('latencyMs');
    });

    it('should list all documents in the test category', async () => {
      const response = await request(app.getHttpServer())
        .get('/admin/knowledge/documents')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ category: testCategoryName })
        .expect(200);

      expect(response.body).toBeInstanceOf(Array);
      expect(response.body.length).toBeGreaterThan(0);
      expect(response.body[0]).toHaveProperty('category', testCategoryName);
    });
  });

  describe('Bulk Operations', () => {
    it('should upload multiple documents in bulk', async () => {
      // Create multiple test documents
      const testFiles: string[] = [];
      for (let i = 0; i < 3; i++) {
        const content = `Test document ${i + 1} content. This contains information about topic ${i + 1}.`;
        const filePath = path.join(__dirname, `test-bulk-${i}.txt`);
        fs.writeFileSync(filePath, content);
        testFiles.push(filePath);
      }

      const request_builder = request(app.getHttpServer())
        .post('/admin/knowledge/documents/bulk-upload')
        .set('Authorization', `Bearer ${authToken}`)
        .field('category', testCategoryName);

      // Attach all files
      testFiles.forEach((filePath) => {
        request_builder.attach('files', filePath);
      });

      const response = await request_builder.expect(201);

      expect(response.body).toHaveProperty('totalFiles');
      expect(response.body).toHaveProperty('successCount');
      expect(response.body).toHaveProperty('failureCount');
      expect(response.body).toHaveProperty('results');
      expect(response.body.totalFiles).toBe(3);
      expect(response.body.results).toBeInstanceOf(Array);
      expect(response.body.results.length).toBe(3);

      // Store uploaded document IDs
      response.body.results.forEach((result: any) => {
        if (result.success && result.documentId) {
          uploadedDocumentIds.push(result.documentId);
        }
      });

      // Clean up test files
      testFiles.forEach((filePath) => {
        fs.unlinkSync(filePath);
      });
    });

    it('should verify audit logs captured bulk upload', async () => {
      const response = await request(app.getHttpServer())
        .get('/admin/audit/logs')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ action: 'BULK_UPLOAD' })
        .expect(200);

      expect(response.body).toBeInstanceOf(Array);
      expect(response.body.length).toBeGreaterThan(0);

      const bulkUploadLog = response.body[0];
      expect(bulkUploadLog.action).toBe('BULK_UPLOAD');
      expect(bulkUploadLog.details).toHaveProperty('fileCount');
    });

    it('should create a second category for reassignment test', async () => {
      const secondCategoryName = `test-category-2-${Date.now()}`;

      const response = await request(app.getHttpServer())
        .post('/admin/categories')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: secondCategoryName,
          description: 'Second test category for reassignment',
        })
        .expect(201);

      expect(response.body).toHaveProperty('name', secondCategoryName);
    });

    it('should bulk reassign documents to a new category', async () => {
      const secondCategoryName = `test-category-2-${Date.now()}`;

      // First create the category
      await request(app.getHttpServer())
        .post('/admin/categories')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: secondCategoryName,
          description: 'Category for reassignment',
        })
        .expect(201);

      // Select some documents to reassign
      const documentsToReassign = uploadedDocumentIds.slice(0, 2);

      const response = await request(app.getHttpServer())
        .put('/admin/knowledge/documents/bulk-reassign')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          documentIds: documentsToReassign,
          targetCategory: secondCategoryName,
        })
        .expect(200);

      expect(response.body).toHaveProperty('successCount');
      expect(response.body).toHaveProperty('failureCount');
      expect(response.body.successCount).toBe(documentsToReassign.length);
    });

    it('should bulk delete documents', async () => {
      const documentsToDelete = uploadedDocumentIds.slice(0, 2);

      const response = await request(app.getHttpServer())
        .post('/admin/knowledge/documents/bulk-delete')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          documentIds: documentsToDelete,
        })
        .expect(200);

      expect(response.body).toHaveProperty('successCount');
      expect(response.body).toHaveProperty('failureCount');
      expect(response.body.successCount).toBe(documentsToDelete.length);
    });

    it('should verify audit logs captured bulk delete', async () => {
      const response = await request(app.getHttpServer())
        .get('/admin/audit/logs')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ action: 'BULK_DELETE' })
        .expect(200);

      expect(response.body).toBeInstanceOf(Array);
      expect(response.body.length).toBeGreaterThan(0);

      const bulkDeleteLog = response.body[0];
      expect(bulkDeleteLog.action).toBe('BULK_DELETE');
      expect(bulkDeleteLog.details).toHaveProperty('documentCount');
    });
  });

  describe('Authentication and Authorization', () => {
    it('should reject requests without authentication token', async () => {
      await request(app.getHttpServer()).get('/admin/personas').expect(401);
    });

    it('should reject requests with invalid token', async () => {
      await request(app.getHttpServer())
        .get('/admin/personas')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);
    });

    it('should reject login with invalid credentials', async () => {
      await request(app.getHttpServer())
        .post('/admin/auth/login')
        .send({
          username: 'testadmin',
          password: 'wrongpassword',
        })
        .expect(401);
    });
  });

  describe('Validation and Error Handling', () => {
    it('should reject persona creation with invalid temperature', async () => {
      await request(app.getHttpServer())
        .post('/admin/personas')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          id: 'invalid-temp-persona',
          name: 'Invalid Temp Persona',
          description: 'Test persona with invalid temperature',
          knowledgeCategory: testCategoryName,
          temperature: 1.5, // Invalid: > 1.0
          maxTokens: 1000,
        })
        .expect(400);
    });

    it('should reject persona creation with invalid ID format', async () => {
      await request(app.getHttpServer())
        .post('/admin/personas')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          id: 'Invalid_Persona_ID', // Invalid: contains uppercase and underscores
          name: 'Invalid ID Persona',
          description: 'Test persona with invalid ID',
          knowledgeCategory: testCategoryName,
          temperature: 0.7,
          maxTokens: 1000,
        })
        .expect(400);
    });

    it('should reject document upload without category', async () => {
      const testContent = 'Test document without category';
      const testFilePath = path.join(__dirname, 'test-no-category.txt');
      fs.writeFileSync(testFilePath, testContent);

      await request(app.getHttpServer())
        .post('/admin/knowledge/documents/upload')
        .set('Authorization', `Bearer ${authToken}`)
        .attach('file', testFilePath)
        // No category field
        .expect(400);

      fs.unlinkSync(testFilePath);
    });

    it('should reject category creation with invalid name format', async () => {
      await request(app.getHttpServer())
        .post('/admin/categories')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Invalid Category Name!', // Invalid: contains spaces and special chars
          description: 'Invalid category',
        })
        .expect(400);
    });
  });

  describe('Monitoring and Statistics', () => {
    it('should retrieve ingestion queue status', async () => {
      const response = await request(app.getHttpServer())
        .get('/admin/monitoring/ingestion/status')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('queueStatus');
      expect(response.body.queueStatus).toHaveProperty('waiting');
      expect(response.body.queueStatus).toHaveProperty('active');
      expect(response.body.queueStatus).toHaveProperty('completed');
      expect(response.body.queueStatus).toHaveProperty('failed');
    });

    it('should retrieve knowledge base statistics', async () => {
      const response = await request(app.getHttpServer())
        .get('/admin/monitoring/statistics')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('totalDocuments');
      expect(response.body).toHaveProperty('totalChunks');
      expect(response.body).toHaveProperty('categoryCounts');
      expect(response.body.categoryCounts).toBeInstanceOf(Array);
    });

    it('should retrieve ingestion statistics', async () => {
      const response = await request(app.getHttpServer())
        .get('/admin/monitoring/ingestion/statistics')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('totalProcessed');
      expect(response.body).toHaveProperty('successCount');
      expect(response.body).toHaveProperty('failureCount');
    });
  });
});
