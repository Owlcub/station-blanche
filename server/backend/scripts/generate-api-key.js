#!/usr/bin/env node

/**
 * Script pour générer une nouvelle clé API pour une station
 *
 * Usage:
 *   node generate-api-key.js --name "Station-Accueil-01"
 *   node generate-api-key.js --station-id "uuid-existing-station"
 */

require('dotenv').config();
const crypto = require('crypto');
const { program } = require('commander');
const db = require('../database');
const { hashApiKey, generateApiKey } = require('../middleware/auth');

program
  .option('-n, --name <name>', 'Nom de la station')
  .option('-s, --station-id <id>', 'ID de station existante')
  .option('-e, --expires <days>', 'Nombre de jours avant expiration (optionnel)')
  .parse(process.argv);

const options = program.opts();

async function main() {
  try {
    await db.init();

    if (!options.name && !options.stationId) {
      console.error('❌ Erreur : --name ou --station-id requis');
      process.exit(1);
    }

    // Générer la clé API
    const apiKey = generateApiKey();
    const keyHash = hashApiKey(apiKey);
    const keyPrefix = apiKey.substring(0, 15) + '...';

    // Calculer expiration si spécifiée
    let expiresAt = null;
    if (options.expires) {
      const days = parseInt(options.expires);
      const expirationDate = new Date();
      expirationDate.setDate(expirationDate.getDate() + days);
      expiresAt = expirationDate.toISOString();
    }

    // Insérer dans la base
    if (options.stationId) {
      // Clé pour une station existante
      const result = await db.query(
        `INSERT INTO api_keys (key_hash, key_prefix, station_id, name, expires_at)
         VALUES ($1, $2, (SELECT id FROM stations WHERE station_id = $3), $4, $5)
         RETURNING id`,
        [keyHash, keyPrefix, options.stationId, options.name || 'API Key', expiresAt]
      );

      console.log('\n✅ Clé API générée avec succès\n');
      console.log(`ID:             ${result.rows[0].id}`);
      console.log(`Station ID:     ${options.stationId}`);
      console.log(`Nom:            ${options.name || 'API Key'}`);
      if (expiresAt) {
        console.log(`Expire le:      ${new Date(expiresAt).toLocaleString('fr-FR')}`);
      } else {
        console.log(`Expire le:      Jamais`);
      }
      console.log(`\n🔑 CLÉ API (à copier maintenant, ne sera plus affichée):`);
      console.log(`\n${apiKey}\n`);
    } else {
      // Clé sans station (à lier plus tard)
      const result = await db.query(
        `INSERT INTO api_keys (key_hash, key_prefix, name, expires_at)
         VALUES ($1, $2, $3, $4)
         RETURNING id`,
        [keyHash, keyPrefix, options.name, expiresAt]
      );

      console.log('\n✅ Clé API générée avec succès\n');
      console.log(`ID:             ${result.rows[0].id}`);
      console.log(`Nom:            ${options.name}`);
      console.log(`Station:        (À lier plus tard)`);
      if (expiresAt) {
        console.log(`Expire le:      ${new Date(expiresAt).toLocaleString('fr-FR')}`);
      } else {
        console.log(`Expire le:      Jamais`);
      }
      console.log(`\n🔑 CLÉ API (à copier maintenant, ne sera plus affichée):`);
      console.log(`\n${apiKey}\n`);
      console.log(`\n💡 Configuration station (dans l'interface admin):`);
      console.log(`   URL: https://votre-serveur.local:3100`);
      console.log(`   Clé API: ${apiKey}`);
      console.log('');
    }

    process.exit(0);
  } catch (error) {
    console.error('❌ Erreur:', error.message);
    process.exit(1);
  }
}

main();
