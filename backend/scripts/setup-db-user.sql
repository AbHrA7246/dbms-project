-- ─────────────────────────────────────────────────────────────────────────────
-- EcoCycle E-Waste Management — Dedicated MySQL Application User Setup
--
-- Run this script as the MySQL administrator (e.g. root) from your local terminal:
--   sudo mysql < backend/scripts/setup-db-user.sql
--   or:
--   mysql -u root -p < backend/scripts/setup-db-user.sql
--
-- IMPORTANT:
-- 1. Replace 'REPLACE_WITH_STRONG_PASSWORD' below with your chosen secure password.
-- 2. Do not commit your real password to version control.
-- 3. Update backend/.env with your chosen password:
--      DB_PASSWORD=your_secure_password
-- ─────────────────────────────────────────────────────────────────────────────

-- Ensure the database exists with modern utf8mb4 encoding
CREATE DATABASE IF NOT EXISTS `ecocycle`
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

-- Create dedicated least-privilege application user bound strictly to localhost
CREATE USER IF NOT EXISTS 'ecocycle_app'@'localhost'
  IDENTIFIED BY 'REPLACE_WITH_STRONG_PASSWORD';

-- Grant required permissions on the ecocycle database only (principle of least privilege)
GRANT SELECT, INSERT, UPDATE, DELETE, CREATE, ALTER, INDEX, DROP, REFERENCES, CREATE TEMPORARY TABLES, LOCK TABLES
  ON `ecocycle`.*
  TO 'ecocycle_app'@'localhost';

-- Reload grant tables
FLUSH PRIVILEGES;

-- Verification
SELECT user, host, plugin FROM mysql.user WHERE user = 'ecocycle_app';
