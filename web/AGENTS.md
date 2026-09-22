# FieldMaps web

Next.js App Router / React / Leaflet prototype. Parent `AGENTS.md` contains product routing and operating rules.

- Run app commands from `web/`, or use the product-root `pnpm web:*` aliases.
- Dependencies and lockfile belong to this folder; do not hoist or merge with Expo dependencies.
- Source aliases map `@/*` to `web/src/*`. Public URL paths are unchanged by the folder move.
- Checks: `pnpm check`, `pnpm build`. `pnpm format` applies only to this app.
- The web collector still uses simulated sync. The native mobile app has the authenticated upload implementation.
- Deploy this folder as the web project root. Do not deploy or change hosted settings without authorization.
