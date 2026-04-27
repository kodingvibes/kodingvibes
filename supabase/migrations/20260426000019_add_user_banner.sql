-- =====================================================
-- AGREGAR banner_url A USUARIOS
-- =====================================================

ALTER TABLE users ADD COLUMN IF NOT EXISTS banner_url TEXT;
