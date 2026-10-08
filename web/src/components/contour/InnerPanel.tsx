import type { HTMLAttributes, ReactNode } from "react";

import { cx } from "@/lib/cx";

export type InnerPanelProps = {
	/** A dashed edge: a slot for something that does not exist yet (the QR code, store links, a missing map). */
	dashed?: boolean;
	/** plain: an edge on the island. well: a recessed fill with no edge, for a code or an address to copy. */
	tone?: "plain" | "well";
	/** No padding, for content that runs to the edges. */
	flush?: boolean;
	className?: string;
	children?: ReactNode;
} & HTMLAttributes<HTMLDivElement>;

/** A panel inside an island. It has no ledge: only islands stand on the ground. */
export function InnerPanel({
	dashed = false,
	tone = "plain",
	flush = false,
	className,
	children,
	...rest
}: InnerPanelProps) {
	return (
		<div
			{...rest}
			className={cx(
				"min-w-0 rounded-panel",
				tone === "well" && "bg-well",
				dashed ? "border border-dashed border-edge" : tone === "plain" && "border border-line",
				!flush && "p-4",
				className
			)}>
			{children}
		</div>
	);
}
