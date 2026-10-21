import dotenv from 'dotenv';
import mysql from 'mysql2/promise';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') });

async function verify() {
  const config = {
    host: process.env.DB_HOST || '127.0.0.1',
    port: parseInt(process.env.DB_PORT, 10) || 3306,
    user: process.env.DB_USER || 'ecocycle_app',
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME || 'ecocycle',
    connectTimeout: 4000,
  };

  console.log(`  Connecting to MySQL at ${config.host}:${config.port} as '${config.user}'...`);

  try {
    const conn = await mysql.createConnection(config);
    const [rows] = await conn.query('SELECT 1 AS ping, DATABASE() AS active_db, USER() AS authenticated_user');
    console.log(`  ✓ Successfully connected to MySQL!`);
    console.log(`    - Active Database:   ${rows[0].active_db}`);
    console.log(`    - Authenticated User: ${rows[0].authenticated_user}`);
    await conn.end();
    process.exit(0);
  } catch (error) {
    console.error(`  ✗ Connection failed: ${error.code || error.message}`);
    process.exit(1);
  }
}

verify();
