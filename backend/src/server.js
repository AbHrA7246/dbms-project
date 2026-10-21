import 'dotenv/config';
import app from './app.js';
import { closePool } from './config/db.js';

const PORT = parseInt(process.env.PORT, 10) || 5000;
const HOST = process.env.HOST || '127.0.0.1';

const server = app.listen(PORT, HOST, () => {
  console.log(`[EcoCycle Backend] Server listening on http://${HOST}:${PORT}`);
  console.log(`[EcoCycle Backend] Health check endpoint: http://${HOST}:${PORT}/api/health`);
  console.log(`[EcoCycle Backend] Environment: ${process.env.NODE_ENV || 'development'}`);
});

/**
 * Graceful shutdown handler.
 * Closes the HTTP server and releases MySQL connection pool resources.
 */
let isShuttingDown = false;

async function handleShutdown(signal) {
  if (isShuttingDown) return;
  isShuttingDown = true;

  console.log(`\n[EcoCycle Backend] Received ${signal}. Initiating graceful shutdown...`);

  server.close(async (err) => {
    if (err) {
      console.error('[EcoCycle Backend] Error while closing HTTP server:', err.message);
    } else {
      console.log('[EcoCycle Backend] HTTP server closed.');
    }

    try {
      await closePool();
    } catch (poolErr) {
      console.error('[EcoCycle Backend] Error closing database pool:', poolErr.message);
    }

    console.log('[EcoCycle Backend] Shutdown completed.');
    process.exit(0);
  });

  // Force shutdown after timeout if pending requests hang
  setTimeout(() => {
    console.error('[EcoCycle Backend] Shutdown timed out. Forcing process exit.');
    process.exit(1);
  }, 10000).unref();
}

process.on('SIGTERM', () => handleShutdown('SIGTERM'));
process.on('SIGINT', () => handleShutdown('SIGINT'));

process.on('unhandledRejection', (reason) => {
  console.error('[EcoCycle Backend] Unhandled Promise Rejection:', reason);
});

process.on('uncaughtException', (error) => {
  console.error('[EcoCycle Backend] Uncaught Exception:', error);
  handleShutdown('uncaughtException');
});
