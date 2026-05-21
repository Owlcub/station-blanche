const express = require('express');
const router = express.Router();
const db = require('../database');
const { requireApiKey } = require('../middleware/auth');

// List alerts
router.get('/', async (req, res) => {
  const { limit = 100 } = req.query;

  try {
    const result = await db.query(
      `SELECT ta.*, s.name as station_name, s.location as station_location
       FROM threat_alerts ta
       LEFT JOIN stations s ON ta.station_id = s.id
       ORDER BY ta.created_at DESC
       LIMIT $1`,
      [limit]
    );

    res.json({ success: true, alerts: result.rows });
  } catch (error) {
    console.error('[ALERTS] Erreur liste:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

router.post('/threat', requireApiKey, async (req, res) => {
  const { station_id, threat, priority } = req.body;

  try {
    await db.query(
      `INSERT INTO threat_alerts (station_id, priority, threat_type, threat_details)
       VALUES ((SELECT id FROM stations WHERE station_id = $1), $2, $3, $4)`,
      [station_id, priority || 'high', threat.type || 'unknown', JSON.stringify(threat)]
    );

    res.json({ success: true });

    const io = req.app.get('io');
    io.emit('threat:detected', { station_id, threat, priority });
  } catch (error) {
    console.error('[ALERTS] Erreur:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

module.exports = router;
