import { cx } from "@/lib/cx";

/** The words a screen reader hears for a row of coverage dots: "2 of 3 rounds met the target". */
export function coverageSummary(values: readonly boolean[]): string {
	const met = values.filter(Boolean).length;
	return `${met} of ${values.length} ${values.length === 1 ? "round" : "rounds"} met the target`;
}

export type CoverageDotsProps = {
	/** One entry per round: true when the round met the target. */
	values: boolean[];
	layout?: "row" | "grid";
	/** Dots per row in the grid layout. */
	columns?: number;
	/**
	 * ink: black dots for tables and legends. map: no colour of its own; the map passes its zone colour
	 * from the map palette through className, since UI colours never appear on a map.
	 */
	tone?: "ink" | "map";
	size?: "sm" | "md";
	/** Replace the spoken summary, for a single legend dot ("Round met the target"). */
	label?: string;
	className?: string;
};

const DOT = { sm: "size-2.5", md: "size-3" } as const;
const GAP = { sm: "gap-1", md: "gap-1.5" } as const;

/** Rounds against the coverage target: a filled dot for a round that met it, a hollow ring for one below it. */
export function CoverageDots({
	values,
	layout = "row",
	columns = 3,
	tone = "ink",
	size = "md",
	label,
	className
}: CoverageDotsProps) {
	const grid = layout === "grid";
	return (
		<span className={cx("inline-flex", tone === "ink" && "text-ink", className)}>
			<span
				aria-hidden="true"
				className={cx(grid ? "grid" : "inline-flex items-center", GAP[size])}
				style={grid ? { gridTemplateColumns: `repeat(${columns}, max-content)` } : undefined}>
				{values.map((met, index) => (
					<span
						key={index}
						className={cx(
							"block shrink-0 rounded-pill",
							DOT[size],
							met ? "bg-current" : "border-2 border-current"
						)}
					/>
				))}
			</span>
			<span className="sr-only">{label ?? coverageSummary(values)}</span>
		</span>
	);
}
