#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# EcoCycle — Secure MySQL Authentication Diagnosis & Resolution Script
#
# PURPOSE:
# Diagnoses MySQL authentication issues, safely provisions the dedicated
# ecocycle_app account on both localhost and 127.0.0.1, scopes grants to ecocycle.*,
# synchronizes backend/.env, and verifies the GET /api/health endpoint.
# ─────────────────────────────────────────────────────────────────────────────

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
ENV_FILE="${BACKEND_DIR}/.env"

cd "$BACKEND_DIR"

echo "============================================================"
echo " EcoCycle MySQL Authentication Diagnosis & Setup"
echo "============================================================"
echo ""

# ── 1. Inspect backend/.env safely ───────────────────────────────
echo "[Step 1] Inspecting backend/.env configuration..."
if [ ! -f "$ENV_FILE" ]; then
  echo "Error: $ENV_FILE does not exist. Please copy .env.example first."
  exit 1
fi

node scripts/inspect-env.js
echo ""

# ── 2. Determine administrative access method ────────────────────
echo "[Step 2] Establishing MySQL administrative session..."

ADMIN_CMD=""
if sudo -n mysql -e "SELECT 1;" >/dev/null 2>&1; then
  ADMIN_CMD="sudo mysql"
  echo "  ✓ Administrative socket access verified (sudo mysql)."
elif mysql -u root -e "SELECT 1;" >/dev/null 2>&1; then
  ADMIN_CMD="mysql -u root"
  echo "  ✓ Direct root socket access verified."
else
  echo ""
  echo "  Administrative privileges are required to inspect mysql.user and grant permissions."
  echo "  Choose administrative login method:"
  echo "    1) sudo mysql (Standard Ubuntu socket authentication) [RECOMMENDED]"
  echo "    2) mysql -u root -p (Password authentication)"
  printf "  Select option (1 or 2) [default 1]: "
  read -r AUTH_CHOICE
  AUTH_CHOICE="${AUTH_CHOICE:-1}"

  if [ "$AUTH_CHOICE" = "1" ]; then
    echo "  Authenticating with sudo..."
    sudo -v
    ADMIN_CMD="sudo mysql"
  else
    printf "  Enter MySQL root password: "
    read -s ROOT_PASS
    echo ""
    ADMIN_CMD="mysql -u root -p${ROOT_PASS}"
  fi
fi

# ── 3. Inspect existing MySQL account status ─────────────────────
echo ""
echo "[Step 3] Checking MySQL user account 'ecocycle_app' in mysql.user..."

QUERY_CHECK_USER="SELECT User, Host, plugin, account_locked FROM mysql.user WHERE User = 'ecocycle_app';"
USER_INSPECT_RESULT=$($ADMIN_CMD -s -N -e "$QUERY_CHECK_USER" 2>&1 || true)

if [ -z "$USER_INSPECT_RESULT" ]; then
  echo "  ➤ FINDING: Account 'ecocycle_app' does not yet exist in MySQL."
else
  echo "  ➤ FINDING: Current 'ecocycle_app' account records in MySQL:"
  echo "$USER_INSPECT_RESULT" | while read -r u h p l; do
    echo "    - User: '${u}', Host: '${h}', Plugin: '${p}', Locked: '${l}'"
  done
fi

# Check database existence
DB_EXISTS=$($ADMIN_CMD -s -N -e "SELECT SCHEMA_NAME FROM information_schema.SCHEMATA WHERE SCHEMA_NAME = 'ecocycle';" 2>&1 || true)
if [ -n "$DB_EXISTS" ]; then
  echo "  ✓ Database 'ecocycle' exists."
else
  echo "  ➤ Database 'ecocycle' does not exist yet. It will be created."
fi

echo ""

# ── 4. Prompt for secure password ────────────────────────────────
echo "[Step 4] Password Configuration"
echo "  Enter the password for 'ecocycle_app' (input is hidden, not logged, not stored in history):"

while true; do
  printf "  Enter password: "
  read -s APP_PASSWORD
  echo ""
  if [ -z "$APP_PASSWORD" ]; then
    echo "  Error: Password cannot be empty. Please try again."
    continue
  fi
  printf "  Confirm password: "
  read -s APP_PASSWORD_CONFIRM
  echo ""
  if [ "$APP_PASSWORD" != "$APP_PASSWORD_CONFIRM" ]; then
    echo "  Error: Passwords did not match. Please try again."
  else
    break
  fi
done

echo "  ✓ Password confirmed."
echo ""

# ── 5. Apply Database & User Grants Scoped to ecocycle.* ─────────
echo "[Step 5] Provisioning database and applying least-privilege grants..."

TMP_SQL=$(mktemp)
chmod 600 "$TMP_SQL"

cat <<EOF > "$TMP_SQL"
CREATE DATABASE IF NOT EXISTS \`ecocycle\`
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

CREATE USER IF NOT EXISTS 'ecocycle_app'@'localhost'
  IDENTIFIED WITH caching_sha2_password BY '${APP_PASSWORD}';
ALTER USER 'ecocycle_app'@'localhost'
  IDENTIFIED WITH caching_sha2_password BY '${APP_PASSWORD}';

CREATE USER IF NOT EXISTS 'ecocycle_app'@'127.0.0.1'
  IDENTIFIED WITH caching_sha2_password BY '${APP_PASSWORD}';
ALTER USER 'ecocycle_app'@'127.0.0.1'
  IDENTIFIED WITH caching_sha2_password BY '${APP_PASSWORD}';

GRANT SELECT, INSERT, UPDATE, DELETE, CREATE, ALTER, INDEX, DROP, REFERENCES, CREATE TEMPORARY TABLES, LOCK TABLES
  ON \`ecocycle\`.*
  TO 'ecocycle_app'@'localhost';

GRANT SELECT, INSERT, UPDATE, DELETE, CREATE, ALTER, INDEX, DROP, REFERENCES, CREATE TEMPORARY TABLES, LOCK TABLES
  ON \`ecocycle\`.*
  TO 'ecocycle_app'@'127.0.0.1';

FLUSH PRIVILEGES;
EOF

$ADMIN_CMD < "$TMP_SQL"
rm -f "$TMP_SQL"

echo "  ✓ User 'ecocycle_app' configured with caching_sha2_password on localhost and 127.0.0.1."
echo "  ✓ Scoped grants applied strictly on ecocycle.*."
echo ""

# ── 6. Update backend/.env securely ──────────────────────────────
echo "[Step 6] Updating backend/.env with the configured password..."

NEW_APP_PASSWORD="$APP_PASSWORD" node scripts/update-env-password.js

# Clear variables from environment
unset APP_PASSWORD APP_PASSWORD_CONFIRM ROOT_PASS

echo ""

# ── 7. Verification: Test direct MySQL connection & Health Check ─
echo "[Step 7] Testing database connection and health check endpoints..."

node scripts/verify-db-connection.js

# Allow background watch server a moment to reload .env
sleep 2

echo ""
echo "  Testing backend GET /api/health directly (port 5000):"
curl -s http://127.0.0.1:5000/api/health | jq . 2>/dev/null || curl -s http://127.0.0.1:5000/api/health
echo ""

echo "  Testing backend GET /api/health via Vite proxy (port 5173):"
curl -s http://localhost:5173/api/health | jq . 2>/dev/null || curl -s http://localhost:5173/api/health
echo ""

echo "============================================================"
echo " MySQL Authentication Setup Complete & Verified!"
echo "============================================================"
