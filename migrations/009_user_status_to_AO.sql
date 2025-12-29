-- 009: Normalize User.status to 'A' (Admin) or 'O' (Others) and add a constraint

-- Update existing rows: keep 'A' as Admin, everything else becomes 'O'
UPDATE [dbo].[User]
SET status = CASE WHEN UPPER(LTRIM(RTRIM(status))) = 'A' THEN 'A' ELSE 'O' END;

-- Drop existing constraint if present (defensive)
IF EXISTS (
  SELECT * FROM sys.check_constraints 
  WHERE name = 'CK_User_Status_AO' AND parent_object_id = OBJECT_ID('[dbo].[User]')
)
BEGIN
  ALTER TABLE [dbo].[User] DROP CONSTRAINT CK_User_Status_AO;
END

-- Add strict constraint for future rows
ALTER TABLE [dbo].[User]
  ADD CONSTRAINT CK_User_Status_AO CHECK (status IN ('A','O'));
