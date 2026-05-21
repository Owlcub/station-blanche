# Installation Rapide - Serveur Central Station Blanche

Guide d'installation pas à pas pour déployer le serveur central sur Ubuntu 22.04 LTS.

## Prérequis

- Ubuntu 22.04 LTS (VM ou serveur physique)
- 4 GB RAM minimum (8 GB recommandé)
- 50 GB disque
- Accès root ou sudo
- Connexion internet

## Installation Automatique (Recommandé)

```bash
# Télécharger et exécuter le script d'installation
curl -fsSL https://raw.githubusercontent.com/votre-org/station-blanche-server/main/install.sh | sudo bash
```

## Installation Manuelle

### 1. Mise à jour du système

```bash
sudo apt update && sudo apt upgrade -y
```

### 2. Installation des dépendances

```bash
# Node.js 18.x
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# PostgreSQL
sudo apt install -y postgresql postgresql-contrib

# Redis
sudo apt install -y redis-server

# Nginx
sudo apt install -y nginx

# Utilitaires
sudo apt install -y git curl build-essential
```

### 3. Configuration PostgreSQL

```bash
# Créer utilisateur et base
sudo -u postgres createuser stationblanche_server
sudo -u postgres createdb stationblanche_server

# Définir mot de passe (remplacer VOTRE_MOT_DE_PASSE)
sudo -u postgres psql -c "ALTER USER stationblanche_server WITH PASSWORD 'VOTRE_MOT_DE_PASSE';"

# Donner les permissions
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE stationblanche_server TO stationblanche_server;"
```

### 4. Configuration Redis

```bash
# Activer et démarrer Redis
sudo systemctl enable redis-server
sudo systemctl start redis-server

# Vérifier
sudo systemctl status redis-server
```

### 5. Clone du repository

```bash
# Créer répertoire d'installation
sudo mkdir -p /opt/station-blanche-server
sudo chown $USER:$USER /opt/station-blanche-server

# Cloner
cd /opt
git clone https://github.com/votre-org/station-blanche-server.git
cd station-blanche-server
```

### 6. Installation backend

```bash
cd backend

# Installer dépendances
npm install

# Copier configuration exemple
cp .env.example .env

# Éditer configuration
nano .env
```

**Configuration minimale** (`.env`) :
```bash
NODE_ENV=production
PORT=3100
HOST=0.0.0.0

DB_HOST=localhost
DB_PORT=5432
DB_NAME=stationblanche_server
DB_USER=stationblanche_server
DB_PASSWORD=VOTRE_MOT_DE_PASSE

REDIS_URL=redis://localhost:6379

JWT_SECRET=GENEREZ_UNE_CLE_ALEATOIRE_ICI
SESSION_SECRET=GENEREZ_UNE_AUTRE_CLE_ICI
API_KEY_SALT=GENEREZ_ENCORE_UNE_CLE_ICI
```

**Générer des clés aléatoires** :
```bash
# Exécuter 3 fois
openssl rand -base64 32
```

```bash
# Créer répertoire configuration
sudo mkdir -p /etc/station-blanche-server
sudo cp .env /etc/station-blanche-server/
sudo chmod 600 /etc/station-blanche-server/.env

# Exécuter migrations
npm run migrate

# (Optionnel) Charger données de test
npm run seed
```

### 7. Installation frontend

```bash
cd ../frontend

# Installer dépendances
npm install

# Build production
npm run build
```

### 8. Configuration systemd

```bash
# Créer utilisateur système
sudo useradd -r -s /bin/false stationblanche

# Copier service
sudo cp systemd/stationblanche-server.service /etc/systemd/system/

# Éditer si nécessaire
sudo nano /etc/systemd/system/stationblanche-server.service

# Activer et démarrer
sudo systemctl daemon-reload
sudo systemctl enable stationblanche-server
sudo systemctl start stationblanche-server

# Vérifier
sudo systemctl status stationblanche-server
```

### 9. Configuration Nginx

```bash
# Copier configuration
sudo cp nginx/stationblanche-server.conf /etc/nginx/sites-available/

# Éditer (changer server_name)
sudo nano /etc/nginx/sites-available/stationblanche-server.conf

# Créer lien symbolique
sudo ln -s /etc/nginx/sites-available/stationblanche-server.conf /etc/nginx/sites-enabled/

# Tester configuration
sudo nginx -t

# Recharger Nginx
sudo systemctl reload nginx
```

### 10. Certificat SSL

#### Option A : Let's Encrypt (domaine public)

```bash
# Installer certbot
sudo apt install -y certbot python3-certbot-nginx

# Obtenir certificat
sudo certbot --nginx -d votre-domaine.com

# Auto-renouvellement
sudo systemctl enable certbot.timer
```

#### Option B : Certificat auto-signé (domaine local)

```bash
# Générer certificat
sudo mkdir -p /etc/nginx/ssl
sudo openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout /etc/nginx/ssl/stationblanche.key \
  -out /etc/nginx/ssl/stationblanche.crt

# Ajuster permissions
sudo chmod 600 /etc/nginx/ssl/stationblanche.key
sudo chmod 644 /etc/nginx/ssl/stationblanche.crt

# Recharger Nginx
sudo systemctl reload nginx
```

### 11. Firewall

```bash
# Autoriser HTTP/HTTPS
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Autoriser port backend (si accès direct nécessaire)
sudo ufw allow 3100/tcp

# Activer firewall
sudo ufw enable

# Vérifier
sudo ufw status
```

### 12. Première connexion

```bash
# URL : https://votre-serveur.local

# Credentials par défaut :
Username: admin
Password: StationBlanche-Admin-2024
```

⚠️ **CHANGEZ LE MOT DE PASSE IMMÉDIATEMENT** après la première connexion !

### 13. Générer clé API pour première station

```bash
cd /opt/station-blanche-server/backend

# Générer clé
node scripts/generate-api-key.js --name "Station-Test-01"

# Copier la clé API affichée
```

### 14. Configurer première station

Sur la station blanche :

1. Se connecter en admin
2. Aller dans "Serveur Central"
3. Entrer l'URL : `https://votre-serveur.local:3100`
4. Coller la clé API
5. Tester la connexion
6. Enregistrer

## Vérifications Post-Installation

### 1. Vérifier les services

```bash
# PostgreSQL
sudo systemctl status postgresql

# Redis
sudo systemctl status redis-server

# Backend
sudo systemctl status stationblanche-server

# Nginx
sudo systemctl status nginx
```

### 2. Vérifier les logs

```bash
# Backend
sudo journalctl -u stationblanche-server -f

# Nginx access
sudo tail -f /var/log/nginx/stationblanche-server.access.log

# Nginx errors
sudo tail -f /var/log/nginx/stationblanche-server.error.log
```

### 3. Tester l'API

```bash
# Health check
curl -k https://votre-serveur.local/health

# Devrait retourner : {"status":"ok",...}
```

### 4. Vérifier la base de données

```bash
sudo -u postgres psql -d stationblanche_server -c "SELECT COUNT(*) FROM users;"

# Devrait retourner : 1 (utilisateur admin)
```

## Dépannage

### Le serveur ne démarre pas

```bash
# Vérifier les logs
sudo journalctl -u stationblanche-server -n 50

# Vérifier PostgreSQL
sudo systemctl status postgresql

# Vérifier Redis
sudo systemctl status redis-server

# Vérifier configuration
sudo nano /etc/station-blanche-server/.env
```

### Erreur de connexion PostgreSQL

```bash
# Vérifier connexion
sudo -u postgres psql -d stationblanche_server -c "SELECT 1;"

# Réinitialiser mot de passe
sudo -u postgres psql -c "ALTER USER stationblanche_server WITH PASSWORD 'NOUVEAU_MDP';"

# Mettre à jour .env
sudo nano /etc/station-blanche-server/.env
# Changer DB_PASSWORD

# Redémarrer service
sudo systemctl restart stationblanche-server
```

### Nginx 502 Bad Gateway

```bash
# Vérifier que le backend écoute sur 3100
sudo netstat -tulpn | grep 3100

# Vérifier logs backend
sudo journalctl -u stationblanche-server -f

# Redémarrer backend
sudo systemctl restart stationblanche-server
```

### Certificat SSL invalide

```bash
# Régénérer certificat auto-signé
sudo openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout /etc/nginx/ssl/stationblanche.key \
  -out /etc/nginx/ssl/stationblanche.crt

# Recharger Nginx
sudo systemctl reload nginx
```

## Maintenance

### Sauvegarde

```bash
#!/bin/bash
# Script de sauvegarde quotidienne

BACKUP_DIR="/var/backups/stationblanche"
DATE=$(date +%Y%m%d_%H%M%S)

# Créer répertoire
mkdir -p $BACKUP_DIR

# Backup base de données
sudo -u postgres pg_dump stationblanche_server | gzip > $BACKUP_DIR/db_$DATE.sql.gz

# Backup configuration
sudo tar -czf $BACKUP_DIR/config_$DATE.tar.gz /etc/station-blanche-server/

# Nettoyer anciens backups (>30 jours)
find $BACKUP_DIR -type f -mtime +30 -delete
```

### Mise à jour

```bash
cd /opt/station-blanche-server

# Pull dernière version
git pull origin main

# Mettre à jour backend
cd backend
npm install
npm run migrate

# Mettre à jour frontend
cd ../frontend
npm install
npm run build

# Redémarrer service
sudo systemctl restart stationblanche-server
```

### Surveillance

```bash
# Espace disque
df -h

# Utilisation mémoire
free -h

# Processus
ps aux | grep node

# Connexions actives
sudo netstat -an | grep :3100

# Logs temps réel
sudo journalctl -u stationblanche-server -f
```

## Support

- Documentation : https://docs.station-blanche.com
- Issues : https://github.com/votre-org/station-blanche-server/issues
- Email : support@station-blanche.com

## Sécurité

⚠️ **Checklist sécurité post-installation** :

- [ ] Mot de passe admin changé
- [ ] Firewall activé
- [ ] Certificat SSL configuré
- [ ] Sauvegarde automatique configurée
- [ ] Mises à jour système activées
- [ ] Logs de sécurité surveillés
- [ ] Accès SSH restreint (clés uniquement)
- [ ] Fail2ban installé (optionnel)

```bash
# Installer fail2ban
sudo apt install -y fail2ban

# Activer
sudo systemctl enable fail2ban
sudo systemctl start fail2ban
```
