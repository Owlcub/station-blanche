#!/bin/bash

# Script pour configurer sudo pour permettre le reboot sans mot de passe
# À exécuter en tant que root lors de l'installation

set -e

echo "================================================"
echo "  Configuration sudo pour reboot automatique"
echo "================================================"
echo ""

# Vérifier si root
if [ "$EUID" -ne 0 ]; then
    echo "❌ Ce script doit être exécuté en tant que root (sudo)"
    exit 1
fi

# Installer sudo si pas présent
if ! command -v sudo &> /dev/null; then
    echo "📦 Installation de sudo..."
    if [ -f /etc/debian_version ]; then
        apt-get update
        apt-get install -y sudo
    elif [ -f /etc/redhat-release ]; then
        yum install -y sudo
    else
        echo "❌ Distribution non supportée pour l'installation automatique de sudo"
        exit 1
    fi
    echo "✅ sudo installé"
fi

# Détecter l'utilisateur kiosque
KIOSK_USER=$(awk -F: '$3 >= 1000 && $3 < 65534 {print $1; exit}' /etc/passwd)
if [ -z "$KIOSK_USER" ]; then
    KIOSK_USER="admin-station"
fi

echo "👤 Utilisateur détecté : $KIOSK_USER"
echo ""

# Créer le fichier sudoers.d pour permettre le reboot sans mot de passe
SUDOERS_FILE="/etc/sudoers.d/station-blanche-reboot"

echo "📝 Configuration de sudo pour le reboot..."
cat > "$SUDOERS_FILE" << EOF
# Permettre à l'utilisateur $KIOSK_USER de redémarrer sans mot de passe
# Pour les mises à jour automatiques en mode kiosque
$KIOSK_USER ALL=(ALL) NOPASSWD: /sbin/reboot
$KIOSK_USER ALL=(ALL) NOPASSWD: /usr/sbin/reboot
$KIOSK_USER ALL=(ALL) NOPASSWD: /bin/systemctl reboot
$KIOSK_USER ALL=(ALL) NOPASSWD: /usr/bin/systemctl reboot
EOF

chmod 0440 "$SUDOERS_FILE"

# Vérifier la syntaxe du fichier sudoers (si visudo est disponible)
if command -v visudo &> /dev/null; then
    if visudo -c -f "$SUDOERS_FILE"; then
        echo "✅ Configuration sudo créée avec succès (syntaxe vérifiée)"
    else
        echo "❌ Erreur de syntaxe dans la configuration sudo"
        rm -f "$SUDOERS_FILE"
        exit 1
    fi
else
    echo "⚠️  visudo non disponible, syntaxe non vérifiée"
    echo "✅ Configuration sudo créée (vérification manuelle recommandée)"
fi

echo ""
echo "================================================"
echo "  ✅ Configuration terminée"
echo "================================================"
echo ""
echo "L'utilisateur $KIOSK_USER peut maintenant redémarrer avec :"
echo "  sudo reboot"
echo ""
echo "Sans mot de passe (nécessaire pour les mises à jour automatiques)"
