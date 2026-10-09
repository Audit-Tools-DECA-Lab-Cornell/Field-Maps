import { expect, test } from "@playwright/test";

import { createProjectInvitation, ensureNotProjectMember, revokeProjectInvitation } from "./support/api";
import { authFile } from "./support/auth";
import { projectPath, SEED } from "./support/manifest";
import { projectTabs, tab } from "./support/ui";

/**
 * Plan step 11: someone opens a viewer invitation link, joins, and reads the project without the
 * manager-only Team and Settings tabs. The outsider account is taken back out before and after.
 */

test.use({ storageState: authFile("outsider") });
test.beforeEach(() => ensureNotProjectMember("outsider"));
test.afterEach(() => ensureNotProjectMember("outsider"));

test("a person invited as a viewer joins from the link and sees no Team or Settings", async ({ page }) => {
	const invitation = await createProjectInvitation({ role: "viewer", max_uses: 1, expires_in_days: 1 });
	try {
		await page.goto(`/invite#t=${invitation.token}`);
		const main = page.getByRole("main");
		await expect(main).toContainText(SEED.projectName);
		await expect(main).toContainText(/viewer/i);
		// The link's secret leaves the address bar once read.
		await expect(page).not.toHaveURL(new RegExp(invitation.token));

		await main.getByRole("button", { name: /^join/i }).click();
		await expect(page).toHaveURL(url => url.pathname === projectPath());

		const tabs = projectTabs(page);
		await expect(tab(tabs, "Overview")).toBeVisible();
		await expect(tab(tabs, "Data")).toBeVisible();
		await expect(tab(tabs, "Team")).toHaveCount(0);
		await expect(tab(tabs, "Settings")).toHaveCount(0);
	} finally {
		await revokeProjectInvitation(invitation.id).catch(() => undefined);
	}
});
