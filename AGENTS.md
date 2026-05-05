# Mwananchi App Development Guide

## Product

Mwananchi App is a civic participation web app that helps citizens turn public documents into plain-language understanding and practical action.

The initial product direction combines:

- Civic document explainer
- Chat assistant grounded in a selected document
- Civic action generator for emails, petitions, public comments, WhatsApp summaries, and talking points

The app should feel trustworthy, calm, accessible, and useful for Kenyan civic contexts. Avoid marketing-page bloat. Prioritize the usable civic workflow.

## Current Stack

- React
- Vite
- TypeScript
- TanStack Router
- TanStack Query
- TanStack Form
- TanStack Table, planned for richer dashboard tables
- Tailwind CSS
- Lucide React icons
- Oxlint via `npm run lint`
- Node API server using built-in `node:sqlite`

## Current App Shape

Important files:

- `src/main.tsx`: app bootstrap
- `src/lib/auth.tsx`: Clerk-ready auth provider with local development fallback
- `src/lib/aiSettings.ts`: browser-stored default AI provider/model settings
- `src/lib/pdf.ts`: selectable-text PDF extraction with OCR fallback for scanned PDFs
- `src/router.tsx`: current routes and page components
- `src/lib/mockApi.ts`: mock async API and seed data
- `server/index.mjs`: local SQLite API for users, briefs, chat messages, and civic actions
- `src/lib/queryClient.ts`: TanStack Query client
- `src/lib/types.ts`: shared product types
- `src/styles.css`: global styles and Tailwind component classes

Current routes:

- `/`: landing page
- `/login`: sign in page
- `/register`: account creation page
- `/dashboard`: civic brief dashboard
- `/briefs/new`: new brief form
- `/briefs/$briefId`: brief detail and chat
- `/briefs/$briefId/actions`: civic action generator

Auth status:

- Auth uses Clerk when `VITE_CLERK_PUBLISHABLE_KEY` is configured.
- `src/lib/auth.tsx` falls back to a mock browser `localStorage` session when Clerk is not configured.
- `/dashboard` is temporarily public for testing and should be protected again before production.
- Guests can use `/briefs/new`, `/briefs/$briefId`, and `/briefs/$briefId/actions` without signing in.
- Login should be required later for saved briefs, cross-device history, sharing controls, and account settings.
- When `npm run api` is running, users, briefs, chat messages, and civic actions are stored in `data/mwananchi.sqlite`.
- API ownership is derived from auth headers. `CLERK_JWKS_URL` enables Clerk bearer token verification; local fallback headers are development-only.
- If the API server is unavailable, the browser mock/localStorage fallback in `src/lib/mockApi.ts` still keeps the prototype usable.
- Scanned PDFs are handled in-browser with installed `pdfjs-dist` and `tesseract.js` packages. `vite.config.ts` serves/copies Tesseract worker and core assets under `/ocr`. `VITE_OCR_MAX_PAGES` controls the OCR page cap.
- Real AI integration lives in `server/index.mjs`. OpenAI uses the Responses API, OpenRouter, LM Studio, and custom providers use OpenAI-compatible chat completions, and Anthropic uses the Messages API. Missing provider keys intentionally fall back to prototype responses.
- User AI defaults are stored in browser `localStorage` from the account page. Chat and action generation support on-the-fly provider/model overrides.
- Logged-in users can store user-owned AI provider keys. The API stores encrypted key material in the `ai_api_keys` SQLite table, using AES-256-GCM with `API_KEY_ENCRYPTION_SECRET`. The browser only receives configured/not-configured status.
- Hosted provider model lists are fetched through `src/lib/api.ts` and `server/index.mjs` so encrypted keys stay server-side. Do not move hosted-provider model discovery into browser fetches unless the app stops storing encrypted keys.
- LM Studio setup is intentionally separate from hosted-provider key storage. The account page uses a modal for local base URL/model settings, tries browser-direct model loading from LM Studio's `/models` endpoint, falls back to the Mwananchi API proxy when CORS blocks direct access, and sends those settings with LM Studio generation requests.

## Development Priorities

Near-term priorities:

1. Split large route/page code out of `src/router.tsx` into route and component files.
2. Add proper form validation for title, category, jurisdiction, and document text.
3. Replace dashboard list with TanStack Table, including sorting, filtering, and status chips.
4. Replace prototype API persistence with a production database.
5. Add richer share controls, including private/unlisted toggles and unshare.
6. Add richer OCR progress and language controls.
7. Add server-side persistence for user AI model defaults once account settings move fully out of browser storage.

## Suggested File Organization

Prefer moving toward this structure:

```text
src/
  routes/
    __root.tsx
    index.tsx
    dashboard.tsx
    briefs/
      new.tsx
      $briefId.tsx
      $briefId.actions.tsx
  components/
    layout/
    brief/
    chat/
    actions/
    dashboard/
    ui/
  lib/
    api.ts
    mockApi.ts
    queryClient.ts
    types.ts
    validation.ts
  hooks/
```

Keep route files thin. Put reusable UI and domain logic into components, hooks, and `lib`.

## Design Guidance

Use a civic-tech style:

- Deep green as the primary color
- Off-white or light gray page backgrounds
- White surfaces with subtle borders
- Charcoal text
- Amber only as a restrained accent
- Clear accessible spacing and typography

UI rules:

- Use icons from `lucide-react` for buttons and navigation where helpful.
- Keep cards to repeated items, panels, modals, and framed tools.
- Do not build a generic marketing landing page before the actual workflow.
- Ensure text fits on mobile and desktop.
- Keep layouts responsive and practical.

## Data And AI Behavior

The app must be careful with civic and legal content.

Assistant behavior should:

- Explain public information in plain language.
- Say when the document does not contain enough information.
- Avoid inventing legal facts.
- Recommend checking official sources for high-stakes claims.
- Separate document-grounded facts from inferred guidance.

Future AI endpoints should return structured JSON where possible.

Suggested brief analysis shape:

```ts
{
  summary: string;
  keyPoints: string[];
  affectedGroups: string[];
  concerns: string[];
  citizenQuestions: string[];
  nextSteps: string[];
}
```

## Commands

Common commands:

```bash
npm run dev
npm run api
npm run typecheck
npm run lint
npm run build
```

If Vite/Rollup optional dependency errors appear after dependency installation, reinstall dependencies:

```bash
rm -rf node_modules package-lock.json
npm install
```

## Working Notes For Future Agents

- The current MVP uses mock API functions in `src/lib/mockApi.ts`.
- Typecheck was passing after the initial scaffold.
- Do not remove the TanStack direction; the user specifically requested TanStack.
- Do not introduce Next.js unless the user explicitly changes direction.
- Keep the app name as `Mwananchi App`.
- Prefer incremental, working slices over large speculative rewrites.
