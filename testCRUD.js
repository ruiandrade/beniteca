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

// Funções CRUD básicas
async function getUsers() {
  try {
    await sql.connect(config);
    const result = await sql.query('SELECT * FROM [User]');
    console.log('Users:', result.recordset);
  } catch (err) {
    console.error('Error getting users:', err);
  } finally {
    sql.close();
  }
}

async function createUser(email, name, status) {
  try {
    await sql.connect(config);
    const result = await sql.query(`INSERT INTO [User] (email, name, status) OUTPUT INSERTED.* VALUES ('${email}', '${name}', '${status}')`);
    console.log('Created user:', result.recordset[0]);
  } catch (err) {
    console.error('Error creating user:', err);
  } finally {
    sql.close();
  }
}

async function updateUser(id, name) {
  try {
    await sql.connect(config);
    const result = await sql.query(`UPDATE [User] SET name = '${name}' OUTPUT INSERTED.* WHERE id = ${id}`);
    console.log('Updated user:', result.recordset[0]);
  } catch (err) {
    console.error('Error updating user:', err);
  } finally {
    sql.close();
  }
}

async function deleteUser(id) {
  try {
    await sql.connect(config);
    await sql.query(`DELETE FROM [User] WHERE id = ${id}`);
    console.log('Deleted user with id:', id);
  } catch (err) {
    console.error('Error deleting user:', err);
  } finally {
    sql.close();
  }
}

// Teste das funções
async function testCRUD() {
  console.log('=== Testing CRUD Operations ===');

  console.log('\n1. Getting all users:');
  await getUsers();

  console.log('\n2. Creating a new user:');
  await createUser('newuser@beniteca.com', 'New User', 'R');

  console.log('\n3. Updating user:');
  await updateUser(5, 'Updated New User'); // Assuming id 5 is the new user

  console.log('\n4. Getting all users after update:');
  await getUsers();

  console.log('\n5. Deleting user:');
  await deleteUser(5);

  console.log('\n6. Getting all users after delete:');
  await getUsers();
}

testCRUD();