#!/bin/bash

# Script de configuration des mises à jour automatiques ClamAV
# - Mise à jour quotidienne des signatures (3h du matin)

set -e

echo "================================================"
echo "  Configuration Mises à Jour ClamAV"
echo "================================================"
echo ""

# Vérifier si root
if [ "$EUID" -ne 0 ]; then
    echo "❌ Ce script doit être exécuté en tant que root"
    exit 1
fi

# Installer freshclam si pas déjà fait
if ! command -v freshclam &> /dev/null; then
    echo "📦 Installation freshclam..."
    apt-get update && apt-get install -y clamav-freshclam
fi

# Configurer freshclam
FRESHCLAM_CONF="/etc/clamav/freshclam.conf"

echo "1️⃣  Configuration freshclam..."

# Vérifier que le fichier existe
if [ ! -f "$FRESHCLAM_CONF" ]; then
    echo "❌ Fichier $FRESHCLAM_CONF non trouvé"
    exit 1
fi

# Activer les mises à jour automatiques (24 checks par jour)
if grep -q "^#Checks" "$FRESHCLAM_CONF"; then
    sed -i 's/^#Checks.*/Checks 24/' "$FRESHCLAM_CONF"
elif ! grep -q "^Checks" "$FRESHCLAM_CONF"; then
    echo "Checks 24" >> "$FRESHCLAM_CONF"
fi

echo "✅ freshclam configuré (24 vérifications/jour)"

# Activer et démarrer le service freshclam
echo ""
echo "2️⃣  Activation du service freshclam..."

systemctl enable clamav-freshclam
systemctl restart clamav-freshclam

echo "✅ Service freshclam activé et démarré"

# Créer un cron supplémentaire pour garantir la mise à jour quotidienne
CRON_FILE="/etc/cron.d/clamav-freshclam"

echo ""
echo "3️⃣  Configuration cron pour mise à jour garantie..."

cat > "$CRON_FILE" << 'EOF'
# Mise à jour signatures ClamAV
# Tous les jours à 3h du matin
0 3 * * * clamav /usr/bin/freshclam --quiet
EOF

chmod 644 "$CRON_FILE"
echo "✅ Cron créé : $CRON_FILE"
echo "   Planification : Quotidienne 3h00"

# Faire une première mise à jour immédiate
echo ""
echo "4️⃣  Mise à jour initiale des signatures..."

# Arrêter le daemon temporairement pour éviter les conflits
systemctl stop clamav-freshclam

# Mise à jour
freshclam

# Redémarrer le daemon
systemctl start clamav-freshclam

# Redémarrer clamd si actif
if systemctl is-active --quiet clamav-daemon; then
    echo "   Redémarrage clamav-daemon..."
    systemctl restart clamav-daemon
fi

echo "✅ Signatures à jour"

echo ""
echo "================================================"
echo "  ✅ Configuration terminée !"
echo "================================================"
echo ""
echo "Mises à jour ClamAV configurées :"
echo "  📅 Fréquence : Quotidienne (3h du matin)"
echo "  🔄 Méthode : freshclam automatique + cron backup"
echo "  📊 Vérifications : 24x par jour"
echo ""
echo "Vérifier l'état :"
echo "  systemctl status clamav-freshclam"
echo "  tail -f /var/log/clamav/freshclam.log"
echo ""
echo "Mise à jour manuelle :"
echo "  sudo freshclam"
echo ""
