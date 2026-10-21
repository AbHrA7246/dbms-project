import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

// Ensure environment variables are loaded
dotenv.config();

const dbConfig = {
  host: process.env.DB_HOST || '127.0.0.1',
  port: parseInt(process.env.DB_PORT, 10) || 3306,
  user: process.env.DB_USER || 'ecocycle_app',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'ecocycle',
  waitForConnections: process.env.DB_WAIT_FOR_CONNECTIONS !== 'false',
  connectionLimit: parseInt(process.env.DB_CONNECTION_LIMIT, 10) || 10,
  queueLimit: parseInt(process.env.DB_QUEUE_LIMIT, 10) || 0,
  connectTimeout: parseInt(process.env.DB_CONNECT_TIMEOUT_MS, 10) || 5000,
  enableKeepAlive: true,
  keepAliveInitialDelay: 0,
};

// Security Safeguard: Never connect as MySQL root from the application
const isRootUser = dbConfig.user.toLowerCase() === 'root';

let pool = null;

if (isRootUser) {
  console.warn(
    '[SECURITY WARNING] Connecting as MySQL "root" is strictly disabled for security. ' +
    'Please configure a dedicated application user (e.g. "ecocycle_app") in backend/.env'
  );
} else {
  try {
    pool = mysql.createPool(dbConfig);
  } catch (error) {
    console.error('[DB POOL INIT ERROR] Could not initialize MySQL pool:', error.message);
  }
}

/**
 * Tests database connectivity safely without exposing secrets or throwing uncaught exceptions.
 * @returns {Promise<{ connected: boolean, details?: object, error?: string, code?: string }>}
 */
export async function testConnection() {
  if (isRootUser) {
    return {
      connected: false,
      error: 'Security restriction: application cannot connect as MySQL "root" user.',
      code: 'ROOT_CONNECTION_BLOCKED',
    };
  }

  if (!pool) {
    return {
      connected: false,
      error: 'Database connection pool is not initialized.',
      code: 'POOL_NOT_INITIALIZED',
    };
  }

  let connection;
  try {
    connection = await pool.getConnection();
    await connection.query('SELECT 1 AS health_check');
    return {
      connected: true,
      database: dbConfig.database,
      host: dbConfig.host,
      port: dbConfig.port,
    };
  } catch (error) {
    return {
      connected: false,
      error: 'Unable to connect to MySQL database.',
      code: error.code || 'CONNECTION_ERROR',
      // Provide a sanitized hint without leaking passwords or internals
      hint: error.code === 'ER_ACCESS_DENIED_ERROR'
        ? 'Authentication failed. Please verify DB_USER and DB_PASSWORD in backend/.env'
        : error.code === 'ECONNREFUSED'
        ? 'MySQL server is not responding at specified host/port'
        : error.code === 'ER_BAD_DB_ERROR'
        ? `Database "${dbConfig.database}" does not exist`
        : 'Verify MySQL service status and configuration',
    };
  } finally {
    if (connection) {
      connection.release();
    }
  }
}

/**
 * Returns the active MySQL connection pool.
 * Throws an explicit error if root user was configured or pool failed to initialize.
 */
export function getPool() {
  if (isRootUser) {
    throw new Error('Database access blocked: MySQL root user is not permitted.');
  }
  if (!pool) {
    throw new Error('Database connection pool is not initialized.');
  }
  return pool;
}

/**
 * Safely drains and closes all connections in the pool during server shutdown.
 */
export async function closePool() {
  if (pool) {
    try {
      await pool.end();
      console.log('MySQL connection pool closed gracefully.');
    } catch (err) {
      console.error('Error closing MySQL pool:', err.message);
    }
  }
}

export default {
  getPool,
  testConnection,
  closePool,
};
