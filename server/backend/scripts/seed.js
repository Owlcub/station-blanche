#!/usr/bin/env node

/**
 * Script pour charger des données de test
 */

require('dotenv').config();
const db = require('../database');
const { v4: uuidv4 } = require('uuid');

async function seed() {
  console.log('🌱 Chargement des données de test...\n');

  try {
    await db.init();

    // Seed stations
    console.log('📍 Création de stations de test...');
    const stations = [
      { station_id: uuidv4(), name: 'Station-Accueil', location: 'Bâtiment A - Hall', version: '1.0.0', status: 'online' },
      { station_id: uuidv4(), name: 'Station-RH', location: 'Bâtiment B - RH', version: '1.0.0', status: 'online' },
      { station_id: uuidv4(), name: 'Station-IT', location: 'Bâtiment C - Informatique', version: '1.0.0', status: 'offline' }
    ];

    for (const station of stations) {
      await db.query(
        `INSERT INTO stations (station_id, name, location, version, status, last_heartbeat)
         VALUES ($1, $2, $3, $4, $5, NOW())
         ON CONFLICT (station_id) DO NOTHING`,
        [station.station_id, station.name, station.location, station.version, station.status]
      );
      console.log(`   ✓ ${station.name}`);
    }

    // Seed certificates
    console.log('\n🔐 Création de certificats de test...');
    const certificates = [
      {
        certificate_id: uuidv4(),
        usb_uuid: '1234-5678-ABCD-EFGH',
        usb_label: 'USB Kingston 32GB',
        usb_size: 32000000000,
        station_id: stations[0].station_id
      },
      {
        certificate_id: uuidv4(),
        usb_uuid: '9876-5432-ZYXW-VUTS',
        usb_label: 'USB SanDisk 64GB',
        usb_size: 64000000000,
        station_id: stations[1].station_id
      }
    ];

    for (const cert of certificates) {
      const issuedAt = new Date();
      const expiresAt = new Date(issuedAt.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 days

      await db.query(
        `INSERT INTO certificates (certificate_id, usb_uuid, usb_label, usb_size, station_id, issued_at, expires_at, signature, scan_summary)
         VALUES ($1, $2, $3, $4, (SELECT id FROM stations WHERE station_id = $5), $6, $7, 'test-signature', '{}')
         ON CONFLICT (certificate_id) DO NOTHING`,
        [cert.certificate_id, cert.usb_uuid, cert.usb_label, cert.usb_size, cert.station_id, issuedAt, expiresAt]
      );
      console.log(`   ✓ Certificat pour ${cert.usb_label}`);
    }

    // Seed scan logs
    console.log('\n📝 Création de logs de scan...');
    for (let i = 0; i < 10; i++) {
      await db.query(
        `INSERT INTO scan_logs (station_id, device, usb_uuid, total_files, infected_files, clamav_clean, ransomware_detected, scan_result)
         VALUES ((SELECT id FROM stations WHERE station_id = $1), '/dev/sdb1', $2, $3, 0, true, false, '{}')`,
        [stations[i % 2].station_id, certificates[i % 2].usb_uuid, Math.floor(Math.random() * 1000) + 100]
      );
    }
    console.log(`   ✓ 10 logs créés`);

    console.log('\n✅ Données de test chargées avec succès\n');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Erreur:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

seed();
