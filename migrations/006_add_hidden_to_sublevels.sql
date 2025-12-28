-- Add 'hidden' column to Level table to support hiding sublevels
ALTER TABLE [Level]
ADD hidden BIT DEFAULT 0;

-- Create index for efficient filtering of hidden levels
CREATE INDEX idx_level_hidden ON [Level](hidden);
