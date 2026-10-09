import type { FullConfig } from "@playwright/test";

import { loopbackOrigin, manifest } from "./support/manifest";

async function reachable(url: string): Promise<boolean> {
	try {
		const response = await fetch(url, { redirect: "manual", signal: AbortSignal.timeout(10_000) });
		return response.status < 500;
	} catch {
		return false;
	}
}

/** Fails fast, with the fix, when the local stack is not up. Never reaches past loopback. */
export default async function globalSetup(config: FullConfig): Promise<void> {
	const seeded = manifest();
	const api = loopbackOrigin(seeded.apiUrl, "The seeded API address");
	const web = loopbackOrigin(String(config.projects[0]?.use.baseURL ?? ""), "The web address");
	if (!(await reachable(`${api}/ready`))) {
		throw new Error(`The local API is not answering at ${api}/ready. Start the stack with scripts/e2e-local.sh.`);
	}
	if (!(await reachable(`${web}/sign-in`))) {
		throw new Error(`The web app is not answering at ${web}. Start the stack with scripts/e2e-local.sh.`);
	}
}
