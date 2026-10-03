import { type ReactNode, useId } from "react";

import { cx } from "@/lib/cx";

export type ProgressBarProps = {
	/** Work done, in the same unit as max. */
	value: number;
	max: number;
	/** What is moving ("Map package v4"). Names the progress bar. */
	label: string;
	/** The amount in words, set in mono ("60 of 126 MB"). A string detail is also what a screen reader hears. */
	detail?: ReactNode;
	className?: string;
};

/**
 * Determinate progress only: a part that cannot say how far it is says so in words instead. The fill
 * follows the reported value; it never runs ahead of it.
 */
export function ProgressBar({ value, max, label, detail, className }: ProgressBarProps) {
	const labelId = useId();
	const ceiling = Math.max(max, 0);
	const current = Math.min(Math.max(value, 0), ceiling);
	const share = ceiling > 0 ? current / ceiling : 0;

	return (
		<div className={cx("flex flex-col gap-2", className)}>
			<div className="flex flex-wrap items-baseline justify-between gap-x-4">
				<span id={labelId} className="font-semibold text-ink">
					{label}
				</span>
				{detail != null && <span className="type-mono-data text-ink-2">{detail}</span>}
			</div>
			<div
				role="progressbar"
				aria-labelledby={labelId}
				aria-valuemin={0}
				aria-valuemax={ceiling}
				aria-valuenow={current}
				aria-valuetext={typeof detail === "string" ? detail : undefined}
				className="h-2.5 overflow-hidden rounded-pill bg-well">
				<div
					className="h-full rounded-pill bg-uploaded transition-[width] duration-(--ct-duration-base) ease-linear"
					style={{ width: `${share * 100}%` }}
				/>
			</div>
		</div>
	);
}
