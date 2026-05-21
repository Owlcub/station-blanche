const express = require('express');
const router = express.Router();
const db = require('../database');

router.get('/rules', async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM edr_rules WHERE enabled = true ORDER BY priority DESC');
    res.json({ success: true, rules: result.rows });
  } catch (error) {
    console.error('[EDR] Erreur:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

module.exports = router;
