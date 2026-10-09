import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { ButtonLink } from "@/components/contour/Button";
import { Island } from "@/components/contour/Island";
import { Note } from "@/components/contour/Note";
import { PageHeader } from "@/components/contour/PageHeader";
import { ScreenState } from "@/components/contour/ScreenState";
import { LoadFailure } from "@/components/shell/LoadFailure";
import { NotAvailable } from "@/components/shell/NotAvailable";
import { chooseFormVersion, isInventoryDefinition, publishedVersions } from "@/features/packages/forms";
import { blockedToExplain, firstBlockedDetail, historyRows } from "@/features/packages/history";
import { type InspectedPackage, InspectPackage } from "@/features/packages/InspectPackage";
import { readManifest } from "@/features/packages/manifest";
import { UploadStep } from "@/features/packages/UploadStep";
import { VersionHistory } from "@/features/packages/VersionHistory";
import { projectHref } from "@/features/shell/navigation";
import {
	getFormDefinitions,
	getPackage,
	getProject,
	getSite,
	getSitePlan,
	listForms,
	listPackages,
	resolveProject
} from "@/lib/api/workspace";
import { formatBytes } from "@/lib/labels";
import type { ProjectedSite } from "@/lib/plan";
import { clock } from "@/lib/time";
import { projectAbilities } from "@/lib/workspace/access";
import { isNotFound, settle } from "@/lib/workspace/result";
import type { Failure } from "@/lib/workspace/types";

type Params = { org: string; project: string; site: string };
type Query = { step?: string | string[]; package?: string | string[] };

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
	const { org, project, site } = await params;
	try {
		const ref = await resolveProject(org, project);
		return { title: ref ? `${(await getSite(ref.id, site)).name} map packages` : "Map packages" };
	} catch {
		// The page itself says why the site could not be read.
		return { title: "Map packages" };
	}
}

function one(value: string | string[] | undefined): string | undefined {
	return Array.isArray(value) ? value[0] : value;
}

function PackagesFailure({ failure }: { failure: Failure }) {
	return (
		<div className="flex flex-col gap-6">
			<PageHeader title="Map packages" />
			<LoadFailure failure={failure} what="the map packages" />
		</div>
	);
}

/**
 * A site's map packages: History (the newest ready package is current), Inspect (`?package=<id>`: one
 * package's checks and contents) and Upload (`?step=upload`, managers: QGIS layers to a new version).
 */
export default async function PackagesPage({
	params,
	searchParams
}: {
	params: Promise<Params>;
	searchParams: Promise<Query>;
}) {
	const [{ org, project: code, site: siteCode }, query] = await Promise.all([params, searchParams]);
	const ref = await resolveProject(org, code);
	if (!ref) notFound();
	const canManage = projectAbilities(ref.role).manage;

	const [site, project, packages] = await Promise.all([
		settle(getSite(ref.id, siteCode)),
		settle(getProject(ref.id)),
		settle(listPackages(ref.id, siteCode))
	]);
	if (!site.ok) {
		if (isNotFound(site.failure) || site.failure.code === "validation_failed") notFound();
		return <PackagesFailure failure={site.failure} />;
	}
	if (!project.ok) return <PackagesFailure failure={project.failure} />;

	const sitesHref = projectHref(org, code, "sites");
	const siteHref = `${sitesHref}/${site.data.code}`;
	const base = `${siteHref}/packages`;
	const timezone = clock(project.data.timezone);
	const uploading = one(query.step) === "upload";

	// Why each blocked package was blocked: the first check that blocked it.
	const explained: Record<string, string | null> = {};
	if (packages.ok)
		await Promise.all(
			blockedToExplain(packages.data).map(async id => {
				const detail = await settle(getPackage(ref.id, id));
				explained[id] = detail.ok ? firstBlockedDetail(detail.data.checks) : null;
			})
		);
	const rows = packages.ok ? historyRows(packages.data, timezone, explained) : [];

	// Inspect: the package the address names, if it is one of this site's.
	const wanted = uploading ? undefined : one(query.package);
	const listed = wanted && packages.ok ? packages.data.find(item => item.package_id === wanted) : undefined;
	let inspected: InspectedPackage | null = null;
	let inspectFailure: Failure | null = null;
	let plan: ProjectedSite | null = null;
	let planFailure: Failure | null = null;
	if (listed) {
		const detail = await settle(getPackage(ref.id, listed.package_id));
		if (!detail.ok) inspectFailure = detail.failure;
		else {
			const row = rows.find(item => item.packageId === listed.package_id);
			inspected = {
				packageId: detail.data.package_id,
				version: detail.data.version,
				ready: detail.data.state === "ready",
				state: row?.state ?? (detail.data.state === "ready" ? "archived" : "blocked"),
				prepared: timezone.dayTime(detail.data.prepared_at),
				sizeLabel: formatBytes(detail.data.archive_bytes),
				formVersion: detail.data.form_version,
				checks: detail.data.checks,
				manifest: readManifest(detail.data.manifest)
			};
			if (inspected.ready) {
				const drawn = await settle(getSitePlan(ref.id, detail.data.package_id, site.data.name));
				if (drawn.ok) plan = drawn.data;
				else planFailure = drawn.failure;
			}
		}
	}

	return (
		<div className="flex flex-col gap-6">
			<PageHeader
				breadcrumbs={[
					{ label: "Sites", href: sitesHref },
					{ label: site.data.name, href: siteHref },
					{ label: "Map packages" }
				]}
				title={`${site.data.name} map packages`}
				lead="Prepare a map package from QGIS layers. The newest ready package is the one observers get."
				actions={
					uploading ? (
						<ButtonLink href={base} variant="outline" icon="arrow-left">
							Back to history
						</ButtonLink>
					) : canManage ? (
						<ButtonLink href={`${base}?step=upload`} variant="primary" icon="upload">
							Upload a new version
						</ButtonLink>
					) : undefined
				}
			/>

			{uploading &&
				(canManage ? (
					<UploadSection
						org={org}
						project={code}
						projectId={ref.id}
						siteCode={site.data.code}
						siteName={site.data.name}
						currentFormVersion={site.data.package?.form_version ?? null}
						packagesHref={base}
					/>
				) : (
					<Island flush title="Upload from QGIS">
						<ScreenState
							kind="no-access"
							headingLevel={3}
							title="Only project managers can upload map packages."
							body="You can read and download this site's map packages. Ask a project manager to upload a new version."
						/>
					</Island>
				))}

			{inspected && (
				<InspectPackage
					projectId={ref.id}
					siteCode={site.data.code}
					pkg={inspected}
					plan={plan}
					planFailure={planFailure}
					closeHref={base}
				/>
			)}
			{inspectFailure && <LoadFailure failure={inspectFailure} what="this map package" />}
			{wanted && packages.ok && !listed && (
				<Note tone="attention" title="That version is not in this site's history.">
					Choose a version from the history below.
				</Note>
			)}

			{packages.ok ? (
				<VersionHistory
					rows={rows}
					selectedId={inspected?.packageId ?? null}
					inspectHref={id => `${base}?package=${id}`}
				/>
			) : (
				<LoadFailure failure={packages.failure} what="the map package history" />
			)}

			<NotAvailable
				title="Deleting a map package"
				instead="To replace what observers download, upload a new version."
			/>
		</div>
	);
}

/** The Upload step's inputs: the published form versions, and which one the upload starts on. */
async function UploadSection({
	org,
	project,
	projectId,
	siteCode,
	siteName,
	currentFormVersion,
	packagesHref
}: {
	org: string;
	project: string;
	projectId: string;
	siteCode: string;
	siteName: string;
	currentFormVersion: string | null;
	packagesHref: string;
}) {
	const forms = await settle(listForms(projectId));
	if (!forms.ok) return <LoadFailure failure={forms.failure} what="the forms" />;

	const published = publishedVersions(forms.data);
	if (published.length === 0)
		return (
			<Island flush title="Upload from QGIS">
				<ScreenState
					kind="empty"
					icon="file-text"
					headingLevel={3}
					title="No published form yet"
					body="A map package is prepared for a published form version, so observers collect with a form that matches the map. Publish a form first."
					actions={
						<ButtonLink href={projectHref(org, project, "forms")} variant="outline">
							Open forms
						</ButtonLink>
					}
				/>
			</Island>
		);

	// Keep the current package's form while it is published. Otherwise start on the newest play form, which
	// takes reading the definitions to tell it from an inventory form.
	let inventory = new Set<string>();
	if (!currentFormVersion || !published.some(version => version.code === currentFormVersion)) {
		const { definitions } = await getFormDefinitions(
			projectId,
			published.slice(0, 8).map(version => version.code)
		);
		inventory = new Set(
			Object.entries(definitions)
				.filter(([, definition]) => isInventoryDefinition(definition))
				.map(([versionCode]) => versionCode)
		);
	}

	return (
		<UploadStep
			org={org}
			project={project}
			projectId={projectId}
			siteCode={siteCode}
			siteName={siteName}
			forms={published}
			defaultFormVersion={chooseFormVersion(published, currentFormVersion, inventory) ?? published[0]!.code}
			packagesHref={packagesHref}
		/>
	);
}
