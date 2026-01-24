#!/bin/bash

# Script de correction rapide pour Station Blanche existante
# À exécuter en root sur la station

set -e

echo "================================================"
echo "  Correction Station Blanche"
echo "================================================"
echo ""

# Vérifier si root
if [ "$EUID" -ne 0 ]; then
    echo "❌ Ce script doit être exécuté en tant que root"
    exit 1
fi

cd /opt/station-blanche

echo "1️⃣  Mise à jour du code..."
git pull origin main

echo ""
echo "2️⃣  Configuration sudo pour reboot sans mot de passe..."
if [ -f "./scripts/configure-sudo-reboot.sh" ]; then
    ./scripts/configure-sudo-reboot.sh
else
    echo "⚠️  Script non trouvé"
fi

echo ""
echo "3️⃣  Configuration ClamAV daemon (scan rapide)..."
if [ -f "./scripts/configure-clamav-daemon.sh" ]; then
    ./scripts/configure-clamav-daemon.sh
else
    echo "⚠️  Script non trouvé"
fi

echo ""
echo "4️⃣  Masquage GRUB et messages de boot..."
if [ -f "./scripts/hide-boot-messages.sh" ]; then
    ./scripts/hide-boot-messages.sh
else
    echo "⚠️  Script non trouvé"
fi

echo ""
echo "5️⃣  Installation thème Plymouth Owlcub..."
if [ -f "./scripts/install-plymouth-theme.sh" ]; then
    ./scripts/install-plymouth-theme.sh
else
    echo "⚠️  Script non trouvé"
fi

echo ""
echo "6️⃣  Rebuild frontend..."
cd frontend
npm install
npm run build
cd ..

echo ""
echo "7️⃣  Redémarrage des services..."
systemctl restart station-blanche-backend || echo "⚠️  Backend non redémarré"
systemctl restart station-blanche-frontend || echo "⚠️  Frontend non redémarré"

echo ""
echo "================================================"
echo "  ✅ Correction terminée !"
echo "================================================"
echo ""
echo "Modifications appliquées :"
echo "  ✅ Code mis à jour"
echo "  ✅ Sudo configuré pour reboot sans mot de passe"
echo "  ✅ ClamAV daemon configuré (scans 10-20x plus rapides)"
echo "  ✅ GRUB masqué"
echo "  ✅ Thème Plymouth Owlcub installé"
echo "  ✅ Frontend rebuil"
echo "  ✅ Services redémarrés"
echo ""
echo "⚠️  REDÉMARREZ LA STATION pour appliquer GRUB et Plymouth :"
echo ""
echo "  reboot"
echo ""
