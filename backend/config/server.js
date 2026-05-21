/**
 * Configuration pour la connexion au serveur central
 */

const fs = require('fs').promises;
const path = require('path');

const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, '..', 'data');
const CONFIG_FILE = process.env.SERVER_CONFIG_FILE || path.join(DATA_DIR, 'server-config.json');

class ServerConfig {
  constructor() {
    this.config = {
      enabled: false,
      url: '',
      api_key: '',
      station_id: '',
      station_name: process.env.STATION_NAME || 'Station-01',
      station_location: process.env.STATION_LOCATION || '',
      sync_interval: 300000, // 5 minutes
      last_sync: null,
      status: 'disconnected'
    };
    this.loaded = false;
  }

  async load() {
    try {
      const data = await fs.readFile(CONFIG_FILE, 'utf-8');
      this.config = { ...this.config, ...JSON.parse(data) };
      this.loaded = true;
      console.log('[SERVER-CONFIG] Configuration loaded:', {
        enabled: this.config.enabled,
        url: this.config.url,
        station_id: this.config.station_id
      });
    } catch (error) {
      if (error.code !== 'ENOENT') {
        console.error('[SERVER-CONFIG] Error loading config:', error.message);
      }
      // Create default config file
      await this.save();
    }
  }

  async save() {
    try {
      // Ensure directory exists
      const dir = path.dirname(CONFIG_FILE);
      await fs.mkdir(dir, { recursive: true });

      await fs.writeFile(CONFIG_FILE, JSON.stringify(this.config, null, 2));
      console.log('[SERVER-CONFIG] Configuration saved');
    } catch (error) {
      console.error('[SERVER-CONFIG] Error saving config:', error.message);
      throw error;
    }
  }

  get() {
    return { ...this.config };
  }

  async update(updates) {
    this.config = { ...this.config, ...updates };
    await this.save();
    return this.config;
  }

  isEnabled() {
    return this.config.enabled && this.config.url && this.config.api_key;
  }

  getUrl() {
    return this.config.url;
  }

  getApiKey() {
    return this.config.api_key;
  }

  getStationId() {
    return this.config.station_id;
  }

  async updateStatus(status, last_sync = null) {
    this.config.status = status;
    if (last_sync) {
      this.config.last_sync = last_sync;
    }
    await this.save();
  }
}

module.exports = new ServerConfig();
