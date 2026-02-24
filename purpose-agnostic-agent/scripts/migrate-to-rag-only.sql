-- Migration script to convert from system_prompt to extra_instructions
-- This script is for existing deployments that need to migrate to RAG-only architecture

-- Step 1: Add the new extra_instructions column
ALTER TABLE personas 
ADD COLUMN IF NOT EXISTS extra_instructions TEXT;

-- Step 2: Migrate existing system_prompt data to extra_instructions
-- Note: This is a best-effort migration. Review and adjust as needed.
UPDATE personas 
SET extra_instructions = system_prompt
WHERE extra_instructions IS NULL;

-- Step 3: Drop the old system_prompt column
-- WARNING: This is destructive! Make sure you have a backup before running this.
-- Uncomment the line below when you're ready to drop the column:
-- ALTER TABLE personas DROP COLUMN IF EXISTS system_prompt;

-- Step 4: Verify the migration
SELECT id, name, 
       CASE 
         WHEN extra_instructions IS NULL THEN 'MISSING'
         ELSE 'OK'
       END as migration_status
FROM personas;

-- Note: After running this migration, you should:
-- 1. Review each persona's extra_instructions
-- 2. Update them to be style/tone instructions only (not full system prompts)
-- 3. The RAG-only system prompt will be automatically applied by the application
