import type { HTMLAttributes, ReactNode } from "react";

import { cx } from "@/lib/cx";

export type Fact = {
	label: ReactNode;
	value: ReactNode;
	/** Set the value in mono: versions, sizes, codes, identifiers. */
	mono?: boolean;
};

export type FactsListProps = {
	items: Fact[];
	/** Width of the label column as a CSS length. Defaults to 10rem. */
	labelWidth?: string;
	className?: string;
} & Omit<HTMLAttributes<HTMLDListElement>, "children">;

/**
 * Label and value pairs in ruled rows (system-05): secondary labels on the left, values in ink on the
 * right. The first and last rows sit flush with the list's edges, so the container's padding decides
 * the space around it.
 */
export function FactsList({ items, labelWidth = "10rem", className, style, ...rest }: FactsListProps) {
	return (
		<dl
			{...rest}
			style={{ gridTemplateColumns: `${labelWidth} minmax(0, 1fr)`, ...style }}
			className={cx("grid gap-x-4 divide-y divide-rule type-body", className)}>
			{items.map((fact, index) => (
				<div key={index} className="col-span-2 grid grid-cols-subgrid items-baseline py-2 first:pt-0 last:pb-0">
					{/* Plain spaces keep a label and its value, and one row and the next, apart when read as text. */}
					<dt className="min-w-0 text-ink-2">{fact.label}</dt>{" "}
					<dd className={cx("min-w-0 text-ink", fact.mono && "type-mono-data")}>{fact.value}</dd>{" "}
				</div>
			))}
		</dl>
	);
}
