# Web workspace plan (`web/`)

This file is part of the [FieldMaps production plan](../docs/plan/README.md) and defines the `WEB-*` tasks. Related plan files:
- **API shapes:** [contracts.md](../docs/plan/contracts.md).
- **The API side:** [backend/PLAN.md](../backend/PLAN.md).
- **User journeys:** J1, J3 and J4 in [product.md](../docs/plan/product.md#journeys-the-pilot-must-support).
- **Fixture list:** [architecture.md](../docs/plan/architecture.md#fixture-inventory).
- **Local rules:** `web/AGENTS.md` still applies. In particular:
  - one **Preview data** marker in the header and one footer line say that the screens read fixtures (D20). They come off only when no screen reads fixtures;
  - Contour tokens change only in `contracts/contour.json`; `pnpm tokens` regenerates `src/styles/contour.css`, and the collector reads the same file (D19).

**Skills to load** when working here: `vercel-plugin:nextjs`, `frontend-dashboard-polish`, `responsive-design`, `site-architecture`.

## Context (verified 2026-09-22)

- **Stack and auth.** Next.js 16.2.7, React 19.2.4, Tailwind v4, react-leaflet 5. There is no Supabase package, no `proxy.ts`, no route handlers, no auth, and no error or not-found pages.
- **Data.**
  - Every workspace screen imports fixtures from `src/data/*`. `VIEWER` is hard-coded to Janet (`src/data/project.ts:70-76`).
  - The only network call is the package upload (`src/lib/packages.ts:82`). It posts to `PROJECT.id = "prj-riverside-play-study"` (`src/data/project.ts:19`), which is not a UUID, so the API returns 422. The manager's token is pasted in (`PackageUpload.tsx:166-181`).
- **Routes.**
  - `(marketing)` at `/`.
  - `(workspace)`: `/overview`, `/observations`, `/places`, `/basemaps`, `/instrument`, `/qgis`, with no project in the URL.
  - `(legal)`: `/privacy`, `/privacy/delete-data`. The privacy copy says administrators create accounts, which is wrong now that sign-up is public.
- **Offline caching.** `public/sw.js` caches every same-origin GET, cache-first, under a fixed cache name. Once the data is live, that will serve stale data and stale builds. The manifest's `start_url` is `/`.
- **Tablet and touch.** The three-pane Observations view needs a width of at least 1280 px. Several tap targets are 32–40 px (`RailNav.tsx:31`, `chrome.tsx:171,423`, `PackageUpload.tsx:145`).

## Target route tree

```
src/app/
  (public)/…                                 /, /privacy, /privacy/delete-data
  (auth)/(signed-out)/…                      /sign-in, /sign-up, /verify, /forgot-password, /reset-password
  (auth)/(signed-in)/…                       /invite (token in the URL fragment), /join (U3)
  (onboarding)/onboarding/[step]             organization, project, site, form, team
  (app)/account/page.tsx                     profile, password, sign out, delete account
  (app)/o/[org]/…                            header, no tabs: collect (observer handoff, U3), not-found, error
  (app)/o/[org]/(org)/…                      projects (org root), members, library (U4), settings
  (app)/o/[org]/p/[project]/(project)/…      overview (project root), data, data/[observation],
                                             sites, sites/[site], sites/[site]/zones/[zone],
                                             sites/[site]/zones/edit (U2), sites/[site]/packages?step=,
                                             forms, forms/versions, forms/versions/[version],
                                             forms/versions/[version]/publish, team, qgis,
                                             reports (U7), reports/views, reports/[report],
                                             settings, settings/rounds (U6)
  dev/contour/                               every primitive in Day and Dusk (dev and preview builds only)
src/proxy.ts                                 session refresh + auth redirects
src/lib/supabase/{server,client}.ts
src/lib/api/{client.ts,schema.d.ts,errors.ts}   server-only
src/components/contour/…                     primitives, same names as mobile/src/ui/
src/components/shell/…                       header, switchers, tabs, ⌘K, Preview data marker
src/features/<area>/…
src/fixtures/…                               preview data, until each screen is wired
```

A project has eight tabs: Overview, Data, Sites, Forms, Team, QGIS, Reports, Settings. An organization has four: Projects, Members, Form library, Settings. The header holds the org and project switchers, "Search or jump to" (⌘K), the Preview data marker and the account menu (with Day · Dusk). Viewers do not see Team or Settings. The Team page, publishing, and uploading to Sites are for managers only. The old paths (`/overview`, `/observations`, `/places`, `/basemaps`, `/instrument`, `/qgis`) redirect with a 307 and keep the query string (D21). Every route under `(auth)`, `(onboarding)` and `(app)`, and `/dev/contour`, is `noindex`.

**Contour screens first.** WEB-20 to WEB-26 build every page above in Contour, on fixtures (D19–D22). The wiring tasks WEB-04 to WEB-13 then connect real data to those screens without changing their layout. Where a wiring task names something WEB-26 retires (`src/data/*`, `LeafletCanvas`, `ZonePlan`, the `(legal)` and `(marketing)` groups), read its successor (`src/fixtures/*`, `SitePlan` and `MapFrame`, `(public)`). The design pages named under `Read first` come from the four Contour design sets, which are not committed ([docs/ux/README.md](../docs/ux/README.md)); root `DESIGN.md` is the committed reference.

## Tasks

### WEB-01: Quick fix so the package upload reaches a real project
Status: doing (code in place 2026-10-01; the staging upload is not verified) · Phase 0 · Size S · Depends: DB-01 · Blocks: WEB-08
Progress 2026-10-01: `NEXT_PUBLIC_FIELDMAPS_PROJECT_ID` with a UUID check, a site-code input, a multi-file drop zone with an instant layer map and browser checks. `qgis/fall-creek/upload-sample/` passes the browser checks and the API's `prepare()` run directly; no upload against staging has been made.
Superseded later by WEB-08, which takes the project and site from the route.
Read first: `src/components/basemaps/PackageUpload.tsx`, `src/lib/packages.ts`, `src/data/project.ts`.
Do:
1. Add `NEXT_PUBLIC_FIELDMAPS_PROJECT_ID`, a UUID. When it is set, the upload uses it instead of `PROJECT.id`.
2. Replace the fixture site dropdown with a text input for the site code. Default it to `sample-garden`, and show a note that site lists arrive with WEB-08.
3. Keep the pasted-token stopgap and its notice until WEB-06.
4. Document the variable in `web/README.md`.

Done when: against staging, where DB-01 is applied, a manager token uploads a package and the screen shows the server's checks.

Verify: `pnpm --dir web check`, plus a manual upload against staging recorded in the task notes.

### WEB-02: Service worker, manifest and indexing safety
Status: todo · Phase 0 · Size S · Depends: none · Blocks: WEB-10
Do:
1. Changes to `public/sw.js`:
   - add the build id to the cache name;
   - never cache `/_next/data`, `?_rsc`, `/api`, or any cross-origin request;
   - keep the app shell network-first.
2. Point the manifest's `start_url` at `/o`, where WEB-06 will redirect to the last project.
3. Add `src/app/robots.ts`: allow only `/` and `/privacy*`; disallow everything else.

Done when: after a rebuild the cache name changes, and `curl localhost:3000/robots.txt` shows the rules.

### WEB-03: Supabase SSR foundation and proxy
Status: todo · Phase 1 · Size M · Depends: DB-02 · Blocks: OPS-05, WEB-04, WEB-05, WEB-16
Read first: <https://supabase.com/docs/guides/auth/server-side/nextjs>; <https://nextjs.org/docs/app/api-reference/file-conventions/proxy>.
Do:
1. Add `@supabase/ssr` and `@supabase/supabase-js`, with exact versions pinned in `web/package.json`.
2. Create `src/lib/supabase/server.ts` with `createServerClient`, using `cookies()` `getAll`/`setAll`, and `src/lib/supabase/client.ts` with `createBrowserClient`.
3. Create `src/proxy.ts`. It refreshes the session cookies and redirects unauthenticated requests for `/o/**`, `/onboarding` and `/account` to `/sign-in?next=…`.
4. Also check auth inside every server component and Server Action that reads tenant data, with a `requireUser()` helper that uses `getClaims()`. The proxy alone is not enough.
5. Add the env vars `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, documented in `web/README.md`.

Done when: an unauthenticated visit to `/o` redirects to sign-in, and a signed-in visit passes.

### WEB-04: Authentication pages
Status: todo · Phase 1 · Size M · Depends: DB-02, WEB-03 · Blocks: WEB-06, WEB-15
Do: wire these pages to Supabase Auth. WEB-21 builds them in Contour on fixtures; keep its layout, copy and 44 px targets:
- `/sign-up`: email and password (8 characters or more), then `signUp`, then `/verify`.
  - The email travels in `sessionStorage` or an httpOnly cookie, never in the URL. URLs end up in request logs, history and Sentry breadcrumbs.
- `/verify`: 6-digit code, `verifyOtp({type: 'email'})`, and resend with a cooldown.
- `/sign-in`: distinct errors for wrong credentials, unconfirmed email (links to verify), and rate limiting.
- `/forgot-password` → `/reset-password`: code, then new password (`verifyOtp({type: 'recovery'})`, then `updateUser`).
- Sign-out from the account menu.

After sign-in, go to `next`, the last project, or `/onboarding`.

Done when: every flow works against the local stack, with codes read from Mailpit.

### WEB-05: Server-side API client
Status: todo · Phase 1 · Size M · Depends: BE-06, CON-03, CON-04, WEB-03 · Blocks: WEB-06, WEB-12
Do:
1. Create `src/lib/api/client.ts` and mark it `server-only`. It fetches `FIELDMAPS_API_URL` (a server environment variable, not `NEXT_PUBLIC_`) with the session's access token and `cache: 'no-store'`, typed by the generated `schema.d.ts`. It maps the error envelope to typed errors (`errors.ts`).
2. Mutations go through Server Actions that call this client. Each action checks auth itself.
3. Make one exception: large package uploads may post from the browser directly to the API. They need CORS, which `browser_origins` already covers. Alternatively, the upload goes through a Route Handler proxy, which also needs a body-size decision. Record the choice in this task's notes.
4. Remove `NEXT_PUBLIC_FIELDMAPS_API_URL` once nothing reads it.

Done when: one server component renders `/v1/me` data, and the typecheck passes against the generated types.

### WEB-06: Onboarding, organization and project routes, account page
Status: todo · Phase 1 · Size L · Depends: BE-06, BE-07, BE-08, WEB-04, WEB-05 · Blocks: WEB-07, WEB-08, WEB-09, WEB-10, WEB-11, WEB-14, WEB-15
Do:
1. `/onboarding`:
   - create an org (name, auto slug) and the first project (name, code, timezone) through `POST /v1/orgs`;
   - or show "You were invited? Open your invitation link."
2. `/invite` (the token in the URL **fragment**, `/invite#t=…`):
   - The fragment never reaches the server, the logs or the referrer.
   - The page reads it client-side and keeps it in `sessionStorage` through sign-up or sign-in. `next` points at `/invite`, without the token.
   - Then it calls `POST /v1/invitations/preview`, and shows "Join {project} ({org}) as {role}?".
   - `POST /v1/invitations/redeem` runs only on that confirmation. Opening a link never enrols anyone silently.
   - Set `Referrer-Policy: no-referrer` on `/invite` and `/verify`.
   - Add a Sentry `beforeBreadcrumb` rule that drops URLs under `/invite` and any `email` parameter (WEB-16).
3. `/o/[org]` lists the projects and org settings, including org members when the user is an admin.
4. The workspace sections live under `/o/[org]/p/[project]/…` with the D21 slugs (`data`, `sites`, `forms`, `team`, `qgis`, `reports`, `settings`), and the old paths redirect; WEB-22 builds both. Resolve the org and project from the route and `/v1/me` instead of the fixture slugs. Keep the fixture reads and the Preview data marker (D20) until WEB-08 to WEB-12 wire each screen.
5. Header: the org and project switcher from `/v1/me`, and the account menu. Remove the `VIEWER` fixture, and the marketing page's `ORGANIZATION.name`; the landing page names the product, not a tenant.
6. `/account`: profile (`PATCH /v1/me`) and delete account.
   - Deletion calls `DELETE /v1/me` behind a two-step confirm, with a `sole_owner` message.
   - On 202, show "Deletion is finishing" and retry up to 3 times over about 30 seconds while the session is valid.
   - Then sign out (204 or 202 alike).
   - The server keeps the durable record (BE-08).
7. Add `error.tsx`, `not-found.tsx`, and a `loading.tsx` for each section.

Done when: J1 steps 1–2 work end to end against the local stack, and the old URLs redirect.

### WEB-07: Team page (members, invitations, join codes)
Status: todo · Phase 1 · Size M · Depends: BE-07, WEB-06 · Blocks: WEB-15
Do:
1. List members with their role, and let a manager change a role or remove someone.
   - The UI blocks removing the last manager, and the API enforces it too.
   - On the organization page (`/o/[org]`), owners and admins manage org members the same way. Only owners see `admin` and `owner` controls, and ownership moves only through "Transfer ownership".
2. Invitations, for a project (project roles) or, on the organization page, for the org (`member` or `admin`):
   - create one with a role, an optional email, a use limit and an expiry;
   - show the link (`/invite#t=…`) and the 8-character code **once**, with copy buttons and a QR code of `fieldmaps://join?code=`;
   - list active invitations and revoke them.
3. Observer devices come from DB-10 `devices`, once it exists.

Done when: a manager creates a code on the web and an observer redeems it on mobile (MOB-06).

### WEB-08: Sites and packages on real data
Status: todo · Phase 3 · Size M · Depends: BE-13, WEB-01, WEB-06 · Blocks: none
Do:
1. `sites`:
   - list from the API;
   - a manager can create a site (code, name, timezone);
   - `sites/[site]` shows the zones (real polygons) on the map, the package versions with their checks, and the current version.
2. Move `PackageUpload` here and delete the pasted token. The site code comes from the route, the project UUID from the route, and the token from the session.
3. Offer a package download through the `archive` route.
4. Stop these screens reading fixtures. The Preview data marker stays until no screen reads fixtures (D20).
   - Delete `src/data/basemaps.ts`.
   - Replace `src/data/site-geometry.ts` in `ZonePlan` and `project.ts` with zones and ground from the sites API.
   - Delete any part of `src/data/project.ts` that nothing uses.

Done when: J1 step 3 works, and no fixture remains on these routes.

### WEB-09: Instrument on real data
Status: todo · Phase 3 · Size M · Depends: BE-11, WEB-06, WEB-10 · Blocks: none
Cut option: if the schedule slips, keep this screen read-only and seed Janet's version with a migration.
Do:
1. Forms, then versions, each with its state. Show a version's questions and display rules, read from the definition.
2. Manager actions:
   - import a draft (paste or upload JSON) and show every validation problem;
   - publish, then retire.
3. Stop this screen reading fixtures; the Preview data marker stays until no screen does (D20). This task owns deleting `src/data/instrument.ts`: after WEB-10 has moved `FilterRail` and the markers off it, remove every remaining import and the file.

Done when: Janet's definition from `contracts/forms/` imports and publishes locally.

### WEB-10: Observations on real data
Status: todo · Phase 3 · Size L · Depends: BE-14, WEB-02, WEB-06 · Blocks: WEB-09, WEB-13
Read first: `src/components/observations/*`, `src/lib/filters.ts`.
Do:
1. Keep the filters in the URL, now project-scoped. Load one page at a time with a cursor.
2. Map:
   - query by viewport bbox;
   - cluster markers (replacing the one-DOM-marker-per-record approach, `LeafletCanvas.tsx:149-163`);
   - show zones from the site's current package.
3. The table is virtualized, or paged at 100 rows. The detail pane reads from the API.
4. Fix the mislabel: `Rel_Round` is not the collection round (`ObservationDetail.tsx:59`).
5. Replace every remaining fixture read on this screen:
   - `FilterRail`'s zone, round and observer options come from the zones API and the summary (BE-14);
   - its play types and quality flags come from the form definition, not `src/data/instrument.ts`;
   - marker shapes (`markers.ts`, `shapeForPlayType`) come from the definition;
   - dates use the project's or site's timezone from the API, not `SITE_TIME_ZONE` (`src/lib/format.ts`, `ObservationDetail`).
6. Delete `src/data/observations.ts`, and stop `LeafletCanvas` importing `src/data/site-geometry.ts`. Only then is this screen off fixtures.

Done when: 10,000 synthetic observations on the local stack scroll and filter smoothly, and the filters survive a page reload.

### WEB-11: Overview on real data
Status: todo · Phase 3 · Size M · Depends: BE-14, WEB-06 · Blocks: none
Cut option: show counts only, without charts.
Do: fill WEB-23's overview (counts, `TypeBars` and the coverage matrix) from `GET …/summary`, keeping its layout; `DESIGN.md` rules out KPI tiles. Delete client-side aggregation over fixtures (`src/lib/analysis.ts`) that nothing uses anymore.

Done when: the overview matches SQL counts on the local stack.

### WEB-12: GIS page and exports
Status: todo · Phase 3 · Size S · Depends: BE-14, BE-15, GIS-01, GIS-04, WEB-05 · Blocks: none
Do:
1. Export buttons (CSV, GeoJSON) that apply the current filters and call BE-14's server exports.
   - Delete the client-side generation over fixtures (`src/lib/exports.ts`).
   - Once `site-geometry.ts` has no importers left (WEB-08, WEB-10), delete it too.
2. The QGIS connection panel reads from `/gis-access`: public settings only, the per-project service name, and the typed layer names. Link to the `qgis/README.md` steps.

Done when: the exported CSV opens with the codebook columns, and the panel shows the real settings for a project with a grant.

### WEB-13: Tablet layout and touch targets
Status: todo · Phase 3 · Size M · Depends: WEB-10 · Blocks: none
Do:
1. Observations: two panes (map and table) from `md`, with detail as a sheet. Three panes at `xl`.
2. Every control is at least 44 px tall (`RailNav.tsx:31`, `chrome.tsx:171,423`, `ObservationsWorkspace.tsx:102`, `PackageUpload.tsx:145`).
3. Check at 768×1024, 1024×768 and 1280×800 using the `responsiveness-check` skill.

Done when: there is no horizontal scroll and no clipped pane at those three sizes. Record screenshots in the task notes.

### WEB-14: Legal pages for public sign-up
Status: todo · Phase 1 · Size S · Depends: WEB-06 · Blocks: OPS-11
Read first: `src/app/(legal)/privacy/page.tsx` (`:78-80` and `:281` say administrators create accounts); `src/app/(legal)/policy.ts`.
Do:
1. Describe public sign-up, email-code verification, and what data an account holds.
2. Describe the Training project and its 30-day retention. The retention period depends on Q2.
3. State that a user can delete their account in the app, or signed in on the web at `/account`.
4. Make `/privacy/delete-data` work **without the app**, to meet the Play requirement: signed-in users get the deletion flow; signed-out users get instructions and a contact.
5. Keep the "to be confirmed" markers wherever a value is still open.

Done when: nothing on the page contradicts public sign-up, and the deletion path works without the app.

### WEB-15: End-to-end tests with Playwright
Status: todo · Phase 4 · Size M · Depends: DB-02, WEB-04, WEB-06, WEB-07 · Blocks: QA-04
Do: add `web/e2e/`, running against the local stack and reading codes from the Mailpit API. Cover:
- sign-up, verify, onboarding, then the org and project exist;
- sign in and reset password;
- invitation link redemption by a second user;
- a manager creates a join code;
- account deletion.

Done when: the suite passes locally and in CI (OPS-06).

### WEB-16: Web error reporting
Status: todo · Phase 4 · Size S · Depends: OPS-07, WEB-03 · Blocks: QA-06
Do:
1. Add `@sentry/nextjs` for server, edge and browser.
   - Server and edge read `SENTRY_DSN`.
   - The browser reads `NEXT_PUBLIC_SENTRY_DSN`, which is fixed at build time (OPS-05). A DSN is public.
2. Apply the OPS-07 scrubbing:
   - no request bodies;
   - no `answers`;
   - no emails;
   - a `beforeBreadcrumb` rule that drops `/invite` URLs and `email` parameters (WEB-06).
3. Add a hidden `/account/sentry-test` action, for signed-in platform admins only, that throws once.

Done when: a server-side and a browser-side test error from the preview deployment both appear in Sentry, with no personal data in their breadcrumbs.


### WEB-17: Form Studio: the canonical form, a live collector preview, and local drafts
Status: done (2026-10-01) · Phase 1 · Size M · Depends: CON-02 · Blocks: none
Added 2026-10-01 to show Janet her form as the collector asks it, before the instrument API exists. WEB-09 later swaps the source from `contracts/forms/` to the API and adds publishing; the studio's UI stays.
Read first: `contracts/README.md`; `mobile/src/forms/{definition,engine}.ts`; `mobile/src/components/question-panel.tsx`.
Do:
1. Copy the form parser and engine to `web/src/lib/forms/`, byte-identical below a header, with `pnpm forms:parity` checking it. Add `loadDefinition()`, which returns every problem instead of throwing.
2. `/instrument` reads `contracts/forms/*.json` at build time and renders each question in authored order: kind, required, display rule as a sentence, options, dynamic option sets, export column, open protocol questions.
3. A phone preview (`src/components/studio/PhonePreview.tsx`) runs the same engine: one question per screen, auto-advance on single choice, review, saved, and the export columns an answer lands in.
4. Customize a draft in place: wording, guidance, required, option labels (codes never follow a relabel), new options, order, simple display rules, new questions with no invented export column. A published version is read-only; changing it starts a new draft beside it.
5. Drafts stay in this browser (`localStorage`, guarded) with a change list against the shipped file and a `.json` download. No publish control pretends to work.

Done when: Janet's form renders from `contracts/forms/janet-test-v1.json`, branching on the phone matches the device, an edit appears on the phone at once, and the change list names it.

Verify: `pnpm forms:parity`, `pnpm --dir web check`, and a browser pass recorded here.

Verified 2026-10-01: the web copy matches mobile byte for byte and replays all 39 `janet-test-v1` contract cases; `pnpm --dir web check` passes. In the browser, Janet's form renders from the contract, choosing Imaginative reveals its own subtype list, an added option and a required toggle reach the phone at once and appear in the change list, review blocks a save on missing required answers, and the saved screen lists the export columns. No horizontal scroll at 1440, 1024 or 768 px.

### WEB-18: Set-up flow preview (organization, project, site, form, invitation)
Status: done (2026-10-01) · Phase 1 · Size S · Depends: none · Blocks: none
Added 2026-10-01 for the J1 walkthrough with Janet. A clickable preview at `/onboarding` that saves nothing and says so; WEB-06 and WEB-07 replace its "Continue" steps with the real calls once BE-07 exists.
Do: five steps (organization and slug, first project and timezone, site and the QGIS layers it needs, starting form, observer join code), a live "what this creates" panel, links into `/basemaps` and `/instrument`, and a phone mock of the collector's join screen. No control is labelled as creating anything.

Done when: every step is keyboard reachable, the banner states that nothing is saved, and the page passes `pnpm --dir web check`.

Verified 2026-10-01: all five steps walked in the browser (slug and project code derive from the names, a join code is generated, the join-screen mock names the project and org), the page is `noindex`, every control is at least 44 px tall, and `pnpm --dir web check` passes.

### WEB-19: Map palettes on the web maps (Day, Night)
Status: done (2026-10-01) · Phase 1 · Size S · Depends: none · Blocks: none
Added 2026-10-01 with MOB-22 (decision D18). The observations map and the package-upload preview read `contracts/map-palettes.json` through `src/lib/map-palette.ts`; a Day · Night switch on the observations map is shared by both maps and remembered in the browser. Light or dark CARTO tiles follow the palette.
Verified 2026-10-01: `pnpm --dir web check` passes; in the browser the switch flips the site fill between the Day and Night colours and the choice survives a reload. The ground repaint around the site on a palette change was not seen in a browser (the pane was hidden).

### WEB-20: Contour foundation (web)
Status: todo · Phase 1 · Size L · Depends: none · Blocks: WEB-21, WEB-22
Added 2026-10-03 (D19, D22). It builds no product screen. The screens built on it (WEB-21 to WEB-26) run on fixtures; the wiring tasks WEB-04 to WEB-13 later connect real data to them without changing their layout.
Read first: `DESIGN.md`, `PRODUCT.md`, `web/AGENTS.md`, `contracts/contour.json`, `contracts/map-palettes.json`; designs: Contour system pp. 1–12.
Do:
1. Tokens. `scripts/contour-tokens.mjs` generates `src/styles/contour.css` (`--ct-*` on `:root` for Day and on `[data-theme="dusk"]`); `--check` fails on drift and on contrast below 4.5:1 for text or 3:1 for UI, in both themes. Root scripts `pnpm tokens` and `pnpm tokens:check`. `globals.css` maps the variables to Tailwind utilities with `@theme inline`. A temporary block of Nocturne-name aliases keeps untouched screens readable until WEB-26 deletes it.
2. Fonts: Geologica and Spline Sans Mono through `next/font/google` as `--font-sans` and `--font-mono`, falling back to vendored woff2 through `next/font/local` if the fetch is blocked.
3. Theme. An inline `<head>` script reads `localStorage["fm-theme"]` (Day by default) and sets `data-theme`, `colorScheme`, the theme-color meta and `data-platform` before first paint; `suppressHydrationWarning` on `<html>`; no cookies, so static pages stay static. `manifest.ts` and `viewport` take the Contour colours.
4. Dependencies: `lucide-react`, `radix-ui` and `cmdk`; dev `@playwright/test` and `@axe-core/playwright`. Motion is CSS only, from the motion tokens, and every movement has a reduced-motion fallback.
5. Primitives in `src/components/contour/*`, with the same names as `mobile/src/ui/*`: actions, containers, state, inputs, navigation, data and feedback, as listed in `DESIGN.md`. `Icon` maps the Lucide names in the state vocabulary of `contracts/contour.json` and adds the custom two-bar held glyph. State is always a glyph, a word and a colour from that vocabulary.
6. Maps. `components/map/SitePlan` is a server-renderable SVG drawn from the palette and the site GeoJSON (`lib/plan.ts` projects any GeoJSON). The client `MapFrame` adds keyboard zoom and pan, round + / − buttons, the Layers popover (Day · Night), the label island, the scale chip, hatched focus zones and violet markers. The shared Riverside plan moves to `contracts/fixtures/sites/riverside.json`.
7. The fixture scaffold in `src/fixtures/*` (`PREVIEW_NOW`, every time in an explicit timezone, U2–U7 concepts in tagged types), `lib/{theme,preview,plan,time}.ts`, and an ESLint `no-restricted-imports` rule that stops new imports of `@/data/*` and `nocturne/*`.
8. `/dev/contour`: every primitive in Day and Dusk, `noindex`, dev and preview builds only. Add the Playwright harness in `web/e2e/` (against `next start`, service workers blocked) that screenshots a route at 1440, 1024, 768 and 390 in both themes.

Done when: the gallery renders every primitive in Day and Dusk; `pnpm tokens:check` passes, contrast included; the existing routes still build.

Verify: `pnpm --dir web check`, `pnpm --dir web build`, `pnpm tokens:check`, `pnpm forms:parity`, and the Playwright screenshot comparison of `/dev/contour` against the Contour system pages.

### WEB-21: Identity screens on Contour (web)
Status: todo · Phase 1 · Size L · Depends: WEB-20 · Blocks: none
Added 2026-10-03. These screens run on fixtures and save nothing. WEB-04 (sign-up, sign-in, codes, passwords) and WEB-06 (onboarding, invitation) later connect them to Supabase and the API without changing their layout.
Read first: `DESIGN.md`, `PRODUCT.md`; designs: Contour system p. 12, Organization, auth and public pp. 6–13; `src/components/onboarding/*` (WEB-18).
Do:
1. Layouts: `(auth)/(signed-out)` (split layout with the SitePlan hero island and a Privacy link), `(auth)/(signed-in)` (split layout with the account chip and "Not you?") and the `(onboarding)` stepper frame, each with the Preview data footer line.
2. `/sign-in`, `/sign-up`, `/verify`, `/forgot-password` and `/reset-password`. A code is one wide mono field with a counter ("4 of 6"): a paste is cleaned, the field submits by itself at the 6th digit, a wrong code reselects it, and "Resend in 0:24" counts down in mono. Password checks update live, "Does not match yet" appears only after blur, and a disabled button always carries its reason.
3. `/invite` ("Join Play Study?", the token in the URL fragment) and `/join` (PROPOSAL U3, with its flag; join codes are uppercased as you type).
4. `/onboarding/[step]` for organization, project, site, form and team, keeping WEB-18's `SetupFlow` logic and its rule that no control claims to create anything.
5. Every error state in the designs, in Contour wording: what happened, what is safe, what to do.

Done when: each screen matches its design page at 1440 and 390 in Day and Dusk; codes paste and submit by themselves; every error state can be shown in the preview.

Verify: `pnpm --dir web check`, `pnpm --dir web build`, `pnpm tokens:check`, `pnpm forms:parity`, and the Playwright screenshot comparison of each route against its design page, with axe failing on serious or critical findings.

### WEB-22: Workspace shell and navigation
Status: todo · Phase 1 · Size L · Depends: WEB-20 · Blocks: WEB-23, WEB-24, WEB-25, WEB-26
Added 2026-10-03 (D20, D21). The shell runs on fixtures. WEB-03 (the proxy) and WEB-06 (switchers and account menu from `/v1/me`) later connect it without changing its layout.
Read first: `DESIGN.md`, `PRODUCT.md`, `web/AGENTS.md`; designs: Contour system pp. 5, 6 and 10, Organization, auth and public pp. 1, 18 and 19.
Do:
1. The `(app)` layouts: `/account` and `/o/[org]` with the header and no tabs; `(org)` with the org tabs (Projects, Members, Form library, Settings); `(project)` with the project tabs (Overview, Data, Sites, Forms, Team, QGIS, Reports, Settings).
2. Header: the org and project switchers (menus with typeahead, role and state, Create project last); "Search or jump to" (⌘K) over tabs, projects, sites, zones, form versions, people and `OBS-` ids, with the actions Day · Dusk, map palette, Export current view and Invite member, and recent items; the account menu with Day · Dusk.
3. InkTabs: the white current-tab pill slides inside the ink bar, with no slide on first paint; narrow screens scroll the tabs with edge fades. Shortcuts: `g` then `o/d/s/f/t/q/r`, `?` for the list, `/` for search. A skip link, and focus moves to the page heading on navigation.
4. The Preview data marker, a mono pill in the header. Its popover reads "Everything here is sample data. Nothing is read from or written to the FieldMaps database." In dev and preview builds it also offers View as (`?as=viewer|observer`), Show state (`?preview-state=`) and Theme. One footer line says the same. Preview actions go into a `sessionStorage` store, take effect on screen, reset on reload and never claim a server round trip.
5. Redirects in `next.config.ts` (307, query string kept) from `/overview`, `/observations`, `/places`, `/basemaps`, `/instrument` and `/qgis` to the new routes.
6. The org-level 404 and error pages (the org header without tabs; the error page with "What we know" and a reference), and the org Projects page.
7. Delete `(workspace)`, `RailNav` and `StatusFooter`. Bump the `sw.js` `CACHE_NAME` so cached Nocturne pages are dropped.

Done when: the old paths redirect; the skip link, tabs, ⌘K and menus work by keyboard alone; `?as=viewer` hides Team and Settings; axe is clean in both themes.

Verify: `pnpm --dir web check`, `pnpm --dir web build`, `pnpm tokens:check`, `pnpm forms:parity`, and the Playwright screenshot comparison of each route against its design page, plus a scripted keyboard run.

### WEB-23: Project screens: field return (overview, data, observation)
Status: todo · Phase 1 · Size L · Depends: WEB-22 · Blocks: none
Added 2026-10-03. These screens run on fixtures. WEB-10 (data), WEB-11 (overview) and WEB-12 (exports) later connect real data to them without changing their layout.
Read first: `DESIGN.md`, `PRODUCT.md`; designs: Project workspace pp. 1–3, Contour system p. 8; `src/lib/filters.ts`, `src/lib/analysis.ts`, `src/lib/exports.ts`.
Do:
1. Overview (project root), "What came back from the field": coverage and what is blocking. Every count comes from the fixture rows through `lib/analysis.ts` and `lib/filters.ts` (14 observations; play types 5/4/3/2; observers JL 6, PS 4, AK 4; coverage 5 of 9 zone-rounds).
2. Data: filters in the URL that update at once, "14 of 14 shown" in a live region, and Clear filters returning focus to the first filter. `MapFrame` and `DataTable` share a two-way selection: the row scrolls into view, the map eases only when the marker is off-screen, and a selection that leaves the view clears with "OBS-0244 is not in this view".
3. The selected-record panel. `j`/`k` or ↑/↓ move the selection, Enter opens, `a` approves and `x` excludes; the toast reads "OBS-0244 approved · Undo" (6 s), ⌘Z also undoes, and focus stays on the row. These are session-only preview actions.
4. Save view (session only), and Export through a dialog that reuses `lib/exports.ts` and repeats the scope.
5. `data/[observation]`: every answer, the context, the location and the history.
6. Every data area has its loading, empty, filtered, error, offline and no-access states. At 768 Data shows the map and table with the selected record in a dialog; at 390 tables become row cards.

Done when: the numbers match the designs; the selection rules hold; the `j/k`, `a/x` and undo keyboard run passes.

Verify: `pnpm --dir web check`, `pnpm --dir web build`, `pnpm tokens:check`, `pnpm forms:parity`, and the Playwright screenshot comparison of each route × preview state against its design page.

### WEB-24: Project screens: places (sites, site, zone, zone editor, map packages)
Status: todo · Phase 1 · Size L · Depends: WEB-22 · Blocks: none
Added 2026-10-03. These screens run on fixtures. WEB-08 (sites and packages) and WEB-10 (zone data) later connect real data to them without changing their layout. The package upload stays real: it keeps `lib/packages.ts` and says "Sends this package to the FieldMaps API."
Read first: `DESIGN.md`, `PRODUCT.md`; designs: Project workspace pp. 6–10; `src/components/basemaps/PackageUpload.tsx`, `src/lib/packages.ts`.
Do:
1. Sites, and Site: zones on the `SitePlan`, coverage, packages and its data. Device readiness always reads "as last reported".
2. Zone (`sites/[site]/zones/[zone]`): the data and coverage inside one zone.
3. Edit zone boundaries (`sites/[site]/zones/edit`, PROPOSAL U2, with its flag). Handles are focusable buttons: arrows nudge 1 map unit and Shift+arrow 10; Delete removes a vertex but keeps at least three. Edits sync both ways with the vertex table, ⌘Z undoes, and Discard confirms. Edits are session-only.
4. Map packages (`sites/[site]/packages?step=`). The step lives in the URL, so back works. Inspection rows support a "Checking" state, and the fixtures show the final state. "Activate v4" turns v3 into Archived, session only. Step 1's dialog keeps the real upload and previews the layers with `SitePlan`.

Done when: vertex editing works by keyboard; `?step` back navigation works; the upload still reaches the API.

Verify: `pnpm --dir web check`, `pnpm --dir web build`, `pnpm tokens:check`, `pnpm forms:parity`, and the Playwright screenshot comparison of each route against its design page.

### WEB-25: Project screens: forms, team, QGIS, reports, settings
Status: todo · Phase 1 · Size L · Depends: WEB-22 · Blocks: none
Added 2026-10-03. These screens run on fixtures. WEB-09 (forms), WEB-07 (team) and WEB-12 (QGIS) later connect real data to them without changing their layout. Reports (U7) and rounds (U6) are proposals and always show their flags.
Read first: `DESIGN.md`, `PRODUCT.md`; designs: Project workspace pp. 4, 5 and 11–19; `src/components/studio/PhonePreview.tsx`, `src/lib/forms/*`.
Do:
1. Forms, Form versions (with the `janet-test-v1` draft and its 8 protocol notes), the draft editor (`forms/versions/[version]`, read-only once published) and Review publication (`…/publish`). The confirm checkbox enables "Publish demo-v2", and the reason shows until then; afterwards the version history updates, session only.
2. A new `CollectorPreview` on a `usePreviewSession` hook taken out of `PhonePreview`'s engine wiring, with a Phone · Tablet toggle, scoped to Day. The engine files in `src/lib/forms/` stay untouched.
3. Team: members, roles, invitations and the join code. Copy turns into "Copied ✓", Download saves a `.txt`, and Dismiss confirms; the island then collapses to "Code dismissed · Rotate code".
4. QGIS: maps in (packages by site) and evidence out (publishing, access, exports).
5. Reports, Saved views (`reports/views`) and the printable site summary (`reports/[report]`: `@page` A4, forced Day, no ledges).
6. Project settings and Rounds (`settings/rounds`). Unsaved changes replace "Last saved yesterday by JL" with "Unsaved changes", and leaving the page asks first. The danger zone lists every affected resource before the type-to-confirm button.

Done when: `pnpm forms:parity` passes with the engine files untouched; the print preview of the site summary fits one A4 page.

Verify: `pnpm --dir web check`, `pnpm --dir web build`, `pnpm tokens:check`, `pnpm forms:parity`, and the Playwright screenshot comparison of each route against its design page, plus a print-to-PDF of the site summary.

### WEB-26: Organization, account and public pages, and retiring Nocturne and Leaflet
Status: todo · Phase 1 · Size L · Depends: WEB-22 · Blocks: none
Added 2026-10-03. These screens run on fixtures. WEB-06 (org pages, account), WEB-07 (members) and WEB-14 (privacy wording) later connect them without changing their layout.
Read first: `DESIGN.md`, `PRODUCT.md`, `web/AGENTS.md`; designs: Organization, auth and public pp. 1–5 and 14–19.
Do:
1. Org Members, Form library (`/o/[org]/library`, PROPOSAL U4, with its flag) and Org settings.
2. `/account` (the header, no tabs): profile, password, sign out, delete account. No control claims a deletion it does not perform.
3. `/o/[org]/collect`, the observer handoff "You collect in the app" (PROPOSAL U3; the org header without tabs). `?as=observer` lands here.
4. Landing, Privacy and Request data deletion in the `(public)` layout, and the global 404 ("This page is not on the map.") and error ("Something went wrong.") pages.
5. Delete `src/data/*`, `src/components/nocturne/*`, `lib/states.ts`, the old studio and observation components, the Nocturne CSS aliases, and `leaflet` and `react-leaflet`.

Done when: no import of `@/data` or `nocturne` remains; no hex outside the generated tokens and the map palette; the build passes.

Verify: `pnpm --dir web check`, `pnpm --dir web build`, `pnpm tokens:check`, `pnpm forms:parity`, and the Playwright screenshot comparison of every route × preview state × role against its design page.
