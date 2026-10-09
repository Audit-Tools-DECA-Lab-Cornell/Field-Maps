import "server-only";

import { cache } from "react";
import { ZodError } from "zod";

import { OBSERVATION_LIMIT } from "@/lib/observations/summary";
import { type ProjectedSite, projectSite } from "@/lib/plan";
import { PackageArchiveError, packageSiteCollection, readPackageArchive } from "@/lib/sites/archive";
import { buildWorkspaceIndex, unavailableWorkspace } from "@/lib/workspace/build";
import { toFailure } from "@/lib/workspace/result";
import type { OrgRef, ProjectRef, RoundType, WorkspaceIndex } from "@/lib/workspace/types";

import { call, getIdentity, session } from "./client";
import { ApiError, errorCopy } from "./errors";
import type {
	FormSummary,
	FormVersionDetail,
	Invitation,
	ObservationRow,
	Organization,
	OrganizationMember,
	PackageDetail,
	PackageSummary,
	Project,
	ProjectMember,
	RawDefinition,
	Site,
	StoredObservation
} from "./types";

/**
 * Every server-side read the workspace makes. Each is wrapped in React `cache()`, so a layout and its
 * page asking for the same thing in one request share one API call; arguments are strings only, which
 * is what `cache()` compares.
 *
 * Reads throw `ApiError` on failure. Pages wrap them with `settle()` and show the failure; a failed read
 * is never turned into an empty list. `getWorkspace()` is the exception: it never throws.
 */

/** The observation list's cap: at this many rows the list may be missing older records. */
export { OBSERVATION_LIMIT };

export const getMe = cache(getIdentity);

/**
 * The signed-in person, their organizations and their projects (training projects hidden). Never throws:
 * when the person cannot be placed it returns `status: "unavailable"` with the failure (signed out,
 * FieldMaps unreachable, sign-in not configured).
 */
export const getWorkspace = cache(async (): Promise<WorkspaceIndex> => {
	let claims: { sub: string; email: string | undefined } | null = null;
	try {
		const current = await session();
		if (current.status === "unconfigured")
			return unavailableWorkspace(
				{ code: "storage_unavailable", kind: "retry", message: errorCopy.storage_unavailable },
				null
			);
		if (current.status === "signed-out")
			return unavailableWorkspace(
				{ code: "unauthenticated", kind: "sign-in", message: errorCopy.unauthenticated },
				null
			);
		claims = { sub: current.userId, email: current.email };
		return buildWorkspaceIndex(await getMe(), claims);
	} catch (error) {
		return unavailableWorkspace(toFailure(error), claims);
	}
});

/** The failure of an unavailable workspace, as the ApiError a read would have thrown. */
function workspaceError(index: WorkspaceIndex): ApiError {
	const failure = index.failure;
	if (failure && failure.code in errorCopy)
		return new ApiError(failure.code as keyof typeof errorCopy, failure.kind, { retryAfter: failure.retryAfter });
	return new ApiError("unknown", failure?.kind ?? "retry");
}

/**
 * The organization at `/o/<slug>`, or null when the person has none there. Throws when the workspace is
 * unavailable, so a layout shows the failure rather than "not found".
 */
export const resolveOrg = cache(async (slug: string): Promise<OrgRef | null> => {
	const index = await getWorkspace();
	if (index.status !== "ready") throw workspaceError(index);
	return index.orgs.find(org => org.slug === slug) ?? null;
});

/** The project at `/o/<orgSlug>/p/<code>`, or null. Throws when the workspace is unavailable. */
export const resolveProject = cache(async (orgSlug: string, code: string): Promise<ProjectRef | null> => {
	const index = await getWorkspace();
	if (index.status !== "ready") throw workspaceError(index);
	return index.projects.find(project => project.orgSlug === orgSlug && project.code === code) ?? null;
});

/* ── Organizations ────────────────────────────────────────────────────────── */

/** Owner/admin only (403 otherwise): gate on `orgAbilities(role).manage` before calling. */
export const getOrganization = cache(
	(orgId: string): Promise<Organization> =>
		call(api => api.GET("/v1/orgs/{org}", { params: { path: { org: orgId } } }))
);

/** The organization's projects this person can open (training included only if they belong to it). */
export const listOrgProjects = cache(
	(orgId: string): Promise<Project[]> =>
		call(api => api.GET("/v1/orgs/{org}/projects", { params: { path: { org: orgId } } }))
);

/** Owner/admin only. */
export const listOrgMembers = cache(
	(orgId: string): Promise<OrganizationMember[]> =>
		call(api => api.GET("/v1/orgs/{org}/members", { params: { path: { org: orgId } } }))
);

/** Owner/admin only. Every invitation, including revoked, expired and used-up ones (see `activeInvitations`). */
export const listOrgInvitations = cache(
	(orgId: string): Promise<Invitation[]> =>
		call(api => api.GET("/v1/orgs/{org}/invitations", { params: { path: { org: orgId } } }))
);

/* ── Projects ─────────────────────────────────────────────────────────────── */

export const getProject = cache(
	(projectId: string): Promise<Project> =>
		call(api => api.GET("/v1/projects/{project}", { params: { path: { project: projectId } } }))
);

/** Managers only. */
export const listProjectMembers = cache(
	(projectId: string): Promise<ProjectMember[]> =>
		call(api => api.GET("/v1/projects/{project}/members", { params: { path: { project: projectId } } }))
);

/** Managers only. Every invitation, including revoked, expired and used-up ones. */
export const listProjectInvitations = cache(
	(projectId: string): Promise<Invitation[]> =>
		call(api => api.GET("/v1/projects/{project}/invitations", { params: { path: { project: projectId } } }))
);

/* ── Sites and map packages ───────────────────────────────────────────────── */

/** Every site, with its current package (the newest ready one), zones and exact observation count. */
export const listSites = cache(
	(projectId: string): Promise<Site[]> =>
		call(api => api.GET("/v1/projects/{project_id}/sites", { params: { path: { project_id: projectId } } }))
);

export const getSite = cache(
	(projectId: string, code: string): Promise<Site> =>
		call(api =>
			api.GET("/v1/projects/{project_id}/sites/{site_code}", {
				params: { path: { project_id: projectId, site_code: code } }
			})
		)
);

/** Every package, ready and blocked, for one site when `siteCode` is given. */
export const listPackages = cache(
	(projectId: string, siteCode?: string): Promise<PackageSummary[]> =>
		call(api =>
			api.GET("/v1/projects/{project_id}/packages", {
				params: { path: { project_id: projectId }, ...(siteCode ? { query: { site: siteCode } } : {}) }
			})
		)
);

/** A package with its preparation checks and manifest. */
export const getPackage = cache(
	(projectId: string, packageId: string): Promise<PackageDetail> =>
		call(api =>
			api.GET("/v1/projects/{project_id}/packages/{package_id}", {
				params: { path: { project_id: projectId, package_id: packageId } }
			})
		)
);

/** A ready package's archive bytes. Blocked packages have none to download. */
export const getPackageArchive = cache(
	async (projectId: string, packageId: string): Promise<Uint8Array> =>
		new Uint8Array(
			await call<ArrayBuffer>(api =>
				api.GET("/v1/projects/{project_id}/packages/{package_id}/archive", {
					params: { path: { project_id: projectId, package_id: packageId } },
					parseAs: "arrayBuffer"
				})
			)
		)
);

/**
 * A package drawn as a site plan, from its archive. Null when the archive cannot be read as a plan;
 * throws when it cannot be fetched.
 */
export const getSitePlan = cache(
	async (projectId: string, packageId: string, siteName: string): Promise<ProjectedSite | null> => {
		const bytes = await getPackageArchive(projectId, packageId);
		try {
			const { manifest, layers } = readPackageArchive(bytes);
			return projectSite(packageSiteCollection(siteName, manifest, layers));
		} catch (error) {
			// An archive that cannot be read, or drawn, is shown without a plan.
			if (error instanceof PackageArchiveError || error instanceof ZodError) return null;
			throw error;
		}
	}
);

/* ── Forms ────────────────────────────────────────────────────────────────── */

/** Every form with its versions, newest first. Drafts only for managers. */
export const listForms = cache(
	(projectId: string): Promise<FormSummary[]> =>
		call(api => api.GET("/v1/projects/{project_id}/forms", { params: { path: { project_id: projectId } } }))
);

/** One form version and its definition. A draft is 404 for anyone but a manager. */
export const getFormVersion = cache(
	(projectId: string, code: string): Promise<FormVersionDetail> =>
		call(api =>
			api.GET("/v1/projects/{project_id}/form-versions/{version_code}", {
				params: { path: { project_id: projectId, version_code: code } }
			})
		)
);

/**
 * The historical definitions of several form versions, for labelling and exporting records. Each version
 * is a cached read; a version that cannot be read is listed in `missing` instead of failing the rest.
 */
export async function getFormDefinitions(
	projectId: string,
	codes: readonly string[]
): Promise<{ definitions: Record<string, RawDefinition>; missing: string[] }> {
	const unique = [...new Set(codes)];
	const settled = await Promise.allSettled(unique.map(code => getFormVersion(projectId, code)));
	const definitions: Record<string, RawDefinition> = {};
	const missing: string[] = [];
	settled.forEach((result, index) => {
		const code = unique[index]!;
		if (result.status === "fulfilled") definitions[code] = result.value.definition;
		else {
			toFailure(result.reason); // rethrows anything that is not an API failure
			missing.push(code);
		}
	});
	return { definitions, missing };
}

/* ── Observations ─────────────────────────────────────────────────────────── */

/**
 * The newest observations (at most 500), optionally for one site and one round type, filtered on the
 * server before the cap. `since` keeps records received at or after that time; it is not an observed-date
 * filter. `limited` is true when the cap was reached, so older records may be missing: aggregates and
 * exports then say "Based on the newest 500 observations".
 */
export const listObservations = cache(
	async (
		projectId: string,
		site?: string,
		roundType?: RoundType,
		since?: string
	): Promise<{ rows: ObservationRow[]; limited: boolean }> => {
		const query: { site?: string; round_type?: RoundType; since?: string; limit: number } = {
			limit: OBSERVATION_LIMIT
		};
		if (site) query.site = site;
		if (roundType) query.round_type = roundType;
		if (since) query.since = since;
		const rows = await call<ObservationRow[]>(api =>
			api.GET("/v1/projects/{project_id}/observations", { params: { path: { project_id: projectId }, query } })
		);
		return { rows, limited: rows.length >= OBSERVATION_LIMIT };
	}
);

/** One observation with its full context (site, form version, round), even outside the list's cap. */
export const getObservation = cache(
	(projectId: string, observationId: string): Promise<StoredObservation> =>
		call(api =>
			api.GET("/v1/projects/{project_id}/observations/{observation_id}", {
				params: { path: { project_id: projectId, observation_id: observationId } }
			})
		)
);
