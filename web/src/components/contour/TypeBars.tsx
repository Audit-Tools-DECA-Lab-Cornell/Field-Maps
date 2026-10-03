import type { HTMLAttributes } from "react";

import { cx } from "@/lib/cx";

export type TypeBarRow = { label: string; value: number };

export type TypeBarsProps = {
	rows: TypeBarRow[];
	/** The value of a full bar. Defaults to the largest row, so bars compare within the list. */
	max?: number;
	className?: string;
} & Omit<HTMLAttributes<HTMLDListElement>, "children">;

/**
 * Counts by category as bars on one scale (project-01, "By primary play type"): label, bar, count.
 * The bar is data, drawn still; the count beside it is what a screen reader hears.
 */
export function TypeBars({ rows, max, className, ...rest }: TypeBarsProps) {
	const scale = max ?? Math.max(0, ...rows.map(row => row.value));

	return (
		<dl
			{...rest}
			className={cx(
				"grid grid-cols-[fit-content(40%)_minmax(0,1fr)_auto] items-center gap-x-8 gap-y-2 type-body text-ink",
				className
			)}>
			{rows.map(row => {
				const share = scale > 0 ? Math.min(Math.max(row.value / scale, 0), 1) : 0;
				return (
					<div key={row.label} className="col-span-3 grid grid-cols-subgrid items-center">
						<dt className="min-w-0">{row.label}</dt>
						<dd aria-hidden="true" className="h-2.5 rounded-pill bg-well">
							<span className="block h-full rounded-pill bg-ink" style={{ width: `${share * 100}%` }} />
						</dd>
						<dd className="tnum text-right">{row.value}</dd>
					</div>
				);
			})}
		</dl>
	);
}
