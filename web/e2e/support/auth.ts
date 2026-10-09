import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { expect, type Page } from "@playwright/test";

import { manifest, type Role } from "./manifest";

/** The seed's public test password for local synthetic accounts. It opens nothing outside this machine. */
export const PASSWORD = "FieldMaps-local-only-42!";

/** Where the setup project keeps each role's signed-in browser state (gitignored). */
export function authFile(role: Role): string {
	return fileURLToPath(new URL(`../.auth/${role}.json`, import.meta.url));
}

const SESSION_COOKIE = /^sb-.+-auth-token(\.\d+)?$/;

async function hasSession(page: Page): Promise<boolean> {
	return (await page.context().cookies()).some(cookie => SESSION_COOKIE.test(cookie.name));
}

/**
 * Signs in through the real sign-in form, as a person would: email, password, the Sign in button.
 * Resolves once the session cookie is set and, with `landing` (the default), once the browser has left
 * the sign-in page. The setup project passes `landing: false`, so a broken page after sign-in fails the
 * spec that covers it instead of every spec. A refused sign-in fails with the form's own message.
 */
export async function signIn(
	page: Page,
	role: Role,
	{ next, landing = true }: { next?: string; landing?: boolean } = {}
): Promise<void> {
	const { email } = manifest().accounts[role];
	await page.goto(next ? `/sign-in?next=${encodeURIComponent(next)}` : "/sign-in");
	await page.getByLabel("Email address").fill(email);
	await page.getByLabel("Password", { exact: true }).fill(PASSWORD);
	await page.getByRole("button", { name: "Sign in", exact: true }).click();
	try {
		await expect.poll(() => hasSession(page), { timeout: 30_000 }).toBe(true);
	} catch {
		const said = (
			await page
				.locator("form")
				.first()
				.innerText()
				.catch(() => "")
		).replace(/\s+/g, " ");
		throw new Error(`Signing in as ${role} did not start a session. The form says: ${said.slice(0, 300)}`);
	}
	if (landing) await expect(page).not.toHaveURL(/\/sign-in(\?|$)/, { timeout: 30_000 });
	else await page.waitForLoadState("load").catch(() => undefined);
}

type SavedState = { cookies: { name: string; value: string }[] };

function chunkIndex(name: string): number {
	const match = /\.(\d+)$/.exec(name);
	return match ? Number(match[1]) : -1;
}

/**
 * The Supabase session inside a saved browser state: the `sb-<ref>-auth-token` cookie, possibly split
 * into `.0`, `.1` chunks and stored as `base64-<base64url JSON>` by @supabase/ssr.
 */
function savedSession(role: Role): { access_token: string; expires_at?: number } | null {
	const file = authFile(role);
	if (!existsSync(file)) return null;
	const state = JSON.parse(readFileSync(file, "utf8")) as SavedState;
	const parts = state.cookies
		.filter(cookie => /^sb-.+-auth-token(\.\d+)?$/.test(cookie.name))
		.sort((a, b) => chunkIndex(a.name) - chunkIndex(b.name));
	if (parts.length === 0) return null;
	let raw = parts.map(part => part.value).join("");
	if (raw.startsWith("base64-")) raw = Buffer.from(raw.slice("base64-".length), "base64url").toString("utf8");
	else raw = decodeURIComponent(raw);
	const session = JSON.parse(raw) as { access_token?: string; expires_at?: number };
	return session.access_token ? { access_token: session.access_token, expires_at: session.expires_at } : null;
}

/** Seconds until the saved sign-in for `role` expires, or 0 when there is none. */
export function savedSessionLife(role: Role): number {
	try {
		const session = savedSession(role);
		if (!session?.expires_at) return 0;
		return Math.max(0, session.expires_at - Math.floor(Date.now() / 1000));
	} catch {
		return 0;
	}
}

/**
 * The access token from `role`'s saved sign-in, for the few setup and clean-up calls the specs make to
 * the local API directly (creating a join code to redeem, removing a member a spec added).
 */
export function accessToken(role: Role): string {
	const session = savedSession(role);
	if (!session) throw new Error(`No saved sign-in for ${role}. The setup project signs every role in first.`);
	if (savedSessionLife(role) < 60) throw new Error(`The saved sign-in for ${role} has expired. Run the suite again.`);
	return session.access_token;
}
