# EcoCycle — E-Waste Management & Recycling Optimization System

EcoCycle is a web-based e-waste management platform developed as a college project. It provides an interface for registering unwanted electronic devices, exploring collection facilities, submitting collection requests, and tracking recycling progress.

The project aims to explore how digital platforms can support responsible e-waste disposal and more efficient recycling workflows.

## Features

### Public pages
- **Home:** Project introduction and responsible recycling overview.
- **How It Works:** Explanation of the proposed recycling workflow.
- **About:** Project mission and objectives.
- **Accepted Waste:** Information about accepted electronic waste categories.
- **FAQ:** Frequently asked questions.
- **Contact:** Contact information.

### Application pages
- **Sign Up / Sign In:** Client-side demonstration authentication.
- **Dashboard:** Overview of registered items and collection requests.
- **E-Waste Registration:** Form for entering electronic-item details and collection preferences.
- **Collection Centres:** Directory of example collection facilities.
- **Request Tracking:** View submitted requests and their displayed progress.
- **Account Settings:** Manage account information and clear locally saved data.

> **Current status:** EcoCycle is a frontend prototype. Authentication and request management are not connected to a production backend or a real recycling network.

## Technology Stack

| Technology | Purpose |
|---|---|
| React 18 | User interface |
| Vite 5 | Development server and build tool |
| React Router DOM | Client-side routing |
| Tailwind CSS 3 | Styling and responsive layouts |
| Lucide React | Icons |
| PostCSS and Autoprefixer | CSS processing |
| Browser `localStorage` | Local data persistence |
| Node.js and npm | Development environment |

**Planned:** Node.js/Express backend services and Oracle Database integration. Neither is implemented in the current version.

## Project Structure

```text
dbms-project/
├── .gitignore
├── README.md
└── frontend/
    ├── .env.example
    ├── .gitignore
    ├── index.html
    ├── package.json
    ├── package-lock.json
    ├── public/
    │   └── hero-ewaste-recycling.jpg
    └── src/
        ├── App.jsx
        ├── main.jsx
        ├── index.css
        ├── components/
        ├── context/
        ├── pages/
        └── services/
            └── storageService.js
```

## Prerequisites

Install the following on your computer:

- **Git** — to download the repository.
- **Node.js 20 LTS recommended** — Node.js 18 or later.
- **npm** — included with Node.js.

Verify the installations:

```bash
git --version
node --version
npm --version
```

## Installation

### 1. Clone the repository

Open a terminal and run:

```bash
git clone https://github.com/AbHrA7246/dbms-project.git
```

### 2. Open the frontend directory

```bash
cd dbms-project/frontend
```

### 3. Install dependencies

```bash
npm ci
```

This installs the dependencies recorded in `package-lock.json`. An internet connection is required for cloning and downloading packages.

No backend or database setup is required to run the current frontend.

## Running the Application

### Development mode

From the `frontend` directory, run:

```bash
npm run dev
```

Vite prints a local URL, usually:

**http://localhost:5173/**

Open the URL shown in your terminal in a browser. Keep the terminal open while using the application.

To stop the development server, press `Ctrl + C` in that terminal.

If port 5173 is occupied, Vite may select a different port. Use the URL printed in the terminal.

### Production build

To build the frontend:

```bash
npm run build
```

The production files are generated in `frontend/dist/`.

To preview the production build locally:

```bash
npm run preview
```

Open the preview URL printed in the terminal, usually `http://localhost:4173/`.

The preview command runs the built frontend locally; it does not publish the website online.

## Application Routes

| Route | Page | Access |
|---|---|---|
| `/` | Home | Public |
| `/how-it-works` | How It Works | Public |
| `/about` | About | Public |
| `/accepted-waste` | Accepted Waste | Public |
| `/faq` | FAQ | Public |
| `/contact` | Contact | Public |
| `/login` | Sign In | Public |
| `/signup` | Sign Up | Public |
| `/dashboard` | Dashboard | Prototype authentication |
| `/register` | E-Waste Registration | Prototype authentication |
| `/centers` | Collection Centres | Prototype authentication |
| `/requests` | Request Tracking | Prototype authentication |
| `/account` | Account Settings | Prototype authentication |

Protected routes use client-side navigation guards. These are demonstration features, not security boundaries.

## Configuration

No environment variables are required to run the current version.

The file `frontend/.env.example` is a template for potential future configuration. You do not need to create a `.env` file for the current frontend.

Never commit real passwords, API keys, database credentials, or other secrets to GitHub.

## Data Persistence

The current application uses browser `localStorage` instead of a shared database.

- Records can persist across navigation and page refreshes in the same browser.
- Data remains local to the device and browser where it was entered.
- Records are not synchronized between different computers or browsers.
- Cloning the repository does not transfer locally saved records.
- Clearing browser site data or using the application's data-reset feature may permanently delete saved records.

## Known Limitations

| Area | Current status |
|---|---|
| Authentication | Client-side prototype; not secure production authentication |
| Backend API | Not implemented |
| Database | Oracle integration planned for a future phase |
| Data sharing | No shared database or cross-device synchronization |
| Collection facilities | Example project data; not verified operational listings |
| Recycling progress | Demonstration status, not confirmation of real recycling |
| Email notifications | Not implemented |
| File uploads | Not implemented |

The prototype should not be used to store sensitive personal information or real account credentials.

## Troubleshooting

### The website does not open
- Confirm that `npm run dev` is still running.
- Open the exact URL printed by Vite.
- Check whether Vite selected a different port.

### Dependency installation fails
- Check your Node.js and npm versions.
- Confirm that your internet connection is working.
- Review the complete error output before changing dependencies.

### The hero image is missing
Confirm that this file exists in the cloned repository:

```text
frontend/public/hero-ewaste-recycling.jpg
```

If the image was repaired locally, ensure the replacement was committed and pushed to GitHub before cloning.

### The page displays an error
Check the browser's developer console and the terminal running Vite for the underlying error.

## Development Workflow

To update an existing local clone:

```bash
git pull origin main
```

After making changes, inspect them:

```bash
git status
git diff
```

Commit and push intended changes:

```bash
git add .
git commit -m "Describe your changes"
git push origin main
```

Review staged files before committing, and do not add secrets, local environment files, dependency folders, or generated build output.

## Project Status

| Component | Status |
|---|---|
| React frontend | Implemented |
| Public informational pages | Implemented |
| Client-side routing | Implemented |
| Prototype authentication | Implemented |
| Browser-local persistence | Implemented |
| Backend services | Planned |
| Oracle Database integration | Planned |
| Secure production authentication | Planned |
| Real collection and recycling integration | Planned |

## Project Information

**Project:** EcoCycle — E-Waste Management & Recycling Optimization System

**Repository:** https://github.com/AbHrA7246/dbms-project

Developed as an academic project.
