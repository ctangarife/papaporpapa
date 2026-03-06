-- ==============================================================================
-- PAPAS APP - Campos Extendidos de Usuario
-- ==============================================================================

-- Agregar campos a la tabla usuarios
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS apellido VARCHAR(100);
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS username VARCHAR(50) UNIQUE;
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS fecha_nacimiento DATE;
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS diagnostico VARCHAR(100);
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS preferencias_ia TEXT; -- JSON con preferencias para el LLM
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS onboarding_completado BOOLEAN DEFAULT false;

-- Índice para username
CREATE INDEX IF NOT EXISTS idx_usuarios_username ON usuarios(username);

-- Comentarios
COMMENT ON COLUMN usuarios.apellido IS 'Apellido del usuario';
COMMENT ON COLUMN usuarios.username IS 'Nombre de usuario único (para @menciones)';
COMMENT ON COLUMN usuarios.fecha_nacimiento IS 'Fecha de nacimiento del usuario';
COMMENT ON COLUMN usuarios.diagnostico IS 'Diagnóstico de neurodivergencia (TEA, TDHA, etc.)';
COMMENT ON COLUMN usuarios.preferencias_ia IS 'Preferencias personalizadas para la IA (JSON)';
COMMENT ON COLUMN usuarios.onboarding_completado IS 'Indica si el usuario completó el onboarding';

-- Tipos de diagnóstico comunes (solo como referencia, no es un enum)
-- TEA: Trastorno del Espectro Autista
-- TDHA: Trastorno por Déficit de Atención e Hiperactividad
-- DISLEXIA: Dificultad en el aprendizaje de la lectura
-- TDA: Trastorno del Desarrollo de la Coordinación
-- OTROS: Otros diagnósticos
-- NINGUNO: Sin diagnóstico
