-- SQL Script to create tables for Beniteca project in SQL Server

-- User table
CREATE TABLE [User] (
  id INT IDENTITY(1,1) PRIMARY KEY,
  email NVARCHAR(255) UNIQUE NOT NULL,
  name NVARCHAR(255) NOT NULL,
  status NVARCHAR(255) NOT NULL, -- A: Admin, C: Construction Manager, W: Write, R: Read-only
  createdAt DATETIME2 DEFAULT GETDATE(),
  updatedAt DATETIME2 DEFAULT GETDATE()
);

-- Level table
CREATE TABLE [Level] (
  id INT IDENTITY(1,1) PRIMARY KEY,
  name NVARCHAR(255) NOT NULL,
  description NVARCHAR(MAX),
  parentId INT,
  startDate DATETIME2,
  endDate DATETIME2,
  completed BIT DEFAULT 0,
  notes NVARCHAR(MAX),
  coverImage NVARCHAR(MAX), -- For root levels
  constructionManagerId INT,
  createdAt DATETIME2 DEFAULT GETDATE(),
  updatedAt DATETIME2 DEFAULT GETDATE(),
  FOREIGN KEY (parentId) REFERENCES [Level](id),
  FOREIGN KEY (constructionManagerId) REFERENCES [User](id)
);

-- Material table
CREATE TABLE Material (
  id INT IDENTITY(1,1) PRIMARY KEY,
  levelId INT NOT NULL,
  description NVARCHAR(MAX) NOT NULL,
  quantity FLOAT NOT NULL,
  estimatedValue FLOAT NOT NULL,
  realValue FLOAT,
  createdAt DATETIME2 DEFAULT GETDATE(),
  updatedAt DATETIME2 DEFAULT GETDATE(),
  FOREIGN KEY (levelId) REFERENCES [Level](id)
);

-- Photo table
CREATE TABLE Photo (
  id INT IDENTITY(1,1) PRIMARY KEY,
  levelId INT NOT NULL,
  type NVARCHAR(255) NOT NULL, -- before, inprogress, completed
  url NVARCHAR(MAX) NOT NULL, -- Azure Blob URL
  createdAt DATETIME2 DEFAULT GETDATE(),
  updatedAt DATETIME2 DEFAULT GETDATE(),
  FOREIGN KEY (levelId) REFERENCES [Level](id)
);

-- Permission table
CREATE TABLE Permission (
  id INT IDENTITY(1,1) PRIMARY KEY,
  userId INT NOT NULL,
  levelId INT NOT NULL,
  permission NVARCHAR(255) NOT NULL, -- W: Write, R: Read-only
  createdAt DATETIME2 DEFAULT GETDATE(),
  updatedAt DATETIME2 DEFAULT GETDATE(),
  FOREIGN KEY (userId) REFERENCES [User](id),
  FOREIGN KEY (levelId) REFERENCES [Level](id),
  UNIQUE (userId, levelId)
);