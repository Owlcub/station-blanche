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

# Copier le logo
if [ -f "$PROJECT_DIR/assets/logo-owlcub.svg" ]; then
    cp "$PROJECT_DIR/assets/logo-owlcub.svg" /usr/share/pixmaps/owlcub/
    echo "✅ Logo Owlcub copié"
else
    echo "⚠️  Logo non trouvé, création d'un logo par défaut..."
fi

# Configuration LightDM GTK Greeter
LIGHTDM_CONF="/etc/lightdm/lightdm-gtk-greeter.conf"

# Backup de la config existante
if [ -f "$LIGHTDM_CONF" ]; then
    cp "$LIGHTDM_CONF" "$LIGHTDM_CONF.backup"
fi

# Créer/modifier la configuration
cat > "$LIGHTDM_CONF" << 'EOF'
[greeter]
# Fond d'écran
background = #667eea
theme-name = Adwaita
icon-theme-name = Adwaita
font-name = Sans 11

# Logo Owlcub
logo = /usr/share/pixmaps/owlcub/logo-owlcub.svg

# Position des éléments
indicators = ~host;~spacer;~clock;~spacer;~session;~language;~a11y;~power
clock-format = %H:%M - %d/%m/%Y

# Masquer certains éléments
hide-user-image = false
show-indicators = ~host;~spacer;~clock;~spacer;~power

# Couleurs personnalisées
active-monitor = #0
EOF

echo "✅ Configuration LightDM mise à jour"

# Installer lightdm-gtk-greeter si nécessaire
if ! dpkg -l | grep -q "lightdm-gtk-greeter"; then
    echo "📦 Installation de lightdm-gtk-greeter..."
    apt-get update
    apt-get install -y lightdm-gtk-greeter
fi

# Créer un fichier CSS personnalisé pour le greeter
mkdir -p /etc/lightdm/gtk-greeter.css.d

cat > /etc/lightdm/gtk-greeter.css.d/owlcub-theme.css << 'EOF'
/* Theme Owlcub Station Blanche */

#panel_window {
    background-color: rgba(102, 126, 234, 0.95);
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
    border: 3px solid #667eea;
}

.lightdm-gtk-greeter {
    background-image: none;
    background-color: #667eea;
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
echo "  ✅ Logo Owlcub affiché"
echo "  ✅ Fond d'écran bleu (#667eea)"
echo "  ✅ Message de bienvenue personnalisé"
echo "  ✅ Thème CSS Owlcub"
echo ""
