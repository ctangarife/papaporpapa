-- ==============================================================================
-- PAPAS APP - Add Last Interaction Tracking
-- ==============================================================================

-- Add last interaction tracking to users table
ALTER TABLE auth.users ADD COLUMN IF NOT EXISTS last_interaction_at TIMESTAMP WITH TIME ZONE;

COMMENT ON COLUMN auth.users.last_interaction_at IS 'Last time user interacted with the app (for gentle nudges)';

-- Create index for efficient queries
CREATE INDEX IF NOT EXISTS idx_users_last_interaction_at ON auth.users(last_interaction_at) WHERE last_interaction_at IS NOT NULL;

-- Register migration
SELECT public.register_migration('add_last_interaction_tracking', 1);
