const { sql, getConnection } = require('../config/db');

exports.getAllUsers = async (req, res) => {
  try {
    const pool = await getConnection();
    const result = await pool.request().query('SELECT * FROM dbo.Users');
    res.json(result.recordset);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getUserById = async (req, res) => {
  try {
    const pool = await getConnection();
    const result = await pool.request()
      .input('id', sql.Int, req.params.id)
      .query('SELECT * FROM dbo.Users WHERE id = @id');
    if (result.recordset.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json(result.recordset[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.createUser = async (req, res) => {
  try {
    const { name, email } = req.body;
    const pool = await getConnection();
    const result = await pool.request()
      .input('name', sql.VarChar, name)
      .input('email', sql.VarChar, email)
      .query('INSERT INTO dbo.Users (name, email) OUTPUT INSERTED.* VALUES (@name, @email)');
    res.status(201).json(result.recordset[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.updateUser = async (req, res) => {
  try {
    const { name, email } = req.body;
    const pool = await getConnection();
    const result = await pool.request()
      .input('id', sql.Int, req.params.id)
      .input('name', sql.VarChar, name)
      .input('email', sql.VarChar, email)
      .query('UPDATE dbo.Users SET name = @name, email = @email OUTPUT INSERTED.* WHERE id = @id');
    if (result.rowsAffected[0] === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json(result.recordset[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.deleteUser = async (req, res) => {
  try {
    const pool = await getConnection();
    const result = await pool.request()
      .input('id', sql.Int, req.params.id)
      .query('DELETE FROM dbo.Users WHERE id = @id');
    if (result.rowsAffected[0] === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json({ message: 'User deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};