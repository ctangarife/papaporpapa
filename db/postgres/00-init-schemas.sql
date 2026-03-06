-- ==============================================================================
-- PAPAS APP - Database Schemas (English field names)
-- ==============================================================================
-- The 'public' schema is used ONLY for migration tracking
-- Each module has its own descriptive schema

-- Migration tracking table in public schema
CREATE TABLE IF NOT EXISTS public.schema_migrations (
    id SERIAL PRIMARY KEY,
    schema_name VARCHAR(100) NOT NULL UNIQUE,
    version INTEGER NOT NULL,
    executed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

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
-- Migration tracking function
-- ==============================================================================
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

SELECT public.register_migration('init', 1);
