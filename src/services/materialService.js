const { getConnection, sql } = require('../config/db');

class MaterialService {
  async createMaterial(data) {
    const pool = await getConnection();
    const insertQuery = `
      INSERT INTO Material (
        levelId,
        description,
        quantity,
        estimatedValue,
        realValue,
        deliveryStatus,
        assemblyStatus,
        brand,
        manufacturer,
        [type]
      )
      OUTPUT INSERTED.*
      VALUES (
        @levelId,
        @description,
        @quantity,
        @estimatedValue,
        @realValue,
        @deliveryStatus,
        @assemblyStatus,
        @brand,
        @manufacturer,
        @type
      )
    `;
    const result = await pool.request()
      .input('levelId', sql.Int, data.levelId)
      .input('description', sql.NVarChar, data.description)
      .input('quantity', sql.Float, data.quantity)
      .input('estimatedValue', sql.Float, data.estimatedValue)
      .input('realValue', sql.Float, data.realValue)
      .input('deliveryStatus', sql.NVarChar, data.deliveryStatus || null)
      .input('assemblyStatus', sql.NVarChar, data.assemblyStatus || null)
      .input('brand', sql.NVarChar, data.brand || null)
      .input('manufacturer', sql.NVarChar, data.manufacturer || null)
      .input('type', sql.NVarChar, data.type || null)
      .query(insertQuery);
    return result.recordset[0];
  }

  async getMaterialsByLevel(levelId) {
    const pool = await getConnection();
    const result = await pool.request()
      .input('levelId', sql.Int, parseInt(levelId))
      .query('SELECT * FROM Material WHERE levelId = @levelId ORDER BY id');
    return result.recordset;
  }

  async updateMaterial(id, data) {
    const pool = await getConnection();
    const updateQuery = `
      UPDATE Material
        SET levelId = @levelId,
          description = @description,
          quantity = @quantity,
          estimatedValue = @estimatedValue,
          realValue = @realValue,
          deliveryStatus = @deliveryStatus,
          assemblyStatus = @assemblyStatus,
          brand = @brand,
          manufacturer = @manufacturer,
          [type] = @type,
          updatedAt = GETDATE()
      OUTPUT INSERTED.*
      WHERE id = @id
    `;
    const result = await pool.request()
      .input('id', sql.Int, parseInt(id))
      .input('levelId', sql.Int, data.levelId)
      .input('description', sql.NVarChar, data.description)
      .input('quantity', sql.Float, data.quantity)
      .input('estimatedValue', sql.Float, data.estimatedValue)
      .input('realValue', sql.Float, data.realValue)
      .input('deliveryStatus', sql.NVarChar, data.deliveryStatus || null)
      .input('assemblyStatus', sql.NVarChar, data.assemblyStatus || null)
      .input('brand', sql.NVarChar, data.brand || null)
      .input('manufacturer', sql.NVarChar, data.manufacturer || null)
      .input('type', sql.NVarChar, data.type || null)
      .query(updateQuery);
    return result.recordset[0];
  }

  async deleteMaterial(id) {
    const pool = await getConnection();
    const result = await pool.request()
      .input('id', sql.Int, parseInt(id))
      .query('DELETE FROM Material OUTPUT DELETED.* WHERE id = @id');
    return result.recordset[0];
  }
}

module.exports = new MaterialService();