-- 008: Create granular user-work-object permissions table
-- This table governs per-user permissions per work (level root or sublevel)
-- Objects: LEVELS, MATERIALS, NOTES, PHOTOS, DOCUMENTS, DASHBOARD, EQUIPA, PLANEAMENTO

IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[UserWorkPermission]') AND type in (N'U'))
BEGIN
  CREATE TABLE [dbo].[UserWorkPermission] (
    id INT IDENTITY(1,1) PRIMARY KEY,
    userId INT NOT NULL,
    levelId INT NOT NULL,
    objectType NVARCHAR(32) NOT NULL,
    permissionLevel NVARCHAR(8) NOT NULL, -- 'W' (writer), 'R' (reader), 'N' (none)
    createdAt DATETIME2 DEFAULT GETDATE(),
    updatedAt DATETIME2 DEFAULT GETDATE(),
    CONSTRAINT FK_UWP_User FOREIGN KEY (userId) REFERENCES [dbo].[User](id),
    CONSTRAINT FK_UWP_Level FOREIGN KEY (levelId) REFERENCES [dbo].[Level](id),
    CONSTRAINT UQ_UWP_User_Level_Object UNIQUE (userId, levelId, objectType),
    CONSTRAINT CK_UWP_ObjectType CHECK (objectType IN (
      'LEVELS','MATERIALS','NOTES','PHOTOS','DOCUMENTS','DASHBOARD','EQUIPA','PLANEAMENTO'
    )),
    CONSTRAINT CK_UWP_Permission CHECK (permissionLevel IN ('W','R','N'))
  );

  -- Helpful indexes
  CREATE INDEX IX_UWP_User ON [dbo].[UserWorkPermission](userId);
  CREATE INDEX IX_UWP_Level ON [dbo].[UserWorkPermission](levelId);
  CREATE INDEX IX_UWP_Object ON [dbo].[UserWorkPermission](objectType);
END
