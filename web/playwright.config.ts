import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { defineConfig } from "@playwright/test";

/**
 * Browser acceptance against the LOCAL stack only: local Supabase Auth, the API on 127.0.0.1:8001 and this
 * app under `next dev` (or a production build with `--prod`). `scripts/e2e-local.sh` starts all of it, seeds
 * the workspace with `database/seed-web-workspace.mjs` and then runs `pnpm --dir web test:e2e`.
 *
 * The web app runs on :3000 by default because that is the only browser origin the local API allows
 * (`browser_origins` in backend/config.auth-local.json); map package uploads go from the browser to the
 * API directly, so any other port would fail them.
 */
const baseURL = process.env.E2E_BASE_URL ?? "http://127.0.0.1:3000";
const base = new URL(baseURL);
if (base.protocol !== "http:" || !["127.0.0.1", "localhost", "[::1]"].includes(base.hostname)) {
	throw new Error(`E2E_BASE_URL must be an http:// loopback address; refusing ${base.origin}.`);
}

/** The Chromium that ships in this environment (Playwright 1.56.1 is pinned; never `playwright install`). */
const PINNED_CHROMIUM = "/opt/pw-browsers/chromium";
const executablePath = process.env.E2E_CHROMIUM ?? (existsSync(PINNED_CHROMIUM) ? PINNED_CHROMIUM : undefined);

/**
 * The HTML report bundles the trace viewer's JavaScript, which `pnpm lint` would read inside web/, so it
 * goes to the local stack's gitignored state folder unless E2E_REPORT_DIR says otherwise.
 */
const reportDir =
	process.env.E2E_REPORT_DIR ?? fileURLToPath(new URL("../database/.local/e2e/playwright-report", import.meta.url));

/** `next dev` compiles each page on its first request, so pages get longer to arrive than a build needs. */
const dev = process.env.E2E_WEB_MODE === "dev";

const desktop = { width: 1440, height: 900 };
const phone = { width: 390, height: 844 };

export default defineConfig({
	testDir: "./e2e",
	outputDir: "./test-results",
	// Specs share seeded accounts and memberships, so they run one at a time unless asked otherwise.
	fullyParallel: false,
	workers: Number(process.env.E2E_WORKERS ?? 1),
	retries: 0,
	forbidOnly: Boolean(process.env.CI),
	timeout: dev ? 120_000 : 60_000,
	expect: { timeout: dev ? 20_000 : 10_000 },
	reporter: [["list"], ["html", { open: "never", outputFolder: reportDir }]],
	globalSetup: "./e2e/global-setup.ts",
	use: {
		baseURL: base.origin,
		locale: "en-US",
		timezoneId: "America/New_York",
		// The honesty scan saves its own full-page screenshots of every route under e2e/screenshots/.
		screenshot: "only-on-failure",
		trace: "retain-on-failure",
		video: "off",
		actionTimeout: 15_000,
		navigationTimeout: dev ? 90_000 : 45_000,
		acceptDownloads: true,
		launchOptions: executablePath ? { executablePath } : {}
	},
	projects: [
		{ name: "setup", testMatch: /auth\.setup\.ts$/, use: { viewport: desktop } },
		{
			name: "desktop-1440",
			testMatch: /\.spec\.ts$/,
			dependencies: ["setup"],
			use: { viewport: desktop },
			metadata: { axe: true }
		},
		{
			name: "phone-390",
			testMatch: /\.spec\.ts$/,
			dependencies: ["setup"],
			use: { viewport: phone, deviceScaleFactor: 2, isMobile: true, hasTouch: true },
			metadata: { axe: true }
		},
		// Screenshots for review at the in-between widths: the honesty scan only, without axe.
		{
			name: "tablet-1024",
			testMatch: /honesty\.spec\.ts$/,
			dependencies: ["setup"],
			use: { viewport: { width: 1024, height: 768 } },
			metadata: { axe: false }
		},
		{
			name: "tablet-768",
			testMatch: /honesty\.spec\.ts$/,
			dependencies: ["setup"],
			use: { viewport: { width: 768, height: 1024 } },
			metadata: { axe: false }
		}
	]
});
