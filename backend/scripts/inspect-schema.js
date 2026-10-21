import dotenv from 'dotenv';
import mysql from 'mysql2/promise';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') });

async function inspectSchema() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || '127.0.0.1',
    port: parseInt(process.env.DB_PORT, 10) || 3306,
    user: process.env.DB_USER || 'ecocycle_app',
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME || 'ecocycle',
  });

  console.log('=== ECOCYCLE SCHEMA DETAILED VERIFICATION ===\n');

  // 1. Tables
  const [tables] = await connection.query(`
    SELECT TABLE_NAME, TABLE_TYPE, ENGINE, TABLE_COLLATION
    FROM information_schema.TABLES
    WHERE TABLE_SCHEMA = 'ecocycle'
    ORDER BY TABLE_NAME
  `);
  console.log(`Found ${tables.length} tables in database 'ecocycle':`);
  tables.forEach(t => console.log(` - ${t.TABLE_NAME} (${t.ENGINE}, ${t.TABLE_COLLATION})`));

  // 2. Primary Keys
  console.log('\n--- PRIMARY KEYS ---');
  const [pks] = await connection.query(`
    SELECT TABLE_NAME, COLUMN_NAME, ORDINAL_POSITION
    FROM information_schema.KEY_COLUMN_USAGE
    WHERE TABLE_SCHEMA = 'ecocycle' AND CONSTRAINT_NAME = 'PRIMARY'
    ORDER BY TABLE_NAME, ORDINAL_POSITION
  `);
  const pkMap = {};
  pks.forEach(p => {
    if (!pkMap[p.TABLE_NAME]) pkMap[p.TABLE_NAME] = [];
    pkMap[p.TABLE_NAME].push(p.COLUMN_NAME);
  });
  for (const [tbl, cols] of Object.entries(pkMap)) {
    console.log(` - ${tbl}: PRIMARY KEY (${cols.join(', ')})`);
  }

  // 3. Foreign Keys & Deletion Actions
  console.log('\n--- FOREIGN KEYS & DELETE RULES ---');
  const [fks] = await connection.query(`
    SELECT
      rc.CONSTRAINT_NAME,
      rc.TABLE_NAME,
      kcu.COLUMN_NAME,
      rc.REFERENCED_TABLE_NAME,
      kcu.REFERENCED_COLUMN_NAME,
      rc.UPDATE_RULE,
      rc.DELETE_RULE
    FROM information_schema.REFERENTIAL_CONSTRAINTS rc
    JOIN information_schema.KEY_COLUMN_USAGE kcu
      ON rc.CONSTRAINT_SCHEMA = kcu.CONSTRAINT_SCHEMA
      AND rc.CONSTRAINT_NAME = kcu.CONSTRAINT_NAME
    WHERE rc.CONSTRAINT_SCHEMA = 'ecocycle'
    ORDER BY rc.TABLE_NAME, rc.CONSTRAINT_NAME
  `);
  fks.forEach(fk => {
    console.log(` - ${fk.TABLE_NAME}.${fk.COLUMN_NAME} -> ${fk.REFERENCED_TABLE_NAME}.${fk.REFERENCED_COLUMN_NAME} [FK: ${fk.CONSTRAINT_NAME}, ON DELETE ${fk.DELETE_RULE}, ON UPDATE ${fk.UPDATE_RULE}]`);
  });

  // 4. Unique Constraints
  console.log('\n--- UNIQUE CONSTRAINTS ---');
  const [uniques] = await connection.query(`
    SELECT
      tc.TABLE_NAME,
      tc.CONSTRAINT_NAME,
      kcu.COLUMN_NAME,
      kcu.ORDINAL_POSITION
    FROM information_schema.TABLE_CONSTRAINTS tc
    JOIN information_schema.KEY_COLUMN_USAGE kcu
      ON tc.CONSTRAINT_SCHEMA = kcu.CONSTRAINT_SCHEMA
      AND tc.CONSTRAINT_NAME = kcu.CONSTRAINT_NAME
    WHERE tc.CONSTRAINT_SCHEMA = 'ecocycle'
      AND tc.CONSTRAINT_TYPE = 'UNIQUE'
    ORDER BY tc.TABLE_NAME, tc.CONSTRAINT_NAME, kcu.ORDINAL_POSITION
  `);
  const uqMap = {};
  uniques.forEach(u => {
    const key = `${u.TABLE_NAME}.${u.CONSTRAINT_NAME}`;
    if (!uqMap[key]) uqMap[key] = { table: u.TABLE_NAME, name: u.CONSTRAINT_NAME, cols: [] };
    uqMap[key].cols.push(u.COLUMN_NAME);
  });
  for (const u of Object.values(uqMap)) {
    console.log(` - ${u.table}: UNIQUE INDEX ${u.name} (${u.cols.join(', ')})`);
  }

  // 5. Secondary Indexes
  console.log('\n--- SECONDARY INDEXES ---');
  const [indexes] = await connection.query(`
    SELECT
      TABLE_NAME,
      INDEX_NAME,
      NON_UNIQUE,
      COLUMN_NAME,
      SEQ_IN_INDEX
    FROM information_schema.STATISTICS
    WHERE TABLE_SCHEMA = 'ecocycle'
      AND INDEX_NAME != 'PRIMARY'
    ORDER BY TABLE_NAME, INDEX_NAME, SEQ_IN_INDEX
  `);
  const idxMap = {};
  indexes.forEach(idx => {
    const key = `${idx.TABLE_NAME}.${idx.INDEX_NAME}`;
    if (!idxMap[key]) idxMap[key] = { table: idx.TABLE_NAME, name: idx.INDEX_NAME, nonUnique: idx.NON_UNIQUE === 1, cols: [] };
    idxMap[key].cols.push(idx.COLUMN_NAME);
  });
  for (const idx of Object.values(idxMap)) {
    console.log(` - ${idx.table}: INDEX ${idx.name} (${idx.cols.join(', ')}) [Non-Unique: ${idx.nonUnique}]`);
  }

  await connection.end();
}

inspectSchema().catch(err => {
  console.error('Error inspecting schema:', err);
  process.exit(1);
});
