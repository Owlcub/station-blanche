#!/bin/bash

set -e

echo "================================================"
echo "  Installation Station Blanche"
echo "  Scanner USB, PC et Transfert sécurisé"
echo "  Mode Kiosque - Écran tactile"
echo "================================================"
echo ""

# Vérifier si root
if [ "$EUID" -ne 0 ]; then
    echo "❌ Ce script doit être exécuté en tant que root (sudo)"
    exit 1
fi

# Demander le mode d'installation
echo "Mode d'installation :"
echo "  1) Station autonome (kiosque avec écran tactile)"
echo "  2) Mode développement (sans kiosque)"
read -p "Choisir le mode [1/2] (défaut: 1): " INSTALL_MODE
INSTALL_MODE=${INSTALL_MODE:-1}

echo ""
echo "📦 Installation des dépendances système..."

# Détecter la distribution
if [ -f /etc/debian_version ]; then
    echo "Distribution Debian/Ubuntu détectée"
    apt-get update

    PACKAGES="nodejs npm python3 python3-pip clamav clamav-daemon rsync util-linux kpartx"

    # Ajouter les paquets pour le mode kiosque
    if [ "$INSTALL_MODE" = "1" ]; then
        # Détecter le bon paquet chromium selon la distribution (vérifier qu'il a un candidat installable)
        if apt-cache policy chromium-browser 2>/dev/null | grep -q "Candidat.*[0-9]"; then
            CHROMIUM_PKG="chromium-browser"
            echo "✅ chromium-browser détecté"
        elif apt-cache policy chromium 2>/dev/null | grep -q "Candidat.*[0-9]"; then
            CHROMIUM_PKG="chromium"
            echo "✅ chromium détecté"
        else
            echo "⚠️  Chromium non disponible, installation de Firefox comme alternative"
            CHROMIUM_PKG="firefox-esr"
        fi
        # Ajouter environnement graphique + navigateur + outils kiosque
        PACKAGES="$PACKAGES xorg lightdm openbox $CHROMIUM_PKG unclutter xdotool x11-xserver-utils"
    fi

    apt-get install -y $PACKAGES

elif [ -f /etc/redhat-release ]; then
    echo "Distribution RedHat/CentOS détectée"

    PACKAGES="nodejs npm python3 python3-pip clamav clamav-update rsync util-linux"

    # Ajouter les paquets pour le mode kiosque
    if [ "$INSTALL_MODE" = "1" ]; then
        PACKAGES="$PACKAGES chromium unclutter xdotool xorg-x11-server-utils"
    fi

    yum install -y $PACKAGES

else
    echo "⚠️  Distribution non reconnue, installation manuelle requise"
fi

echo ""
echo "📦 Installation des dépendances Python..."
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

cd "$PROJECT_DIR/backend"

# Sur Debian 13+ (Trixie), pip nécessite --break-system-packages ou venv
if pip3 install -r requirements.txt 2>&1 | grep -q "externally-managed-environment"; then
    echo "⚠️  Environnement Python géré, installation avec --break-system-packages"
    pip3 install --break-system-packages -r requirements.txt
fi

echo ""
echo "📦 Installation de Volatility 3 (analyse de memory dumps)..."
if pip3 install volatility3 2>&1 | grep -q "externally-managed-environment"; then
    echo "⚠️  Installation de Volatility 3 avec --break-system-packages"
    pip3 install --break-system-packages volatility3
fi

echo ""
echo "📦 Installation des dépendances Node.js (Backend)..."
npm install

echo ""
echo "📦 Installation des dépendances Node.js (Frontend)..."
cd "$PROJECT_DIR/frontend"
npm install

# Installer serve pour le mode production
npm install -g serve

echo ""
echo "🦠 Mise à jour de la base de signatures ClamAV..."
freshclam || echo "⚠️  Mise à jour ClamAV échouée (peut nécessiter une configuration)"

echo ""
echo "📁 Création des répertoires de données..."
mkdir -p /var/lib/cyberbox-station
mkdir -p /var/lib/cyberbox-station/quarantine
chmod 755 /var/lib/cyberbox-station

# Configuration mode kiosque
if [ "$INSTALL_MODE" = "1" ]; then
    echo ""
    echo "🖥️  Configuration du mode kiosque..."

    # Copier le projet vers /opt
    echo "Copie du projet vers /opt/station-blanche..."
    mkdir -p /opt/station-blanche
    cp -r "$PROJECT_DIR"/* /opt/station-blanche/

    # Rendre les scripts exécutables
    chmod +x /opt/station-blanche/scripts/*.sh

    # Builder le frontend
    echo "Build du frontend (cela peut prendre quelques minutes)..."
    cd /opt/station-blanche/frontend
    npm run build

    # Installer les services systemd
    echo "Installation des services systemd..."
    cp /opt/station-blanche/scripts/station-blanche-backend.service /etc/systemd/system/
    cp /opt/station-blanche/scripts/station-blanche-frontend.service /etc/systemd/system/

    # Activer les services
    systemctl daemon-reload
    systemctl enable station-blanche-backend.service
    systemctl enable station-blanche-frontend.service
    systemctl start station-blanche-backend.service
    systemctl start station-blanche-frontend.service

    # Configuration autostart pour l'interface graphique
    echo "Configuration du démarrage automatique de l'interface..."

    # Détecter l'utilisateur principal (celui qui va utiliser le kiosque)
    KIOSK_USER=$(awk -F: '$3 >= 1000 && $3 < 65534 {print $1; exit}' /etc/passwd)
    if [ -z "$KIOSK_USER" ]; then
        KIOSK_USER="admin-station"
    fi

    echo "Configuration d'autostart pour l'utilisateur : $KIOSK_USER"

    # Créer le fichier autostart Openbox pour cet utilisateur
    KIOSK_HOME=$(eval echo ~$KIOSK_USER)
    AUTOSTART_OPENBOX_DIR="$KIOSK_HOME/.config/openbox"
    mkdir -p "$AUTOSTART_OPENBOX_DIR"

    cat > "$AUTOSTART_OPENBOX_DIR/autostart" << 'EOF'
#!/bin/bash

# Désactiver l'écran de veille et le curseur
xset s off
xset -dpms
xset s noblank
unclutter -idle 0.1 &

# Attendre que les services soient prêts
sleep 5

# Lancer Chromium en mode kiosque (détecter le bon navigateur)
if command -v chromium &> /dev/null; then
    chromium --kiosk --noerrdialogs --disable-infobars --no-first-run --touch-events=enabled --enable-features=OverlayScrollbar http://localhost:3000 &
elif command -v chromium-browser &> /dev/null; then
    chromium-browser --kiosk --noerrdialogs --disable-infobars --no-first-run --touch-events=enabled --enable-features=OverlayScrollbar http://localhost:3000 &
elif command -v firefox &> /dev/null; then
    firefox --kiosk http://localhost:3000 &
fi
EOF

    chmod +x "$AUTOSTART_OPENBOX_DIR/autostart"
    chown -R "$KIOSK_USER:$KIOSK_USER" "$AUTOSTART_OPENBOX_DIR"

    echo "✅ Autostart configuré dans $AUTOSTART_OPENBOX_DIR/autostart"

    # Activer LightDM pour le démarrage automatique de l'interface graphique
    echo "Activation de l'interface graphique au démarrage..."
    systemctl enable lightdm

    # Personnaliser l'écran de connexion avec le logo Owlcub
    echo "Personnalisation de l'écran de connexion..."
    if [ -f "/opt/station-blanche/scripts/customize-login-screen.sh" ]; then
        echo "Y" | /opt/station-blanche/scripts/customize-login-screen.sh
    fi

    # Configurer sudo pour le reboot automatique
    echo "Configuration sudo pour reboot automatique..."
    if [ -f "/opt/station-blanche/scripts/configure-sudo-reboot.sh" ]; then
        /opt/station-blanche/scripts/configure-sudo-reboot.sh
    fi

    # Masquer les messages de boot pour un démarrage propre
    echo "Configuration du boot silencieux..."
    if [ -f "/opt/station-blanche/scripts/hide-boot-messages.sh" ]; then
        /opt/station-blanche/scripts/hide-boot-messages.sh
    fi

    echo ""
    echo "✅ Installation terminée en mode KIOSQUE !"
    echo ""
    echo "La station blanche démarrera automatiquement au démarrage du système."
    echo ""
    echo "Configuration :"
    echo "  ✅ Interface graphique activée (LightDM)"
    echo "  ✅ Services backend et frontend démarrés"
    echo "  ✅ Navigateur en mode kiosque configuré"
    echo ""
    echo "Commandes utiles :"
    echo "  - Redémarrer backend:  systemctl restart station-blanche-backend"
    echo "  - Redémarrer frontend: systemctl restart station-blanche-frontend"
    echo "  - Voir les logs:       journalctl -u station-blanche-backend -f"
    echo "  - Mettre à jour:       cd /opt/station-blanche && ./scripts/update.sh"
    echo "  - Accès manuel:        http://localhost:3000"
    echo ""
    if command -v systemctl &> /dev/null; then
        echo "⚠️  Redémarrez le système pour lancer le mode kiosque complet : systemctl reboot"
    elif [ -x /sbin/reboot ]; then
        echo "⚠️  Redémarrez le système pour lancer le mode kiosque complet : /sbin/reboot"
    else
        echo "⚠️  Redémarrez le système pour lancer le mode kiosque complet : reboot"
    fi
    echo ""

else
    echo ""
    echo "✅ Installation terminée en mode DÉVELOPPEMENT !"
    echo ""
    echo "Pour démarrer la station blanche :"
    echo "  1. Backend:  cd backend && npm start"
    echo "  2. Frontend: cd frontend && npm start"
    echo "  3. Accéder à http://localhost:3000"
    echo ""
fi
