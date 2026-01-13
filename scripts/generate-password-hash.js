#!/usr/bin/env node
const bcrypt = require('bcrypt');

const password = process.argv[2] || 'CyberBox-Station-Admin';

bcrypt.hash(password, 10, (err, hash) => {
  if (err) {
    console.error('Erreur:', err);
    process.exit(1);
  }
  console.log('Hash généré pour:', password);
  console.log(hash);
});
