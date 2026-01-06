-- Migration 015: Update Photo type constraint to only allow 'issue' and 'others'
-- Date: 2026-01-06

BEGIN TRANSACTION;

-- Drop the existing constraint
ALTER TABLE Photo DROP CONSTRAINT CK_Photo_Type;

-- Add new constraint with only 'issue' and 'others'
ALTER TABLE Photo ADD CONSTRAINT CK_Photo_Type CHECK (type IN ('issue', 'others'));

COMMIT TRANSACTION;
