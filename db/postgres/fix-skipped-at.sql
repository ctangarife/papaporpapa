-- ==============================================================================
-- PAPAS APP - Fix skipped_at column
-- Script para agregar la columna skipped_at a la tabla tasks
-- Ejecutar con: psql -U p4p1t4s -d papa_app -f fix-skipped-at.sql
-- ==============================================================================

-- Agregar columna skipped_at si no existe
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'projects'
        AND table_name = 'tasks'
        AND column_name = 'skipped_at'
    ) THEN
        ALTER TABLE projects.tasks ADD COLUMN skipped_at TIMESTAMP WITH TIME ZONE;
    END IF;
END $$;

-- Actualizar el constraint para incluir 'skipped'
ALTER TABLE projects.tasks DROP CONSTRAINT IF EXISTS tasks_status_check;

ALTER TABLE projects.tasks
ADD CONSTRAINT tasks_status_check
CHECK (status IN ('pending', 'completed', 'blocked', 'skipped'));

-- Agregar comentarios
COMMENT ON COLUMN projects.tasks.skipped_at IS 'When the task was skipped by the user';
COMMENT ON COLUMN projects.tasks.status IS 'pending: not started, completed: done, blocked: cannot be done yet, skipped: user chose to skip it';

-- Verificación
SELECT 'Columna skipped_at: ' || COUNT(*)::text FROM information_schema.columns WHERE table_schema = 'projects' AND table_name = 'tasks' AND column_name = 'skipped_at';
SELECT 'Constraint actualizado. Valores permitidos: pending, completed, blocked, skipped';
