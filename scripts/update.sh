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

# Proposer un redémarrage complet
if [ -d "/opt/station-blanche" ]; then
    echo "================================================"
    echo "  ⚠️  Redémarrage recommandé"
    echo "================================================"
    echo ""
    echo "Pour appliquer complètement les modifications,"
    echo "il est recommandé de redémarrer la Station Blanche."
    echo ""
    read -p "Voulez-vous redémarrer maintenant ? [y/N] " REBOOT_NOW

    if [ "$REBOOT_NOW" = "y" ] || [ "$REBOOT_NOW" = "Y" ]; then
        echo ""
        echo "🔄 Redémarrage dans 5 secondes..."
        sleep 5
        if [ "$IS_ROOT" = true ]; then
            reboot
        else
            sudo reboot
        fi
    else
        echo ""
        echo "Pour redémarrer plus tard, exécutez :"
        echo "  sudo reboot"
        echo ""
    fi
fi
