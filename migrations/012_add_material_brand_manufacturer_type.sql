-- 012: Add brand, manufacturer, and type columns to Material
-- Makes these attributes optional and available for UI capture

BEGIN TRANSACTION;

-- brand
IF NOT EXISTS (
  SELECT 1 FROM sys.columns 
  WHERE Name = N'brand' AND Object_ID = Object_ID(N'Material')
)
BEGIN
  ALTER TABLE Material ADD brand NVARCHAR(255) NULL;
  PRINT 'Added Material.brand';
END

-- manufacturer
IF NOT EXISTS (
  SELECT 1 FROM sys.columns 
  WHERE Name = N'manufacturer' AND Object_ID = Object_ID(N'Material')
)
BEGIN
  ALTER TABLE Material ADD manufacturer NVARCHAR(255) NULL;
  PRINT 'Added Material.manufacturer';
END

-- type (material type)
IF NOT EXISTS (
  SELECT 1 FROM sys.columns 
  WHERE Name = N'type' AND Object_ID = Object_ID(N'Material')
)
BEGIN
  ALTER TABLE Material ADD [type] NVARCHAR(255) NULL;
  PRINT 'Added Material.type';
END

-- Make estimatedValue optional
ALTER TABLE Material ALTER COLUMN estimatedValue FLOAT NULL;

-- Ensure realValue stays optional
ALTER TABLE Material ALTER COLUMN realValue FLOAT NULL;

COMMIT TRANSACTION;
