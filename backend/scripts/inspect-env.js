import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const conf = process.env;
console.log('  DB_HOST:     ' + (conf.DB_HOST || '127.0.0.1'));
console.log('  DB_PORT:     ' + (conf.DB_PORT || '3306'));
console.log('  DB_NAME:     ' + (conf.DB_NAME || 'ecocycle'));
console.log('  DB_USER:     ' + (conf.DB_USER || 'ecocycle_app'));

const pass = conf.DB_PASSWORD;
const isPlaceholder = pass === 'placeholder_change_me' || pass === 'your_secure_password_here';
if (isPlaceholder) {
  console.log('  DB_PASSWORD: [DEFAULT PLACEHOLDER - REQUIRES SETUP]');
} else if (pass && pass.length > 0) {
  console.log('  DB_PASSWORD: [CONFIGURED, length=' + pass.length + ']');
} else {
  console.log('  DB_PASSWORD: [EMPTY]');
}
