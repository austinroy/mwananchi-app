# Mwananchi App

Mwananchi App is a civic participation web app for turning public documents into plain-language briefs, follow-up questions, and practical civic action drafts.

## Stack

- React + Vite + TypeScript
- TanStack Router
- TanStack Query
- TanStack Form
- Tailwind CSS
- Lucide React icons
- Netlify Functions
- Netlify Database/Postgres through `@netlify/database`
- Oxlint

## Current MVP

- Landing page
- Civic brief dashboard
- New brief form
- Mock brief generation
- Brief detail page
- Chat panel with mock responses
- Civic action generator
- Prototype auth with login/register routes and local session storage
- Logged-in users keep generated briefs in browser local storage
- Netlify Postgres persistence for users, briefs, chat messages, and civic actions
- PDF upload with lightweight text extraction into the brief form

## Auth Status

Auth is currently a local prototype layer. It stores a mock user session in browser `localStorage` and protects the app workspace routes.

Public routes:

- `/`
- `/login`
- `/register`
- `/briefs/new`
- `/briefs/:briefId`
- `/briefs/:briefId/actions`

Protected routes:

- None during the current dashboard testing pass

Guests can create and act on a brief without signing in. Dashboard access is temporarily open for testing. Login is currently used for workspace/history-style persistence.

Generated briefs are stored in Netlify Postgres when Netlify Functions and Netlify Database are available, with browser mock persistence as a fallback during prototype work.

Replace `src/lib/auth.tsx` with a real provider integration when moving beyond the prototype.

## Persistence

The project uses Netlify Database, a managed Postgres database, through Netlify Functions for persistence:

- Users
- Civic briefs
- Chat messages
- Civic action drafts

Schema lives in:

```bash
netlify/database/migrations/0001_initial_schema/migration.sql
```

API routes are served by:

```bash
netlify/functions/api.mjs
```

The frontend calls `/api/*`, and `netlify.toml` rewrites those requests to the Netlify Function.

If the Netlify API/database is unavailable, the app falls back to the existing browser mock/localStorage behavior so frontend work can continue.

## PDF Upload

The new brief form supports uploading a PDF. The app extracts selectable text from the PDF and places it into the document text area for review before generating a brief.

Current limitation:

- Text-based PDFs are supported.
- Scanned/image-only PDFs need OCR, which is not wired in yet.

## Run Locally

Install dependencies, then start the Netlify dev server:

```bash
npm install
netlify dev
```

If you prefer pnpm:

```bash
pnpm install
netlify dev
```

Before using the database locally or in deploy previews, initialize Netlify Database for the linked site:

```bash
netlify database init --yes
netlify database migrations apply
```

Netlify applies migrations automatically during deploys.

## Quality Checks

Run TypeScript and Oxlint:

```bash
npm run typecheck
npm run lint
```

Oxlint is installed as a dev dependency and uses the committed `.oxlintrc.json` configuration.
