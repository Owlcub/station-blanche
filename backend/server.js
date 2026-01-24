const express = require('express');
const cors = require('cors');
const session = require('express-session');
const { exec } = require('child_process');
const util = require('util');
const fs = require('fs').promises;
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const execPromise = util.promisify(exec);

const app = express();
const PORT = process.env.PORT || 8000;

// Configuration CORS
const corsOptions = {
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);
    if (origin.match(/^https?:\/\/(localhost|127\.0\.0\.1|192\.168\.\d+\.\d+)(:\d+)?$/)) {
      callback(null, true);
    } else {
      callback(null, true);
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
};

app.use(cors(corsOptions));
app.use(express.json());

// Configuration session pour l'admin
app.use(session({
  secret: process.env.SESSION_SECRET || 'cyberbox-station-secret-' + Math.random().toString(36),
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: false, // mettre à true si HTTPS
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000 // 24 heures
  }
}));

// Base de données simple
const DB_FILE = '/var/lib/cyberbox-station/scans.json';
const TRANSFER_DB_FILE = '/var/lib/cyberbox-station/transfers.json';

// Utilitaire base de données
class Database {
    async init() {
        try {
            await fs.mkdir('/var/lib/cyberbox-station', { recursive: true });
            try {
                await fs.access(DB_FILE);
            } catch {
                await fs.writeFile(DB_FILE, JSON.stringify({ scans: [] }));
            }
            try {
                await fs.access(TRANSFER_DB_FILE);
            } catch {
                await fs.writeFile(TRANSFER_DB_FILE, JSON.stringify({ transfers: [] }));
            }
        } catch (error) {
            console.error('Erreur init DB:', error);
        }
    }

    async getAllScans() {
        try {
            const data = await fs.readFile(DB_FILE, 'utf8');
            return JSON.parse(data).scans;
        } catch {
            return [];
        }
    }

    async saveScan(scanData) {
        const scans = await this.getAllScans();
        scans.push(scanData);
        await fs.writeFile(DB_FILE, JSON.stringify({ scans }, null, 2));
    }

    async getAllTransfers() {
        try {
            const data = await fs.readFile(TRANSFER_DB_FILE, 'utf8');
            return JSON.parse(data).transfers;
        } catch {
            return [];
        }
    }

    async saveTransfer(transferData) {
        const transfers = await this.getAllTransfers();
        transfers.push(transferData);
        await fs.writeFile(TRANSFER_DB_FILE, JSON.stringify({ transfers }, null, 2));
    }

    async updateTransfer(transferId, updates) {
        const transfers = await this.getAllTransfers();
        const index = transfers.findIndex(t => t.transfer_id === transferId);
        if (index !== -1) {
            transfers[index] = { ...transfers[index], ...updates };
            await fs.writeFile(TRANSFER_DB_FILE, JSON.stringify({ transfers }, null, 2));
        }
    }
}

const db = new Database();

// Stocker les progressions de scan
const usbScanProgress = new Map();
const transferProgress = new Map();
let currentTransferId = null; // Stocker l'ID du transfert en cours

// ==================== USB ENDPOINTS ====================

// Détecter les périphériques USB connectés
app.get('/api/usb/connected', async (req, res) => {
    try {
        const { stdout: sysBlockOut } = await execPromise('for dev in /sys/block/sd*; do [ -e "$dev" ] && basename "$dev"; done 2>/dev/null || echo ""');
        const blockDevices = sysBlockOut.split('\n').filter(d => d);
        const usbDevices = [];

        for (const devName of blockDevices) {
            try {
                const { stdout: usbCheck } = await execPromise(`readlink -f /sys/block/${devName} | grep -q usb && echo "usb" || echo "not-usb"`);

                if (usbCheck.trim() === 'usb' || devName.match(/^sd[b-z]$/)) {
                    let deviceData = null;
                    try {
                        const { stdout: lsblkOut } = await execPromise(`lsblk -J -o NAME,SIZE,TYPE,MOUNTPOINT,VENDOR,MODEL /dev/${devName} 2>/dev/null`);
                        deviceData = JSON.parse(lsblkOut || '{}');
                    } catch (e) {
                        const { stdout: lsblkText } = await execPromise(`lsblk -no NAME,SIZE,TYPE,MOUNTPOINT /dev/${devName} 2>/dev/null`);
                        const firstLine = lsblkText.split('\n')[0];
                        if (firstLine) {
                            const parts = firstLine.trim().split(/\s+/);
                            deviceData = {
                                blockdevices: [{
                                    name: parts[0] || devName,
                                    size: parts[1] || 'Unknown',
                                    type: parts[2] || 'disk',
                                    mountpoint: parts[3] || null
                                }]
                            };
                        }
                    }

                    if (deviceData && deviceData.blockdevices && deviceData.blockdevices[0]) {
                        const dev = deviceData.blockdevices[0];
                        let vendor = dev.vendor?.trim() || 'Unknown';
                        let model = dev.model?.trim() || 'USB Storage';

                        usbDevices.push({
                            device: `/dev/${dev.name}`,
                            name: dev.name,
                            size: dev.size || 'Unknown',
                            vendor: vendor,
                            model: model,
                            mounted: !!dev.mountpoint,
                            mountpoint: dev.mountpoint || null,
                            children: dev.children || []
                        });
                    }
                }
            } catch (e) {
                console.error(`[USB] Erreur détection ${devName}:`, e.message);
            }
        }

        res.json({
            success: true,
            devices: usbDevices,
            count: usbDevices.length
        });
    } catch (error) {
        console.error('[USB] Erreur globale:', error);
        res.status(500).json({ error: error.message, devices: [] });
    }
});

// Scanner un périphérique USB
app.post('/api/usb/scan', async (req, res) => {
    try {
        const { device } = req.body;
        if (!device) {
            return res.status(400).json({ error: 'Le device USB est requis' });
        }

        const infected_files = [];
        const suspicious_files = [];
        const timestamp = new Date().toISOString().replace(/[:.]/g, '_');
        let mount_point = `/tmp/usb_scan_${timestamp}`;
        let needsUnmount = false;

        const updateProgress = (step, stepName, percent, threatsFound = 0) => {
            usbScanProgress.set(device, {
                status: 'scanning',
                step,
                totalSteps: 6,
                currentStep: stepName,
                percent,
                threatsFound
            });
        };

        updateProgress(0, 'Préparation du scan...', 0);

        try {
            // Vérifier si déjà monté
            const { stdout: mountCheck } = await execPromise(`mount | grep "${device}" || echo ""`);
            if (mountCheck.trim()) {
                const matches = mountCheck.match(/on\s+(.+?)\s+type/);
                if (matches && matches[1]) {
                    mount_point = matches[1];
                    needsUnmount = false; // Déjà monté, on ne démonte pas
                }
            } else {
                // Monter le device en LECTURE-ÉCRITURE dans une sandbox
                await execPromise(`mkdir -p ${mount_point}`);
                try {
                    // On monte en rw (pas ro) pour permettre les actions post-scan
                    await execPromise(`mount ${device} ${mount_point}`, { timeout: 10000 });
                    needsUnmount = false; // On garde monté pour les actions post-scan
                } catch (e) {
                    await execPromise(`mount ${device}1 ${mount_point}`, { timeout: 10000 });
                    needsUnmount = false; // On garde monté pour les actions post-scan
                }
            }

            // Scan ClamAV - utiliser clamdscan (daemon) si disponible, sinon clamscan
            updateProgress(1, 'Scan antivirus ClamAV...', 20);

            // Vérifier si clamd est actif
            let useDaemon = false;
            try {
                await execPromise('pgrep clamd', { timeout: 1000 });
                useDaemon = true;
            } catch {
                useDaemon = false;
            }

            let clamCommand;
            if (useDaemon) {
                // clamdscan est BEAUCOUP plus rapide (utilise le daemon)
                clamCommand = `timeout 300 clamdscan --multiscan --fdpass -i ${mount_point}`;
            } else {
                // Fallback sur clamscan classique
                clamCommand = `timeout 300 clamscan -r -i --no-summary ${mount_point}`;
            }

            const clamResult = await execPromise(clamCommand, { timeout: 305000 })
                .catch(e => ({ stdout: e.stdout || '', stderr: e.stderr || '' }));

            const lines = (clamResult.stdout || '').split('\n');
            for (const line of lines) {
                if (line.includes('FOUND')) {
                    const parts = line.split(':');
                    if (parts.length >= 2) {
                        infected_files.push({
                            file: parts[0].trim().replace(mount_point, ''),
                            threat: parts.slice(1).join(':').replace('FOUND', '').trim(),
                            detection: 'ClamAV'
                        });
                    }
                }
            }

            // Détections heuristiques
            updateProgress(2, 'Détection Autorun/Autoplay...', 40);
            const { stdout: autorunFiles } = await execPromise(
                `find ${mount_point} -type f \\( -iname "autorun.inf" -o -iname "autorun.bat" \\)`,
                { timeout: 10000 }
            ).catch(() => ({ stdout: '' }));

            autorunFiles.split('\n').filter(f => f).forEach(file => {
                suspicious_files.push({
                    file: file.replace(mount_point, ''),
                    threat: 'Autorun/Autoplay file detected',
                    detection: 'Behavioral'
                });
            });

            updateProgress(3, 'Détection double extension...', 60);
            const { stdout: doubleExt } = await execPromise(
                `find ${mount_point} -type f \\( -iname "*.pdf.exe" -o -iname "*.jpg.exe" -o -iname "*.doc.exe" -o -iname "*.xls.exe" \\)`,
                { timeout: 10000 }
            ).catch(() => ({ stdout: '' }));

            doubleExt.split('\n').filter(f => f).forEach(file => {
                suspicious_files.push({
                    file: file.replace(mount_point, ''),
                    threat: 'Double extension (potential disguise)',
                    detection: 'Heuristic'
                });
            });

            // Détection EDR: Fichiers exécutables suspects
            updateProgress(4, 'Détection EDR fichiers exécutables...', 80);
            const { stdout: exeFiles } = await execPromise(
                `find ${mount_point} -type f \\( -iname "*.exe" -o -iname "*.bat" -o -iname "*.cmd" -o -iname "*.vbs" -o -iname "*.ps1" -o -iname "*.scr" \\)`,
                { timeout: 10000 }
            ).catch(() => ({ stdout: '' }));

            exeFiles.split('\n').filter(f => f).forEach(file => {
                // Ignorer si déjà détecté comme double extension
                if (!suspicious_files.find(sf => sf.file === file.replace(mount_point, ''))) {
                    suspicious_files.push({
                        file: file.replace(mount_point, ''),
                        threat: 'Executable file detected (potential risk)',
                        detection: 'EDR'
                    });
                }
            });

            // Détection EDR: Fichiers cachés suspects
            const { stdout: hiddenFiles } = await execPromise(
                `find ${mount_point} -type f -name ".*" \\( -iname "*.exe" -o -iname "*.sh" -o -iname "*.bat" \\)`,
                { timeout: 10000 }
            ).catch(() => ({ stdout: '' }));

            hiddenFiles.split('\n').filter(f => f).forEach(file => {
                suspicious_files.push({
                    file: file.replace(mount_point, ''),
                    threat: 'Hidden executable file detected',
                    detection: 'EDR'
                });
            });

            // NE PAS démonter la clé après le scan !
            // Elle reste montée pour permettre les actions post-scan (quarantaine, nettoyage, éjection)
            // L'utilisateur devra éjecter manuellement avec le bouton "Éjecter"

        } catch (scanError) {
            // En cas d'erreur, on démonte si on avait monté nous-même
            if (needsUnmount) {
                await execPromise(`umount ${mount_point} 2>/dev/null || true`).catch(() => {});
                await execPromise(`rmdir ${mount_point} 2>/dev/null || true`).catch(() => {});
            }
            throw scanError;
        }

        const all_threats = [...infected_files, ...suspicious_files];
        updateProgress(6, 'Scan terminé', 100, all_threats.length);

        // Retourner le point de montage pour les actions post-scan
        res.json({
            success: true,
            device,
            mount_point,
            scan_results: all_threats,
            total_infected: infected_files.length,
            total_suspicious: suspicious_files.length,
            clean: all_threats.length === 0,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('[USB SCAN] Error:', error);
        res.status(500).json({ error: error.message, status: 'error', scan_results: [] });
    }
});

// Scan simplifié pour le transfert guidé (workflow indépendant, garde la clé montée pour le transfert)
app.post('/api/usb/scan-transfer', async (req, res) => {
    try {
        const { device } = req.body;
        if (!device) {
            return res.status(400).json({ error: 'Le device USB est requis' });
        }

        const infected_files = [];
        const suspicious_files = [];
        let mount_point = '';

        try {
            // Vérifier si déjà monté
            const { stdout: mountCheck } = await execPromise(`mount | grep "${device}" || echo ""`);
            if (mountCheck.trim()) {
                const matches = mountCheck.match(/on\s+(.+?)\s+type/);
                if (matches && matches[1]) {
                    mount_point = matches[1];
                }
            } else {
                // Monter le device en lecture-écriture (nécessaire pour le transfert ultérieur)
                const timestamp = new Date().toISOString().replace(/[:.]/g, '_');
                mount_point = `/tmp/usb_transfer_${timestamp}`;
                await execPromise(`mkdir -p ${mount_point}`);
                try {
                    await execPromise(`mount ${device} ${mount_point}`, { timeout: 10000 });
                } catch (e) {
                    await execPromise(`mount ${device}1 ${mount_point}`, { timeout: 10000 });
                }
            }

            // Scan ClamAV rapide (seulement ClamAV, pas les détections heuristiques)
            let useDaemon = false;
            try {
                await execPromise('pgrep clamd', { timeout: 1000 });
                useDaemon = true;
            } catch {
                useDaemon = false;
            }

            let clamCommand;
            if (useDaemon) {
                clamCommand = `timeout 300 clamdscan --multiscan --fdpass -i ${mount_point}`;
            } else {
                clamCommand = `timeout 300 clamscan -r -i --no-summary ${mount_point}`;
            }

            const clamResult = await execPromise(clamCommand, { timeout: 305000 })
                .catch(e => ({ stdout: e.stdout || '', stderr: e.stderr || '' }));

            const lines = (clamResult.stdout || '').split('\n');
            for (const line of lines) {
                if (line.includes('FOUND')) {
                    const parts = line.split(':');
                    if (parts.length >= 2) {
                        infected_files.push({
                            file: parts[0].trim().replace(mount_point, ''),
                            threat: parts.slice(1).join(':').replace('FOUND', '').trim(),
                            detection: 'ClamAV'
                        });
                    }
                }
            }

            // GARDER la clé montée pour le transfert (ne pas démonter)

        } catch (scanError) {
            throw scanError;
        }

        const all_threats = [...infected_files, ...suspicious_files];

        res.json({
            success: true,
            device,
            mount_point,
            scan_results: all_threats,
            total_infected: infected_files.length,
            total_suspicious: suspicious_files.length,
            clean: all_threats.length === 0,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('[USB SCAN TRANSFER] Error:', error);
        res.status(500).json({ error: error.message, status: 'error', scan_results: [] });
    }
});

// Quarantaine
app.post('/api/usb/quarantine', async (req, res) => {
    try {
        const { device, files } = req.body;
        if (!files || files.length === 0) {
            return res.status(400).json({ error: 'Aucun fichier à mettre en quarantaine' });
        }

        const quarantineDir = '/var/lib/cyberbox-station/quarantine';
        await execPromise(`mkdir -p ${quarantineDir}`);

        // Obtenir le point de montage du device
        const { stdout: mountCheck } = await execPromise(`mount | grep "${device}" || echo ""`);
        const matches = mountCheck.match(/on\s+(.+?)\s+type/);

        if (!matches || !matches[1]) {
            return res.status(400).json({ error: 'Device non monté' });
        }

        const mountPoint = matches[1];
        let quarantinedCount = 0;

        for (const file of files) {
            try {
                // file peut être soit un objet avec .file ou .path, soit une string
                const filePath = typeof file === 'string' ? file : (file.file || file.path);
                if (!filePath) continue;

                // Construire le chemin complet
                const fullPath = filePath.startsWith('/') ? `${mountPoint}${filePath}` : `${mountPoint}/${filePath}`;
                const safeName = `${Date.now()}_${filePath.replace(/\//g, '_')}`;

                await execPromise(`cp -r "${fullPath}" "${quarantineDir}/${safeName}"`);
                await execPromise(`rm -rf "${fullPath}"`);
                quarantinedCount++;
            } catch (e) {
                console.error(`Erreur quarantaine fichier:`, e.message);
            }
        }

        res.json({ success: true, message: `${quarantinedCount} fichier(s) mis en quarantaine` });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Nettoyage corbeille
app.post('/api/usb/clean-trash', async (req, res) => {
    try {
        const { device } = req.body;
        let { stdout: mountCheck } = await execPromise(`mount | grep "${device}" || echo ""`);
        let matches = mountCheck.match(/on\s+(.+?)\s+type/);

        // Si pas monté, on le monte
        if (!matches || !matches[1]) {
            const timestamp = new Date().toISOString().replace(/[:.]/g, '_');
            const mount_point = `/tmp/usb_clean_${timestamp}`;
            await execPromise(`mkdir -p ${mount_point}`);
            try {
                await execPromise(`mount ${device} ${mount_point}`, { timeout: 10000 });
            } catch (e) {
                await execPromise(`mount ${device}1 ${mount_point}`, { timeout: 10000 });
            }
            // Re-vérifier après montage
            ({ stdout: mountCheck } = await execPromise(`mount | grep "${device}"`));
            matches = mountCheck.match(/on\s+(.+?)\s+type/);
        }

        if (matches && matches[1]) {
            const mountPoint = matches[1];
            await execPromise(`rm -rf "${mountPoint}/.Trashes" "${mountPoint}/.Spotlight-V100" "${mountPoint}/.fseventsd" "${mountPoint}/.TemporaryItems"`);
            res.json({ success: true, message: 'Corbeille et fichiers système nettoyés' });
        } else {
            res.status(400).json({ error: 'Impossible de monter le device' });
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Formatage
app.post('/api/usb/format', async (req, res) => {
    try {
        const { device } = req.body;
        await execPromise(`umount ${device}* 2>/dev/null || true`);
        await execPromise(`mkfs.vfat -F 32 ${device}`, { timeout: 30000 });
        res.json({ success: true, message: 'Clé USB formatée' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Éjection sécurisée
app.post('/api/usb/safe-eject', async (req, res) => {
    try {
        const { device } = req.body;
        // Démonter toutes les partitions du device
        await execPromise(`umount ${device}* 2>/dev/null || true`);
        // Synchroniser et vider les buffers
        await execPromise(`sync`);
        // Note: La commande eject n'est pas disponible, on utilise uniquement umount + sync
        // L'utilisateur peut retirer physiquement la clé après le démontage
        res.json({ success: true, message: 'Clé USB démontée en toute sécurité. Vous pouvez la retirer.' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ==================== TRANSFERT USB TO USB (NOUVEAU) ====================

// Lister les transferts possibles (2 USB minimum)
app.get('/api/usb/transfer/list', async (req, res) => {
    try {
        const { stdout: sysBlockOut } = await execPromise('for dev in /sys/block/sd*; do [ -e "$dev" ] && basename "$dev"; done 2>/dev/null || echo ""');
        const blockDevices = sysBlockOut.split('\n').filter(d => d);
        const usbDevices = [];

        for (const devName of blockDevices) {
            if (devName.match(/^sd[b-z]$/)) {
                const { stdout: lsblkOut } = await execPromise(`lsblk -J -o NAME,SIZE /dev/${devName} 2>/dev/null`).catch(() => ({ stdout: '{}' }));
                const deviceData = JSON.parse(lsblkOut || '{}');
                if (deviceData.blockdevices && deviceData.blockdevices[0]) {
                    const dev = deviceData.blockdevices[0];
                    usbDevices.push({
                        device: `/dev/${dev.name}`,
                        name: dev.name,
                        size: dev.size || 'Unknown'
                    });
                }
            }
        }

        res.json({
            success: true,
            devices: usbDevices,
            can_transfer: usbDevices.length >= 2
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Lister le contenu d'un USB (pour sélection de fichiers)
app.post('/api/usb/transfer/browse', async (req, res) => {
    try {
        const { device, path: browsePath = '' } = req.body;

        if (!device) {
            return res.status(400).json({ error: 'Device requis' });
        }

        const mountId = `browse_${Date.now()}`;
        const mountPoint = `/tmp/browse_${mountId}`;

        // Créer et monter temporairement
        await execPromise(`mkdir -p ${mountPoint}`);
        await execPromise(`mount -o ro ${device} ${mountPoint}`).catch(e =>
            execPromise(`mount -o ro ${device}1 ${mountPoint}`)
        );

        // Lister le contenu du chemin demandé
        const fullPath = path.join(mountPoint, browsePath);
        const { stdout: lsOutput } = await execPromise(
            `ls -lA --time-style=long-iso "${fullPath}" 2>/dev/null || echo ""`
        );

        const items = [];
        const lines = lsOutput.split('\n').slice(1); // Skip "total" line

        for (const line of lines) {
            if (!line.trim()) continue;

            const parts = line.split(/\s+/);
            if (parts.length < 8) continue;

            const perms = parts[0];
            const size = parts[4];
            const name = parts.slice(7).join(' ');

            if (name === '.' || name === '..') continue;

            const isDir = perms.startsWith('d');
            const itemPath = path.join(browsePath, name);

            items.push({
                name,
                path: itemPath,
                type: isDir ? 'directory' : 'file',
                size: isDir ? '-' : size,
                selected: false
            });
        }

        // Démonter immédiatement
        await execPromise(`umount ${mountPoint}`);
        await execPromise(`rmdir ${mountPoint}`);

        res.json({
            success: true,
            path: browsePath,
            items: items.sort((a, b) => {
                if (a.type !== b.type) return a.type === 'directory' ? -1 : 1;
                return a.name.localeCompare(b.name);
            })
        });

    } catch (error) {
        console.error('[USB BROWSE] Error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Parcourir USB pour sélectionner un fichier à scanner (disk image, memory dump)
app.post('/api/usb/browse-for-scan', async (req, res) => {
    try {
        const { device, path: browsePath = '', extensions = [] } = req.body;

        if (!device) {
            return res.status(400).json({ error: 'Device requis' });
        }

        const mountId = uuidv4();
        const mountPoint = `/tmp/usb_browse_scan_${mountId}`;

        await execPromise(`mkdir -p ${mountPoint}`);

        // Tenter de monter le device (avec et sans partition)
        await execPromise(`mount -o ro ${device} ${mountPoint}`).catch(e =>
            execPromise(`mount -o ro ${device}1 ${mountPoint}`)
        );

        const fullPath = path.join(mountPoint, browsePath);
        const { stdout: lsOutput } = await execPromise(`ls -lA "${fullPath}"`);

        const items = [];
        const lines = lsOutput.split('\n').slice(1);

        for (const line of lines) {
            if (!line.trim()) continue;

            const parts = line.split(/\s+/);
            if (parts.length < 9) continue;

            const perms = parts[0];
            const size = parts[4];
            const name = parts.slice(8).join(' ');

            if (name === '.' || name === '..') continue;

            const isDir = perms.startsWith('d');
            const itemPath = browsePath ? `${browsePath}/${name}` : name;

            // Filtrer uniquement les dossiers et les fichiers avec les extensions demandées
            if (isDir) {
                items.push({
                    name,
                    path: itemPath,
                    type: 'directory',
                    size: '-'
                });
            } else if (extensions.length === 0 || extensions.some(ext => name.toLowerCase().endsWith(ext.toLowerCase()))) {
                // Convertir la taille en format lisible
                const sizeBytes = parseInt(size);
                let readableSize = size;
                if (!isNaN(sizeBytes)) {
                    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
                    let unitIndex = 0;
                    let calcSize = sizeBytes;
                    while (calcSize >= 1024 && unitIndex < units.length - 1) {
                        calcSize /= 1024;
                        unitIndex++;
                    }
                    readableSize = `${Math.round(calcSize * 100) / 100} ${units[unitIndex]}`;
                }

                items.push({
                    name,
                    path: itemPath,
                    type: 'file',
                    size: readableSize,
                    fullPath: path.join(mountPoint, itemPath) // Chemin complet sur le système
                });
            }
        }

        // Démonter immédiatement
        await execPromise(`umount ${mountPoint}`);
        await execPromise(`rmdir ${mountPoint}`);

        res.json({
            success: true,
            path: browsePath,
            items: items.sort((a, b) => {
                if (a.type !== b.type) return a.type === 'directory' ? -1 : 1;
                return a.name.localeCompare(b.name);
            })
        });

    } catch (error) {
        console.error('[USB BROWSE SCAN] Error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Copier un fichier depuis USB vers tmp pour scan
app.post('/api/usb/copy-for-scan', async (req, res) => {
    try {
        const { device, filePath } = req.body;

        if (!device || !filePath) {
            return res.status(400).json({ error: 'Device et filePath requis' });
        }

        const mountId = uuidv4();
        const mountPoint = `/tmp/usb_copy_${mountId}`;
        const destPath = `/tmp/scan_file_${mountId}_${path.basename(filePath)}`;

        await execPromise(`mkdir -p ${mountPoint}`);

        // Monter le device en lecture seule
        await execPromise(`mount -o ro ${device} ${mountPoint}`).catch(e =>
            execPromise(`mount -o ro ${device}1 ${mountPoint}`)
        );

        const sourcePath = path.join(mountPoint, filePath);

        // Copier le fichier
        await execPromise(`cp "${sourcePath}" "${destPath}"`);

        // Démonter
        await execPromise(`umount ${mountPoint}`);
        await execPromise(`rmdir ${mountPoint}`);

        // Obtenir la taille du fichier copié
        const { stdout: statOutput } = await execPromise(`stat -c %s "${destPath}"`);
        const fileSize = parseInt(statOutput.trim());

        res.json({
            success: true,
            file_path: destPath,
            file_name: path.basename(filePath),
            file_size: fileSize
        });

    } catch (error) {
        console.error('[USB COPY FOR SCAN] Error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Démarrer un transfert USB vers USB
app.post('/api/usb/transfer/start', async (req, res) => {
    try {
        const { source, destination, options = {}, selectedPaths = [] } = req.body;

        if (!source || !destination) {
            return res.status(400).json({ error: 'Source et destination requises' });
        }

        const transferId = uuidv4();
        currentTransferId = transferId; // Enregistrer comme transfert actif
        const timestamp = new Date().toISOString();

        // Créer les points de montage
        const sourceMountPoint = `/tmp/transfer_src_${transferId}`;
        const destMountPoint = `/tmp/transfer_dst_${transferId}`;

        await execPromise(`mkdir -p ${sourceMountPoint} ${destMountPoint}`);

        // Monter les devices
        await execPromise(`mount -o ro ${source} ${sourceMountPoint}`).catch(e =>
            execPromise(`mount -o ro ${source}1 ${sourceMountPoint}`)
        );
        await execPromise(`mount ${destination} ${destMountPoint}`).catch(e =>
            execPromise(`mount ${destination}1 ${destMountPoint}`)
        );

        // Scanner la source avant transfert (si demandé)
        let scanPaths = sourceMountPoint;
        if (selectedPaths.length > 0) {
            // Scanner uniquement les fichiers/dossiers sélectionnés
            scanPaths = selectedPaths.map(p => `"${path.join(sourceMountPoint, p)}"`).join(' ');
        }

        if (options.scan_before_transfer !== false) {
            transferProgress.set(transferId, {
                status: 'scanning',
                percent: 5,
                step: 'Comptage des fichiers à scanner...'
            });

            // Compter les fichiers à scanner
            const { stdout: fileCountStr } = await execPromise(`find ${scanPaths} -type f 2>/dev/null | wc -l`);
            const totalFiles = parseInt(fileCountStr.trim()) || 0;

            transferProgress.set(transferId, {
                status: 'scanning',
                percent: 10,
                step: `Scan antivirus (${totalFiles} fichiers)...`,
                total_files: totalFiles,
                scanned_files: 0
            });

            // Lancer le scan avec progression
            const scanResult = await execPromise(
                `timeout 300 clamscan -r -i --no-summary ${scanPaths}`,
                { timeout: 305000 }
            ).catch(e => ({ stdout: e.stdout || '', stderr: e.stderr || '' }));

            // Simuler progression pendant le scan (puisque clamscan ne donne pas de progression directe)
            transferProgress.set(transferId, {
                status: 'scanning',
                percent: 35,
                step: 'Analyse terminée, vérification des menaces...',
                total_files: totalFiles,
                scanned_files: totalFiles
            });

            if (scanResult.stdout.includes('FOUND')) {
                // Menaces détectées
                await execPromise(`umount ${sourceMountPoint} ${destMountPoint}`);
                await execPromise(`rmdir ${sourceMountPoint} ${destMountPoint}`);

                return res.status(400).json({
                    success: false,
                    error: 'Menaces détectées sur la clé source',
                    transfer_id: transferId,
                    scan_result: scanResult.stdout
                });
            }

            transferProgress.set(transferId, {
                status: 'scan_complete',
                percent: 40,
                step: 'Scan terminé - Aucune menace détectée'
            });
        } else {
            transferProgress.set(transferId, {
                status: 'mounting',
                percent: 5,
                step: 'Montage des clés USB...'
            });
        }

        // Effectuer le transfert avec rsync
        transferProgress.set(transferId, {
            status: 'transferring',
            percent: 45,
            step: 'Transfert des fichiers en cours...'
        });

        let rsyncCommand;
        if (selectedPaths.length > 0) {
            // Transférer uniquement les fichiers/dossiers sélectionnés
            const pathsList = selectedPaths.map(p => `"${path.join(sourceMountPoint, p)}"`).join(' ');
            rsyncCommand = `rsync -av --progress ${pathsList} "${destMountPoint}/"`;
        } else {
            // Transférer tout le contenu
            rsyncCommand = `rsync -av --progress "${sourceMountPoint}/" "${destMountPoint}/"`;
        }

        const { stdout: rsyncOutput } = await execPromise(
            rsyncCommand,
            { timeout: 3600000 } // 1h max
        );

        transferProgress.set(transferId, {
            status: 'verifying',
            percent: 80,
            step: 'Vérification de l\'intégrité...'
        });

        // Vérifier l'intégrité
        let sourceCount, destCount;
        if (selectedPaths.length > 0) {
            const pathsList = selectedPaths.map(p => `"${path.join(sourceMountPoint, p)}"`).join(' ');
            const countCmd = `find ${pathsList} -type f | wc -l`;
            const { stdout: sc } = await execPromise(countCmd);
            sourceCount = { stdout: sc };
            // Compter dans la destination (fichiers transférés)
            const { stdout: dc } = await execPromise(`find "${destMountPoint}" -type f | wc -l`);
            destCount = { stdout: dc };
        } else {
            const { stdout: sc } = await execPromise(`find "${sourceMountPoint}" -type f | wc -l`);
            const { stdout: dc } = await execPromise(`find "${destMountPoint}" -type f | wc -l`);
            sourceCount = { stdout: sc };
            destCount = { stdout: dc };
        }

        // Démonter
        await execPromise(`umount ${sourceMountPoint} ${destMountPoint}`);
        await execPromise(`rmdir ${sourceMountPoint} ${destMountPoint}`);

        const transferData = {
            transfer_id: transferId,
            source,
            destination,
            selected_paths: selectedPaths,
            timestamp,
            files_transferred: parseInt(sourceCount.stdout.trim()),
            files_verified: parseInt(destCount.stdout.trim()),
            integrity_ok: sourceCount.stdout.trim() === destCount.stdout.trim(),
            status: 'completed'
        };

        await db.saveTransfer(transferData);
        transferProgress.set(transferId, {
            status: 'completed',
            percent: 100,
            step: 'Transfert terminé avec succès !'
        });

        currentTransferId = null; // Réinitialiser après transfert

        res.json({
            success: true,
            transfer_id: transferId,
            ...transferData
        });

    } catch (error) {
        console.error('[USB TRANSFER] Error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Statut d'un transfert spécifique
app.get('/api/usb/transfer/status/:id', (req, res) => {
    const { id } = req.params;
    const status = transferProgress.get(id) || { status: 'not_found', percent: 0 };
    res.json(status);
});

// Statut du transfert en cours (pour polling)
app.get('/api/usb/transfer/status/current', (req, res) => {
    if (!currentTransferId) {
        return res.json({ status: 'none', percent: 0 });
    }
    const status = transferProgress.get(currentTransferId) || { status: 'unknown', percent: 0 };
    res.json(status);
});

// Historique des transferts
app.get('/api/usb/transfer/history', async (req, res) => {
    try {
        const transfers = await db.getAllTransfers();
        res.json({
            success: true,
            transfers: transfers.slice(-50).reverse()
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ==================== PC SCANNER AVANCÉ ====================

// Scan d'image disque (DD/IMG/RAW)
app.post('/api/pc/scan/disk-image', async (req, res) => {
    try {
        const { filePath } = req.body;

        if (!filePath) {
            return res.status(400).json({ error: 'Chemin du fichier requis' });
        }

        const scanId = uuidv4();
        const timestamp = new Date().toISOString();
        const mountPoint = `/tmp/disk_scan_${scanId}`;

        // Créer le point de montage
        await execPromise(`mkdir -p ${mountPoint}`);

        console.log(`[DISK SCAN] Analyse de ${filePath}`);

        // Monter l'image en lecture seule
        try {
            // Créer un loop device
            const { stdout: loopDevice } = await execPromise(`losetup -f --show --read-only "${filePath}"`);
            const loop = loopDevice.trim();

            // Essayer de détecter les partitions
            await execPromise(`kpartx -a ${loop}`).catch(() => {
                console.log('[DISK SCAN] Pas de partitions détectées, montage direct');
            });

            // Monter en lecture seule
            await execPromise(`mount -o ro ${loop} ${mountPoint}`).catch(async (e) => {
                // Si échec, essayer avec la première partition
                const { stdout: partitions } = await execPromise(`ls ${loop}p* 2>/dev/null || echo ""`);
                if (partitions) {
                    const firstPart = partitions.split('\n')[0];
                    await execPromise(`mount -o ro ${firstPart} ${mountPoint}`);
                } else {
                    throw new Error('Impossible de monter l\'image disque');
                }
            });

            // Scanner avec ClamAV
            console.log('[DISK SCAN] Scan ClamAV en cours...');
            const { stdout: scanOutput, stderr: scanError } = await execPromise(
                `clamscan -r -i --max-filesize=500M --max-scansize=1000M "${mountPoint}" 2>&1 || true`,
                { timeout: 1800000 } // 30 minutes max
            );

            // Détecter l'OS
            let osDetected = 'Unknown';
            try {
                const { stdout: osRelease } = await execPromise(`cat "${mountPoint}/etc/os-release" 2>/dev/null || cat "${mountPoint}/Windows/System32/license.rtf" 2>/dev/null | head -1 || echo ""`);
                if (osRelease.includes('Ubuntu') || osRelease.includes('Debian')) {
                    osDetected = osRelease.split('\n')[0];
                } else if (osRelease.includes('Windows') || osRelease.includes('Microsoft')) {
                    osDetected = 'Windows';
                }
            } catch (err) {
                console.log('[DISK SCAN] Impossible de détecter l\'OS');
            }

            // Compter les fichiers
            const { stdout: fileCount } = await execPromise(`find "${mountPoint}" -type f 2>/dev/null | wc -l`);

            // Parser les menaces
            const threats = [];
            const lines = scanOutput.split('\n');
            for (const line of lines) {
                if (line.includes('FOUND')) {
                    const parts = line.split(':');
                    if (parts.length >= 2) {
                        threats.push({
                            file: parts[0].trim(),
                            threat: parts[1].trim()
                        });
                    }
                }
            }

            // Démonter et nettoyer
            await execPromise(`umount ${mountPoint}`).catch(() => {});
            await execPromise(`kpartx -d ${loop}`).catch(() => {});
            await execPromise(`losetup -d ${loop}`).catch(() => {});
            await execPromise(`rmdir ${mountPoint}`).catch(() => {});

            const scanData = {
                scan_id: scanId,
                scan_type: 'disk_image',
                file_path: filePath,
                timestamp,
                os_detected: osDetected,
                total_files: parseInt(fileCount.trim()),
                threats_found: threats.length,
                threats: threats,
                status: 'completed'
            };

            await db.saveScan(scanData);

            res.json({
                success: true,
                scan_id: scanId,
                ...scanData
            });

        } catch (mountError) {
            // Nettoyer en cas d'erreur
            await execPromise(`umount ${mountPoint} 2>/dev/null`).catch(() => {});
            await execPromise(`rmdir ${mountPoint} 2>/dev/null`).catch(() => {});
            throw mountError;
        }

    } catch (error) {
        console.error('[DISK SCAN] Erreur:', error);
        res.status(500).json({ error: error.message });
    }
});

// Scan de memory dump (RAM)
app.post('/api/pc/scan/memory-dump', async (req, res) => {
    try {
        const { filePath } = req.body;

        if (!filePath) {
            return res.status(400).json({ error: 'Chemin du fichier requis' });
        }

        const scanId = uuidv4();
        const timestamp = new Date().toISOString();
        const workDir = `/tmp/memory_scan_${scanId}`;

        await execPromise(`mkdir -p ${workDir}`);

        console.log(`[MEMORY SCAN] Analyse de ${filePath}`);

        // Vérifier si Volatility 3 est installé
        const { stdout: vol3Check } = await execPromise('which vol3 || which volatility3 || echo "not_found"');
        const vol3Command = vol3Check.trim() === 'not_found' ? null : vol3Check.trim();

        if (!vol3Command) {
            return res.status(500).json({
                error: 'Volatility 3 non installé. Installez-le avec: pip3 install volatility3'
            });
        }

        // Détecter le profil OS
        console.log('[MEMORY SCAN] Détection du profil OS...');
        const { stdout: bannerOutput } = await execPromise(
            `${vol3Command} -f "${filePath}" banners.Banners 2>&1 || echo "Profile detection failed"`,
            { timeout: 120000 }
        );

        let osProfile = 'Unknown';
        if (bannerOutput.includes('Windows')) {
            osProfile = 'Windows';
        } else if (bannerOutput.includes('Linux')) {
            osProfile = 'Linux';
        }

        // Lister les processus
        console.log('[MEMORY SCAN] Extraction des processus...');
        const { stdout: pslistOutput } = await execPromise(
            `${vol3Command} -f "${filePath}" windows.pslist 2>&1 || ${vol3Command} -f "${filePath}" linux.pslist 2>&1 || echo "No processes"`,
            { timeout: 180000 }
        );

        // Parser les processus suspects
        const suspiciousProcesses = [];
        const psLines = pslistOutput.split('\n');
        const suspiciousNames = ['mimikatz', 'psexec', 'procdump', 'pwdump', 'nc.exe', 'netcat', 'meterpreter'];

        for (const line of psLines) {
            const lower = line.toLowerCase();
            for (const suspect of suspiciousNames) {
                if (lower.includes(suspect)) {
                    suspiciousProcesses.push(line.trim());
                    break;
                }
            }
        }

        // Scanner avec ClamAV les processus extraits
        console.log('[MEMORY SCAN] Scan ClamAV sur la mémoire...');
        const { stdout: clamOutput } = await execPromise(
            `clamscan "${filePath}" 2>&1 || echo "Scan completed"`,
            { timeout: 600000 }
        );

        const threats = [];
        if (clamOutput.includes('FOUND')) {
            threats.push({
                type: 'memory_malware',
                description: 'Malware détecté dans le dump mémoire',
                details: clamOutput
            });
        }

        // Nettoyer
        await execPromise(`rm -rf ${workDir}`).catch(() => {});

        const scanData = {
            scan_id: scanId,
            scan_type: 'memory_dump',
            file_path: filePath,
            timestamp,
            os_profile: osProfile,
            total_processes: psLines.length - 3, // Moins les headers
            suspicious_processes: suspiciousProcesses,
            threats_found: threats.length + suspiciousProcesses.length,
            threats: threats,
            status: 'completed'
        };

        await db.saveScan(scanData);

        res.json({
            success: true,
            scan_id: scanId,
            ...scanData
        });

    } catch (error) {
        console.error('[MEMORY SCAN] Erreur:', error);
        res.status(500).json({ error: error.message });
    }
});

// Upload de fichier pour scan (DD ou Memory Dump)
const multer = require('multer');
const upload = multer({
    dest: '/tmp/station-uploads/',
    limits: { fileSize: 50 * 1024 * 1024 * 1024 } // 50 GB max
});

app.post('/api/pc/upload', upload.single('file'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'Aucun fichier uploadé' });
        }

        const uploadedPath = req.file.path;
        const originalName = req.file.originalname;

        res.json({
            success: true,
            file_path: uploadedPath,
            file_name: originalName,
            file_size: req.file.size
        });
    } catch (error) {
        console.error('[UPLOAD] Erreur:', error);
        res.status(500).json({ error: error.message });
    }
});

// Scan PC via EDR (déjà existant, juste référencé ici)
app.post('/api/workstation/scan', async (req, res) => {
    try {
        // TODO: Implémenter le scan PC via agent EDR
        res.json({
            success: true,
            message: 'Scan PC EDR - À implémenter avec agent',
            issues: []
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ==================== ADMIN ROUTES ====================

const adminRouter = require('./admin');
app.use('/api/admin', adminRouter);

// ==================== DÉMARRAGE ====================

const PORT_TO_USE = PORT;

app.listen(PORT_TO_USE, '0.0.0.0', async () => {
    console.log(`🚀 Station Blanche Backend démarré sur le port ${PORT_TO_USE}`);
    console.log(`📡 API disponible sur http://localhost:${PORT_TO_USE}`);
    await db.init();
    console.log('✅ Base de données initialisée');
});
