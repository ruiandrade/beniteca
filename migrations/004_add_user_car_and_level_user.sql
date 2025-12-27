-- Migration: Add Car column to [User] and create LevelUser association table

-- Add Car column if missing
IF NOT EXISTS (
    SELECT * FROM sys.columns 
    WHERE object_id = OBJECT_ID('[User]') AND name = 'Car'
)
BEGIN
    ALTER TABLE [User]
    ADD Car NVARCHAR(50) NULL;
    PRINT 'Added Car column to [User]';
END
ELSE
BEGIN
    PRINT 'Car column already exists on [User]';
END

-- Create LevelUser association table to link users to obras/levels
IF NOT EXISTS (
    SELECT * FROM sys.objects 
    WHERE object_id = OBJECT_ID('LevelUser') AND type = 'U'
)
BEGIN
    CREATE TABLE LevelUser (
        id INT IDENTITY(1,1) PRIMARY KEY,
        levelId INT NOT NULL,
        userId INT NOT NULL,
        createdAt DATETIME2 DEFAULT SYSUTCDATETIME(),
        CONSTRAINT FK_LevelUser_Level FOREIGN KEY (levelId) REFERENCES Level(id) ON DELETE CASCADE,
        CONSTRAINT FK_LevelUser_User FOREIGN KEY (userId) REFERENCES [User](id) ON DELETE CASCADE,
        CONSTRAINT UQ_LevelUser UNIQUE (levelId, userId)
    );
    PRINT 'Created LevelUser table';
END
ELSE
BEGIN
    PRINT 'LevelUser table already exists';
END
