/**
 * Active Directory Integration Routes
 * Track USB key connections with AD user authentication
 */

const express = require('express');
const router = express.Router();
const db = require('../database');
const { requireAuth } = require('../middleware/auth');

/**
 * GET AD configuration
 */
router.get('/config', requireAuth, async (req, res) => {
  try {
    const result = await db.query(
      `SELECT id, host, port, base_dn, bind_dn, enabled, created_at, updated_at
       FROM ad_config
       ORDER BY id DESC
       LIMIT 1`
    );

    if (result.rows.length === 0) {
      return res.json({ success: true, config: null });
    }

    res.json({ success: true, config: result.rows[0] });
  } catch (error) {
    console.error('[AD] Error fetching config:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

/**
 * POST test AD connection
 */
router.post('/test', requireAuth, async (req, res) => {
  const { host, port, base_dn, bind_dn, bind_password } = req.body;

  if (!host || !port || !base_dn || !bind_dn || !bind_password) {
    return res.status(400).json({ error: 'Tous les champs sont requis' });
  }

  try {
    // In production, use ldapjs library
    // For now, simulate a test
    console.log('[AD] Testing connection:', { host, port, base_dn, bind_dn });

    // Simulate connection test
    // const ldap = require('ldapjs');
    // const client = ldap.createClient({ url: `ldap://${host}:${port}` });
    // await new Promise((resolve, reject) => {
    //   client.bind(bind_dn, bind_password, (err) => {
    //     if (err) reject(err);
    //     else resolve();
    //   });
    // });

    res.json({
      success: true,
      message: 'Connexion AD réussie (simulation en dev)'
    });
  } catch (error) {
    console.error('[AD] Test error:', error);
    res.status(400).json({
      error: 'Échec de connexion AD',
      details: error.message
    });
  }
});

/**
 * PUT save AD configuration
 */
router.put('/config', requireAuth, async (req, res) => {
  const { host, port, base_dn, bind_dn, bind_password, enabled } = req.body;

  if (!host || !port || !base_dn || !bind_dn || !bind_password) {
    return res.status(400).json({ error: 'Tous les champs sont requis' });
  }

  try {
    // Encrypt bind password
    const crypto = require('crypto');
    const key = crypto.createHash('sha256')
      .update(process.env.AD_ENCRYPTION_KEY || 'stationblanche-ad-key-32-char')
      .digest();
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
    let encrypted = cipher.update(bind_password, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    const encryptedPassword = iv.toString('hex') + ':' + encrypted;

    // Check if config exists
    const existing = await db.query('SELECT id FROM ad_config LIMIT 1');

    let result;
    if (existing.rows.length === 0) {
      result = await db.query(
        `INSERT INTO ad_config (host, port, base_dn, bind_dn, bind_password, enabled, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
         RETURNING id, host, port, base_dn, bind_dn, enabled, created_at, updated_at`,
        [host, parseInt(port), base_dn, bind_dn, encryptedPassword, enabled === true]
      );
    } else {
      result = await db.query(
        `UPDATE ad_config
         SET host = $1, port = $2, base_dn = $3, bind_dn = $4, bind_password = $5, enabled = $6, updated_at = NOW()
         WHERE id = $7
         RETURNING id, host, port, base_dn, bind_dn, enabled, created_at, updated_at`,
        [host, parseInt(port), base_dn, bind_dn, encryptedPassword, enabled === true, existing.rows[0].id]
      );
    }

    console.log('[AD] Configuration saved');
    res.json({ success: true, config: result.rows[0] });
  } catch (error) {
    console.error('[AD] Error saving config:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

/**
 * POST log USB connection with AD user
 * Called by stations when a USB key is connected
 */
router.post('/usb-connection', async (req, res) => {
  const { station_id, usb_uuid, usb_serial, username, computer_name, domain } = req.body;

  if (!station_id || !usb_uuid) {
    return res.status(400).json({ error: 'station_id et usb_uuid requis' });
  }

  try {
    await db.query(
      `INSERT INTO usb_connections (station_id, usb_uuid, usb_serial, ad_username, computer_name, ad_domain, connected_at)
       VALUES ((SELECT id FROM stations WHERE station_id = $1), $2, $3, $4, $5, $6, NOW())`,
      [station_id, usb_uuid, usb_serial, username, computer_name, domain]
    );

    console.log('[AD] USB connection logged:', { station_id, usb_uuid, username });
    res.json({ success: true });
  } catch (error) {
    console.error('[AD] Error logging USB connection:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

/**
 * GET USB connection history
 */
router.get('/usb-connections', requireAuth, async (req, res) => {
  const { station_id, usb_uuid, username, limit = 100 } = req.query;

  try {
    let query = `
      SELECT uc.*, s.name as station_name, s.location as station_location
      FROM usb_connections uc
      LEFT JOIN stations s ON uc.station_id = s.id
      WHERE 1=1
    `;
    const params = [];

    if (station_id) {
      params.push(station_id);
      query += ` AND s.station_id = $${params.length}`;
    }

    if (usb_uuid) {
      params.push(usb_uuid);
      query += ` AND uc.usb_uuid = $${params.length}`;
    }

    if (username) {
      params.push(`%${username}%`);
      query += ` AND uc.ad_username ILIKE $${params.length}`;
    }

    params.push(limit);
    query += ` ORDER BY uc.connected_at DESC LIMIT $${params.length}`;

    const result = await db.query(query, params);
    res.json({ success: true, connections: result.rows });
  } catch (error) {
    console.error('[AD] Error fetching connections:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

/**
 * GET USB connection statistics
 */
router.get('/stats', requireAuth, async (req, res) => {
  try {
    const [totalConnections, uniqueUsers, uniqueDevices, recentConnections] = await Promise.all([
      db.query('SELECT COUNT(*) as count FROM usb_connections'),
      db.query('SELECT COUNT(DISTINCT ad_username) as count FROM usb_connections WHERE ad_username IS NOT NULL'),
      db.query('SELECT COUNT(DISTINCT usb_uuid) as count FROM usb_connections'),
      db.query(`SELECT COUNT(*) as count FROM usb_connections WHERE connected_at > NOW() - INTERVAL '7 days'`)
    ]);

    res.json({
      success: true,
      stats: {
        total_connections: parseInt(totalConnections.rows[0].count),
        unique_users: parseInt(uniqueUsers.rows[0].count),
        unique_devices: parseInt(uniqueDevices.rows[0].count),
        recent_connections: parseInt(recentConnections.rows[0].count)
      }
    });
  } catch (error) {
    console.error('[AD] Error fetching stats:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

module.exports = router;
