"use client";

import { useRouter } from "next/navigation";

import { ButtonLink } from "@/components/contour/Button";
import { Island } from "@/components/contour/Island";
import { PageHeader } from "@/components/contour/PageHeader";
import { StateBadge } from "@/components/contour/StateBadge";
import { TextLink } from "@/components/contour/TextLink";
import { useReviews } from "@/features/data/review";
import { activeRow, packageRows } from "@/features/packages/model";
import { useSitePackagePreview } from "@/features/packages/store";
import { projectHref } from "@/features/shell/navigation";
import { PreviewStateView } from "@/features/shell/PreviewStateView";
import {
	coverageFor,
	formatTime,
	type Observation,
	observationsFor,
	type Site,
	typeBreakdown,
	type Zone
} from "@/fixtures";
import type { ProjectedSite } from "@/lib/plan";

import { siteMarkers, zoneObservations } from "./model";
import { MapArea, RowsTable } from "./parts";
import { ZoneContext } from "./ZoneContext";

/**
 * A zone (project-08): its boundary hatched on the site plan with the site's observations, the zone's
 * description and facts, coverage by round against the illustrative target, and its observations.
 */
export function ZoneScreen({ org, site, zone, plan }: { org: string; site: Site; zone: Zone; plan: ProjectedSite }) {
	const router = useRouter();
	const preview = useSitePackagePreview(site.slug);
	const active = activeRow(packageRows(site.slug, preview));
	const siteHref = projectHref(org, site.projectSlug, `sites/${site.slug}`);
	const dataHref = projectHref(org, site.projectSlug, "data");
	const filteredData = `${dataHref}?site=${site.slug}&zone=${zone.slug}`;
	const records = zoneObservations(site.projectSlug, site.slug, zone.slug);
	const coverage = coverageFor(site.projectSlug, site.slug).find(entry => entry.zone.slug === zone.slug);
	const markers = siteMarkers(plan, observationsFor(site.projectSlug, site.slug));
	const planZone = plan.zones.find(entry => entry.id === zone.id);

	return (
		<div className="flex flex-col gap-6">
			<PageHeader
				breadcrumbs={[
					{ label: "Sites", href: projectHref(org, site.projectSlug, "sites") },
					{ label: site.name, href: siteHref },
					{ label: zone.name }
				]}
				title={zone.name}
				lead={`Zone ${zone.code} · coverage and records inside this boundary.`}
				actions={
					<>
						<ButtonLink href={siteHref} variant="outline" icon="arrow-left">
							Back to site
						</ButtonLink>
						<ButtonLink href={filteredData} iconRight="arrow-right">
							View filtered data
						</ButtonLink>
					</>
				}
			/>

			<div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1.36fr)_minmax(0,1fr)]">
				<MapArea
					site={plan}
					mapVersion={active?.version ?? "v3"}
					title={zone.name}
					subtitle={`Zone ${zone.code} · ${records.length} ${records.length === 1 ? "observation" : "observations"}`}
					zones={{ [zone.id]: { hatched: true, emphasis: "focus" } }}
					observations={markers}
					onSelectObservation={id => router.push(`${dataHref}/${id}`)}
				/>
				<ZoneContext
					site={site}
					zone={zone}
					coverage={coverage}
					records={records}
					mapVersion={active?.version ?? "v3"}
					vertices={planZone?.points.length ?? 0}
				/>
			</div>

			<RoundCoverage records={records} coverage={coverage} />
			<ZoneObservations records={records} dataHref={dataHref} filteredData={filteredData} />
		</div>
	);
}

function RoundCoverage({
	records,
	coverage
}: {
	records: Observation[];
	coverage: ReturnType<typeof coverageFor>[number] | undefined;
}) {
	const rounds = (coverage?.perRound ?? []).map((count, index) => {
		const inRound = records.filter(record => record.round === index + 1);
		const observers = [...new Set(inRound.map(record => record.observerInitials))];
		return {
			round: index + 1,
			count,
			observers: observers.length > 0 ? observers.join(" · ") : "None yet",
			types: inRound.length > 0 ? typeBreakdown(inRound) : "No observations",
			met: coverage?.met[index] ?? false
		};
	});

	return (
		<Island flush title="Round coverage">
			<PreviewStateView
				loadingLabel="Loading round coverage…"
				rows={3}
				empty={{
					icon: "list",
					title: "No rounds recorded yet",
					body: "Rounds appear once observations in this zone are uploaded."
				}}>
				<RowsTable
					caption="Round coverage"
					rows={rounds}
					rowKey={row => String(row.round)}
					cardTitle={row => `Round ${row.round}`}
					columns={[
						{
							key: "round",
							label: "Round",
							hideInCard: true,
							cell: row => `Round ${row.round}`,
							nowrap: true
						},
						{ key: "count", label: "Observations", mono: true, cell: row => row.count },
						{ key: "observer", label: "Observer", cell: row => row.observers },
						{ key: "types", label: "By primary play type", cell: row => row.types },
						{
							key: "status",
							label: "Target status",
							cell: row => <StateBadge kind="coverage" state={row.met ? "meets" : "belowExample"} />
						}
					]}
				/>
			</PreviewStateView>
		</Island>
	);
}

function ZoneObservations({
	records,
	dataHref,
	filteredData
}: {
	records: Observation[];
	dataHref: string;
	filteredData: string;
}) {
	const { reviewOf } = useReviews();
	return (
		<Island
			flush
			title="Observations in this zone"
			meta={<StateBadge kind="proposal" state="open" size="sm" label="Review is proposal U5" />}
			actions={<TextLink href={filteredData}>Open these in Data</TextLink>}>
			<PreviewStateView
				loadingLabel="Loading observations…"
				rows={4}
				empty={{
					icon: "list",
					title: "No observations in this zone yet",
					body: "Observations appear here once observers upload them. Records still on devices are not counted here."
				}}>
				{records.length === 0 ? (
					<p className="px-island-pad py-6 type-body text-ink-2">
						No observations in this zone yet. Records still on devices are not counted here.
					</p>
				) : (
					<RowsTable
						caption="Observations in this zone"
						rows={records}
						rowKey={record => record.id}
						cardTitle={record => (
							<TextLink href={`${dataHref}/${record.id}`} tone="ink" className="type-mono-data">
								{record.id}
							</TextLink>
						)}
						columns={[
							{
								key: "id",
								label: "Observation",
								hideInCard: true,
								nowrap: true,
								cell: record => (
									<TextLink href={`${dataHref}/${record.id}`} tone="ink" className="type-mono-data">
										{record.id}
									</TextLink>
								)
							},
							{
								key: "when",
								label: "Round · time",
								nowrap: true,
								cell: record => `Round ${record.round} · ${formatTime(record.capturedAt)}`
							},
							{ key: "type", label: "Play type", cell: record => record.playTypeLabel },
							{ key: "observer", label: "Observer", cell: record => record.observerInitials },
							{
								key: "review",
								label: "Review",
								cell: record => <StateBadge kind="review" state={reviewOf(record)} />
							}
						]}
					/>
				)}
			</PreviewStateView>
		</Island>
	);
}
