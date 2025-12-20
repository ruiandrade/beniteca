const sql = require('mssql');

const config = {
  server: 'beniteca.database.windows.net',
  port: 1433,
  database: 'free-sql-db-7083145',
  user: 'beniteca',
  password: 'Testing10',
  options: {
    encrypt: true,
    trustServerCertificate: true,
  }
};

async function seedDatabase() {
  try {
    await sql.connect(config);
    console.log('Connected to database');

    // Inserir usuários
    await sql.query(`
      INSERT INTO [User] (email, name, status) VALUES
      ('admin@beniteca.com', 'Admin User', 'A'),
      ('manager@beniteca.com', 'Construction Manager', 'C'),
      ('worker@beniteca.com', 'Worker', 'W'),
      ('viewer@beniteca.com', 'Viewer', 'R')
    `);
    console.log('Users inserted');

    // Inserir níveis
    await sql.query(`
      INSERT INTO [Level] (name, description, parentId, startDate, endDate, completed, notes, constructionManagerId) VALUES
      ('Project Alpha', 'Main construction project', NULL, '2024-01-01', '2024-12-31', 0, 'Initial phase', 2),
      ('Foundation', 'Foundation work', 1, '2024-01-01', '2024-03-31', 1, 'Completed successfully', 2),
      ('Structure', 'Building structure', 1, '2024-04-01', '2024-08-31', 0, 'In progress', 2),
      ('Finishing', 'Interior finishing', 1, '2024-09-01', '2024-12-31', 0, 'Planned', 2)
    `);
    console.log('Levels inserted');

    // Inserir materiais
    await sql.query(`
      INSERT INTO Material (levelId, description, quantity, estimatedValue, realValue) VALUES
      (2, 'Concrete', 100.5, 5000.00, 4800.00),
      (2, 'Steel bars', 200.0, 3000.00, 3200.00),
      (3, 'Bricks', 5000.0, 2500.00, NULL),
      (3, 'Cement', 150.0, 750.00, NULL)
    `);
    console.log('Materials inserted');

    // Inserir fotos
    await sql.query(`
      INSERT INTO Photo (levelId, type, url) VALUES
      (2, 'before', 'https://beniteca.blob.core.windows.net/photos/foundation_before.jpg'),
      (2, 'completed', 'https://beniteca.blob.core.windows.net/photos/foundation_after.jpg'),
      (3, 'inprogress', 'https://beniteca.blob.core.windows.net/photos/structure_progress.jpg')
    `);
    console.log('Photos inserted');

    // Inserir permissões
    await sql.query(`
      INSERT INTO Permission (userId, levelId, permission) VALUES
      (1, 1, 'W'), -- Admin can write to main project
      (2, 1, 'W'), -- Manager can write to main project
      (2, 2, 'W'), -- Manager can write to foundation
      (2, 3, 'W'), -- Manager can write to structure
      (3, 2, 'R'), -- Worker can read foundation
      (3, 3, 'W'), -- Worker can write to structure
      (4, 1, 'R'), -- Viewer can read main project
      (4, 2, 'R')  -- Viewer can read foundation
    `);
    console.log('Permissions inserted');

    console.log('Database seeded successfully!');
  } catch (err) {
    console.error('Error seeding database:', err);
  } finally {
    sql.close();
  }
}

seedDatabase();