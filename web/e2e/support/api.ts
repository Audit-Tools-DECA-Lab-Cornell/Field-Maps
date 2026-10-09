import { accessToken } from "./auth";
import { loopbackOrigin, manifest, type Role } from "./manifest";

/**
 * Direct calls to the LOCAL API with a seeded account's saved sign-in. Specs use these only to arrange
 * state the screen under test does not create (a join code to redeem) and to undo what a spec changed
 * (a membership), and to confirm a screen's write landed. Everything a person does goes through the UI.
 */
export async function api<T = unknown>(role: Role, method: string, path: string, body?: unknown): Promise<T> {
	const origin = loopbackOrigin(manifest().apiUrl, "The API address");
	const response = await fetch(`${origin}${path}`, {
		method,
		redirect: "error",
		signal: AbortSignal.timeout(20_000),
		headers: {
			Authorization: `Bearer ${accessToken(role)}`,
			...(body === undefined ? {} : { "Content-Type": "application/json" })
		},
		...(body === undefined ? {} : { body: JSON.stringify(body) })
	});
	if (!response.ok) throw new Error(`${method} ${path}: HTTP ${response.status}`);
	if (response.status === 204) return undefined as T;
	const text = await response.text();
	return (text ? JSON.parse(text) : undefined) as T;
}

const project = () => `/v1/projects/${manifest().projectId}`;

export type Member = { user_id: string; role: string; display_name: string | null };
export type Invitation = {
	id: string;
	role: string;
	email: string | null;
	revoked_at: string | null;
	use_count: number;
	max_uses: number;
	expires_at: string;
};
export type InvitationCreated = Invitation & { token: string; code: string };
export type PackageSummary = { package_id: string; version: number; state: "ready" | "blocked"; site_code: string };
export type FormVersion = { version_id: string; code: string; version: number; state: string };
export type FormSummary = { code: string; name: string; versions: FormVersion[] };
export type Project = { name: string; description: string | null; timezone: string; status: string };
export type Site = { code: string; name: string; observation_count: number };

export const listProjectMembers = () => api<Member[]>("manager", "GET", `${project()}/members`);
export const listProjectInvitations = () => api<Invitation[]>("manager", "GET", `${project()}/invitations`);
export const listPackages = (site: string) =>
	api<PackageSummary[]>("manager", "GET", `${project()}/packages?site=${encodeURIComponent(site)}`);
export const listForms = () => api<FormSummary[]>("manager", "GET", `${project()}/forms`);
export const getProject = () => api<Project>("manager", "GET", project());
export const listSites = () => api<Site[]>("manager", "GET", `${project()}/sites`);

/** A project invitation made by the seeded manager. The token and code are returned once. */
export function createProjectInvitation(body: {
	role: "manager" | "observer" | "viewer";
	email?: string;
	max_uses?: number;
	expires_in_days?: number;
}): Promise<InvitationCreated> {
	return api<InvitationCreated>("manager", "POST", `${project()}/invitations`, body);
}

export async function revokeProjectInvitation(id: string): Promise<void> {
	await api("manager", "DELETE", `${project()}/invitations/${id}`);
}

/** Takes `role`'s account back out of the seeded project, so a join spec can run again. */
export async function ensureNotProjectMember(role: Role): Promise<void> {
	const userId = manifest().accounts[role].id;
	const members = await listProjectMembers();
	if (members.some(member => member.user_id === userId)) {
		await api("manager", "DELETE", `${project()}/members/${userId}`);
	}
}

/** The newest ready package's version for a site: the site's current map. */
export async function currentPackageVersion(site: string): Promise<number | null> {
	const ready = (await listPackages(site)).filter(item => item.state === "ready");
	return ready.length ? Math.max(...ready.map(item => item.version)) : null;
}
