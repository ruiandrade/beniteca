-- Criar tabela Document (estrutura similar à tabela Photo)
CREATE TABLE Document (
  id INT PRIMARY KEY IDENTITY(1,1),
  levelId INT NOT NULL,
  type NVARCHAR(50) NULL,  -- ex: 'Contrato', 'Fatura', 'Certificado', etc.
  url NVARCHAR(MAX) NOT NULL,
  fileName NVARCHAR(255) NULL,
  createdAt DATETIME2 DEFAULT GETDATE(),
  updatedAt DATETIME2 DEFAULT GETDATE(),
  FOREIGN KEY (levelId) REFERENCES Level(id) ON DELETE CASCADE
);
