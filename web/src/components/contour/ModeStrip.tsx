"use client";

import { cx } from "@/lib/cx";

export type ModeStripIndex = 0 | 1 | 2;

export type ModeStripProps = {
	/** The three steps of collecting, in order: Place, Answer, Review. */
	steps: [string, string, string];
	current: ModeStripIndex;
	/** Return to a finished step. Without it the strip only shows where the observer is. */
	onSelect?: (index: ModeStripIndex) => void;
	/** Names the list for assistive technology. */
	label?: string;
	className?: string;
};

/* Each step is a third of the track, so the pill's place is a whole multiple of its own width. */
const PILL_PLACE: Record<ModeStripIndex, string> = {
	0: "translate-x-0",
	1: "translate-x-full",
	2: "translate-x-[200%]"
};

/**
 * The collector's step strip, "1 · Place", "2 · Answer", "3 · Review" (system-04): equal steps on an
 * island track, with the current step an ink pill that slides when the step changes. A finished step
 * can be pressed to go back. Each step is announced as "Step 2 of 3, Answer".
 */
export function ModeStrip({ steps, current, onSelect, label = "Collection steps", className }: ModeStripProps) {
	return (
		<div className={cx("rounded-pill border border-line bg-island p-1", className)}>
			<div className="relative">
				{/* The pill's place comes from the step index alone, so the first paint draws it in place. */}
				<span
					aria-hidden="true"
					className={cx(
						"pointer-events-none absolute inset-y-0 left-0 w-1/3 rounded-pill bg-ink",
						"transition-[translate] duration-(--ct-duration-base) ease-standard",
						PILL_PLACE[current]
					)}
				/>
				<ol aria-label={label} className="relative grid grid-cols-3">
					{steps.map((step, position) => {
						const index = position as ModeStripIndex;
						const isCurrent = index === current;
						const classes = cx(
							"relative flex min-h-9 w-full items-center justify-center rounded-pill px-3 py-1.5 text-center text-sm font-semibold",
							"transition-[color,background-color,opacity] duration-(--ct-duration-base) ease-standard",
							isCurrent ? "text-on-ink" : "text-ink"
						);
						const name = (
							<>
								<span aria-hidden="true">
									{index + 1} · {step}
								</span>
								<span className="sr-only">
									Step {index + 1} of 3, {step}
								</span>
							</>
						);

						return (
							<li key={index} aria-current={isCurrent ? "step" : undefined}>
								{onSelect && index < current ? (
									// The ::before box extends the 36 px step to a 44 px target.
									<button
										type="button"
										onClick={() => onSelect(index)}
										className={cx(
											classes,
											"hover:bg-well active:opacity-90",
											"before:absolute before:inset-x-0 before:-inset-y-1"
										)}>
										{name}
									</button>
								) : (
									<span className={classes}>{name}</span>
								)}
							</li>
						);
					})}
				</ol>
			</div>
		</div>
	);
}
