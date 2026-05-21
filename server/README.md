# Station Blanche - Serveur Central

Application serveur centrale pour la gestion d'un réseau de stations blanches en entreprise.

## Vue d'ensemble

Le serveur central permet de :
- **Gérer un réseau de stations** : supervision de toutes les stations connectées
- **Centraliser les certificats USB** : émission, révocation, synchronisation
- **Distribuer les mises à jour** : signatures ClamAV, règles EDR, mises à jour logicielles
- **Agréger les logs** : tous les scans et menaces détectées
- **Intégrer Active Directory** : SSO, GPO, gestion des droits

## Architecture

```
┌─────────────────────────────────────┐
│     SERVEUR CENTRAL (VM)            │
│                                     │
│  Backend (Node.js/Express)          │
│  - API REST                         │
│  - WebSocket (temps-réel)           │
│  - Base PostgreSQL                  │
│  - Redis (cache/sessions)           │
│                                     │
│  Frontend (React)                   │
│  - Dashboard multi-stations         │
│  - Gestion certificats              │
│  - Logs et alertes                  │
│  - Configuration AD                 │
└─────────────┬───────────────────────┘
              │
       ┌──────┴──────┬─────────────┐
       │             │             │
   Station 1     Station 2     Station N
   (Agent)       (Agent)       (Agent)
```

## Prérequis

### Matériel (VM recommandée)

| Composant | Minimum | Recommandé |
|-----------|---------|------------|
| **CPU** | 2 vCPU | 4 vCPU |
| **RAM** | 4 GB | 8 GB |
| **Disque** | 50 GB SSD | 200 GB SSD |
| **Réseau** | 100 Mbps | 1 Gbps |
| **OS** | Ubuntu 22.04 LTS | Ubuntu 22.04 LTS |

### Logiciels

- Node.js 18+
- PostgreSQL 14+
- Redis 6+
- Nginx (reverse proxy)

## Installation

### 1. Installation des dépendances système

```bash
sudo apt update
sudo apt install -y nodejs npm postgresql postgresql-contrib redis-server nginx certbot python3-certbot-nginx
```

### 2. Configuration PostgreSQL

```bash
# Créer utilisateur et base de données
sudo -u postgres createuser stationblanche_server
sudo -u postgres createdb stationblanche_server
sudo -u postgres psql -c "ALTER USER stationblanche_server WITH PASSWORD 'CHANGEME';"
sudo -u postgres psql -d stationblanche_server -c "GRANT ALL PRIVILEGES ON DATABASE stationblanche_server TO stationblanche_server;"

# Initialiser le schéma
sudo -u postgres psql -d stationblanche_server -f backend/database/schema.sql
```

### 3. Configuration application

```bash
# Copier le fichier d'exemple
cp backend/.env.example backend/.env

# Éditer la configuration
nano backend/.env
```

Fichier `.env` :
```bash
# Serveur
NODE_ENV=production
PORT=3100
HOST=0.0.0.0

# Base de données
DB_HOST=localhost
DB_PORT=5432
DB_NAME=stationblanche_server
DB_USER=stationblanche_server
DB_PASSWORD=CHANGEME

# Redis
REDIS_URL=redis://localhost:6379

# Sécurité
JWT_SECRET=GENERATE_RANDOM_STRING_HERE
SESSION_SECRET=GENERATE_RANDOM_STRING_HERE
API_KEY_SALT=GENERATE_RANDOM_STRING_HERE

# Active Directory (optionnel)
AD_ENABLED=false
AD_DOMAIN=ENTREPRISE.LOCAL
AD_LDAP_URL=ldap://dc.entreprise.local:389
AD_BIND_DN=CN=ServiceAccount,OU=Service,DC=entreprise,DC=local
AD_BIND_PASSWORD=CHANGEME

# Email (alertes)
SMTP_HOST=smtp.entreprise.local
SMTP_PORT=587
SMTP_USER=alerts@entreprise.local
SMTP_PASSWORD=CHANGEME
SMTP_FROM=Station Blanche <alerts@entreprise.local>
```

### 4. Installation backend

```bash
cd backend
npm install
npm run migrate   # Run database migrations
npm run seed      # (Optional) Load sample data
```

### 5. Installation frontend

```bash
cd ../frontend
npm install
npm run build
```

### 6. Configuration systemd

```bash
# Backend service
sudo cp systemd/stationblanche-server.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable stationblanche-server
sudo systemctl start stationblanche-server

# Vérifier le statut
sudo systemctl status stationblanche-server
```

### 7. Configuration Nginx

```bash
# Copier la configuration
sudo cp nginx/stationblanche-server.conf /etc/nginx/sites-available/
sudo ln -s /etc/nginx/sites-available/stationblanche-server.conf /etc/nginx/sites-enabled/

# Tester la configuration
sudo nginx -t

# Recharger Nginx
sudo systemctl reload nginx
```

### 8. Certificat SSL

```bash
# Avec Let's Encrypt (domaine public)
sudo certbot --nginx -d stationblanche.entreprise.com

# OU avec certificat interne (domaine local)
# Placer les fichiers dans /etc/nginx/ssl/ et ajuster nginx.conf
```

## Démarrage

```bash
# Backend
sudo systemctl start stationblanche-server

# Vérifier les logs
journalctl -u stationblanche-server -f
```

## Accès

- **Dashboard** : https://stationblanche.entreprise.local
- **API** : https://stationblanche.entreprise.local/api/v1
- **Credentials par défaut** :
  - Username: `admin`
  - Password: `StationBlanche-Admin-2024`
  - ⚠️ **CHANGEZ LE MOT DE PASSE** après la première connexion

## Configuration des stations clientes

Sur chaque station blanche, configurer la connexion au serveur :

### Via l'interface web

1. Se connecter en tant qu'admin
2. Aller dans "Serveur Central"
3. Entrer l'URL : `https://stationblanche.entreprise.local:3100`
4. Entrer la clé API (générée dans le dashboard serveur)
5. Tester la connexion
6. Enregistrer

### Via ligne de commande

```bash
# Sur la station cliente
sudo nano /etc/station-blanche/server-config.json
```

```json
{
  "enabled": true,
  "url": "https://stationblanche.entreprise.local:3100",
  "api_key": "sk_live_xxxxxxxxxxxxx",
  "station_name": "Station-Accueil-Bat-A",
  "station_location": "Bâtiment A - Hall d'accueil",
  "sync_interval": 300000
}
```

```bash
# Redémarrer les services
sudo systemctl restart station-blanche-backend
```

## Génération de clés API pour les stations

```bash
# Depuis le serveur
cd backend
node scripts/generate-api-key.js --name "Station-Accueil-01"
```

Ou depuis le dashboard web : Configuration > Stations > Ajouter une station

## Fonctionnalités

### Dashboard principal

- Vue d'ensemble temps-réel de toutes les stations
- Graphiques d'activité (scans, menaces, certifications)
- Carte géographique des stations (optionnel)
- Alertes actives

### Gestion des stations

- Liste de toutes les stations connectées
- Statut de connexion (online/offline)
- Version logicielle de chaque station
- Actions à distance (redémarrage, mise à jour)

### Gestion des certificats

- Liste globale de tous les certificats émis
- Recherche par UUID USB, date, station
- Révocation centralisée
- Politiques de certification (durée, quotas)

### Logs et alertes

- Agrégation de tous les logs des stations
- Recherche full-text
- Alertes temps-réel (virus, ransomware)
- Export pour SIEM (Splunk, ELK)

### Mises à jour

- Gestion des releases logicielles
- Déploiement progressif (canary, blue/green)
- Mises à jour signatures ClamAV
- Mise à jour règles EDR personnalisées

### Intégration Active Directory

- Authentification SSO
- Import groupes et utilisateurs
- Politiques GPO
- Audit trail

## API

### Authentification

Toutes les requêtes API nécessitent un header d'authentification :

```bash
X-API-Key: sk_live_xxxxxxxxxxxxx
```

### Endpoints principaux

#### Stations

```bash
# Enregistrer une nouvelle station
POST /api/v1/stations/register
{
  "station_id": "uuid",
  "name": "Station-01",
  "location": "Bâtiment A",
  "version": "1.0.0"
}

# Heartbeat
POST /api/v1/stations/heartbeat
{
  "station_id": "uuid",
  "status": "online",
  "timestamp": "2024-01-01T00:00:00Z"
}

# Liste des stations
GET /api/v1/stations
```

#### Certificats

```bash
# Synchroniser les certificats
GET /api/v1/certificates/sync?station_id=uuid&last_sync=timestamp

# Publier un nouveau certificat
POST /api/v1/certificates/publish
{
  "station_id": "uuid",
  "certificate": { ... }
}

# Révoquer un certificat
PUT /api/v1/certificates/:id/revoke
```

#### Logs

```bash
# Report scan
POST /api/v1/logs/scan
{
  "station_id": "uuid",
  "scan_result": { ... },
  "timestamp": "2024-01-01T00:00:00Z"
}

# Report menace
POST /api/v1/alerts/threat
{
  "station_id": "uuid",
  "threat": { ... },
  "priority": "critical"
}
```

#### Mises à jour

```bash
# Vérifier disponibilité d'update
GET /api/v1/updates/check?station_id=uuid&current_version=1.0.0

# Obtenir signatures ClamAV
GET /api/v1/updates/clamav-signatures

# Obtenir règles EDR
GET /api/v1/edr/rules
```

### WebSocket

```javascript
const socket = io('https://stationblanche.entreprise.local', {
  auth: {
    token: 'API_KEY'
  }
});

// Événements
socket.on('station:connected', (data) => { ... });
socket.on('station:disconnected', (data) => { ... });
socket.on('scan:completed', (data) => { ... });
socket.on('threat:detected', (data) => { ... });
socket.on('certificate:created', (data) => { ... });
```

## Maintenance

### Sauvegarde

```bash
# Base de données
sudo -u postgres pg_dump stationblanche_server > backup.sql

# Configuration
sudo tar -czf config-backup.tar.gz /etc/station-blanche-server/
```

### Surveillance

```bash
# Logs backend
journalctl -u stationblanche-server -f

# Logs Nginx
tail -f /var/log/nginx/stationblanche-server.access.log
tail -f /var/log/nginx/stationblanche-server.error.log

# PostgreSQL
sudo -u postgres psql -d stationblanche_server -c "SELECT COUNT(*) FROM stations;"
sudo -u postgres psql -d stationblanche_server -c "SELECT COUNT(*) FROM certificates;"
```

### Mise à jour

```bash
cd /opt/station-blanche-server
git pull origin main
cd backend && npm install
cd ../frontend && npm install && npm run build
sudo systemctl restart stationblanche-server
```

## Développement

### Mode développement

```bash
# Backend (avec hot-reload)
cd backend
npm run dev

# Frontend (avec hot-reload)
cd frontend
npm start
```

### Tests

```bash
# Backend
cd backend
npm test

# Frontend
cd frontend
npm test
```

## Dépannage

### Le serveur ne démarre pas

```bash
# Vérifier les logs
journalctl -u stationblanche-server -n 50

# Vérifier PostgreSQL
sudo systemctl status postgresql

# Vérifier Redis
sudo systemctl status redis-server
```

### Les stations ne se connectent pas

1. Vérifier le firewall : `sudo ufw status`
2. Ouvrir le port 3100 : `sudo ufw allow 3100/tcp`
3. Vérifier le certificat SSL
4. Vérifier la clé API dans la configuration station

### Problèmes de performance

- Augmenter les ressources de la VM (CPU, RAM)
- Activer le cache Redis
- Optimiser les requêtes PostgreSQL : `EXPLAIN ANALYZE`
- Configurer un load balancer pour scaler horizontalement

## Support

- Documentation : https://docs.station-blanche.com
- Issues : https://github.com/votre-org/station-blanche-server/issues
- Email : support@station-blanche.com

## Licence

Propriétaire - © 2024
