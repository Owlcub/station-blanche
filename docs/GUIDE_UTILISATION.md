# Guide d'utilisation - Station Blanche

## Vue d'ensemble

La Station Blanche permet de :
1. 🔍 **Scanner des clés USB** pour détecter les menaces
2. 💾 **Transférer des données** entre 2 clés USB de manière sécurisée
3. 🖥️ **Scanner des PC Windows** pour détecter les vulnérabilités

## 1. Scanner une clé USB

### Étapes

1. Insérer une clé USB
2. Cliquer sur l'onglet **"Scanner USB"**
3. La clé apparaît automatiquement dans la liste
4. Cliquer sur **"Scanner"**

### Types de détection

| Type | Description |
|------|-------------|
| **ClamAV** | Détection par signatures de malwares connus |
| **Autorun** | Détection de fichiers autorun.inf (auto-exécution Windows) |
| **Double extension** | Détection de fichiers déguisés (.pdf.exe, .jpg.exe) |
| **Magic bytes** | Détection d'exécutables cachés dans des fichiers sains |
| **Memory dumps** | Détection de dumps mémoire suspects |

### Actions disponibles

- ✅ **Mettre en quarantaine** : Déplace les fichiers infectés dans `/var/lib/cyberbox-station/quarantine`
- 🗑️ **Nettoyer corbeille** : Supprime les fichiers cachés (.Trashes, .Spotlight)
- 💾 **Formater la clé** : Formatage complet en FAT32
- ⏏️ **Éjecter la clé** : Éjection sécurisée

## 2. Transférer entre 2 clés USB

### Étapes

1. Insérer **2 clés USB minimum**
2. Cliquer sur l'onglet **"Transfert USB"**
3. Sélectionner la clé **SOURCE** (à gauche)
4. Sélectionner la clé **DESTINATION** (à droite)
5. Cocher "Scanner la source avant transfert" (recommandé)
6. Cliquer sur **"Démarrer le transfert"**

### Fonctionnement

```
Clé SOURCE → [Scan ClamAV] → [Transfert rsync] → [Vérification intégrité] → Clé DESTINATION
```

1. **Scan pré-transfert** : Si activé, scan antivirus de la source
   - ❌ Si menaces détectées → Transfert annulé
   - ✅ Si propre → Transfert autorisé

2. **Transfert** : Copie de tous les fichiers avec rsync

3. **Vérification** : Comparaison du nombre de fichiers source/destination

### Sécurité

- ✅ Scan antivirus automatique avant transfert
- ✅ Vérification d'intégrité post-transfert
- ✅ Historique complet des transferts
- ✅ Les données existantes sur la destination sont conservées

## 3. Scanner un PC Windows

### Prérequis

Le PC doit avoir un agent EDR installé (fonctionnalité avancée).

### Étapes

1. Cliquer sur l'onglet **"Scanner PC"**
2. Sélectionner le PC dans la liste
3. Cliquer sur **"Scanner"**

### Détections

- 🦠 **Processus malveillants** : Détection de ransomwares, trojans
- 🔥 **Firewall désactivé** : Vérification de la configuration
- 👥 **Utilisateurs suspects** : Audit des comptes
- 📊 **Espace disque critique** : Vérification du stockage

## Historique et rapports

### Historique des scans USB
Les scans sont enregistrés dans `/var/lib/cyberbox-station/scans.json`

### Historique des transferts
Les transferts sont enregistrés dans `/var/lib/cyberbox-station/transfers.json`

### Fichiers en quarantaine
Consultables dans `/var/lib/cyberbox-station/quarantine/`

## Bonnes pratiques

### Pour les scans USB
1. ✅ Toujours scanner une clé inconnue avant utilisation
2. ✅ Mettre en quarantaine les fichiers suspects
3. ✅ Nettoyer la corbeille régulièrement
4. ⚠️ Formater une clé infectée si trop de menaces

### Pour les transferts
1. ✅ Toujours activer "Scanner la source avant transfert"
2. ✅ Vérifier l'intégrité dans l'historique
3. ✅ Conserver l'historique des transferts
4. ⚠️ Ne jamais transférer depuis une source infectée

## Dépannage

### La clé USB n'est pas détectée
- Vérifier que la clé est bien insérée
- Attendre 3 secondes (détection automatique)
- Vérifier avec `lsblk` en ligne de commande

### Le scan échoue
- Vérifier que ClamAV est à jour : `sudo freshclam`
- Vérifier les permissions : `ls -la /dev/sd*`

### Le transfert échoue
- Vérifier que les 2 clés sont bien insérées
- Vérifier l'espace disponible sur la destination
- Consulter les logs : `journalctl -f`

## Support

Pour toute question ou problème :
1. Consulter les logs backend : `cd backend && npm start`
2. Consulter les logs système : `journalctl -xe`
3. Vérifier l'état de ClamAV : `systemctl status clamav-daemon`
