const express = require('express');
const router = express.Router();

router.get('/check', (req, res) => {
  res.json({ update_available: false, message: 'Pas de mise à jour disponible' });
});

router.get('/clamav-signatures', (req, res) => {
  res.json({ signatures: [], last_update: new Date().toISOString() });
});

module.exports = router;
