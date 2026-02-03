# Boîtier Tout-en-Un Station Blanche 10.1"

## 🎯 Concept

Boîtier compact intégrant :
- Écran tactile 10.1" en façade
- Carte mère Mini-ITX (Intel N97) derrière l'écran
- 2x ports USB frontaux
- 1x port RJ45 (réseau)
- 1x port alimentation DC

**Design ultra-compact et professionnel**

---

## 📐 Dimensions des Composants

### Écran Tactile Elecrow 10.1" (SF101T recommandé)

**Modèle** : Elecrow SF101T Full HD
- **Résolution** : 1920x1080 IPS
- **Tactile** : 10-point capacitif
- **Dimensions écran** :
  - Largeur : 246 mm
  - Hauteur : 163 mm
  - Épaisseur : **33 mm** (avec boîtier)
  - Épaisseur dalle seule : ~5 mm
- **Zone active** : 222 x 125 mm
- **Ports** : HDMI + USB tactile + alimentation
- **Prix** : ~120€

**Alternative** : Elecrow 10.1" 1280x800
- Dimensions similaires : 246 x 163 x 33 mm
- Plus économique : ~80€
- ⚠️ Résolution inférieure

### Carte Mère Mini-ITX (Jetway JMTX-ADN1)

**Modèle** : Jetway JMTX-ADN1 Intel N97
- **Format** : Mini-ITX standard
- **Dimensions** : **170 x 170 mm** (6.7" x 6.7")
- **Épaisseur** : ~25 mm (avec composants)
- **Processeur** : Intel N97 soudé (fanless)
- **RAM** : 1x SO-DIMM DDR5 (jusqu'à 32GB)
- **Stockage** : 1x M.2 2280 NVMe
- **Réseau** : 2x 2.5GbE Intel
- **USB** : 4x USB 3.2 + 2x USB 2.0
- **Alimentation** : DC 12-19V
- **Prix** : ~180-250€

**Alternative économique** : Carte NUC barebone
- Format plus compact : 120 x 120 mm
- Prix similaire
- Moins d'évolutivité

### Autres Composants

**RAM SO-DIMM DDR5** :
- Dimensions : 69.6 x 30 mm
- Épaisseur : 3.5 mm
- 8GB : ~40€

**SSD M.2 2280 NVMe** :
- Dimensions : 80 x 22 x 2.3 mm
- 256GB : ~30€

**Adaptateur DC 12V** :
- Externe (type laptop)
- Sortie : DC 5.5x2.5mm barrel jack
- Prix : ~15€

---

## 📦 Conception du Boîtier

### Dimensions Totales du Boîtier

```
Vue de face :                    Vue de profil :

┌─────────────────────┐         ┌──────┐
│                     │         │      │
│   ÉCRAN TACTILE     │         │ÉCRAN │ 33mm
│      10.1"          │         │      │
│    (246x163mm)      │         ├──────┤
│                     │         │ VIDE │ 10mm (passage air)
│  ┌─┐           ┌─┐ │         ├──────┤
│  │U│ [  RJ45 ] │O│ │         │ MÈRE │ 25mm (carte + composants)
│  │S│           │N│ │         │ ITX  │
│  │B│           │││ │         ├──────┤
└──┴─┴───────────┴─┴─┘         │ FOND │ 5mm (plastique/alu)
                                └──────┘
Largeur : 280mm                 Profondeur totale : 73mm
Hauteur : 200mm
```

**Dimensions finales boîtier :**
- **Largeur** : 280 mm (écran 246mm + bordures 17mm de chaque côté)
- **Hauteur** : 200 mm (écran 163mm + zone ports bas 37mm)
- **Profondeur** : 73 mm (écran 33mm + espace 10mm + carte 25mm + fond 5mm)

**Poids total estimé** : ~1.5 kg

---

## 🔧 Design Détaillé du Boîtier

### Vue Éclatée des Couches

```
Avant ← → Arrière

[1] Vitre/Cadre avant (écran tactile monté)
         ↓
[2] Compartiment écran (33mm)
         ↓
[3] Espace ventilation (10mm - grilles latérales)
         ↓
[4] Compartiment carte mère (25mm)
         ↓
[5] Fond boîtier avec découpes câbles (5mm)
```

### Face Avant (Façade Utilisateur)

```
┌───────────────────────────────┐
│                               │
│                               │
│       ÉCRAN TACTILE           │
│         10.1" FHD             │
│      (zone tactile)           │
│                               │
│                               │
│  ┌────┐              ┌─────┐ │
│  │USB1│  [ RJ45 ]    │ PWR │ │  ← Connecteurs accessibles
│  │USB2│              │ LED │ │
│  └────┘              └─────┘ │
└───────────────────────────────┘

Éléments frontaux bas (37mm de hauteur) :
- 2x USB Type-A (femelles) : connectés via câble à la carte mère
- 1x RJ45 Ethernet : câble Cat6 vers port carte mère
- 1x LED alimentation : connectée à GPIO carte mère
- Optionnel : 1x bouton power
```

### Face Arrière (Maintenance)

```
┌───────────────────────────────┐
│  ╔═══════════════════════╗   │
│  ║  CACHE AMOVIBLE       ║   │  ← Vis de maintien x4
│  ║  (accès carte mère)   ║   │
│  ║                       ║   │
│  ║   [M.2 SSD]  [RAM]    ║   │  ← Composants accessibles
│  ║                       ║   │
│  ╚═══════════════════════╝   │
│                               │
│  ⚪ DC 12V IN                 │  ← Port alimentation
│                               │
│  [====]  [====]               │  ← Grilles ventilation
└───────────────────────────────┘

Éléments arrière :
- Cache amovible vissé (4 vis M3)
- Port DC barrel 5.5x2.5mm
- Grilles ventilation passive (découpes + mesh)
```

### Côtés Gauche & Droit

```
Vue profil gauche/droit :

[====]  ← Grilles ventilation latérales (10mm d'espace interne)
[====]     permettent circulation d'air passif pour CPU fanless
[====]
```

---

## 🔌 Câblage Interne

### Schéma de Connexions

```
ÉCRAN (avant)
    ↓ HDMI (15cm)
    ↓ USB tactile (15cm)
    ↓ Alimentation 5V depuis carte
    ↓
┌───────────────────────────────┐
│  CARTE MÈRE MINI-ITX          │
│                               │
│  ┌──┐  USB3 ←─────────→ USB1 FRONT (30cm)
│  │  │  USB3 ←─────────→ USB2 FRONT (30cm)
│  │N │                        │
│  │9 │  RJ45 ←─────────→ RJ45 FRONT (20cm)
│  │7 │                        │
│  │  │  Power LED ←──────→ LED FRONT (25cm)
│  └──┘                        │
│                               │
│  [M.2 SSD]  [RAM DDR5]        │
│                               │
│  DC 12V IN ←──────────────────┼← PORT ARRIÈRE
└───────────────────────────────┘
```

### Liste Câbles Nécessaires

| Câble | Type | Longueur | Usage | Prix |
|-------|------|----------|-------|------|
| HDMI court | HDMI vers Mini-HDMI | 15 cm | Écran → Carte | 5€ |
| USB tactile | USB-A male vers header | 15 cm | Touch → Carte | 3€ |
| Extension USB x2 | Header vers USB-A female | 30 cm | Ports frontaux | 8€ |
| Câble RJ45 | Cat6 court | 20 cm | Front → Carte | 3€ |
| LED Power | LED + résistance 330Ω | 25 cm | Indicateur | 2€ |
| Alimentation écran | DC 5V depuis carte | 10 cm | Power écran | DIY |
| **TOTAL CÂBLES** | | | | **~21€** |

---

## 🏗️ Fabrication du Boîtier

### Option 1 : Impression 3D (Recommandé pour Prototype)

**Avantages :**
- ✅ Personnalisation totale
- ✅ Précision dimensionnelle
- ✅ Pas d'outillage nécessaire
- ✅ Itération rapide (redesign facile)

**Matériaux :**
- **PETG** (recommandé) : résistant, moins de warping que ABS
- **PLA+** (économique) : suffisant pour prototype
- **ABS** (pro) : plus robuste, finition lisse

**Découpage en Parties Imprimables :**

Boîtier divisé en 6 pièces (taille max 250x250mm par pièce) :

```
1. Cadre avant (280x200x10mm) - 12h impression
2. Support écran interne (250x170x5mm) - 6h
3. Châssis carte mère (190x190x25mm) - 8h
4. Fond boîtier (280x200x5mm) - 8h
5. Cache arrière amovible (190x190x3mm) - 5h
6. Panel ports frontaux (280x37x8mm) - 3h

TOTAL temps impression : ~42h
TOTAL filament : ~800g PETG
Coût filament : ~20€ (PETG 25€/kg)
```

**Fichiers CAD** :
- Fusion 360 ou OpenSCAD
- Export STL pour impression
- Paramétrique (ajustable facilement)

**Assemblage impression 3D :**
- Vis M3 x20 (x16) : fixation parties
- Inserts laiton M3 (x12) : points de fixation robustes
- Colle cyanoacrylate : joints étanches

**Coût total impression 3D** : ~50€ (filament + inserts + vis)

---

### Option 2 : Découpe Laser + Pliage (Plus Pro)

**Matériaux :**
- Tôle aluminium 2mm (anodisé noir/blanc)
- Plexiglass 3mm (face avant, optionnel)

**Découpes nécessaires :**

```
Pièce 1 : Face avant (280x200mm)
  - Découpe fenêtre écran (226x129mm)
  - Trous 2x USB (16x13mm)
  - Trou RJ45 (16x13mm)
  - Trou LED (5mm Ø)

Pièce 2 : Côtés x2 (200x73mm)
  - Grilles ventilation (slots 5x50mm)

Pièce 3 : Fond (280x200mm)
  - Trou DC jack (12mm Ø)
  - Trous fixation carte (Ø 3mm, écart 165mm)

Pièce 4 : Cache arrière (190x190mm)
  - Grilles ventilation
```

**Fabrication :**
- Service découpe laser : Sculpteo, Makeusof, atelier local
- Coût découpe alu : ~80-120€
- Pliage : atelier tôlerie locale
- Finition : anodisation ou peinture époxy

**Coût total découpe laser** : ~150€ (découpe + pliage + finition)

---

### Option 3 : Bois/MDF (Budget)

**Matériaux :**
- MDF 10mm
- Contreplaqué 5mm (fond)

**Découpe :**
- Scie sauteuse + gabarit papier
- Ou découpe laser MDF (moins cher que métal)

**Finition :**
- Ponçage grain 180
- Peinture acrylique (noir mat)
- Vernis protecteur

**Coût total bois** : ~30€ (matériaux + peinture)

---

## 🖨️ Fichiers 3D à Créer

### Structure OpenSCAD (Paramétrique)

```openscad
// Paramètres globaux
ecran_largeur = 246;
ecran_hauteur = 163;
ecran_epaisseur = 33;

carte_largeur = 170;
carte_hauteur = 170;
carte_epaisseur = 25;

bordure = 17; // marge autour écran
zone_ports = 37; // hauteur zone ports bas

boitier_largeur = ecran_largeur + (bordure * 2);
boitier_hauteur = ecran_hauteur + zone_ports;
boitier_profondeur = ecran_epaisseur + 10 + carte_epaisseur + 5;

// Module cadre avant
module cadre_avant() {
    difference() {
        // Cadre extérieur
        cube([boitier_largeur, boitier_hauteur, 10]);

        // Fenêtre écran (centré, décalé vers le haut)
        translate([bordure, zone_ports, -1])
            cube([ecran_largeur, ecran_hauteur, 12]);

        // Trous USB frontaux (bas gauche)
        translate([20, 10, -1]) {
            cube([16, 13, 12]); // USB1
            translate([0, 20, 0])
                cube([16, 13, 12]); // USB2
        }

        // Trou RJ45 (bas centre)
        translate([boitier_largeur/2 - 8, 15, -1])
            cube([16, 13, 12]);

        // LED power (bas droite)
        translate([boitier_largeur - 30, 18, -1])
            cylinder(h=12, d=5);
    }
}

// Module support écran
module support_ecran() {
    difference() {
        cube([ecran_largeur + 4, ecran_hauteur + 4, 5]);

        // Fenêtre écran (2mm de rebord de chaque côté)
        translate([2, 2, -1])
            cube([ecran_largeur, ecran_hauteur, 7]);

        // Trous fixation écran M3
        for(x = [10, ecran_largeur - 10])
            for(y = [10, ecran_hauteur - 10])
                translate([x, y, -1])
                    cylinder(h=7, d=3.2);
    }
}

// Module châssis carte mère
module chassis_carte() {
    difference() {
        cube([190, 190, 25]);

        // Espace carte mère (centrée)
        translate([10, 10, 3])
            cube([carte_largeur, carte_hauteur, 23]);

        // Trous standoffs Mini-ITX (standard ATX)
        standoff_positions = [
            [6.35, 6.35], [165.1, 6.35],
            [6.35, 165.1], [165.1, 165.1]
        ];
        for(pos = standoff_positions)
            translate([pos[0] + 10, pos[1] + 10, -1])
                cylinder(h=5, d=3.2);

        // Grilles ventilation
        for(i = [0:10])
            translate([50, 20 + i*10, -1])
                cube([90, 5, 27]);
    }
}

// Assemblage
cadre_avant();
translate([0, 0, 10]) support_ecran();
translate([45, 5, 48]) chassis_carte();
```

**Fichiers à générer** :
- `cadre_avant.stl`
- `support_ecran.stl`
- `chassis_carte.stl`
- `fond_boitier.stl`
- `cache_arriere.stl`
- `panel_ports.stl`

---

## 💰 Coût Total Configuration Complète

### Composants Électroniques

| Composant | Modèle | Prix HT |
|-----------|--------|---------|
| **Carte mère** | Jetway JMTX-ADN1 (N97) | 200€ |
| **RAM** | 8GB DDR5 SO-DIMM | 40€ |
| **SSD** | 256GB M.2 NVMe | 30€ |
| **Écran tactile** | Elecrow SF101T 10.1" FHD | 120€ |
| **Alimentation** | Adaptateur 12V 5A (60W) | 15€ |
| **Câbles** | HDMI, USB, RJ45, LED | 21€ |
| **Sous-total électronique** | | **426€** |

### Boîtier (3 Options)

| Option | Matériau | Prix |
|--------|----------|------|
| **Impression 3D** | PETG 800g + inserts | 50€ |
| **Découpe laser** | Aluminium 2mm | 150€ |
| **Bois/MDF** | MDF 10mm + peinture | 30€ |

### Total par Configuration

| Config | Électronique | Boîtier | **TOTAL HT** |
|--------|--------------|---------|--------------|
| **Prototype 3D** | 426€ | 50€ | **476€** |
| **Pro Alu** | 426€ | 150€ | **576€** |
| **Budget MDF** | 426€ | 30€ | **456€** |

---

## 🎯 Comparaison vs Autres Formats

| Format | Coût Total | Encombrement | Professionnalisme | Cible |
|--------|------------|--------------|-------------------|-------|
| **Tout-en-un 10" (cette config)** | 476€ | 28x20x7cm (compact) | ⭐⭐⭐⭐ | Bureau, comptoir |
| **DIY Totem 13" + N97** | 470€ | 35x20x20cm | ⭐⭐⭐ | Bureau |
| **Totem 21" + i5 + Digilor** | 3 000€ | 140x40x40cm | ⭐⭐⭐⭐⭐ | Hall, mairie |
| **Raspberry Pi 5 + 10"** | 250€ | 25x18x10cm | ⭐⭐ | Prototype test |

**Avantages configuration tout-en-un :**
- ✅ **Ultra-compact** : Peut se poser n'importe où
- ✅ **Design épuré** : Un seul bloc (pas de câbles externes)
- ✅ **Professionnel** : Finition soignée possible (alu)
- ✅ **Performance correcte** : N97 suffisant pour scan USB
- ✅ **Prix maîtrisé** : 476€ HT (marge confortable)
- ✅ **Personnalisable** : Charte graphique Owlcub possible

---

## 📋 Plan d'Action Fabrication

### Phase 1 : Conception 3D (2-3 jours)

- [ ] Modéliser boîtier complet dans Fusion 360 ou OpenSCAD
- [ ] Vérifier dimensions exactes écran commandé
- [ ] Ajuster tolérances (0.2-0.5mm pour impression 3D)
- [ ] Générer fichiers STL
- [ ] Vérifier imprimabilité (supports, orientation)

### Phase 2 : Commande Composants (1 semaine livraison)

- [ ] Commander carte mère Jetway JMTX-ADN1
- [ ] Commander écran Elecrow SF101T
- [ ] Commander RAM 8GB DDR5
- [ ] Commander SSD 256GB M.2
- [ ] Commander alimentation 12V 5A
- [ ] Commander câbles (HDMI court, USB, etc.)
- [ ] Commander connecteurs frontaux (USB panel mount, RJ45)

### Phase 3 : Fabrication Boîtier (1-2 semaines)

**Option impression 3D :**
- [ ] Imprimer toutes les pièces (~42h)
- [ ] Nettoyer supports
- [ ] Installer inserts laiton (fer à souder)
- [ ] Poncer/finition
- [ ] Peindre (optionnel)

**Option découpe laser :**
- [ ] Envoyer fichiers DXF à prestataire
- [ ] Réception pièces découpées
- [ ] Pliage (atelier ou DIY)
- [ ] Anodisation/peinture

### Phase 4 : Assemblage (1 jour)

- [ ] Installer carte mère dans châssis (standoffs)
- [ ] Installer RAM + SSD sur carte
- [ ] Connecter écran (HDMI + USB + alim)
- [ ] Souder/connecter ports frontaux (USB + RJ45)
- [ ] Connecter LED power
- [ ] Fixer écran dans cadre avant
- [ ] Assembler toutes les parties du boîtier
- [ ] Test à blanc (avant fermeture finale)

### Phase 5 : Tests & Finition (1 jour)

- [ ] Brancher alimentation 12V
- [ ] Démarrage : vérifier POST
- [ ] Installer Debian 12
- [ ] Installer logiciel Station Blanche
- [ ] Tester écran tactile (calibration)
- [ ] Tester ports USB frontaux (scan clé)
- [ ] Tester réseau RJ45
- [ ] Fermer boîtier définitivement
- [ ] Apposer logo Owlcub (sticker/gravure)

---

## 🎨 Variantes Design

### Variante 1 : "Tablette Posable Inclinée"

Au lieu d'un boîtier vertical, créer un socle incliné 15° :

```
Vue profil :

        ┌─────────────┐
       /   ÉCRAN      │
      /      10.1"    │
     /    ┌────┐      │
    /     │MÈRE│      │
   /      └────┘      │
  /___________________|
       Socle 15°
```

**Avantages :**
- Ergonomique (angle vue optimal)
- Plus compact en hauteur
- Design moderne

### Variante 2 : "VESA Mount Arrière"

Ajouter fixation VESA 75x75mm au dos :

**Usage :**
- Fixation murale
- Bras articulé
- Gain de place

**Coût additionnel :** +10€ (platine VESA)

### Variante 3 : "Version Fanless + Dissipateur"

Ajouter dissipateur thermique en contact avec CPU :

**Amélioration :**
- Meilleure dissipation chaleur
- Performance soutenue
- Boîtier alu fait office de radiateur

**Coût additionnel :** +20€ (dissipateur cuivre + pads thermiques)

---

## 🔒 Sécurité & Robustesse

### Points d'Attention

**Thermique :**
- ✅ Grilles ventilation latérales obligatoires
- ✅ Espace 10mm entre écran et carte mère
- ✅ CPU N97 TDP 12W (fanless OK)
- ⚠️ Éviter obstruer grilles

**Électrique :**
- ✅ Alimentation 12V isolée (sécurité)
- ✅ Pas de composant haute tension exposé
- ⚠️ Bien isoler soudures (gaine thermorétractable)

**Mécanique :**
- ✅ Écran bien maintenu (vis + colle optionnelle)
- ✅ Carte mère sur standoffs (éviter court-circuit)
- ⚠️ Vérifier solidité boîtier impression 3D (>3 parois)

**Poids :**
- Boîtier + composants : ~1.5 kg
- ✅ Peut se poser sans problème
- ⚠️ Fixation murale : prévoir chevilles adaptées

---

## 📐 Fichiers CAD à Fournir

Je peux te créer les fichiers suivants :

### Fichiers OpenSCAD (Modifiables)
- `boitier-station-blanche-10.scad` (fichier maître paramétrique)
- Variables ajustables (dimensions, tolérances)

### Fichiers STL (Impression 3D)
- `cadre_avant.stl`
- `support_ecran.stl`
- `chassis_carte.stl`
- `fond_boitier.stl`
- `cache_arriere.stl`
- `panel_ports_frontaux.stl`

### Fichiers DXF (Découpe Laser)
- `face_avant.dxf`
- `cotes_gauche_droit.dxf`
- `fond_boitier.dxf`
- `cache_arriere.dxf`

### Documentation
- `plan_assemblage.pdf` (schéma détaillé)
- `liste_pieces.xlsx` (BOM complète)

---

## 💡 Recommandation Finale

**Pour prototyper rapidement :**
→ **Impression 3D en PETG** (476€ total)
- Rapide à itérer
- Personnalisable
- Coût maîtrisé

**Pour production série (10+ unités) :**
→ **Découpe laser aluminium** (576€ total)
- Finition pro
- Robustesse
- Image premium

**Pour ultra-budget :**
→ **Bois/MDF peint** (456€ total)
- Économique
- Artisanal
- Charm

---

## 🚀 Prix de Vente Suggéré

**Configuration Tout-en-Un 10.1" Compact :**

| Coût | Prix Vente HT | Marge | Marge % |
|------|---------------|-------|---------|
| 476€ (3D) | 1 790€ | 1 314€ | **73%** |
| 576€ (Alu) | 2 290€ | 1 714€ | **75%** |

**Positionnement :**
- **"Station Blanche Compact"** : Format bureau/comptoir
- **Cible** : PME, cabinets médicaux, petites mairies
- **Arguments** : Ultra-compact, design soigné, Made in France (si fabrication locale)

---

Tu veux que je génère les fichiers 3D OpenSCAD/STL pour impression ? 🖨️

*Document v1.0 - Janvier 2025*
*Boîtier Tout-en-Un Station Blanche 10.1"*
