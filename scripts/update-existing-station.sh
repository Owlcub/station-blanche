#!/bin/bash

# Script de mise à jour pour les stations blanches déjà installées
# Ajoute la personnalisation de l'écran de login sur les installations existantes

set -e

echo "================================================"
echo "  Mise à jour Station Blanche existante"
echo "  Ajout personnalisation écran de login"
echo "================================================"
echo ""

# Vérifier si root
if [ "$EUID" -ne 0 ]; then
    echo "❌ Ce script doit être exécuté en tant que root (sudo)"
    exit 1
fi

# Vérifier si on est dans une installation en mode kiosque
if [ ! -d "/opt/station-blanche" ]; then
    echo "❌ Erreur : Installation en mode kiosque non trouvée (/opt/station-blanche n'existe pas)"
    echo "Ce script est pour les stations blanches déjà installées en mode kiosque."
    echo ""
    echo "Pour une nouvelle installation, utilisez : ./scripts/install.sh"
    exit 1
fi

echo "📥 Mise à jour depuis GitHub..."
cd /opt/station-blanche
git pull origin main

echo ""
echo "📦 Mise à jour des dépendances backend..."
cd backend
npm install

echo ""
echo "📦 Mise à jour des dépendances frontend..."
cd ../frontend
npm install

# Vérifier si lightdm est installé
if ! command -v lightdm &> /dev/null; then
    echo ""
    echo "⚠️  LightDM n'est pas installé."
    read -p "Voulez-vous installer l'interface graphique maintenant ? [Y/n] " INSTALL_GUI
    INSTALL_GUI=${INSTALL_GUI:-Y}

    if [ "$INSTALL_GUI" = "Y" ] || [ "$INSTALL_GUI" = "y" ]; then
        echo "📦 Installation de l'interface graphique..."
        apt-get update

        # Détecter le navigateur disponible
        if apt-cache policy chromium 2>/dev/null | grep -q "Candidat.*[0-9]"; then
            BROWSER="chromium"
        elif apt-cache policy chromium-browser 2>/dev/null | grep -q "Candidat.*[0-9]"; then
            BROWSER="chromium-browser"
        else
            BROWSER="firefox-esr"
        fi

        apt-get install -y xorg lightdm openbox $BROWSER unclutter xdotool x11-xserver-utils
        systemctl enable lightdm
    fi
fi

echo ""
echo "🎨 Personnalisation de l'écran de connexion..."
if [ -f "/opt/station-blanche/scripts/customize-login-screen.sh" ]; then
    chmod +x /opt/station-blanche/scripts/customize-login-screen.sh
    echo "Y" | /opt/station-blanche/scripts/customize-login-screen.sh
else
    echo "⚠️  Script de personnalisation non trouvé"
fi

echo ""
echo "🏗️  Rebuild du frontend..."
cd /opt/station-blanche/frontend
npm run build

echo ""
echo "🔄 Redémarrage des services..."
systemctl restart station-blanche-backend
systemctl restart station-blanche-frontend

echo ""
echo "✅ Mise à jour terminée !"
echo ""
echo "Modifications appliquées :"
echo "  ✅ Code mis à jour depuis GitHub"
echo "  ✅ Dépendances npm mises à jour"
echo "  ✅ Frontend rebuilder"
echo "  ✅ Écran de login personnalisé (logo Owlcub)"
echo "  ✅ Services redémarrés"
echo ""
echo "Pour appliquer les changements d'interface graphique :"
echo "  systemctl restart lightdm"
echo "  # ou"
echo "  reboot"
echo ""
