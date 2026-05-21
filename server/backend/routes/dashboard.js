const express = require('express');
const router = express.Router();
const db = require('../database');

router.get('/stats', async (req, res) => {
  try {
    const stationsCount = await db.query('SELECT COUNT(*) FROM stations');
    const certificatesCount = await db.query('SELECT COUNT(*) FROM certificates WHERE revoked_at IS NULL');
    const scansCount = await db.query('SELECT COUNT(*) FROM scan_logs WHERE created_at > NOW() - INTERVAL \'7 days\'');
    const threatsCount = await db.query('SELECT COUNT(*) FROM threat_alerts WHERE acknowledged = false');
    
    res.json({
      success: true,
      stats: {
        stations: parseInt(stationsCount.rows[0].count),
        certificates: parseInt(certificatesCount.rows[0].count),
        scans_7d: parseInt(scansCount.rows[0].count),
        active_threats: parseInt(threatsCount.rows[0].count)
      }
    });
  } catch (error) {
    console.error('[DASHBOARD] Erreur:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

module.exports = router;
