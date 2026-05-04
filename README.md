# Mwananchi App

Mwananchi App is a civic participation web app for turning public documents into plain-language briefs, follow-up questions, and practical civic action drafts.

## Stack

- React + Vite + TypeScript
- TanStack Router
- TanStack Query
- TanStack Form
- Tailwind CSS
- Lucide React icons

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
- SQLite-backed API server for users, briefs, chat messages, and civic actions
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

Generated briefs are stored in SQLite when the API server is running, with browser mock persistence as a fallback during prototype work.

Replace `src/lib/auth.tsx` with a real provider integration when moving beyond the prototype.

## Run Locally

Install dependencies, then start the dev server:

```bash
npm install
npm run api
npm run dev
```

If you prefer pnpm:

```bash
pnpm install
pnpm api
pnpm dev
```

The API server listens on `http://localhost:8787` and stores data in `data/mwananchi.sqlite`.

## Quality Checks

Run TypeScript and Oxlint:

```bash
npm run typecheck
npm run lint
```

Oxlint is installed as a dev dependency and uses the committed `.oxlintrc.json` configuration.
