#!/bin/bash

# Script de personnalisation de l'écran de connexion LightDM
# Ajoute le logo Owlcub et personnalise l'interface

set -e

echo "================================================"
echo "  Personnalisation écran de connexion"
echo "  Owlcub Station Blanche"
echo "================================================"
echo ""

# Vérifier si root
if [ "$EUID" -ne 0 ]; then
    echo "❌ Ce script doit être exécuté en tant que root (sudo)"
    exit 1
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

echo "🎨 Personnalisation de LightDM..."

# Créer le répertoire pour les assets
mkdir -p /usr/share/pixmaps/owlcub

# Copier le logo (PNG prioritaire, sinon SVG)
if [ -f "$PROJECT_DIR/assets/logo-owlcub.png" ]; then
    cp "$PROJECT_DIR/assets/logo-owlcub.png" /usr/share/pixmaps/owlcub/
    echo "✅ Logo Owlcub (PNG) copié"
elif [ -f "$PROJECT_DIR/assets/logo-owlcub.svg" ]; then
    cp "$PROJECT_DIR/assets/logo-owlcub.svg" /usr/share/pixmaps/owlcub/
    echo "✅ Logo Owlcub (SVG) copié"
else
    echo "⚠️  Logo non trouvé"
fi

# Configuration LightDM principale (auto-login)
LIGHTDM_MAIN_CONF="/etc/lightdm/lightdm.conf"

# Détecter l'utilisateur principal (celui qui n'est pas root)
DEFAULT_USER=$(awk -F: '$3 >= 1000 && $3 < 65534 {print $1; exit}' /etc/passwd)

if [ -z "$DEFAULT_USER" ]; then
    DEFAULT_USER="admin-station"
    echo "⚠️  Aucun utilisateur détecté, utilisation de $DEFAULT_USER par défaut"
else
    echo "✅ Utilisateur détecté pour auto-login : $DEFAULT_USER"
fi

# Backup de la config existante
if [ -f "$LIGHTDM_MAIN_CONF" ]; then
    cp "$LIGHTDM_MAIN_CONF" "$LIGHTDM_MAIN_CONF.backup"
fi

# Créer la configuration principale avec auto-login
cat > "$LIGHTDM_MAIN_CONF" << EOF
[Seat:*]
# Auto-login sans mot de passe
autologin-user = $DEFAULT_USER
autologin-user-timeout = 0
autologin-session = openbox

# Greeter
greeter-session = lightdm-gtk-greeter
greeter-hide-users = false

# Session
user-session = openbox
EOF

echo "✅ Auto-login configuré pour l'utilisateur : $DEFAULT_USER"

# Configuration LightDM GTK Greeter
LIGHTDM_CONF="/etc/lightdm/lightdm-gtk-greeter.conf"

# Backup de la config existante
if [ -f "$LIGHTDM_CONF" ]; then
    cp "$LIGHTDM_CONF" "$LIGHTDM_CONF.backup"
fi

# Créer/modifier la configuration
cat > "$LIGHTDM_CONF" << 'EOF'
[greeter]
# Fond d'écran vert Owlcub
background = #10b981
theme-name = Adwaita
icon-theme-name = Adwaita
font-name = Sans 11

# Logo Owlcub
logo = /usr/share/pixmaps/owlcub/logo-owlcub.png

# Position des éléments
indicators = ~host;~spacer;~clock;~spacer;~session;~language;~a11y;~power
clock-format = %H:%M - %d/%m/%Y

# Masquer certains éléments
hide-user-image = false
show-indicators = ~host;~spacer;~clock;~spacer;~power

# Couleurs personnalisées
active-monitor = #0
EOF

echo "✅ Configuration LightDM GTK Greeter mise à jour"

# Installer lightdm-gtk-greeter si nécessaire
if ! dpkg -l | grep -q "lightdm-gtk-greeter"; then
    echo "📦 Installation de lightdm-gtk-greeter..."
    apt-get update
    apt-get install -y lightdm-gtk-greeter
fi

# Créer un fichier CSS personnalisé pour le greeter
mkdir -p /etc/lightdm/gtk-greeter.css.d

cat > /etc/lightdm/gtk-greeter.css.d/owlcub-theme.css << 'EOF'
/* Theme Owlcub Station Blanche - Vert #10b981 */

#panel_window {
    background-color: rgba(16, 185, 129, 0.95);
    color: #ffffff;
}

#login_window {
    background-color: rgba(255, 255, 255, 0.95);
    border-radius: 12px;
    padding: 20px;
}

#user_combobox {
    font-size: 14pt;
    font-weight: bold;
    color: #2d3748;
}

#login_window #user_image {
    border-radius: 50%;
    border: 3px solid #10b981;
}

.lightdm-gtk-greeter {
    background-image: none;
    background-color: #10b981;
}
EOF

echo "✅ Thème CSS personnalisé créé"

# Créer un message de bienvenue personnalisé
cat > /etc/issue << 'EOF'

   ╔═══════════════════════════════════════════════╗
   ║                                               ║
   ║        OWLCUB - STATION BLANCHE               ║
   ║        Scanner de Sécurité USB/PC             ║
   ║                                               ║
   ║        Développé par CupaDev                  ║
   ║                                               ║
   ╚═══════════════════════════════════════════════╝

EOF

echo "✅ Message de bienvenue personnalisé"

# Redémarrer LightDM pour appliquer les changements
echo ""
read -p "Voulez-vous redémarrer LightDM maintenant ? [Y/n] " RESTART_DM
RESTART_DM=${RESTART_DM:-Y}

if [ "$RESTART_DM" = "Y" ] || [ "$RESTART_DM" = "y" ]; then
    echo "🔄 Redémarrage de LightDM..."
    systemctl restart lightdm
    echo "✅ LightDM redémarré"
else
    echo "⚠️  Pensez à redémarrer LightDM : systemctl restart lightdm"
fi

echo ""
echo "✅ Personnalisation terminée !"
echo ""
echo "Modifications appliquées :"
echo "  ✅ Auto-login activé pour : $DEFAULT_USER"
echo "  ✅ Logo Owlcub affiché"
echo "  ✅ Fond d'écran bleu (#667eea)"
echo "  ✅ Message de bienvenue personnalisé"
echo "  ✅ Thème CSS Owlcub"
echo ""
echo "⚠️  IMPORTANT : La station se connectera automatiquement sans mot de passe"
echo ""
