/**
 * Service de synchronisation avec le serveur central (master)
 */

const axios = require('axios');
const { v4: uuidv4 } = require('uuid');
const serverConfig = require('../config/server');

class MasterSyncService {
  constructor() {
    this.client = null;
    this.syncInterval = null;
    this.heartbeatInterval = null;
  }

  async start() {
    // Load config
    await serverConfig.load();

    if (!serverConfig.isEnabled()) {
      console.log('[MASTER-SYNC] Mode standalone, pas de synchronisation');
      return;
    }

    console.log(`[MASTER-SYNC] Démarrage connexion au serveur: ${serverConfig.getUrl()}`);

    // Initialize HTTP client
    this.client = axios.create({
      baseURL: serverConfig.getUrl(),
      headers: {
        'X-API-Key': serverConfig.getApiKey(),
        'X-Station-ID': serverConfig.getStationId()
      },
      timeout: 10000
    });

    // Initial connection
    try {
      await this.register();
      await serverConfig.updateStatus('connected', new Date().toISOString());
    } catch (error) {
      console.error('[MASTER-SYNC] Échec connexion initiale:', error.message);
      await serverConfig.updateStatus('error');
    }

    // Start periodic sync
    this.syncInterval = setInterval(async () => {
      try {
        await this.syncCertificates();
        await this.syncEDRRules();
        await serverConfig.updateStatus('connected', new Date().toISOString());
      } catch (error) {
        console.error('[MASTER-SYNC] Erreur sync:', error.message);
        await serverConfig.updateStatus('error');
      }
    }, serverConfig.get().sync_interval);

    // Start heartbeat
    this.heartbeatInterval = setInterval(async () => {
      try {
        await this.sendHeartbeat();
      } catch (error) {
        console.error('[MASTER-SYNC] Heartbeat failed:', error.message);
      }
    }, 60000); // Every minute

    console.log('[MASTER-SYNC] Service démarré');
  }

  async stop() {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
    console.log('[MASTER-SYNC] Service arrêté');
  }

  async restart() {
    await this.stop();
    await this.start();
  }

  // Register station with server
  async register() {
    if (!this.client) return;

    const config = serverConfig.get();

    // Generate station ID if not exists
    if (!config.station_id) {
      config.station_id = uuidv4();
      await serverConfig.update({ station_id: config.station_id });
    }

    try {
      const response = await this.client.post('/api/v1/stations/register', {
        station_id: config.station_id,
        name: config.station_name,
        location: config.station_location,
        version: require('../../package.json').version
      });

      console.log('[MASTER-SYNC] Station enregistrée:', response.data);
      return response.data;
    } catch (error) {
      console.error('[MASTER-SYNC] Erreur enregistrement:', error.message);
      throw error;
    }
  }

  // Send heartbeat to server
  async sendHeartbeat() {
    if (!this.client) return;

    try {
      await this.client.post('/api/v1/stations/heartbeat', {
        station_id: serverConfig.getStationId(),
        status: 'online',
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      throw error;
    }
  }

  // Sync certificates from server
  async syncCertificates() {
    if (!this.client) return;

    try {
      const config = serverConfig.get();
      const response = await this.client.get('/api/v1/certificates/sync', {
        params: {
          station_id: config.station_id,
          last_sync: config.last_sync
        }
      });

      const { certificates, revoked } = response.data;

      console.log(`[MASTER-SYNC] Certificats reçus: ${certificates?.length || 0}, révoqués: ${revoked?.length || 0}`);

      // TODO: Import certificates locally
      // TODO: Revoke certificates locally

      return { certificates, revoked };
    } catch (error) {
      console.error('[MASTER-SYNC] Erreur sync certificats:', error.message);
      throw error;
    }
  }

  // Sync EDR rules from server
  async syncEDRRules() {
    if (!this.client) return;

    try {
      const response = await this.client.get('/api/v1/edr/rules', {
        params: {
          station_id: serverConfig.getStationId()
        }
      });

      console.log('[MASTER-SYNC] Règles EDR synchronisées');

      // TODO: Update local EDR rules

      return response.data;
    } catch (error) {
      console.error('[MASTER-SYNC] Erreur sync règles EDR:', error.message);
      throw error;
    }
  }

  // Publish new certificate to server
  async publishCertificate(certificate) {
    if (!this.client) return;

    try {
      await this.client.post('/api/v1/certificates/publish', {
        station_id: serverConfig.getStationId(),
        certificate: certificate
      });

      console.log(`[MASTER-SYNC] Certificat publié: ${certificate.certificate_id}`);
    } catch (error) {
      console.error('[MASTER-SYNC] Erreur publication certificat:', error.message);
      // Don't throw - certificate is still valid locally
    }
  }

  // Report scan result to server
  async reportScanResult(scanResult) {
    if (!this.client) return;

    try {
      await this.client.post('/api/v1/logs/scan', {
        station_id: serverConfig.getStationId(),
        scan_result: scanResult,
        timestamp: new Date().toISOString()
      });

      console.log('[MASTER-SYNC] Résultat scan reporté');
    } catch (error) {
      console.error('[MASTER-SYNC] Erreur report scan:', error.message);
    }
  }

  // Report threat to server
  async reportThreat(threatDetails) {
    if (!this.client) return;

    try {
      await this.client.post('/api/v1/alerts/threat', {
        station_id: serverConfig.getStationId(),
        threat: threatDetails,
        priority: threatDetails.ransomware_detected ? 'critical' : 'high',
        timestamp: new Date().toISOString()
      });

      console.log('[MASTER-SYNC] Menace reportée');
    } catch (error) {
      console.error('[MASTER-SYNC] Erreur report menace:', error.message);
    }
  }

  // Update ClamAV signatures from server
  async updateClamAVSignatures() {
    if (!this.client) return;

    try {
      const response = await this.client.get('/api/v1/updates/clamav-signatures', {
        params: {
          station_id: serverConfig.getStationId()
        }
      });

      console.log('[MASTER-SYNC] Mises à jour ClamAV disponibles');
      return response.data;
    } catch (error) {
      console.error('[MASTER-SYNC] Erreur update ClamAV:', error.message);
      throw error;
    }
  }

  // Check for software updates
  async checkSoftwareUpdate() {
    if (!this.client) return;

    try {
      const currentVersion = require('../../package.json').version;
      const response = await this.client.get('/api/v1/updates/check', {
        params: {
          station_id: serverConfig.getStationId(),
          current_version: currentVersion
        }
      });

      console.log('[MASTER-SYNC] Vérification mises à jour logiciel');
      return response.data;
    } catch (error) {
      console.error('[MASTER-SYNC] Erreur check update:', error.message);
      throw error;
    }
  }
}

module.exports = new MasterSyncService();
