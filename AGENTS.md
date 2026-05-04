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
- Netlify Functions
- Netlify Database/Postgres via `@netlify/database`

## Current App Shape

Important files:

- `src/main.tsx`: app bootstrap
- `src/lib/auth.tsx`: local prototype auth provider
- `src/router.tsx`: current routes and page components
- `src/lib/mockApi.ts`: mock async API and seed data
- `server/netlifyDb.mjs`: Netlify Postgres query helpers
- `netlify/functions/api.mjs`: Netlify Function API for users, briefs, chat messages, and civic actions
- `netlify/database/migrations/0001_initial_schema/migration.sql`: Postgres schema migration
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

- Auth is currently a local prototype layer.
- `src/lib/auth.tsx` stores a mock session in browser `localStorage`.
- `/dashboard` is temporarily public for testing and should be protected again before production.
- Guests can use `/briefs/new`, `/briefs/$briefId`, and `/briefs/$briefId/actions` without signing in.
- Login should be required later for saved briefs, cross-device history, sharing controls, and account settings.
- When Netlify Functions and Netlify Database are available, users, briefs, chat messages, and civic actions are stored in Netlify Postgres.
- If the Netlify API/database is unavailable, the browser mock/localStorage fallback in `src/lib/mockApi.ts` still keeps the prototype usable.
- This should be replaced with a real provider such as Supabase, Clerk, or Auth.js before production use.

## Development Priorities

Near-term priorities:

1. Split large route/page code out of `src/router.tsx` into route and component files.
2. Add proper form validation for title, category, jurisdiction, and document text.
3. Replace dashboard list with TanStack Table, including sorting, filtering, and status chips.
4. Replace prototype API/auth persistence with a production database and provider.
5. Replace local prototype auth with a real provider when backend persistence starts.
6. Add real AI endpoints for brief analysis, chat, and action generation.
7. Add PDF upload and parsing.
8. Add save/share brief flows.

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
netlify dev
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
