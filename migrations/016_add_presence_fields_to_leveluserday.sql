-- Migration 016: Add presence tracking fields to LevelUserDay table
-- Date: 2026-01-06

BEGIN TRANSACTION;

-- Add appeared column (yes, no, or NULL for unset)
ALTER TABLE LevelUserDay ADD appeared NVARCHAR(3) NULL;

-- Add observations column for presence notes
ALTER TABLE LevelUserDay ADD observations NVARCHAR(MAX) NULL;

-- Add constraint to appeared values
ALTER TABLE LevelUserDay ADD CONSTRAINT CK_LevelUserDay_Appeared CHECK (appeared IS NULL OR appeared IN ('yes', 'no'));

COMMIT TRANSACTION;
