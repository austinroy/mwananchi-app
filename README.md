# Mwananchi App

Mwananchi App is a civic participation web app for turning public documents into plain-language briefs, follow-up questions, and practical civic action drafts.

## Stack

- React + Vite + TypeScript
- TanStack Router
- TanStack Query
- TanStack Form
- Tailwind CSS
- Lucide React icons
- Local Node API using built-in `node:sqlite`
- Oxlint

## Current MVP

- Landing page
- Civic brief dashboard
- New brief form
- Mock brief generation
- Brief detail page
- Chat panel with mock responses
- Civic action generator
- Clerk-ready auth with local development fallback
- Logged-in users keep generated briefs in browser local storage
- SQLite-backed API server for users, briefs, chat messages, and civic actions
- PDF upload with lightweight text extraction into the brief form

## Auth Status

Auth uses Clerk when a publishable key is configured. Without Clerk configuration, the app falls back to the previous local development session stored in browser `localStorage`.

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

To enable Clerk, add this environment variable:

```bash
VITE_CLERK_PUBLISHABLE_KEY=pk_test_...
```

The current Clerk integration uses `@clerk/clerk-react`, opens Clerk's hosted sign-in/sign-up modals, and syncs authenticated users to the app API.

For Netlify deploys, use a Clerk key whose allowed origins include the Netlify domain. Clerk development browser handshakes may add `__clerk_db_jwt` during auth; the committed `netlify.toml` rewrites all app routes to `index.html` so React Router can complete those redirects.

The local API derives brief ownership from auth headers instead of trusting a `userId` request body. Set `CLERK_JWKS_URL` on the API server to verify Clerk bearer tokens; without it, the API keeps the development-only local fallback header behavior.

## Persistence

The project now includes a local API server for prototype database persistence:

- Users
- Civic briefs
- Chat messages
- Civic action drafts

Run it with:

```bash
npm run api
```

The API listens on `http://localhost:8787` and stores local data in:

```bash
data/mwananchi.sqlite
```

The frontend uses `VITE_API_BASE_URL` when provided, otherwise it defaults to `http://localhost:8787`.

If the API server is not running, the app falls back to the existing browser mock/localStorage behavior so frontend work can continue.

## Shareable Briefs

Brief owners can make a brief public from the brief detail page. Shared briefs are available at `/share/:briefId` and show the read-only civic brief without chat history or generated actions.

## PDF Upload

The new brief form supports uploading a PDF. The app extracts selectable text from the PDF and places it into the document text area for review before generating a brief.

If no selectable text is found, the browser falls back to OCR for scanned PDFs using the installed `pdfjs-dist` and `tesseract.js` packages. Vite serves the local Tesseract worker and core assets under `/ocr`. OCR is intentionally capped for responsiveness.

Optional OCR configuration:

```bash
VITE_OCR_MAX_PAGES=4
```

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
