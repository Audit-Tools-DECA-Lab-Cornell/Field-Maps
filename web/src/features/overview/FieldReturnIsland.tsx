"use client";

import Link from "next/link";

import { Island } from "@/components/contour/Island";
import { StateBadge } from "@/components/contour/StateBadge";
import { countWord, plural } from "@/features/data/filters";
import { useReviews } from "@/features/data/review";
import { projectHref } from "@/features/shell/navigation";
import { PreviewStateView } from "@/features/shell/PreviewStateView";
import { countBy, DEVICE_RECORDS, observationsFor, type Project, ZONES } from "@/fixtures";

/** A state that is also a way in: its words link to the records it counts. */
const STATE_LINK = "group rounded-pill";
const STATE_WORDS = "underline-offset-4 group-hover:underline";

/**
 * The field return (project-01): what the server holds, as a sentence with its caveat, the review and
 * upload states as links into Data, and the records by primary play type. Every number is derived from the
 * observation rows and the session's review decisions.
 */
export function FieldReturnIsland({ org, project }: { org: string; project: Project }) {
	const { reviewOf } = useReviews();
	const records = observationsFor(project.slug);
	const zoneSlugs = new Set(records.map(record => record.zoneSlug));
	const projectZones = new Set(
		ZONES.filter(zone => records.some(record => record.siteSlug === zone.siteSlug)).map(zone => zone.slug)
	);
	const corrections = DEVICE_RECORDS.filter(
		record => record.state === "attention" && projectZones.has(record.zoneSlug)
	).length;
	const counts = { notReviewed: 0, approved: 0, excluded: 0 };
	for (const record of records) counts[reviewOf(record)] += 1;
	const types = countBy(records, record => record.playType).map(entry => ({
		code: entry.key,
		label: records.find(record => record.playType === entry.key)?.playTypeLabel ?? entry.key,
		count: entry.count
	}));
	const max = Math.max(0, ...types.map(type => type.count));
	const data = projectHref(org, project.slug, "data");
	const { roundsPerZone } = project.target;

	const sentence =
		records.length === 0
			? "No observations have come back yet."
			: `${records.length} ${plural(records.length, "observation")} across ${countWord(zoneSlugs.size)} ${plural(zoneSlugs.size, "zone")}.`;

	return (
		<Island flush aria-labelledby="field-return-title">
			<PreviewStateView
				loadingLabel="Loading the field return…"
				rows={3}
				headingLevel={2}
				empty={{
					icon: "list",
					title: "Nothing has come back from the field yet",
					body: "Observations appear here once observers upload them from the app. Records still on devices are not counted here."
				}}>
				<div className="grid gap-x-14 gap-y-8 p-island-pad lg:grid-cols-[minmax(0,1.45fr)_minmax(0,1fr)]">
					<div className="flex min-w-0 flex-col">
						<p className="type-mono-label text-ink-2">Field return</p>
						<h2 id="field-return-title" className="mt-2 type-section text-ink">
							{sentence}
						</h2>
						<p className="mt-3 max-w-prose type-body text-ink-2">
							Coverage is compared with an illustrative target of {roundsPerZone} rounds per zone. Record
							abundance is not completeness.
						</p>
						<ul className="mt-5 flex flex-wrap items-center gap-x-6 gap-y-3">
							{corrections > 0 && (
								<li>
									<a href="#blocking" className={STATE_LINK}>
										<StateBadge
											kind="queue"
											className={STATE_WORDS}
											state="attention"
											label={`${corrections} ${plural(corrections, "upload needs", "uploads need")} a correction`}
										/>
									</a>
								</li>
							)}
							<li>
								<Link href={`${data}?review=notReviewed`} className={STATE_LINK}>
									<StateBadge
										kind="review"
										className={STATE_WORDS}
										state="notReviewed"
										label={`${counts.notReviewed} not yet reviewed`}
									/>
								</Link>
							</li>
							<li>
								<Link href={`${data}?review=approved`} className={STATE_LINK}>
									<StateBadge
										kind="review"
										className={STATE_WORDS}
										state="approved"
										label={`${counts.approved} approved`}
									/>
								</Link>
							</li>
							{counts.excluded > 0 && (
								<li>
									<Link href={`${data}?review=excluded`} className={STATE_LINK}>
										<StateBadge
											kind="review"
											className={STATE_WORDS}
											state="excluded"
											label={`${counts.excluded} excluded`}
										/>
									</Link>
								</li>
							)}
						</ul>
					</div>

					{types.length > 0 && (
						<div className="flex min-w-0 flex-col gap-3">
							<p id="field-return-types" className="type-mono-label text-ink-2">
								By primary play type
							</p>
							{/* TypeBars' own markup, with each label a link into Data filtered to that type. */}
							<dl
								aria-labelledby="field-return-types"
								className="grid grid-cols-[fit-content(40%)_minmax(0,1fr)_auto] items-center gap-x-8 gap-y-2 type-body text-ink">
								{types.map(type => (
									<div key={type.code} className="col-span-3 grid grid-cols-subgrid items-center">
										<dt className="min-w-0">
											<Link
												href={`${data}?type=${type.code}`}
												className="underline-offset-4 hover:underline">
												{type.label}
											</Link>
										</dt>
										<dd aria-hidden="true" className="h-2.5 rounded-pill bg-well">
											<span
												className="block h-full rounded-pill bg-ink"
												style={{ width: `${max > 0 ? (type.count / max) * 100 : 0}%` }}
											/>
										</dd>
										<dd className="tnum text-right type-mono-data">{type.count}</dd>
									</div>
								))}
							</dl>
						</div>
					)}
				</div>
			</PreviewStateView>
		</Island>
	);
}
