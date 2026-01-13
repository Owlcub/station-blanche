#!/bin/bash

# Script de démarrage automatique du backend
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$SCRIPT_DIR/../backend"

echo "🚀 Démarrage du backend Station Blanche..."

cd "$BACKEND_DIR"

# Attendre que le réseau soit prêt
sleep 5

# Démarrer le serveur backend
exec node server.js
