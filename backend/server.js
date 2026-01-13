const express = require('express');
const cors = require('cors');
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
                totalSteps: 5,
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
                }
            } else {
                // Monter le device
                await execPromise(`mkdir -p ${mount_point}`);
                try {
                    await execPromise(`mount -o ro ${device} ${mount_point}`, { timeout: 10000 });
                    needsUnmount = true;
                } catch (e) {
                    await execPromise(`mount -o ro ${device}1 ${mount_point}`, { timeout: 10000 });
                    needsUnmount = true;
                }
            }

            // Scan ClamAV
            updateProgress(1, 'Scan antivirus ClamAV...', 20);
            const clamResult = await execPromise(
                `timeout 600 clamscan -r -i --no-summary ${mount_point}`,
                { timeout: 605000 }
            ).catch(e => ({ stdout: e.stdout || '' }));

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
                `find ${mount_point} -type f \\( -iname "*.pdf.exe" -o -iname "*.jpg.exe" \\)`,
                { timeout: 10000 }
            ).catch(() => ({ stdout: '' }));

            doubleExt.split('\n').filter(f => f).forEach(file => {
                suspicious_files.push({
                    file: file.replace(mount_point, ''),
                    threat: 'Double extension (potential disguise)',
                    detection: 'Heuristic'
                });
            });

            if (needsUnmount) {
                await execPromise(`umount ${mount_point}`, { timeout: 10000 }).catch(() => {});
                await execPromise(`rmdir ${mount_point}`).catch(() => {});
            }

        } catch (scanError) {
            if (needsUnmount) {
                await execPromise(`umount ${mount_point} 2>/dev/null || true`).catch(() => {});
                await execPromise(`rmdir ${mount_point} 2>/dev/null || true`).catch(() => {});
            }
            throw scanError;
        }

        const all_threats = [...infected_files, ...suspicious_files];
        updateProgress(5, 'Scan terminé', 100, all_threats.length);

        res.json({
            success: true,
            device,
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

// Quarantaine
app.post('/api/usb/quarantine', async (req, res) => {
    try {
        const { device, files } = req.body;
        const quarantineDir = '/var/lib/cyberbox-station/quarantine';
        await execPromise(`mkdir -p ${quarantineDir}`);

        for (const file of files) {
            const safeName = file.file.replace(/\//g, '_');
            await execPromise(`mv "${file.file}" "${quarantineDir}/${safeName}"`);
        }

        res.json({ success: true, message: `${files.length} fichier(s) mis en quarantaine` });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Nettoyage corbeille
app.post('/api/usb/clean-trash', async (req, res) => {
    try {
        const { device } = req.body;
        const { stdout: mountCheck } = await execPromise(`mount | grep "${device}" || echo ""`);
        const matches = mountCheck.match(/on\s+(.+?)\s+type/);

        if (matches && matches[1]) {
            const mountPoint = matches[1];
            await execPromise(`rm -rf "${mountPoint}/.Trashes" "${mountPoint}/.Spotlight-V100"`);
            res.json({ success: true, message: 'Corbeille nettoyée' });
        } else {
            res.status(400).json({ error: 'Device non monté' });
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
        await execPromise(`umount ${device}* 2>/dev/null || true`);
        await execPromise(`eject ${device}`);
        res.json({ success: true, message: 'Clé USB éjectée' });
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

// Démarrer un transfert USB vers USB
app.post('/api/usb/transfer/start', async (req, res) => {
    try {
        const { source, destination, options = {} } = req.body;

        if (!source || !destination) {
            return res.status(400).json({ error: 'Source et destination requises' });
        }

        const transferId = uuidv4();
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
        if (options.scan_before_transfer !== false) {
            transferProgress.set(transferId, { status: 'scanning', percent: 10 });

            const scanResult = await execPromise(
                `timeout 300 clamscan -r -i --no-summary ${sourceMountPoint}`,
                { timeout: 305000 }
            ).catch(e => ({ stdout: e.stdout || '', stderr: e.stderr || '' }));

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
        }

        // Effectuer le transfert avec rsync
        transferProgress.set(transferId, { status: 'transferring', percent: 30 });

        const { stdout: rsyncOutput } = await execPromise(
            `rsync -av --progress ${sourceMountPoint}/ ${destMountPoint}/`,
            { timeout: 3600000 } // 1h max
        );

        transferProgress.set(transferId, { status: 'verifying', percent: 80 });

        // Vérifier l'intégrité
        const { stdout: sourceCount } = await execPromise(`find ${sourceMountPoint} -type f | wc -l`);
        const { stdout: destCount } = await execPromise(`find ${destMountPoint} -type f | wc -l`);

        // Démonter
        await execPromise(`umount ${sourceMountPoint} ${destMountPoint}`);
        await execPromise(`rmdir ${sourceMountPoint} ${destMountPoint}`);

        const transferData = {
            transfer_id: transferId,
            source,
            destination,
            timestamp,
            files_transferred: parseInt(sourceCount.trim()),
            files_verified: parseInt(destCount.trim()),
            integrity_ok: sourceCount.trim() === destCount.trim(),
            status: 'completed'
        };

        await db.saveTransfer(transferData);
        transferProgress.set(transferId, { status: 'completed', percent: 100 });

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

// Statut d'un transfert
app.get('/api/usb/transfer/status/:id', (req, res) => {
    const { id } = req.params;
    const status = transferProgress.get(id) || { status: 'not_found', percent: 0 };
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

// ==================== PC SCANNER ====================

app.post('/api/workstation/scan', async (req, res) => {
    try {
        // TODO: Implémenter le scan PC via Python
        res.json({
            success: true,
            message: 'Scan PC - À implémenter',
            issues: []
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ==================== DÉMARRAGE ====================

const PORT_TO_USE = PORT;

app.listen(PORT_TO_USE, '0.0.0.0', async () => {
    console.log(`🚀 Station Blanche Backend démarré sur le port ${PORT_TO_USE}`);
    console.log(`📡 API disponible sur http://localhost:${PORT_TO_USE}`);
    await db.init();
    console.log('✅ Base de données initialisée');
});
