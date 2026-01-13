# Fichiers à inclure dans la station blanche

## Backend

### Fichiers serveur Node.js
- ✅ `backend/server.js` (version minimaliste - À CRÉER)
  - Uniquement endpoints USB et PC
  - Endpoint transfert USB-to-USB
  - Base de données JSON simple

- ✅ `backend/package.json` (À COPIER et MODIFIER)
  - Dépendances minimales : express, cors, axios, uuid, multer

### Scanners Python
- ✅ `backend/scanners/usb_scanner.py` (À COPIER)
- ✅ `backend/scanners/workstation_scanner.py` (À COPIER)
- ✅ `backend/scanners/__init__.py` (À CRÉER)

### Configuration
- ✅ `backend/requirements.txt` (À CRÉER)
  - psutil
  - asyncio

## Frontend

### Composants React principaux
- ✅ `frontend/src/components/pages/ScanTools/USBScanner.js` (À COPIER)
- ✅ `frontend/src/components/pages/ScanTools/USBScanner.css` (À COPIER)
- ✅ `frontend/src/components/pages/ScanTools/RemotePCScanner.js` (À COPIER)
- ✅ `frontend/src/components/pages/ScanTools/USBTransfer.js` (À CRÉER - NOUVEAU)

### Design system
- ✅ `frontend/src/components/design-system/` (TOUT COPIER)
  - Card.js
  - Button.js
  - Loading.js
  - Badge.js
  - etc.

### Configuration
- ✅ `frontend/src/config.js` (À COPIER)
- ✅ `frontend/package.json` (À COPIER et MODIFIER)
- ✅ `frontend/public/` (À COPIER)

### App principal
- ✅ `frontend/src/App.js` (À CRÉER - version minimaliste)
- ✅ `frontend/src/index.js` (À COPIER)
- ✅ `frontend/src/index.css` (À COPIER)

## Scripts

- ✅ `scripts/install.sh` (À CRÉER)
  - Installation dépendances Node.js
  - Installation dépendances Python
  - Installation ClamAV
  - Configuration permissions

## Documentation

- ✅ `docs/INSTALLATION.md` (À CRÉER)
- ✅ `docs/GUIDE_UTILISATION.md` (À CRÉER)

## Fichiers de configuration

- ✅ `.gitignore` (À CRÉER)
- ✅ `README.md` (DÉJÀ CRÉÉ)

---

## Endpoints API à implémenter

### USB Scanner
- `GET /api/usb/connected` - Liste des clés USB
- `POST /api/usb/scan` - Scanner une clé
- `POST /api/usb/quarantine` - Mettre en quarantaine
- `POST /api/usb/clean-trash` - Nettoyer corbeille
- `POST /api/usb/format` - Formater
- `POST /api/usb/safe-eject` - Éjecter

### PC Scanner
- `POST /api/workstation/scan` - Scanner un PC

### USB Transfer (NOUVEAU)
- `GET /api/usb/transfer/list` - Liste des transferts possibles
- `POST /api/usb/transfer/start` - Démarrer un transfert
- `GET /api/usb/transfer/status/:id` - Statut du transfert
- `GET /api/usb/transfer/history` - Historique des transferts
