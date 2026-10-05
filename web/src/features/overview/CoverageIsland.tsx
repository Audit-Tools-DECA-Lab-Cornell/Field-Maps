"use client";

import { useState } from "react";

import { ButtonLink } from "@/components/contour/Button";
import { CoverageDots } from "@/components/contour/CoverageDots";
import { Island } from "@/components/contour/Island";
import { StateBadge } from "@/components/contour/StateBadge";
import { Table, TBody, Td, Th, THead, Tr } from "@/components/contour/Table";
import { TextLink } from "@/components/contour/TextLink";
import { MapFrame } from "@/components/map/MapFrame";
import type { ZonePlanStyle } from "@/components/map/SitePlan";
import { usePreview } from "@/features/shell/PreviewProvider";
import { PreviewStateView } from "@/features/shell/PreviewStateView";
import type { ZoneCoverage } from "@/fixtures";
import { cx } from "@/lib/cx";
import type { ProjectedSite } from "@/lib/plan";

export type CoverageIslandProps = {
	/** The site the coverage is about, projected for the map; null when the project has no site yet. */
	site: ProjectedSite | null;
	siteName: string;
	siteHref: string;
	sitesHref: string;
	mapVersion: string;
	coverage: ZoneCoverage[];
	target: { roundsPerZone: number; observationsPerRound: number };
	/** The address of a zone's page. */
	zoneHrefs: Record<string, string>;
};

function ringPath(points: readonly (readonly [number, number])[]): string {
	return `${points.map(([x, y], index) => `${index === 0 ? "M" : "L"}${x.toFixed(1)} ${y.toFixed(1)}`).join(" ")} Z`;
}

/**
 * Coverage by zone (project-01): the site plan with each zone's coverage dots, and the zone table under it.
 * Hovering a row emphasises its zone on the plan, and hovering a zone highlights its row.
 */
export function CoverageIsland({
	site,
	siteName,
	siteHref,
	sitesHref,
	mapVersion,
	coverage,
	target,
	zoneHrefs
}: CoverageIslandProps) {
	const { screenState } = usePreview();
	const [hovered, setHovered] = useState<string | null>(null);
	const rounds = Array.from({ length: target.roundsPerZone }, (_, index) => index + 1);
	const live = screenState === "normal" || screenState === "offline";

	const zoneStyles: Record<string, ZonePlanStyle> = Object.fromEntries(
		coverage.map(entry => [
			entry.zone.id,
			{
				dots: entry.met,
				...(hovered === entry.zone.id ? { emphasis: "focus" as const, hatched: true } : {})
			}
		])
	);

	return (
		<Island
			flush
			divided={false}
			title="Coverage by zone"
			actions={site ? <TextLink href={siteHref}>Open {siteName}</TextLink> : undefined}
			footnote={
				live && site ? (
					<div className="flex flex-col gap-2">
						<p className="flex flex-wrap items-center gap-x-6 gap-y-1">
							<span className="inline-flex items-center gap-2">
								<span aria-hidden="true">
									<CoverageDots values={[true]} size="sm" />
								</span>
								Round met the target
							</span>
							<span className="inline-flex items-center gap-2">
								<span aria-hidden="true">
									<CoverageDots values={[false]} size="sm" />
								</span>
								Round below target
							</span>
						</p>
						<p>
							Target: {target.roundsPerZone} rounds per zone, {target.observationsPerRound} or more
							observations in each (illustrative)
						</p>
					</div>
				) : undefined
			}>
			<PreviewStateView
				loadingLabel="Loading coverage…"
				rows={3}
				headingLevel={3}
				empty={{
					body: "This site has no map. Upload a QGIS package to give observers something to collect on.",
					actions: (
						<ButtonLink href={sitesHref} variant="outline" icon="map">
							Open sites
						</ButtonLink>
					)
				}}>
				{!site ? (
					<div className="border-t border-rule px-island-pad py-6 type-body text-ink-2">
						No site has a map package yet, so there is no coverage to show.
					</div>
				) : (
					<>
						<div className="px-island-pad pb-5">
							<MapFrame
								site={site}
								surface="panel"
								mapVersion={mapVersion}
								subtitle="Dots show rounds that met the target"
								zones={zoneStyles}>
								{/* Invisible zone shapes over the plan, so hovering a zone highlights its row. */}
								<g aria-hidden="true">
									{site.zones.map(zone => (
										<path
											key={zone.id}
											d={ringPath(zone.points)}
											fill="none"
											pointerEvents="all"
											onPointerEnter={() => setHovered(zone.id)}
											onPointerLeave={() =>
												setHovered(current => (current === zone.id ? null : current))
											}
										/>
									))}
								</g>
							</MapFrame>
						</div>
						<div className="border-t border-rule">
							<Table caption={`Coverage by zone and round at ${siteName}`}>
								<THead>
									<tr>
										<Th>Zone</Th>
										{rounds.map(round => (
											<Th key={round}>Round {round}</Th>
										))}
										<Th>On target</Th>
										<Th>Status</Th>
									</tr>
								</THead>
								<TBody>
									{coverage.map(entry => (
										<Tr
											key={entry.zone.id}
											onPointerEnter={() => setHovered(entry.zone.id)}
											onPointerLeave={() =>
												setHovered(current => (current === entry.zone.id ? null : current))
											}
											onFocus={() => setHovered(entry.zone.id)}
											onBlur={() =>
												setHovered(current => (current === entry.zone.id ? null : current))
											}
											className={cx(hovered === entry.zone.id && "bg-ground")}>
											<Td>
												<TextLink tone="ink" href={zoneHrefs[entry.zone.slug] ?? siteHref}>
													{entry.zone.name}
												</TextLink>
											</Td>
											{rounds.map((round, index) => {
												const met = entry.met[index] ?? false;
												const count = entry.perRound[index] ?? 0;
												return (
													<Td key={round} nowrap>
														<span className="inline-flex items-center gap-2">
															<CoverageDots
																values={[met]}
																size="sm"
																label={`Round ${round}: ${count} ${count === 1 ? "observation" : "observations"}, ${met ? "met the target" : "below target"}`}
															/>
															<span aria-hidden="true" className="type-mono-data">
																{count}
															</span>
														</span>
													</Td>
												);
											})}
											<Td mono nowrap>
												{entry.onTarget} / {target.roundsPerZone}
											</Td>
											<Td>
												<StateBadge kind="coverage" state={entry.status} size="sm" />
											</Td>
										</Tr>
									))}
								</TBody>
							</Table>
						</div>
					</>
				)}
			</PreviewStateView>
		</Island>
	);
}
