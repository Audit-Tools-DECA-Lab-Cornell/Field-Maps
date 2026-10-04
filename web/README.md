# FieldMaps web

The management side of FieldMaps: projects, places, instruments, base map packages, the QGIS connection, and the observations the [native collector](../mobile/README.md) writes into the shared spatial database.

This application and the collector are one product, so they carry one design system, **Contour**, described in [`DESIGN.md`](../DESIGN.md). Its values live in [`contracts/contour.json`](../contracts/contour.json). `pnpm tokens` generates [`src/styles/contour.css`](src/styles/contour.css) from that file, and the collector reads the same file in `mobile/src/ui/tokens.ts`, so a token changes in one place and the two applications cannot drift. Day is the default theme; Dusk is a preference in the account menu.

## What is real

The collector's uploads are real: it signs in natively, saves offline, uploads on reconnect, and two test observations have been confirmed in hosted PostGIS and opened in QGIS Desktop. **Only one screen is connected to the API.** Base map upload posts a real package to `POST /v1/projects/{project}/packages` and renders the checks the server returns. Every other record, count, chart and connection value comes from fixtures under [`src/data/`](src/data), generated in the browser from a fixed seed. As each screen moves to Contour, it reads hand-written fixtures in `src/fixtures/` instead, and every count is derived from those rows.

That is stated on the screens themselves. Today the top bar, the status footer and each section carry a notice. From WEB-22 it is stated once: a quiet **Preview data** marker in the header and one line in the footer, which replace the per-section notices (D20). The marker's popover reads: "Everything here is sample data. Nothing is read from or written to the FieldMaps database." Keep it that way while any screen reads fixtures. Preview actions, such as approving a record or publishing a form version, change only this browser session and reset on reload; none claims a server round trip. The real package upload says "Sends this package to the FieldMaps API." Proposal-only concepts (U2 to U7: zone editing, web join and observer handoff, form templates, review and publication scope, rounds, reports and saved views) carry their "PROPOSAL Ux" flag on every screen that shows them.

The fixture observations are a **preview**, and the distinction is load-bearing. The database today holds two `shell-v1` records: the three-field practice form, enough to prove the upload path and nothing else. A management console over two rows demonstrates nothing about managing a study, so the fixtures preview how this workspace will read once `janet-test-v1` is published and a few days of collection have landed. `janet-test-v1` is still a draft, its record count in the database is still zero, and the instrument screen shows both numbers side by side rather than letting one of them pass for the other.

The fixtures mirror the real schema rather than a convenient one: `supabase/migrations/` is the authority for what an organization, project, site, form version and observation are, and [`src/types/domain.ts`](src/types/domain.ts) does not invent a concept the schema does not have. The site geometry is the training site the collector already carries, copied coordinate for coordinate from `mobile/src/maps/sample-site.ts`, so a zone on this map is the polygon the observer tapped inside.

## Sections

| Route           | What it is                                                                                      |
| --------------- | ----------------------------------------------------------------------------------------------- |
| `/`             | The landing page — what the product is, and what is built, open and not built yet               |
| `/overview`     | Overview — what the field returned, coverage against the protocol target, and what is blocking  |
| `/observations` | Data review — one filter set, a coordinated map and table over it, and the record itself        |
| `/places`       | Sites and the zones inside them                                                                 |
| `/instrument`   | Variable library, display logic and form versions                                               |
| `/basemaps`     | Turning a QGIS project into a package: uploading layers, and the checks the server runs on them |
| `/qgis`         | The connection that reads the same database                                                     |

These are today's routes. The Contour workspace (WEB-22, D21) moves them under an organization and a project, with slugs that follow the designed tab labels: `/o/[org]` for the organization (projects, `members`, `library`, `settings`) and `/o/[org]/p/[project]/` for a project (the overview at its root, then `data`, `sites`, `forms`, `team`, `qgis`, `reports`, `settings`). The fixtures use `/o/deca/p/play-study/`. The old routes then redirect to their new homes and keep the query string.

Filters and the selected record live in the URL, so a filtered view can be sent to a colleague, opened in a second tab, and undone with the back button.

## Design rules this application keeps

- **Day by default, Dusk by choice.** Every screen works in both. Map canvases keep their own palette (Day, Night) from [`contracts/map-palettes.json`](../contracts/map-palettes.json), the one the collector uses, so a manager sees the plan the observer saw.
- **Map colours stay on the map.** Zones and observations take the palette's colours, and UI state colours never appear on a plan.
- **State is a glyph plus a word plus a colour**, in that order, so the colour is never load-bearing. The vocabulary is the `states` block of `contracts/contour.json`, shared with the collector, and nothing invents a state beside it. It replaces [`src/lib/states.ts`](src/lib/states.ts), which WEB-26 removes.
- **One magenta action per screen.** Ink is for the strong second action and outline for the rest. Selection, focus and navigation use ink.
- **Mono for anything someone might read aloud.** IDs, versions, codes and counts are Spline Sans Mono; words are Geologica. Labels wrap and never truncate, and text follows the browser zoom.
- **Motion conveys state, never decoration.** Durations come from the tokens. No shimmer and no hover lift, and every movement has a reduced-motion fallback.
- **Nothing tappable goes below 44 px**, focus is a visible ink ring, and keyboard and screen readers are first-class.
- **Copy says where the work is and what to do next.** Buttons are a verb and an object, in sentence case. Errors say what happened, what is safe and what to do. No "Oops", no exclamation marks, no "successfully", no blame.

Primitives live in `src/components/contour/`, with the same names as the collector's `mobile/src/ui/`. When one side gains a primitive, give the other the same one. `/dev/contour` (dev and preview builds only) shows every primitive in Day and Dusk. Screens not yet moved still use the previous chrome in `src/components/nocturne/`, which WEB-26 retires along with `src/data/` and Leaflet.

## Public policy pages

`/privacy` and `/privacy/delete-data` are the privacy policy and data deletion pages for the native collector, for its Google Play listing. They live in `src/app/(legal)/`, carry their own stylesheet because they follow the visitor's light or dark system setting, and are prerendered as static pages. Every statement was checked against the mobile, backend and database code; update the pages before the app collects anything new.

Facts only the operator can supply live in `src/app/(legal)/policy.ts`: the operator (DECA Lab at Cornell University, led by Professor Janet Loebach), the privacy contact, and the developer. The server host, retention periods and deletion time are marked "Assumed" there and need confirming with the lab. Any field set back to `null` brings back a visible draft notice and an inline "to be confirmed" marker.

## Run locally

```bash
pnpm install
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000). The fixture workspace needs no account. The account and onboarding routes require Supabase sign-in. The default map base is bundled vector geometry.

## Connect it to the API

Base map upload calls the API directly from the browser. Account data calls the API only from the server.

```bash
cp .env.example .env.local   # then edit if your API is not on 127.0.0.1:8000
```

| Variable | Value |
| --- | --- |
| `NEXT_PUBLIC_FIELDMAPS_API_URL` | The API's origin, no trailing slash — `http://127.0.0.1:8000` locally, `https://api.example.org` deployed |
| `NEXT_PUBLIC_FIELDMAPS_PROJECT_ID` | The project UUID the base map screen uploads packages to. Unset, it falls back to the fixture `PROJECT.id`, which is not a UUID and the API will refuse — WEB-01's quick fix, superseded by WEB-08 taking the project from the route. |

`NEXT_PUBLIC_` variables are compiled into the browser bundle, so this one is public by construction. Never put a token or key beside it. Next.js reads `.env.local` at build time, so restart `pnpm dev` after changing it; on Vercel, set it in **Project → Settings → Environment Variables** and redeploy, since a running deployment will not pick it up.

Leave it unset and the screen says so: it assembles the package and downloads the submission rather than pretending to upload it.

The API must also name this origin. Browsers preflight a cross-origin request that carries an `Authorization` header, and the API allows no origin by default, so add the web origin to `browser_origins` in `backend/config.local.json` — see [the API README](../backend/README.md). Miss that step and the upload fails in the browser's network layer before the API is reached. Vercel preview deployments get a new hostname per branch, so those are covered by `browser_origin_pattern` rather than listed.

Two things this cannot fix on its own. A page served over HTTPS may not call an API on `http://127.0.0.1`, so the deployed site needs a deployed API over HTTPS — pointing it at a laptop will not work. And uploading still needs a manager's token, below.

Uploading needs an access token for an account with the **manager** role on the project. The fixture upload screen still has a pasted-token stopgap, marked as such; WEB-06 will connect its account menu and remove that field.

Quality checks:

`pnpm api:types` regenerates declarations from `../contracts/openapi.json`. Package checks use those types; error responses use `src/lib/api/errors.ts` for validated codes and local user copy. Run `pnpm test:api-errors` for malformed-response and error-code coverage. Regenerate the backend and both apps together with root `pnpm contracts:generate`.

```bash
pnpm check   # typecheck and lint
pnpm build
```

From the repository root, `pnpm tokens:check` confirms that `src/styles/contour.css` matches the contract and that every declared colour pair meets its contrast minimum in Day and Dusk.

## Authentication and server API

Set these process or deployment settings before starting the app:

| Setting | Purpose |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase Auth origin, local `http://127.0.0.1:54321` |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Public publishable key (local legacy anon key also supported), never a service-role key |
| `FIELDMAPS_API_URL` | Server-only API origin, normally local `http://127.0.0.1:8000` |

`/sign-up`, `/verify`, `/sign-in`, `/forgot-password`, and `/reset-password` use Server Actions and six-digit email codes. The local confirmation/recovery email templates must contain `{{ .Token }}`; read the codes in Mailpit at `http://127.0.0.1:54324`. Pending email addresses live in short-lived httpOnly cookies, never URLs. Resends enforce a 60-second cooldown in the action as well as the UI. Supabase remains the rate-limit authority. If a recovery code succeeds but the new password is rejected, retries reuse that verified recovery session. A short-lived httpOnly workflow marker must match the current Supabase-verified user, session ID and pending email; it is cleared when a new recovery starts, the password changes, or the user signs out.

The proxy refreshes cookies and protects `/o`, `/onboarding`, and `/account`; server components and the API client independently verify claims. `/o` currently opens `/account`, which shows a live profile and membership counts and an account menu with sign-out. Onboarding remains an explicitly labelled preview until WEB-06. Sign-in uses a validated same-origin `next` path or `/onboarding`; last-project selection arrives with the organization/project routes.

`src/lib/api/client.ts` is server-only, uses generated endpoint types, validates identity data, attaches the verified session's access token, disables caching, and imposes a 15-second timeout. Future tenant mutations must call it from authenticated Server Actions. Large package uploads intentionally remain browser-to-API to avoid proxy body-size limits, so the existing public API origin and CORS settings are retained until that consumer changes.

The service worker only caches the public landing page, icons, and static build assets. It never stores auth pages, account/tenant pages, API results, query strings, or RSC requests. This is the auth safety subset of WEB-02, not completion of its build-id/manifest/indexing work.

Run `pnpm test:auth` for redirect, response-validation and private-cache regressions, then `pnpm check` and `pnpm build`. With a dev server on port 3002 connected to the local Auth/API stack, run `FIELDMAPS_AUTH_LOCAL_TEST=1 pnpm test:auth:local` for real signup, verification, recovery and changed-password sign-in through Server Actions. This opt-in test creates a synthetic local account and reads its codes from local Mailpit; it never targets hosted services.

## Technical shape

- Next.js 16 App Router, React 19, TypeScript
- Tailwind v4, with the generated Contour tokens mapped in `@theme inline` so the utilities _are_ the design system
- Geologica and Spline Sans Mono, self-hosted through `next/font`, so chrome never waits on a network
- Lucide icons (`lucide-react`)
- React Leaflet, rendered browser-side only, over bundled GeoJSON or street tiles, until WEB-26 replaces it with an SVG site plan
- Client-side CSV, GeoJSON and codebook generation
- Progressive Web App manifest and a same-origin offline shell cache

## What this application deliberately does not do

- **Collect observations.** The collector does that, on a device, offline. A browser form beside it would be a second way to enter the same record and a second thing to keep in step.
- **Draw zones or create sites.** Zones come from the QGIS project a base map package is prepared from; the upload screen carries the exported `zones` layer to the server, which derives the boxes. A second authority beside QGIS would drift from it. The designed zone editor is PROPOSAL U2: its edits are preview state for this browser session and reach no server.
- **Edit or publish the instrument.** The API now accepts any seeded form version and validates answers against its stored definition, and `form_versions` rows are already immutable, so what publishing still needs is an editor here and a typed GIS view over the answers. Until those exist, this reads the instrument and shows what is blocking its first version. The designed draft editor and publication review preview that flow; publishing there changes only this browser session.
- **Deliver a package to a device.** A prepared package is stored, versioned and downloadable from the API, but the collector still reads its bundled geometry. The hosted package provider on the device, with the download and cellular policy that belong to it, is the next piece.
- **Claim a sync path of its own.** QGIS reads the live database; exports are for analysis, backup and interoperability, and say so.
