"use client";

import { ButtonLink } from "@/components/contour/Button";
import { CoverageDots } from "@/components/contour/CoverageDots";
import { type Fact, FactsList } from "@/components/contour/FactsList";
import { Island, IslandSection } from "@/components/contour/Island";
import { PageHeader } from "@/components/contour/PageHeader";
import { StateBadge } from "@/components/contour/StateBadge";
import { TextLink } from "@/components/contour/TextLink";
import { activeRow, type PackageRow, packageRows, sizeLabel } from "@/features/packages/model";
import { useSitePackagePreview } from "@/features/packages/store";
import { projectHref } from "@/features/shell/navigation";
import { usePreview } from "@/features/shell/PreviewProvider";
import { PreviewStateView } from "@/features/shell/PreviewStateView";
import { coverageFor, type Site, type ZoneCoverage } from "@/fixtures";
import type { ProjectedSite } from "@/lib/plan";

import { DeviceReadiness } from "./DeviceReadiness";
import { coverageZoneStyles, targetLine } from "./model";
import { CoverageLegend, MapArea, RowsTable } from "./parts";

/**
 * A site (project-07): its plan with coverage dots in each zone label, the zones against the illustrative
 * target, the active map package, and each device's last report.
 */
export function SiteScreen({ org, site, plan }: { org: string; site: Site; plan: ProjectedSite }) {
	const { can } = usePreview();
	const preview = useSitePackagePreview(site.slug);
	const rows = packageRows(site.slug, preview);
	const active = activeRow(rows);
	const base = projectHref(org, site.projectSlug, `sites/${site.slug}`);
	const coverage = coverageFor(site.projectSlug, site.slug);

	return (
		<div className="flex flex-col gap-6">
			<PageHeader
				breadcrumbs={[
					{ label: "Sites", href: projectHref(org, site.projectSlug, "sites") },
					{ label: site.name }
				]}
				title={site.name}
				lead="Zones, coverage, map packages and download readiness."
				actions={
					<>
						<ButtonLink href={`${base}/packages`} variant="outline" icon="layers">
							Map packages
						</ButtonLink>
						<ButtonLink
							href={`${projectHref(org, site.projectSlug, "data")}?site=${site.slug}`}
							iconRight="arrow-right">
							View data
						</ButtonLink>
					</>
				}
			/>

			<div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1.36fr)_minmax(0,1fr)]">
				<div className="flex min-w-0 flex-col gap-4">
					<MapArea
						site={plan}
						mapVersion={active?.state === "bundled" ? "bundled" : (active?.version ?? "v1")}
						subtitle={coverage.length > 0 ? "Dots show rounds that met the target" : undefined}
						zones={coverageZoneStyles(site.projectSlug, site.slug)}
					/>
					{coverage.length > 0 && <CoverageLegend target={targetLine(site.projectSlug)} className="px-2" />}
				</div>

				<div className="flex min-w-0 flex-col gap-6">
					<ZonesIsland
						base={base}
						coverage={coverage}
						training={site.training}
						siteName={site.name}
						mayEdit={can("uploadPackage")}
					/>
					<ActivePackageIsland active={active} packagesHref={`${base}/packages`} />
				</div>
			</div>

			<DeviceReadiness siteSlug={site.slug} />
		</div>
	);
}

const STATUS: Record<ZoneCoverage["status"], "complete" | "roundBelow" | "below"> = {
	complete: "complete",
	roundBelow: "roundBelow",
	below: "below"
};

function ZonesIsland({
	base,
	coverage,
	training,
	siteName,
	mayEdit
}: {
	base: string;
	coverage: ZoneCoverage[];
	training: boolean;
	siteName: string;
	mayEdit: boolean;
}) {
	const first = coverage[0];
	return (
		<Island flush title="Zones and coverage">
			<PreviewStateView
				loadingLabel="Loading zones…"
				rows={3}
				empty={{
					icon: "layers",
					title: "No zones yet",
					body: "Zones arrive with the site's first QGIS package."
				}}>
				{coverage.length === 0 ? (
					<p className="px-island-pad py-6 type-body text-ink-2">
						{training
							? `${siteName} is training geometry. Its records are never counted toward coverage.`
							: "Zones arrive with the site's first QGIS package."}
					</p>
				) : (
					<>
						<RowsTable
							caption="Zones and coverage"
							rowKey={entry => entry.zone.slug}
							cardTitle={entry => (
								<TextLink href={`${base}/zones/${entry.zone.slug}`} tone="ink">
									{entry.zone.name}
								</TextLink>
							)}
							rows={coverage}
							columns={[
								{
									key: "zone",
									label: "Zone",
									hideInCard: true,
									cell: entry => (
										<TextLink href={`${base}/zones/${entry.zone.slug}`} tone="ink">
											{entry.zone.name}
										</TextLink>
									)
								},
								{
									key: "rounds",
									label: "Rounds on target",
									nowrap: true,
									cell: entry => (
										<span className="inline-flex items-center gap-3">
											<span className="type-mono-data tnum">
												{entry.onTarget} / {entry.met.length}
											</span>
											<CoverageDots values={entry.met} />
										</span>
									)
								},
								{
									key: "status",
									label: "Status",
									cell: entry => <StateBadge kind="coverage" state={STATUS[entry.status]} />
								}
							]}
						/>
						<IslandSection rule className="flex flex-wrap gap-x-6 gap-y-3 py-5">
							{first && (
								<TextLink href={`${base}/zones/${first.zone.slug}`} icon="arrow-right" arrow={false}>
									Open {first.zone.name}
								</TextLink>
							)}
							{mayEdit && first && (
								<TextLink
									href={`${base}/zones/edit?zone=${first.zone.slug}`}
									icon="pencil"
									arrow={false}>
									Edit zone boundaries
								</TextLink>
							)}
						</IslandSection>
					</>
				)}
			</PreviewStateView>
		</Island>
	);
}

function ActivePackageIsland({ active, packagesHref }: { active: PackageRow | undefined; packagesHref: string }) {
	const facts: Fact[] = [];
	if (active) {
		facts.push({
			label: "Version",
			value: active.state === "bundled" ? "Bundled with the app" : active.version,
			mono: active.state !== "bundled"
		});
		const size = sizeLabel(active);
		if (size) facts.push({ label: "Size", value: size, mono: true });
		if (active.formAssignment) facts.push({ label: "Form assignment", value: active.formAssignment, mono: true });
		if (active.importedFrom) facts.push({ label: "Imported from", value: active.importedFrom });
	}

	return (
		<Island
			flush
			divided
			title="Active map package"
			meta={
				active ? (
					<StateBadge kind="package" state={active.state === "bundled" ? "bundled" : "active"} />
				) : undefined
			}>
			<PreviewStateView loadingLabel="Loading the map package…" rows={3}>
				{active ? (
					<div className="flex flex-col gap-6 px-island-pad pt-4 pb-island-pad">
						<FactsList items={facts} labelWidth="9.5rem" />
						<ButtonLink href={packagesHref} variant="outline" icon="layers" fullWidth>
							Inspect package history
						</ButtonLink>
					</div>
				) : (
					<p className="px-island-pad py-6 type-body text-ink-2">
						No map package is active on this site yet.
					</p>
				)}
			</PreviewStateView>
		</Island>
	);
}
