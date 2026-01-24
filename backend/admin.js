const express = require('express');
const { exec } = require('child_process');
const bcrypt = require('bcrypt');
const fs = require('fs').promises;
const path = require('path');

const router = express.Router();

// Credentials admin par défaut
// Username: admin-station
// Password: CyberBox-Station-Admin
// Hash généré avec bcrypt rounds=10
const ADMIN_USERNAME = 'admin-station';
const ADMIN_PASSWORD_HASH = '$2b$10$P4QaFkKDz2cWOX2mMojK3eLzUwrbTEWwiRNeZcBnwsjQ6hESDTbAC';
const PASSWORD_FILE = '/var/lib/cyberbox-station/admin_password.hash';

// Middleware pour vérifier l'authentification
function requireAuth(req, res, next) {
  if (req.session && req.session.authenticated) {
    next();
  } else {
    res.status(401).json({ error: 'Non authentifié' });
  }
}

// Charger le mot de passe depuis le fichier (ou utiliser le défaut)
async function getPasswordHash() {
  try {
    const hash = await fs.readFile(PASSWORD_FILE, 'utf8');
    return hash.trim();
  } catch (error) {
    // Si le fichier n'existe pas, utiliser le hash par défaut
    return ADMIN_PASSWORD_HASH;
  }
}

// Login
router.post('/login', async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'Nom d\'utilisateur et mot de passe requis' });
  }

  // Vérifier le username
  if (username !== ADMIN_USERNAME) {
    return res.status(401).json({ error: 'Identifiants incorrects' });
  }

  try {
    const passwordHash = await getPasswordHash();
    const match = await bcrypt.compare(password, passwordHash);

    if (match) {
      req.session.authenticated = true;
      req.session.username = username;
      res.json({
        success: true,
        message: 'Authentification réussie',
        username: username
      });
    } else {
      res.status(401).json({ error: 'Identifiants incorrects' });
    }
  } catch (error) {
    console.error('Erreur authentification:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Logout
router.post('/logout', (req, res) => {
  req.session.destroy();
  res.json({ success: true });
});

// Vérifier l'état d'authentification
router.get('/status', (req, res) => {
  res.json({
    authenticated: req.session && req.session.authenticated === true
  });
});

// Obtenir les logs du backend
router.get('/logs/backend', requireAuth, (req, res) => {
  exec('journalctl -u station-blanche-backend -n 100 --no-pager', (error, stdout, stderr) => {
    if (error) {
      return res.status(500).json({ error: 'Impossible de récupérer les logs' });
    }
    res.json({ logs: stdout });
  });
});

// Obtenir les logs du frontend
router.get('/logs/frontend', requireAuth, (req, res) => {
  exec('journalctl -u station-blanche-frontend -n 100 --no-pager', (error, stdout, stderr) => {
    if (error) {
      return res.status(500).json({ error: 'Impossible de récupérer les logs' });
    }
    res.json({ logs: stdout });
  });
});

// Obtenir les statistiques système
router.get('/stats', requireAuth, (req, res) => {
  const commands = {
    uptime: "uptime -p",
    memory: "free -h | grep Mem | awk '{print $3\"/\"$2}'",
    disk: "df -h / | tail -1 | awk '{print $3\"/\"$2\" (\"$5\")'",
    cpu: "top -bn1 | grep 'Cpu(s)' | awk '{print $2}'",
  };

  const stats = {};
  let completed = 0;

  Object.keys(commands).forEach(key => {
    exec(commands[key], (error, stdout, stderr) => {
      if (!error) {
        stats[key] = stdout.trim();
      } else {
        stats[key] = 'N/A';
      }
      completed++;

      if (completed === Object.keys(commands).length) {
        res.json(stats);
      }
    });
  });
});

// Mettre à jour depuis Git
router.post('/update', requireAuth, (req, res) => {
  // Détecter le chemin du projet dynamiquement
  const projectDir = process.env.PROJECT_DIR || path.resolve(__dirname, '..');
  const scriptPath = path.join(projectDir, 'scripts', 'fix-station-blanche.sh');

  // Vérifier si le script existe
  if (!require('fs').existsSync(scriptPath)) {
    return res.status(500).json({
      error: 'Script de mise à jour introuvable',
      details: `Le fichier ${scriptPath} n'existe pas`
    });
  }

  // Répondre immédiatement à l'utilisateur
  res.json({
    success: true,
    message: 'Mise à jour lancée. Les services vont redémarrer dans quelques secondes...',
    rebooting: false
  });

  // Lancer le script de mise à jour en arrière-plan
  setTimeout(() => {
    exec(`sudo bash ${scriptPath}`, (error, stdout, stderr) => {
      if (error) {
        console.error('Erreur lors de la mise à jour:', error);
        console.error('STDERR:', stderr);
      } else {
        console.log('Mise à jour réussie:', stdout);
      }
    });
  }, 1000);
});

// Redémarrer le backend
router.post('/restart/backend', requireAuth, (req, res) => {
  exec('systemctl restart station-blanche-backend', (error, stdout, stderr) => {
    if (error) {
      return res.status(500).json({ error: 'Impossible de redémarrer le backend' });
    }
    res.json({ success: true, message: 'Backend redémarré' });
  });
});

// Redémarrer le frontend
router.post('/restart/frontend', requireAuth, (req, res) => {
  exec('systemctl restart station-blanche-frontend', (error, stdout, stderr) => {
    if (error) {
      return res.status(500).json({ error: 'Impossible de redémarrer le frontend' });
    }
    res.json({ success: true, message: 'Frontend redémarré' });
  });
});

// Redémarrer les deux services
router.post('/restart/all', requireAuth, (req, res) => {
  exec('systemctl restart station-blanche-backend station-blanche-frontend', (error, stdout, stderr) => {
    if (error) {
      return res.status(500).json({ error: 'Impossible de redémarrer les services' });
    }
    res.json({ success: true, message: 'Tous les services redémarrés' });
  });
});

// Redémarrer la station complète (reboot système)
router.post('/reboot', requireAuth, (req, res) => {
  // Réponse immédiate avant le reboot
  res.json({
    success: true,
    message: 'La station va redémarrer dans 5 secondes...'
  });

  // Programmer le redémarrage dans 5 secondes
  setTimeout(() => {
    exec('systemctl reboot || /sbin/reboot || reboot', (error) => {
      if (error) {
        console.error('Erreur redémarrage système:', error);
      }
    });
  }, 5000);
});

// Changer le mot de passe admin
router.post('/change-password', requireAuth, async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword) {
    return res.status(400).json({ error: 'Mots de passe requis' });
  }

  if (newPassword.length < 8) {
    return res.status(400).json({ error: 'Le mot de passe doit faire au moins 8 caractères' });
  }

  try {
    // Vérifier le mot de passe actuel
    const passwordHash = await getPasswordHash();
    const match = await bcrypt.compare(currentPassword, passwordHash);

    if (!match) {
      return res.status(401).json({ error: 'Mot de passe actuel incorrect' });
    }

    // Hasher le nouveau mot de passe
    const newHash = await bcrypt.hash(newPassword, 10);

    // Sauvegarder dans le fichier
    await fs.writeFile(PASSWORD_FILE, newHash, 'utf8');

    res.json({
      success: true,
      message: 'Mot de passe changé avec succès'
    });
  } catch (error) {
    console.error('Erreur changement mot de passe:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

module.exports = router;
