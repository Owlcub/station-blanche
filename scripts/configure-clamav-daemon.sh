#!/bin/bash

# Script pour configurer ClamAV en mode daemon (clamd)
# Le daemon est 10-20x plus rapide que clamscan

set -e

echo "================================================"
echo "  Configuration ClamAV Daemon (clamd)"
echo "================================================"
echo ""

# Vérifier si root
if [ "$EUID" -ne 0 ]; then
    echo "❌ Ce script doit être exécuté en tant que root"
    exit 1
fi

# Vérifier si ClamAV est installé
if ! command -v clamscan &> /dev/null; then
    echo "📦 Installation de ClamAV..."
    if [ -f /etc/debian_version ]; then
        apt-get update
        apt-get install -y clamav clamav-daemon clamav-freshclam
        echo "✅ ClamAV installé"
    else
        echo "❌ Distribution non supportée"
        exit 1
    fi
fi

# Arrêter les services pour configuration
echo "🔧 Configuration de ClamAV..."
systemctl stop clamav-daemon 2>/dev/null || true
systemctl stop clamav-freshclam 2>/dev/null || true

# Mettre à jour les signatures virales
echo "📥 Mise à jour des signatures virales..."
echo "   (Cela peut prendre quelques minutes...)"
freshclam || {
    echo "⚠️  Mise à jour freshclam échouée, utilisation des signatures existantes"
}

# Configuration de clamd pour performance optimale
CLAMD_CONF="/etc/clamav/clamd.conf"

if [ -f "$CLAMD_CONF" ]; then
    echo "⚙️  Optimisation de la configuration clamd..."

    # Backup
    cp "$CLAMD_CONF" "$CLAMD_CONF.backup.$(date +%Y%m%d_%H%M%S)"

    # Augmenter les performances
    sed -i 's/^#MaxThreads.*/MaxThreads 4/' "$CLAMD_CONF"           # 4 threads parallèles
    sed -i 's/^MaxThreads.*/MaxThreads 4/' "$CLAMD_CONF"

    sed -i 's/^#MaxQueue.*/MaxQueue 200/' "$CLAMD_CONF"             # Queue plus grande
    sed -i 's/^MaxQueue.*/MaxQueue 200/' "$CLAMD_CONF"

    sed -i 's/^#ReadTimeout.*/ReadTimeout 300/' "$CLAMD_CONF"      # Timeout 5min
    sed -i 's/^ReadTimeout.*/ReadTimeout 300/' "$CLAMD_CONF"

    sed -i 's/^#MaxDirectoryRecursion.*/MaxDirectoryRecursion 20/' "$CLAMD_CONF"
    sed -i 's/^MaxDirectoryRecursion.*/MaxDirectoryRecursion 20/' "$CLAMD_CONF"

    # Activer le multiscan
    if ! grep -q "^MaxThreads" "$CLAMD_CONF"; then
        echo "MaxThreads 4" >> "$CLAMD_CONF"
    fi

    echo "✅ Configuration clamd optimisée"
fi

# Démarrer et activer le daemon
echo "🚀 Démarrage du daemon ClamAV..."
systemctl enable clamav-daemon
systemctl start clamav-daemon

# Démarrer freshclam en daemon
systemctl enable clamav-freshclam
systemctl start clamav-freshclam

# Attendre que clamd soit prêt
echo "⏳ Attente du démarrage de clamd..."
for i in {1..30}; do
    if pgrep clamd > /dev/null 2>&1; then
        echo "✅ clamd démarré"
        break
    fi
    sleep 1
    echo -n "."
done
echo ""

# Vérifier le status
if pgrep clamd > /dev/null 2>&1; then
    echo ""
    echo "================================================"
    echo "  ✅ ClamAV Daemon configuré et actif"
    echo "================================================"
    echo ""
    echo "Avantages du mode daemon :"
    echo "  ✅ Scan 10-20x plus rapide"
    echo "  ✅ Multithreading activé (4 threads)"
    echo "  ✅ Signatures virales mises à jour automatiquement"
    echo "  ✅ Utilisation de clamdscan au lieu de clamscan"
    echo ""
    echo "Test rapide :"
    echo "  clamdscan --version"
    echo ""
else
    echo "❌ Erreur : clamd n'a pas démarré"
    echo "Vérifiez les logs : journalctl -u clamav-daemon -n 50"
    exit 1
fi
