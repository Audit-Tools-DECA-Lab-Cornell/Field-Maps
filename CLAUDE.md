# FieldOps quick reference

Read `AGENTS.md` for component routing and operating rules, `README.md` for the product overview, and `docs/Workspace.md` for setup and checks.

The root is a product command package. Web lives in `web/`, mobile in `mobile/`, the API in `backend/`, and local spatial infrastructure in `database/`. Each app owns its dependencies and lockfile.

```sh
pnpm dev               # web
pnpm mobile:simulator  # Metro for iOS simulator
pnpm check             # web, mobile, and Python static checks
pnpm test              # mobile, local API, and local SQL tests
```

Use Node 24 and pnpm 10.17.1. Never inspect secret files or perform Git write operations without the authorization described in `AGENTS.md`.
