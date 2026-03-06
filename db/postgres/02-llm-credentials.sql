-- ==============================================================================
-- PAPAS APP - Credenciales LLM por Usuario
-- ==============================================================================

-- Extensión para encriptación (si no existe)
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ==============================================================================
-- TABLA: user_llm_credentials
-- ==============================================================================
CREATE TABLE IF NOT EXISTS user_llm_credentials (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    provider VARCHAR(20) NOT NULL CHECK (provider IN ('ollama', 'zai', 'minimax')),
    api_key TEXT, -- Encriptado
    api_endpoint TEXT, -- URL personalizada del endpoint
    model_preference VARCHAR(100), -- Modelo preferido
    is_default BOOLEAN DEFAULT false, -- Si es el provider por defecto
    creado_en TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    actualizado_en TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, provider)
);

-- Índices
CREATE INDEX idx_user_llm_credentials_user_id ON user_llm_credentials(user_id);
CREATE INDEX idx_user_llm_credentials_provider ON user_llm_credentials(provider);

-- NOTA: La encriptación/desencriptación de API keys se maneja en el backend (Node.js)
-- usando crypto con LLM_ENCRYPTION_KEY del entorno, no en la base de datos.

-- ==============================================================================
-- TRIGGER: Actualizar timestamp
-- ==============================================================================
CREATE TRIGGER trigger_user_llm_credentials_actualizado_en
    BEFORE UPDATE ON user_llm_credentials
    FOR EACH ROW
    EXECUTE FUNCTION actualizar_actualizado_en();

-- ==============================================================================
-- COMENTARIOS
-- ==============================================================================
COMMENT ON TABLE user_llm_credentials IS 'Credenciales de LLM por usuario';
COMMENT ON COLUMN user_llm_credentials.api_key IS 'API key encriptada del proveedor LLM';
COMMENT ON COLUMN user_llm_credentials.api_endpoint IS 'URL personalizada del endpoint (opcional)';
COMMENT ON COLUMN user_llm_credentials.model_preference IS 'Modelo preferido para este proveedor';
COMMENT ON COLUMN user_llm_credentials.is_default IS 'Indica si este proveedor es el predeterminado del usuario';
