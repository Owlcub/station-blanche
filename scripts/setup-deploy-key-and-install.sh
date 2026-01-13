#!/bin/bash

# Script d'installation complète pour micro PC
# Configure Deploy Key, clone le repo et installe en mode kiosque

set -e

echo "================================================"
echo "  Station Blanche - Installation Micro PC"
echo "  Configuration Deploy Key + Installation"
echo "================================================"
echo ""

# Étape 1 : Générer la clé SSH Deploy Key
echo "🔑 Génération de la clé SSH Deploy Key..."
SSH_KEY_PATH="$HOME/.ssh/station_blanche_key"

if [ -f "$SSH_KEY_PATH" ]; then
    echo "⚠️  Une clé existe déjà à $SSH_KEY_PATH"
    read -p "Voulez-vous la régénérer ? [y/N] " REGENERATE
    if [ "$REGENERATE" != "y" ] && [ "$REGENERATE" != "Y" ]; then
        echo "Utilisation de la clé existante..."
    else
        rm -f "$SSH_KEY_PATH" "$SSH_KEY_PATH.pub"
        ssh-keygen -t ed25519 -C "station-blanche-micro-pc" -f "$SSH_KEY_PATH" -N ""
    fi
else
    ssh-keygen -t ed25519 -C "station-blanche-micro-pc" -f "$SSH_KEY_PATH" -N ""
fi

echo ""
echo "================================================"
echo "  ✅ Clé SSH générée !"
echo "================================================"
echo ""
echo "📋 COPIEZ cette clé publique :"
echo ""
cat "$SSH_KEY_PATH.pub"
echo ""
echo "================================================"
echo ""
echo "📌 ACTIONS À FAIRE SUR GITHUB :"
echo ""
echo "1. Ouvrir : https://github.com/Owlcub/station-blanche/settings/keys"
echo "2. Cliquer sur 'Add deploy key'"
echo "3. Title : Station Blanche Micro PC"
echo "4. Coller la clé publique ci-dessus"
echo "5. ✅ Cocher 'Allow write access' (optionnel)"
echo "6. Cliquer 'Add key'"
echo ""
echo "================================================"
echo ""
read -p "Appuyez sur ENTRÉE une fois la clé ajoutée sur GitHub..."

# Étape 2 : Configurer SSH
echo ""
echo "🔧 Configuration SSH..."

SSH_CONFIG="$HOME/.ssh/config"
GITHUB_HOST_CONFIG="Host github-station
    HostName github.com
    User git
    IdentityFile $SSH_KEY_PATH
    StrictHostKeyChecking no"

if [ -f "$SSH_CONFIG" ]; then
    if grep -q "Host github-station" "$SSH_CONFIG"; then
        echo "⚠️  Configuration SSH déjà présente, mise à jour..."
        sed -i.bak '/Host github-station/,/^$/d' "$SSH_CONFIG"
    fi
fi

echo "$GITHUB_HOST_CONFIG" >> "$SSH_CONFIG"
chmod 600 "$SSH_CONFIG"
chmod 600 "$SSH_KEY_PATH"

echo "✅ Configuration SSH ajoutée"

# Étape 3 : Tester la connexion
echo ""
echo "🔍 Test de connexion à GitHub..."
if ssh -T github-station 2>&1 | grep -q "successfully authenticated"; then
    echo "✅ Connexion GitHub réussie !"
else
    echo "⚠️  Test de connexion (c'est normal si vous voyez un message d'authentification)"
fi

# Étape 4 : Cloner le repo
echo ""
echo "📥 Clonage du repository..."

CLONE_DIR="$HOME/station-blanche"
if [ -d "$CLONE_DIR" ]; then
    echo "⚠️  Le répertoire $CLONE_DIR existe déjà"
    read -p "Voulez-vous le supprimer et recloner ? [y/N] " RECLONE
    if [ "$RECLONE" = "y" ] || [ "$RECLONE" = "Y" ]; then
        rm -rf "$CLONE_DIR"
        git clone git@github-station:Owlcub/station-blanche.git "$CLONE_DIR"
    else
        echo "Utilisation du répertoire existant..."
    fi
else
    git clone git@github-station:Owlcub/station-blanche.git "$CLONE_DIR"
fi

echo "✅ Repository cloné dans $CLONE_DIR"

# Étape 5 : Lancer l'installation
echo ""
echo "================================================"
echo "  Installation de la Station Blanche"
echo "================================================"
echo ""
read -p "Voulez-vous lancer l'installation maintenant ? [Y/n] " INSTALL_NOW
INSTALL_NOW=${INSTALL_NOW:-Y}

if [ "$INSTALL_NOW" = "Y" ] || [ "$INSTALL_NOW" = "y" ]; then
    cd "$CLONE_DIR"

    # Vérifier si on est root
    if [ "$EUID" -eq 0 ]; then
        ./scripts/install.sh
    else
        echo ""
        echo "⚠️  L'installation nécessite les privilèges root"
        echo "Lancement avec sudo..."
        sudo ./scripts/install.sh
    fi
else
    echo ""
    echo "================================================"
    echo "  ✅ Configuration terminée !"
    echo "================================================"
    echo ""
    echo "Pour lancer l'installation plus tard :"
    echo "  cd $CLONE_DIR"
    echo "  sudo ./scripts/install.sh"
    echo ""
fi
