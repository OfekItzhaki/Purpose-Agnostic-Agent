-- Rollback Migration: Remove Admin Panel Tables
-- Description: Drops admin_users, audit_logs, and knowledge_categories tables
-- WARNING: This will permanently delete all admin users, audit logs, and knowledge categories

-- Drop tables in reverse order (respecting foreign key constraints)
DROP TABLE IF EXISTS knowledge_categories CASCADE;
DROP TABLE IF EXISTS audit_logs CASCADE;
DROP TABLE IF EXISTS admin_users CASCADE;

-- Verification query
-- Uncomment to verify tables were dropped successfully
-- SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name IN ('admin_users', 'audit_logs', 'knowledge_categories');
