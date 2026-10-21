# EcoCycle — Statistical E-Waste Analytics Pipeline & Data Specification

This directory contains the statistical modeling, exploratory audit, and reporting pipeline for the **EcoCycle E-Waste Management & Recycling Optimization System**.

The pipeline is implemented in **Base R (>= 3.5)** without third-party package dependencies (no `tidyverse` or `ggplot2` required), allowing it to execute out-of-the-box on standard production and research servers.

---

## 1. Quick Start

### Step 1: Export Operational Dataset from EcoCycle
1. Open the EcoCycle Web Application in your browser.
2. Sign in to the **Recycling Centre Portal** at `/centre/login` using your facility credentials.
3. On the **Facility Operations Dashboard**, locate the header action bar.
4. Click **"Export for R Analytics"** (or use the operational export utility).
5. A privacy-sanitized CSV file (`ecocycle_analytics_data.csv` or `ecocycle_<facility_id>_dataset.csv`) will download to your machine.

### Step 2: Execute the R Analysis Script
Run the script using `Rscript`:

```bash
# Using default file path (ecocycle_analytics_data.csv in current directory):
Rscript analytics/initial_analysis.R

# Or specify a custom CSV path:
Rscript analytics/initial_analysis.R ~/Downloads/ecocycle_CTR-001_dataset.csv
```

### Graceful Fallback Handling
- **Missing File:** If the specified file does not exist, the script prints clear instructions on how to export data from the EcoCycle UI and exits cleanly (`status = 0`).
- **Empty Dataset:** If the file contains only the header row (0 declarations), the script informs the operator and exits gracefully (`status = 0`).

---

## 2. Exported Data Dictionary & Privacy Compliance

The EcoCycle data export utility (`storageService.exportRequestsForAnalytics`) enforces strict privacy protection standards:

> [!IMPORTANT]
> **Personally Identifiable Information (PII) is strictly omitted:**
> Customer names, personal email addresses, phone numbers, and specific street/apartment numbers are stripped at generation time. Only regional metadata (city, facility ID, pseudonymized declaration ID) and operational metrics are retained for statistical modeling.

### Dataset Schema (`19 Columns`)

| Column Name | Data Type | Description | Example |
| :--- | :--- | :--- | :--- |
| `request_id` | String | Pseudonymized declaration identifier | `EW-8921104` |
| `status` | String | Detailed operational status | `Submitted`, `Scheduled`, `Received`, `Completed`, `Cancelled`, `Rejected` |
| `status_group` | String | High-level status group (`active`, `completed`, `cancelled`, `rejected`) | `completed` |
| `category` | String | Hardware category | `computing`, `mobile`, `battery`, `peripherals`, `appliances` |
| `brand` | String | Manufacturer or brand name | `Dell`, `Apple`, `HP` |
| `condition` | String | Hardware functional condition | `working`, `repairable`, `damaged`, `end-of-life` |
| `quantity` | Integer | Total units in batch | `1`, `4` |
| `declared_weight_kg` | Numeric (2 dec) | Customer-declared mass in kilograms | `2.50`, `18.75` |
| `received_weight_kg` | Numeric (2 dec) | Facility-weighed verified intake mass | `2.45` (blank if not yet received) |
| `weight_discrepancy_kg`| Numeric (2 dec) | Net intake difference (`received - declared`) | `-0.05` (blank if not yet received) |
| `method` | String | Intake channel (`pickup` or `dropoff`) | `pickup` |
| `centre_id` | String | Unique facility identifier | `CTR-7821` |
| `centre_name` | String | Name of assigned recycling facility | `Metro Eco Hub` |
| `city` | String | Regional city (PII-safe location) | `San Francisco` |
| `has_coordinates` | Boolean | Geographic verification indicator (`TRUE` / `FALSE`) | `TRUE` |
| `latitude` | Numeric (6 dec) | Verified latitude from Geoapify | `37.774900` |
| `longitude` | Numeric (6 dec) | Verified longitude from Geoapify | `-122.419400` |
| `created_date` | String | Declaration submission timestamp | `2026-10-14` |
| `scheduled_date` | String | Appointment date | `2026-10-18` (blank if unscheduled) |

---

## 3. Analysis Capabilities in `initial_analysis.R`

The base R script performs four core operational audits:

1. **Data Integrity & Spatial Coverage Audit:**
   - Evaluates active pipeline volume vs. historical/terminal declarations.
   - Computes **Geoapify Geocoding Coverage Rate** (% of records with verified coordinates vs unverified manual addresses).
   - Audits weight precision and distribution (min, max, median, mean, standard deviation).

2. **Hardware Stream Composition:**
   - Aggregates mass and unit volume by hardware category.
   - Identifies stream shares (e.g. Computing vs Appliances) to assist facilities in material sorting and refining allocations.

3. **Intake Discrepancy Analysis (Declared vs Received):**
   - Compares customer-declared weights against physical facility scale readings upon intake.
   - Computes net discrepancy, mean discrepancy per declaration, and extreme outlier bounds.
   - Performs a **paired Student's t-test** ($N \ge 5$) to test whether customers exhibit statistically significant systematic over-declaration or under-declaration bias.

4. **Facility Capacity & Logistics Distribution:**
   - Compares Doorstep Courier Pickup demand vs Facility Depot Drop-off volume.
   - Summarizes dispatch volume and cumulative mass per registered facility.

---

## 4. Architectural Evolution Roadmap

```
Current Prototype (Phase 1)
┌─────────────────────────────────┐       ┌───────────────────────────────┐
│ React 18 SPA (Vite + Tailwind)  │──────▶│ LocalStorage Persistence      │
│ • Client Geocoding (Geoapify)   │       │ • Master Declarations Store   │
│ • 100% Manual Facility Choice   │       │ • Registered Facilities Store │
│ • Client-side CSV Export Button │       └──────────────┬────────────────┘
└─────────────────────────────────┘                      │ Manual CSV Export
                                                         ▼
                                          ┌───────────────────────────────┐
                                          │ Base R Script Pipeline        │
                                          │ (initial_analysis.R)          │
                                          └───────────────────────────────┘

Future Enterprise Architecture (Phase 2 Target)
┌─────────────────────────────────┐
│ React Client / Mobile PWA       │
│ • Secure token authentication   │
│ • Role-based dashboards         │
└────────────────┬────────────────┘
                 │ HTTPS / REST / JWT
                 ▼
┌─────────────────────────────────────────────────────────────────────────┐
│ Node.js / Express API Backend Service                                   │
│ • Server-side Geoapify Proxy (API key concealed, rate limits enforced)  │
│ • Transactional business logic & capacity enforcement                   │
│ • Scheduled R batch jobs & automated compliance reporting               │
└────────────────┬────────────────────────────────────────────────────────┘
                 │ Oracle Call Interface (node-oracledb)
                 ▼
┌─────────────────────────────────────────────────────────────────────────┐
│ Oracle Database (Autonomous Transaction Processing)                    │
│ • Relational Tables: REQUESTS, CENTRES, AUDIT_TRAIL, USERS              │
│ • Oracle Spatial (SDO_GEOMETRY): Native geospatial indexing             │
│   - Distance calculations, polygons, and regional containment queries   │
│ • ACID Transactions: Serialized appointment booking lockouts            │
└────────────────┬────────────────────────────────────────────────────────┘
                 │ DBI / ROracle Driver
                 ▼
┌─────────────────────────────────────────────────────────────────────────┐
│ R Enterprise Analytics Pipeline & Shiny Operational Dashboard           │
│ • Automated WEEE Directive compliance reports                           │
│ • Time-series forecasting (ARIMA / Prophet) for seasonal e-waste surges │
│ • Vehicle routing optimization (VRP) based on Oracle Spatial networks   │
└─────────────────────────────────────────────────────────────────────────┘
```

### Key Differences in Future Phase 2:
1. **API Key Concealment:** In Phase 1, `VITE_GEOAPIFY_API_KEY` is referenced client-side with origin/referrer restrictions. In Phase 2, all geocoding calls will be proxied through the Node.js backend, keeping the API key completely private behind the server firewall.
2. **Oracle Spatial (`SDO_GEOMETRY`):** Rather than storing raw latitude/longitude floats, Phase 2 will store geometric point objects in Oracle Spatial, enabling spatial indexing (`MDSYS.SPATIAL_INDEX`), polygon service area containment checks (`SDO_INSIDE`), and network routing.
3. **Automated Analytics:** Rather than manual CSV downloads, R scripts will run on a scheduled cron runner or container connecting directly to Oracle DB via `ROracle`, generating automated operational PDF/HTML reports for management.
