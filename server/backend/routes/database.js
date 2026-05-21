/**
 * Database Management Routes
 * Read-only database viewer and limited admin tools
 */

const express = require('express');
const router = express.Router();
const db = require('../database');
const { requireAuth } = require('../middleware/auth');

/**
 * GET list of all tables
 */
router.get('/tables', requireAuth, async (req, res) => {
  try {
    const result = await db.query(`
      SELECT
        table_name,
        (SELECT COUNT(*)
         FROM information_schema.columns c
         WHERE c.table_name = t.table_name
           AND c.table_schema = 'public') as column_count
      FROM information_schema.tables t
      WHERE table_schema = 'public'
        AND table_type = 'BASE TABLE'
      ORDER BY table_name
    `);

    // Get row counts for each table
    const tables = await Promise.all(result.rows.map(async (table) => {
      try {
        const countResult = await db.query(`SELECT COUNT(*) as count FROM "${table.table_name}"`);
        return {
          name: table.table_name,
          column_count: parseInt(table.column_count),
          row_count: parseInt(countResult.rows[0].count)
        };
      } catch (error) {
        return {
          name: table.table_name,
          column_count: parseInt(table.column_count),
          row_count: 0
        };
      }
    }));

    res.json({ success: true, tables });
  } catch (error) {
    console.error('[DATABASE] Error listing tables:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

/**
 * GET table structure and data
 */
router.get('/tables/:tableName', requireAuth, async (req, res) => {
  const { tableName } = req.params;
  const { limit = 100, offset = 0 } = req.query;

  // Validate table name (prevent SQL injection)
  if (!/^[a-zA-Z0-9_]+$/.test(tableName)) {
    return res.status(400).json({ error: 'Nom de table invalide' });
  }

  try {
    // Get table structure
    const structureResult = await db.query(`
      SELECT
        column_name,
        data_type,
        is_nullable,
        column_default
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = $1
      ORDER BY ordinal_position
    `, [tableName]);

    if (structureResult.rows.length === 0) {
      return res.status(404).json({ error: 'Table non trouvée' });
    }

    // Get total count
    const countResult = await db.query(`SELECT COUNT(*) as count FROM "${tableName}"`);
    const totalRows = parseInt(countResult.rows[0].count);

    // Get data with pagination
    const dataResult = await db.query(
      `SELECT * FROM "${tableName}" ORDER BY 1 DESC LIMIT $1 OFFSET $2`,
      [parseInt(limit), parseInt(offset)]
    );

    res.json({
      success: true,
      table: {
        name: tableName,
        columns: structureResult.rows,
        total_rows: totalRows,
        rows: dataResult.rows
      }
    });
  } catch (error) {
    console.error('[DATABASE] Error fetching table:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

/**
 * POST execute a read-only query
 */
router.post('/query', requireAuth, async (req, res) => {
  const { query } = req.body;

  if (!query || typeof query !== 'string') {
    return res.status(400).json({ error: 'Requête invalide' });
  }

  // Validate that it's a SELECT query only
  const trimmedQuery = query.trim().toUpperCase();
  if (!trimmedQuery.startsWith('SELECT')) {
    return res.status(400).json({ error: 'Seules les requêtes SELECT sont autorisées' });
  }

  // Additional security checks
  const dangerousKeywords = ['DROP', 'DELETE', 'UPDATE', 'INSERT', 'ALTER', 'CREATE', 'TRUNCATE', 'GRANT', 'REVOKE'];
  for (const keyword of dangerousKeywords) {
    if (trimmedQuery.includes(keyword)) {
      return res.status(400).json({ error: `Mot-clé non autorisé: ${keyword}` });
    }
  }

  try {
    const result = await db.query(query);

    res.json({
      success: true,
      rows: result.rows,
      rowCount: result.rowCount,
      fields: result.fields ? result.fields.map(f => ({
        name: f.name,
        dataTypeID: f.dataTypeID
      })) : []
    });
  } catch (error) {
    console.error('[DATABASE] Query error:', error);
    res.status(400).json({
      error: 'Erreur de requête',
      details: error.message
    });
  }
});

/**
 * PUT update a row
 */
router.put('/tables/:tableName/:id', requireAuth, async (req, res) => {
  const { tableName, id } = req.params;
  const updates = req.body;

  // Validate table name
  if (!/^[a-zA-Z0-9_]+$/.test(tableName)) {
    return res.status(400).json({ error: 'Nom de table invalide' });
  }

  // Check if updates object is valid
  if (!updates || typeof updates !== 'object' || Object.keys(updates).length === 0) {
    return res.status(400).json({ error: 'Aucune mise à jour fournie' });
  }

  try {
    // Build SET clause
    const setClause = Object.keys(updates)
      .map((key, index) => `"${key}" = $${index + 2}`)
      .join(', ');

    const values = [id, ...Object.values(updates)];

    // Execute update
    const result = await db.query(
      `UPDATE "${tableName}" SET ${setClause} WHERE id = $1 RETURNING *`,
      values
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Enregistrement non trouvé' });
    }

    res.json({ success: true, row: result.rows[0] });
  } catch (error) {
    console.error('[DATABASE] Update error:', error);
    res.status(500).json({
      error: 'Erreur de mise à jour',
      details: error.message
    });
  }
});

/**
 * DELETE a row
 */
router.delete('/tables/:tableName/:id', requireAuth, async (req, res) => {
  const { tableName, id } = req.params;

  // Validate table name
  if (!/^[a-zA-Z0-9_]+$/.test(tableName)) {
    return res.status(400).json({ error: 'Nom de table invalide' });
  }

  // Protect critical tables
  const protectedTables = ['users', 'stations'];
  if (protectedTables.includes(tableName.toLowerCase())) {
    return res.status(403).json({ error: 'Cette table est protégée contre la suppression' });
  }

  try {
    const result = await db.query(
      `DELETE FROM "${tableName}" WHERE id = $1 RETURNING *`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Enregistrement non trouvé' });
    }

    res.json({ success: true });
  } catch (error) {
    console.error('[DATABASE] Delete error:', error);
    res.status(500).json({
      error: 'Erreur de suppression',
      details: error.message
    });
  }
});

module.exports = router;
