-- Migration 019: Change completed BIT to status NVARCHAR(50)
-- Status values: 'active', 'paused', 'completed'

-- Add new status column
ALTER TABLE [Level] ADD status NVARCHAR(50) NULL;
GO

-- Migrate existing data
UPDATE [Level] SET status = CASE WHEN completed = 1 THEN 'completed' ELSE 'active' END;
GO

-- Make status NOT NULL with default
ALTER TABLE [Level] ALTER COLUMN status NVARCHAR(50) NOT NULL;
GO

-- Add default constraint
ALTER TABLE [Level] ADD CONSTRAINT DF_Level_Status DEFAULT 'active' FOR status;
GO

-- Drop old completed column
ALTER TABLE [Level] DROP COLUMN completed;
GO
