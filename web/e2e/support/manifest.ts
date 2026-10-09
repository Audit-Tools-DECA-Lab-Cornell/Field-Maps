import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

/**
 * The local acceptance workspace written by `database/seed-web-workspace.mjs`. It holds public values
 * only (IDs, emails, expected counts, the local Auth address and its public key), never a sign-in.
 */
export type Role = "owner" | "admin" | "manager" | "observer" | "viewer" | "outsider" | "joiner" | "other-owner";

export const ROLES: readonly Role[] = [
	"owner",
	"admin",
	"manager",
	"observer",
	"viewer",
	"outsider",
	"joiner",
	"other-owner"
];

export type Manifest = {
	apiUrl: string;
	supabaseUrl: string;
	publishableKey: string;
	accounts: Record<Role, { email: string; id: string }>;
	organizationId: string;
	projectId: string;
	otherProjectId: string;
	/** `/o/web-acceptance/p/play-study` */
	path: string;
	/** The eight seeded observation IDs, in the order the seed wrote them. */
	observations: string[];
	baseline: {
		total: number;
		standard: number;
		reliability: number;
		inventory: number;
		/** The day every seeded observation was made, in the project's timezone. */
		date: string;
		zone: string;
	};
};

/** Names the seed fixes in code rather than in the manifest. Keep in step with the seed. */
export const SEED = {
	orgName: "Web acceptance lab",
	projectName: "Play study acceptance",
	otherOrgSlug: "web-acceptance-other",
	timezone: "America/New_York",
	sites: { fallCreek: "fall-creek", empty: "empty-site" },
	siteNames: { fallCreek: "Fall Creek test site", empty: "Empty test site" },
	form: { code: "workspace-check", name: "Workspace check", published: "workspace-check-v1" },
	/** The seeded form's one question: its label and the start of every seeded answer. */
	question: { label: "Test note", answerPrefix: "Synthetic record" },
	/** Strings the seed writes into the form definition. They are data, not interface copy. */
	dataStrings: [
		"Local acceptance fixture",
		"Synthetic data for local web acceptance only.",
		"Not a research instrument."
	]
} as const;

export const MANIFEST_PATH =
	process.env.E2E_MANIFEST ?? fileURLToPath(new URL("../../../database/.local/web-workspace.json", import.meta.url));

const LOOPBACK_HOSTS = new Set(["127.0.0.1", "localhost", "[::1]"]);

/** The origin of a plain-HTTP loopback URL. Anything else is refused: E2E never touches hosted services. */
export function loopbackOrigin(value: string, what: string): string {
	let url: URL;
	try {
		url = new URL(value);
	} catch {
		throw new Error(`${what} is not a URL: ${JSON.stringify(value)}`);
	}
	if (url.protocol !== "http:" || !LOOPBACK_HOSTS.has(url.hostname) || url.username || url.password) {
		throw new Error(`${what} must be an http:// loopback address; refusing ${url.origin}.`);
	}
	return url.origin;
}

let cached: Manifest | undefined;

/** The seeded workspace. Run `scripts/e2e-local.sh` (or the seed) first. */
export function manifest(): Manifest {
	if (cached) return cached;
	let parsed: Manifest;
	try {
		parsed = JSON.parse(readFileSync(MANIFEST_PATH, "utf8")) as Manifest;
	} catch {
		throw new Error(
			`No seeded workspace at ${MANIFEST_PATH}. Run scripts/e2e-local.sh, or node database/seed-web-workspace.mjs against the local stack.`
		);
	}
	loopbackOrigin(parsed.apiUrl, "The seeded API address");
	loopbackOrigin(parsed.supabaseUrl, "The seeded Auth address");
	cached = parsed;
	return parsed;
}

/** `/o/web-acceptance/p/play-study` and the pieces of it. */
export function workspacePaths() {
	const project = manifest().path.replace(/\/+$/, "");
	const match = /^\/o\/([^/]+)\/p\/([^/]+)$/.exec(project);
	if (!match) throw new Error(`Unexpected workspace path in the manifest: ${project}`);
	const [, orgSlug, projectCode] = match;
	return { project, org: `/o/${orgSlug}`, orgSlug, projectCode };
}

/** A path inside the seeded project: `projectPath("sites/fall-creek")`. */
export function projectPath(rest = ""): string {
	const { project } = workspacePaths();
	return rest ? `${project}/${rest.replace(/^\/+/, "")}` : project;
}

/** A path inside the seeded organization: `orgPath("members")`. */
export function orgPath(rest = ""): string {
	const { org } = workspacePaths();
	return rest ? `${org}/${rest.replace(/^\/+/, "")}` : org;
}

/** How the header should name a seeded account: the seed sets these profiles on every run. */
export function person(role: Role): { name: string; email: string; initials: string } {
	return {
		name: `Local ${role}`,
		email: manifest().accounts[role].email,
		initials: role === "observer" ? "OB" : "QA"
	};
}

/** A short stamp for names this run creates, so reruns never collide. */
export function runStamp(): string {
	const now = new Date();
	const pad = (value: number) => String(value).padStart(2, "0");
	return `${pad(now.getUTCMonth() + 1)}${pad(now.getUTCDate())}-${pad(now.getUTCHours())}${pad(now.getUTCMinutes())}${pad(now.getUTCSeconds())}`;
}
