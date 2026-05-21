const express = require('express');
const router = express.Router();
const db = require('../database');
const { requireApiKey } = require('../middleware/auth');

// Report scan result
router.post('/scan', requireApiKey, async (req, res) => {
  const { station_id, scan_result } = req.body;

  try {
    const result = await db.query(
      `INSERT INTO scan_logs (station_id, device, mount_point, usb_uuid, scan_duration_ms, total_files, infected_files, clamav_clean, ransomware_detected, entropy_status, scan_result)
       VALUES ((SELECT id FROM stations WHERE station_id = $1), $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       RETURNING id`,
      [
        station_id,
        scan_result.device,
        scan_result.mount_point,
        scan_result.usb_info?.uuid,
        scan_result.scan_duration_ms,
        scan_result.total_files,
        scan_result.infected_files?.length || 0,
        scan_result.infected_files?.length === 0,
        scan_result.ransomware_analysis?.ransomware_detected || false,
        scan_result.entropy_analysis?.status || 'normal',
        JSON.stringify(scan_result)
      ]
    );

    res.json({ success: true, log_id: result.rows[0].id });

    const io = req.app.get('io');
    io.emit('scan:completed', { station_id, scan_result });
  } catch (error) {
    console.error('[LOGS] Erreur report scan:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Get scan logs
router.get('/scan', async (req, res) => {
  const { station_id, limit = 100 } = req.query;

  try {
    const result = await db.query(
      `SELECT sl.*, s.name as station_name, s.location as station_location
       FROM scan_logs sl
       JOIN stations s ON sl.station_id = s.id
       ${station_id ? 'WHERE s.station_id = $1' : ''}
       ORDER BY sl.created_at DESC
       LIMIT $${station_id ? '2' : '1'}`,
      station_id ? [station_id, limit] : [limit]
    );

    res.json({ success: true, logs: result.rows });
  } catch (error) {
    console.error('[LOGS] Erreur liste logs:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

module.exports = router;
