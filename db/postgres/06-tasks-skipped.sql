-- ==============================================================================
-- PAPAS APP - Add skipped status to tasks
-- ==============================================================================

-- Add skipped_at column to tasks table
ALTER TABLE projects.tasks
ADD COLUMN IF NOT EXISTS skipped_at TIMESTAMP WITH TIME ZONE;

-- Add CHECK constraint for status including 'skipped'
ALTER TABLE projects.tasks
DROP CONSTRAINT IF EXISTS tasks_status_check;

ALTER TABLE projects.tasks
ADD CONSTRAINT tasks_status_check
CHECK (status IN ('pending', 'completed', 'blocked', 'skipped'));

-- Register migration
SELECT public.register_migration('tasks-skipped', 1);

COMMENT ON COLUMN projects.tasks.skipped_at IS 'When the task was skipped by the user';
COMMENT ON COLUMN projects.tasks.status IS 'pending: not started, completed: done, blocked: cannot be done yet, skipped: user chose to skip it';
