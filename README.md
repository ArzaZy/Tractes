# TracLabs

A premium, database-backed directory for the websites, tools and digital projects built by its owner.
React + TypeScript + Vite + Tailwind CSS v4 + React Router + Lucide, with Supabase (Postgres, Auth, Storage, RLS) and Vercel hosting.

> **Verification status.** The source was written in an environment where the npm registry was blocked, so
> `npm install`, `npm run lint`, `npm test` and `npm run build` have **not been run yet**. Dependency versions in
> `package.json` are caret ranges chosen from memory and no lockfile exists. Run the checks in
> [Verify locally](#verify-locally) before deploying and fix anything they report.
> Nothing has been tested against a real Supabase project either.

## Features

- Public site: Home, Explore (debounced search, category/status filters, sorting, pagination, URL-shareable state), Categories,
  Category detail, Project detail (related projects, breadcrumbs), About, Privacy, custom 404.
- Command-palette search (Ctrl/Cmd+K, arrows, Enter, Esc; works by touch).
- Owner-only admin: dashboard stats, searchable/paginated project table, full project CRUD, draft/publish/unpublish/archive,
  feature toggle, category CRUD with safe delete, site settings, image upload with preview/replace/remove.
- Liquid glass UI: translucent blurred surfaces, specular edge highlights and ambient colour fields, in dark (default) and light themes, no flash on load, persisted choice. Falls back to solid surfaces when `backdrop-filter` is unsupported or the visitor prefers reduced transparency. Tune it in the tokens at the top of `src/styles/index.css`.
- Mobile glass dock: a floating tab bar with a sliding lens. Tap, or press and drag across it (iOS style) to switch pages. Used on the public site and in the admin.
- Admin login from the main site (navbar, dock, footer). Signed-in admins see "Dashboard" instead.
- Changelog page (`/changelog`) and version badge. Release notes live in `src/data/changelog.ts`.
- Surprise me: opens a random published project.
- Admin preview: admins can open drafts on their public page (with an Edit shortcut). Visitors still get a 404, enforced by RLS.
- Publish-readiness meter on the dashboard, project list and project form (a guide, never a blocker).
- **v1.2.0**: installable PWA with offline page; saved projects (browser-only, no account); share-card image with logo, name and QR; technology filter on Explore; per-project update history; scheduled publishing; admin link checker (Vercel function `api/check-links.ts`); privacy-friendly daily view counts; desktop nav lens; cursor-following glint on cards.
- Everything shown comes from the database. No fake stats, ratings or reviews.
- Starter projects **QRGen** and **Downexa** are seeded as **drafts** with no URL until you verify and publish them.

## Project structure

```
api/                      (not needed: authorization is enforced by RLS, see Security)
public/                   favicon, robots.txt
scripts/generate-sitemap.mjs   post-build sitemap + robots Sitemap line
supabase/
  migrations/             schema, RLS policies, storage bucket + policies
  seed.sql                idempotent categories, settings row, draft projects
  tests/rls_check.sql     manual RLS verification to run in the SQL editor
src/
  components/ (+ admin/)  UI building blocks
  hooks/                  auth, theme, settings, toast, query, debounce
  layouts/                PublicLayout, AdminLayout
  lib/                    supabase client, queries, validation, errors, SEO, upload
  pages/ (+ admin/)       routes
  styles/index.css        design tokens (dark/light) + Tailwind
  types/                  shared types
```

## Run locally

```bash
npm install
cp .env.example .env.local     # then fill in your Supabase public values
npm run dev
```

Without the Supabase variables the site still renders, shows a clear "not connected" message where data is expected,
and the admin login is disabled.

## Verify locally

```bash
npm run typecheck
npm run lint
npm test
npm run build
```

Automated tests cover: slug generation and validation, unsafe-URL rejection, search escaping, filter/sort/pagination query
building, explore URL state, error mapping and timeouts, upload validation (type, size, filename), protected-route
behaviour (anonymous redirect, non-admin denial, admin access) and unknown-route 404.

They do **not** cover real database behaviour or responsive layout. Check those manually:
run `supabase/tests/rls_check.sql` in the SQL editor, and exercise the site at phone, tablet and desktop widths.

## Supabase setup

1. Create a project at supabase.com.
2. Apply the migrations in order, either with the CLI (`supabase link` then `supabase db push`) or by pasting each file from
   `supabase/migrations/` into the SQL editor:
   1. `..._schema.sql` tables, constraints, indexes, triggers, `is_admin()`
   2. `..._rls.sql` Row Level Security and grants
   3. `..._storage.sql` the `project-images` bucket and its policies
   4. `20261024000001_v1_2_features.sql` technology keys, scheduled publishing (`pg_cron`), update history, view counters.
      Scheduled publishing needs the `pg_cron` extension (Database → Extensions). Without it everything else still works.
3. Run `supabase/seed.sql` (safe to run repeatedly).
4. **Create the first admin.** Public sign-up must stay off:
   - Authentication → Sign In / Providers → Email: keep email+password on and **disable "Allow new users to sign up"**.
   - Authentication → Users → *Add user* with your email and a strong password.
   - In the SQL editor run (replace the email):
     ```sql
     insert into public.admin_users (user_id)
     select id from auth.users where email = 'owner@example.com'
     on conflict do nothing;
     ```
   Only the SQL editor / service role can write `admin_users`; no API policy exists for it, so nobody can promote themselves.
5. Copy **Project URL** and the **anon / publishable key** (Project Settings → API) into your env vars.

### Storage

The `project-images` bucket is **public**: anyone with an image URL can open it, so never upload private material. Only admins
can list, upload, replace or delete. Limits: 2 MB, JPEG/PNG/WebP/AVIF (SVG is deliberately excluded). Files are stored under
random names; the original filename is never used.

## Deploy to Vercel

1. Push this folder to a GitHub repository (`.env*` files are git-ignored).
2. In Vercel: *Add New → Project → Import* the repo. Framework preset: Vite. Build `npm run build`, output `dist`, install `npm install`.
3. Project Settings → Environment Variables (Production, and Preview if wanted):
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_PUBLISHABLE_KEY`
   - `VITE_SITE_URL` (your production URL, no trailing slash, used for canonical links and the sitemap)
4. Deploy. Later changes redeploy on every push; after changing env vars choose *Redeploy*.
5. In Supabase → Authentication → URL Configuration set **Site URL** to your production URL.
6. Production smoke test: open `/explore` and `/admin/login` directly and refresh (SPA rewrites in `vercel.json`),
   sign in, create a draft, confirm it is **not** visible while logged out (private window), publish it, confirm it appears,
   upload an image, check `/sitemap.xml` and `/robots.txt`.

`vercel.json` rewrites unknown non-file paths to `index.html` and adds basic security headers. No Vercel Functions are used.

## Security model

- **Authorization lives in Postgres.** `public.is_admin()` checks the `admin_users` allowlist keyed by the authenticated
  user's id (never user-editable metadata). Every write policy on `projects`, `categories`, `site_settings` and Storage calls it.
- Anonymous visitors can read only `publication_state = 'published'` projects, categories and public settings.
  Drafts are invisible even if the slug is known; the detail page shows the same 404 for missing and unpublished projects.
- Frontend route protection is a usability layer only; bypassing it still yields denied writes.
- Only the public anon/publishable key is used in the browser. `SUPABASE_SERVICE_ROLE_KEY` is not needed and must never be added
  as a `VITE_*` variable or committed.
- URLs are validated twice (client and DB CHECK constraints): only `http(s)`, no `javascript:`/`data:`. External links use
  `rel="noopener noreferrer"`. Descriptions render as plain text, never raw HTML.
- Errors shown to users are generic; raw database messages are never displayed.
- `localStorage` stores only the theme preference and the visitor's saved-project slugs. No auth or project data.
- The link checker (`/api/check-links`) verifies the caller's Supabase token and admin status server-side, only fetches `http(s)` URLs
  stored on projects, resolves DNS and refuses private/loopback/link-local addresses (SSRF), and re-validates every redirect.
  It reuses the same `VITE_SUPABASE_*` variables (or `SUPABASE_URL` / `SUPABASE_ANON_KEY`) and never needs the service role key.
- View counters are written only through a SECURITY DEFINER function that counts published projects; the table is readable by admins only.

## SEO notes and limitations

Implemented: per-page title/description/Open Graph/canonical (set at runtime), semantic HTML, alt text, lazy images,
skeletons, route-level code splitting, `robots.txt`, build-time `sitemap.xml`, focus styles, reduced-motion support.

Limitation: this is a client-rendered SPA, so titles and meta tags are set by JavaScript. Google generally executes JavaScript,
but some crawlers and social-link scrapers read only the initial HTML and will see the default tags from `index.html`.
If stronger indexing or rich link previews matter, add pre-rendering (e.g. `vite-plugin-prerender`/`vike` for public routes) or
move the public pages to a framework with server rendering such as Next.js. Full SEO optimization has **not** been audited.

## Known limitations

- Unsaved-changes protection covers tab close/reload and the form's own Cancel/back buttons; clicking an admin sidebar link
  does not prompt (the app uses `BrowserRouter`, which has no navigation blocker).
- Admin category counts are tallied in the browser, which is fine for a personal directory but not for thousands of rows.
- Share cards are images for posting; rich link previews in chat apps still need server-rendered meta tags (see SEO notes).
- The service worker caches only same-origin static assets and never `/api/` or Supabase calls. iOS has no install prompt: use Share → Add to Home Screen.
- View counts are approximate (one per project per browser session; bots and blockers are not filtered).
- Sitemap generation needs the Supabase env vars at build time; otherwise only static routes are listed.

## Releasing a new version

1. Add an entry at the top of `CHANGELOG` in `src/data/changelog.ts`.
2. Set `version` in `package.json` to the same number (a test fails if they differ).
3. Commit and push; Vercel redeploys. The footer, admin sidebar and `/changelog` update automatically.
