# EcoCycle Project Status Tracker

Last Updated: October 16, 2026

## Overview
EcoCycle is an E-Waste Management & Recycling Optimization System DBMS college project built with React, Vite, Tailwind CSS, and Lucide React. This tracker logs the progress across development phases.

---

## Task Progress

### 1. Completed Tasks ✅
- **Public Website Foundation:**
  - Modern SaaS informational website in Forest Green (`#1B4332`), Off-white (`#F8F9FA`), Charcoal (`#1F2421`), and Pale Sage (`#EBF2ED`).
  - Landing page with high-quality verified hero photography, accepted waste categories, and recycling explainer.
  - Public pages: `/`, `/how-it-works`, `/about`, `/accepted-waste`, `/faq`, `/contact`.
  - Client-side prototype authentication (`/login`, `/signup`) with session in `localStorage`.
- **Customer Application Portal:**
  - Protected customer routes (`/dashboard`, `/register`, `/centers`, `/requests`, `/account`).
  - Multi-attribute item declaration with input validation and unique `EW-XXXXXX` tracking ID generation.
  - Personal dashboard reflecting live calculated metrics from stored records (total items, active dispatches, certified disposals, total kg).
  - Certified collection centre directory with category search and facility preference selection.
  - Realistic empty states for new user accounts with zero fabricated demo requests.
- **Shared Master Persistence Service (`storageService.js`):**
  - Unified master collection store (`ecocycle_master_requests`) ensuring cross-portal bidirectional synchronization.
  - Backward compatibility with legacy per-user stores (`ecocycle_requests_${email}`).
  - Reactive `ecocycle_storage_update` events for instantaneous tab/view updates.
- **Recycling Centre Portal (Frontend-Only Phase):**
  - Centre authentication context and session isolation (`ecocycle_centre_session`).
  - Protected centre routes with dedicated `CentreNavbar` and facility identity switcher.
  - `/centre/login`: Facility staff sign-in with 1-click test credentials for all 4 certified centres.
  - `/centre/dashboard`: Operational KPI summary cards, weekly intake capacity gauge, and incoming intake queue.
  - `/centre/requests`: Complete request review console (Accept, Reject with reason dialog, Propose Appointment modal, Lifecycle status transitions, and audit trails).
  - `/centre/appointments`: Pickup and drop-off schedule tracker with status filters (`Confirmed`, `Schedule Proposed`, `Reschedule Requested`).
  - `/centre/capacity`: Capacity monitor with mass throughput limits (kg), maximum unit quotas, lead times, and pickup/drop-off toggles.
  - `/centre/profile`: Facility metadata, accreditations, public directory details, and staff info.
- **Customer-Centre Integration & Bidirectional Scheduling:**
  - 11 logical states supported across customer and centre views:
    1. `Submitted` (Declaration logged, awaiting centre review)
    2. `Accepted` (Intake approved by facility)
    3. `Schedule Proposed` (Centre proposed date/time window; customer alert triggered)
    4. `Confirmed` (Customer confirmed appointment slot)
    5. `Reschedule Requested` (Customer requested alternative date/time)
    6. `In Transit` (Courier dispatched for doorstep collection)
    7. `Drop-off Completed` (Hardware intake verified at depot desk)
    8. `Processing` (Disassembly, hazardous depollution & sorting in progress)
    9. `Completed` (Materials reclaimed, certified zero-landfill)
    10. `Rejected` (Declined by centre with recorded reason displayed to customer)
    11. `Cancelled` (Declined by customer)
  - Interactive appointment confirmation and reschedule request cards directly on customer's `/requests` and `/dashboard`.

- **Recycling Centre Registration & Zero-Demo Data Architecture:**
  - EcoCycle starts with **zero pre-populated recycling centres** on fresh install.
  - Automatic seeding and hardcoded facilities (`Metro GreenTech`, `Central EcoRecycle`, `Apex Material Recovery`, `Community CleanTech Drop Point`) completely removed.
  - Legacy demo entries sanitized from localStorage on load.
  - Dedicated facility partner onboarding flow implemented at `/centre/register` (`CentreRegisterPage.jsx`) collecting organization credentials, contact leads, operating areas, accepted streams, throughput capacities (kg/week & unit limits), and intake channels.
  - `/centre/login` provides a clean onboarding empty state when 0 facilities exist, directing to registration, and real email/password authentication when facilities exist.
  - Dynamic integration with customer views (`/centers`, `/register`): centres registered via the portal immediately populate the customer dropdowns and directory with zero restart required.
  - Unauthenticated `CentreNavbar` state: hides operational links (`Dashboard`, `Requests`, `Appointments`, etc.) and facility switcher when unauthenticated to prevent broken redirect loops.
- **Batch 4: Geoapify Geocoding Integration & R Statistical Analytics Pipeline:**
  - Resilient geocoding service module (`src/services/geocodingService.js`) integrating Geoapify Geocoding API (`api.geoapify.com/v1/geocode/search`).
  - Strict geographic coordinate validation (`-90 <= lat <= 90`, `-180 <= lon <= 180`) and in-memory query caching.
  - Safe configuration via `VITE_GEOAPIFY_API_KEY`, `.env.example` documentation, and domain origin restriction guidance.
  - Non-intrusive UI integration in `RegisterPage.jsx`, `RequestsPage.jsx`, `CentreRegisterPage.jsx`, and `CentreProfilePage.jsx` preserving user-entered raw addresses.
  - Strict preservation of manual centre selection (zero automatic rerouting or straight-line distance sorting).
  - Privacy-compliant CSV export utility (`exportRequestsForAnalytics` and `downloadAnalyticsCsv`) in `storageService.js` omitting customer PII.
  - Base R statistical analytics pipeline (`analytics/initial_analysis.R`) computing volume by category, geocoding coverage, paired t-test intake discrepancies, and channel distribution.
  - Comprehensive documentation and architecture evolution roadmap in `analytics/README.md`.
---

### 2. In Progress Tasks 🔄
- Project ready for faculty demonstration and review.

---

### 3. Pending Tasks ⏳
- **Phase 2 — Backend Migration:**
  - Build Node.js + Express REST API server.
  - Replace `storageService.js` with `fetch('/api/requests')` endpoints.
  - Integrate Oracle Database tables (`USERS`, `CENTRES`, `COLLECTION_REQUESTS`, `APPOINTMENTS`, `AUDIT_LOGS`, `CAPACITY_CONFIG`).
  - Server-side JWT authentication and role-based access control (Customer, Centre Staff, Administrator).

---

### 4. Blocked Tasks 🚫
- *None currently.* All planned frontend-only objectives are operating without blockers.

---

### 5. Needs Verification 🔍
- Customer-to-centre multi-tab live sync test across Chrome/Firefox.
- Capacity threshold visual warnings when active dispatches exceed 85% of configured allowance.

