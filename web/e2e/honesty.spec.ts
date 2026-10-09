import { test } from "@playwright/test";

import { authFile } from "./support/auth";
import type { Role } from "./support/manifest";
import { SCAN_ROUTES } from "./support/routes";
import { scanRoute } from "./support/scan";

/**
 * Plan step 13 and 14: every route, as the account that would open it, reads honestly (no sample
 * strings, no jargon, at most one primary action, no sideways scroll, axe clean in Day and Dusk), with
 * full-page screenshots at every project width.
 */
const SIGNED_OUT = { cookies: [], origins: [] };
const roles = [...new Set(SCAN_ROUTES.map(route => route.role))];

for (const role of roles) {
	test.describe(role ? `as ${role}` : "signed out", () => {
		test.use({ storageState: role ? authFile(role as Role) : SIGNED_OUT });

		for (const route of SCAN_ROUTES.filter(item => item.role === role)) {
			test(`${route.name} reads honestly`, async ({ page }, testInfo) => {
				test.setTimeout(120_000);
				const axe = testInfo.project.metadata.axe !== false;
				await scanRoute(page, testInfo, await route.path(), {
					name: route.name,
					axe,
					status: route.status,
					maxPrimary: route.maxPrimary,
					copyRules: route.copyRules,
					workspace: route.role !== null
				});
			});
		}
	});
}
