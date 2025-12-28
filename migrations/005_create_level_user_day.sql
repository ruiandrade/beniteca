-- Migration: Create LevelUserDay table to register which user is at a root obra (level) on a given date
-- Records: (levelId, userId, day) with uniqueness to avoid duplicates per day

IF NOT EXISTS (
    SELECT * FROM sys.objects 
    WHERE object_id = OBJECT_ID('LevelUserDay') AND type = 'U'
)
BEGIN
    CREATE TABLE LevelUserDay (
        id INT IDENTITY(1,1) PRIMARY KEY,
        levelId INT NOT NULL,
        userId INT NOT NULL,
        [day] DATE NOT NULL,
        createdAt DATETIME2 DEFAULT SYSUTCDATETIME(),
        CONSTRAINT FK_LevelUserDay_Level FOREIGN KEY (levelId) REFERENCES Level(id) ON DELETE CASCADE,
        CONSTRAINT FK_LevelUserDay_User FOREIGN KEY (userId) REFERENCES [User](id) ON DELETE CASCADE,
        CONSTRAINT UQ_LevelUserDay UNIQUE (levelId, userId, [day])
    );

    -- Helpful indexes for common queries
    CREATE INDEX IX_LevelUserDay_Level_Day ON LevelUserDay(levelId, [day]);
    CREATE INDEX IX_LevelUserDay_User_Day ON LevelUserDay(userId, [day]);

    PRINT 'Created LevelUserDay table';
END
ELSE
BEGIN
    PRINT 'LevelUserDay table already exists';
END

-- Note: Association is intended for root obras (levels where parentId IS NULL).
-- Enforce at application layer when inserting; cross-table CHECK is not supported in SQL Server.
