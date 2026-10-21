import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const envPath = path.resolve(__dirname, '../.env');

const newPass = process.env.NEW_APP_PASSWORD;
if (!newPass) {
  console.error('Error: NEW_APP_PASSWORD is not provided.');
  process.exit(1);
}

if (!fs.existsSync(envPath)) {
  console.error(`Error: ${envPath} does not exist.`);
  process.exit(1);
}

let content = fs.readFileSync(envPath, 'utf8');

if (/^DB_PASSWORD=.*$/m.test(content)) {
  content = content.replace(/^DB_PASSWORD=.*$/m, `DB_PASSWORD=${newPass}`);
} else {
  content += `\nDB_PASSWORD=${newPass}\n`;
}

fs.writeFileSync(envPath, content, { mode: 0o600 });
console.log('  ✓ backend/.env updated with permissions 600.');
