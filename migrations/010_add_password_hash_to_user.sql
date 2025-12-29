-- 010: Add passwordHash column to [User] table for local auth

IF COL_LENGTH('[dbo].[User]', 'passwordHash') IS NULL
BEGIN
  ALTER TABLE [dbo].[User]
    ADD passwordHash NVARCHAR(255) NULL;
END
