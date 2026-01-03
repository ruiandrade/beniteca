const { getConnection, sql } = require('../config/db');

class LevelUserDayService {
  async getAll(from, to) {
    const pool = await getConnection();
    const req = pool.request();
    if (from) req.input('from', sql.Date, from);
    if (to) req.input('to', sql.Date, to);

    const result = await req.query(`
      SELECT lud.id, lud.levelId, lud.userId, lud.day, lud.period,
             u.name, u.email, u.Car
      FROM LevelUserDay lud
      INNER JOIN [User] u ON u.id = lud.userId
      WHERE 1=1
        ${from ? 'AND lud.day >= @from' : ''}
        ${to ? 'AND lud.day <= @to' : ''}
      ORDER BY lud.day, u.name, lud.period
    `);
    return result.recordset;
  }

  async getByLevel(levelId, from, to) {
    const pool = await getConnection();
    const req = pool.request().input('levelId', sql.Int, parseInt(levelId));
    if (from) req.input('from', sql.Date, from);
    if (to) req.input('to', sql.Date, to);

    const result = await req.query(`
      SELECT lud.id, lud.levelId, lud.userId, lud.day, lud.period,
             u.name, u.email, u.Car
      FROM LevelUserDay lud
      INNER JOIN [User] u ON u.id = lud.userId
      WHERE lud.levelId = @levelId
        ${from ? 'AND lud.day >= @from' : ''}
        ${to ? 'AND lud.day <= @to' : ''}
      ORDER BY lud.day, u.name
    `);
    return result.recordset;
  }

  async setRange(levelId, from, to, entries = []) {
    if (!from || !to) throw new Error('from and to are required');

    const fromDate = new Date(from);
    const toDate = new Date(to);
    if (Number.isNaN(fromDate) || Number.isNaN(toDate)) throw new Error('Invalid date format');
    if (fromDate > toDate) throw new Error('from must be before or equal to to');

    const pool = await getConnection();
    const tx = new sql.Transaction(pool);
    await tx.begin();

    try {
      // Validate level exists and is root (parentId IS NULL)
      const levelRes = await new sql.Request(tx)
        .input('levelId', sql.Int, parseInt(levelId))
        .query('SELECT id, parentId FROM Level WHERE id = @levelId');
      if (levelRes.recordset.length === 0) throw new Error('Level not found');
      if (levelRes.recordset[0].parentId !== null) throw new Error('Only root obras can receive daily planning');

      // Fetch allowed users for the level
      const luRes = await new sql.Request(tx)
        .input('levelId', sql.Int, parseInt(levelId))
        .query('SELECT userId FROM LevelUser WHERE levelId = @levelId');
      const allowedUserIds = new Set(luRes.recordset.map(r => r.userId));

      // Clear existing records in range
      await new sql.Request(tx)
        .input('levelId', sql.Int, parseInt(levelId))
        .input('from', sql.Date, from)
        .input('to', sql.Date, to)
        .query('DELETE FROM LevelUserDay WHERE levelId = @levelId AND [day] BETWEEN @from AND @to');

      // Deduplicate entries
      const uniqueEntries = [];
      const seen = new Set();
      for (const e of entries || []) {
        const userId = parseInt(e.userId);
        const day = e.day;
        const period = e.period || 'm'; // default to morning if not specified
        if (!userId || !day) continue;
        if (!['m', 'a'].includes(period)) continue; // validate period
        if (allowedUserIds.size > 0 && !allowedUserIds.has(userId)) continue;
        const key = `${userId}-${day}-${period}`;
        if (seen.has(key)) continue;
        seen.add(key);
        uniqueEntries.push({ userId, day, period });
      }

      const inserted = [];
      const conflicts = [];
      
      for (const ent of uniqueEntries) {
        // Check if user is already allocated to another obra at this time
        const conflictCheck = await new sql.Request(tx)
          .input('userId', sql.Int, ent.userId)
          .input('day', sql.Date, ent.day)
          .input('period', sql.Char, ent.period)
          .input('levelId', sql.Int, parseInt(levelId))
          .query(`
            SELECT lud.levelId, l.name as obraName
            FROM LevelUserDay lud
            INNER JOIN Level l ON l.id = lud.levelId
            WHERE lud.userId = @userId 
              AND lud.[day] = @day 
              AND lud.period = @period
              AND lud.levelId != @levelId
          `);
        
        if (conflictCheck.recordset.length > 0) {
          const conflict = conflictCheck.recordset[0];
          conflicts.push({
            userId: ent.userId,
            day: ent.day,
            period: ent.period,
            conflictingObra: conflict.obraName
          });
          continue; // Skip this entry
        }
        
        const ins = await new sql.Request(tx)
          .input('levelId', sql.Int, parseInt(levelId))
          .input('userId', sql.Int, ent.userId)
          .input('day', sql.Date, ent.day)
          .input('period', sql.Char, ent.period)
          .query(`
            IF NOT EXISTS (
              SELECT 1 FROM LevelUserDay WHERE levelId = @levelId AND userId = @userId AND [day] = @day AND period = @period
            )
            BEGIN
              INSERT INTO LevelUserDay (levelId, userId, [day], period) OUTPUT INSERTED.* VALUES (@levelId, @userId, @day, @period)
            END
          `);
        if (ins.recordset && ins.recordset[0]) inserted.push(ins.recordset[0]);
      }

      await tx.commit();
      
      if (conflicts.length > 0) {
        const errorMsg = `Conflitos detectados: ${conflicts.length} alocações ignoradas porque os utilizadores já estão noutras obras.`;
        return { inserted, conflicts, error: errorMsg };
      }
      
      return { inserted, conflicts: [] };
    } catch (err) {
      await tx.rollback().catch(() => {});
      throw err;
    }
  }
}

module.exports = new LevelUserDayService();