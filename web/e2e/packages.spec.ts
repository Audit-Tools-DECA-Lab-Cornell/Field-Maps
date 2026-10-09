import { fileURLToPath } from "node:url";

import { expect, type Page, test } from "@playwright/test";

import { currentPackageVersion, listPackages } from "./support/api";
import { authFile } from "./support/auth";
import { projectPath, SEED } from "./support/manifest";

/** Plan step 4: a new map package goes from QGIS layers to the current package. */

test.use({ storageState: authFile("manager") });

/** The Fall Creek layers the seed uploads too (the zones layer carries `properties.id`). */
const LAYERS_DIR = fileURLToPath(new URL("../../qgis/fall-creek/upload-sample/", import.meta.url));
const LAYERS = ["ground", "zones", "trees"].map(layer => ({ layer, file: `${LAYERS_DIR}${layer}.geojson` }));

async function chooseLayers(page: Page) {
	// One picker for every file of the QGIS export, or one per layer.
	const many = page.locator('input[type="file"][multiple]');
	if ((await many.count()) > 0) {
		await many.first().setInputFiles(LAYERS.map(item => item.file));
		return;
	}
	for (const { layer, file } of LAYERS) {
		await page
			.getByLabel(new RegExp(layer, "i"))
			.and(page.locator('input[type="file"]'))
			.first()
			.setInputFiles(file);
	}
}

test("uploading a new package from QGIS layers makes it the current one", async ({ page }) => {
	test.setTimeout(120_000);
	const site = SEED.sites.fallCreek;
	const before = await listPackages(site);
	const next = Math.max(0, ...before.map(item => item.version)) + 1;

	await page.goto(projectPath(`sites/${site}`));
	await page.getByRole("link", { name: "Upload a new version", exact: true }).click();
	await expect(page).toHaveURL(/\/packages\?(.*&)?step=upload/);

	await chooseLayers(page);
	await page.getByRole("button", { name: /^upload/i }).click();

	await expect.poll(() => currentPackageVersion(site), { timeout: 60_000 }).toBe(next);
	const versionWords = new RegExp(`\\b(v|version\\s+)${next}\\b`, "i");
	await expect(page.getByRole("main").getByText(versionWords).first()).toBeVisible({ timeout: 30_000 });

	// The history marks the new version Active (the newest ready package is current).
	await page.goto(projectPath(`sites/${site}/packages`));
	const row = page.getByRole("main").locator('tr, li, [role="row"]').filter({ hasText: versionWords }).first();
	await expect(row).toContainText("Active");
});
