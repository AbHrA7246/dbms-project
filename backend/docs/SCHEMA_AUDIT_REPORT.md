# EcoCycle — Final Schema Audit & Migration Preparation Report

**Date:** October 21, 2026  
**Status:** Approved in Principle / Pre-Execution Review  
**Target Environment:** Local MySQL 8.0 (`127.0.0.1:3306`), Database: `ecocycle`, User: `ecocycle_app`

---

## 1. Final Schema Review: 9-Point Verification

| Checkpoint | Codebase Finding | Schema Implementation & Integrity Guarantee |
|---|---|---|
| **1. Email Uniqueness** | Customer accounts in `AuthContext.jsx` and Facility accounts in `storageService.js` / `CentreAuthContext.jsx` maintain separate authentication stores. | Both `users` and `recycling_centres` enforce independent `UNIQUE KEY` constraints on `email`. MySQL’s `utf8mb4_unicode_ci` collation ensures case-insensitive uniqueness (`user@example.com` = `User@example.com`). |
| **2. Append-Only Request History** | `storageService.js` appends history entries on every lifecycle transition, appointment change, or address modification (never mutates or deletes past history). | `request_history` is an append-only audit trail (`id BIGINT AUTO_INCREMENT PRIMARY KEY`) with foreign key `ON DELETE CASCADE` to `collection_requests`. Application code never runs `UPDATE` or `DELETE` on this table. |
| **3. Independent Request Visibility** | `storageService.js` maintains separate customer (`ecocycle_hidden_requests_${email}`) and facility (`ecocycle_hidden_centre_requests_${centreId}`) archive keys for resolved requests. | `request_visibility` models this independently via `(request_id, hidden_by_type, hidden_by_id)` with a unique composite key preventing duplicates. Hiding a record for a customer leaves it fully visible to the facility and vice-versa. |
| **4. Appointment History & Rescheduling** | `storageService.js` maintains the active appointment on the request, logs past slots in history, and stores `customerNote`, `rescheduledAt`, and `rescheduledBy`. | In `appointments`, we added `previous_appointment_date DATE NULL` and `previous_time_slot VARCHAR(50) NULL`. This captures the immediate prior slot directly in the scheduling entity, while `request_history` preserves the entire immutable sequence of appointment events. |
| **5. Concurrency & Capacity Enforcement** | `storageService.js` computes daily and slot capacity limits across 4 standard 2-hour windows. Concurrent bookings in web storage risked race conditions. | Added composite index `idx_appointments_capacity (centre_id, appointment_date, time_slot, status)` and `idx_requests_capacity`. Database transactions using `SELECT ... FOR UPDATE` will lock slot and day rows atomically, preventing overbooking under concurrent requests. |
| **6. Foreign-Key Deletion Actions** | `checkCustomerDeletionEligibility` and `checkCentreDeletionEligibility` strictly block deletion if any unresolved requests exist. | On `collection_requests`: `user_id` and `centre_id` use `ON DELETE SET NULL`. If an eligible account is decommissioned, transaction rows retain `user_email`, `customer_name`, and `centre_name` permanently for audit and R analytics. `user_addresses` and `user_preferences` use `ON DELETE CASCADE`. |
| **7. Schema Alignment** | Frontend uses 14 statuses, 5 core categories, 7 weekday codes (`Mon`–`Sun`), 24h hours, 0.01–5000 kg weights, and Geoapify `lat`/`lng`. | All 14 statuses (`Submitted` through `Cancelled`), categories, operating days, `DECIMAL(10, 8)` coordinates, and custom ID formats (`usr_`, `CTR-`, `EW-`, `ADDR-`, `APT-`) match the frontend models with zero discrepancies. |
| **8. Password Security & Migration Safety** | Existing prototype stored plain text in localStorage. | `password_hash VARCHAR(255) NOT NULL` is designated for bcrypt/argon2 hashed digests. **Plaintext passwords will never be copied into `password_hash`**. In the migration phase, any seeded or imported accounts will require bcrypt hashing or standard password setup/reset. |
| **9. MySQL 8.0 Compatibility** | MySQL 8.0.46 is installed locally. | All DDL constructs (`InnoDB`, `utf8mb4_unicode_ci`, `DECIMAL(10, 8)`, `BIGINT AUTO_INCREMENT`, foreign keys with `SET NULL` / `CASCADE`) are fully supported. |

---

## 2. Migration Runner Implementation

A safe, idempotent migration runner has been implemented at `backend/src/config/migrate.js` with npm scripts configured in `backend/package.json`:

```bash
# Check pending vs applied migrations without modifying the database
npm run migrate:status

# Validate migration statements and checksums without applying changes
npm run migrate:dry-run

# Apply pending migrations atomically and record version
npm run migrate
```

### Safety Features of the Migration Runner:
1. **Version Tracking**: Automatically creates and checks `schema_migrations` (`version`, `name`, `checksum`, `applied_at`, `execution_time_ms`).
2. **Double-Execution Prevention**: Skips any migration file whose version is already recorded in `schema_migrations`.
3. **Atomic Statement Execution & Halting**: Executes SQL statements sequentially; halts immediately on any error and aborts subsequent migrations.
4. **Sanitized Error Reporting**: Catches errors and formats them with sanitized messages (no database passwords, host details, or connection URIs exposed in logs).
5. **Database State Verification**: Checked the target database `ecocycle` prior to execution:
   ```text
   Database:         ecocycle
   Existing Tables:  None (Empty Database)
   ```

---

## 3. Reviewable Corrections Made

1. **`backend/migrations/001_initial_schema.sql`**:
   - Added `previous_appointment_date DATE NULL` and `previous_time_slot VARCHAR(50) NULL` to `appointments` to retain pre-reschedule slot context.
   - Added composite index `idx_appointments_capacity (centre_id, appointment_date, time_slot, status)` for fast atomic locking and slot capacity aggregation.
   - Added composite index `idx_requests_capacity (centre_id, status, declared_weight_kg, quantity)` to `collection_requests` for weekly throughput verification.
2. **`backend/docs/DATABASE_SCHEMA.md`**:
   - Synchronized technical documentation with the updated table definitions and capacity indexes.

---

## 4. Final Table List & Constraints

When migration `001_initial_schema.sql` is executed, the following **10 tables** will be created in `ecocycle`:

```text
1. users
   ├── Primary Key: id VARCHAR(64)
   ├── Unique Key:  email VARCHAR(255) [case-insensitive via utf8mb4_unicode_ci]
   └── Columns:     name, password_hash (VARCHAR 255), phone, user_type, avatar_color, created_at, updated_at

2. user_preferences
   ├── Primary Key: user_id VARCHAR(64)
   └── Foreign Key: user_id -> users(id) ON DELETE CASCADE

3. user_addresses
   ├── Primary Key: id VARCHAR(64)
   ├── Foreign Key: user_id -> users(id) ON DELETE CASCADE
   └── Columns:     label, address_line, city, state, postal_code, pickup_instructions, is_default, latitude, longitude

4. recycling_centres
   ├── Primary Key: id VARCHAR(64)
   ├── Unique Key:  email VARCHAR(255)
   └── Columns:     name, password_hash, phone, address, city, service_area, max_weekly_capacity_kg, max_weekly_units,
                    slot_limit_kg, lead_time_days, pickup_available, dropoff_available, opening_time, closing_time,
                    latitude, longitude, staff_name, staff_role

5. centre_operating_days
   ├── Primary Key: (centre_id, day_of_week)
   └── Foreign Key: centre_id -> recycling_centres(id) ON DELETE CASCADE

6. centre_accepted_categories
   ├── Primary Key: (centre_id, category)
   └── Foreign Key: centre_id -> recycling_centres(id) ON DELETE CASCADE

7. collection_requests
   ├── Primary Key: id VARCHAR(64) [EW-XXXXXX]
   ├── Foreign Key: user_id -> users(id) ON DELETE SET NULL
   ├── Foreign Key: centre_id -> recycling_centres(id) ON DELETE SET NULL
   └── Columns:     user_email, customer_name, customer_phone, centre_name, category, brand, model, items,
                    condition_state, quantity, declared_weight_kg, received_weight_kg, weight_discrepancy_kg,
                    method, channel, pickup_address, dropoff_facility_address, dropoff_facility_city,
                    dropoff_facility_hours, latitude, longitude, preferred_slot, notes, status, current_step,
                    rejection_reason, cancellation_reason, cancelled_at, created_at, updated_at

8. appointments
   ├── Primary Key: id VARCHAR(64)
   ├── Unique Key:  request_id VARCHAR(64) [1-to-1 with collection_requests]
   ├── Unique Key:  booking_ref VARCHAR(64) [APT-XXXXXX]
   ├── Foreign Key: request_id -> collection_requests(id) ON DELETE CASCADE
   ├── Foreign Key: centre_id -> recycling_centres(id) ON DELETE SET NULL
   └── Columns:     type, appointment_date, time_slot, time_window, status, instructions, pickup_address,
                    latitude, longitude, customer_note, previous_appointment_date, previous_time_slot,
                    booked_by, booked_at, proposed_by, proposed_at, rescheduled_by, rescheduled_at

9. request_history
   ├── Primary Key: id BIGINT AUTO_INCREMENT
   ├── Foreign Key: request_id -> collection_requests(id) ON DELETE CASCADE
   └── Columns:     event_time, event_time_formatted, event_description, actor [Customer, Centre Staff, System]

10. request_visibility
    ├── Primary Key: id BIGINT AUTO_INCREMENT
    ├── Unique Key:  (request_id, hidden_by_type, hidden_by_id)
    ├── Foreign Key: request_id -> collection_requests(id) ON DELETE CASCADE
    └── Columns:     hidden_by_type [customer, centre], hidden_by_id, created_at
```

---

## 5. Actual Test Results

1. **Migration Status Probe (`npm run migrate:status`)**:
   ```text
   Database:         ecocycle
   Existing Tables:  None (Empty Database)
   Migration Files:  1 file(s) found in backend/migrations/
   Applied Count:    0
   Migration Status: [PENDING] 001_initial_schema.sql
   ```
2. **Dry Run Validation (`npm run migrate:dry-run`)**:
   ```text
   Dry Run Mode: Inspecting pending statements without modifying database...
   [WOULD APPLY] 001_initial_schema.sql (10 statements, checksum: 6b6d86dbf810...)
   Found 1 pending migration(s) ready to be applied.
   ```
   Verified that `ecocycle` still contains 0 tables after dry-run.
3. **Backend Test Suite (`npm test`)**:
   - 6/6 tests passing in 467ms with automated connection pool cleanup.
4. **Frontend Verification Suite (`node scratch/test-verification.js`)**:
   - 706/706 tests passing.
5. **Frontend Production Build (`npm run build`)**:
   - Succeeded in 5.37s with zero errors.
6. **Live Health Checks**:
   - Direct: `http://127.0.0.1:5000/api/health` -> `{"status":"ok","database":{"status":"connected","name":"ecocycle"}}`
   - Proxy: `http://localhost:5173/api/health` -> `{"status":"ok","database":{"status":"connected","name":"ecocycle"}}`

---

## 6. Planned Migration Command

When explicit approval is provided, the exact command that will be executed to apply the schema is:

```bash
cd /home/kurup-abhiram/Projects/ewaste-management/backend
npm run migrate
```
