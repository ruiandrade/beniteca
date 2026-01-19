-- Migration 022: Add overtime hours to LevelUserDay
-- Add column to track overtime hours worked by users

ALTER TABLE LevelUserDay
ADD overtimeHours DECIMAL(5,2) NULL DEFAULT 0;
