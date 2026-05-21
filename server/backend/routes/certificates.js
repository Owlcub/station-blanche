const express = require('express');
const router = express.Router();
const db = require('../database');
const { requireApiKey, requireAuth } = require('../middleware/auth');

// Optional auth middleware - accepts either API key or session
const optionalAuth = async (req, res, next) => {
  const apiKey = req.headers['x-api-key'];
  if (apiKey) {
    return requireApiKey(req, res, next);
  }
  // No auth required for dashboard (behind login)
  next();
};

// Sync certificates
router.get('/sync', optionalAuth, async (req, res) => {
  const { station_id, last_sync } = req.query;

  try {
    // Get all active certificates
    const result = await db.query(
      `SELECT * FROM certificates
       WHERE revoked_at IS NULL
       AND expires_at > NOW()
       ${last_sync ? 'AND created_at > $1' : ''}
       ORDER BY created_at DESC`,
      last_sync ? [last_sync] : []
    );

    // Get revoked certificates since last sync
    const revokedResult = last_sync ? await db.query(
      `SELECT certificate_id FROM certificates
       WHERE revoked_at > $1`,
      [last_sync]
    ) : { rows: [] };

    res.json({
      success: true,
      certificates: result.rows,
      revoked: revokedResult.rows.map(r => r.certificate_id)
    });
  } catch (error) {
    console.error('[CERTIFICATES] Erreur sync:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Publish new certificate
router.post('/publish', requireApiKey, async (req, res) => {
  const { station_id, certificate } = req.body;

  try {
    await db.query(
      `INSERT INTO certificates (certificate_id, usb_uuid, usb_serial, usb_label, usb_size, station_id, issued_at, expires_at, signature, scan_summary)
       VALUES ($1, $2, $3, $4, $5, (SELECT id FROM stations WHERE station_id = $6), $7, $8, $9, $10)
       ON CONFLICT (certificate_id) DO NOTHING`,
      [
        certificate.certificate_id,
        certificate.usb_info?.uuid,
        certificate.usb_info?.serial,
        certificate.usb_info?.label,
        certificate.usb_info?.size,
        station_id,
        certificate.issued_at,
        certificate.expiration,
        certificate.signature,
        JSON.stringify(certificate.scan_summary)
      ]
    );

    res.json({ success: true });

    const io = req.app.get('io');
    io.emit('certificate:created', { certificate_id: certificate.certificate_id, station_id });
  } catch (error) {
    console.error('[CERTIFICATES] Erreur publication:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Revoke certificate
router.put('/:id/revoke', async (req, res) => {
  const { id } = req.params;
  const { reason, revoked_by } = req.body;

  try {
    await db.query(
      `UPDATE certificates
       SET revoked_at = NOW(), revoke_reason = $1, revoked_by = $2
       WHERE certificate_id = $3`,
      [reason, revoked_by, id]
    );

    res.json({ success: true });

    const io = req.app.get('io');
    io.emit('certificate:revoked', { certificate_id: id });
  } catch (error) {
    console.error('[CERTIFICATES] Erreur révocation:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

module.exports = router;
