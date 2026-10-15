# EcoCycle — E-Waste Management & Recycling Optimization System

A web-based e-waste management platform designed to help individuals and organizations register unwanted electronics, find collection facilities, submit collection requests, and track the recycling process.

EcoCycle is an academic project developed to explore how digital platforms can support responsible electronic-waste management and more efficient recycling workflows.

## Overview

Electronic waste is growing rapidly as electronic devices are replaced more frequently. EcoCycle proposes a centralized platform for managing e-waste collection and recycling activities.

The project is being developed in phases. The current version provides a React-based web interface with browser-local data persistence. Backend services and Oracle Database integration are planned for a future phase.

## Features

### Public pages
- **Home:** Introduction to EcoCycle and responsible e-waste management.
- **How It Works:** Overview of the proposed recycling workflow.
- **About:** Project mission and objectives.
- **Accepted Waste:** Information about accepted e-waste categories.
- **FAQ:** Answers to common questions.
- **Contact:** Contact information page.

### Application features
- **Sign up and sign in:** Demonstration authentication implemented on the client side.
- **Dashboard:** Overview of registered items and collection requests.
- **E-Waste Registration:** Form for entering electronic-item details and collection preferences.
- **Collection Centres:** Directory of example collection facilities.
- **Request Tracking:** View requests and their displayed recycling progress.
- **Account Settings:** Manage account information and clear locally saved records.

> **Current implementation status:** Authentication and request management are frontend prototypes. Collection progress is demonstrated through the interface; it is not connected to a real recycling operation or backend service.

## Technology Stack

| Technology | Purpose |
|---|---|
| React 18 | User interface |
| Vite 5 | Development server and build tool |
| React Router DOM | Client-side routing |
| Tailwind CSS 3 | Styling and responsive layouts |
| Lucide React | Icons |
| PostCSS and Autoprefixer | CSS processing |
| Browser localStorage | Local persistence for the current phase |
| Node.js and npm | Development environment and dependency management |

**Planned technologies:** Node.js/Express for backend services and Oracle Database for persistent application data. These are not yet implemented.

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

The `frontend/src` directory contains the React application, page components, shared UI components, authentication context, and local storage service.

## Prerequisites

Install the following software on your computer:

- **Git** — to clone the repository.
- **Node.js 20 LTS recommended** — Node.js 18 or later is the documented minimum.
- **npm** — included with Node.js.

Verify your installation:

```bash
git --version
node --version
npm --version
```

## Installation and Setup

### 1. Clone the repository

Open a terminal and run:

```bash
git clone https://github.com/AbHrA7246/dbms-project.git
```

### 2. Enter the frontend directory

```bash
cd dbms-project/frontend
```

### 3. Install dependencies

```bash
npm ci
```

This installs the dependency versions recorded in `package-lock.json`.

If installation fails, check your Node.js and npm versions and review the complete error message.

## Running the Application

### Development mode

From the `frontend` directory, run:

```bash
npm run dev
```

Vite will display a local URL, usually:

```text
http://localhost:5173/
```

Open the URL shown in your terminal in a web browser.

Keep the terminal running while you use the website. Stop the development server with `Ctrl + C`.

If port 5173 is already occupied, Vite may select another port. Use the URL it prints.

### Production build

To verify that the application can be built for deployment:

```bash
npm run build
```

The generated production files are placed in `frontend/dist/`.

To preview the production build locally:

```bash
npm run preview
```

Open the preview URL printed by Vite, usually:

```text
http://localhost:4173/
```

The preview command serves the built frontend; it does not deploy the website to the internet.

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

No environment variables are required to run the current frontend.

The file `frontend/.env.example` is provided as a template for future configuration. You do not need to create a `.env` file for the current phase.

**Never commit real passwords, API keys, database credentials, private keys, or other secrets to GitHub.**

## Data Persistence and Limitations

The current version uses browser `localStorage` rather than a shared backend database.

- User-entered records can persist across navigation and browser refreshes in the same browser.
- Records are stored locally on the device where the application is used.
- Data is not automatically synchronized between different computers or browsers.
- Cloning the repository does not transfer another user's local records.
- Clearing browser site data or using the application's data-reset control may permanently remove locally stored records.

### Authentication

Sign-in and sign-up are implemented as a frontend demonstration. They do not provide secure, server-side authentication, password hashing, or server-managed sessions.

Do not reuse real account passwords or enter sensitive personal information.

### Backend and database

The Express backend and Oracle Database integration have not yet been implemented. The current application runs without a backend service.

### Collection facilities and recycling status

Collection-centre details and contact information are representative project data, not verified operational listings. Displayed recycling progress is for demonstration and does not confirm that a real collection or recycling event has occurred.

### Other limitations

- No real collection scheduling or dispatch service.
- No backend-driven email notifications.
- No server-side user isolation or authorization.
- No production database or shared application records.

## Troubleshooting

### The website does not open

1. Check that `npm run dev` is still running.
2. Open the exact URL displayed in the terminal.
3. If the port has changed, use the newly displayed URL.

### `npm ci` fails

1. Check `node --version` and `npm --version`.
2. Ensure the computer has an internet connection.
3. Read the full error output before changing dependencies.

### The hero image is missing

Confirm that this file exists in the cloned repository:

```text
frontend/public/hero-ewaste-recycling.jpg
```

The homepage references the image from the public directory. If the file was recently repaired, make sure the replacement was committed and pushed to GitHub before cloning.

### The page displays an error

Check the browser's developer console and the terminal running Vite. Review the reported error before modifying application code.

## Development Workflow

To retrieve the latest committed version:

```bash
git pull origin main
```

After making changes, review them before committing:

```bash
git status
git diff
```

Commit and push your changes when ready:

```bash
git add .
git commit -m "Describe your changes"
git push origin main
```

Review the staged files before committing. Do not add secrets, local environment files, dependency folders, or generated build output.

## Project Status

| Component | Status |
|---|---|
| React frontend | Implemented |
| Public informational pages | Implemented |
| Client-side navigation | Implemented |
| Prototype authentication | Implemented |
| Browser-local request persistence | Implemented |
| Backend API | Planned |
| Oracle Database integration | Planned |
| Secure production authentication | Planned |
| Real collection and recycling integration | Planned |

## Image Attribution

The hero photograph must be credited according to the license of the image actually included in the repository. If the Wikimedia Commons replacement is retained, verify its original file page and license, then add the required author attribution and license link here.

## Licence

Academic project. All rights reserved by the author(s), except for third-party assets distributed under their respective licenses.
