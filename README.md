# FieldMaps

Custom offline field collection for research teams: a native collector, a web management application, an authenticated API, and a shared spatial database readable in QGIS.

This is one Git repository with independently managed components. The root owns product documentation and development commands; each application owns its dependencies, lockfile, and runtime. FieldMaps remains independent of Playspace, COPA, and YEE.

## Product layout

```text
field-maps/
├── web/          Next.js management application, source, public assets, and build config
├── mobile/       Expo / React Native collector with SQLite and MapLibre
├── backend/      FastAPI authentication and observation API
├── contracts/    Shared JSON schemas, form definitions and validation cases
├── database/     Local Supabase tooling, SQL tests and hosted verification
├── supabase/     Canonical schema migrations, local Supabase configuration and seeds
├── qgis/         Read-only live project, connection settings, and launcher
├── docs/         Requirements, architecture, research, and implementation scope
├── designs/      Design references
├── package.json  Product command aliases; no application dependencies
└── Makefile      Python, Docker, and database orchestration
```

## Start working

Use Node 24 (`nvm use`), pnpm 10.17.1, and Docker Desktop for API/database work. Python development uses uv and Python 3.13 or newer.

```sh
pnpm setup:apps
pnpm backend:setup
pnpm dev
```

`pnpm dev` opens the web development server at http://localhost:3000. Root `pnpm install` only installs the dependency-free command package; use `pnpm setup:apps` to install web and mobile dependencies.

| Root command                                  | What it does                                                        |
| --------------------------------------------- | ------------------------------------------------------------------- |
| `pnpm dev` / `pnpm build` / `pnpm start`      | Web development / production build / production server              |
| `pnpm mobile:simulator`                       | Metro for the existing iOS simulator development build              |
| `pnpm mobile:ios` / `pnpm mobile:android`     | Build and run the native development app                            |
| `pnpm api:hosted:up` / `pnpm api:hosted:stop` | Start/stop the local API connected to hosted Supabase               |
| `pnpm check`                                  | Web and mobile type/lint checks, then Python Ruff/BasedPyright      |
| `pnpm test`                                   | Mobile tests, local API integration tests, and local SQL assertions |

Run `pnpm run help` for the command overview. Integration tests need the local databases started with `pnpm db:start`; they do not run against Supabase. The hosted API needs the already provisioned local credential volume. See [workspace operations](docs/Workspace.md) for prerequisites, individual checks, and deployment instructions.

## Current functionality

Web sign-up, six-digit email verification, sign-in, password recovery and sign-out work against local Supabase Auth. The protected account page reads the caller's real profile and memberships from the API. The organization and project pages (sites, map packages, forms, data, team and settings) read and write the API, and organizations are created by `scripts/bootstrap-study.mjs` (D30). Mobile now has separate public build configurations and a caller-scoped offline profile/project cache; its legacy SQLite record ownership remains fixed while uploads use the configured destination. The API supports repeatable account deletion with ownership protection and durable pending state, verified locally with mocked Auth Admin HTTP. Hosted deletion requires its runtime administrative credential and separate acceptance.

The mobile collector saves georeferenced observations to SQLite and automatically uploads while the app is active. Native sign-in and two real test uploads have been exercised; the user tested offline save/reconnect, and both records were independently verified in hosted PostGIS and QGIS Desktop. The API still runs on the development computer. This is not a production deployment.

The collector has been rebuilt to the [Riverside Collector design](designs/Riverside%20Collector%20v2.dc.html): an armed place-a-point map mode, one question per screen against a reusable versioned form engine, drafts that survive a force quit, and the Nocturne dark interface. The practice `shell-v1` form and its records are unchanged and still upload. A joined project's own sites now download from the API with the forms its managers published, and their records upload with their zone and round (D27); records made on the bundled sample sites stay on the device. The observer can show their own location on the map, display only (D28). This redesign is verified by types, tests and bundling only; it has not yet run on a device. See the [mobile collector](mobile/README.md) for what is deliberately left open.

The web application is the management side of the same product, on the Contour design system and the real database vocabulary, and it runs entirely on live data (D30): an overview of what the field returned, data review over a table and a site plan, sites and map packages (uploaded from QGIS layers and checked by the server, as immutable versions), forms and their versions (draft, publish, retire), the team and invitations, reports, exports for QGIS, and organization and project settings, behind a public home page. No page reads fixtures. A feature with no backend says "X is not available yet.": saved named views, the rounds plan, the zone editor, reviewing or excluding records, device readiness, live QGIS database access, deleting things and resending invitations. Observation lists hold the newest 500, and anything counted from them says so. Attachments, bidirectional edits, and closed-app background synchronization remain future work; the API now resolves a site and form version from the database and validates answers against the form's definition, so a second instrument is a seeded form version rather than a code change. A typed GIS view over its answers is still owed.

Both apps are moving from Nocturne to **Contour**, a light design system with Day as the default and Dusk as a preference (D19). The web is on it already (WEB-20 to WEB-27); MOB-23 to MOB-27 rebuild every collector screen on it. [DESIGN.md](DESIGN.md) describes the system, and [PRODUCT.md](PRODUCT.md) the people it serves, the honesty rules and the voice.

Next implementation scope: publishing [Janet's versioned test form](docs/Janet-Test-Form-Scope.md) — dual acceptance in the API, an immutable server form version, and a typed GIS view — once its open protocol decisions are settled. The first test form excludes all 16 hidden spreadsheet rows, as confirmed by the user.

## Component documentation

- [Web management application](web/README.md) and [mobile collector](mobile/README.md)
- [Backend API](backend/README.md), [local spatial database](database/README.md), and [hosted Supabase setup](docs/Supabase-Setup.md)
- [QGIS project and connection](qgis/README.md) and [testing on a real QGIS base map](docs/QGIS-Base-Map-Testing.md)
- [Launch runbook](docs/Launch-Runbook.md): putting the hosted database, API, web app and collector in front of Janet
- [Production architecture](docs/Production-Architecture-Recommendation.md) and [QGIS feasibility research](docs/QGIS-Field-Collection-Feasibility.md)
- [Design brief](docs/Claude-Design-Brief.md) and [workspace management](docs/Workspace.md)
