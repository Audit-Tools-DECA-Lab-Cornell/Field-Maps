# FieldMaps web

Next.js App Router management application for FieldMaps. Parent `AGENTS.md` contains product routing and operating rules; this folder's `README.md` describes the sections and the design rules. Root `DESIGN.md` and `PRODUCT.md` hold the design system and the product voice.

- Run app commands from `web/`, or use the product-root `pnpm web:*` aliases.
- Dependencies and lockfile belong to this folder; do not hoist or merge with Expo dependencies.
- Source aliases map `@/*` to `web/src/*`. Checks: `pnpm check`, `pnpm build`. `pnpm format` applies only to this app.
- Deploy this folder as the web project root. Do not deploy or change hosted settings without authorization.

## Design

- This application and the collector share one design system, Contour. Its tokens live in `contracts/contour.json`. `pnpm tokens` (from the root) generates `src/styles/contour.css`, which `src/app/globals.css` maps to Tailwind utilities. Never edit the generated file: change the contract, run `pnpm tokens`, and keep `pnpm tokens:check` (drift and contrast) passing.
- Take every colour, type style, size, spacing, radius and duration from the tokens, through the generated CSS variables or the Tailwind utilities. Do not hard-code a hex, a font name or a pixel value the tokens already carry. Words are Geologica; IDs, versions, codes and counts are Spline Sans Mono. Icons are Lucide (`lucide-react`) plus the custom two-bar held glyph.
- Day is the default theme. Dusk is a preference, set from the account menu and kept in this browser. Every screen works in both. Map canvases are separate: they take a palette (Day, Night) from `contracts/map-palettes.json`, the same file the collector reads, and never a colour of their own. UI state colours never appear on a map.
- State is a glyph plus a word plus a colour, from the state vocabulary in `contracts/contour.json`. Do not invent a state beside it.
- One magenta action per screen. Ink is for the strong second action and outline for the rest. Selection, focus and navigation use ink.
- Primitives live in `src/components/contour/`, with the same names as the collector's `mobile/src/ui/`. Add a primitive to both apps together and show it in the `/dev/contour` gallery in Day and Dusk. New code does not import `@/data/*` or `src/components/nocturne/*`; both are retired in WEB-26.

## Honesty

- What is real: sign-in and the other auth flows (Supabase Server Actions), `/account` (the caller's API profile and memberships), and the map package upload. A signed-in user's organization at `/o/<slug>` reads the API wherever an endpoint exists and shows a designed "Not connected yet" state where none does; it never shows fixtures as the user's data (D24).
- What is sample: the sample workspace at `/o/deca` and every screen without an endpoint read fixtures (`src/fixtures/`, and `src/data/` for screens not yet rebuilt). Fixture-backed pages say so with one quiet **Preview data** marker in the header and one footer line; the marker's popover reads: "Everything here is sample data. Nothing is read from or written to the FieldMaps database." Pages that show real data carry neither (D20, D24). Do not remove or soften the marker while a page reads fixtures.
- Do not add a control that does not do what its label says. Preview actions change session-only state: they take effect on screen, reset on reload, and never claim a server round trip. The real package upload says "Sends this package to the FieldMaps API." If a feature is not built, the screen states what is missing and why rather than pretending.
- Fixtures mirror `supabase/migrations/`. Do not introduce a domain concept the schema does not have. The proposal-only concepts (U2 zone editing, U3 web join and observer handoff, U4 form templates, U5 review and publication scope, U6 rounds, U7 reports and saved views) live in their own tagged fixture types, never in the schema-backed ones, and every screen that shows one carries its "PROPOSAL Ux" flag.
- The observation fixtures preview the workspace _after_ `janet-test-v1` is published; the database itself holds two `shell-v1` records. Keep the two numbers distinguishable wherever both appear, and never let a fixture assert a state the real system could not be in without saying it is a preview.
