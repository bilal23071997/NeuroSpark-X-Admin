# NeuroSpark X Admin

The admin portal for the NeuroSpark X website: Insights articles and niches, Listen episodes, The Vault (products, groups), site pages, free resources, newsletter, contact messages, site settings, and staff accounts. It talks to the NeuroSpark X API (`NeuroSpark-X-Api`); there is no server-side code in this app.

Next.js (App Router) used as a client-side app · TypeScript · Tailwind · Axios · Redux Toolkit · React Hook Form + Zod.

## Run it

1. Start the API (default `http://localhost:3001`; see its README).
2. `cp .env.example .env.local` and set `NEXT_PUBLIC_API_URL` if the API is not on port 3001.
3. `npm install` (this project uses `legacy-peer-deps`, see `.npmrc`)
4. `npm run dev` — the portal is on http://localhost:3002

Sign in with an account the API knows about (the first admin comes from the API's `SEED_ADMIN_*` settings). The API must allow `http://localhost:3002` in its `CORS_ORIGINS`.

`npm run build` makes a production build; `npm run typecheck` and `npm run lint` check the code.

## Screens




| Screen | Who |
|---|---|
| Sign in, Dashboard, Change password | everyone |
| Articles (list, filters, create/edit, publish/unpublish, delete) | admin, editor |
| Niches (create/edit/delete) | admin, editor |
| Episodes (list, filters, create/edit, publish/unpublish, delete) | admin, editor |
| Users (create staff, edit name/role/password, activate/deactivate) | admin only |
| Vault > Products (list + filters, create/edit, images, gallery, page sections, private file, publish/unpublish, delete) | admin only |
| Vault > Groups (the 5 official categories, locked; add, edit, drag to reorder and delete sub-groups) | admin only |
| Site > Pages (privacy, terms and other plain-text pages, with preview) | admin only |
| Site > Free resources (lead magnets) | admin, editor |
| Site > Settings (contact email, LinkVerse, WhatsApp, Telegram links) | admin only |
| Audience > Newsletter (list, filter, unsubscribe, CSV export, delete) and Messages (read/unread, delete) | admin only |

Editors never see the admin-only screens (Users, Vault, Pages, Settings, Newsletter, Messages): the links are hidden, opening one by address shows an "Admin only" note, and the app never calls the admin-only API routes for them (those would answer 403). If any request is refused, the API's message is shown on the page.

## How it is built

- `src/lib/api/client.ts` — the one shared Axios instance. It adds the Bearer token and, on a `401`, refreshes the session once (`POST /auth/refresh`) and retries the request; if the refresh fails the user is sent to `/login`. Refresh tokens are single use, so concurrent refreshes share one in-flight request.
- `src/store/slices/*` — one Redux slice per module (auth, users, niches, articles, episodes), all with the same loading/error pattern (`status`: idle / loading / succeeded / failed, plus an `error` message). Thunks reject with a readable message string (`src/store/helpers.ts`).
- `src/components/AppShell.tsx` — the signed-in layout (sidebar, mobile drawer) and the route guard.
- `src/components/ui/*` — shared buttons, fields, dialogs and badges.

## Uploads and the Vault

- **Images and the paid file are uploaded straight from the browser to the bucket.** The app asks the API for a short-lived signed URL (`POST /admin/uploads/presign`) and then `PUT`s the file there with plain `fetch` (never through the shared Axios instance, so our sign-in token is not sent to the bucket). Limits match the API: images PNG/JPEG/WebP/GIF up to 5 MB; product files (PDF, ZIP, EPUB, Office, CSV, MP3/M4A/WAV, MP4) up to 1 GB.
- **The bucket needs a CORS rule** allowing `PUT` from the admin's address (and the `Content-Type` header), otherwise browsers block the upload and the app says so.
- **Until storage is configured** the API answers 503 and the app shows "File storage is not set up yet — ask the developer to configure it". Cover, gallery and section images can still be set by pasting an https address.
- The paid file is stored privately; only its name and size are public. Nothing downloads it until checkout exists.
- **Prices** are typed in dollars and sent as cents; the sale price must be lower than the price.
- **Reordering** (sub-groups, product sections, gallery images) works by dragging the handle with a pointer, by keyboard (focus the handle, press Space, use the arrow keys, press Space again), or with the up/down buttons. Powered by @dnd-kit.
- **Page sections** are text, bullet list, FAQ and image blocks. The product page itself keeps one fixed theme on the website; the admin only chooses what goes in it and in what order.
- **Site pages** are plain text: a blank line starts a new paragraph, and a paragraph starting with `## ` is a heading.

## Things to know

- **Podcast series are hardcoded.** The series dropdown for episodes comes from `src/lib/podcast-series.ts`. That list must match the website's hardcoded list: an episode only stores the series slug, and the website groups episodes by it. Add a series in both places in the same change.
- **Token storage trade-off.** The access token is kept in memory only; the refresh token is kept in `localStorage` so a page reload can sign back in. `localStorage` is readable by any script on this origin, so an XSS bug would expose the refresh token. Using an httpOnly cookie instead needs an API change (set/clear the cookie from the API, same-site deployment or CORS credentials), which is not done yet.
- **Changing your password signs you out** everywhere (the API revokes the refresh token), so you land on the sign-in screen with a note.
- **You can't deactivate your own account or change your own role** from the Users screen, to avoid locking everyone out.
- Article bodies are lists of paragraphs (the shape the website renders today). A rich-text editor would change the body to HTML and needs a website change too.
- Everything is fetched fresh when a screen opens; there is no pagination because the API has none yet.
