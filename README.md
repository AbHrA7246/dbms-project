# EcoCycle — E-Waste Management & Recycling Optimization System

A sustainability-technology web application that enables individuals, students, and organisations to register surplus electronics, locate certified collection centres, schedule collection requests, and track each item through its verified recycling lifecycle.

Built as a college project with a polished, modern SaaS design in forest green, off-white, and charcoal.

---

## Table of Contents

- [Features](#features)
- [Technology Stack](#technology-stack)
- [Project Structure](#project-structure)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Running the Application](#running-the-application)
- [Available Routes](#available-routes)
- [Configuration](#configuration)
- [Data Persistence — Important Notes](#data-persistence--important-notes)
- [Known Limitations](#known-limitations)
- [Security Audit Notes](#security-audit-notes)

---

## Features

### Public Pages (no login required)
- **Landing page** — hero section, how-it-works overview, accepted e-waste categories, and a responsible-recycling explainer
- **How It Works** — detailed 4-stage technical recycling workflow
- **About** — EcoCycle mission and objectives
- **Accepted Waste** — full category checklist with handling procedures
- **FAQ** — frequently asked questions
- **Contact** — contact information page

### Authenticated Application (login required)
- **Sign up / Sign in** — client-side prototype authentication (localStorage-backed)
- **Personal Dashboard** — live metrics derived strictly from submitted records: registered items, active dispatches, certified disposals, and total weight
- **E-Waste Registration Form** — validated form to declare electronics (brand, model, condition, quantity, weight), select a collection channel (drop-off or pickup), and assign a certified facility. Generates a unique tracking ID (`EW-XXXXXX`) only after a successful write
- **Collection Centres Directory** — searchable, filterable listing of certified facilities with address, hours, phone, and accepted streams
- **Request Tracking** — live list of all submitted requests, a 4-step visual progress bar (Submitted → Scheduled → In Transit → Recycled), chain-of-custody log, and a status-advancement control for demonstration
- **Account Settings** — profile management and a data-reset control

### Design System
- Forest green (`#1B4332`), off-white (`#F8F9FA`), charcoal (`#1F2421`), pale sage (`#EBF2ED`)
- Fully responsive (mobile, tablet, desktop)
- Subtle page-entry transitions, restrained hover effects, custom scrollbar

---

## Technology Stack

| Layer | Technology | Version |
|---|---|---|
| Frontend framework | React | 18.3.x |
| Build tool | Vite | 5.4.x |
| Routing | React Router DOM | 7.x |
| Styling | Tailwind CSS | 3.4.x |
| Icons | Lucide React | 0.468.x |
| CSS post-processing | PostCSS + Autoprefixer | 8.x / 10.x |
| Persistence (Phase 1) | Browser `localStorage` | — |
| Backend | **Not yet implemented** | — |
| Database | **Oracle DB — deferred** | — |

---

## Project Structure

```
ewaste-management/
├── .gitignore                   # Root ignore rules
├── README.md                    # This file
└── frontend/                    # React + Vite SPA
    ├── .env.example             # Environment variable template (no secrets)
    ├── .gitignore               # Frontend-specific ignore rules
    ├── index.html               # HTML entry point
    ├── package.json             # Dependencies and scripts
    ├── package-lock.json        # Locked dependency tree (npm v9+, lockfileVersion 3)
    ├── postcss.config.js        # PostCSS (Tailwind + Autoprefixer)
    ├── tailwind.config.js       # Tailwind design tokens (colors, shadows, fonts)
    ├── vite.config.js           # Vite + React plugin, dev server port 5173
    ├── public/
    │   └── hero-ewaste-recycling.jpg   # Hero photograph
    └── src/
        ├── main.jsx             # React DOM entry
        ├── App.jsx              # Router tree (public + protected routes)
        ├── index.css            # Global styles, Tailwind directives, custom classes
        ├── components/
        │   ├── Navbar.jsx               # Adaptive customer nav
        │   ├── CentreNavbar.jsx         # Facility operations header
        │   ├── Footer.jsx               # Site footer
        │   ├── ProtectedRoute.jsx       # Customer auth guard — redirects to /login
        │   ├── CentreProtectedRoute.jsx # Centre auth guard — redirects to /centre/login
        │   ├── FeatureCard.jsx          # Reusable feature card
        │   └── MetricCard.jsx           # Dashboard stat card
        ├── context/
        │   ├── AuthContext.jsx          # Customer auth state + request API bridge
        │   └── CentreAuthContext.jsx    # Facility session and auth state
        ├── services/
        │   └── storageService.js        # Zero-seed localStorage persistence layer
        └── pages/
            ├── LandingPage.jsx
            ├── HowItWorksPage.jsx
            ├── AboutPage.jsx
            ├── AcceptedWastePage.jsx
            ├── FAQPage.jsx
            ├── ContactPage.jsx
            ├── LoginPage.jsx
            ├── SignupPage.jsx
            ├── DashboardPage.jsx
            ├── RegisterPage.jsx
            ├── CentersPage.jsx
            ├── RequestsPage.jsx
            ├── AccountPage.jsx
            └── centre/
                ├── CentreRegisterPage.jsx     # Facility partner onboarding
                ├── CentreLoginPage.jsx        # Facility sign-in
                ├── CentreDashboardPage.jsx    # Intake review & metrics
                ├── CentreRequestsPage.jsx     # Request inspection & processing
                ├── CentreAppointmentsPage.jsx # Scheduling & pickups
                ├── CentreCapacityPage.jsx     # Mass & unit throughput quotas
                └── CentreProfilePage.jsx      # Accreditation & streams
```

---

## Prerequisites

| Tool | Minimum version | Notes |
|---|---|---|
| Node.js | 18.x LTS | 20.x LTS recommended |
| npm | 9.x | Included with Node 18+ |
| Git | any | For cloning |

Verify your versions:

```bash
node --version
npm --version
```

---

## Installation

Clone the repository and install frontend dependencies:

```bash
git clone https://github.com/<your-username>/ewaste-management.git
cd ewaste-management/frontend
npm install
```

No backend setup is required for Phase 1.

---

## Running the Application

### Development server

```bash
cd frontend
npm run dev
```

Open **http://localhost:5173** in your browser.

The development server supports Hot Module Replacement (HMR). Changes to any source file reflect instantly without a manual refresh.

### Production build

```bash
cd frontend
npm run build
```

Output is written to `frontend/dist/`. Verify the build locally with:

```bash
npm run preview
```

The preview server starts at **http://localhost:4173**.

> **No backend service is required.** The application runs entirely in the browser for Phase 1.

---

## Available Routes

### Public routes — accessible without signing in

| Path | Page |
|---|---|
| `/` | Landing page |
| `/how-it-works` | Recycling workflow |
| `/about` | About EcoCycle |
| `/accepted-waste` | Accepted e-waste categories |
| `/faq` | Frequently asked questions |
| `/contact` | Contact information |
| `/login` | Sign-in |
| `/signup` | Account registration |

### Private routes — require authentication

| Path | Page |
|---|---|
| `/dashboard` | Personal dashboard |
| `/register` | Register e-waste / create collection request |
| `/centers` | Collection centre directory |
| `/requests` | Collection request tracking |
| `/account` | Account settings |

Direct access to a private customer route while signed out redirects to `/login`. After signing in, the user is returned to the originally requested page.

### Recycling Centre Portal Routes

| Path | Page | Access |
|---|---|---|
| `/centre/register` | Facility Partner Onboarding | Public |
| `/centre/login` | Facility Staff Sign-In | Public |
| `/centre/dashboard` | Intake queue & workload metrics | Facility authenticated (`CentreProtectedRoute`) |
| `/centre/requests` | Hardware inspection & status transitions | Facility authenticated |
| `/centre/appointments` | Pickup/drop-off scheduling calendar | Facility authenticated |
| `/centre/capacity` | Weekly throughput & unit quotas | Facility authenticated |
| `/centre/profile` | Facility accreditation & public directory profile | Facility authenticated |

Direct access to private facility routes while signed out redirects to `/centre/login`. Navigation links are dynamically scoped between customer and facility portals.

---

## Configuration

### Environment variables

No environment variables are required for Phase 1.

Copy the template for future use:

```bash
cp frontend/.env.example frontend/.env
```

See `frontend/.env.example` for a full list of variables that will be needed when the backend is introduced (Oracle DB connection, JWT secret, API base URL).

### Tailwind design tokens

Custom colours, shadows, and fonts are defined in [`frontend/tailwind.config.js`](./frontend/tailwind.config.js):

```js
colors: {
  forest:   { DEFAULT: '#1B4332', ... },   // Primary brand green
  offwhite: { DEFAULT: '#F8F9FA', ... },   // Page background
  charcoal: { DEFAULT: '#1F2421', ... },   // Primary text
  sage:     { DEFAULT: '#EBF2ED', ... },   // Section backgrounds
}
```

---

## Data Persistence — Important Notes

> **localStorage is a temporary, browser-local persistence layer for Phase 1 only.**

- All e-waste registrations and collection requests are saved in the **browser's localStorage** under a key namespaced to the signed-in user's email address.
- Data **persists across page navigation and browser refreshes** within the same browser on the same device.
- Data is **entirely local** to the individual browser instance. It is **not uploaded to GitHub** and is **not shared between different browsers or devices**.
- There is **no shared backend database** in Phase 1. Each person who runs this application from source sees only their own locally entered records.
- Clearing browser site data or calling "Clear My Saved Requests" in Account Settings will permanently erase local records.

The persistence layer is isolated in [`frontend/src/services/storageService.js`](./frontend/src/services/storageService.js). When Oracle Database integration resumes, this single file will be replaced with `fetch('/api/requests')` calls. No UI components need to change.

---

## Known Limitations

| Area | Current state |
|---|---|
| **Authentication** | Client-side prototype (localStorage-backed). Customer login validates against existing registered accounts only; new accounts require explicit registration. Passwords verified locally. Suitable for demonstration; not for production security. |
| **Multi-user isolation** | Not enforced on shared client devices. Any person with access to the same browser profile can sign in to registered accounts. |
| **Data durability** | localStorage can be cleared by the browser at any time (private/incognito mode, storage quota pressure). |
| **Backend API** | Not implemented. No Express server exists. All API references in comments describe the future Oracle-backed architecture. |
| **Oracle Database** | Integration is deferred. The `storageService.js` module is the planned replacement point. |
| **File uploads** | Not supported. |
| **Email notifications** | Not supported. |
| **Real recycling operations** | This is an academic project prototype. Collection centre details, certifications, and phone numbers are representative examples and do not represent real operational facilities. |

---

## Asset Attribution

| Asset | Description | Source / Creator | Licence | Source URL |
|---|---|---|---|---|
| **Homepage Hero Photograph** | Real printed circuit boards sorted and prepared for material recovery and electronics recycling | Crista Castellanos | [Creative Commons Attribution-ShareAlike 4.0 International (CC BY-SA 4.0)](https://creativecommons.org/licenses/by-sa/4.0/) | [Wikimedia Commons](https://commons.wikimedia.org/wiki/File:Board_mother_tarjeta_madre_crista_castellanos.jpg) |

---

## Security Audit Notes

The following checks were performed before publication:

- ✅ No API keys, tokens, or real passwords committed to source
- ✅ No real personal data in source files
- ✅ No hardcoded backend URLs or connection strings
- ✅ No `VITE_*` environment variables required or present
- ✅ `node_modules/` and `dist/` excluded by `.gitignore`
- ✅ `.env` files excluded; `.env.example` committed with placeholder guidance only
- ⚠️ Authentication is a client-side prototype — do not use credentials you use elsewhere
- ⚠️ localStorage is not encrypted — do not enter sensitive personal information

---

## Licence

Academic project. All rights reserved by the author(s).

