# Live web workspace: handoff

Work in progress on branch `pratyush-cc/bold-darwin-9vz8fz`, PR
[Audit-Tools-DECA-Lab-Cornell/Field-Maps#20](https://github.com/Audit-Tools-DECA-Lab-Cornell/Field-Maps/pull/20).
Delete this folder when the work merges.

## Files here

| File | What it is |
| --- | --- |
| `plan.md` | The owner-approved plan (decisions, screens, not-available list, verification) |
| `spec.md` | Build spec shared by every agent: ground rules, copy rules, API facts, BE-17 additions, file ownership per work package (WP) |
| `notes/wp0a-data-layer.md` | Exact exports of the data layer (`lib/api/*`, `lib/workspace/*`, time, labels, answers, summary, export, archive) |
| `notes/wp0b-shell.md` | What the shell does now and its open issues (WorkspaceProvider, layouts, LoadFailure, NotAvailable, `features/people`) |
| `notes/wp8-brand.md` | Purple brand mark on mobile, DESIGN.md and D29 |
| `notes/e2e.md` | How to run the local stack and the Playwright harness |
| `notes/ux-checklist.md` | Contour primitive catalogue and UX/copy checklist for the screens |
| `progress/WP0B.md`, `progress/WP9.md` | Progress logs of the shell and E2E agents |

## Status

Done and committed:
- WP0A data layer, 84 unit tests.
- WP8 purple mark on mobile, plus D29.
- WP0B shell: real identity, purple web mark, `/o` resolver, set-up removed, legacy components deleted, shared components.

Partly done:
- WP9 E2E harness: the scripts and specs exist, and a sign-in run and an honesty scan ran once against the old screens. The final run was cut off.

Shell integration review (2026-10-09): typecheck, lint, format:check, test:unit 84/84, test:auth 33/33,
test:api-errors 31/31, test:account 12/12 and `pnpm --dir web build` all pass. On the local stack the sign-in
spec passes 13 of 14: a fresh manager sign-in now lands on the project. The earlier `/account` landing came
from the half-finished shell during that run. The one failure is the old collect page (WP7).

Not started:
- **WP1–WP7 screens:**
  - WP1 sites and packages
  - WP2 forms
  - WP3 data and observation detail
  - WP4 overview, reports and QGIS
  - WP5 team and settings
  - WP6 org pages
  - WP7 invite, join, home page, collect and auth
- **WP10 cleanup and docs:**
  - remove the PreviewProvider shim, `web/src/fixtures`, `web/src/data` and `lib/preview.ts`;
  - add a lint guard against them;
  - remove leaflet;
  - update docs (D30, `web/AGENTS.md`, `web/PLAN.md`, sitemap, runbook).
- **Adversarial review, full E2E, screenshots.**

Known issues found so far:
- The project screens still read sample data inside the real project. The overview of the seeded project shows "This page is not on the map", because the old page looks up sample slugs.
- `/o/web-acceptance/collect` still shows the old sample page (WP7).
- The local API allows browser origins on port 3000 only, so the harness runs the web app on `127.0.0.1:3000`.
- Switchers no longer offer "Create project"; WP6 adds it to the org projects page.
- **Open Codex findings on PR #20.** Fix these with the screens, and reply on each thread when fixed. Merging before then is unsafe.
  - P1 (`app/(app)/layout.tsx`): the sample-data disclosure (PreviewFooter and PreviewMarker) was removed while screens still show sample data. Fix: rewrite the screens on live data.
  - P1 (`app/(app)/o/page.tsx`): `/o` sends members to real org and project addresses that the sample pages 404 on. Fix: rewrite the screens on live data.
  - P2 (`p/[project]/layout.tsx`): a viewer who opens `/team` or `/settings` directly gets manager screens. The PreviewProvider shim treats everyone as a manager. Fix: check `projectAbilities(role).manage` in the team and settings pages and render the no-access state.

## Next steps, in order

1. **Shell integration review** (spec: "Integrate shell"). Run typecheck, lint, unit, auth and build. Hunt the edge cases listed in `notes/wp0b-shell.md`.
2. **WP1–WP7 in parallel.** Each touches only the files the spec gives it. No `next build` while they run.
3. **Integrate the screens:** typecheck, lint, format, every test script, `pnpm --dir web build`.
4. **WP10 cleanup and docs.**
5. **Review loop:** bugs, honesty, copy and UX. Use DESIGN.md and `anthropic-skills:ui-ux-pro-max`, with one primary action per screen, 390 px layouts, axe clean.
6. **Full E2E on the local stack** (`notes/e2e.md`), with screenshots at 1440/1024/768/390.
7. **PR:** commit and push to #20, then drive CI and reviews to green.
