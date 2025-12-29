-- Migration 007: Add period column to LevelUserDay for half-day scheduling
-- Period can be 'm' (morning) or 'a' (afternoon)
-- Update unique constraint to include period in the key

-- Step 1: Drop existing unique constraint
IF EXISTS (SELECT * FROM sys.objects WHERE name = 'UQ_LevelUserDay' AND type = 'UQ')
BEGIN
    ALTER TABLE LevelUserDay DROP CONSTRAINT UQ_LevelUserDay;
    PRINT 'Dropped old unique constraint UQ_LevelUserDay';
END

-- Step 2: Add period column with default 'm' for existing records
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('LevelUserDay') AND name = 'period')
BEGIN
    ALTER TABLE LevelUserDay ADD period CHAR(1) NOT NULL DEFAULT 'm' CHECK (period IN ('m', 'a'));
    PRINT 'Added period column to LevelUserDay';
END

-- Step 3: Create new unique constraint including period
IF NOT EXISTS (SELECT * FROM sys.objects WHERE name = 'UQ_LevelUserDay_Period' AND type = 'UQ')
BEGIN
    ALTER TABLE LevelUserDay ADD CONSTRAINT UQ_LevelUserDay_Period UNIQUE (levelId, userId, [day], period);
    PRINT 'Created new unique constraint UQ_LevelUserDay_Period';
END

-- Step 4: Update indexes for better query performance with period
IF EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_LevelUserDay_Level_Day')
BEGIN
    DROP INDEX IX_LevelUserDay_Level_Day ON LevelUserDay;
    PRINT 'Dropped old index IX_LevelUserDay_Level_Day';
END

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_LevelUserDay_Level_Day_Period')
BEGIN
    CREATE INDEX IX_LevelUserDay_Level_Day_Period ON LevelUserDay(levelId, [day], period);
    PRINT 'Created new index IX_LevelUserDay_Level_Day_Period';
END

PRINT 'Migration 007 completed successfully';
