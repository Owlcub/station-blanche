/**
 * SMTP Configuration Routes
 * Manage email configuration for alerts
 */

const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const db = require('../database');
const { requireAuth } = require('../middleware/auth');

// Encryption key for SMTP password (should be in env)
const ENCRYPTION_KEY = process.env.SMTP_ENCRYPTION_KEY || 'stationblanche-smtp-key-32-char';
const ENCRYPTION_IV_LENGTH = 16;

/**
 * Encrypt password
 */
function encryptPassword(password) {
  // Ensure key is 32 bytes
  const key = crypto.createHash('sha256').update(ENCRYPTION_KEY).digest();
  const iv = crypto.randomBytes(ENCRYPTION_IV_LENGTH);
  const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);

  let encrypted = cipher.update(password, 'utf8', 'hex');
  encrypted += cipher.final('hex');

  return iv.toString('hex') + ':' + encrypted;
}

/**
 * Decrypt password
 */
function decryptPassword(encryptedPassword) {
  try {
    const key = crypto.createHash('sha256').update(ENCRYPTION_KEY).digest();
    const parts = encryptedPassword.split(':');
    const iv = Buffer.from(parts[0], 'hex');
    const encrypted = parts[1];

    const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  } catch (error) {
    console.error('[SMTP] Error decrypting password:', error);
    throw error;
  }
}

/**
 * GET current SMTP configuration
 */
router.get('/', requireAuth, async (req, res) => {
  try {
    const result = await db.query(
      `SELECT id, host, port, secure, smtp_user, from_email, from_name, created_at, updated_at
       FROM smtp_config
       ORDER BY id DESC
       LIMIT 1`
    );

    if (result.rows.length === 0) {
      return res.json({ success: true, config: null });
    }

    const config = result.rows[0];
    // Don't send password to client
    res.json({ success: true, config });
  } catch (error) {
    console.error('[SMTP] Error fetching config:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

/**
 * POST test SMTP connection
 */
router.post('/test', requireAuth, async (req, res) => {
  const { host, port, secure, user, password, from_email, from_name } = req.body;

  // Validation
  if (!host || !port || !user || !password || !from_email) {
    return res.status(400).json({ error: 'Tous les champs sont requis' });
  }

  try {
    // Create transporter
    const transporter = nodemailer.createTransport({
      host,
      port: parseInt(port),
      secure: secure === true || secure === 'true',
      auth: {
        user,
        pass: password
      },
      tls: {
        rejectUnauthorized: false // Allow self-signed certificates
      }
    });

    // Verify connection
    await transporter.verify();

    // Send test email
    const info = await transporter.sendMail({
      from: `"${from_name || 'Station Blanche'}" <${from_email}>`,
      to: from_email, // Send to the same address
      subject: 'Test de configuration SMTP - Station Blanche',
      text: 'Ceci est un email de test. Votre configuration SMTP fonctionne correctement.',
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px;">
          <h2 style="color: #10b981;">Configuration SMTP validée</h2>
          <p>Ceci est un email de test automatique.</p>
          <p>Votre configuration SMTP fonctionne correctement et peut envoyer des alertes.</p>
          <hr style="margin: 20px 0; border: none; border-top: 1px solid #e5e7eb;">
          <p style="color: #6b7280; font-size: 12px;">Station Blanche - Serveur Central</p>
        </div>
      `
    });

    console.log('[SMTP] Test email sent:', info.messageId);
    res.json({
      success: true,
      message: 'Email de test envoyé avec succès',
      messageId: info.messageId
    });
  } catch (error) {
    console.error('[SMTP] Test error:', error);
    res.status(400).json({
      error: 'Échec du test SMTP',
      details: error.message
    });
  }
});

/**
 * PUT save SMTP configuration
 */
router.put('/', requireAuth, async (req, res) => {
  const { host, port, secure, user, password, from_email, from_name } = req.body;

  // Validation
  if (!host || !port || !user || !password || !from_email) {
    return res.status(400).json({ error: 'Tous les champs sont requis' });
  }

  try {
    // Encrypt password
    const encryptedPassword = encryptPassword(password);

    // Check if config exists
    const existing = await db.query('SELECT id FROM smtp_config LIMIT 1');

    let result;
    if (existing.rows.length === 0) {
      // Insert new config
      result = await db.query(
        `INSERT INTO smtp_config (host, port, secure, smtp_user, smtp_password, from_email, from_name, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
         RETURNING id, host, port, secure, smtp_user, from_email, from_name, created_at, updated_at`,
        [host, parseInt(port), secure === true || secure === 'true', user, encryptedPassword, from_email, from_name || 'Station Blanche']
      );
    } else {
      // Update existing config
      result = await db.query(
        `UPDATE smtp_config
         SET host = $1, port = $2, secure = $3, smtp_user = $4, smtp_password = $5,
             from_email = $6, from_name = $7, updated_at = NOW()
         WHERE id = $8
         RETURNING id, host, port, secure, smtp_user, from_email, from_name, created_at, updated_at`,
        [host, parseInt(port), secure === true || secure === 'true', user, encryptedPassword, from_email, from_name || 'Station Blanche', existing.rows[0].id]
      );
    }

    console.log('[SMTP] Configuration saved');
    res.json({ success: true, config: result.rows[0] });
  } catch (error) {
    console.error('[SMTP] Error saving config:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

/**
 * Helper to get SMTP transporter for sending alerts
 */
async function getSMTPTransporter() {
  try {
    const result = await db.query(
      `SELECT host, port, secure, smtp_user, smtp_password, from_email, from_name
       FROM smtp_config
       ORDER BY id DESC
       LIMIT 1`
    );

    if (result.rows.length === 0) {
      return null;
    }

    const config = result.rows[0];
    const password = decryptPassword(config.smtp_password);

    return nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: config.secure,
      auth: {
        user: config.smtp_user,
        pass: password
      },
      tls: {
        rejectUnauthorized: false
      }
    });
  } catch (error) {
    console.error('[SMTP] Error creating transporter:', error);
    return null;
  }
}

module.exports = router;
module.exports.getSMTPTransporter = getSMTPTransporter;
