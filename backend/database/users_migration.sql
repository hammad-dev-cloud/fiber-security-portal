-- =====================================================================
-- USER MANAGEMENT MIGRATION
-- Adds owner role tracking and login statistics to admin_users table.
-- Run this in Supabase SQL Editor (Project → SQL Editor → New Query)
-- =====================================================================

-- Add new columns to admin_users
ALTER TABLE admin_users ADD COLUMN IF NOT EXISTS is_owner       BOOLEAN     DEFAULT FALSE;
ALTER TABLE admin_users ADD COLUMN IF NOT EXISTS login_count    INTEGER     DEFAULT 0;
ALTER TABLE admin_users ADD COLUMN IF NOT EXISTS phone          VARCHAR(20);

-- Set the first admin user (oldest by created_at) as the owner
-- This protects against losing owner access during migration
UPDATE admin_users
SET is_owner = TRUE
WHERE id = (SELECT id FROM admin_users ORDER BY created_at ASC LIMIT 1);

-- Verify
DO $$
DECLARE
    owner_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO owner_count FROM admin_users WHERE is_owner = TRUE;
    IF owner_count = 1 THEN
        RAISE NOTICE 'Migration successful — owner assigned';
    ELSE
        RAISE NOTICE 'Warning: % owners found, expected 1', owner_count;
    END IF;
END $$;
