-- Idempotent add of [order] column to Level, with backfill and not-null/default
IF COL_LENGTH('Level', 'order') IS NULL
BEGIN
	ALTER TABLE [Level] ADD [order] INT NULL;
END;

-- Backfill existing rows (only when null or zero) - use dynamic SQL to avoid metadata issues in same batch
EXEC('UPDATE [Level] SET [order] = id WHERE [order] IS NULL OR [order] = 0');

-- Ensure default constraint exists
IF NOT EXISTS (
	SELECT 1 FROM sys.default_constraints dc
	JOIN sys.columns c ON dc.parent_object_id = c.object_id AND dc.parent_column_id = c.column_id
	WHERE dc.parent_object_id = OBJECT_ID('Level') AND c.name = 'order'
)
BEGIN
	ALTER TABLE [Level] ADD CONSTRAINT DF_Level_order DEFAULT 0 FOR [order];
END;

-- Enforce NOT NULL
ALTER TABLE [Level] ALTER COLUMN [order] INT NOT NULL;
