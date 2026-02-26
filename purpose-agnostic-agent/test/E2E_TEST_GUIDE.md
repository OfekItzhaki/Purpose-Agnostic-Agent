# End-to-End Test Guide

## Overview

This guide explains how to run the end-to-end (e2e) tests for the admin panel workflows.

## Prerequisites

The e2e tests require the following infrastructure to be running:

### 1. PostgreSQL Database

The tests need a PostgreSQL database. You can start one using Docker:

```bash
docker run -d \
  --name test-postgres \
  -e POSTGRES_USER=test \
  -e POSTGRES_PASSWORD=test \
  -e POSTGRES_DB=test_db \
  -p 5432:5432 \
  postgres:15
```

### 2. Redis

The tests need Redis for the Bull queue system:

```bash
docker run -d \
  --name test-redis \
  -p 6379:6379 \
  redis:7-alpine
```

### 3. Environment Variables

Set the following environment variables before running the tests:

```bash
export DATABASE_URL="postgresql://test:test@localhost:5432/test_db"
export REDIS_URL="redis://localhost:6379"
export GOOGLE_AI_API_KEY="your-google-ai-api-key"
export OPENAI_API_KEY="your-openai-api-key"
```

Or create a `.env.test` file:

```env
DATABASE_URL=postgresql://test:test@localhost:5432/test_db
REDIS_URL=redis://localhost:6379
GOOGLE_AI_API_KEY=your-google-ai-api-key
OPENAI_API_KEY=your-openai-api-key
```

## Running the Tests

### Run All E2E Tests

```bash
npm run test:e2e
```

### Run Specific E2E Test

```bash
npm run test:e2e -- admin-workflows.e2e-spec.ts
```

### Run with Verbose Output

```bash
npm run test:e2e -- --verbose admin-workflows.e2e-spec.ts
```

## Test Coverage

The `admin-workflows.e2e-spec.ts` test covers:

### Complete Admin Workflow
- ✅ Create admin user
- ✅ Login with valid credentials and receive JWT token
- ✅ Create a knowledge category
- ✅ Create a persona with the test category
- ✅ Upload a document to the test category
- ✅ Verify audit logs captured the persona creation
- ✅ Verify audit logs captured the document upload
- ✅ Test the persona with a query
- ✅ List all documents in the test category

### Bulk Operations
- ✅ Upload multiple documents in bulk
- ✅ Verify audit logs captured bulk upload
- ✅ Create a second category for reassignment test
- ✅ Bulk reassign documents to a new category
- ✅ Bulk delete documents
- ✅ Verify audit logs captured bulk delete

### Authentication and Authorization
- ✅ Reject requests without authentication token
- ✅ Reject requests with invalid token
- ✅ Reject login with invalid credentials

### Validation and Error Handling
- ✅ Reject persona creation with invalid temperature
- ✅ Reject persona creation with invalid ID format
- ✅ Reject document upload without category
- ✅ Reject category creation with invalid name format

### Monitoring and Statistics
- ✅ Retrieve ingestion queue status
- ✅ Retrieve knowledge base statistics
- ✅ Retrieve ingestion statistics

## Troubleshooting

### Database Connection Errors

If you see "Unable to connect to the database" errors:

1. Ensure PostgreSQL is running: `docker ps | grep postgres`
2. Check the DATABASE_URL environment variable
3. Test the connection: `psql postgresql://test:test@localhost:5432/test_db`

### Redis Connection Errors

If you see Redis connection errors:

1. Ensure Redis is running: `docker ps | grep redis`
2. Check the REDIS_URL environment variable
3. Test the connection: `redis-cli ping`

### API Key Errors

If you see "GOOGLE_AI_API_KEY is required" errors:

1. Ensure the environment variable is set
2. For testing purposes, you can use a dummy key, but some tests may fail

### Port Conflicts

If ports 5432 or 6379 are already in use:

1. Stop the conflicting services
2. Or use different ports and update the environment variables

## Cleanup

After running the tests, you can clean up the test infrastructure:

```bash
docker stop test-postgres test-redis
docker rm test-postgres test-redis
```

## CI/CD Integration

For CI/CD pipelines, use Docker Compose to manage the test infrastructure:

```yaml
version: '3.8'
services:
  postgres:
    image: postgres:15
    environment:
      POSTGRES_USER: test
      POSTGRES_PASSWORD: test
      POSTGRES_DB: test_db
    ports:
      - "5432:5432"
  
  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
```

Run tests in CI:

```bash
docker-compose up -d
npm run test:e2e
docker-compose down
```

## Notes

- The e2e tests use `synchronize: true` and `dropSchema: true` for TypeORM, which means the database schema is recreated for each test run
- Tests create temporary files during document upload tests, which are automatically cleaned up
- The tests are designed to be idempotent and can be run multiple times
- Each test suite is independent and doesn't rely on state from other suites
