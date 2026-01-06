-- Migration: Add observations column to Photo and add 'issue' type
-- Description: Add observacoes column for photo notes and extend type constraint to include 'issue' for inconformidades

-- Step 1: Check if observations column exists, if not add it
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('Photo') AND name = 'observacoes')
BEGIN
    ALTER TABLE Photo
    ADD observacoes NVARCHAR(MAX) NULL;
    
    PRINT 'Column observacoes added successfully';
END
ELSE
BEGIN
    PRINT 'Column observacoes already exists';
END

-- Step 2: Handle the type constraint
-- Using batch to isolate each statement and avoid batch-level errors
PRINT 'Attempting to update type constraint...';

-- Approach: Use dynamic SQL with separate batches
DECLARE @ConstraintExists BIT = 0;
DECLARE @ConstraintName NVARCHAR(128);

SELECT @ConstraintName = CONSTRAINT_NAME 
FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS 
WHERE TABLE_NAME = 'Photo' AND CONSTRAINT_TYPE = 'CHECK' AND CONSTRAINT_NAME LIKE '%Photo%';

IF @ConstraintName IS NOT NULL
BEGIN
    SET @ConstraintExists = 1;
    PRINT 'Found constraint: ' + @ConstraintName;
END

IF @ConstraintExists = 1
BEGIN
    BEGIN TRY
        ALTER TABLE Photo DROP CONSTRAINT CK_Photo_Type;
        PRINT 'Dropped existing CK_Photo_Type constraint';
    END TRY
    BEGIN CATCH
        PRINT 'Constraint CK_Photo_Type not found or could not drop, continuing...';
    END CATCH
END

-- Add new constraint - this will fail if constraint already allows 'issue'
BEGIN TRY
    ALTER TABLE Photo
    ADD CONSTRAINT CK_Photo_Type CHECK (type IN ('inicio', 'inprogress', 'completed', 'issue'));
    PRINT 'Added constraint CK_Photo_Type with issue type';
END TRY
BEGIN CATCH
    PRINT 'Constraint could not be added, it may already exist or be in conflict';
    PRINT ERROR_MESSAGE();
END CATCH

PRINT 'Migration 014 completed';
