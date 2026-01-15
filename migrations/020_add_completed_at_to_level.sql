-- Migration 020: Add completedAt column to Level table
-- This tracks the exact date when a level was marked as completed
-- Independent from updatedAt which can change with any modification

ALTER TABLE [Level] ADD completedAt DATETIME2 NULL;
GO

-- Populate completedAt for existing completed items with their updatedAt value as a baseline
UPDATE [Level] SET completedAt = updatedAt WHERE status = 'completed';
GO
