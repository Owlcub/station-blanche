#!/bin/bash

# Script de démarrage en mode kiosque (navigateur plein écran)
# À placer dans ~/.config/autostart/ ou à lancer au démarrage

# Désactiver l'économiseur d'écran et la mise en veille
xset s off
xset -dpms
xset s noblank

# Masquer le curseur après 5 secondes d'inactivité (utile pour tactile)
unclutter -idle 5 &

# Attendre que les services soient prêts
sleep 10

# Lancer Chromium en mode kiosque
chromium-browser \
  --kiosk \
  --noerrdialogs \
  --disable-infobars \
  --disable-session-crashed-bubble \
  --disable-restore-session-state \
  --disable-pinch \
  --overscroll-history-navigation=0 \
  --touch-events=enabled \
  --enable-features=OverlayScrollbar \
  http://localhost:3000

# Alternative avec Firefox (si Chromium n'est pas disponible)
# firefox --kiosk http://localhost:3000
