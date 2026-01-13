# Guide d'installation - Station Blanche

## Prérequis

- Système Linux (Debian/Ubuntu/RedHat/CentOS)
- Accès root (sudo)
- Connexion Internet (pour télécharger les dépendances)

## Installation automatique

```bash
cd station-blanche
sudo ./scripts/install.sh
```

Le script d'installation va :
1. ✅ Installer Node.js et npm
2. ✅ Installer Python 3 et pip
3. ✅ Installer ClamAV (antivirus)
4. ✅ Installer rsync (transfert de fichiers)
5. ✅ Installer les dépendances backend et frontend
6. ✅ Créer les répertoires nécessaires
7. ✅ Mettre à jour la base de signatures ClamAV

## Installation manuelle

### 1. Dépendances système

#### Debian/Ubuntu
```bash
sudo apt-get update
sudo apt-get install -y nodejs npm python3 python3-pip clamav clamav-daemon rsync
```

#### RedHat/CentOS
```bash
sudo yum install -y nodejs npm python3 python3-pip clamav clamav-update rsync
```

### 2. Dépendances Python
```bash
cd backend
pip3 install -r requirements.txt
```

### 3. Dépendances Node.js

#### Backend
```bash
cd backend
npm install
```

#### Frontend
```bash
cd frontend
npm install
```

### 4. Configuration ClamAV
```bash
sudo freshclam  # Mise à jour des signatures
```

### 5. Créer les répertoires
```bash
sudo mkdir -p /var/lib/cyberbox-station/quarantine
sudo chmod 755 /var/lib/cyberbox-station
```

## Démarrage

### Backend (Terminal 1)
```bash
cd backend
npm start
```

Le serveur démarre sur le port 8000.

### Frontend (Terminal 2)
```bash
cd frontend
npm start
```

L'interface web s'ouvre automatiquement sur http://localhost:3000

## Configuration

### Port backend
Modifier le port dans `backend/server.js` :
```javascript
const PORT = process.env.PORT || 8000;
```

### URL API frontend
Modifier l'URL dans `frontend/src/config.js` :
```javascript
const API_URL = 'http://localhost:8000';
```

## Vérification

1. ✅ Backend accessible : `curl http://localhost:8000/api/usb/connected`
2. ✅ Frontend accessible : Ouvrir http://localhost:3000
3. ✅ ClamAV opérationnel : `clamscan --version`

## Dépannage

### ClamAV ne démarre pas
```bash
sudo systemctl start clamav-daemon
sudo systemctl enable clamav-daemon
```

### Permissions insuffisantes
```bash
sudo chmod -R 755 /var/lib/cyberbox-station
```

### Port déjà utilisé
Modifier le port dans `backend/server.js` et `frontend/src/config.js`

## Mise à jour

```bash
cd station-blanche
git pull
cd backend && npm install
cd ../frontend && npm install
sudo freshclam  # Mettre à jour ClamAV
```
