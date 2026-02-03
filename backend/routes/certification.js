const express = require('express');
const { exec } = require('child_process');
const util = require('util');
const certificateManager = require('../certification/certificate-manager');

const router = express.Router();
const execPromise = util.promisify(exec);

// Middleware auth (à adapter selon votre système)
function requireAuth(req, res, next) {
    if (req.session && req.session.authenticated) {
        next();
    } else {
        res.status(401).json({ error: 'Non authentifié' });
    }
}

// Obtenir la configuration actuelle
router.get('/config', requireAuth, async (req, res) => {
    try {
        const config = certificateManager.getConfig();
        res.json({
            success: true,
            config
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Obtenir la clé publique (pour export)
router.get('/public-key', requireAuth, async (req, res) => {
    try {
        const keypair = await certificateManager.exportKeypair();
        res.json({
            success: true,
            ...keypair
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Export complet (pour autres stations)
router.get('/export', requireAuth, async (req, res) => {
    try {
        const keypair = await certificateManager.exportKeypair();
        const config = certificateManager.getConfig();

        const exportData = {
            version: '1.0',
            exported: new Date().toISOString(),
            station_id: config.station_id,
            publicKey: keypair.publicKey,
            algorithm: keypair.algorithm,
            domains: config.domains,
            expiration_policies: config.expiration_policies
        };

        // Télécharger comme fichier JSON
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', `attachment; filename="station-${config.station_id}-export.json"`);
        res.send(JSON.stringify(exportData, null, 2));
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Import depuis une autre station
router.post('/import', requireAuth, async (req, res) => {
    try {
        const { importData } = req.body;

        if (!importData || !importData.publicKey || !importData.station_id) {
            return res.status(400).json({ error: 'Données d\'import invalides' });
        }

        const result = await certificateManager.importPublicKey(importData);
        res.json({
            success: true,
            message: `Station ${importData.station_id} importée avec succès`,
            ...result
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Gérer les domaines
router.get('/domains', requireAuth, async (req, res) => {
    try {
        const domains = certificateManager.getDomains();
        res.json({
            success: true,
            domains
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.post('/domains', requireAuth, async (req, res) => {
    try {
        const { name, network_segment, expiration_policy } = req.body;

        if (!name) {
            return res.status(400).json({ error: 'Nom du domaine requis' });
        }

        const domain = await certificateManager.addDomain({
            name,
            network_segment,
            expiration_policy
        });

        res.json({
            success: true,
            message: 'Domaine ajouté',
            domain
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.delete('/domains/:id', requireAuth, async (req, res) => {
    try {
        const { id } = req.params;
        await certificateManager.removeDomain(id);
        res.json({
            success: true,
            message: 'Domaine supprimé'
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Mettre à jour les politiques d'expiration
router.put('/expiration-policies', requireAuth, async (req, res) => {
    try {
        const { policies } = req.body;

        if (!policies || typeof policies !== 'object') {
            return res.status(400).json({ error: 'Politiques invalides' });
        }

        await certificateManager.updateExpirationPolicies(policies);
        res.json({
            success: true,
            message: 'Politiques mises à jour'
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Certifier une clé USB après scan
router.post('/certify', requireAuth, async (req, res) => {
    try {
        const {
            device,
            mount_point,
            scan_results,
            options = {}
        } = req.body;

        if (!device || !mount_point) {
            return res.status(400).json({ error: 'Device et mount_point requis' });
        }

        // Vérifier que le scan est clean
        if (scan_results.threats_found > 0) {
            return res.status(400).json({
                error: 'Impossible de certifier une clé avec des menaces détectées',
                threats_found: scan_results.threats_found
            });
        }

        // Obtenir les infos USB (UUID, serial, label)
        let usbInfo = { device, mount_point };
        try {
            const { stdout: blkidOut } = await execPromise(`blkid ${device} || blkid ${device}1`);
            const uuidMatch = blkidOut.match(/UUID="([^"]+)"/);
            const labelMatch = blkidOut.match(/LABEL="([^"]+)"/);

            usbInfo.uuid = uuidMatch ? uuidMatch[1] : null;
            usbInfo.label = labelMatch ? labelMatch[1] : null;

            // Tenter d'obtenir le serial
            const devName = device.replace('/dev/', '').replace(/[0-9]+$/, '');
            const { stdout: serialOut } = await execPromise(
                `udevadm info --query=all --name=/dev/${devName} | grep ID_SERIAL= | head -1 || echo ""`
            ).catch(() => ({ stdout: '' }));
            const serialMatch = serialOut.match(/ID_SERIAL=(.+)/);
            usbInfo.serial = serialMatch ? serialMatch[1].trim() : null;

            // Taille
            const { stdout: sizeOut } = await execPromise(`lsblk -bno SIZE ${device} | head -1`);
            usbInfo.size = parseInt(sizeOut.trim());
        } catch (error) {
            console.error('[CERTIFY] Error getting USB info:', error);
        }

        // Générer le certificat
        const certificate = await certificateManager.generateCertificate(
            usbInfo,
            scan_results,
            options
        );

        // Écrire sur la clé USB
        const writeResult = await certificateManager.writeCertificateToUSB(certificate, mount_point);

        // Copier automatiquement le guide GPO sur la clé
        try {
            const fs = require('fs').promises;
            const path = require('path');
            const guidePath = path.join(__dirname, '../../CERTIFICATION-USB-GPO.md');
            const destPath = path.join(mount_point, 'CERTIFICATION-USB-GPO.md');
            await fs.copyFile(guidePath, destPath);
            console.log('[CERTIFY] GPO guide copied to USB');
        } catch (error) {
            console.error('[CERTIFY] Error copying GPO guide:', error);
            // Ne pas faire échouer la certification si la copie échoue
        }

        res.json({
            success: true,
            message: 'Clé USB certifiée avec succès',
            certificate: {
                ...certificate,
                signature: certificate.signature.substring(0, 20) + '...' // Tronquer pour l'affichage
            },
            cert_path: writeResult.path
        });
    } catch (error) {
        console.error('[CERTIFY] Error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Vérifier un certificat (lecture depuis USB)
router.post('/verify', async (req, res) => {
    try {
        const { mount_point } = req.body;

        if (!mount_point) {
            return res.status(400).json({ error: 'mount_point requis' });
        }

        const certificate = await certificateManager.readCertificateFromUSB(mount_point);

        if (!certificate) {
            return res.json({
                success: false,
                certified: false,
                message: 'Aucun certificat trouvé sur cette clé USB'
            });
        }

        const verification = await certificateManager.verifyCertificate(certificate);

        res.json({
            success: true,
            certified: true,
            certificate: {
                scan_timestamp: certificate.scan_timestamp,
                expiration: certificate.expiration,
                station_id: certificate.station_id,
                domain: certificate.domain,
                scan_results: certificate.scan_results
            },
            verification
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Copier le guide GPO sur une clé USB
router.post('/copy-gpo-guide', requireAuth, async (req, res) => {
    try {
        const { mount_point } = req.body;

        if (!mount_point) {
            return res.status(400).json({ error: 'mount_point requis' });
        }

        const fs = require('fs').promises;
        const path = require('path');

        // Chemin du guide GPO
        const guidePath = path.join(__dirname, '../../CERTIFICATION-USB-GPO.md');
        const destPath = path.join(mount_point, 'CERTIFICATION-USB-GPO.md');

        // Copier le fichier
        await fs.copyFile(guidePath, destPath);

        res.json({
            success: true,
            message: 'Guide GPO copié sur la clé USB',
            path: destPath
        });
    } catch (error) {
        console.error('[CERT] Error copying GPO guide:', error);
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
