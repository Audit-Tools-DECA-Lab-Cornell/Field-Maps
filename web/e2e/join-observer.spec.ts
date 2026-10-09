import { expect, test } from "@playwright/test";

import {
	createProjectInvitation,
	ensureNotProjectMember,
	listProjectMembers,
	revokeProjectInvitation
} from "./support/api";
import { authFile } from "./support/auth";
import { manifest, orgPath, SEED } from "./support/manifest";

/**
 * Plan step 12: an observer joins with the code their manager gave them and is sent to collect in the
 * app. The joiner account is taken back out before and after.
 */

test.use({ storageState: authFile("joiner") });
test.beforeEach(() => ensureNotProjectMember("joiner"));
test.afterEach(() => ensureNotProjectMember("joiner"));

test("an observer joins by code and lands on the collect page", async ({ page }) => {
	const invitation = await createProjectInvitation({ role: "observer", max_uses: 5, expires_in_days: 1 });
	try {
		await page.goto("/join");
		const code = page.getByLabel(/join code/i);
		await code.fill(invitation.code);
		await code.press("Enter");

		// The code is never put in the address.
		const main = page.getByRole("main");
		await expect(main).toContainText(SEED.projectName);
		await expect(main).toContainText(/observer/i);
		expect(page.url()).not.toContain(invitation.code);

		await main.getByRole("button", { name: /^join/i }).click();
		await expect(page).toHaveURL(url => url.pathname === orgPath("collect"));
		await expect(page.getByRole("main")).toContainText(SEED.projectName);
		expect(page.url()).not.toContain(invitation.code);

		const joined = (await listProjectMembers()).find(member => member.user_id === manifest().accounts.joiner.id);
		expect(joined?.role).toBe("observer");
	} finally {
		await revokeProjectInvitation(invitation.id).catch(() => undefined);
	}
});
