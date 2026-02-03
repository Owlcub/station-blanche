#!/bin/bash

# Script de configuration des mises à jour automatiques
# - Mise à jour hebdomadaire du système (dimanche 2h du matin)
# - Redémarrage automatique après mise à jour

set -e

echo "================================================"
echo "  Configuration Mises à Jour Automatiques"
echo "================================================"
echo ""

# Vérifier si root
if [ "$EUID" -ne 0 ]; then
    echo "❌ Ce script doit être exécuté en tant que root"
    exit 1
fi

# Créer le script de mise à jour automatique
AUTO_UPDATE_SCRIPT="/usr/local/bin/station-blanche-auto-update.sh"

echo "1️⃣  Création du script de mise à jour automatique..."

cat > "$AUTO_UPDATE_SCRIPT" << 'EOF'
#!/bin/bash

# Script de mise à jour automatique de la Station Blanche
# Exécuté par cron hebdomadairement

LOG_FILE="/var/log/station-blanche-auto-update.log"
PROJECT_DIR="/opt/station-blanche"

echo "=========================================" >> "$LOG_FILE"
echo "Mise à jour automatique - $(date)" >> "$LOG_FILE"
echo "=========================================" >> "$LOG_FILE"

# Vérifier que le projet existe
if [ ! -d "$PROJECT_DIR" ]; then
    echo "❌ Projet non trouvé dans $PROJECT_DIR" >> "$LOG_FILE"
    exit 1
fi

cd "$PROJECT_DIR"

# Mise à jour du code depuis Git
echo "📥 Git pull..." >> "$LOG_FILE"
git pull origin main >> "$LOG_FILE" 2>&1

if [ $? -ne 0 ]; then
    echo "❌ Erreur git pull" >> "$LOG_FILE"
    exit 1
fi

# Mise à jour des dépendances npm si package.json a changé
if git diff --name-only HEAD@{1} HEAD | grep -q "frontend/package.json"; then
    echo "📦 Mise à jour npm..." >> "$LOG_FILE"
    cd frontend && npm install >> "$LOG_FILE" 2>&1 && cd ..
fi

# Rebuild du frontend
echo "🔨 Rebuild frontend..." >> "$LOG_FILE"
cd frontend && npm run build >> "$LOG_FILE" 2>&1 && cd ..

if [ $? -ne 0 ]; then
    echo "❌ Erreur build frontend" >> "$LOG_FILE"
    exit 1
fi

# Redémarrer les services
echo "🔄 Redémarrage services..." >> "$LOG_FILE"
systemctl restart station-blanche-backend >> "$LOG_FILE" 2>&1
systemctl restart station-blanche-frontend >> "$LOG_FILE" 2>&1

echo "✅ Mise à jour terminée avec succès" >> "$LOG_FILE"
echo "" >> "$LOG_FILE"

# Redémarrage système après mise à jour (pour appliquer mises à jour kernel si nécessaire)
echo "🔄 Redémarrage système programmé dans 2 minutes..." >> "$LOG_FILE"
shutdown -r +2 "Mise à jour automatique terminée - Redémarrage dans 2 minutes"
EOF

chmod +x "$AUTO_UPDATE_SCRIPT"
echo "✅ Script créé : $AUTO_UPDATE_SCRIPT"

# Créer le cron job pour les mises à jour hebdomadaires
CRON_FILE="/etc/cron.d/station-blanche-auto-update"

echo ""
echo "2️⃣  Configuration cron pour mise à jour hebdomadaire..."

cat > "$CRON_FILE" << EOF
# Mise à jour automatique Station Blanche
# Tous les dimanches à 2h du matin
0 2 * * 0 root $AUTO_UPDATE_SCRIPT
EOF

chmod 644 "$CRON_FILE"
echo "✅ Cron créé : $CRON_FILE"
echo "   Planification : Dimanche 2h00"

# Créer le fichier de log
touch /var/log/station-blanche-auto-update.log
chmod 644 /var/log/station-blanche-auto-update.log

echo ""
echo "3️⃣  Configuration logrotate..."

# Configurer la rotation des logs
LOGROTATE_FILE="/etc/logrotate.d/station-blanche-auto-update"

cat > "$LOGROTATE_FILE" << 'EOF'
/var/log/station-blanche-auto-update.log {
    weekly
    rotate 8
    compress
    delaycompress
    missingok
    notifempty
    create 644 root root
}
EOF

chmod 644 "$LOGROTATE_FILE"
echo "✅ Logrotate configuré"

echo ""
echo "================================================"
echo "  ✅ Configuration terminée !"
echo "================================================"
echo ""
echo "Mises à jour automatiques configurées :"
echo "  📅 Fréquence : Hebdomadaire (dimanche 2h)"
echo "  🔄 Actions :"
echo "     1. git pull origin main"
echo "     2. npm install (si nécessaire)"
echo "     3. npm run build"
echo "     4. Redémarrage services"
echo "     5. Redémarrage système (+2 min)"
echo ""
echo "  📝 Logs : /var/log/station-blanche-auto-update.log"
echo ""
echo "Pour tester manuellement :"
echo "  sudo $AUTO_UPDATE_SCRIPT"
echo ""
