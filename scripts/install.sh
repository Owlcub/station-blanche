#!/bin/bash

set -e

echo "================================================"
echo "  Installation Station Blanche"
echo "  Scanner USB, PC et Transfert sécurisé"
echo "================================================"
echo ""

# Vérifier si root
if [ "$EUID" -ne 0 ]; then
    echo "❌ Ce script doit être exécuté en tant que root (sudo)"
    exit 1
fi

echo "📦 Installation des dépendances système..."

# Détecter la distribution
if [ -f /etc/debian_version ]; then
    echo "Distribution Debian/Ubuntu détectée"
    apt-get update
    apt-get install -y \
        nodejs \
        npm \
        python3 \
        python3-pip \
        clamav \
        clamav-daemon \
        rsync \
        util-linux

elif [ -f /etc/redhat-release ]; then
    echo "Distribution RedHat/CentOS détectée"
    yum install -y \
        nodejs \
        npm \
        python3 \
        python3-pip \
        clamav \
        clamav-update \
        rsync \
        util-linux

else
    echo "⚠️  Distribution non reconnue, installation manuelle requise"
fi

echo ""
echo "📦 Installation des dépendances Python..."
cd backend
pip3 install -r requirements.txt

echo ""
echo "📦 Installation des dépendances Node.js (Backend)..."
npm install

echo ""
echo "📦 Installation des dépendances Node.js (Frontend)..."
cd ../frontend
npm install

echo ""
echo "🦠 Mise à jour de la base de signatures ClamAV..."
freshclam || echo "⚠️  Mise à jour ClamAV échouée (peut nécessiter une configuration)"

echo ""
echo "📁 Création des répertoires de données..."
mkdir -p /var/lib/cyberbox-station
mkdir -p /var/lib/cyberbox-station/quarantine
chmod 755 /var/lib/cyberbox-station

echo ""
echo "✅ Installation terminée !"
echo ""
echo "Pour démarrer la station blanche :"
echo "  1. Backend:  cd backend && npm start"
echo "  2. Frontend: cd frontend && npm start"
echo "  3. Accéder à http://localhost:3000"
echo ""
