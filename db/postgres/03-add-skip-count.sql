-- ==============================================================================
-- PAPAS APP - Add skip_count to tasks
-- This field tracks how many times a user has skipped a task
-- ==============================================================================

-- Add skip_count column to tasks table
ALTER TABLE projects.tasks ADD COLUMN IF NOT EXISTS skip_count INTEGER DEFAULT 0;

-- Add comment
COMMENT ON COLUMN projects.tasks.skip_count IS 'Number of times the user has skipped this task (for blocking detection)';

-- Register migration
SELECT public.register_migration('add_skip_count_to_tasks', 1);
