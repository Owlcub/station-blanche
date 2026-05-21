/**
 * Database connection and query utilities
 */

const { Pool } = require('pg');

// PostgreSQL connection pool
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT) || 5432,
  database: process.env.DB_NAME || 'stationblanche_server',
  user: process.env.DB_USER || 'stationblanche_server',
  password: process.env.DB_PASSWORD || '',
  max: 20, // Maximum number of clients in the pool
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

pool.on('error', (err) => {
  console.error('[DB] Unexpected error on idle client', err);
  process.exit(-1);
});

/**
 * Initialize database
 */
async function init() {
  try {
    const client = await pool.connect();
    console.log('✅ PostgreSQL connecté');

    // Test query
    const result = await client.query('SELECT NOW()');
    console.log(`✅ Database ready at ${result.rows[0].now}`);

    client.release();
  } catch (error) {
    console.error('❌ Erreur connexion PostgreSQL:', error);
    throw error;
  }
}

/**
 * Execute a query
 */
async function query(text, params) {
  const start = Date.now();
  try {
    const res = await pool.query(text, params);
    const duration = Date.now() - start;

    if (process.env.LOG_LEVEL === 'debug') {
      console.log('[DB]', { text, duration, rows: res.rowCount });
    }

    return res;
  } catch (error) {
    console.error('[DB] Query error:', error);
    console.error('[DB] Query:', text);
    console.error('[DB] Params:', params);
    throw error;
  }
}

/**
 * Execute a transaction
 */
async function transaction(callback) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Close all connections
 */
async function close() {
  await pool.end();
  console.log('PostgreSQL pool fermé');
}

module.exports = {
  init,
  query,
  transaction,
  close,
  pool
};
