#!/bin/bash

# Script pour installer un thème Plymouth personnalisé Owlcub
# Affiche un écran de démarrage professionnel avec logo et messages

set -e

echo "================================================"
echo "  Installation Thème Plymouth Owlcub"
echo "================================================"
echo ""

# Vérifier si root
if [ "$EUID" -ne 0 ]; then
    echo "❌ Ce script doit être exécuté en tant que root"
    exit 1
fi

# Installer Plymouth si nécessaire
if ! command -v plymouth &> /dev/null; then
    echo "📦 Installation de Plymouth..."
    if [ -f /etc/debian_version ]; then
        apt-get update > /dev/null 2>&1
        apt-get install -y plymouth plymouth-themes > /dev/null 2>&1
        echo "✅ Plymouth installé"
    else
        echo "❌ Distribution non supportée"
        exit 1
    fi
fi

# Créer le répertoire du thème
THEME_DIR="/usr/share/plymouth/themes/owlcub-station"
mkdir -p "$THEME_DIR"

echo "🎨 Création du thème Owlcub..."

# Créer le fichier de configuration du thème
cat > "$THEME_DIR/owlcub-station.plymouth" << 'EOF'
[Plymouth Theme]
Name=Owlcub Station Blanche
Description=Thème de démarrage pour Station Blanche Owlcub
ModuleName=script

[script]
ImageDir=/usr/share/plymouth/themes/owlcub-station
ScriptFile=/usr/share/plymouth/themes/owlcub-station/owlcub-station.script
EOF

# Créer le script Plymouth (affichage graphique)
cat > "$THEME_DIR/owlcub-station.script" << 'EOF'
# Thème Plymouth Owlcub Station Blanche
# Affichage professionnel avec logo et messages

# Couleurs Owlcub (vert)
Window.SetBackgroundTopColor(0.063, 0.725, 0.506);    # #10b981
Window.SetBackgroundBottomColor(0.023, 0.400, 0.286); # #059669

# Charger le logo (si disponible)
logo.image = Image("logo.png");
logo.sprite = Sprite(logo.image);
logo.opacity = 1;

# Centrer le logo en haut
logo.x = Window.GetWidth() / 2 - logo.image.GetWidth() / 2;
logo.y = Window.GetHeight() / 3 - logo.image.GetHeight() / 2;
logo.sprite.SetPosition(logo.x, logo.y, 10);

# Titre
title.image = Image.Text("OWLCUB", 1, 1, 1, 1, "Sans Bold 48");
title.sprite = Sprite(title.image);
title.x = Window.GetWidth() / 2 - title.image.GetWidth() / 2;
title.y = logo.y + logo.image.GetHeight() + 40;
title.sprite.SetPosition(title.x, title.y, 10);

# Sous-titre
subtitle.image = Image.Text("Station Blanche", 1, 1, 1, 0.9, "Sans 24");
subtitle.sprite = Sprite(subtitle.image);
subtitle.x = Window.GetWidth() / 2 - subtitle.image.GetWidth() / 2;
subtitle.y = title.y + title.image.GetHeight() + 20;
subtitle.sprite.SetPosition(subtitle.x, subtitle.y, 10);

# Message de status
status_text = "Démarrage en cours...";

fun update_status(status) {
    status_text = status;
    status.image = Image.Text(status_text, 1, 1, 1, 0.8, "Sans 16");
    status.sprite = Sprite(status.image);
    status.x = Window.GetWidth() / 2 - status.image.GetWidth() / 2;
    status.y = Window.GetHeight() - 100;
    status.sprite.SetPosition(status.x, status.y, 10);
}

status.sprite = Sprite();
update_status(status);

# Animation de chargement (spinner)
spinner_images = [];
for (i = 0; i < 32; i++) {
    angle = i * 3.14159 * 2 / 32;
    x = Math.Sin(angle) * 20;
    y = Math.Cos(angle) * 20;

    spinner_image = Image.Text("●", 1, 1, 1, 1 - i / 32, "Sans 24");
    spinner_images[i] = spinner_image;
}

spinner.sprite = Sprite();
spinner.x = Window.GetWidth() / 2;
spinner.y = Window.GetHeight() - 150;

fun refresh_spinner() {
    spinner_index++;
    if (spinner_index >= 32) spinner_index = 0;

    spinner.sprite.SetImage(spinner_images[spinner_index]);
    spinner.sprite.SetPosition(spinner.x - spinner_images[spinner_index].GetWidth() / 2,
                               spinner.y - spinner_images[spinner_index].GetHeight() / 2,
                               10);
}

spinner_index = 0;
Plymouth.SetRefreshFunction(refresh_spinner);

# Messages en fonction des événements
fun boot_progress_cb(duration, progress) {
    if (progress < 0.2) {
        update_status(status);
        status_text = "Initialisation...";
    } else if (progress < 0.4) {
        update_status(status);
        status_text = "Chargement des modules...";
    } else if (progress < 0.6) {
        update_status(status);
        status_text = "Configuration réseau...";
    } else if (progress < 0.8) {
        update_status(status);
        status_text = "Démarrage des services...";
    } else {
        update_status(status);
        status_text = "Finalisation...";
    }
    update_status(status);
}

Plymouth.SetBootProgressFunction(boot_progress_cb);

# Message de mise à jour
fun update_status_cb(status) {
    if (status == "normal")
        update_status(status);
        status_text = "Station Blanche prête";
    else if (status == "update")
        update_status(status);
        status_text = "Mise à jour en cours...";
    else if (status == "install")
        update_status(status);
        status_text = "Installation...";
    else if (status == "reboot")
        update_status(status);
        status_text = "Redémarrage...";
    update_status(status);
}

Plymouth.SetUpdateStatusFunction(update_status_cb);

# Messages de démarrage/arrêt
fun quit_cb() {
    update_status(status);
    status_text = "Lancement de l'interface...";
    update_status(status);
}

Plymouth.SetQuitFunction(quit_cb);
EOF

# Créer un logo simple en ASCII art converti en image
# (À remplacer par le vrai logo Owlcub plus tard)
echo "📸 Création du logo..."

# Vérifier si ImageMagick est installé pour créer le logo
if command -v convert &> /dev/null; then
    # Créer un logo simple avec ImageMagick
    convert -size 200x200 xc:none \
            -fill white \
            -font "DejaVu-Sans-Bold" \
            -pointsize 48 \
            -gravity center \
            -annotate +0+0 "OWLCUB" \
            "$THEME_DIR/logo.png" 2>/dev/null || {
        # Si échec, créer un logo très simple
        convert -size 200x200 xc:white \
                -fill "#10b981" \
                -draw "circle 100,100 100,50" \
                "$THEME_DIR/logo.png" 2>/dev/null
    }
    echo "✅ Logo créé"
else
    # Créer un fichier vide si ImageMagick n'est pas disponible
    touch "$THEME_DIR/logo.png"
    echo "⚠️  ImageMagick non disponible, logo par défaut"
    echo "   Copiez votre logo en : $THEME_DIR/logo.png (200x200 px)"
fi

# Copier le logo Owlcub depuis le frontend si disponible
if [ -f "/opt/station-blanche/frontend/public/logo-owlcub.png" ]; then
    echo "📋 Copie du logo Owlcub depuis le frontend..."
    cp "/opt/station-blanche/frontend/public/logo-owlcub.png" "$THEME_DIR/logo.png"
    echo "✅ Logo Owlcub copié"
fi

# Définir les permissions
chmod 644 "$THEME_DIR"/*

echo "✅ Thème créé dans $THEME_DIR"

# Activer le thème
echo ""
echo "🔧 Activation du thème..."
update-alternatives --install /usr/share/plymouth/themes/default.plymouth default.plymouth \
    "$THEME_DIR/owlcub-station.plymouth" 100

update-alternatives --set default.plymouth "$THEME_DIR/owlcub-station.plymouth"

# Reconstruire l'initramfs
echo ""
echo "📦 Reconstruction de l'initramfs..."
if command -v update-initramfs &> /dev/null; then
    update-initramfs -u
    echo "✅ Initramfs mis à jour"
elif command -v dracut &> /dev/null; then
    dracut -f
    echo "✅ Initramfs mis à jour (dracut)"
fi

echo ""
echo "================================================"
echo "  ✅ Thème Plymouth Owlcub installé"
echo "================================================"
echo ""
echo "Modifications appliquées :"
echo "  ✅ Thème personnalisé créé"
echo "  ✅ Logo Owlcub configuré"
echo "  ✅ Messages professionnels"
echo "  ✅ Initramfs mis à jour"
echo ""
echo "⚠️  Redémarrez pour voir le nouveau thème"
echo ""
echo "Pour tester sans redémarrer :"
echo "  plymouthd; plymouth --show-splash"
echo "  (Ctrl+C pour arrêter)"
echo ""
