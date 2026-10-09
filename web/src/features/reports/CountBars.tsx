import type { ReactNode } from "react";

import { TextLink } from "@/components/contour/TextLink";
import { cx } from "@/lib/cx";

export type CountBarRow = {
	key: string;
	label: ReactNode;
	value: number;
	/** Makes the label a link, for a row that opens the records it counts. */
	href?: string;
};

export type CountBarsProps = {
	rows: readonly CountBarRow[];
	/** The value of a full bar. Defaults to the largest row, so bars compare within the list. */
	max?: number;
	/** Names the list for assistive technology: "Observations by round". */
	label: string;
	className?: string;
};

/* A bar is data, so it prints as drawn even when the browser leaves backgrounds out. */
const KEEP_COLOUR = "[-webkit-print-color-adjust:exact] [print-color-adjust:exact]";

/**
 * Counts by category as bars on one scale: label, bar, count. The same drawing as Contour's TypeBars,
 * with a link on a label when a row has one, and with plain spaces between a row's parts so the row also
 * reads as text ("Standard round 4") wherever its text is copied or searched.
 */
export function CountBars({ rows, max, label, className }: CountBarsProps) {
	const scale = max ?? Math.max(0, ...rows.map(row => row.value));
	return (
		<dl
			aria-label={label}
			className={cx(
				"grid grid-cols-[fit-content(45%)_minmax(0,1fr)_auto] items-center gap-x-4 gap-y-2 type-body text-ink sm:gap-x-6",
				className
			)}>
			{rows.map(row => {
				const share = scale > 0 ? Math.min(Math.max(row.value / scale, 0), 1) : 0;
				return (
					<div key={row.key} className="col-span-3 grid grid-cols-subgrid items-center">
						<dt className="min-w-0">
							{row.href ? (
								<TextLink tone="ink" href={row.href}>
									{row.label}
								</TextLink>
							) : (
								row.label
							)}
						</dt>{" "}
						<dd aria-hidden="true" className={cx("h-2.5 rounded-pill bg-well", KEEP_COLOUR)}>
							<span
								className={cx("block h-full rounded-pill bg-ink", KEEP_COLOUR)}
								style={{ width: `${share * 100}%` }}
							/>
						</dd>{" "}
						<dd className="tnum text-right type-mono-data">{row.value}</dd>{" "}
					</div>
				);
			})}
		</dl>
	);
}
