#!/bin/bash

# Script pour builder et servir le frontend en mode production
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
FRONTEND_DIR="$SCRIPT_DIR/../frontend"

echo "🏗️  Building frontend Station Blanche..."

cd "$FRONTEND_DIR"

# Builder le frontend si nécessaire
if [ ! -d "build" ]; then
    npm run build
fi

# Servir le frontend avec un serveur HTTP simple
echo "🌐 Serveur frontend sur http://localhost:3000"
exec npx serve -s build -l 3000
