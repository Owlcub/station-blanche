const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const db = require('../database');

router.post('/login', async (req, res) => {
  const { username, password } = req.body;
  
  try {
    const result = await db.query('SELECT * FROM users WHERE username = $1 AND is_active = true', [username]);
    
    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Identifiants incorrects' });
    }
    
    const user = result.rows[0];
    const valid = await bcrypt.compare(password, user.password_hash);
    
    if (!valid) {
      return res.status(401).json({ error: 'Identifiants incorrects' });
    }
    
    req.session.userId = user.id;
    req.session.username = user.username;
    req.session.role = user.role;
    
    res.json({ success: true, user: { username: user.username, role: user.role } });
  } catch (error) {
    console.error('[AUTH] Erreur:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

router.get('/me', (req, res) => {
  if (req.session && req.session.userId) {
    res.json({
      authenticated: true,
      user: {
        username: req.session.username,
        role: req.session.role
      }
    });
  } else {
    res.status(401).json({ authenticated: false });
  }
});

router.post('/logout', (req, res) => {
  req.session.destroy();
  res.json({ success: true });
});

module.exports = router;
