-- ==============================================================================
-- PAPAS APP - Projects Schema (English field names)
-- Schema: projects
-- ==============================================================================

-- ==============================================================================
-- TABLE: projects
-- ==============================================================================
CREATE TABLE IF NOT EXISTS projects.projects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'paused', 'completed')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP WITH TIME ZONE
);

-- Indexes
CREATE INDEX idx_projects_user_id ON projects.projects(user_id);
CREATE INDEX idx_projects_status ON projects.projects(status);

-- ==============================================================================
-- TABLE: tasks (potatoes)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS projects.tasks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES projects.projects(id) ON DELETE CASCADE,
    description TEXT NOT NULL,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'blocked', 'skipped')),
    coin_value INTEGER DEFAULT 10,
    sort_order INTEGER NOT NULL,
    depends_on UUID[] DEFAULT '{}', -- Array of task IDs that must be completed first
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP WITH TIME ZONE,
    skipped_at TIMESTAMP WITH TIME ZONE
);

-- Indexes
CREATE INDEX idx_tasks_project_id ON projects.tasks(project_id);
CREATE INDEX idx_tasks_status ON projects.tasks(status);
CREATE INDEX idx_tasks_sort_order ON projects.tasks(project_id, sort_order);

-- ==============================================================================
-- TRIGGERS: Auto-update timestamp
-- ==============================================================================
CREATE OR REPLACE FUNCTION projects.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_projects_update_updated_at
    BEFORE UPDATE ON projects.projects
    FOR EACH ROW
    EXECUTE FUNCTION projects.update_updated_at();

-- Register migration
SELECT public.register_migration('projects', 1);

-- Comments
COMMENT ON TABLE projects.projects IS 'User projects';
COMMENT ON TABLE projects.tasks IS 'Project tasks (potatoes)';
COMMENT ON COLUMN projects.tasks.depends_on IS 'IDs of tasks that must be completed first';
COMMENT ON COLUMN projects.tasks.coin_value IS 'Coins awarded when task is completed';
COMMENT ON COLUMN projects.tasks.skipped_at IS 'When the task was skipped by the user';
COMMENT ON COLUMN projects.tasks.status IS 'pending: not started, completed: done, blocked: cannot be done yet, skipped: user chose to skip it';
