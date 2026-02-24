import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

/**
 * Creates a test module with common configuration
 */
export async function createTestModule(
  imports: any[] = [],
  providers: any[] = [],
  controllers: any[] = [],
): Promise<TestingModule> {
  return Test.createTestingModule({
    imports: [
      ConfigModule.forRoot({
        isGlobal: true,
        ignoreEnvFile: true,
      }),
      ...imports,
    ],
    providers,
    controllers,
  }).compile();
}

/**
 * Creates a test application with validation pipe
 */
export async function createTestApp(module: TestingModule): Promise<INestApplication> {
  const app = module.createNestApplication();
  
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  await app.init();
  return app;
}

/**
 * Mock repository factory
 */
export function createMockRepository() {
  return {
    find: jest.fn(),
    findOne: jest.fn(),
    findById: jest.fn(),
    save: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    remove: jest.fn(),
  };
}

/**
 * Mock service factory
 */
export function createMockService(methods: string[]) {
  const mock: any = {};
  methods.forEach((method) => {
    mock[method] = jest.fn();
  });
  return mock;
}
