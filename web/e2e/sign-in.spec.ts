import { expect, test } from "@playwright/test";

import { authFile, signIn } from "./support/auth";
import { orgPath, person, projectPath, SEED } from "./support/manifest";

/** Plan step 1, and where each kind of account lands from `/o`. */

test.describe("signing in", () => {
	test.use({ storageState: { cookies: [], origins: [] } });

	test("a manager signs in, lands on their project and sees their own name, email and initials", async ({ page }) => {
		const me = person("manager");
		await signIn(page, "manager");
		await expect(page).toHaveURL(url => url.pathname === projectPath());

		const account = page.getByRole("button", { name: /^Account, / });
		await expect(account).toHaveAccessibleName(`Account, ${me.name}`);
		await expect(account).toContainText(me.initials);

		await account.click();
		const menu = page.getByRole("menu");
		await expect(menu).toContainText(me.name);
		await expect(menu).toContainText(me.email);
		await expect(menu).toContainText(me.initials);
	});

	test("a signed-out visit to the workspace asks for sign-in and keeps the destination", async ({ page }) => {
		await page.goto(projectPath("data"));
		await expect(page).toHaveURL(url => url.pathname === "/sign-in");
		expect(new URL(page.url()).searchParams.get("next")).toBe(projectPath("data"));
	});
});

test.describe("where the workspace opens", () => {
	test.describe("a manager", () => {
		test.use({ storageState: authFile("manager") });

		test("opening FieldMaps goes to the only project", async ({ page }) => {
			await page.goto("/o");
			await expect(page).toHaveURL(url => url.pathname === projectPath());
		});

		test("the home page sends a signed-in person to their workspace", async ({ page }) => {
			await page.goto("/");
			await expect(page).toHaveURL(url => url.pathname === projectPath());
		});
	});

	test.describe("an observer", () => {
		test.use({ storageState: authFile("observer") });

		test("goes to the collect page, which names their project", async ({ page }) => {
			await page.goto("/o");
			await expect(page).toHaveURL(url => url.pathname === orgPath("collect"));
			await expect(page.getByRole("main")).toContainText(SEED.projectName);
		});
	});

	test.describe("someone in no project", () => {
		test.use({ storageState: authFile("outsider") });

		test("is told so and offered the join code", async ({ page }) => {
			await page.goto("/o");
			await expect(page.getByRole("main")).toContainText("You are not in a project yet");
			await expect(page.getByRole("link", { name: "Enter a join code" })).toHaveAttribute("href", "/join");
		});
	});
});
