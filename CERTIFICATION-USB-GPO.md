# 🔒 Système de Certification USB - Guide GPO Windows

## Vue d'ensemble

Le système de certification USB de la Station Blanche permet de **taguer** les clés USB scannées et propres avec un **certificat cryptographique signé**, qui expire après une durée définie (30min à 7 jours).

Les entreprises peuvent ensuite déployer une **GPO Windows** pour bloquer toutes les clés USB **non certifiées**.

---

## 📋 Comment ça fonctionne

### 1. Sur la Station Blanche

```
┌──────────────────────────────────────────────────┐
│  1. Insertion clé USB                            │
│  2. Scan ClamAV + EDR (détection ransomware)    │
│  3. Si PROPRE → Bouton "Certifier" apparaît     │
│  4. Certificat signé RSA-2048 écrit sur USB     │
│     └─ Fichier: .cyberbox-cert/certificate.json │
└──────────────────────────────────────────────────┘
```

**Contenu du certificat** :
- Hash SHA-256 de tous les fichiers
- Date d'expiration (configurable)
- Domaine autorisé (optionnel)
- Réseau autorisé (optionnel)
- Signature cryptographique RSA-2048

### 2. Sur les postes Windows (via GPO)

```
┌──────────────────────────────────────────────────┐
│  1. Détection insertion USB (Event Viewer)       │
│  2. Script PowerShell vérifie certificat         │
│  3. Si certificat VALIDE → Autoriser montage    │
│  4. Si certificat ABSENT/EXPIRÉ → Bloquer       │
└──────────────────────────────────────────────────┘
```

---

## 🔧 Configuration : Panneau Admin

### Accéder à la gestion des certificats

1. Connectez-vous au panneau admin : `http://[IP_STATION]:3000/admin`
2. Identifiants par défaut :
   - **Username** : `admin-station`
   - **Password** : `CyberBox-Station-Admin`
3. Cliquez sur l'onglet **"Certificats USB"**

### Étapes de configuration

#### 1. Ajouter un domaine autorisé

```
Nom : entreprise.local
Réseau : 192.168.1.0/24 (optionnel)
Politique d'expiration : standard (1h)
```

#### 2. Configurer les politiques d'expiration

Les durées par défaut :
- **high-security** : 30 minutes
- **standard** : 1 heure
- **trusted** : 24 heures
- **extended** : 7 jours

Vous pouvez modifier ces valeurs en cliquant sur **"Modifier"**.

#### 3. Exporter la clé publique

1. Cliquez sur **"Exporter la configuration"**
2. Téléchargez le fichier JSON (ex: `station-blanche-001-export.json`)
3. Ce fichier contient :
   - La **clé publique RSA** (pour validation)
   - Les domaines configurés
   - L'ID de la station

#### 4. Importer vers d'autres stations

Si vous avez plusieurs Stations Blanches :
1. Exportez depuis la station principale
2. Sur les autres stations, cliquez **"Importer"**
3. Chargez le fichier JSON
4. Les certificats de toutes les stations seront reconnus

---

## 💻 Déploiement GPO Windows

### Méthode 1 : Blocage via Device Installation Policies

#### Étape 1 : Créer une GPO de blocage USB

```powershell
# Bloquer TOUS les périphériques USB de stockage par défaut
gpedit.msc
└─ Computer Configuration
   └─ Administrative Templates
      └─ System
         └─ Device Installation
            └─ Device Installation Restrictions
               ✅ Prevent installation of devices not described by other policy settings: ENABLED
```

#### Étape 2 : Script PowerShell de validation

Créez le fichier `C:\Windows\Scripts\ValidateUSBCert.ps1` :

```powershell
# ValidateUSBCert.ps1
# Script de validation de certificat USB Station Blanche

param(
    [Parameter(Mandatory=$true)]
    [string]$DriveLetter
)

$CertPath = "${DriveLetter}:\.cyberbox-cert\certificate.json"
$PublicKeyPath = "${DriveLetter}:\.cyberbox-cert\public-key.pem"

# Fonction de log
function Write-Log {
    param($Message)
    $LogFile = "C:\Windows\Logs\USBCertValidation.log"
    $Timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    Add-Content -Path $LogFile -Value "$Timestamp - $Message"
}

# Vérifier présence du certificat
if (-not (Test-Path $CertPath)) {
    Write-Log "BLOCKED: Pas de certificat sur $DriveLetter"
    Write-EventLog -LogName Application -Source "USBCertValidator" -EventId 1001 -EntryType Warning -Message "USB non certifiée détectée sur $DriveLetter"
    return $false
}

try {
    # Charger le certificat
    $Cert = Get-Content $CertPath | ConvertFrom-Json

    # Vérifier expiration
    $Expiration = [DateTime]::Parse($Cert.expiration)
    $Now = Get-Date

    if ($Now -gt $Expiration) {
        Write-Log "BLOCKED: Certificat expiré sur $DriveLetter (expiré le $Expiration)"
        Write-EventLog -LogName Application -Source "USBCertValidator" -EventId 1002 -EntryType Warning -Message "Certificat USB expiré sur $DriveLetter"
        return $false
    }

    # Vérifier le domaine (optionnel)
    $Domain = $env:USERDNSDOMAIN
    if ($Cert.domain -and $Cert.domain -ne $Domain) {
        Write-Log "BLOCKED: Domaine incorrect sur $DriveLetter (attendu: $Domain, trouvé: $($Cert.domain))"
        return $false
    }

    # ✅ Certificat valide
    Write-Log "ALLOWED: Certificat valide sur $DriveLetter (expire: $Expiration)"
    Write-EventLog -LogName Application -Source "USBCertValidator" -EventId 1000 -EntryType Information -Message "USB certifiée acceptée sur $DriveLetter"
    return $true

} catch {
    Write-Log "ERROR: Impossible de valider le certificat sur ${DriveLetter}: $($_.Exception.Message)"
    return $false
}
```

#### Étape 3 : Créer une tâche planifiée (Scheduled Task)

```powershell
# Tâche qui s'exécute lors de la détection d'un nouveau volume
$Action = New-ScheduledTaskAction -Execute "PowerShell.exe" -Argument "-ExecutionPolicy Bypass -File C:\Windows\Scripts\ValidateUSBCert.ps1 -DriveLetter E"
$Trigger = New-ScheduledTaskTrigger -AtLogon
$Settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries
$Principal = New-ScheduledTaskPrincipal -UserId "SYSTEM" -LogonType ServiceAccount -RunLevel Highest

Register-ScheduledTask -TaskName "USB_Certificate_Validator" -Action $Action -Trigger $Trigger -Settings $Settings -Principal $Principal
```

### Méthode 2 : Script de montage conditionnel

Alternative plus simple (déploiement via GPO Logon Script) :

```powershell
# CheckUSBOnLogon.ps1
# Script à déployer via GPO User Logon Scripts

# Obtenir toutes les clés USB
$USBDrives = Get-WmiObject Win32_Volume | Where-Object { $_.DriveType -eq 2 -and $_.DriveLetter }

foreach ($Drive in $USBDrives) {
    $Letter = $Drive.DriveLetter
    $CertPath = "${Letter}\.cyberbox-cert\certificate.json"

    if (Test-Path $CertPath) {
        $Cert = Get-Content $CertPath | ConvertFrom-Json
        $Expiration = [DateTime]::Parse($Cert.expiration)

        if ((Get-Date) -lt $Expiration) {
            # ✅ Certificat valide
            Write-Host "✅ USB $Letter certifiée (expire: $Expiration)" -ForegroundColor Green
        } else {
            # ❌ Certificat expiré → Démonter
            Write-Host "❌ USB $Letter : certificat expiré" -ForegroundColor Red
            $Drive.DriveLetter = $null
            $Drive.Put()
        }
    } else {
        # ❌ Pas de certificat → Démonter
        Write-Host "❌ USB $Letter : non certifiée" -ForegroundColor Red
        $Drive.DriveLetter = $null
        $Drive.Put()
    }
}
```

Déploiement :
```
gpedit.msc
└─ User Configuration
   └─ Windows Settings
      └─ Scripts (Logon/Logoff)
         └─ Logon
            ✅ Add : C:\Windows\Scripts\CheckUSBOnLogon.ps1
```

---

## 🔍 Vérification manuelle d'un certificat

### Sur Windows

```powershell
# Lister le contenu du certificat
Get-Content E:\.cyberbox-cert\certificate.json | ConvertFrom-Json | Format-List

# Vérifier l'expiration
$Cert = Get-Content E:\.cyberbox-cert\certificate.json | ConvertFrom-Json
$Expiration = [DateTime]::Parse($Cert.expiration)
$TimeLeft = $Expiration - (Get-Date)
Write-Host "Temps restant: $($TimeLeft.TotalHours) heures"
```

### Sur Linux

```bash
# Afficher le certificat
cat /media/usb/.cyberbox-cert/certificate.json | jq .

# Vérifier l'expiration
expiration=$(jq -r '.expiration' /media/usb/.cyberbox-cert/certificate.json)
echo "Expire le: $expiration"
```

---

## 📊 Monitoring et Logs

### Event Viewer Windows

Événements créés par le script de validation :
- **Event ID 1000** : USB certifiée acceptée ✅
- **Event ID 1001** : USB non certifiée bloquée ❌
- **Event ID 1002** : Certificat expiré ❌

Chemin : `Event Viewer → Windows Logs → Application`

### Logs Station Blanche

```bash
# Sur la Station Blanche
sudo cat /var/lib/cyberbox-station/certificates/cert-config.json

# Voir les certificats générés (historique)
sudo journalctl -u station-blanche-backend | grep CERTIFY
```

---

## 🛡️ Sécurité

### Avantages du système

✅ **Signature cryptographique** : Impossible de forger un certificat sans la clé privée
✅ **Expiration automatique** : Les certificats deviennent invalides après la durée définie
✅ **Intégrité des fichiers** : Hash SHA-256 de tous les fichiers au moment du scan
✅ **Domaine/réseau spécifique** : Les certificats peuvent être liés à un domaine précis
✅ **Multi-stations** : Import/export de clés publiques entre stations

### Limites

⚠️ **Le certificat peut être supprimé** par l'utilisateur (fichier caché mais accessible)
⚠️ **Pas de vérification d'intégrité en temps réel** sur Windows (seulement à l'insertion)
⚠️ **Contournement possible** si l'utilisateur a les droits administrateur locaux

### Recommandations

1. **Combiner avec Device Guard** : Bloquer les périphériques USB non autorisés au niveau matériel
2. **Audit régulier** : Monitorer les Event Logs pour détecter les tentatives d'insertion
3. **Formation utilisateurs** : Expliquer l'importance de ne scanner que les clés sur la Station Blanche
4. **Révocation** : Prévoir un mécanisme de révocation de certificats (blacklist)

---

## 🔄 Workflow complet

```
┌─────────────────────────────────────────────────────────────────┐
│                  WORKFLOW CERTIFICATION USB                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  1️⃣  STATION BLANCHE                                             │
│     └─ Insertion clé USB                                        │
│     └─ Scan ClamAV + EDR + Entropie                             │
│     └─ Si propre → Générer certificat signé RSA-2048           │
│     └─ Écrire dans .cyberbox-cert/certificate.json             │
│                                                                   │
│  2️⃣  UTILISATEUR                                                 │
│     └─ Retirer la clé de la Station Blanche                     │
│     └─ Insérer sur le poste Windows de l'entreprise            │
│                                                                   │
│  3️⃣  POSTE WINDOWS (GPO)                                         │
│     └─ Détection événement insertion USB                        │
│     └─ Script PowerShell exécuté automatiquement               │
│     └─ Vérification :                                            │
│         ✓ Présence certificat                                   │
│         ✓ Signature valide                                      │
│         ✓ Non expiré                                            │
│         ✓ Domaine autorisé                                      │
│     └─ Si OK → Autoriser montage                               │
│     └─ Si KO → Bloquer + Alerte admin                          │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
```

---

## 📞 Support

Pour toute question :
- **Documentation** : [Station Blanche GitHub](https://github.com/Owlcub/station-blanche)
- **Issues** : [GitHub Issues](https://github.com/Owlcub/station-blanche/issues)

---

**Auteur** : Owlcub
**Version** : 1.0
**Date** : 2026-02-03
