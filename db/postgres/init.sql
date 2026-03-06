-- ==============================================================================
-- PAPAS APP - Database Initialization Script
-- Single-file migration for fresh database deployment
-- ==============================================================================
--
-- This script creates all schemas, tables, and relationships for Papas App.
-- Execute with: psql -U postgres -d papas_app -f init.sql
--
-- Schema Structure:
--   - public   - Migration tracking only
--   - auth     - Users and sessions
--   - projects - Projects and tasks
--   - llm      - LLM credentials
--
-- ==============================================================================

-- ==============================================================================
-- EXTENSIONS
-- ==============================================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ==============================================================================
-- SCHEMAS
-- ==============================================================================
CREATE SCHEMA IF NOT EXISTS auth;
COMMENT ON SCHEMA auth IS 'Authentication and user management';

CREATE SCHEMA IF NOT EXISTS projects;
COMMENT ON SCHEMA projects IS 'Projects and tasks (potatoes)';

CREATE SCHEMA IF NOT EXISTS llm;
COMMENT ON SCHEMA llm IS 'LLM configuration and credentials';

-- ==============================================================================
-- MIGRATION TRACKING (public schema)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.schema_migrations (
    id SERIAL PRIMARY KEY,
    schema_name VARCHAR(100) NOT NULL UNIQUE,
    version INTEGER NOT NULL,
    executed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE OR REPLACE FUNCTION public.register_migration(
    p_schema_name VARCHAR(100),
    p_version INTEGER
) RETURNS VOID AS $$
BEGIN
    INSERT INTO public.schema_migrations (schema_name, version)
    VALUES (p_schema_name, p_version)
    ON CONFLICT (schema_name) DO UPDATE SET version = EXCLUDED.version, executed_at = CURRENT_TIMESTAMP;
END;
$$ LANGUAGE plpgsql;

-- ==============================================================================
-- AUTH SCHEMA - Users and Sessions
-- ==============================================================================

-- TABLE: users
CREATE TABLE IF NOT EXISTS auth.users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100),
    username VARCHAR(50) UNIQUE,
    coins_balance INTEGER DEFAULT 0,
    birth_date DATE,
    diagnosis VARCHAR(100),
    ai_preferences TEXT,
    onboarding_completed BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- TABLE: sessions
CREATE TABLE IF NOT EXISTS auth.sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    token VARCHAR(500) NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes - auth
CREATE INDEX IF NOT EXISTS idx_users_email ON auth.users(email);
CREATE INDEX IF NOT EXISTS idx_users_username ON auth.users(username);
CREATE INDEX IF NOT EXISTS idx_users_coins_balance ON auth.users(coins_balance);
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON auth.sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_token ON auth.sessions(token);
CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON auth.sessions(expires_at);

-- Triggers - auth
CREATE OR REPLACE FUNCTION auth.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_users_update_updated_at
    BEFORE UPDATE ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION auth.update_updated_at();

-- Comments - auth
COMMENT ON TABLE auth.users IS 'Application users';
COMMENT ON TABLE auth.sessions IS 'User sessions with JWT tokens';
COMMENT ON COLUMN auth.users.diagnosis IS 'Neurodivergence diagnosis (ASD, ADHD, etc.)';
COMMENT ON COLUMN auth.users.ai_preferences IS 'AI preferences in JSON format';
COMMENT ON COLUMN auth.users.onboarding_completed IS 'Whether user completed onboarding';

SELECT public.register_migration('auth', 1);

-- ==============================================================================
-- PROJECTS SCHEMA - Projects and Tasks
-- ==============================================================================

-- TABLE: projects
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

-- TABLE: tasks (potatoes)
CREATE TABLE IF NOT EXISTS projects.tasks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES projects.projects(id) ON DELETE CASCADE,
    description TEXT NOT NULL,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'blocked', 'skipped')),
    coin_value INTEGER DEFAULT 10,
    sort_order INTEGER NOT NULL,
    depends_on UUID[] DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP WITH TIME ZONE,
    skipped_at TIMESTAMP WITH TIME ZONE
);

-- Indexes - projects
CREATE INDEX IF NOT EXISTS idx_projects_user_id ON projects.projects(user_id);
CREATE INDEX IF NOT EXISTS idx_projects_status ON projects.projects(status);
CREATE INDEX IF NOT EXISTS idx_tasks_project_id ON projects.tasks(project_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON projects.tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_sort_order ON projects.tasks(project_id, sort_order);

-- Triggers - projects
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

-- Comments - projects
COMMENT ON TABLE projects.projects IS 'User projects';
COMMENT ON TABLE projects.tasks IS 'Project tasks (potatoes)';
COMMENT ON COLUMN projects.tasks.depends_on IS 'IDs of tasks that must be completed first';
COMMENT ON COLUMN projects.tasks.coin_value IS 'Coins awarded when task is completed';
COMMENT ON COLUMN projects.tasks.skipped_at IS 'When the task was skipped by the user';
COMMENT ON COLUMN projects.tasks.status IS 'pending: not started, completed: done, blocked: cannot be done yet, skipped: user chose to skip it';

SELECT public.register_migration('projects', 1);

-- ==============================================================================
-- LLM SCHEMA - Credentials
-- ==============================================================================

-- TABLE: user_llm_credentials
CREATE TABLE IF NOT EXISTS llm.user_llm_credentials (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    provider VARCHAR(20) NOT NULL CHECK (provider IN ('ollama', 'zai', 'minimax')),
    api_key TEXT, -- Encrypted by backend (Node.js), not database
    api_endpoint TEXT, -- Custom endpoint URL
    model_name VARCHAR(100), -- Preferred model name
    is_default BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, provider)
);

-- Indexes - llm
CREATE INDEX IF NOT EXISTS idx_user_llm_credentials_user_id ON llm.user_llm_credentials(user_id);
CREATE INDEX IF NOT EXISTS idx_user_llm_credentials_provider ON llm.user_llm_credentials(provider);

-- Triggers - llm
CREATE OR REPLACE FUNCTION llm.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_user_llm_credentials_update_updated_at
    BEFORE UPDATE ON llm.user_llm_credentials
    FOR EACH ROW
    EXECUTE FUNCTION llm.update_updated_at();

-- Comments - llm
COMMENT ON TABLE llm.user_llm_credentials IS 'User LLM credentials (encrypted)';
COMMENT ON COLUMN llm.user_llm_credentials.api_key IS 'Encrypted LLM provider API key (encryption done in backend)';
COMMENT ON COLUMN llm.user_llm_credentials.api_endpoint IS 'Custom endpoint URL (optional)';
COMMENT ON COLUMN llm.user_llm_credentials.model_name IS 'Preferred model name for this provider';
COMMENT ON COLUMN llm.user_llm_credentials.is_default IS 'Whether this is the default provider for the user';

SELECT public.register_migration('llm', 1);

-- ==============================================================================
-- VERIFICATION
-- ==============================================================================

-- View all registered migrations
SELECT * FROM public.schema_migrations ORDER BY schema_name, version;

-- ==============================================================================
-- END OF INITIALIZATION
-- ==============================================================================
