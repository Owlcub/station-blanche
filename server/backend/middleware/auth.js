/**
 * Authentication middleware
 */

const crypto = require('crypto');
const db = require('../database');

/**
 * Require valid API key for stations
 */
async function requireApiKey(req, res, next) {
  const apiKey = req.headers['x-api-key'];

  if (!apiKey) {
    return res.status(401).json({ error: 'API key requise' });
  }

  try {
    // Hash the API key
    const keyHash = hashApiKey(apiKey);

    // Verify in database
    const result = await db.query(
      `SELECT ak.*, s.station_id, s.name as station_name
       FROM api_keys ak
       LEFT JOIN stations s ON ak.station_id = s.id
       WHERE ak.key_hash = $1 AND ak.active = true
       AND (ak.expires_at IS NULL OR ak.expires_at > NOW())`,
      [keyHash]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'API key invalide ou expirée' });
    }

    const apiKeyData = result.rows[0];

    // Update last used
    await db.query(
      'UPDATE api_keys SET last_used = NOW() WHERE id = $1',
      [apiKeyData.id]
    );

    // Attach to request
    req.apiKey = apiKeyData;
    req.stationId = apiKeyData.station_id;

    next();
  } catch (error) {
    console.error('[AUTH] Erreur vérification API key:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
}

/**
 * Require authenticated user (for dashboard)
 */
function requireAuth(req, res, next) {
  if (req.session && req.session.userId) {
    next();
  } else {
    res.status(401).json({ error: 'Non authentifié' });
  }
}

/**
 * Require admin role
 */
function requireAdmin(req, res, next) {
  if (req.session && req.session.role === 'admin') {
    next();
  } else {
    res.status(403).json({ error: 'Accès refusé' });
  }
}

/**
 * Hash API key for storage
 */
function hashApiKey(apiKey) {
  const salt = process.env.API_KEY_SALT || 'stationblanche-server';
  return crypto.createHmac('sha256', salt).update(apiKey).digest('hex');
}

/**
 * Generate new API key
 */
function generateApiKey() {
  const prefix = 'sk_live_';
  const random = crypto.randomBytes(32).toString('hex');
  return prefix + random;
}

module.exports = {
  requireApiKey,
  requireAuth,
  requireAdmin,
  hashApiKey,
  generateApiKey
};
