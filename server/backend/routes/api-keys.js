const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const db = require('../database');
const { requireAuth } = require('../middleware/auth');

// Generate API key hash
function hashApiKey(key, salt) {
  return crypto.createHmac('sha256', salt)
    .update(key)
    .digest('hex');
}

// Generate random API key
function generateApiKey() {
  const randomBytes = crypto.randomBytes(32);
  const key = randomBytes.toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '')
    .substring(0, 48);
  return `sk_live_${key}`;
}

// List all API keys
router.get('/', requireAuth, async (req, res) => {
  try {
    const result = await db.query(
      `SELECT
        ak.id,
        ak.name,
        ak.key_prefix,
        ak.station_id,
        ak.created_at,
        ak.last_used,
        ak.active,
        s.name as station_name
       FROM api_keys ak
       LEFT JOIN stations s ON ak.station_id = s.id
       ORDER BY ak.created_at DESC`
    );
    res.json({ success: true, keys: result.rows });
  } catch (error) {
    console.error('[API-KEYS] Erreur liste:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Generate new API key
router.post('/generate', requireAuth, async (req, res) => {
  const { name } = req.body;

  if (!name || name.trim().length === 0) {
    return res.status(400).json({ error: 'Le nom est requis' });
  }

  try {
    // Generate API key
    const apiKey = generateApiKey();
    const keyPrefix = apiKey.substring(0, 16);

    // Hash the key
    const salt = process.env.API_KEY_SALT || 'dev_api_key_salt_change_in_production';
    const keyHash = hashApiKey(apiKey, salt);

    // Insert into database
    const result = await db.query(
      `INSERT INTO api_keys (name, key_hash, key_prefix, active)
       VALUES ($1, $2, $3, true)
       RETURNING id, name, key_prefix, created_at, active`,
      [name.trim(), keyHash, keyPrefix]
    );

    res.json({
      success: true,
      key: result.rows[0],
      api_key: apiKey  // Return the plain key ONLY once
    });
  } catch (error) {
    console.error('[API-KEYS] Erreur génération:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Revoke API key
router.delete('/:id', requireAuth, async (req, res) => {
  const { id } = req.params;

  try {
    await db.query(
      `UPDATE api_keys SET active = false WHERE id = $1`,
      [id]
    );
    res.json({ success: true });
  } catch (error) {
    console.error('[API-KEYS] Erreur révocation:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

module.exports = router;
