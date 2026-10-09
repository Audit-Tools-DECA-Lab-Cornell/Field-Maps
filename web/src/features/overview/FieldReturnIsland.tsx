import { FactsList } from "@/components/contour/FactsList";
import { Island } from "@/components/contour/Island";
import { Note } from "@/components/contour/Note";
import { LoadFailure } from "@/components/shell/LoadFailure";
import { CountBars } from "@/features/reports/CountBars";
import type { ObservationRow, Site } from "@/lib/api/types";
import { formatCount, plural } from "@/lib/labels";
import { fieldReturn, OBSERVATION_LIMIT } from "@/lib/observations/summary";
import type { Clock } from "@/lib/time";
import type { Result } from "@/lib/workspace/types";

export type FieldReturnIslandProps = {
	sites: Result<readonly Site[]>;
	observations: Result<{ rows: readonly ObservationRow[]; limited: boolean }>;
	nowIso: string;
	clock: Clock;
	/** The Data page's address; each site's bar opens its records. */
	dataHref: string;
};

/**
 * The field return: what the project's sites hold, as one sentence with its caveat. The total adds up each
 * site's own exact count. Today, the last 7 days and the last time something arrived come from the
 * observation list, which stops at 500, and the island says so when it does.
 */
export function FieldReturnIsland({ sites, observations, nowIso, clock, dataHref }: FieldReturnIslandProps) {
	if (!sites.ok) return <LoadFailure failure={sites.failure} what="the field return" />;

	const listed = observations.ok ? observations.data.rows : [];
	const summary = fieldReturn(sites.data, listed, nowIso, clock);
	const limited = observations.ok && observations.data.limited;
	const withRecords = summary.bySite.filter(site => site.count > 0);

	let sentence = "No observations have come back yet.";
	if (summary.total > 0)
		sentence =
			withRecords.length === 1
				? `${plural(summary.total, "observation")} at ${withRecords[0]!.name}.`
				: `${plural(summary.total, "observation")} across ${plural(withRecords.length, "site")}.`;

	const last7 = summary.recentIsExact ? formatCount(summary.last7Days) : `At least ${formatCount(summary.last7Days)}`;

	return (
		<Island flush aria-labelledby="field-return-title">
			<div className="grid gap-x-14 gap-y-8 p-island-pad lg:grid-cols-[minmax(0,1.45fr)_minmax(0,1fr)]">
				<div className="flex min-w-0 flex-col">
					<p className="type-mono-label text-ink-2">Field return</p>
					<h2 id="field-return-title" className="mt-2 type-section text-ink">
						{sentence}
					</h2>
					<p className="mt-3 max-w-prose type-body text-ink-2">
						The total adds up every site&apos;s own count. Records still on devices are not counted here.
					</p>
					<div className="mt-6">
						{observations.ok ? (
							<FactsList
								labelWidth="minmax(8rem, 40%)"
								items={[
									{
										label: "Last received",
										value: summary.lastReceivedAt
											? clock.relativeDayTime(summary.lastReceivedAt, nowIso)
											: "Nothing received yet"
									},
									{ label: "Observed today", value: formatCount(summary.today) },
									{ label: "Observed in the last 7 days", value: last7 }
								]}
							/>
						) : (
							<LoadFailure failure={observations.failure} what="recent observations" bare />
						)}
					</div>
					{limited && (
						<Note className="mt-4" title={`Based on the newest ${OBSERVATION_LIMIT} observations.`}>
							Last received, today and the last 7 days come from them. The total above counts every
							observation.
						</Note>
					)}
					<p className="mt-4 type-small text-ink-2">
						Days and times use the project&apos;s time zone, {clock.timeZone}.
					</p>
				</div>

				{summary.bySite.length > 1 && (
					<div className="flex min-w-0 flex-col gap-3">
						<h3 className="type-mono-label text-ink-2">By site</h3>
						<CountBars
							label="Observations by site"
							rows={summary.bySite.map(site => ({
								key: site.code,
								label: site.name,
								value: site.count,
								href: `${dataHref}?site=${encodeURIComponent(site.code)}`
							}))}
						/>
					</div>
				)}
			</div>
		</Island>
	);
}
