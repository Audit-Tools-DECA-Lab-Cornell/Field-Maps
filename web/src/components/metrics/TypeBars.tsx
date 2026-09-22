import type { TypeTally } from "@/lib/analysis";
import { formatCount } from "@/lib/format";

/**
 * “Does play type distribution differ by zone?”
 *
 * Nine categories and one accent is not a colour problem to solve — it is a form problem. The
 * answer is small multiples on a shared scale: identity comes from the row label, magnitude from
 * the bar, and every bar is the same hue. No legend is needed, because nothing is encoded in
 * colour at all.
 */
export function TypeBars({
	title,
	total,
	tallies,
	scaleMax
}: {
	readonly title: string;
	readonly total: number;
	readonly tallies: readonly TypeTally[];
	readonly scaleMax: number;
}) {
	return (
		<figure className="m-0 min-w-0">
			<figcaption className="flex items-baseline justify-between gap-snug border-b border-rule-faint pb-tight">
				<span className="truncate text-detail text-neutral-300">{title}</span>
				<span className="tnum shrink-0 text-micro text-neutral-500">{formatCount(total)}</span>
			</figcaption>
			<dl className="m-0 mt-snug grid grid-cols-[minmax(0,7rem)_minmax(0,1fr)_auto] items-center gap-x-snug gap-y-tight">
				{tallies.map(tally => (
					<div key={tally.type} className="contents">
						<dt className="min-w-0 truncate text-micro text-neutral-500">{tally.type}</dt>
						<dd className="m-0 h-[7px] min-w-0 rounded-sm bg-neutral-900">
							<div
								className="h-full rounded-r-sm bg-accent-600"
								style={{ width: scaleMax === 0 ? "0%" : `${(tally.count / scaleMax) * 100}%` }}
							/>
						</dd>
						<dd className="tnum m-0 text-micro text-neutral-400">{formatCount(tally.count)}</dd>
					</div>
				))}
			</dl>
		</figure>
	);
}
