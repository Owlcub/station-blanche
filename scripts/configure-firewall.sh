#!/bin/bash

# Script de configuration du firewall UFW pour la Station Blanche
# Protège la station en autorisant uniquement les connexions nécessaires

set -e

echo "================================================"
echo "  Configuration Firewall - Station Blanche"
echo "================================================"
echo ""

# Vérifier si root
if [ "$EUID" -ne 0 ]; then
    echo "❌ Ce script doit être exécuté en tant que root (sudo)"
    exit 1
fi

# Installer UFW si nécessaire
if ! command -v ufw &> /dev/null; then
    echo "📦 Installation de UFW..."
    if [ -f /etc/debian_version ]; then
        apt-get update
        apt-get install -y ufw
    elif [ -f /etc/redhat-release ]; then
        yum install -y ufw
    fi
fi

echo "🔥 Configuration du firewall..."

# Réinitialiser UFW (demander confirmation)
read -p "Voulez-vous réinitialiser les règles UFW ? [y/N] " RESET_UFW
if [ "$RESET_UFW" = "y" ] || [ "$RESET_UFW" = "Y" ]; then
    ufw --force reset
fi

# Politique par défaut : bloquer tout entrant, autoriser sortant
ufw default deny incoming
ufw default allow outgoing

# SSH : autoriser depuis le réseau local uniquement (192.168.0.0/16)
echo "✅ Autorisation SSH depuis réseau local (192.168.0.0/16)"
ufw allow from 192.168.0.0/16 to any port 22 proto tcp comment 'SSH réseau local'

# Frontend (port 3000) : autoriser depuis réseau local uniquement
echo "✅ Autorisation Frontend (port 3000) depuis réseau local"
ufw allow from 192.168.0.0/16 to any port 3000 proto tcp comment 'Frontend Station Blanche'

# Backend (port 8000) : autoriser depuis localhost uniquement
echo "✅ Autorisation Backend (port 8000) depuis localhost uniquement"
ufw allow from 127.0.0.1 to any port 8000 proto tcp comment 'Backend Station Blanche'
ufw allow from ::1 to any port 8000 proto tcp comment 'Backend Station Blanche IPv6'

# Autoriser aussi depuis réseau local pour l'admin web
ufw allow from 192.168.0.0/16 to any port 8000 proto tcp comment 'Backend Admin réseau local'

# Loopback
ufw allow in on lo
ufw allow out on lo

# Activer le firewall
echo ""
read -p "Voulez-vous activer le firewall maintenant ? [Y/n] " ENABLE_FW
ENABLE_FW=${ENABLE_FW:-Y}

if [ "$ENABLE_FW" = "Y" ] || [ "$ENABLE_FW" = "y" ]; then
    ufw --force enable
    echo "✅ Firewall activé"
else
    echo "⚠️  Firewall configuré mais pas activé"
    echo "Pour l'activer plus tard : sudo ufw enable"
fi

echo ""
echo "📋 État du firewall :"
ufw status verbose

echo ""
echo "✅ Configuration firewall terminée !"
echo ""
echo "Règles appliquées :"
echo "  - SSH (22) : réseau local uniquement"
echo "  - Frontend (3000) : réseau local uniquement"
echo "  - Backend (8000) : localhost + réseau local"
echo "  - Tout le reste : BLOQUÉ"
echo ""
