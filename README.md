# Station Blanche

**Kiosque de sécurité USB open source** — Scan antivirus, certification cryptographique et transfert sécurisé de clés USB. Conçu pour les entreprises, collectivités et établissements de santé.

---

## Fonctionnalités

### Scanner USB
- Scan antivirus via **ClamAV** (daemon multithreadé, 10-20x plus rapide)
- **EDR intégré** : détection ransomware par entropie Shannon (50+ extensions, 30+ patterns de notes de rançon)
- Détection heuristique : autorun, double extension, exécutables cachés
- **Certification cryptographique RSA-2048** avec signature vérifiable
- Quarantaine, nettoyage corbeille, formatage, éjection sécurisée

### Transfert USB → USB
- Workflow guidé en 5 étapes : Source → Scan → Destination → Scan → Transfert
- **Skip scan automatique** si certificat valide (~10 min → 2 sec)
- Exclusion automatique des fichiers système et certificats
- Vérification intégrité SHA-256
- Sélection fichiers par fichiers ou transfert complet

### Admin Panel
- Gestion des domaines et politiques d'expiration des certificats
- Export/Import de clés publiques entre stations
- Changement de mot de passe
- Connexion optionnelle au serveur central

### Serveur Central (optionnel)
- Dashboard de supervision multi-stations
- Gestion centralisée des certificats et révocations
- Alertes menaces en temps réel (WebSocket)
- Intégration Active Directory
- API REST + clés API par station
- Logs et historique des scans

---

## Architecture

```
station-blanche/
├── backend/                    # Station autonome - API REST (Node.js, port 8000)
│   ├── server.js               # Endpoints USB, transfert, certification
│   ├── admin.js                # Panel admin, config serveur central
│   ├── certification/          # Gestionnaire certificats RSA-2048
│   ├── edr/                    # Analyse entropie + détection ransomware
│   ├── services/
│   │   └── master-sync.js      # Synchronisation avec le serveur central
│   └── config/server.js        # Config connexion serveur central
├── frontend/                   # Interface kiosque (React)
│   └── src/
│       ├── components/pages/
│       │   ├── ScanTools/      # USBScanner, USBTransferGuided
│       │   └── Admin/          # AdminPanel, CertificationManager
│       └── config.js           # Auto-détection URL API
├── server/                     # Serveur central (déploiement séparé)
│   ├── backend/                # API REST (Node.js, port 3100)
│   │   ├── routes/             # stations, certificates, logs, alerts, edr...
│   │   ├── middleware/auth.js  # API key + session auth
│   │   └── database/schema.sql # PostgreSQL schema
│   └── frontend/               # Dashboard React
└── scripts/                    # Installation, systemd, ClamAV, kiosque
```

---

## Prérequis

**Station (Raspberry Pi 5 ou Mini-PC x86 sous Linux)**
- Node.js 18+
- ClamAV avec daemon (`clamd`)
- `rsync`, `lsblk`, `udevadm`

**Serveur Central (optionnel)**
- Node.js 18+
- PostgreSQL 14+
- Redis 7+

---

## Installation

### Mode Kiosque (production)

```bash
git clone https://github.com/Owlcub/station-blanche.git
cd station-blanche
sudo chmod +x scripts/install.sh
sudo ./scripts/install.sh
```

L'installation configure automatiquement :
- ClamAV daemon avec mises à jour quotidiennes
- Services systemd (backend + frontend)
- Mode kiosque Chromium plein écran
- Mises à jour automatiques hebdomadaires
- Thème Plymouth + GRUB silencieux

### Mode Développement

```bash
# Backend (terminal 1)
cd backend
npm install
npm start          # http://localhost:8000

# Frontend (terminal 2)
cd frontend
npm install
npm start          # http://localhost:3000
```

### Serveur Central

```bash
cd server/backend
cp .env.example .env
# Editer .env avec vos paramètres DB/Redis/secrets

npm install
node scripts/migrate.js        # Créer le schéma PostgreSQL
node scripts/seed.js           # Données initiales
npm start                      # http://localhost:3100

# Frontend dashboard (terminal séparé)
cd ../frontend
npm install && npm start
```

---

## Configuration

### Station autonome

Panel admin accessible sur `/admin` :
- **Mot de passe admin par défaut** : `CyberBox-Station-Admin` — à changer immédiatement après installation
- **Connexion serveur central** : URL + clé API (optionnel, mode standalone sinon)

### Serveur central

Copier `server/backend/.env.example` en `server/backend/.env` et configurer :

```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=stationblanche_server
DB_USER=stationblanche
DB_PASSWORD=CHANGEME

REDIS_URL=redis://localhost:6379

SESSION_SECRET=GENERATE_RANDOM_STRING
API_KEY_SALT=GENERATE_RANDOM_STRING
```

Générer une clé API pour une station :
```bash
cd server/backend
node scripts/generate-api-key.js
```

---

## Sécurité

### Protections station

| Protection | Détail |
|---|---|
| Détection USB | Double vérification sysfs + udevadm — bloque les disques internes |
| Certification | RSA-2048, liée à l'UUID unique de chaque clé, non transférable |
| Transfert | `.cyberbox-cert` exclu automatiquement — empêche la copie de certificats |
| Scan | ClamAV + EDR (entropie, ransomware, autorun, double extension) |
| Admin | bcrypt + session httpOnly, mot de passe modifiable |

### Principe de certification

Seules les **menaces ClamAV bloquent** la certification.
Les alertes EDR (exécutables, entropie) sont affichées mais n'empêchent pas la certification — pour éviter les faux positifs sur des clés légitimes.

### Points d'attention pour le déploiement

- Changer le mot de passe admin après installation
- En mode serveur central : générer des secrets aléatoires dans `.env` (ne jamais utiliser les valeurs par défaut)
- Le serveur central nécessite un reverse proxy (nginx) avec TLS en production
- Les endpoints USB s'exécutent en local uniquement sur le kiosque

---

## Hardware recommandé

| Configuration | Matériel | Performance |
|---|---|---|
| **Compact** | Raspberry Pi 5 8GB + NVMe 128GB + écran 10" tactile | Scan 2GB : 4-5 min |
| **Standard** | Mini-PC Intel i3-12100F + SSD 256GB + écran 15" tactile | Scan 2GB : 2-3 min |

Voir [`HARDWARE-RECOMMENDATIONS.md`](HARDWARE-RECOMMENDATIONS.md) pour les références complètes.

---

## Roadmap

- [ ] Application des règles EDR depuis le serveur vers les stations
- [ ] Vérification des certificats côté serveur central
- [ ] Support YARA rules
- [ ] Dashboard analytics multi-sites
- [ ] API SIEM/SOC
- [ ] Scan mémoire RAM (Volatility)
- [ ] Module forensics

---

## Contribuer

Les contributions sont les bienvenues.

1. Fork du projet
2. Créer une branche (`git checkout -b feature/ma-feature`)
3. Commit (`git commit -m 'Add ma-feature'`)
4. Push (`git push origin feature/ma-feature`)
5. Ouvrir une Pull Request

Pour les bugs ou suggestions : ouvrir une [issue](https://github.com/Owlcub/station-blanche/issues).

---

## Licence

MIT License — Copyright (c) 2025 Owlcub

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
