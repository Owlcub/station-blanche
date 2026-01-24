#!/bin/bash

# Script de mise à jour de la Station Blanche
# À exécuter après un git pull pour mettre à jour les dépendances et redémarrer les services

set -e

echo "================================================"
echo "  Mise à jour Station Blanche"
echo "================================================"
echo ""

# Vérifier si on est dans le bon répertoire
if [ ! -d "backend" ] || [ ! -d "frontend" ]; then
    echo "❌ Erreur : ce script doit être exécuté depuis le répertoire racine de station-blanche"
    exit 1
fi

# Vérifier si root pour les services systemd
IS_ROOT=false
if [ "$EUID" -eq 0 ]; then
    IS_ROOT=true
fi

echo "📥 Récupération des dernières modifications depuis GitHub..."
git pull origin main

echo ""
echo "📦 Mise à jour des dépendances backend..."
cd backend
npm install
cd ..

echo ""
echo "📦 Mise à jour des dépendances frontend..."
cd frontend
npm install

# Si en mode kiosque (/opt/station-blanche existe), rebuild le frontend
if [ -d "/opt/station-blanche" ]; then
    echo ""
    echo "🏗️  Rebuild du frontend pour le mode kiosque..."
    npm run build
else
    echo ""
    echo "ℹ️  Mode développement - pas de rebuild (utilisez 'npm start')"
fi

cd ..

# Redémarrer les services si on est root et que les services existent
if [ "$IS_ROOT" = true ]; then
    if systemctl list-units --type=service | grep -q "station-blanche-backend"; then
        echo ""
        echo "🔄 Redémarrage des services..."
        systemctl restart station-blanche-backend
        systemctl restart station-blanche-frontend
        echo "✅ Services redémarrés"
    else
        echo ""
        echo "ℹ️  Les services systemd ne sont pas configurés (mode développement)"
    fi
else
    echo ""
    echo "⚠️  Vous n'êtes pas root, impossible de redémarrer les services systemd"
    echo "Pour redémarrer les services, exécutez :"
    echo "  sudo systemctl restart station-blanche-backend"
    echo "  sudo systemctl restart station-blanche-frontend"
fi

echo ""
echo "✅ Mise à jour terminée !"
echo ""

# Afficher la version actuelle (dernier commit)
echo "Version actuelle :"
git log -1 --oneline
echo ""

# Redémarrage automatique en mode kiosque
if [ -d "/opt/station-blanche" ]; then
    echo "================================================"
    echo "  🔄 Redémarrage automatique"
    echo "================================================"
    echo ""
    echo "Mode kiosque détecté - Redémarrage dans 10 secondes..."
    echo "Les modifications seront appliquées au prochain démarrage."
    echo ""

    # Countdown
    for i in 10 9 8 7 6 5 4 3 2 1; do
        echo -ne "\rRedémarrage dans $i secondes... "
        sleep 1
    done
    echo ""
    echo ""
    echo "🔄 Redémarrage en cours..."

    # Trouver la commande de redémarrage appropriée
    if [ "$IS_ROOT" = true ]; then
        if command -v systemctl &> /dev/null; then
            systemctl reboot
        elif [ -x /sbin/reboot ]; then
            /sbin/reboot
        elif [ -x /usr/sbin/reboot ]; then
            /usr/sbin/reboot
        else
            reboot
        fi
    elif command -v sudo &> /dev/null; then
        if command -v systemctl &> /dev/null; then
            sudo systemctl reboot
        else
            sudo reboot
        fi
    else
        # Pas de sudo, utiliser su -c avec mot de passe automatique
        # En mode kiosque, on suppose que l'utilisateur a les droits ou qu'on est root
        echo "⚠️  Impossible de redémarrer automatiquement"
        echo "Veuillez redémarrer manuellement avec :"
        if command -v systemctl &> /dev/null; then
            echo "  su -c 'systemctl reboot'"
        elif [ -x /sbin/reboot ]; then
            echo "  su -c '/sbin/reboot'"
        else
            echo "  su -c 'reboot'"
        fi
        exit 1
    fi
fi
