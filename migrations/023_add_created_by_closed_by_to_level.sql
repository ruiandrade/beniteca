-- Migration 023: Add createdBy and closedBy to Level table
-- createdBy: tracks which user created/registered the level
-- closedBy: tracks which user closed/completed the level

ALTER TABLE [Level] ADD createdBy INT NULL;
ALTER TABLE [Level] ADD closedBy INT NULL;
