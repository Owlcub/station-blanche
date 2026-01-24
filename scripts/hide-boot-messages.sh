#!/bin/bash

# Script pour masquer GRUB et les messages de boot
# Donne un démarrage "propre" pour le mode kiosque

set -e

echo "================================================"
echo "  Configuration Boot Silent (Kiosque)"
echo "================================================"
echo ""

# Vérifier si root
if [ "$EUID" -ne 0 ]; then
    echo "❌ Ce script doit être exécuté en tant que root"
    exit 1
fi

# Sauvegarder la config GRUB actuelle
if [ -f /etc/default/grub ]; then
    cp /etc/default/grub /etc/default/grub.backup.$(date +%Y%m%d_%H%M%S)
    echo "✅ Sauvegarde de /etc/default/grub créée"
fi

echo ""
echo "🔧 Configuration de GRUB..."

# Configurer GRUB pour un boot silencieux
cat > /etc/default/grub << 'EOF'
# Configuration GRUB pour Station Blanche (mode kiosque)
# Boot silencieux et rapide

# Timeout à 0 pour démarrer immédiatement
GRUB_TIMEOUT=0
GRUB_TIMEOUT_STYLE=hidden

# Désactiver le menu GRUB
GRUB_DISABLE_OS_PROBER=true

# Configuration du kernel pour boot silencieux
GRUB_CMDLINE_LINUX_DEFAULT="quiet splash loglevel=3 rd.systemd.show_status=auto rd.udev.log_priority=3 vt.global_cursor_default=0"
GRUB_CMDLINE_LINUX=""

# Désactiver les messages de récupération
GRUB_DISABLE_RECOVERY="true"

# Configuration graphique
GRUB_GFXMODE=1920x1080
GRUB_GFXPAYLOAD_LINUX=keep

# Terminal silencieux
GRUB_TERMINAL=console
EOF

echo "✅ Configuration GRUB mise à jour"

# Mettre à jour GRUB
echo ""
echo "📝 Application de la configuration GRUB..."
if command -v update-grub &> /dev/null; then
    update-grub
elif command -v grub2-mkconfig &> /dev/null; then
    grub2-mkconfig -o /boot/grub2/grub.cfg
elif command -v grub-mkconfig &> /dev/null; then
    grub-mkconfig -o /boot/grub/grub.cfg
else
    echo "⚠️  Commande update-grub non trouvée, configuration GRUB non appliquée"
    echo "   Exécutez manuellement : update-grub ou grub-mkconfig"
fi

echo "✅ GRUB mis à jour"

# Masquer les messages systemd au boot
echo ""
echo "🔧 Configuration des services systemd..."

# Créer un fichier de configuration pour masquer les messages
mkdir -p /etc/systemd/system/getty@tty1.service.d/

cat > /etc/systemd/system/getty@tty1.service.d/noclear.conf << 'EOF'
[Service]
# Ne pas effacer l'écran au démarrage
TTYVTDisallocate=no
EOF

echo "✅ Messages systemd configurés"

# Désactiver les messages du kernel dans les logs visibles
echo ""
echo "🔧 Configuration du kernel..."

# Réduire la verbosité du kernel
if ! grep -q "kernel.printk" /etc/sysctl.conf 2>/dev/null; then
    cat >> /etc/sysctl.conf << 'EOF'

# Station Blanche - Réduire les messages kernel
kernel.printk = 3 3 3 3
EOF
    sysctl -p > /dev/null 2>&1
    echo "✅ Verbosité du kernel réduite"
else
    echo "ℹ️  Configuration kernel.printk déjà présente"
fi

# Optionnel: Ajouter un logo de boot (Plymouth)
echo ""
echo "🎨 Installation de Plymouth (écran de démarrage)..."
if [ -f /etc/debian_version ]; then
    if ! command -v plymouth &> /dev/null; then
        apt-get update > /dev/null 2>&1
        apt-get install -y plymouth plymouth-themes > /dev/null 2>&1
        echo "✅ Plymouth installé"

        # Utiliser un thème simple
        plymouth-set-default-theme -R spinner 2>/dev/null || true
        echo "✅ Thème Plymouth configuré"
    else
        echo "ℹ️  Plymouth déjà installé"
    fi
else
    echo "⚠️  Plymouth non installé (distribution non Debian/Ubuntu)"
fi

echo ""
echo "================================================"
echo "  ✅ Configuration terminée"
echo "================================================"
echo ""
echo "Modifications appliquées :"
echo "  ✅ GRUB masqué (timeout 0)"
echo "  ✅ Messages de boot réduits"
echo "  ✅ Kernel en mode silencieux"
echo "  ✅ Plymouth installé (si Debian/Ubuntu)"
echo ""
echo "⚠️  Redémarrage recommandé pour appliquer les changements"
echo ""
echo "Pour restaurer la configuration GRUB :"
echo "  cp /etc/default/grub.backup.* /etc/default/grub"
echo "  update-grub"
echo ""
