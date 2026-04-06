-- =====================================================
-- AGREGAR banner_url A GRUPOS
-- =====================================================

-- Agregar columna banner_url a la tabla groups
ALTER TABLE groups ADD COLUMN IF NOT EXISTS banner_url TEXT;
