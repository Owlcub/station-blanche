# Mise à jour des Stations Blanches existantes

## Pour ajouter l'écran de connexion Owlcub sur les stations déjà installées

Si vous avez déjà des stations blanches installées et que vous voulez ajouter :
- Logo Owlcub sur l'écran de connexion
- Interface graphique personnalisée
- Dernières mises à jour du code

## Méthode automatique (recommandée)

### Sur chaque station blanche :

```bash
# Se connecter en root
su -

# Aller dans le répertoire d'installation
cd /opt/station-blanche

# Télécharger les dernières mises à jour
git pull origin main

# Lancer le script de mise à jour
./scripts/update-existing-station.sh
```

Le script va automatiquement :
- ✅ Mettre à jour le code depuis GitHub
- ✅ Mettre à jour les dépendances npm
- ✅ Installer l'interface graphique si nécessaire (xorg, lightdm, chromium)
- ✅ Personnaliser l'écran de connexion avec le logo Owlcub
- ✅ Rebuilder le frontend
- ✅ Redémarrer les services

### Après la mise à jour

```bash
# Redémarrer pour appliquer les changements d'interface
reboot

# OU redémarrer juste l'interface graphique
systemctl restart lightdm
```

---

## Méthode manuelle

Si vous préférez contrôler chaque étape :

### 1. Mettre à jour le code

```bash
cd /opt/station-blanche
git pull origin main
```

### 2. Mettre à jour les dépendances

```bash
cd /opt/station-blanche/backend
npm install

cd /opt/station-blanche/frontend
npm install
npm run build
```

### 3. Installer l'interface graphique (si pas déjà fait)

```bash
apt-get update
apt-get install -y xorg lightdm openbox chromium unclutter xdotool x11-xserver-utils
systemctl enable lightdm
```

### 4. Personnaliser l'écran de connexion

```bash
cd /opt/station-blanche
./scripts/customize-login-screen.sh
```

### 5. Redémarrer les services

```bash
systemctl restart station-blanche-backend
systemctl restart station-blanche-frontend
systemctl restart lightdm
```

---

## Nouvelles fonctionnalités ajoutées

### Interface Admin (http://localhost:3000/admin)
- 🔐 Login avec mot de passe (voir README pour les identifiants par défaut)
- 📊 Statistiques système (RAM, CPU, disque)
- 📝 Logs en temps réel
- 🔄 Mise à jour depuis GitHub
- ♻️ Redémarrage des services

### Écran de connexion personnalisé
- 🦉 Logo Owlcub
- 🎨 Fond bleu personnalisé
- 💼 Branding professionnel

### Scripts de gestion
- `./scripts/update.sh` - Mise à jour rapide (git pull + npm install)
- `./scripts/update-existing-station.sh` - Mise à jour complète avec customisation
- `./scripts/configure-firewall.sh` - Configuration sécurité UFW

---

## Vérification après mise à jour

```bash
# Vérifier que les services tournent
systemctl status station-blanche-backend
systemctl status station-blanche-frontend

# Vérifier l'interface graphique
systemctl status lightdm

# Voir les logs
journalctl -u station-blanche-backend -n 50
journalctl -u station-blanche-frontend -n 50

# Tester l'accès
curl http://localhost:8000/api/usb/connected
curl http://localhost:3000
```

---

## Dépannage

### L'écran de connexion n'est pas personnalisé

```bash
# Relancer la personnalisation
cd /opt/station-blanche
./scripts/customize-login-screen.sh

# Redémarrer lightdm
systemctl restart lightdm
```

### L'interface web ne se lance pas

```bash
# Vérifier les services
systemctl status station-blanche-backend
systemctl status station-blanche-frontend

# Redémarrer les services
systemctl restart station-blanche-backend
systemctl restart station-blanche-frontend
```

### Le mode kiosque ne démarre pas

```bash
# Vérifier l'autostart
ls -la /etc/xdg/autostart/station-blanche-kiosk.desktop

# Vérifier que le script kiosk existe
ls -la /opt/station-blanche/scripts/start-kiosk.sh

# Tester manuellement
/opt/station-blanche/scripts/start-kiosk.sh
```

---

## Rollback en cas de problème

Si la mise à jour pose problème :

```bash
cd /opt/station-blanche

# Revenir à la version précédente
git log --oneline  # Noter le hash du commit précédent
git reset --hard <hash-du-commit>

# Rebuilder
cd frontend
npm run build

# Redémarrer
systemctl restart station-blanche-backend
systemctl restart station-blanche-frontend
```

---

## Support

Pour toute question :
- Documentation : [docs/](docs/)
- Issues GitHub : https://github.com/Owlcub/station-blanche/issues
- Mode kiosque : [docs/MODE_KIOSQUE.md](docs/MODE_KIOSQUE.md)
