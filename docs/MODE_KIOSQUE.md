# Mode Kiosque - Station Blanche

## Vue d'ensemble

Le mode kiosque permet de transformer votre micro PC en station autonome avec interface tactile qui démarre automatiquement au boot.

## Fonctionnalités

- ✅ Démarrage automatique au boot
- ✅ Interface en plein écran (navigateur kiosque)
- ✅ Support écran tactile optimisé
- ✅ Backend et frontend en services systemd
- ✅ Pas d'économiseur d'écran ni de mise en veille
- ✅ Curseur masqué après inactivité (tactile)

## Installation

### Mode Kiosque (Station autonome)

```bash
cd station-blanche
sudo ./scripts/install.sh
# Choisir l'option 1 : Station autonome
```

Le script va :
1. Installer toutes les dépendances (nodejs, python, ClamAV)
2. Installer Chromium et outils pour le kiosque
3. Builder le frontend en mode production
4. Copier le projet vers `/opt/station-blanche`
5. Configurer les services systemd
6. Configurer le démarrage automatique

### Mode Développement

```bash
cd station-blanche
sudo ./scripts/install.sh
# Choisir l'option 2 : Mode développement
```

## Architecture Mode Kiosque

```
Démarrage système
    ↓
Services systemd démarrent
    ├── station-blanche-backend.service (port 8000)
    └── station-blanche-frontend.service (port 3000)
    ↓
Session utilisateur démarre
    ↓
Autostart lance start-kiosk.sh
    ↓
Chromium en mode kiosque sur http://localhost:3000
```

## Gestion des Services

### Backend

```bash
# Démarrer
sudo systemctl start station-blanche-backend

# Arrêter
sudo systemctl stop station-blanche-backend

# Redémarrer
sudo systemctl restart station-blanche-backend

# Voir les logs
sudo journalctl -u station-blanche-backend -f

# Statut
sudo systemctl status station-blanche-backend
```

### Frontend

```bash
# Démarrer
sudo systemctl start station-blanche-frontend

# Arrêter
sudo systemctl stop station-blanche-frontend

# Redémarrer
sudo systemctl restart station-blanche-frontend

# Voir les logs
sudo journalctl -u station-blanche-frontend -f

# Statut
sudo systemctl status station-blanche-frontend
```

## Sortir du Mode Kiosque

### Temporairement

- **Alt + F4** : Fermer Chromium
- **Ctrl + Alt + F2** : Basculer vers TTY2 (terminal)
- **Ctrl + Alt + F7** : Revenir à l'interface graphique

### Désactiver l'autostart

```bash
sudo rm /etc/xdg/autostart/station-blanche-kiosk.desktop
```

### Désactiver les services

```bash
sudo systemctl disable station-blanche-backend
sudo systemctl disable station-blanche-frontend
sudo systemctl stop station-blanche-backend
sudo systemctl stop station-blanche-frontend
```

## Optimisations Tactile

L'interface a été optimisée pour l'utilisation tactile :

- **Boutons** : Taille minimale 44x44px (recommandation Apple/Google)
- **Espacement** : Padding augmenté entre éléments
- **Touch events** : `touch-action: manipulation` pour réponse instantanée
- **Pas de hover** : Les effets hover sont désactivés sur tactile
- **Scrollbar overlay** : Scrollbars non intrusives

## Configuration Écran

### Résolution recommandée

- **Minimum** : 1024x768
- **Recommandé** : 1920x1080
- **Tactile** : 10 points de contact minimum

### Orientation

Par défaut : Paysage (landscape)

Pour forcer une orientation :

```bash
# Éditer /opt/station-blanche/scripts/start-kiosk.sh
# Ajouter avant le lancement de Chromium :
xrandr --output HDMI-1 --rotate left  # Portrait
```

## Calibration Tactile

Si l'écran tactile nécessite une calibration :

```bash
sudo apt-get install xinput-calibrator
xinput_calibrator
```

## Dépannage

### L'interface ne démarre pas

1. Vérifier que les services sont actifs :
```bash
sudo systemctl status station-blanche-backend
sudo systemctl status station-blanche-frontend
```

2. Vérifier les logs :
```bash
sudo journalctl -u station-blanche-backend -n 50
sudo journalctl -u station-blanche-frontend -n 50
```

3. Tester manuellement :
```bash
curl http://localhost:8000/api/usb/connected
curl http://localhost:3000
```

### Chromium ne se lance pas

1. Vérifier que Chromium est installé :
```bash
which chromium-browser || which chromium
```

2. Lancer manuellement pour voir les erreurs :
```bash
/opt/station-blanche/scripts/start-kiosk.sh
```

### L'écran tactile ne répond pas

1. Vérifier que l'écran est détecté :
```bash
xinput list
```

2. Tester les événements tactiles :
```bash
xinput test <device-id>
```

### Performance lente

Sur micro PC avec ressources limitées :

1. Réduire la résolution de l'écran
2. Désactiver les animations dans Chromium :
```bash
# Éditer start-kiosk.sh, ajouter :
--disable-gpu-compositing \
--disable-smooth-scrolling
```

## Sécurité

### Verrouillage du système

Pour empêcher l'accès au système :

1. Désactiver Ctrl+Alt+Fn :
```bash
# Créer /etc/X11/xorg.conf.d/50-novt.conf
Section "ServerFlags"
    Option "DontVTSwitch" "true"
EndSection
```

2. Désactiver les raccourcis clavier système
3. Créer un utilisateur dédié sans privilèges sudo

### Mise à jour automatique

```bash
# Créer un cron job
sudo crontab -e

# Ajouter :
0 3 * * * cd /opt/station-blanche && git pull && systemctl restart station-blanche-backend station-blanche-frontend
```

## Configuration Matérielle Recommandée

### Micro PC Minimum

- **CPU** : Dual-core 1.5 GHz
- **RAM** : 2 GB (4 GB recommandé)
- **Stockage** : 16 GB (32 GB recommandé)
- **Ports USB** : 2 minimum (pour scanner 2 clés simultanément)
- **Écran** : HDMI + tactile capacitif

### Micro PC Recommandé

- **CPU** : Quad-core 2.0 GHz (Intel N100, Raspberry Pi 4)
- **RAM** : 4 GB
- **Stockage** : 64 GB SSD
- **Ports USB** : 4 (USB 3.0)
- **Écran** : 15" tactile 1920x1080

### Modèles testés

- ✅ Raspberry Pi 4 (4GB)
- ✅ Intel NUC
- ✅ Beelink Mini PC
- ✅ ASUS PN50/PN51

## Support

Pour toute question ou problème :
- Issues GitHub : https://github.com/Owlcub/station-blanche/issues
- Documentation : [docs/](../docs/)
