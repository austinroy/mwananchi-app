# Mwananchi App

Mwananchi App is a civic participation web app for turning public documents into plain-language briefs, follow-up questions, and practical civic action drafts.

## Stack

- React + Vite + TypeScript
- TanStack Router
- TanStack Query
- TanStack Form
- TanStack Table
- Tailwind CSS
- Lucide React icons
- Sonner toasts
- Jest + React Testing Library
- Local Node API using built-in `node:sqlite` (with watch mode)
- Oxlint

## Current MVP

- Landing page
- Civic brief dashboard
- New brief form
- Mock brief generation
- Brief detail page
- Chat panel with mock responses
- Civic action generator
- Retractable brief chat panel with a persistent open button
- Clerk-ready auth with local development fallback
- Logged-in users keep generated briefs stored securely in the SQLite database
- SQLite-backed API server for users, briefs, chat messages, and civic actions
- PDF upload with lightweight text extraction into the brief form
- Real AI provider integration for brief analysis, chat, and civic action drafts
- Shared AI provider/model selector for brief creation, chat, and action generation
- Inline validation for brief title, category, jurisdiction, and document text
- Route and component organization split across `src/routes/*` and `src/components/*`
- Landing page example brief that opens the interactive sample workflow
- English and Kiswahili UI language support with a persisted language selector

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

Route wrappers now live in `src/routes/` while the heavier page logic lives in reusable components under `src/components/`. The main router file only wires the TanStack route tree.

Generated briefs are strictly stored in SQLite using the local API server.

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

If the API server is not running, API actions will fail as the browser mock/localStorage fallbacks have been removed.

## Shareable Briefs

Brief owners can manage visibility from the brief detail page or the dashboard. Briefs can be toggled between **Private** (owner only) and **Public** (read-only access via `/share/:briefId`). Public briefs provide a copy-to-clipboard link for easy sharing. Shared briefs show the read-only civic brief without chat history or generated actions.

Private briefs that do not belong to the current user now return an authentication-required response, and the brief page prompts the user to sign in instead of treating the brief as missing.

## AI Providers

The API server can call real AI providers for brief analysis, document-grounded chat, and civic action generation. If no provider key is configured, the app falls back to the existing prototype responses.

Supported provider paths:

- OpenAI through the Responses API
- OpenRouter through an OpenAI-compatible chat completions endpoint
- Anthropic through the Messages API
- LM Studio through its local OpenAI-compatible server
- Custom OpenAI-compatible providers through `CUSTOM_AI_BASE_URL`

Add the provider keys you need:

```bash
OPENAI_API_KEY=
OPENROUTER_API_KEY=
ANTHROPIC_API_KEY=
LM_STUDIO_BASE_URL=http://127.0.0.1:1234/v1
LM_STUDIO_API_KEY=
CUSTOM_AI_API_KEY=
CUSTOM_AI_BASE_URL=
```

Users can set a default provider and model on the account page. Signed-in user defaults are stored by the API and browser `localStorage` remains the guest/offline fallback. Chat and action generation also include per-request model controls so users can switch providers for a single task.

Model lists are loaded from configured providers. Hosted providers use the Mwananchi API because encrypted user keys stay server-side. LM Studio model discovery first tries the browser against the local LM Studio server, then falls back to the Mwananchi API proxy if the browser hits CORS restrictions.

For LM Studio, start the local server in LM Studio and use the account page's local model setup modal to set the base URL and model name. The browser attempts to load available models directly from LM Studio's `/models` endpoint. If LM Studio blocks the browser with CORS, the app falls back to the Mwananchi API proxy, which must be running on the same machine as LM Studio. LM Studio accepts OpenAI-compatible chat completion requests, so generation requests use `/chat/completions` under the configured base URL. A real API key is usually not required locally; the app sends a placeholder key when no LM Studio key is configured.

LM Studio setup is separate from hosted-provider API key storage because it is usually a local connection setting, not a secret. Hosted provider keys remain in the encrypted key manager.

Logged-in users can also store their own provider API keys from the account page. User-owned keys are encrypted in SQLite with AES-256-GCM and are never returned to the browser after saving. Set a stable encryption secret before enabling this in any deployed environment:

```bash
API_KEY_ENCRYPTION_SECRET=use-a-long-random-secret-at-least-32-characters
```

Keep this value stable. Changing it makes previously stored user API keys unreadable.

## PDF Upload

The new brief form supports uploading a PDF. The app extracts selectable text from the PDF and places it into the document text area for review before generating a brief.

If no selectable text is found, the browser falls back to OCR for scanned PDFs using the installed `pdfjs-dist` and `tesseract.js` packages. Vite serves the local Tesseract worker and core assets under `/ocr`. OCR is intentionally capped for responsiveness.

The brief form now also validates required fields before submission so empty titles, weak jurisdiction values, and missing document text are caught early.

In the brief chat composer, Enter sends a message and Cmd/Ctrl+Enter inserts a new line.

The landing page includes an explicitly labeled example brief so new users can open the sample workflow, ask chat questions, and generate civic action drafts before they create their own brief.

## Language Support

The app uses the installed `i18n` package with static English (`en`), Kiswahili (`sw`), Arabic (`ar`), French (`fr`), and Portuguese (`pt`) dictionaries. Recent work localized authentication flows and the AI model selector so these screens now render using the same translation catalog instead of hardcoded strings.

Users can change the UI language from the navigation menu, and the choice is saved in browser `localStorage`. The selected language is also sent with AI brief, chat, and action-generation requests so new generated content follows the UI language.

Files recently updated for localization:

- `src/lib/i18n.tsx` — added `ar`, `fr`, `pt` entries and helper keys for AI and auth UI.
- `src/components/auth/AuthShell.tsx`
- `src/components/auth/AuthForms.tsx`
- `src/components/ai/AiModelSelector.tsx`

These changes are available on branch `feature/additional-language-support`.

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

Run unit tests, TypeScript, and Oxlint:

```bash
npm run test
npm run typecheck
npm run lint
```

Unit tests use Jest with React Testing Library for component coverage.

Oxlint is installed as a dev dependency and uses the committed `.oxlintrc.json` configuration.

TypeScript remains the primary verification step for the recent router split and validation refactor. In this environment, `oxlint` may fail to load its native binding if the optional dependency install is misaligned.

## Formatting

Prettier is included as a dev dependency. Use these npm scripts to format or check formatting:

```bash
npm run format
npm run format:check
```
