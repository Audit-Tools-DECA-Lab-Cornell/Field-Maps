import { expect, test } from "@playwright/test";

import { authFile } from "./support/auth";
import { orgPath, person, SEED } from "./support/manifest";
import { orgTabs, tab } from "./support/ui";

/** Plan step 10: the organization's pages open for its owner, and only for those who may see them. */

test.describe("the owner", () => {
	test.use({ storageState: authFile("owner") });

	test("opens the organization's projects, members and settings", async ({ page }) => {
		await page.goto(orgPath());
		const main = page.getByRole("main");
		await expect(main.getByRole("link", { name: new RegExp(SEED.projectName) }).first()).toBeVisible();

		await tab(orgTabs(page), "Members").click();
		await expect(page).toHaveURL(url => url.pathname === orgPath("members"));
		await expect(main).toContainText(person("owner").name);
		await expect(main).toContainText(person("admin").name);

		await tab(orgTabs(page), "Settings").click();
		await expect(page).toHaveURL(url => url.pathname === orgPath("settings"));
		await expect(page.getByLabel(/^name/i).first()).toHaveValue(SEED.orgName);
	});
});

test.describe("a project manager who is not an owner or admin", () => {
	test.use({ storageState: authFile("manager") });

	test("sees the projects but no Members or Settings", async ({ page }) => {
		await page.goto(orgPath());
		await expect(tab(orgTabs(page), "Projects")).toBeVisible();
		await expect(tab(orgTabs(page), "Members")).toHaveCount(0);
		await expect(tab(orgTabs(page), "Settings")).toHaveCount(0);
	});
});

test.describe("the owner of another organization", () => {
	test.use({ storageState: authFile("other-owner") });

	test("cannot open this organization", async ({ page }) => {
		const response = await page.goto(orgPath());
		expect(response?.status()).toBe(404);
		await expect(page.getByRole("main")).not.toContainText(SEED.projectName);
	});
});
