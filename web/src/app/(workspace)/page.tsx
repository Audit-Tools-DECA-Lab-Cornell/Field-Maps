import Link from "next/link";

import { PageHeader, StatTile } from "@/components/app-shell/PageHeader";
import { CoverageTable } from "@/components/metrics/CoverageTable";
import { TypeBars } from "@/components/metrics/TypeBars";
import {
	AttentionNote,
	Chip,
	FadeRule,
	LinkAction,
	Prose,
	RowButton,
	RowHeading,
	SectionLabel
} from "@/components/nocturne/chrome";
import { BASEMAP_PACKAGES } from "@/data/basemaps";
import { BLOCKING_FLAGS, DRAFT_VERSION, flagById } from "@/data/instrument";
import { OBSERVATIONS, ROUND_TARGET } from "@/data/observations";
import { ACTIVE_SITE, PROJECT, SITES } from "@/data/project";
import { coverage, typeDistributionByZone } from "@/lib/analysis";
import { formatCount, formatDateTime, plural } from "@/lib/format";
import { RECORD_STATES, SITE_STATES } from "@/lib/states";

export const metadata = { title: "Overview" };

export default function OverviewPage() {
	const matrix = coverage(OBSERVATIONS, ROUND_TARGET);
	const byZone = typeDistributionByZone(OBSERVATIONS);
	const scaleMax = Math.max(1, ...byZone.flatMap(zone => zone.tallies.map(tally => tally.count)));

	const flagged = OBSERVATIONS.filter(record => record.state === "flagged");
	const withdrawn = OBSERVATIONS.filter(record => record.state === "withdrawn");
	const revised = OBSERVATIONS.filter(record => record.state === "revised");
	const recent = [...OBSERVATIONS].slice(0, 6);

	const blockedSites = SITES.filter(site => site.state === "blocked");
	const blockedPackages = BASEMAP_PACKAGES.filter(pkg => pkg.state === "blocked" || pkg.state === "warning");

	return (
		<div className="min-h-0 flex-1 overflow-y-auto">
			<PageHeader
				kicker={PROJECT.name}
				title={`${plural(OBSERVATIONS.length, "observation")} from ${ACTIVE_SITE.name}`}
				lead={PROJECT.summary}
			/>

			<div className="px-gutter pb-page">
				<AttentionNote
					title="These screens read local fixtures, not the database"
					body="The collector’s uploads are real and QGIS reads them, but this application has not been connected to the API. Every record, count and chart below is generated in the browser from a fixed seed, previewing how this workspace will read once janet-test-v1 is published — the database itself holds two shell-v1 practice records today. Nothing here has been written anywhere.">
					<div className="mt-tight">
						<LinkAction href="/qgis">See what is actually connected</LinkAction>
					</div>
				</AttentionNote>

				<div className="mt-wide grid grid-cols-2 gap-loose sm:grid-cols-4">
					{/* Not "in the database": the notice above says the database holds two shell-v1 records,
					    and a tile that claims otherwise is the contradiction this workspace exists to avoid. */}
					<StatTile
						label="Counting for analysis"
						value={formatCount(OBSERVATIONS.length - withdrawn.length)}
						detail={`${formatCount(withdrawn.length)} withdrawn, ${formatCount(revised.length)} revised`}
					/>
					<StatTile
						label="Flagged by a check"
						value={formatCount(flagged.length)}
						detail="Kept, exported, never auto-corrected"
						tone={flagged.length > 0 ? "attention" : "text"}
					/>
					<StatTile
						label="Rounds under target"
						value={`${formatCount(matrix.thinCells)} of ${formatCount(matrix.rows.length * matrix.rounds.length)}`}
						detail={`Fewer than ${formatCount(ROUND_TARGET)} events`}
						tone={matrix.thinCells > 0 ? "attention" : "text"}
					/>
					<StatTile
						label="Observers collecting"
						value={formatCount(ACTIVE_SITE.observers.length)}
						detail={ACTIVE_SITE.observers.join(" · ")}
					/>
				</div>

				<FadeRule className="my-wide" />

				<div className="grid grid-cols-1 gap-wide lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
					<section>
						<SectionLabel>Research question</SectionLabel>
						<h2 className="mt-tight mb-base text-heading text-text text-balance">
							Is each zone being observed enough times to compare rounds?
						</h2>
						<CoverageTable matrix={matrix} target={ROUND_TARGET} />
					</section>

					<section className="min-w-0">
						<SectionLabel>Research question</SectionLabel>
						<h2 className="mt-tight mb-base text-heading text-text text-balance">
							Does play type distribution differ by zone?
						</h2>
						<div className="grid grid-cols-1 gap-loose sm:grid-cols-3">
							{byZone.map(zone => (
								<TypeBars
									key={zone.zoneId}
									title={zone.label}
									total={zone.total}
									tallies={zone.tallies}
									scaleMax={scaleMax}
								/>
							))}
						</div>
						<Prose tone="faint" className="mt-base">
							Nine play types share one accent and one scale. Identity comes from the row, not the colour,
							so the reading survives greyscale, a sunlit screen and colour blindness alike.
						</Prose>
					</section>
				</div>

				<FadeRule className="my-wide" />

				<div className="grid grid-cols-1 gap-wide lg:grid-cols-2">
					<section>
						<SectionLabel>Waiting on a decision</SectionLabel>
						<h2 className="mt-tight mb-base text-heading text-text">
							{plural(BLOCKING_FLAGS.length + blockedSites.length + blockedPackages.length, "open item")}
						</h2>

						<div>
							<RowButton href="/instrument">
								<RowHeading
									title={`${plural(BLOCKING_FLAGS.length, "variable")} block a clean publish`}
									chip={
										<Chip tone="attention" glyph="⚠">
											{DRAFT_VERSION.code}
										</Chip>
									}
								/>
								<p className="mt-hair text-meta text-neutral-400">
									Colliding export columns, a missing column name, and a rule that cannot be evaluated
									as written.
								</p>
							</RowButton>

							{blockedSites.map(site => (
								<RowButton key={site.id} href="/places">
									<RowHeading
										title={site.name}
										chip={
											<Chip
												tone={SITE_STATES[site.state].tone}
												glyph={SITE_STATES[site.state].glyph}>
												{SITE_STATES[site.state].label}
											</Chip>
										}
									/>
									<p className="mt-hair text-meta text-neutral-400">{site.detail}</p>
								</RowButton>
							))}

							{blockedPackages.map(pkg => (
								<RowButton key={pkg.id} href="/basemaps">
									<RowHeading
										title={pkg.source}
										chip={
											<Chip
												tone={pkg.state === "blocked" ? "attention" : "attention"}
												glyph={pkg.state === "blocked" ? "◼" : "⚠"}>
												{pkg.state === "blocked" ? "Blocked" : "Needs attention"}
											</Chip>
										}
									/>
									<p className="mt-hair text-meta text-neutral-400">{pkg.detail}</p>
								</RowButton>
							))}
						</div>
					</section>

					<section>
						<SectionLabel>Most recent</SectionLabel>
						<h2 className="mt-tight mb-base text-heading text-text">What came back from the field</h2>
						<div>
							{recent.map(record => {
								const badge = RECORD_STATES[record.state];
								const flag = flagById(record.flagId);
								return (
									<RowButton key={record.id} href={`/observations?record=${record.id}`}>
										<RowHeading
											title={
												<span className="tnum" translate="no">
													{record.id}
												</span>
											}
											chip={
												<Chip tone={badge.tone} glyph={badge.glyph}>
													{badge.label}
												</Chip>
											}
										/>
										<p className="mt-hair text-meta text-neutral-400">
											{record.playType} · Zone {record.zoneId} · Round {record.round} ·{" "}
											{record.observerCode} · {formatDateTime(record.observedAt)}
										</p>
										{flag !== undefined && (
											<p className="mt-hair text-micro text-attention-text">⚠ {flag.label}</p>
										)}
									</RowButton>
								);
							})}
						</div>
						<div className="mt-base">
							<Link href="/observations" className="text-detail text-accent-300 hover:opacity-70">
								Open all {formatCount(OBSERVATIONS.length)} observations
							</Link>
						</div>
					</section>
				</div>
			</div>
		</div>
	);
}
