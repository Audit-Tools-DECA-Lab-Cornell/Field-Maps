import { FactsList } from "@/components/contour/FactsList";
import { Island } from "@/components/contour/Island";
import { Note } from "@/components/contour/Note";
import { PageHeader } from "@/components/contour/PageHeader";
import { StateBadge } from "@/components/contour/StateBadge";
import { TextLink } from "@/components/contour/TextLink";
import { MapFrame } from "@/components/map/MapFrame";
import type { ZonePlanStyle } from "@/components/map/SitePlan";
import { NotAvailable } from "@/components/shell/NotAvailable";
import { viewQuery } from "@/features/data/view";
import { projectHref } from "@/features/shell/navigation";
import type { RawDefinition, StoredObservation } from "@/lib/api/types";
import { plural, roundLabel, roundOf, shortLabel, zoneName } from "@/lib/labels";
import { answerRows, readDefinition } from "@/lib/observations/answers";
import type { ProjectedSite } from "@/lib/plan";
import { clock as makeClock } from "@/lib/time";

export type ObservationPlan = {
	site: ProjectedSite;
	/** The version of the package the plan is drawn from. */
	version: number;
};

export type ObservationDetailProps = {
	org: string;
	/** The project's code in the address. */
	project: string;
	observation: StoredObservation;
	timeZone: string;
	/** The definition of the form version the observation was collected with; null when it could not be read. */
	definition: RawDefinition | null;
	/** The observation's site, for zone names; null when it could not be read. */
	zones: readonly { id: string; label: string }[] | null;
	plan: ObservationPlan | null;
	/** Why there is no plan. */
	planNote: string | null;
};

function firstRound(observation: StoredObservation): string {
	if (roundOf(observation.round_type) === "inventory") return "Does not apply to a zone inventory";
	if (observation.first_round === true) return "Yes";
	if (observation.first_round === false) return "No";
	return "Not recorded";
}

function placement(observation: StoredObservation): string {
	if (observation.placement === "hand") return "Placed by hand on the map";
	if (observation.placement === "zone") return "Stored at the centre of the zone";
	return "Not recorded";
}

/**
 * One observation: when it was made and by whom, where it sits, and every answer, worded as the form
 * version it was collected with worded it. The page is read-only; the plan draws the point on the site's
 * current map.
 */
export function ObservationDetail({
	org,
	project,
	observation,
	timeZone,
	definition,
	zones,
	plan,
	planNote
}: ObservationDetailProps) {
	const clock = makeClock(timeZone);
	const label = shortLabel(observation.observation_id);
	const round = roundOf(observation.round_type);
	const names = new Map((zones ?? []).map(zone => [zone.id, zone.label]));
	const zone = observation.zone ? observation.zone : null;
	const zoneText = zoneName(zone, names);
	const answers = answerRows(definition, observation.answers);
	const form = readDefinition(definition);
	const [lng, lat] = observation.coordinates;
	const dataHref = projectHref(org, project, "data");

	const zoneStyles: Record<string, ZonePlanStyle> | undefined =
		plan && zone
			? Object.fromEntries(
					plan.site.zones.map(planZone => [
						planZone.id,
						{ emphasis: (planZone.code ?? planZone.id) === zone ? "focus" : "dim" } as ZonePlanStyle
					])
				)
			: undefined;

	return (
		<div className="flex flex-col gap-6">
			<PageHeader
				breadcrumbs={[{ label: "Data", href: dataHref }, { label }]}
				title={label}
				titleMono
				titleAddon={
					<StateBadge
						kind="queue"
						state="uploaded"
						label={`Uploaded ${clock.dayTime(observation.received_at)}`}
					/>
				}
				lead={`Observed ${clock.dayTime(observation.observed_at)} by observer ${observation.observer}.`}
			/>

			<div className="grid gap-6 lg:grid-cols-[minmax(0,46fr)_minmax(0,54fr)] lg:items-start">
				<div className="flex min-w-0 flex-col gap-6">
					{plan ? (
						<Island title="Where it was placed" meta={`${observation.site_name} · Map v${plan.version}`}>
							<div className="flex flex-col gap-4">
								<MapFrame
									site={plan.site}
									surface="panel"
									mapVersion={`v${plan.version}`}
									height={320}
									title={observation.site_name}
									subtitle={`${zoneText} · ${roundLabel(round)}`}
									zones={zoneStyles}
									observations={[
										{
											id: observation.observation_id,
											lng,
											lat,
											label: `${label}, ${zoneText}, ${roundLabel(round)}`
										}
									]}
									selectedId={observation.observation_id}
								/>
								<p className="type-small text-ink-2">
									Drawn on the site&apos;s current map.
									{round === "inventory" &&
										" A zone inventory sits at the centre of its zone. It does not show where play happened."}
								</p>
							</div>
						</Island>
					) : (
						planNote && <Note tone="neutral">{planNote}</Note>
					)}

					<Island flush title="Facts">
						<FactsList
							className="px-island-pad py-4"
							labelWidth="minmax(7rem, 34%)"
							items={[
								{
									label: "Site",
									value: (
										<TextLink
											tone="ink"
											href={projectHref(org, project, `sites/${observation.site_code}`)}>
											{observation.site_name}
										</TextLink>
									)
								},
								{
									label: "Zone",
									value: zone ? (
										<TextLink
											tone="ink"
											href={`${dataHref}${viewQuery({ site: observation.site_code, zone })}`}>
											{zoneText}
										</TextLink>
									) : (
										zoneText
									)
								},
								{ label: "Round", value: roundLabel(round) },
								{ label: "First round", value: firstRound(observation) },
								{ label: "Placement", value: placement(observation) },
								{ label: "Observer", value: observation.observer, mono: true },
								{ label: "Observed", value: clock.dayTime(observation.observed_at) },
								{ label: "Uploaded", value: clock.dayTime(observation.received_at) },
								{
									label: "Form version",
									value: (
										<>
											<span className="type-mono-data">{observation.form_version}</span>
											{form.title && ` · ${form.title}`}
										</>
									)
								},
								{ label: "Revision", value: String(observation.revision), mono: true },
								{
									label: "Latitude, longitude",
									value: `${lat.toFixed(5)}, ${lng.toFixed(5)}`,
									mono: true
								}
							]}
						/>
					</Island>
				</div>

				<div className="flex min-w-0 flex-col gap-6">
					{definition === null && (
						<Note tone="attention" title="The questions for this form version could not be loaded.">
							Answers are shown under their question ids instead of the wording {observation.form_version}{" "}
							gave them.
						</Note>
					)}
					<Island
						flush
						title="Answers"
						meta={plural(answers.length, "answer")}
						footnote="Questions the observer did not see or left blank are not listed.">
						{answers.length === 0 ? (
							<p className="px-island-pad py-6 type-body text-ink-2">This observation has no answers.</p>
						) : (
							<dl className="divide-y divide-rule">
								{answers.map(answer => (
									<div key={answer.questionId} className="flex flex-col gap-1 px-island-pad py-4">
										<dt className="type-small text-ink-2">{answer.label}</dt>
										<dd className="type-body font-semibold wrap-anywhere text-ink">
											{answer.value}
											{!answer.known && definition !== null && (
												<span className="block type-small font-normal text-ink-2">
													{observation.form_version} has no such question.
												</span>
											)}
										</dd>
									</div>
								))}
							</dl>
						)}
					</Island>
					<NotAvailable
						title="Reviewing or excluding observations"
						reason="Every uploaded observation is included in exports."
						instead="To leave one out of an analysis, filter it out of the exported file."
					/>
				</div>
			</div>
		</div>
	);
}
