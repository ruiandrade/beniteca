-- Migration 017: Add siteDirectorId (Diretor de Obra) to Level
ALTER TABLE [Level] ADD siteDirectorId INT NULL;
GO

ALTER TABLE [Level]
  ADD CONSTRAINT FK_Level_SiteDirector
  FOREIGN KEY (siteDirectorId) REFERENCES [User](id);
GO
