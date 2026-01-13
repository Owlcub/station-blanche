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

echo "📥 Vérification de la configuration git..."
# Vérifier si l'URL est en SSH et la convertir en HTTPS
CURRENT_URL=$(git remote get-url origin 2>/dev/null || echo "")
if [[ "$CURRENT_URL" == git@github.com:* ]] || [[ "$CURRENT_URL" == *"github-station"* ]]; then
    echo "🔧 Conversion de l'URL SSH en HTTPS..."
    git remote set-url origin https://github.com/Owlcub/station-blanche.git
    echo "✅ URL mise à jour vers HTTPS"
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
if [ -d "/opt/station-blanche" ] && [ "$IS_ROOT" = true ]; then
    echo ""
    echo "🏗️  Rebuild du frontend pour le mode kiosque..."
    npm run build
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
