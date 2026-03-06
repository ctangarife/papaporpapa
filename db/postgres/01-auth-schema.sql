-- ==============================================================================
-- PAPAS APP - Auth Schema (English field names)
-- Schema: auth
-- ==============================================================================

-- UUID extension (created in public but available globally)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ==============================================================================
-- TABLE: users
-- ==============================================================================
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

-- Indexes
CREATE INDEX idx_users_email ON auth.users(email);
CREATE INDEX idx_users_username ON auth.users(username);
CREATE INDEX idx_users_coins_balance ON auth.users(coins_balance);

-- ==============================================================================
-- TABLE: sessions
-- ==============================================================================
CREATE TABLE IF NOT EXISTS auth.sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    token VARCHAR(500) NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX idx_sessions_user_id ON auth.sessions(user_id);
CREATE INDEX idx_sessions_token ON auth.sessions(token);
CREATE INDEX idx_sessions_expires_at ON auth.sessions(expires_at);

-- ==============================================================================
-- TRIGGERS: Auto-update timestamp
-- ==============================================================================
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

-- Register migration
SELECT public.register_migration('auth', 1);

-- Comments
COMMENT ON TABLE auth.users IS 'Application users';
COMMENT ON TABLE auth.sessions IS 'User sessions with JWT tokens';
COMMENT ON COLUMN auth.users.diagnosis IS 'Neurodivergence diagnosis (ASD, ADHD, etc.)';
COMMENT ON COLUMN auth.users.ai_preferences IS 'AI preferences in JSON format';
