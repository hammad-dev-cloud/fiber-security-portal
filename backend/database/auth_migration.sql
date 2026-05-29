-- =====================================================================
-- Fiber Security Portal — Auth Features Migration
-- Run this in Supabase SQL Editor (Project → SQL Editor → New Query)
-- Adds: phone column, is_pending for signup approval, reset_token columns
-- =====================================================================

-- Phone column (Phase 2 - Settings)
ALTER TABLE admin_users
ADD COLUMN IF NOT EXISTS phone VARCHAR(20);

-- Signup approval workflow (Phase 3 - Signup)
ALTER TABLE admin_users
ADD COLUMN IF NOT EXISTS is_pending BOOLEAN DEFAULT FALSE;

-- Password reset tokens (Phase 4 - Forgot Password)
ALTER TABLE admin_users
ADD COLUMN IF NOT EXISTS reset_token VARCHAR(120);

ALTER TABLE admin_users
ADD COLUMN IF NOT EXISTS reset_token_expires_at TIMESTAMPTZ;

-- Index for faster reset token lookups
CREATE INDEX IF NOT EXISTS idx_admin_reset_token ON admin_users(reset_token) WHERE reset_token IS NOT NULL;

-- Verify the changes
DO $$
BEGIN
  RAISE NOTICE 'Auth migration complete — phone, is_pending, reset_token columns added.';
END $$;
