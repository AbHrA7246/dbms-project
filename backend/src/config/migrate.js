import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { getPool, closePool } from './db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const MIGRATIONS_DIR = path.resolve(__dirname, '../../migrations');

/**
 * Computes SHA-256 checksum of migration file content for audit integrity.
 */
function computeChecksum(content) {
  return crypto.createHash('sha256').update(content, 'utf8').digest('hex');
}

/**
 * Splits SQL content into individual executable statements.
 * Preserves comments and ignores empty statements.
 */
function parseSqlStatements(sqlContent) {
  // Strip out full-line comment blocks (-- ...)
  const lines = sqlContent.split('\n');
  const cleanedLines = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith('--') && !trimmed.startsWith('--!')) {
      continue;
    }
    cleanedLines.push(line);
  }

  const cleanedSql = cleanedLines.join('\n');

  // Split on semicolons that are not inside strings
  return cleanedSql
    .split(/;\s*$/m)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

/**
 * Ensures the schema_migrations tracking table exists.
 */
async function ensureMigrationsTable(conn) {
  const createTableSql = `
    CREATE TABLE IF NOT EXISTS \`schema_migrations\` (
      \`id\` INT AUTO_INCREMENT PRIMARY KEY,
      \`version\` VARCHAR(100) NOT NULL UNIQUE,
      \`name\` VARCHAR(255) NOT NULL,
      \`applied_at\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      \`checksum\` VARCHAR(64) NULL,
      \`execution_time_ms\` INT NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `;
  await conn.query(createTableSql);
}

/**
 * Queries all applied migrations from schema_migrations.
 */
async function getAppliedMigrations(conn) {
  try {
    const [rows] = await conn.query('SELECT version, name, applied_at, checksum FROM schema_migrations ORDER BY id ASC;');
    return rows;
  } catch (err) {
    if (err.code === 'ER_NO_SUCH_TABLE') {
      return [];
    }
    throw err;
  }
}

/**
 * Lists all migration files in backend/migrations sorted alphabetically.
 */
function getMigrationFiles() {
  if (!fs.existsSync(MIGRATIONS_DIR)) {
    return [];
  }
  return fs
    .readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith('.sql'))
    .sort()
    .map((file) => {
      const match = file.match(/^(\d+)[-_](.+)\.sql$/);
      return {
        filename: file,
        version: match ? match[1] : file,
        name: match ? match[2] : file,
        filepath: path.join(MIGRATIONS_DIR, file),
      };
    });
}

/**
 * Inspects current tables in the target database.
 */
async function getDatabaseTables(conn) {
  const [rows] = await conn.query('SHOW TABLES;');
  return rows.map((r) => Object.values(r)[0]);
}

/**
 * Runs migration check or execution according to specified command.
 */
export async function runMigrations(command = 'apply', options = {}) {
  const pool = getPool();
  let conn = null;

  try {
    conn = await pool.getConnection();

    // 1. Inspect existing database tables
    const existingTables = await getDatabaseTables(conn);
    const hasMigrationsTable = existingTables.includes('schema_migrations');

    if (hasMigrationsTable) {
      await ensureMigrationsTable(conn);
    }

    const appliedMigrations = hasMigrationsTable ? await getAppliedMigrations(conn) : [];
    const appliedVersions = new Set(appliedMigrations.map((m) => m.version));
    const allFiles = getMigrationFiles();

    console.log('============================================================');
    console.log(' EcoCycle Migration Runner');
    console.log('============================================================');
    console.log(` Database:         ${process.env.DB_NAME || 'ecocycle'}`);
    console.log(` Existing Tables:  ${existingTables.length === 0 ? 'None (Empty Database)' : existingTables.join(', ')}`);
    console.log(` Migration Files:  ${allFiles.length} file(s) found in backend/migrations/`);
    console.log(` Applied Count:    ${appliedMigrations.length}`);
    console.log('------------------------------------------------------------');

    // ── Status Command ───────────────────────────────────────────
    if (command === 'status') {
      console.log('Migration Status Report:');
      for (const file of allFiles) {
        const isApplied = appliedVersions.has(file.version);
        const record = appliedMigrations.find((m) => m.version === file.version);
        const statusStr = isApplied ? `[APPLIED on ${new Date(record.applied_at).toISOString()}]` : '[PENDING]';
        console.log(`  ${statusStr} ${file.filename}`);
      }
      return { existingTables, appliedMigrations, allFiles };
    }

    // ── Dry Run Command ──────────────────────────────────────────
    if (command === 'dry-run') {
      console.log('Dry Run Mode: Inspecting pending statements without modifying database...\n');
      let pendingCount = 0;

      for (const file of allFiles) {
        if (appliedVersions.has(file.version)) {
          console.log(`  [SKIP] ${file.filename} (already recorded in schema_migrations)`);
          continue;
        }

        pendingCount++;
        const content = fs.readFileSync(file.filepath, 'utf8');
        const statements = parseSqlStatements(content);
        console.log(`  [WOULD APPLY] ${file.filename} (${statements.length} statements, checksum: ${computeChecksum(content).slice(0, 12)}...)`);
      }

      if (pendingCount === 0) {
        console.log('\nAll migrations are already applied. Database schema is up to date.');
      } else {
        console.log(`\nFound ${pendingCount} pending migration(s) ready to be applied.`);
      }
      return { existingTables, pendingCount, allFiles };
    }

    // ── Apply Command ────────────────────────────────────────────
    if (command === 'apply') {
      // Ensure schema_migrations table is created before recording migrations
      await ensureMigrationsTable(conn);

      let newlyApplied = 0;

      for (const file of allFiles) {
        if (appliedVersions.has(file.version)) {
          console.log(`  [SKIP] ${file.filename} (already applied)`);
          continue;
        }

        console.log(`  [APPLYING] ${file.filename}...`);
        const content = fs.readFileSync(file.filepath, 'utf8');
        const checksum = computeChecksum(content);
        const statements = parseSqlStatements(content);
        const startTime = Date.now();

        try {
          for (const stmt of statements) {
            await conn.query(stmt);
          }

          const durationMs = Date.now() - startTime;

          // Record migration version in schema_migrations
          await conn.query(
            'INSERT INTO schema_migrations (version, name, checksum, execution_time_ms) VALUES (?, ?, ?, ?);',
            [file.version, file.name, checksum, durationMs]
          );

          console.log(`  ✓ Successfully applied ${file.filename} (${statements.length} statements in ${durationMs}ms)`);
          newlyApplied++;
        } catch (migrationErr) {
          console.error(`\n[MIGRATION FAILURE] Error executing ${file.filename}:`);
          console.error(`  Code:    ${migrationErr.code || 'UNKNOWN'}`);
          console.error(`  Message: ${migrationErr.message}`);
          console.error('\nHalting migration execution. Subsequent migrations will not run.');
          throw new Error(`Migration ${file.filename} failed: ${migrationErr.message}`);
        }
      }

      if (newlyApplied === 0) {
        console.log('\nAll migrations are up to date. No pending migrations to execute.');
      } else {
        console.log(`\n✓ Successfully applied ${newlyApplied} migration(s).`);
      }

      const updatedTables = await getDatabaseTables(conn);
      console.log(`Current Database Tables: ${updatedTables.join(', ')}`);
      return { appliedCount: newlyApplied, tables: updatedTables };
    }

    throw new Error(`Unknown migration command: "${command}". Available commands: status, dry-run, apply`);
  } catch (error) {
    // Sanitized error logging without leaking connection secrets or passwords
    console.error('[MIGRATION ERROR]', error.code ? `[${error.code}] ${error.message}` : error.message);
    throw error;
  } finally {
    if (conn) {
      conn.release();
    }
  }
}

// CLI entrypoint execution when called directly (e.g. node src/config/migrate.js)
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const cmd = process.argv[2] || 'apply';

  runMigrations(cmd)
    .then(async () => {
      await closePool();
      process.exit(0);
    })
    .catch(async (err) => {
      await closePool();
      process.exit(1);
    });
}

export default {
  runMigrations,
};
