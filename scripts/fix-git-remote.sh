#!/bin/bash

# Script pour corriger l'accès GitHub en passant de SSH à HTTPS
# À exécuter sur la Station Blanche

set -e

echo "================================================"
echo "  Fix Git Remote - SSH vers HTTPS"
echo "================================================"
echo ""

cd /opt/station-blanche

echo "📋 Configuration actuelle :"
git remote -v

echo ""
echo "🔧 Passage de SSH à HTTPS..."

# Changer l'origin de SSH à HTTPS
git remote set-url origin https://github.com/Owlcub/station-blanche.git

echo ""
echo "✅ Nouvelle configuration :"
git remote -v

echo ""
echo "🧪 Test de connexion..."
if git ls-remote origin > /dev/null 2>&1; then
    echo "✅ Connexion GitHub réussie !"
else
    echo "❌ Échec de connexion à GitHub"
    exit 1
fi

echo ""
echo "📥 Test de mise à jour..."
git pull origin main

echo ""
echo "================================================"
echo "  ✅ Git configuré en HTTPS"
echo "  Le script update.sh devrait maintenant fonctionner"
echo "================================================"
