# AGENTS.md — field-ops

Early-stage Next.js prototype ("FieldOps Parcel Editor"), independent of the
Audit Tools / Playspace / YEE products. Not yet connected to the shared backend.

## Stack

- Next.js (App Router), pnpm
- 35 `arcgis-*` library skills installed under `.claude/skills/` and
  `.agents/skills/` (framework know-how — mirrors the pattern used elsewhere in
  this workspace: reference them by name, don't restate their content here)

## Commands

```bash
pnpm dev
pnpm build
pnpm lint        # eslint
pnpm lint:fix
pnpm format      # lint:fix + prettier --write
pnpm format:check
```

## Hard rules (full text in workspace-root `AGENTS.md`)

- Never read/print/work around `.env` / `.env.*` / secret files unless the user
  names a specific file in the current request.
- Never commit, push, branch, or amend without explicit user approval.

## Status

No memory system, no role agents yet — this is the thinnest-scaffolded area of
the workspace (35 skills but no facts/routing layer to go with them). Add
`.claude/memory/` here once the codebase has established conventions worth
recording; don't fabricate facts ahead of the code.
