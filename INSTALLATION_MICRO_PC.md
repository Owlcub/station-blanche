# Installation sur Micro PC - Guide Rapide

## Prérequis

- Micro PC accessible en SSH : `192.168.1.64`
- User : `admin-station` (mot de passe : `CyberBox-Station-Admin`)
- Ou root : `root` (mot de passe : `CyberBox-StationBlanche`)

## Méthode 1 : Installation automatique (recommandé)

### Depuis votre Mac

1. **Transférer le script sur le micro PC**

```bash
scp scripts/setup-deploy-key-and-install.sh admin-station@192.168.1.64:~/
```

2. **Se connecter au micro PC**

```bash
ssh admin-station@192.168.1.64
```

3. **Lancer le script**

```bash
chmod +x setup-deploy-key-and-install.sh
./setup-deploy-key-and-install.sh
```

Le script va :
- ✅ Générer une clé SSH Deploy Key
- ✅ Afficher la clé à copier sur GitHub
- ✅ Attendre que vous l'ajoutiez
- ✅ Configurer SSH automatiquement
- ✅ Cloner le repository
- ✅ Lancer l'installation en mode kiosque

### Sur GitHub

Quand le script affiche la clé publique :

1. Ouvrir : https://github.com/Owlcub/station-blanche/settings/keys
2. **Add deploy key**
3. Title : `Station Blanche Micro PC`
4. Coller la clé publique
5. ✅ Cocher **"Allow write access"** (optionnel)
6. **Add key**
7. Retourner au terminal et appuyer sur ENTRÉE

---

## Méthode 2 : Installation manuelle

### Sur le micro PC

```bash
# Connexion SSH
ssh admin-station@192.168.1.64

# Générer la clé Deploy Key
ssh-keygen -t ed25519 -C "station-blanche-micro-pc" -f ~/.ssh/station_blanche_key

# Afficher la clé publique
cat ~/.ssh/station_blanche_key.pub
# Copier cette clé
```

### Sur GitHub

1. https://github.com/Owlcub/station-blanche/settings/keys
2. **Add deploy key**
3. Coller la clé, cocher "Allow write access"
4. **Add key**

### Retour sur le micro PC

```bash
# Configurer SSH
cat >> ~/.ssh/config << 'EOF'
Host github-station
    HostName github.com
    User git
    IdentityFile ~/.ssh/station_blanche_key
    StrictHostKeyChecking no
EOF

chmod 600 ~/.ssh/config
chmod 600 ~/.ssh/station_blanche_key

# Cloner le repo
git clone git@github-station:Owlcub/station-blanche.git
cd station-blanche

# Installer
sudo ./scripts/install.sh
# Choisir option 1 : Station autonome (kiosque)

# Redémarrer
sudo reboot
```

---

## Méthode 3 : Sans Git (téléchargement ZIP)

Si le repo est public :

```bash
# Sur le micro PC
wget https://github.com/Owlcub/station-blanche/archive/refs/heads/main.zip
unzip main.zip
cd station-blanche-main
sudo ./scripts/install.sh
sudo reboot
```

---

## Méthode 4 : Transfert par USB

### Sur votre Mac

```bash
cd /Users/romainbogdanovic/Desktop
tar czf station-blanche.tar.gz station-blanche/
# Copier sur clé USB
```

### Sur le micro PC

```bash
# Monter la clé USB (ex: /media/usb)
tar xzf /media/usb/station-blanche.tar.gz
cd station-blanche
sudo ./scripts/install.sh
sudo reboot
```

---

## Après installation

L'interface web se lancera automatiquement en plein écran au démarrage.

### Commandes utiles

```bash
# Voir les logs
sudo journalctl -u station-blanche-backend -f
sudo journalctl -u station-blanche-frontend -f

# Redémarrer les services
sudo systemctl restart station-blanche-backend
sudo systemctl restart station-blanche-frontend

# Accès manuel
http://localhost:3000
```

### Sortir du mode kiosque

- **Alt + F4** : Fermer le navigateur
- **Ctrl + Alt + F2** : Terminal TTY2
- **Ctrl + Alt + F7** : Retour interface graphique

---

## Dépannage

### Erreur de connexion Git

```bash
# Tester la connexion
ssh -T github-station

# Régénérer la clé
rm ~/.ssh/station_blanche_key*
ssh-keygen -t ed25519 -C "station-blanche" -f ~/.ssh/station_blanche_key
cat ~/.ssh/station_blanche_key.pub
# Mettre à jour sur GitHub
```

### Services ne démarrent pas

```bash
sudo systemctl status station-blanche-backend
sudo systemctl status station-blanche-frontend
sudo journalctl -xe
```

### Interface ne s'affiche pas

```bash
# Vérifier que les services tournent
curl http://localhost:8000/api/usb/connected
curl http://localhost:3000

# Relancer manuellement
/opt/station-blanche/scripts/start-kiosk.sh
```

---

## Support

Documentation complète : [docs/MODE_KIOSQUE.md](docs/MODE_KIOSQUE.md)
