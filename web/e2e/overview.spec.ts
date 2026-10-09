import { expect, test } from "@playwright/test";

import { listSites } from "./support/api";
import { authFile } from "./support/auth";
import { manifest, projectPath } from "./support/manifest";
import { countPattern } from "./support/ui";

/** Plan step 2: the overview's totals are the seeded records, read live. */

test.use({ storageState: authFile("manager") });

test("the overview totals equal the seeded observations", async ({ page }) => {
	const { baseline } = manifest();
	// No spec adds observations, so the project total stays the seed's eight.
	const total = (await listSites()).reduce((sum, site) => sum + site.observation_count, 0);
	expect(total, "observations in the local project").toBe(baseline.total);

	await page.goto(projectPath());
	const main = page.getByRole("main");
	await expect(main).toContainText(countPattern(baseline.total, "observation"));
});

test("coverage counts the seeded rounds in Zone A", async ({ page }) => {
	const { baseline } = manifest();
	await page.goto(projectPath());
	const coverage = page.getByRole("region", { name: /coverage/i }).first();
	await expect(coverage).toBeVisible();
	await expect(coverage).toContainText(/Standard/i);
	await expect(coverage).toContainText(/Reliability/i);
	await expect(coverage).toContainText(/Inventory/i);
	// The zone's row reads its count for each round type, in the order of the column heads.
	const zoneRow = coverage
		.getByRole("row")
		.filter({ hasText: new RegExp(`\\b${baseline.zone}\\b`) })
		.first();
	await expect(zoneRow).toContainText(
		new RegExp(`\\b${baseline.standard}\\b[^\\d]*\\b${baseline.reliability}\\b[^\\d]*\\b${baseline.inventory}\\b`)
	);
});
