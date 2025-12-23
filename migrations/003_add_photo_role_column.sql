-- Migration: Add role column to Photo table
-- Role: 'B' = Backend only, 'C' = Client accessible

-- Check if column exists before adding
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('Photo') AND name = 'role')
BEGIN
    ALTER TABLE Photo
    ADD role CHAR(1) NOT NULL DEFAULT 'B' CHECK (role IN ('B', 'C'));
    
    PRINT 'Column role added successfully';
END
ELSE
BEGIN
    PRINT 'Column role already exists';
END
