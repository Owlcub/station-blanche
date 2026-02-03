const crypto = require('crypto');
const fs = require('fs').promises;
const path = require('path');
const { exec } = require('child_process');
const util = require('util');

const execPromise = util.promisify(exec);

const CERT_DIR = '/var/lib/cyberbox-station/certificates';
const KEYPAIR_FILE = path.join(CERT_DIR, 'station-keypair.json');
const CERT_CONFIG_FILE = path.join(CERT_DIR, 'cert-config.json');

class CertificateManager {
    constructor() {
        this.keypair = null;
        this.config = null;
    }

    async init() {
        try {
            await fs.mkdir(CERT_DIR, { recursive: true });

            // Charger ou générer la paire de clés
            await this.loadOrGenerateKeypair();

            // Charger ou créer la config
            await this.loadOrCreateConfig();
        } catch (error) {
            console.error('[CERT-MANAGER] Init error:', error);
            throw error;
        }
    }

    async loadOrGenerateKeypair() {
        try {
            const data = await fs.readFile(KEYPAIR_FILE, 'utf8');
            this.keypair = JSON.parse(data);
            console.log('[CERT-MANAGER] Keypair loaded');
        } catch (error) {
            // Générer une nouvelle paire de clés
            console.log('[CERT-MANAGER] Generating new RSA keypair...');
            const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
                modulusLength: 2048,
                publicKeyEncoding: {
                    type: 'spki',
                    format: 'pem'
                },
                privateKeyEncoding: {
                    type: 'pkcs8',
                    format: 'pem'
                }
            });

            this.keypair = {
                publicKey,
                privateKey,
                algorithm: 'RSA-2048',
                created: new Date().toISOString()
            };

            await fs.writeFile(KEYPAIR_FILE, JSON.stringify(this.keypair, null, 2));
            await fs.chmod(KEYPAIR_FILE, 0o600); // Lecture seule root
            console.log('[CERT-MANAGER] New keypair generated and saved');
        }
    }

    async loadOrCreateConfig() {
        try {
            const data = await fs.readFile(CERT_CONFIG_FILE, 'utf8');
            this.config = JSON.parse(data);
        } catch (error) {
            // Config par défaut
            this.config = {
                station_id: `station-blanche-${Date.now()}`,
                expiration_policies: {
                    'high-security': 1800, // 30 min
                    'standard': 3600, // 1h
                    'trusted': 86400, // 24h
                    'extended': 604800 // 7 jours
                },
                default_policy: 'standard',
                validation_rules: {
                    require_domain_match: false,
                    require_network_segment: false,
                    allow_file_modifications: false,
                    max_entropy_threshold: 7.5
                },
                domains: []
            };
            await this.saveConfig();
        }
    }

    async saveConfig() {
        await fs.writeFile(CERT_CONFIG_FILE, JSON.stringify(this.config, null, 2));
    }

    async addDomain(domainConfig) {
        const domain = {
            id: `domain-${Date.now()}`,
            name: domainConfig.name,
            network_segment: domainConfig.network_segment || null,
            expiration_policy: domainConfig.expiration_policy || this.config.default_policy,
            created: new Date().toISOString()
        };

        this.config.domains.push(domain);
        await this.saveConfig();
        return domain;
    }

    async removeDomain(domainId) {
        this.config.domains = this.config.domains.filter(d => d.id !== domainId);
        await this.saveConfig();
    }

    async updateExpirationPolicies(policies) {
        this.config.expiration_policies = {
            ...this.config.expiration_policies,
            ...policies
        };
        await this.saveConfig();
    }

    getPublicKey() {
        return this.keypair.publicKey;
    }

    async exportKeypair() {
        // Export pour partage vers autres stations
        return {
            publicKey: this.keypair.publicKey,
            algorithm: this.keypair.algorithm,
            created: this.keypair.created,
            station_id: this.config.station_id
        };
    }

    async importPublicKey(importData) {
        // Ajouter une clé publique d'une autre station pour validation croisée
        const trustedKeysFile = path.join(CERT_DIR, 'trusted-stations.json');
        let trustedStations = [];

        try {
            const data = await fs.readFile(trustedKeysFile, 'utf8');
            trustedStations = JSON.parse(data);
        } catch (error) {
            // Fichier n'existe pas encore
        }

        trustedStations.push({
            station_id: importData.station_id,
            publicKey: importData.publicKey,
            algorithm: importData.algorithm,
            imported: new Date().toISOString()
        });

        await fs.writeFile(trustedKeysFile, JSON.stringify(trustedStations, null, 2));
        return { success: true, station_id: importData.station_id };
    }

    async generateCertificate(usbInfo, scanResults, options = {}) {
        const expirationSeconds = this.config.expiration_policies[options.policy || this.config.default_policy];
        const now = new Date();
        const expiration = new Date(now.getTime() + expirationSeconds * 1000);

        // Générer le manifest (hash de tous les fichiers si demandé)
        let fileManifestHash = null;
        if (options.includeManifest && usbInfo.mount_point) {
            fileManifestHash = await this.generateFileManifest(usbInfo.mount_point);
        }

        const certificate = {
            certificate_version: '1.0',
            scan_timestamp: now.toISOString(),
            expiration: expiration.toISOString(),
            expiration_seconds: expirationSeconds,
            station_id: this.config.station_id,
            usb_info: {
                device: usbInfo.device,
                serial: usbInfo.serial || null,
                uuid: usbInfo.uuid || null,
                label: usbInfo.label || null,
                size: usbInfo.size
            },
            domain: options.domain || null,
            network_segment: options.network_segment || null,
            scan_results: {
                clamav: scanResults.clamav_clean ? 'clean' : 'threat_detected',
                ransomware_detected: scanResults.ransomware_detected || false,
                entropy_analysis: scanResults.entropy_status || 'normal',
                total_files: scanResults.total_files || 0,
                total_size_bytes: scanResults.total_size_bytes || 0,
                threats_found: scanResults.threats_found || 0
            },
            file_manifest_hash: fileManifestHash,
            validation_rules: {
                require_domain_match: options.require_domain_match || false,
                allow_modifications: options.allow_modifications || false
            }
        };

        // Signer le certificat
        const signature = this.signCertificate(certificate);
        certificate.signature = signature;

        return certificate;
    }

    signCertificate(certificate) {
        // Créer une copie sans signature pour signer
        const certToSign = { ...certificate };
        delete certToSign.signature;

        const dataToSign = JSON.stringify(certToSign);
        const sign = crypto.createSign('RSA-SHA256');
        sign.update(dataToSign);
        sign.end();

        const signature = sign.sign(this.keypair.privateKey, 'base64');
        return signature;
    }

    async verifyCertificate(certificate) {
        try {
            const signature = certificate.signature;
            const certToVerify = { ...certificate };
            delete certToVerify.signature;

            const dataToVerify = JSON.stringify(certToVerify);
            const verify = crypto.createVerify('RSA-SHA256');
            verify.update(dataToVerify);
            verify.end();

            const isValid = verify.verify(this.keypair.publicKey, signature, 'base64');

            // Vérifier l'expiration
            const now = new Date();
            const expiration = new Date(certificate.expiration);
            const isExpired = now > expiration;

            return {
                valid: isValid,
                expired: isExpired,
                signature_valid: isValid,
                expiration: certificate.expiration,
                seconds_remaining: isExpired ? 0 : Math.floor((expiration - now) / 1000)
            };
        } catch (error) {
            return {
                valid: false,
                error: error.message
            };
        }
    }

    async generateFileManifest(mountPoint) {
        try {
            // Vérifier que le point de montage existe toujours
            await fs.access(mountPoint);

            // Générer hash SHA256 de tous les fichiers (timeout 5 minutes)
            const { stdout } = await execPromise(
                `find "${mountPoint}" -type f -exec sha256sum {} \\; 2>/dev/null | sort | sha256sum`,
                { timeout: 300000 }
            );
            return stdout.trim().split(' ')[0];
        } catch (error) {
            console.error('[CERT-MANAGER] Error generating manifest:', error);
            console.error('[CERT-MANAGER] Mount point may have been unmounted');
            // Retourner null mais ne pas bloquer la certification
            return null;
        }
    }

    async writeCertificateToUSB(certificate, mountPoint) {
        try {
            const certDir = path.join(mountPoint, '.cyberbox-cert');
            await execPromise(`mkdir -p "${certDir}"`);

            // Masquer le dossier (attribut hidden)
            await execPromise(`chmod 700 "${certDir}"`).catch(() => {});

            // Écrire le certificat
            const certFile = path.join(certDir, 'certificate.json');
            await fs.writeFile(certFile, JSON.stringify(certificate, null, 2));

            // Écrire la clé publique (pour validation indépendante)
            const pubKeyFile = path.join(certDir, 'public-key.pem');
            await fs.writeFile(pubKeyFile, this.keypair.publicKey);

            // Créer un fichier README pour l'utilisateur
            const readmeFile = path.join(certDir, 'README.txt');
            const readme = `
=================================================
  CERTIFICATION CYBERBOX STATION BLANCHE
=================================================

Cette clé USB a été scannée et certifiée par une Station Blanche.

Informations du certificat :
- Date du scan : ${certificate.scan_timestamp}
- Expiration : ${certificate.expiration}
- Station : ${certificate.station_id}
- Statut : ${certificate.scan_results.clamav === 'clean' ? 'PROPRE' : 'MENACE DÉTECTÉE'}

⚠️  NE PAS SUPPRIMER CE DOSSIER
Ce certificat est nécessaire pour utiliser cette clé sur les réseaux protégés.

Pour plus d'informations : https://cyberbox-station.com
`;
            await fs.writeFile(readmeFile, readme);

            console.log(`[CERT-MANAGER] Certificate written to ${certDir}`);
            return { success: true, path: certDir };
        } catch (error) {
            console.error('[CERT-MANAGER] Error writing certificate:', error);
            throw error;
        }
    }

    async readCertificateFromUSB(mountPoint) {
        try {
            const certFile = path.join(mountPoint, '.cyberbox-cert', 'certificate.json');
            const data = await fs.readFile(certFile, 'utf8');
            return JSON.parse(data);
        } catch (error) {
            return null;
        }
    }

    getConfig() {
        return this.config;
    }

    getDomains() {
        return this.config.domains;
    }
}

// Instance singleton
const certificateManager = new CertificateManager();

module.exports = certificateManager;
