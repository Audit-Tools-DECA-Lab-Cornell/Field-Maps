import { mkdirSync } from "node:fs";
import { dirname } from "node:path";

import { test as setup } from "@playwright/test";

import { authFile, savedSessionLife, signIn } from "./support/auth";
import { ROLES } from "./support/manifest";

/**
 * Signs each seeded account in once, through the real sign-in form, and keeps the browser state for the
 * specs. Local Auth allows 30 sign-ins per 5 minutes, so a saved sign-in with at least 20 minutes left is
 * reused instead of signing in again (sign-ins last an hour).
 */
const REUSE_SECONDS = 20 * 60;

for (const role of ROLES) {
	setup(`sign in as ${role}`, async ({ page }) => {
		const file = authFile(role);
		if (process.env.E2E_FRESH_SIGN_IN !== "1" && savedSessionLife(role) > REUSE_SECONDS) {
			setup.info().annotations.push({ type: "reused", description: `${role} is still signed in` });
			return;
		}
		await signIn(page, role, { landing: false });
		mkdirSync(dirname(file), { recursive: true });
		await page.context().storageState({ path: file });
	});
}
