
BEGIN TRANSACTION;

IF EXISTS (
  SELECT 1 FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS
  WHERE name = 'CK_User_Status_AO' AND TABLE_NAME = 'User'
)
BEGIN
  ALTER TABLE [dbo].[User] DROP CONSTRAINT CK_User_Status_AO;
  PRINT 'Dropped old constraint CK_User_Status_AO';
END

ALTER TABLE [dbo].[User]
ADD CONSTRAINT CK_User_Status_AOC CHECK (status IN ('A','O','C'));

PRINT 'Added new constraint CK_User_Status_AOC supporting A (Admin), O (Other), and C (Client)';

COMMIT TRANSACTION;
