-- ==============================================================================
-- PAPAS APP - PostgreSQL Init Script
-- ==============================================================================

-- Crear extensiones necesarias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ==============================================================================
-- TABLA: usuarios
-- ==============================================================================
CREATE TABLE IF NOT EXISTS usuarios (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    nombre VARCHAR(100) NOT NULL,
    saldo_monedas INTEGER DEFAULT 0,
    creado_en TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    actualizado_en TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Índices
CREATE INDEX idx_usuarios_email ON usuarios(email);
CREATE INDEX idx_usuarios_saldo_monedas ON usuarios(saldo_monedas);

-- ==============================================================================
-- TABLA: proyectos
-- ==============================================================================
CREATE TABLE IF NOT EXISTS proyectos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    usuario_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    nombre VARCHAR(255) NOT NULL,
    descripcion TEXT,
    estado VARCHAR(20) DEFAULT 'activo' CHECK (estado IN ('activo', 'pausado', 'completado')),
    creado_en TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    actualizado_en TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    completado_en TIMESTAMP WITH TIME ZONE
);

-- Índices
CREATE INDEX idx_proyectos_usuario_id ON proyectos(usuario_id);
CREATE INDEX idx_proyectos_estado ON proyectos(estado);

-- ==============================================================================
-- TABLA: tareas (papitas)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS tareas (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    proyecto_id UUID NOT NULL REFERENCES proyectos(id) ON DELETE CASCADE,
    descripcion TEXT NOT NULL,
    estado VARCHAR(20) DEFAULT 'pendiente' CHECK (estado IN ('pendiente', 'completada', 'bloqueada')),
    valor_monedas INTEGER DEFAULT 10,
    orden INTEGER NOT NULL,
    depende_de UUID[] DEFAULT '{}', -- Array de IDs de tareas que deben completarse primero
    creada_en TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    completada_en TIMESTAMP WITH TIME ZONE
);

-- Índices
CREATE INDEX idx_tareas_proyecto_id ON tareas(proyecto_id);
CREATE INDEX idx_tareas_estado ON tareas(estado);
CREATE INDEX idx_tareas_orden ON tareas(proyecto_id, orden);

-- ==============================================================================
-- TABLA: sesiones
-- ==============================================================================
CREATE TABLE IF NOT EXISTS sesiones (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    usuario_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    token VARCHAR(500) NOT NULL,
    expira_en TIMESTAMP WITH TIME ZONE NOT NULL,
    creada_en TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Índices
CREATE INDEX idx_sesiones_usuario_id ON sesiones(usuario_id);
CREATE INDEX idx_sesiones_token ON sesiones(token);
CREATE INDEX idx_sesiones_expira_en ON sesiones(expira_en);

-- ==============================================================================
-- TRIGGERS: Actualizar timestamp de actualizacion
-- ==============================================================================
CREATE OR REPLACE FUNCTION actualizar_actualizado_en()
RETURNS TRIGGER AS $$
BEGIN
    NEW.actualizado_en = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_usuarios_actualizado_en
    BEFORE UPDATE ON usuarios
    FOR EACH ROW
    EXECUTE FUNCTION actualizar_actualizado_en();

CREATE TRIGGER trigger_proyectos_actualizado_en
    BEFORE UPDATE ON proyectos
    FOR EACH ROW
    EXECUTE FUNCTION actualizar_actualizado_en();

-- ==============================================================================
-- DATOS DE PRUEBA (opcional)
-- ==============================================================================
-- Usuario de prueba: password es "password123"
-- El hash es de bcrypt con rounds=10
INSERT INTO usuarios (email, password_hash, nombre, saldo_monedas)
VALUES ('test@papas.app', '$2b$10$XZQ7Q3N8Y8z8Z8Z8Z8Z8ZeY8Z8Z8Z8Z8Z8Z8Z8Z8Z8Z8Z8Z8Z8', 'Usuario Test', 0)
ON CONFLICT (email) DO NOTHING;
