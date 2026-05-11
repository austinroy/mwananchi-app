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
- TanStack Table
- Tailwind CSS
- Lucide React icons
- Sonner toasts
- Jest with React Testing Library via `npm run test`
- Oxlint via `npm run lint`
- Node API server using built-in `node:sqlite` (with watch mode)

## Current App Shape

Important files:

- `src/main.tsx`: app bootstrap
- `src/lib/auth.tsx`: Clerk-ready auth provider with local development fallback
- `src/lib/aiSettings.ts`: browser-stored default AI provider/model settings
- `src/lib/civicOptions.ts`: shared category/action option lists
- `src/components/AppShell.tsx`: shared navigation shell
- `src/components/ai/AiModelSelector.tsx`: shared AI provider/model selector and configuration helpers
- `src/components/auth/AuthForms.tsx`: auth, account, and auth-gate UI
- `src/components/auth/AuthShell.tsx`: shared auth shell and guard wrappers
- `src/components/dashboard/DashboardPage.tsx`: civic brief dashboard and table view
- `src/components/dashboard/BriefTable.tsx`: dashboard table and action menu
- `src/components/dashboard/DashboardSummaryCards.tsx`: dashboard category summary cards
- `src/components/brief/BriefPage.tsx`: brief detail, chat, share, and action workflows
- `src/components/brief/BriefHeaderActions.tsx`: brief detail header actions
- `src/components/brief/BriefSections.tsx`: reusable brief section and notice cards
- `src/components/brief/BriefChatPanel.tsx`: brief chat panel
- `src/routes/index.tsx`: landing page with an example brief entry linked to the sample brief
- `src/components/brief/BriefActionForm.tsx`: civic action draft form
- `src/components/FormattedAiText.tsx`: safe React renderer for AI response formatting
- `src/lib/pdf.ts`: selectable-text PDF extraction with OCR fallback for scanned PDFs
- `src/router.tsx`: route tree wiring only
- `src/routes/index.tsx`: landing page route
- `src/routes/dashboard.tsx`: dashboard route
- `src/routes/briefs/new.tsx`: new brief page and form flow
- `src/components/brief/BriefChatPanel.tsx`: retractable brief chat drawer with a persistent open button and Enter-to-send composer shortcuts
- `src/routes/briefs/$briefId.tsx`: brief detail route wrapper
- `src/routes/briefs/$briefId.actions.tsx`: civic action route wrapper
- `src/routes/briefs/$briefId.share.tsx`: shared brief route wrapper
- `src/routes/login.tsx`: sign-in route
- `src/routes/register.tsx`: sign-up route
- `src/routes/account.tsx`: account route
- `src/lib/mockApi.ts`: mock async API and seed data
- `server/index.mjs`: local SQLite API for users, briefs, chat messages, and civic actions
- `src/lib/queryClient.ts`: TanStack Query client
- `src/lib/types.ts`: shared product types
- `src/lib/validation.ts`: shared brief form validation helpers
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
- The app now strictly relies on the SQLite API for persistence. `src/lib/mockApi.ts` acts as a direct wrapper for the API calls and local storage fallbacks have been removed.
- Scanned PDFs are handled in-browser with installed `pdfjs-dist` and `tesseract.js` packages. `vite.config.ts` serves/copies Tesseract worker and core assets under `/ocr`. `VITE_OCR_MAX_PAGES` controls the OCR page cap.
- Real AI integration lives in `server/index.mjs`. OpenAI uses the Responses API, OpenRouter, LM Studio, and custom providers use OpenAI-compatible chat completions, and Anthropic uses the Messages API. Missing provider keys intentionally fall back to prototype responses.
- User AI defaults are stored server-side for signed-in users through `/api/users/me/ai-defaults`, with browser `localStorage` retained as guest/offline fallback. Chat and action generation support on-the-fly provider/model overrides.
- Offline work uses an encrypted browser-side IndexedDB queue/cache in `src/lib/offlineStore.ts`. The API remains primary storage; offline data is temporary and syncs through `syncOfflineChanges()` in `src/lib/api.ts` when the browser regains network access.
- Logged-in users can store user-owned AI provider keys. The API stores encrypted key material in the `ai_api_keys` SQLite table, using AES-256-GCM with `API_KEY_ENCRYPTION_SECRET`. The browser only receives configured/not-configured status.
- Hosted provider model lists are fetched through `src/lib/api.ts` and `server/index.mjs` so encrypted keys stay server-side. Do not move hosted-provider model discovery into browser fetches unless the app stops storing encrypted keys.
- LM Studio setup is intentionally separate from hosted-provider key storage. The account page uses a modal for local base URL/model settings, tries browser-direct model loading from LM Studio's `/models` endpoint, falls back to the Mwananchi API proxy when CORS blocks direct access, and sends those settings with LM Studio generation requests.
- The app uses the installed `i18n` package through `src/lib/i18n.tsx`, currently covering English, Kiswahili, Arabic, French, and Portuguese with a persisted navigation menu selector. The selected locale is sent with AI brief/chat/action generation requests so generated content follows the UI language.
- The brief chat panel stays collapsed behind a persistent bottom-right button when not in use. The chat window itself retracts out of view, Enter sends a message, and Cmd/Ctrl+Enter inserts a new line in the composer.
- Private briefs now return an authentication-required response when a non-owner tries to load them. The brief page shows a sign-in prompt for that state instead of a generic not-found error.
- The landing page now labels the sample brief as an example and links directly to the interactive sample brief so users can explore chat and action generation before creating their own.

Recent updates (feature/additional-language-support):

- `src/components/auth/AuthShell.tsx`
- `src/components/auth/AuthForms.tsx`
- `src/components/ai/AiModelSelector.tsx`

Testing updates:

- Added unit tests and reorganized tests into per-folder `_tests_` directories under `src/components`, `src/lib`, and `src/routes`.
- New tests cover `AppShell`, `FormattedAiText`, `civicOptions`, `aiSettings` helpers, `validation` helpers, and the `LandingPage` route.
- Tests live in:
  - `src/components/_tests_/`
  - `src/lib/_tests_/`
  - `src/routes/_tests_/`

Verification steps:

1. Install dependencies (if needed) and run tests:

```bash
npm install
npm run test
```

2. See test output for passed suites and open failing tests for quick fixes.

Verification steps:

1. Run the dev server:

```bash
npm run dev
```

2. Open the app, open the header menu, and switch `Language` to `العربية`, `Français`, or `Português` to verify translated strings appear on the Login/Register pages and the AI model selector.

3. Check `src/lib/i18n.tsx` for the `extendedDictionaries` and `staticCatalog` configuration.

## Development Priorities

Near-term priorities:

1. Continue splitting large route/page code out of `src/router.tsx` into route and component files.
2. Add proper form validation for title, category, jurisdiction, and document text.
3. [COMPLETED] Replace dashboard list with TanStack Table, including sorting, filtering, and status chips.
4. Replace prototype API persistence with a production database.
5. [COMPLETED] Add richer share controls, including private/public toggles and unshare.
6. Add richer OCR progress and language controls.
7. Continue moving route/page components out of `src/router.tsx`; AppShell, AI text formatting, the AI selector, and the new brief page have already been extracted.

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
- The current theme is Neatlab-inspired green glass: mint gradient backgrounds, translucent blurred surfaces, deep emerald controls, muted amber accents, and a Plus Jakarta Sans-first font stack while preserving the original civic workflow layout.

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
npm run test
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

- The current MVP uses API functions through `src/lib/mockApi.ts` without local storage fallback.
- Typecheck was passing after the initial scaffold.
- Do not remove the TanStack direction; the user specifically requested TanStack.
- Do not introduce Next.js unless the user explicitly changes direction.
- Keep the app name as `Mwananchi App`.
- Prefer incremental, working slices over large speculative rewrites.
- Users can now delete their briefs; this cascades to delete associated chat messages and civic actions from the API.
- The new brief page now uses shared validation helpers from `src/lib/validation.ts` for title, category, jurisdiction, and document text.
- The route/component organization pass moved auth, dashboard, and brief workflows out of `src/router.tsx`; keep future route files thin and prefer shared component modules for page logic.
- Continue splitting page-level components into smaller modules where a file still holds multiple independent UI responsibilities.
- When a code change affects user-facing behavior, routing, auth, layout, or setup flow, update `AGENTS.md` and `README.md` in the same commit unless the user explicitly says not to.
