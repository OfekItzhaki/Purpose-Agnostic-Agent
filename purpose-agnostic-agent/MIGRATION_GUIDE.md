# Database Migration Guide

This guide explains how to run database migrations for the admin panel functionality.

## Overview

The admin panel requires three new database tables:
- `admin_users`: Stores admin user credentials and authentication information
- `audit_logs`: Tracks all administrative actions for accountability
- `knowledge_categories`: Manages knowledge document categories

## Prerequisites

- PostgreSQL database running (via Docker or local installation)
- Database connection configured in `.env` file with `DATABASE_URL`
- Node.js and npm installed

## Running Migrations

### Apply Migration

To apply the admin panel schema changes to your database:

```bash
npm run migration:apply
```

This will:
1. Create the `admin_users` table with unique constraints on username and email
2. Create the `audit_logs` table with foreign key to admin_users and indexes for performance
3. Create the `knowledge_categories` table with name validation constraint

### Rollback Migration

If you need to rollback the last migration:

```bash
npm run migration:rollback
```

This will drop all three tables in the correct order (respecting foreign key constraints).

## Migration Details

### admin_users Table

| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | Primary Key, Auto-generated |
| username | VARCHAR(255) | Unique, Not Null |
| password_hash | VARCHAR(255) | Not Null |
| email | VARCHAR(255) | Unique, Not Null |
| role | VARCHAR(50) | Not Null, Default: 'admin' |
| created_at | TIMESTAMP | Not Null, Default: NOW() |
| updated_at | TIMESTAMP | Not Null, Default: NOW() |

### audit_logs Table

| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | Primary Key, Auto-generated |
| admin_user_id | UUID | Foreign Key to admin_users.id, Not Null |
| action_type | VARCHAR(100) | Not Null |
| entity_type | VARCHAR(100) | Not Null |
| entity_id | VARCHAR(255) | Nullable |
| details | JSONB | Nullable |
| ip_address | VARCHAR(45) | Nullable |
| timestamp | TIMESTAMP | Not Null, Default: NOW() |

**Indexes:**
- `IDX_AUDIT_LOGS_TIMESTAMP` on `timestamp` column
- `IDX_AUDIT_LOGS_ADMIN_USER_ID` on `admin_user_id` column

### knowledge_categories Table

| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | Primary Key, Auto-generated |
| name | VARCHAR(255) | Unique, Not Null, CHECK: alphanumeric and hyphens only |
| description | TEXT | Nullable |
| document_count | INTEGER | Not Null, Default: 0 |
| created_at | TIMESTAMP | Not Null, Default: NOW() |
| updated_at | TIMESTAMP | Not Null, Default: NOW() |

**Constraints:**
- `CHK_KNOWLEDGE_CATEGORIES_NAME_FORMAT`: Ensures name contains only alphanumeric characters and hyphens

## Verification

After running the migration, you can verify the tables were created:

```sql
-- Connect to your database
psql $DATABASE_URL

-- List tables
\dt

-- Describe admin_users table
\d admin_users

-- Describe audit_logs table
\d audit_logs

-- Describe knowledge_categories table
\d knowledge_categories
```

## Troubleshooting

### Migration Already Applied

If you see "No migrations to run", the migration has already been applied to your database.

### Connection Error

Ensure your `DATABASE_URL` environment variable is correctly set:

```bash
DATABASE_URL=postgresql://username:password@localhost:5432/database_name
```

### Permission Errors

Ensure your database user has sufficient permissions to create tables, indexes, and constraints.

## Manual Migration (Alternative)

If you prefer to run the migration manually, you can execute the SQL directly:

```bash
psql $DATABASE_URL -f src/migrations/1700000000000-AddAdminTables.sql
```

Note: You'll need to extract the SQL from the TypeORM migration file first.

## Next Steps

After running the migration:
1. Create an initial admin user (see Admin User Setup guide)
2. Configure JWT secrets for admin authentication
3. Start implementing admin panel services and controllers
