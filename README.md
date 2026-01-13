# Station Blanche - Scanner USB et PC Windows

## Description

Station dédiée au scan de sécurité des périphériques USB et PC Windows avec architecture client-serveur.

## Fonctionnalités

### 1. Scanner USB
- ✅ Scan antivirus ClamAV
- ✅ Détection autorun/autoplay
- ✅ Détection double extension (.pdf.exe, etc.)
- ✅ Analyse magic bytes (exécutables déguisés)
- ✅ Analyse dumps mémoire
- ✅ Quarantaine des fichiers infectés
- ✅ Nettoyage corbeille USB
- ✅ Formatage sécurisé
- ✅ Éjection sécurisée

### 2. Scanner PC Windows
- ✅ Audit système complet
- ✅ Détection processus suspects/ransomware
- ✅ Vérification firewall
- ✅ Audit utilisateurs et permissions
- ✅ Analyse services actifs
- ✅ Vérification espace disque

### 3. Transfert entre 2 USB (NOUVEAU)
- ✅ Transfert sécurisé entre 2 clés USB
- ✅ Scan automatique avant transfert
- ✅ Vérification intégrité
- ✅ Historique des transferts

## Architecture

```
Station Blanche
├── Backend (Node.js + Python)
│   ├── API REST (Express)
│   ├── Scanners Python (USB, PC)
│   └── Base de données JSON
└── Frontend (React)
    └── Interface web responsive
```

## Structure du dossier

```
station-blanche/
├── backend/
│   ├── server.js           # Serveur Express
│   ├── scanners/           # Scanners Python
│   │   ├── usb_scanner.py
│   │   └── workstation_scanner.py
│   ├── package.json
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── components/     # Composants React
│   │   └── config.js       # Configuration API
│   └── package.json
├── scripts/
│   └── install.sh          # Script d'installation
└── docs/
    └── GUIDE_UTILISATION.md
```

## Installation

Voir [docs/INSTALLATION.md](docs/INSTALLATION.md)

## Utilisation

1. Démarrer le serveur backend : `cd backend && npm start`
2. Démarrer l'interface web : `cd frontend && npm start`
3. Accéder à http://localhost:3000
