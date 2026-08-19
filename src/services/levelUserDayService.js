const { getConnection, sql } = require('../config/db');

class LevelUserDayService {
  async getAll(from, to) {
    const pool = await getConnection();
    const req = pool.request();
    if (from) req.input('from', sql.Date, from);
    if (to) req.input('to', sql.Date, to);

    const result = await req.query(`
      SELECT lud.id, lud.levelId, lud.userId, lud.day, lud.period, lud.appeared, lud.observations, lud.overtimeHours,
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
      SELECT lud.id, lud.levelId, lud.userId, lud.day, lud.period, lud.appeared, lud.observations, lud.overtimeHours,
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

      // Clear existing empty records in range
      // Keep any record that already has an attendance, observations or overtimeHours
      await new sql.Request(tx)
        .input('levelId', sql.Int, parseInt(levelId))
        .input('from', sql.Date, from)
        .input('to', sql.Date, to)
        .query(`
          DELETE FROM LevelUserDay
          WHERE levelId = @levelId
            AND [day] BETWEEN @from AND @to
            AND (appeared IS NULL)
            AND (overtimeHours IS NULL OR overtimeHours = 0)
            AND (ISNULL(observations, '') = '')
        `);

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

  async setRangeForLevels(levels = [], from, to) {
    if (!from || !to) throw new Error('from and to are required');

    const fromDate = new Date(from);
    const toDate = new Date(to);
    if (Number.isNaN(fromDate) || Number.isNaN(toDate)) throw new Error('Invalid date format');
    if (fromDate > toDate) throw new Error('from must be before or equal to to');

    const pool = await getConnection();
    const tx = new sql.Transaction(pool);
    await tx.begin();

    try {
      const processedLevels = {};
      const inserted = [];
      const conflicts = [];

      for (const level of levels) {
        const levelId = parseInt(level.levelId, 10);
        if (!levelId || processedLevels[levelId]) continue;

        // Validate level exists and is root (parentId IS NULL)
        const levelRes = await new sql.Request(tx)
          .input('levelId', sql.Int, levelId)
          .query('SELECT id, parentId FROM Level WHERE id = @levelId');
        if (levelRes.recordset.length === 0) {
          throw new Error(`Level ${levelId} not found`);
        }
        if (levelRes.recordset[0].parentId !== null) {
          throw new Error('Only root obras can receive daily planning');
        }

        // Fetch allowed users for the level
        const luRes = await new sql.Request(tx)
          .input('levelId', sql.Int, levelId)
          .query('SELECT userId FROM LevelUser WHERE levelId = @levelId');
        const allowedUserIds = new Set(luRes.recordset.map(r => r.userId));

        // Clear existing empty records in range for this level
        await new sql.Request(tx)
          .input('levelId', sql.Int, levelId)
          .input('from', sql.Date, from)
          .input('to', sql.Date, to)
          .query(`
            DELETE FROM LevelUserDay
            WHERE levelId = @levelId
              AND [day] BETWEEN @from AND @to
              AND (appeared IS NULL)
              AND (overtimeHours IS NULL OR overtimeHours = 0)
              AND (ISNULL(observations, '') = '')
          `);

        processedLevels[levelId] = {
          allowedUserIds,
          entries: []
        };
      }

      const seen = new Set();
      for (const level of levels) {
        const levelId = parseInt(level.levelId, 10);
        if (!levelId || !processedLevels[levelId]) continue;

        for (const e of level.entries || []) {
          const userId = parseInt(e.userId, 10);
          const day = e.day;
          const period = e.period || 'm';
          if (!userId || !day) continue;
          if (!['m', 'a'].includes(period)) continue;
          const allowedUserIds = processedLevels[levelId].allowedUserIds;
          if (allowedUserIds.size > 0 && !allowedUserIds.has(userId)) continue;

          const key = `${levelId}-${userId}-${day}-${period}`;
          if (seen.has(key)) continue;
          seen.add(key);
          processedLevels[levelId].entries.push({ userId, day, period });
        }
      }

      for (const [levelId, info] of Object.entries(processedLevels)) {
        for (const ent of info.entries) {
          const conflictCheck = await new sql.Request(tx)
            .input('userId', sql.Int, ent.userId)
            .input('day', sql.Date, ent.day)
            .input('period', sql.Char, ent.period)
            .input('levelId', sql.Int, parseInt(levelId, 10))
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
            continue;
          }

          const ins = await new sql.Request(tx)
            .input('levelId', sql.Int, parseInt(levelId, 10))
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

  async update(id, appeared, observations, overtimeHours = 0) {
    const pool = await getConnection();
    const tx = new sql.Transaction(pool);
    await tx.begin(sql.ISOLATION_LEVEL.SERIALIZABLE);

    try {
      const result = await new sql.Request(tx)
        .input('id', sql.Int, id)
        .input('appeared', sql.NVarChar(3), appeared)
        .input('observations', sql.NVarChar(sql.MAX), observations)
        .input('overtimeHours', sql.Decimal(5, 2), overtimeHours)
        .query(`
          UPDATE LevelUserDay
          SET appeared = @appeared, observations = @observations, overtimeHours = @overtimeHours
          OUTPUT INSERTED.levelId, INSERTED.userId, INSERTED.[day]
          WHERE id = @id
        `);

      if (result.rowsAffected[0] > 0 && Number(overtimeHours || 0) > 0) {
        const updated = result.recordset[0];
        await new sql.Request(tx)
          .input('id', sql.Int, id)
          .input('levelId', sql.Int, updated.levelId)
          .input('userId', sql.Int, updated.userId)
          .input('day', sql.Date, updated.day)
          .query(`
            UPDATE LevelUserDay
            SET overtimeHours = 0
            WHERE levelId = @levelId
              AND userId = @userId
              AND [day] = @day
              AND id <> @id
          `);
      }

      await tx.commit();
      return result.rowsAffected[0] > 0;
    } catch (error) {
      await tx.rollback().catch(() => {});
      throw error;
    }
  }

  async createSingle({ levelId, userId, day, period, appeared = null, observations = '', overtimeHours = 0 }) {
    const pool = await getConnection();
    const tx = new sql.Transaction(pool);
    await tx.begin(sql.ISOLATION_LEVEL.SERIALIZABLE);

    try {
      const existing = await new sql.Request(tx)
        .input('levelId', sql.Int, levelId)
        .input('userId', sql.Int, userId)
        .input('day', sql.Date, day)
        .input('period', sql.Char, period)
        .query(`
          SELECT id FROM LevelUserDay
          WHERE levelId = @levelId AND userId = @userId AND [day] = @day AND period = @period
        `);

      if (existing.recordset.length > 0) {
        const id = existing.recordset[0].id;
        const updated = await new sql.Request(tx)
          .input('id', sql.Int, id)
          .input('appeared', sql.NVarChar(3), appeared || 'yes')
          .input('observations', sql.NVarChar(sql.MAX), observations)
          .input('overtimeHours', sql.Decimal(5, 2), overtimeHours)
          .query(`
            UPDATE LevelUserDay
            SET appeared = @appeared, observations = @observations, overtimeHours = @overtimeHours
            WHERE id = @id
          `);

        if (updated.rowsAffected[0] > 0 && Number(overtimeHours || 0) > 0) {
          await new sql.Request(tx)
            .input('id', sql.Int, id)
            .input('levelId', sql.Int, levelId)
            .input('userId', sql.Int, userId)
            .input('day', sql.Date, day)
            .query(`
              UPDATE LevelUserDay
              SET overtimeHours = 0
              WHERE levelId = @levelId
                AND userId = @userId
                AND [day] = @day
                AND id <> @id
            `);
        }

        await tx.commit();
        return { id, updated: true };
      }

      const insert = await new sql.Request(tx)
        .input('levelId', sql.Int, levelId)
        .input('userId', sql.Int, userId)
        .input('day', sql.Date, day)
        .input('period', sql.Char, period)
        .input('appeared', sql.NVarChar(3), appeared)
        .input('observations', sql.NVarChar(sql.MAX), observations)
        .input('overtimeHours', sql.Decimal(5, 2), overtimeHours)
        .query(`
          INSERT INTO LevelUserDay (levelId, userId, [day], period, appeared, observations, overtimeHours)
          OUTPUT INSERTED.*
          VALUES (@levelId, @userId, @day, @period, @appeared, @observations, @overtimeHours)
        `);

      if (Number(overtimeHours || 0) > 0) {
        await new sql.Request(tx)
          .input('id', sql.Int, insert.recordset[0].id)
          .input('levelId', sql.Int, levelId)
          .input('userId', sql.Int, userId)
          .input('day', sql.Date, day)
          .query(`
            UPDATE LevelUserDay
            SET overtimeHours = 0
            WHERE levelId = @levelId
              AND userId = @userId
              AND [day] = @day
              AND id <> @id
          `);
      }

      await tx.commit();
      return insert.recordset[0];
    } catch (error) {
      await tx.rollback().catch(() => {});
      throw error;
    }
  }
}

module.exports = new LevelUserDayService();