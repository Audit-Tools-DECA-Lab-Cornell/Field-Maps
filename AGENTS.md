# AGENTS.md — FieldOps product workspace

FieldOps is one Git repository with independently managed applications. It is separate from Playspace, COPA, YEE, and their backend.

## Routing

| Folder              | Responsibility                                                            |
| ------------------- | ------------------------------------------------------------------------- |
| `web/`              | Next.js App Router web prototype; read its local AGENTS.md                |
| `mobile/`           | Expo / React Native offline collector and account-scoped SQLite queue     |
| `backend/`          | FastAPI authentication and observation API                                |
| `database/`         | Local PostGIS, migrations, seeds, and SQL/API integration tests           |
| `supabase/`         | Hosted migrations and optional local Supabase configuration               |
| `qgis/`             | Scoped read-only live project and public connection configuration         |
| `docs/`, `designs/` | Product requirements, architecture, operational guides, design references |

Read the owning component's README before changing it. Root `README.md` and `docs/Workspace.md` describe common operations. The web prototype still uses simulated sync; native mobile uploads have been verified through hosted PostGIS into QGIS.

## Commands and boundaries

- Use Node 24 and pnpm 10.17.1. Each app retains its own dependencies and lockfile; do not merge or hoist them at the product root.
- `pnpm dev` / `pnpm build` target web; `pnpm mobile:simulator` starts Metro.
- `pnpm check` runs web/mobile type and lint checks plus Python checks.
- `pnpm db:up` starts the local test infrastructure; `pnpm test` runs mobile/API/SQL suites. Tests never target hosted Supabase.
- `pnpm api:hosted:up` starts the local API against Supabase. Local and hosted API configurations share port 8000; do not run both.

## Hard rules

- Never read, print, inspect, or manipulate `.env` / `.env.*` / secret files unless the user names a specific file in the current request.
- Never commit, push, branch, or amend without explicit user approval.
- Preserve unrelated changes. Keep hosted migrations/deployments explicit; no resets or volume deletion in ordinary setup/check commands.
- Keep product facts in the owning docs. Do not fabricate production, device, or background-sync verification.
- Use installed skills by name when relevant; ArcGIS library skills do not imply that this product must adopt ArcGIS services.
