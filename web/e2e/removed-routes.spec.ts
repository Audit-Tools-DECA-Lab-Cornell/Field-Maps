import { expect, test } from "@playwright/test";

import { authFile } from "./support/auth";
import { REMOVED_ROUTES } from "./support/routes";

/** Removed pages stay removed: each old address is a not-found page or sends the person on. */

test.use({ storageState: authFile("manager") });

for (const route of REMOVED_ROUTES) {
	test(`the ${route.name} page is gone`, async ({ page }) => {
		const path = route.path();
		const response = await page.goto(path);
		const landed = new URL(page.url()).pathname;
		expect(
			response?.status() === 404 || landed !== path,
			`${path} answered ${response?.status()} at ${landed}`
		).toBe(true);
		await expect(page.locator("body")).not.toContainText(/Play Study|DECA Lab|Proposal U\d/);
	});
}
