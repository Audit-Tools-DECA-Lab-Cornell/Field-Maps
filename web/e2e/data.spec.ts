import { expect, test } from "@playwright/test";

import { authFile } from "./support/auth";
import { manifest, projectPath, SEED } from "./support/manifest";
import { chooseFilter, csvLines, downloadText, recordRows } from "./support/ui";

/** Plan step 7: filter the data, open a record, export CSV. */

test.use({ storageState: authFile("manager") });

test("the data lists every seeded record and the round filter narrows it", async ({ page }) => {
	const { baseline } = manifest();
	await page.goto(projectPath("data"));
	const main = page.getByRole("main");
	await expect(await recordRows(main)).toHaveCount(baseline.total);

	await chooseFilter(main, /round/i, /reliability/i);
	await expect(page).toHaveURL(/reliability/);
	await expect(await recordRows(main)).toHaveCount(baseline.reliability);
});

test("opening a record shows its answers labelled from its form", async ({ page }) => {
	const { observations } = manifest();
	await page.goto(projectPath("data"));
	const rows = await recordRows(page.getByRole("main"));
	await rows.first().getByRole("link").first().click();
	await expect(page).toHaveURL(url => observations.some(id => url.pathname === projectPath(`data/${id}`)));

	const main = page.getByRole("main");
	await expect(main).toContainText(SEED.question.label);
	await expect(main).toContainText(SEED.question.answerPrefix);
	await expect(main).toContainText(SEED.form.published);
	await expect(main).toContainText(/OBS-[0-9A-F]{6}/);
});

test("exporting CSV downloads every record in view with its columns", async ({ page }) => {
	const { baseline, observations } = manifest();
	await page.goto(projectPath("data"));
	await page.getByRole("button", { name: "Export", exact: true }).first().click();
	const dialog = page.getByRole("dialog");
	const csvChoice = dialog.getByRole("radio", { name: /csv/i });
	if ((await csvChoice.count()) > 0) await csvChoice.first().check();

	const { name, text } = await downloadText(page, () =>
		dialog
			.getByRole("button", { name: /(download|export)/i })
			.last()
			.click()
	);
	expect(name).toMatch(/\.csv$/);
	const [header, ...rows] = csvLines(text);
	const columns = header.split(",");
	for (const column of ["observation_id", "label", "site_code", "zone", "round_type", "observer", "observed_at"]) {
		expect(columns, `the CSV has ${column}`).toContain(column);
	}
	expect(rows).toHaveLength(baseline.total);
	const ids = new Set(rows.map(row => row.split(",")[columns.indexOf("observation_id")]));
	expect([...ids].sort()).toEqual([...observations].sort());
});
