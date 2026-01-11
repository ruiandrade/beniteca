-- Migration 018: Add active flag to User
ALTER TABLE [User] ADD active BIT NOT NULL CONSTRAINT DF_User_Active DEFAULT 1;
GO

-- Backfill existing rows to active = 1 (default already applies, but ensure)
UPDATE [User] SET active = 1 WHERE active IS NULL;
GO
