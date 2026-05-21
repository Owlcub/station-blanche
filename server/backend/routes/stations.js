/**
 * Routes pour la gestion des stations
 */

const express = require('express');
const router = express.Router();
const db = require('../database');
const { requireApiKey } = require('../middleware/auth');

// Register a new station
router.post('/register', requireApiKey, async (req, res) => {
  const { station_id, name, location, version } = req.body;

  if (!station_id || !name) {
    return res.status(400).json({ error: 'station_id et name requis' });
  }

  try {
    // Check if station already exists
    const existing = await db.query(
      'SELECT id FROM stations WHERE station_id = $1',
      [station_id]
    );

    if (existing.rows.length > 0) {
      // Update existing station
      await db.query(
        `UPDATE stations
         SET name = $1, location = $2, version = $3, status = 'online', last_heartbeat = NOW(), updated_at = NOW()
         WHERE station_id = $4`,
        [name, location, version, station_id]
      );

      console.log(`[STATIONS] Station mise à jour: ${station_id} (${name})`);
    } else {
      // Insert new station
      await db.query(
        `INSERT INTO stations (station_id, name, location, version, status, last_heartbeat)
         VALUES ($1, $2, $3, $4, 'online', NOW())`,
        [station_id, name, location, version]
      );

      console.log(`[STATIONS] Nouvelle station enregistrée: ${station_id} (${name})`);
    }

    res.json({
      success: true,
      station_id,
      message: 'Station enregistrée avec succès'
    });

    // Broadcast event
    const io = req.app.get('io');
    io.emit('station:registered', { station_id, name, location });

  } catch (error) {
    console.error('[STATIONS] Erreur enregistrement:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Heartbeat
router.post('/heartbeat', requireApiKey, async (req, res) => {
  const { station_id, status } = req.body;

  if (!station_id) {
    return res.status(400).json({ error: 'station_id requis' });
  }

  try {
    await db.query(
      `UPDATE stations
       SET status = $1, last_heartbeat = NOW(), updated_at = NOW()
       WHERE station_id = $2`,
      [status || 'online', station_id]
    );

    res.json({ success: true });

    // Broadcast event
    const io = req.app.get('io');
    io.emit('station:heartbeat', { station_id, status });

  } catch (error) {
    console.error('[STATIONS] Erreur heartbeat:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// List all stations
router.get('/', async (req, res) => {
  try {
    const result = await db.query(
      `SELECT id, station_id, name, location, version, status, last_heartbeat, created_at
       FROM stations
       ORDER BY name ASC`
    );

    res.json({
      success: true,
      stations: result.rows
    });
  } catch (error) {
    console.error('[STATIONS] Erreur liste:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Get single station
router.get('/:station_id', async (req, res) => {
  const { station_id } = req.params;

  try {
    const result = await db.query(
      `SELECT * FROM stations WHERE station_id = $1`,
      [station_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Station non trouvée' });
    }

    res.json({
      success: true,
      station: result.rows[0]
    });
  } catch (error) {
    console.error('[STATIONS] Erreur détail:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Disconnect station (from server or station side)
router.post('/:station_id/disconnect', async (req, res) => {
  const { station_id } = req.params;

  try {
    // Update station status to disconnected
    await db.query(
      `UPDATE stations
       SET status = 'disconnected', updated_at = NOW()
       WHERE station_id = $1`,
      [station_id]
    );

    res.json({
      success: true,
      message: 'Station déconnectée - mode autonome activé'
    });

    // Broadcast event
    const io = req.app.get('io');
    io.emit('station:disconnected', { station_id });

    console.log(`[STATIONS] Station déconnectée: ${station_id}`);

  } catch (error) {
    console.error('[STATIONS] Erreur déconnexion:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Delete station
router.delete('/:station_id', async (req, res) => {
  const { station_id } = req.params;

  try {
    await db.query(
      'DELETE FROM stations WHERE station_id = $1',
      [station_id]
    );

    res.json({
      success: true,
      message: 'Station supprimée'
    });

    // Broadcast event
    const io = req.app.get('io');
    io.emit('station:deleted', { station_id });

  } catch (error) {
    console.error('[STATIONS] Erreur suppression:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

module.exports = router;
