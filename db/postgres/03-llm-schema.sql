-- ==============================================================================
-- PAPAS APP - LLM Credentials Schema (English field names)
-- Schema: llm
-- ==============================================================================

-- pgcrypto extension (created in public but available globally)
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ==============================================================================
-- TABLE: user_llm_credentials
-- ==============================================================================
CREATE TABLE IF NOT EXISTS llm.user_llm_credentials (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    provider VARCHAR(20) NOT NULL CHECK (provider IN ('ollama', 'zai', 'minimax')),
    api_key TEXT, -- Encrypted
    api_endpoint TEXT, -- Custom endpoint URL
    model_name VARCHAR(100), -- Preferred model name
    is_default BOOLEAN DEFAULT false, -- Whether this is the default provider
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, provider)
);

-- Indexes
CREATE INDEX idx_user_llm_credentials_user_id ON llm.user_llm_credentials(user_id);
CREATE INDEX idx_user_llm_credentials_provider ON llm.user_llm_credentials(provider);

-- ==============================================================================
-- FUNCTIONS: Encrypt/Decrypt API keys
-- ==============================================================================
CREATE OR REPLACE FUNCTION llm.encrypt_api_key(api_key TEXT)
RETURNS TEXT AS $$
BEGIN
    -- Use pgcrypto to encrypt the API key
    -- The key should come from environment variables or config
    RETURN pgp_sym_encrypt(api_key, current_setting('app.llm_encryption_key', true))::TEXT;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION llm.decrypt_api_key(encrypted_key TEXT)
RETURNS TEXT AS $$
BEGIN
    RETURN pgp_sym_decrypt(encrypted_key::BYTEA, current_setting('app.llm_encryption_key', true));
END;
$$ LANGUAGE plpgsql;

-- ==============================================================================
-- TRIGGER: Auto-update timestamp
-- ==============================================================================
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

-- ==============================================================================
-- Encryption key configuration (adjust in production)
-- ==============================================================================
-- SET app.llm_encryption_key = 'your-secure-encryption-key-min-32-chars';

-- Register migration
SELECT public.register_migration('llm', 1);

-- Comments
COMMENT ON TABLE llm.user_llm_credentials IS 'User LLM credentials (encrypted)';
COMMENT ON COLUMN llm.user_llm_credentials.api_key IS 'Encrypted LLM provider API key';
COMMENT ON COLUMN llm.user_llm_credentials.api_endpoint IS 'Custom endpoint URL (optional)';
COMMENT ON COLUMN llm.user_llm_credentials.model_name IS 'Preferred model name for this provider';
COMMENT ON COLUMN llm.user_llm_credentials.is_default IS 'Whether this is the default provider for the user';
