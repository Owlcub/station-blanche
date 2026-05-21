/**
 * Station Blanche - Serveur Central
 *
 * Serveur de gestion centralisée pour un réseau de stations blanches
 */

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
const session = require('express-session');
const RedisStore = require('connect-redis').default;
const redis = require('redis');

const app = express();
const server = http.createServer(app);

// Configuration
const PORT = process.env.PORT || 3100;
const HOST = process.env.HOST || '0.0.0.0';

// CORS
const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    // Allow all origins in development
    if (process.env.NODE_ENV !== 'production') {
      return callback(null, true);
    }
    // In production, implement your whitelist
    callback(null, true);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key', 'X-Station-ID'],
};

app.use(cors(corsOptions));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Redis client for sessions
const redisClient = redis.createClient({
  url: process.env.REDIS_URL || 'redis://localhost:6379'
});

redisClient.on('error', (err) => console.error('Redis error:', err));
redisClient.on('connect', () => console.log('✅ Redis connecté'));

// Session configuration
app.use(session({
  store: new RedisStore({ client: redisClient }),
  secret: process.env.SESSION_SECRET || 'stationblanche-server-secret',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production', // HTTPS only in production
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));

// WebSocket configuration
const io = new Server(server, {
  cors: corsOptions,
  pingInterval: parseInt(process.env.WS_PING_INTERVAL) || 30000,
  pingTimeout: parseInt(process.env.WS_PING_TIMEOUT) || 5000
});

// Make io accessible to routes
app.set('io', io);

// Logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.path} ${res.statusCode} - ${duration}ms`);
  });
  next();
});

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: require('./package.json').version
  });
});

// Server info (for station connection test)
app.get('/api/v1/server/info', (req, res) => {
  res.json({
    name: 'Station Blanche - Serveur Central',
    version: require('./package.json').version,
    timestamp: new Date().toISOString()
  });
});

// ==================== ROUTES ====================

// Import routes
const stationsRouter = require('./routes/stations');
const certificatesRouter = require('./routes/certificates');
const logsRouter = require('./routes/logs');
const alertsRouter = require('./routes/alerts');
const updatesRouter = require('./routes/updates');
const edrRouter = require('./routes/edr');
const dashboardRouter = require('./routes/dashboard');
const authRouter = require('./routes/auth');
const apiKeysRouter = require('./routes/api-keys');
const smtpConfigRouter = require('./routes/smtp-config');
const databaseRouter = require('./routes/database');
const activeDirectoryRouter = require('./routes/active-directory');

// Mount routes
app.use('/api/v1/stations', stationsRouter);
app.use('/api/v1/certificates', certificatesRouter);
app.use('/api/v1/logs', logsRouter);
app.use('/api/v1/alerts', alertsRouter);
app.use('/api/v1/updates', updatesRouter);
app.use('/api/v1/edr', edrRouter);
app.use('/api/v1/dashboard', dashboardRouter);
app.use('/api/v1/auth', authRouter);
app.use('/api/v1/api-keys', apiKeysRouter);
app.use('/api/v1/smtp-config', smtpConfigRouter);
app.use('/api/v1/database', databaseRouter);
app.use('/api/v1/ad', activeDirectoryRouter);

// Static files (frontend build)
if (process.env.NODE_ENV === 'production') {
  app.use(express.static('../frontend/build'));
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/build', 'index.html'));
  });
}

// Error handler
app.use((err, req, res, next) => {
  console.error('[ERROR]', err);
  res.status(err.status || 500).json({
    error: err.message || 'Erreur serveur interne',
    ...(process.env.NODE_ENV !== 'production' && { stack: err.stack })
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route non trouvée' });
});

// ==================== WEBSOCKET ====================

io.on('connection', (socket) => {
  console.log(`[WS] Client connecté: ${socket.id}`);

  // Authentication
  const apiKey = socket.handshake.auth.token;
  if (!apiKey) {
    console.log(`[WS] Client non authentifié: ${socket.id}`);
    socket.disconnect();
    return;
  }

  // TODO: Verify API key

  socket.on('station:register', (data) => {
    console.log(`[WS] Station enregistrée: ${data.station_id}`);
    socket.join(`station:${data.station_id}`);
  });

  socket.on('disconnect', () => {
    console.log(`[WS] Client déconnecté: ${socket.id}`);
  });
});

// Broadcast helper
app.broadcastToStations = (event, data) => {
  io.emit(event, data);
};

app.broadcastToStation = (stationId, event, data) => {
  io.to(`station:${stationId}`).emit(event, data);
};

// ==================== STARTUP ====================

async function start() {
  try {
    // Connect to Redis
    await redisClient.connect();

    // Initialize database
    const db = require('./database');
    await db.init();
    console.log('✅ Base de données initialisée');

    // Start server
    server.listen(PORT, HOST, () => {
      console.log(`\n🚀 Station Blanche - Serveur Central`);
      console.log(`📡 API disponible sur http://${HOST}:${PORT}`);
      console.log(`🔌 WebSocket disponible sur ws://${HOST}:${PORT}`);
      console.log(`🌍 Environnement: ${process.env.NODE_ENV || 'development'}`);
      console.log(`📝 Version: ${require('./package.json').version}\n`);
    });
  } catch (error) {
    console.error('❌ Erreur de démarrage:', error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM reçu, arrêt gracieux...');
  server.close(() => {
    console.log('Serveur HTTP fermé');
  });
  await redisClient.quit();
  console.log('Redis déconnecté');
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('SIGINT reçu, arrêt gracieux...');
  server.close(() => {
    console.log('Serveur HTTP fermé');
  });
  await redisClient.quit();
  console.log('Redis déconnecté');
  process.exit(0);
});

// Start the server
start();

module.exports = app;
