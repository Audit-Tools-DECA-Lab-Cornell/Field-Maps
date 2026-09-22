import { PageHeader } from "@/components/app-shell/PageHeader";
import { AttentionNote, Chip, FadeRule, FieldRow, Prose, SectionLabel } from "@/components/nocturne/chrome";
import { ZonePlan } from "@/components/places/ZonePlan";
import { BASEMAP_PACKAGES } from "@/data/basemaps";
import { OBSERVATIONS } from "@/data/observations";
import { PROJECT, SITES } from "@/data/project";
import { formatCount, plural } from "@/lib/format";
import { PREP_STATES, SITE_STATES } from "@/lib/states";

export const metadata = { title: "Places" };

/**
 * Places: the sites a project collects on and the zones inside them. A zone is not decoration —
 * it is the unit an observation records and a round covers, so drawing one is a protocol decision
 * rather than a drawing exercise.
 */
export default function PlacesPage() {
	return (
		<div className="min-h-0 flex-1 overflow-y-auto">
			<PageHeader
				kicker={PROJECT.name}
				title={`${plural(SITES.length, "place")} in this project`}
				lead="A place is a site and the zones inside it. A zone is what an observation records and what a round covers, so its boundary decides what a count means."
			/>

			<div className="px-gutter pb-page">
				<div className="grid grid-cols-1 gap-wide lg:grid-cols-2 xl:grid-cols-3">
					{SITES.map(site => {
						const badge = SITE_STATES[site.state];
						const records = OBSERVATIONS.filter(record => record.siteId === site.id);
						const pkg = BASEMAP_PACKAGES.find(entry => entry.siteId === site.id);
						return (
							<section key={site.id} className="min-w-0">
								<div className="flex items-baseline justify-between gap-snug">
									<h2 className="min-w-0 truncate text-heading text-text">{site.name}</h2>
									<Chip tone={badge.tone} glyph={badge.glyph}>
										{badge.label}
									</Chip>
								</div>
								<Prose tone="faint" className="mt-hair text-micro">
									{site.detail}
								</Prose>

								<div className="mt-base">
									<ZonePlan zones={site.zones} />
								</div>

								<div className="mt-base" style={{ "--rule-fade": "16px" } as React.CSSProperties}>
									<FieldRow label="Site code" value={<span translate="no">{site.code}</span>} />
									<FieldRow
										label="Zones"
										value={site.zones.map(zone => zone.label.replace(/^Zone /, "")).join(" · ")}
									/>
									<FieldRow
										label="Rounds"
										value={site.rounds.length === 0 ? "Not scheduled" : site.rounds.join(", ")}
										muted={site.rounds.length === 0}
									/>
									<FieldRow
										label="Observers"
										value={
											site.observers.length === 0 ? "None assigned" : site.observers.join(" · ")
										}
										muted={site.observers.length === 0}
									/>
									<FieldRow
										label="Records"
										value={
											records.length === 0 ? (
												"None yet"
											) : (
												<span className="tnum">{formatCount(records.length)}</span>
											)
										}
										muted={records.length === 0}
									/>
									<FieldRow
										label="Base map"
										value={
											pkg === undefined ? (
												"No package prepared"
											) : (
												<span className="flex flex-wrap items-center gap-snug">
													<span translate="no">{pkg.source}</span>
													<Chip
														tone={PREP_STATES[pkg.state].tone}
														glyph={PREP_STATES[pkg.state].glyph}>
														{PREP_STATES[pkg.state].label}
													</Chip>
												</span>
											)
										}
										muted={pkg === undefined}
									/>
								</div>
							</section>
						);
					})}
				</div>

				<FadeRule className="my-wide" />

				<div className="max-w-[70ch]">
					<SectionLabel>What is not built yet</SectionLabel>
					<h2 className="mt-tight mb-base text-heading text-text">Zones are read here, not drawn here</h2>
					<AttentionNote
						title="There is no zone editor, and no site creation"
						body="Zones come from the QGIS project a base map package is prepared from. Drawing them in the browser would put a second authority beside the one QGIS already holds, and the two would drift. When package preparation is real, this section gets a review step rather than a drawing tool."
					/>
					<Prose tone="faint" className="mt-base">
						The three places above are fixtures. Only North Playground exists as geometry, and it is the
						bundled training site both applications carry — not a survey.
					</Prose>
				</div>
			</div>
		</div>
	);
}
