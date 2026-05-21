# Serveur Central de Gestion - Station Blanche Enterprise

## Vue d'ensemble

Le **Serveur Central Station Blanche** permet la gestion centralisée d'un réseau de stations (boxes clientes) pour les déploiements en entreprise, collectivités, hôpitaux, et grandes structures.

### Architecture

```
                    ┌─────────────────────────────────────┐
                    │   SERVEUR CENTRAL (Master)          │
                    │                                     │
                    │  - Dashboard multi-sites            │
                    │  - Gestion certificats centralisée  │
                    │  - Déploiement mises à jour         │
                    │  - Intégration Active Directory     │
                    │  - Statistiques & Logs              │
                    │  - API de synchronisation           │
                    └──────────────┬──────────────────────┘
                                   │
                    ┌──────────────┴──────────────────┐
                    │                                 │
         ┌──────────▼─────────┐          ┌───────────▼────────┐
         │  Box Cliente #1    │          │  Box Cliente #2    │
         │  (Mode Agent)      │          │  (Mode Agent)      │
         │                    │          │                    │
         │  - Scan local      │   ...    │  - Scan local      │
         │  - Report au master│          │  - Report au master│
         │  - Auto-update     │          │  - Auto-update     │
         └────────────────────┘          └────────────────────┘
```

---

## Fonctionnalités du Serveur Central

### 1. Dashboard Multi-Sites

**Interface web unifiée** pour superviser toutes les stations du réseau :

- **Vue d'ensemble temps-réel**
  - Nombre de stations actives/inactives
  - Scans en cours sur chaque station
  - Alertes et menaces détectées
  - Statut des mises à jour

- **Statistiques agrégées**
  - Total de scans effectués (par période, par station)
  - Menaces détectées par type (virus, ransomware, entropie)
  - USB certifiés vs refusés
  - Temps moyen de scan

- **Carte géographique** (optionnel)
  - Localisation des stations
  - Statut visuel par site

### 2. Gestion Centralisée des Certificats

**Base de données maître** pour tous les certificats USB :

- **Émission centralisée**
  - Génération de certificats depuis n'importe quelle station
  - Synchronisation automatique vers toutes les stations
  - Révocation immédiate sur tout le réseau

- **Politiques de sécurité**
  - Durée de validité par profil (visiteur, employé, admin)
  - Liste blanche/noire d'UUID USB
  - Quotas par utilisateur/département

- **Audit trail complet**
  - Qui a certifié quelle clé, quand, où
  - Historique de vérification
  - Tentatives d'utilisation de certificats expirés

### 3. Déploiement Automatique des Mises à Jour

**Système de mise à jour orchestré** :

- **Gestion des versions**
  - Dépôt central des releases
  - Déploiement progressif (canary, blue/green)
  - Rollback automatique en cas d'échec

- **Planification**
  - Mises à jour programmées (heures creuses)
  - Groupes de déploiement (test → prod)
  - Notification avant/après update

- **Monitoring**
  - Statut de mise à jour par station
  - Logs centralisés
  - Alertes si échec de déploiement

### 4. Intégration Active Directory

**Connexion native au domaine AD** :

- **Authentification unifiée**
  - SSO (Single Sign-On) via Kerberos
  - Gestion des droits par groupe AD
  - Audit logs vers Event Viewer

- **Politiques GPO**
  - Import automatique des certificats dans le registre Windows
  - Blocage USB non-certifiés via GPO
  - Configuration centralisée des stations

- **Synchronisation utilisateurs**
  - Attribution de certificats par compte AD
  - Quotas par département/OU
  - Rapports par utilisateur

### 5. Logs et Alertes Centralisés

**Système de monitoring unifié** :

- **Agrégation logs**
  - Tous les événements des stations (syslog/journal)
  - Recherche full-text
  - Filtres par station, type, période

- **Alertes temps-réel**
  - Notification si virus détecté
  - Alerte si tentative USB non-certifié
  - Anomalies comportementales (scan inhabituel)

- **Exports conformité**
  - Rapports RGPD
  - Conformité ISO 27001
  - Audit trails pour certifications

---

## Modifications Nécessaires

### A. Serveur Central (Nouveau composant)

#### Architecture technique

```
serveur-central/
├── backend/
│   ├── server.js                    # API centrale (port 3100)
│   ├── config/
│   │   └── database.js              # PostgreSQL/MongoDB config
│   ├── models/
│   │   ├── Station.js               # Modèle station cliente
│   │   ├── Certificate.js           # Certificats globaux
│   │   ├── ScanLog.js               # Historique scans
│   │   ├── User.js                  # Utilisateurs AD
│   │   └── Alert.js                 # Alertes système
│   ├── routes/
│   │   ├── stations.js              # CRUD stations
│   │   ├── certificates.js          # Gestion certificats
│   │   ├── updates.js               # Déploiement updates
│   │   ├── ad-integration.js        # Intégration AD/LDAP
│   │   ├── logs.js                  # Agrégation logs
│   │   └── dashboard.js             # Stats temps-réel
│   ├── services/
│   │   ├── ad-connector.js          # LDAP/Kerberos
│   │   ├── update-orchestrator.js   # Gestion déploiement
│   │   ├── certificate-sync.js      # Sync certificats
│   │   └── alert-manager.js         # Notifications
│   └── websocket/
│       └── station-events.js        # WebSocket temps-réel
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Dashboard/
│   │   │   │   ├── Overview.js      # Vue d'ensemble
│   │   │   │   ├── StationsMap.js   # Carte stations
│   │   │   │   └── Statistics.js    # Graphiques
│   │   │   ├── Stations/
│   │   │   │   ├── StationList.js   # Liste stations
│   │   │   │   ├── StationDetail.js # Détail station
│   │   │   │   └── StationConfig.js # Configuration
│   │   │   ├── Certificates/
│   │   │   │   ├── CertList.js      # Tous les certificats
│   │   │   │   ├── CertRevoke.js    # Révocation
│   │   │   │   └── CertPolicies.js  # Politiques
│   │   │   ├── Updates/
│   │   │   │   ├── UpdateManager.js # Gestion releases
│   │   │   │   └── Deployment.js    # Déploiement
│   │   │   ├── ActiveDirectory/
│   │   │   │   ├── ADConfig.js      # Configuration LDAP
│   │   │   │   ├── GroupMapping.js  # Mapping groupes
│   │   │   │   └── GPOExport.js     # Export GPO
│   │   │   └── Logs/
│   │   │       ├── LogViewer.js     # Viewer logs
│   │   │       └── AlertsPanel.js   # Alertes
│   │   └── pages/
│   │       ├── DashboardPage.js
│   │       ├── StationsPage.js
│   │       ├── CertificatesPage.js
│   │       ├── UpdatesPage.js
│   │       └── SettingsPage.js
├── database/
│   ├── migrations/                  # Migrations DB
│   └── seeds/                       # Données test
└── docker-compose.yml               # PostgreSQL + Redis

```

#### Stack technique

| Composant | Technologie | Justification |
|-----------|-------------|---------------|
| **Backend API** | Node.js + Express | Cohérence avec les boxes clientes |
| **Base de données** | PostgreSQL | Relations complexes, ACID |
| **Cache** | Redis | Sessions, cache certificats |
| **WebSocket** | Socket.io | Notifications temps-réel |
| **Queue** | Bull (Redis) | Jobs async (updates, sync) |
| **Frontend** | React + Chart.js | Dashboard interactif |
| **Auth** | Passport.js (LDAP/Kerberos) | Intégration AD native |
| **Logs** | Winston + Syslog | Agrégation centralisée |

#### API Endpoints (exemples)

```javascript
// Stations
GET    /api/v1/stations                    # Liste toutes les stations
GET    /api/v1/stations/:id                # Détail station
POST   /api/v1/stations/register           # Enregistrement nouvelle station
PUT    /api/v1/stations/:id/config         # Mise à jour config
DELETE /api/v1/stations/:id                # Suppression station

// Certificats
GET    /api/v1/certificates                # Liste certificats globaux
POST   /api/v1/certificates/sync           # Sync depuis une station
PUT    /api/v1/certificates/:id/revoke     # Révocation certificat
GET    /api/v1/certificates/policies       # Politiques de certification

// Mises à jour
GET    /api/v1/updates/releases            # Releases disponibles
POST   /api/v1/updates/deploy              # Déploiement release
GET    /api/v1/updates/status/:station_id  # Statut déploiement

// Active Directory
POST   /api/v1/ad/configure                # Configuration LDAP
GET    /api/v1/ad/users                    # Liste utilisateurs AD
POST   /api/v1/ad/sync                     # Synchronisation AD
GET    /api/v1/ad/gpo/export               # Export GPO

// Logs & Monitoring
GET    /api/v1/logs?station=&level=&date=  # Recherche logs
GET    /api/v1/alerts                      # Alertes actives
POST   /api/v1/alerts/acknowledge          # Acquitter alerte

// Dashboard
GET    /api/v1/dashboard/stats             # Stats globales
GET    /api/v1/dashboard/threats           # Menaces récentes
GET    /api/v1/dashboard/activity          # Activité temps-réel

// WebSocket events
ws://serveur:3100/socket.io
  → 'station:connected'                    # Station se connecte
  → 'station:disconnected'                 # Station se déconnecte
  → 'scan:started'                         # Scan démarre
  → 'scan:completed'                       # Scan terminé
  → 'threat:detected'                      # Menace détectée
  → 'certificate:created'                  # Nouveau certificat
  → 'update:progress'                      # Progression update
```

---

### B. Box Cliente (Modifications)

#### 1. Mode Agent

Ajouter un **mode de fonctionnement "agent"** qui se connecte au serveur central.

**Fichier** : `backend/config/agent.js`

```javascript
module.exports = {
  // Mode autonome ou agent
  mode: process.env.STATION_MODE || 'standalone', // 'standalone' | 'agent'

  // Configuration serveur central (si mode agent)
  master: {
    url: process.env.MASTER_URL || 'https://serveur-central.entreprise.local:3100',
    api_key: process.env.MASTER_API_KEY || '',
    station_id: process.env.STATION_ID || '', // UUID unique de cette station
    sync_interval: 300000, // 5 min
  },

  // Informations de la station
  station_info: {
    name: process.env.STATION_NAME || 'Station-01',
    location: process.env.STATION_LOCATION || 'Bâtiment A - RDC',
    tags: process.env.STATION_TAGS?.split(',') || ['production'],
  }
};
```

#### 2. Service de Synchronisation

**Fichier** : `backend/services/master-sync.js`

```javascript
const axios = require('axios');
const config = require('../config/agent');
const certificateManager = require('../certification/certificate-manager');

class MasterSyncService {
  constructor() {
    this.client = axios.create({
      baseURL: config.master.url,
      headers: {
        'X-API-Key': config.master.api_key,
        'X-Station-ID': config.master.station_id
      }
    });

    this.syncInterval = null;
  }

  // Démarrage du service
  start() {
    if (config.mode !== 'agent') {
      console.log('[MASTER-SYNC] Mode standalone, pas de sync');
      return;
    }

    console.log(`[MASTER-SYNC] Connexion au master: ${config.master.url}`);

    // Heartbeat initial
    this.sendHeartbeat();

    // Sync périodique
    this.syncInterval = setInterval(() => {
      this.syncCertificates();
      this.sendHeartbeat();
    }, config.master.sync_interval);
  }

  // Heartbeat vers le master
  async sendHeartbeat() {
    try {
      await this.client.post('/api/v1/stations/heartbeat', {
        station_id: config.master.station_id,
        status: 'online',
        info: config.station_info,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('[MASTER-SYNC] Heartbeat failed:', error.message);
    }
  }

  // Synchronisation des certificats depuis le master
  async syncCertificates() {
    try {
      const response = await this.client.get('/api/v1/certificates/sync', {
        params: {
          station_id: config.master.station_id,
          last_sync: this.lastSync
        }
      });

      const { certificates, revoked } = response.data;

      // Import nouveaux certificats
      for (const cert of certificates) {
        await certificateManager.importCertificate(cert);
      }

      // Révocation certificats
      for (const certId of revoked) {
        await certificateManager.revokeCertificate(certId);
      }

      this.lastSync = new Date().toISOString();
      console.log(`[MASTER-SYNC] Synced ${certificates.length} certs, revoked ${revoked.length}`);

    } catch (error) {
      console.error('[MASTER-SYNC] Cert sync failed:', error.message);
    }
  }

  // Envoi d'un nouveau certificat au master
  async publishCertificate(certificate) {
    if (config.mode !== 'agent') return;

    try {
      await this.client.post('/api/v1/certificates/sync', {
        station_id: config.master.station_id,
        certificate: certificate
      });
      console.log(`[MASTER-SYNC] Published cert ${certificate.certificate_id} to master`);
    } catch (error) {
      console.error('[MASTER-SYNC] Publish cert failed:', error.message);
    }
  }

  // Envoi résultat de scan au master
  async reportScanResult(scanResult) {
    if (config.mode !== 'agent') return;

    try {
      await this.client.post('/api/v1/logs/scan', {
        station_id: config.master.station_id,
        scan_result: scanResult,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('[MASTER-SYNC] Report scan failed:', error.message);
    }
  }

  // Envoi alerte menace au master
  async reportThreat(threatDetails) {
    if (config.mode !== 'agent') return;

    try {
      await this.client.post('/api/v1/alerts/threat', {
        station_id: config.master.station_id,
        threat: threatDetails,
        priority: threatDetails.ransomware_detected ? 'critical' : 'high',
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('[MASTER-SYNC] Report threat failed:', error.message);
    }
  }

  stop() {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
    }
  }
}

module.exports = new MasterSyncService();
```

#### 3. Intégration dans le Backend

**Fichier** : `backend/server.js` (modifications)

```javascript
const masterSync = require('./services/master-sync');

// ... code existant ...

// Démarrage du service de sync
masterSync.start();

// Hook après certification
app.post('/api/certification/certify', async (req, res) => {
  // ... code existant de certification ...

  // Publication au master si mode agent
  await masterSync.publishCertificate(certificate);

  res.json({ success: true, certificate });
});

// Hook après scan
app.post('/api/scan/start', async (req, res) => {
  // ... code existant de scan ...

  // Report au master si mode agent
  await masterSync.reportScanResult(scanResult);

  // Si menace détectée, alerte immédiate
  if (scanResult.infected_files.length > 0 || scanResult.ransomware_analysis?.ransomware_detected) {
    await masterSync.reportThreat({
      device: req.body.device,
      threats: scanResult.infected_files,
      ransomware_detected: scanResult.ransomware_analysis?.ransomware_detected
    });
  }

  res.json(scanResult);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  masterSync.stop();
  server.close();
});
```

#### 4. Service de Mise à Jour Automatique

**Fichier** : `backend/services/auto-updater.js`

```javascript
const axios = require('axios');
const { execPromise } = require('../utils/exec');
const config = require('../config/agent');

class AutoUpdater {
  constructor() {
    this.client = axios.create({
      baseURL: config.master.url,
      headers: {
        'X-API-Key': config.master.api_key,
        'X-Station-ID': config.master.station_id
      }
    });

    this.currentVersion = require('../../package.json').version;
  }

  async checkForUpdates() {
    if (config.mode !== 'agent') return;

    try {
      const response = await this.client.get('/api/v1/updates/check', {
        params: {
          current_version: this.currentVersion,
          station_id: config.master.station_id
        }
      });

      if (response.data.update_available) {
        console.log(`[AUTO-UPDATE] New version available: ${response.data.version}`);
        await this.performUpdate(response.data);
      }

    } catch (error) {
      console.error('[AUTO-UPDATE] Check failed:', error.message);
    }
  }

  async performUpdate(updateInfo) {
    console.log(`[AUTO-UPDATE] Starting update to ${updateInfo.version}...`);

    try {
      // Notification au master
      await this.client.post('/api/v1/updates/status', {
        station_id: config.master.station_id,
        status: 'updating',
        version: updateInfo.version
      });

      // Git pull + rebuild
      await execPromise('cd /opt/station-blanche && git fetch');
      await execPromise(`cd /opt/station-blanche && git checkout ${updateInfo.git_tag}`);
      await execPromise('cd /opt/station-blanche/frontend && npm install && npm run build');
      await execPromise('cd /opt/station-blanche/backend && npm install');

      // Redémarrage services
      await execPromise('sudo systemctl restart station-blanche-backend station-blanche-frontend');

      // Notification succès
      await this.client.post('/api/v1/updates/status', {
        station_id: config.master.station_id,
        status: 'success',
        version: updateInfo.version
      });

      console.log('[AUTO-UPDATE] Update completed successfully');

    } catch (error) {
      console.error('[AUTO-UPDATE] Update failed:', error.message);

      // Notification échec
      await this.client.post('/api/v1/updates/status', {
        station_id: config.master.station_id,
        status: 'failed',
        error: error.message
      });
    }
  }
}

module.exports = new AutoUpdater();
```

#### 5. Configuration Environnement

**Fichier** : `.env.agent` (exemple pour box cliente)

```bash
# Mode de fonctionnement
STATION_MODE=agent

# Informations station
STATION_ID=550e8400-e29b-41d4-a716-446655440001
STATION_NAME=Station-Accueil-Batiment-A
STATION_LOCATION=Bâtiment A - Hall d'accueil
STATION_TAGS=production,public

# Serveur central
MASTER_URL=https://stationblanche-master.entreprise.local:3100
MASTER_API_KEY=sk_live_xxxxxxxxxxxxxxxxxxx

# Intervalle de synchronisation (ms)
SYNC_INTERVAL=300000

# Active Directory (si intégration locale)
AD_DOMAIN=ENTREPRISE.LOCAL
AD_LDAP_URL=ldap://dc.entreprise.local:389
```

---

## Déploiement

### Architecture réseau recommandée

```
┌─────────────────────────────────────────────────────┐
│  Réseau d'entreprise (VLAN dédié)                   │
│                                                      │
│  ┌────────────────────┐                             │
│  │ Serveur Central    │  PostgreSQL + Redis         │
│  │ (VM ou Physique)   │  Port 3100 (HTTPS)          │
│  │ 4 vCPU, 8GB RAM    │                             │
│  └──────────┬─────────┘                             │
│             │                                        │
│    ┌────────┴────────┬────────────┬───────────┐     │
│    │                 │            │           │     │
│  ┌─▼──┐          ┌──▼─┐       ┌──▼─┐      ┌──▼─┐   │
│  │Box1│          │Box2│       │Box3│      │BoxN│   │
│  │RDC │          │Etg1│       │Site│      │... │   │
│  └────┘          └────┘       └────┘      └────┘   │
│                                                      │
│  ┌────────────────────┐                             │
│  │ Active Directory   │  LDAP/Kerberos              │
│  │ (si intégration)   │                             │
│  └────────────────────┘                             │
└──────────────────────────────────────────────────────┘
```

### Prérequis Serveur Central

| Composant | Minimum | Recommandé |
|-----------|---------|------------|
| **OS** | Ubuntu 22.04 LTS | Ubuntu 22.04 LTS |
| **CPU** | 2 vCPU | 4 vCPU |
| **RAM** | 4 GB | 8 GB |
| **Disque** | 50 GB SSD | 200 GB SSD |
| **Réseau** | 100 Mbps | 1 Gbps |
| **Boxes supportées** | 1-10 | 50+ |

### Installation Serveur Central

```bash
# 1. Installation dépendances
sudo apt update
sudo apt install -y nodejs npm postgresql redis-server nginx certbot

# 2. Clone repository serveur
git clone https://github.com/votre-org/station-blanche-serveur.git
cd station-blanche-serveur

# 3. Configuration base de données
sudo -u postgres createdb stationblanche_master
sudo -u postgres psql -d stationblanche_master -f database/schema.sql

# 4. Configuration environnement
cp .env.example .env
nano .env
# PORT=3100
# DB_HOST=localhost
# DB_USER=stationblanche
# DB_PASSWORD=CHANGEME
# REDIS_URL=redis://localhost:6379
# JWT_SECRET=CHANGEME
# AD_DOMAIN=ENTREPRISE.LOCAL
# AD_LDAP_URL=ldap://dc.entreprise.local:389

# 5. Installation backend
cd backend
npm install
npm run migrate

# 6. Installation frontend
cd ../frontend
npm install
npm run build

# 7. Configuration systemd
sudo cp systemd/station-blanche-master.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable station-blanche-master
sudo systemctl start station-blanche-master

# 8. Configuration Nginx reverse proxy
sudo cp nginx/stationblanche-master.conf /etc/nginx/sites-available/
sudo ln -s /etc/nginx/sites-available/stationblanche-master.conf /etc/nginx/sites-enabled/
sudo systemctl reload nginx

# 9. Certificat SSL
sudo certbot --nginx -d stationblanche-master.entreprise.local
```

### Configuration Box Cliente en Mode Agent

```bash
# 1. Sur la box cliente existante
cd /opt/station-blanche

# 2. Mise à jour code (avec support agent)
git pull origin main

# 3. Installation dépendances mise à jour
cd backend && npm install
cd ../frontend && npm install && npm run build

# 4. Configuration mode agent
sudo nano /etc/station-blanche/.env
# Ajouter:
# STATION_MODE=agent
# STATION_ID=UUID-UNIQUE-GENERE
# STATION_NAME=Station-Accueil
# STATION_LOCATION=Bâtiment A - RDC
# MASTER_URL=https://stationblanche-master.entreprise.local:3100
# MASTER_API_KEY=cle-api-generee-par-serveur

# 5. Enregistrement sur le serveur central
curl -X POST https://stationblanche-master.entreprise.local:3100/api/v1/stations/register \
  -H "Content-Type: application/json" \
  -d '{
    "station_id": "UUID-UNIQUE",
    "name": "Station-Accueil",
    "location": "Bâtiment A - RDC",
    "api_key": "cle-api-fournie"
  }'

# 6. Redémarrage services
sudo systemctl restart station-blanche-backend station-blanche-frontend

# 7. Vérification connexion
journalctl -u station-blanche-backend -f | grep MASTER-SYNC
# Doit afficher: [MASTER-SYNC] Connexion au master: https://...
```

---

## Scénarios d'Usage

### Scénario 1 : Hôpital Multi-Sites

**Contexte** : CHU avec 5 bâtiments, 20 stations réparties

**Déploiement** :
- 1 serveur central dans la salle serveur principale
- Intégration AD du domaine hospitalier
- Certificats USB valides sur tous les sites
- Dashboard central pour équipe sécurité

**Workflow** :
1. Médecin scanne clé USB sur station du service cardiologie (Bât. B)
2. Scan + certification automatique
3. Certificat synchronisé vers serveur central en 30 secondes
4. Médecin va au Bât. A, insère clé → reconnu instantanément (skip scan)
5. Équipe sécurité voit en temps-réel les scans sur dashboard
6. Si menace détectée → alerte immédiate à l'équipe IT

### Scénario 2 : Collectivité Territoriale

**Contexte** : Mairie + 8 sites municipaux (médiathèque, écoles, ...)

**Déploiement** :
- Serveur central à la mairie
- 1 station par site municipal
- Certificats inter-sites pour personnel municipal
- Statistiques pour rapport annuel sécurité

**Workflow** :
1. Agent municipal certifie sa clé à la mairie
2. Visite l'école municipale → clé reconnue
3. Visite la médiathèque → clé reconnue
4. Dashboard montre 95% des clés certifiées (conformité)
5. Génération rapport mensuel pour DSI

### Scénario 3 : Entreprise Multi-Nationales

**Contexte** : Groupe industriel, 50 sites France + Europe

**Déploiement** :
- 1 serveur central par pays (France, Allemagne, UK)
- Synchronisation inter-serveurs (fédération)
- Intégration AD multi-domaines
- Politiques de certification par site

**Workflow** :
1. Employé français certifie clé au siège Paris
2. Mission en filiale Lyon → clé reconnue
3. Mission en Allemagne → certificat transféré entre serveurs centraux
4. Dashboard global pour RSSI groupe
5. Révocation centralisée si employé quitte l'entreprise

---

## Modèle Commercial

### Offres adaptées

| Offre | Prix/mois | Serveur Central | Support |
|-------|-----------|-----------------|---------|
| **Essai** | 19€/box | ❌ Mode standalone | Email |
| **Pro** | 39€/box | ❌ Mode standalone | Tickets |
| **Enterprise** | 89€/box + 299€ serveur | ✅ Serveur inclus | Prioritaire |
| **Enterprise+** | 149€/box + 499€ serveur | ✅ + AD + Multi-sites | Dédié + On-site |

### Exemples de pricing

**Hôpital (20 boxes)** :
- 20 boxes × 89€ = 1 780€/mois
- 1 serveur central = 299€/mois
- **Total : 2 079€/mois** (24 948€/an)

**Collectivité (8 boxes)** :
- 8 boxes × 89€ = 712€/mois
- 1 serveur central = 299€/mois
- **Total : 1 011€/mois** (12 132€/an)

**Groupe industriel (50 boxes)** :
- 50 boxes × 149€ = 7 450€/mois
- 3 serveurs centraux (France, DE, UK) × 499€ = 1 497€/mois
- **Total : 8 947€/mois** (107 364€/an)

### Avantages clients

- **ROI immédiat** : Évite incidents sécurité (coût moyen : 50 000€+)
- **Conformité** : RGPD, ISO 27001, certifications sectorielles
- **Efficacité** : Centralisation vs gestion manuelle de 50 stations
- **Scalabilité** : Ajout de nouvelles stations en quelques minutes

---

## Roadmap Développement

### Phase 1 - MVP Serveur Central (8-10 semaines)

**Semaines 1-2** : Infrastructure de base
- API serveur central (endpoints CRUD stations)
- Base de données PostgreSQL (modèles)
- WebSocket pour notifications temps-réel
- Dashboard frontend basique (liste stations)

**Semaines 3-4** : Synchronisation certificats
- Service sync bidirectionnel
- Import/export certificats
- Révocation centralisée
- Mode agent sur boxes clientes

**Semaines 5-6** : Système de mise à jour
- Orchestrateur de déploiement
- Upload releases sur serveur
- Auto-update boxes clientes
- Rollback automatique

**Semaines 7-8** : Dashboard avancé
- Statistiques temps-réel
- Graphiques (Chart.js)
- Logs centralisés
- Système d'alertes

**Semaines 9-10** : Tests & Documentation
- Tests end-to-end
- Documentation admin
- Scripts d'installation
- Formation support

### Phase 2 - Intégration Active Directory (4-6 semaines)

**Semaines 11-12** : Authentification AD
- Connexion LDAP/Kerberos
- SSO sur serveur central
- Mapping groupes AD

**Semaines 13-14** : Politiques GPO
- Scripts PowerShell
- Export certificats vers registre Windows
- Blocage USB non-certifiés

**Semaines 15-16** : Tests en production
- Déploiement pilote client
- Ajustements configuration
- Documentation GPO

### Phase 3 - Fonctionnalités Avancées (6-8 semaines)

**Semaines 17-19** : Multi-tenancy
- Isolation données par organisation
- Fédération inter-serveurs
- API publique pour intégrations

**Semaines 20-22** : Conformité & Audit
- Exports conformité (RGPD, ISO)
- Rapports automatiques
- Retention logs configurable

**Semaines 23-24** : IA/ML (optionnel)
- Détection anomalies comportementales
- Prédiction menaces
- Recommandations automatiques

---

## FAQ Technique

### Q1 : Les boxes peuvent-elles fonctionner si le serveur central tombe ?

**Oui, totalement.** Les boxes en mode agent conservent une copie locale de tous les certificats synchronisés. Si le serveur central est inaccessible :
- Les scans continuent normalement
- Les certificats locaux sont vérifiés
- Les nouvelles certifications sont mises en queue
- Synchronisation automatique au retour du serveur

### Q2 : Comment gérer plusieurs serveurs centraux (multi-sites) ?

**Fédération de serveurs.** Chaque serveur central peut être configuré pour communiquer avec d'autres serveurs :
```javascript
// config/federation.js
module.exports = {
  peers: [
    { url: 'https://master-france.entreprise.com', api_key: '...' },
    { url: 'https://master-germany.entreprise.com', api_key: '...' }
  ],
  sync_strategy: 'eventual_consistency' // ou 'realtime'
};
```

### Q3 : Quelle bande passante nécessaire ?

**Très faible.** Par box cliente :
- Heartbeat : 1 KB toutes les 5 min = **12 KB/heure**
- Sync certificat : 2 KB par certificat = **~50 KB/jour** (estimation 25 certs)
- Logs scan : 10 KB par scan = **~100 KB/jour** (estimation 10 scans)
- **Total : ~150 KB/jour/box** = 4.5 MB/mois/box

Pour 50 boxes : **225 MB/mois** (négligeable)

### Q4 : Comment migrer des boxes standalone vers mode agent ?

**Migration non-disruptive** :
1. Déployer serveur central
2. Update code boxes (git pull)
3. Ajouter config `.env` (mode agent + URL master)
4. Redémarrer services
5. Les certificats existants sont automatiquement uploadés au premier sync

Downtime : **~2 minutes par box**

### Q5 : Le serveur central peut-il gérer 500+ boxes ?

**Oui, avec scaling horizontal** :
- 1 serveur : jusqu'à 50 boxes (recommandé)
- Load balancer + 3 serveurs : 150-200 boxes
- Kubernetes cluster : 500+ boxes

Base PostgreSQL peut gérer des millions de certificats.

### Q6 : Compatibilité avec SIEM existants (Splunk, ELK) ?

**Oui, export natif** :
```javascript
// Export logs au format Syslog (RFC 5424)
GET /api/v1/logs/export?format=syslog&since=2024-01-01

// Webhook vers SIEM
POST /api/v1/settings/webhooks
{
  "url": "https://siem.entreprise.com/ingest",
  "events": ["threat:detected", "scan:completed"],
  "format": "json"
}
```

---

## Conclusion

Le **Serveur Central Station Blanche** transforme une solution autonome en plateforme d'entreprise complète :

✅ **Pour les clients** :
- Gestion centralisée de dizaines de stations
- Certificats USB valides sur tout le réseau
- Visibilité temps-réel des menaces
- Conformité automatisée

✅ **Pour votre business** :
- Montée en gamme vers l'enterprise (ARR élevé)
- Lock-in fort (intégration AD = migration difficile)
- Upsell naturel (standalone → serveur central)
- Marges élevées (coût serveur minimal vs prix)

✅ **Effort de développement raisonnable** :
- Phase 1 MVP : 8-10 semaines
- Réutilisation code existant (backend/frontend)
- Stack technique maîtrisée (Node.js/React)

**Prochaines étapes recommandées** :
1. Valider concept avec 2-3 clients pilotes (mode standalone)
2. Développer MVP serveur central (Phase 1)
3. Beta test avec 1 client enterprise (hôpital ou collectivité)
4. Itérer avant lancement commercial large
