# NeuroSpark X™ Admin Portal — Working Instructions

Read automatically by every Claude Code session in this repo. Follow it so work
stays consistent on any machine. Also read `AGENTS.md` here: this Next.js
version has breaking changes, so read the matching guide in
`node_modules/next/dist/docs/` before writing code.

## What this is

The admin portal for the NeuroSpark X™ ecosystem: **Next.js 16 used as a
client-side app** (Cache Components and partial prefetching are switched off in
`next.config.ts` on purpose), Tailwind v4, Axios, Redux Toolkit (one slice per
module), React Hook Form + Zod. The plan is in the website repo:
`E:\Next\NS\NeuroSpark-X-Website\Documentation\Backend-Phase-Plan.md`.

Sibling repos (each has its own `CLAUDE.md`):
- `E:\Next\NS\NeuroSpark-X-Api` — the API this portal calls. Its controllers and `/docs` are the source of truth for request/response shapes.
- `E:\Next\NS\NeuroSpark-X-Website` — the public website.

## Decisions that are already made

- Only staff sign in: roles `admin` and `editor`. Editors get 403 on `/admin/users` and `/admin/roles`, so those screens and links are hidden for editors and the app never calls them.
- The access token lives **in memory only**; the refresh token is in localStorage (trade-off documented in `README.md`; httpOnly cookies would need an API change).
- One shared Axios instance (`src/lib/api`): adds the Bearer token, on a 401 refreshes once via `POST /auth/refresh` then retries, otherwise sends the user to `/login`.
- Every slice uses the same `status` / `error` loading pattern (`src/store/helpers.ts`).
- Podcast series are a **hardcoded list** in `src/lib/podcast-series.ts`. It must match the website's `src/lib/podcast-series.ts` slug for slug. Episodes store only the series slug.
- Episodes are YouTube links; the Publish button stays disabled (with an explanation) until a valid link is saved. The URL rule mirrors the API's.
- Article bodies are lists of paragraphs (no rich-text editor yet). No pagination (the API has none).

## Built / not built

Built: login, dashboard, change password, articles, niches, episodes, users (admin only), Vault products and groups (admin only), site pages (admin only), free resources, newsletter subscribers, contact messages, site settings (admin only). New screens follow the existing slice + screen pattern; don't link screens that don't exist.
Settings (admin only, with its own second sidebar: General settings, and Gateway configuration = the Stripe keys, test/live, webhook URL, connection test; reached from the profile menu) and Orders screens exist. Not built: refunds, pagination, a rich-text editor. Uploads call the API's presign endpoint, but no bucket is configured yet, so a real upload has only been tested against a mocked bucket.

Vault specifics: the five official groups are locked (only their description is editable), sub-groups are one level deep, prices are typed in dollars and sent as cents, page sections are text/bullets/faq/image blocks reordered with `SortableList` (@dnd-kit, with up/down buttons as the accessible fallback), and PUTs to the bucket use plain `fetch` so the Bearer token never leaves for a third-party host. Screens whose API routes are admin-only are wrapped in `RequireAdmin`. List slices ignore out-of-order responses (`latestListRequest`) so a slow older filter can't overwrite a newer one; do the same for any new filtered list.

## Look and feel

Brand: Void Black `#0A0A0F`, Electric Indigo `#4F46E5`, Deep Violet `#7C3AED`, Teal `#14B8A6`, Amber Gold `#D4A017`, Soft White `#F8FAFC`; Space Grotesk headings, Inter body. Dark base everywhere. Keep forms labelled, interactive elements keyboard-focusable with visible focus, contrast AA (indigo/violet only as large text or non-text; use lightened tints for small text), respect `prefers-reduced-motion`, responsive down to 375px.

## Running it

```powershell
# terminal 1 — the API
cd E:\Next\NS\NeuroSpark-X-Api ; npm run start:dev      # http://localhost:3001
# terminal 2 — this portal
cd E:\Next\NS\NeuroSpark-X-Admin ; npm install ; npm run dev   # http://localhost:3002
```

`NEXT_PUBLIC_API_URL` (see `.env.example`) defaults to `http://localhost:3001`. Sign in with the seed admin from the API's `.env` (`SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD`); never print or commit the password. The API allows CORS only from the origins in its `CORS_ORIGINS` (`http://localhost:3002` is included).

## Working on this machine (Windows)

- Use the **PowerShell** tool for `npm run build` / `npm run dev`; the Bash tool can't spawn Node child processes reliably.
- Large Bash heredoc batches fail to parse here: use the Write/Edit tools for big files.
- npm 10.9.4 has a peer-dependency bug: use `npm install --legacy-peer-deps` (`.npmrc` already sets it).
- Don't stop a dev server or API you didn't start. When you start your own API for a test, give it a different port (`$env:PORT='3012'`) and point `NEXT_PUBLIC_API_URL` at it.

## Testing and the shared database

Every environment uses the same Supabase database through the API. Name test data `ZZ-test…`, delete everything you create, never drop tables. Verify with `npx tsc --noEmit`, `npx eslint .`, `npm run build`, and by driving the UI against a running API.

## Git

Don't commit or push unless the user asks. One feature per commit with a clear message. Never commit `.env*` with real values, `.next`, or `node_modules`.
