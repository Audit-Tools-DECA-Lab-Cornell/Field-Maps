# AGENTS.md — DECA Mark product workspace

DECA Mark is one Git repository with independently managed applications. It is separate from Playspace, COPA, YEE, and their backend.

## Routing

| Folder              | Responsibility                                                            |
| ------------------- | ------------------------------------------------------------------------- |
| `web/`              | Next.js App Router management application; read its local AGENTS.md       |
| `mobile/`           | Expo / React Native offline collector and account-scoped SQLite queue     |
| `backend/`          | FastAPI authentication and observation API                                |
| `contracts/`        | Shared JSON schemas, canonical form definitions and cross-language cases; read its README |
| `database/`         | Local Supabase tooling, SQL/API tests, and hosted verification           |
| `supabase/`         | Canonical schema migrations, local Supabase configuration and seeds               |
| `qgis/`             | Scoped read-only live project and public connection configuration         |
| `docs/`, `designs/` | Product requirements, architecture, operational guides, design references |

**Production plan:** start at `docs/plan/README.md`, which is the index, conventions and phase board. Each component's `PLAN.md` holds that component's tasks: `supabase/`, `backend/`, `mobile/`, `web/` and `qgis/`. Tasks are identified by ID. A task's status lives only in its owning file. Run `pnpm plan:check` after editing any plan file.

Read the owning component's README before changing it. Root `README.md` and `docs/Workspace.md` describe common operations. Every web screen reads and writes the real Auth and API data; the web has no sample data (D30). Native mobile uploads have been verified through hosted PostGIS into QGIS. Web and mobile share one design system, Contour: Day is the default theme and Dusk a preference. Its tokens live only in `contracts/contour.json`. `pnpm tokens` generates `web/src/styles/contour.css` from it (checked in, never edited by hand), and the collector reads it in `mobile/src/ui/tokens.ts`. Change a token in the contract, never in one app, then run `pnpm tokens:check`, which fails on drift and on WCAG contrast (4.5:1 text, 3:1 UI, both themes). Read `DESIGN.md` for how it looks and `PRODUCT.md` for who it serves, what it must never claim and how it speaks, before any UI change. Map canvases take their colours from `contracts/map-palettes.json` (Day, the default, and Night), which both apps read; UI state colours never appear on a map.

## Commands and boundaries

- Use Node 24 and pnpm 10.17.1. Each app retains its own dependencies and lockfile; do not merge or hoist them at the product root.
- `pnpm dev` / `pnpm build` target web; `pnpm mobile:simulator` starts Metro.
- `pnpm check` runs web/mobile type and lint checks plus Python checks.
- `pnpm db:start` starts the local Supabase test infrastructure; `pnpm test` runs mobile/API/SQL suites. Tests never target hosted Supabase.
- `pnpm api:hosted:up` starts the local API against Supabase. Local and hosted API configurations share port 8000; do not run both.

## Hard rules

- Never read, print, inspect, or manipulate `.env` / `.env.*` / secret files unless the user names a specific file in the current request.
- Never commit, push, branch, or amend without explicit user approval.
- Preserve unrelated changes. Keep hosted migrations/deployments explicit; no resets or volume deletion in ordinary setup/check commands.
- Keep product facts in the owning docs. Do not fabricate production, device, or background-sync verification.
- Use installed skills by name when relevant; ArcGIS library skills do not imply that this product must adopt ArcGIS services.
