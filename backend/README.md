# EcoCycle Backend (Express + MySQL)

A secure, modular Node.js/Express backend service for the EcoCycle E-Waste Management & Recycling Optimization Platform.

---

## 1. Directory Structure

```text
backend/
├── .env.example          # Safe template with environment variable documentation
├── .env                  # Local environment file (git-ignored, chmod 600)
├── .gitignore            # Backend-specific ignore rules
├── package.json          # ESM module configuration & scripts
├── package-lock.json
├── scripts/
│   └── setup-db-user.sql # SQL provisioning script for dedicated database user
├── src/
│   ├── config/
│   │   └── db.js         # mysql2/promise connection pool & security safeguards
│   ├── middleware/
│   │   ├── errorHandler.js # Sanitized error handler
│   │   └── notFound.js     # Structured 404 handler
│   ├── routes/
│   │   └── health.js       # Safe GET /api/health endpoint
│   ├── app.js            # Express app assembly & CORS configuration
│   └── server.js         # HTTP server startup & graceful shutdown
└── tests/
    ├── app.test.js       # Integration tests for routes & error handlers
    └── db.test.js        # Database safeguard tests
```

---

## 2. Security Safeguards

- **No Root Connections:** The database pool explicitly blocks connections when `DB_USER` is `root`.
- **Localhost Binding:** MySQL service is bound strictly to `127.0.0.1` and not exposed to the public network.
- **Git Protection:** `backend/.env` is ignored by both root and backend `.gitignore`, and restricted with `chmod 600`.
- **Sanitized Health Checks:** `GET /api/health` reports status without ever leaking database credentials, connection strings, or raw stack traces.
- **Graceful Failure:** If the database is temporarily unreachable, the service reports `"status": "degraded"` rather than crashing.

---

## 3. Database User Setup

To create the dedicated application database user (`ecocycle_app`), run the following SQL commands in your MySQL administrative console:

```sql
-- Connect to MySQL as administrator
-- sudo mysql (or: mysql -u root -p)

CREATE DATABASE IF NOT EXISTS `ecocycle`
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

CREATE USER IF NOT EXISTS 'ecocycle_app'@'localhost'
  IDENTIFIED BY 'YOUR_CHOSEN_SECURE_PASSWORD';

GRANT SELECT, INSERT, UPDATE, DELETE, CREATE, ALTER, INDEX, DROP, REFERENCES, CREATE TEMPORARY TABLES, LOCK TABLES
  ON `ecocycle`.*
  TO 'ecocycle_app'@'localhost';

FLUSH PRIVILEGES;
```

Then update `backend/.env`:
```bash
DB_PASSWORD=YOUR_CHOSEN_SECURE_PASSWORD
```

---

## 4. Running the Backend

From the `backend/` directory:

```bash
# Run in development mode with automatic reload on file changes
npm run dev

# Run in production mode
npm start

# Run automated tests
npm test
```

---

## 5. API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api` | Service metadata and version |
| `GET` | `/api/health` | Health check and database connectivity probe |
| `GET` | `/health` | Alias for `/api/health` |

---

## 6. Frontend Dev Server Integration

The Vite development server (`frontend/vite.config.js`) proxies all `/api` requests to `http://127.0.0.1:5000`:
- `http://localhost:5173/api/health` forwards directly to the backend.
