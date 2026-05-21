#!/usr/bin/env node

/**
 * Script de migration de la base de données
 */

require('dotenv').config();
const fs = require('fs').promises;
const path = require('path');
const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT) || 5432,
  database: process.env.DB_NAME || 'stationblanche_server',
  user: process.env.DB_USER || 'stationblanche_server',
  password: process.env.DB_PASSWORD || '',
});

async function migrate() {
  console.log('🔄 Démarrage de la migration...\n');

  try {
    // Test connection
    const client = await pool.connect();
    console.log('✅ Connexion à PostgreSQL réussie');

    // Read schema file
    const schemaPath = path.join(__dirname, '../database/schema.sql');
    const schema = await fs.readFile(schemaPath, 'utf-8');

    console.log('📄 Exécution du schéma SQL...');

    // Execute schema
    await client.query(schema);

    console.log('✅ Migration terminée avec succès\n');

    // Show table counts
    const tables = ['stations', 'api_keys', 'certificates', 'scan_logs', 'threat_alerts', 'users'];

    console.log('📊 État de la base de données:\n');
    for (const table of tables) {
      const result = await client.query(`SELECT COUNT(*) FROM ${table}`);
      console.log(`   ${table.padEnd(20)} ${result.rows[0].count} entrées`);
    }

    client.release();
    await pool.end();

    console.log('\n✅ Migration complète\n');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Erreur lors de la migration:', error.message);
    console.error(error.stack);
    await pool.end();
    process.exit(1);
  }
}

migrate();
