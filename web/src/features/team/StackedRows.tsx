import type { ReactNode } from "react";

import { cx } from "@/lib/cx";

export type StackedRow = {
	key: string;
	/** The row's name: the first column of the table. */
	title: ReactNode;
	/** A state or count on the right of the title. */
	aside?: ReactNode;
	/** The other columns, as label and value lines. */
	fields: { label: string; value: ReactNode; mono?: boolean }[];
	actions?: ReactNode;
	/** Something shown under the row, such as an inline confirmation. */
	after?: ReactNode;
};

/**
 * A table's rows as cards, for screens narrower than 640 px (DESIGN §5, DataTable stacking): the name and
 * its state on top, the other columns as label and value lines, then the row's actions. Pair it with the
 * table wrapped in `hidden sm:block`; this list hides itself from 640 px up.
 */
export function StackedRows({ rows, label, className }: { rows: StackedRow[]; label: string; className?: string }) {
	return (
		<ul aria-label={label} className={cx("divide-y divide-rule border-t border-rule sm:hidden", className)}>
			{rows.map(row => (
				<li key={row.key} className="flex flex-col gap-3 px-island-pad py-4">
					<div className="flex items-start justify-between gap-3">
						<div className="min-w-0">{row.title}</div>
						{row.aside != null && <div className="shrink-0">{row.aside}</div>}
					</div>
					{row.fields.length > 0 && (
						<dl className="grid grid-cols-[minmax(0,2fr)_minmax(0,3fr)] gap-x-3 gap-y-1.5 type-small">
							{row.fields.map(field => (
								<div key={field.label} className="col-span-2 grid grid-cols-subgrid items-baseline">
									<dt className="text-ink-2">{field.label}</dt>
									<dd className={cx("min-w-0 text-ink", field.mono ? "type-mono-data" : "type-body")}>
										{field.value}
									</dd>
								</div>
							))}
						</dl>
					)}
					{row.actions != null && <div className="flex flex-wrap items-center gap-3">{row.actions}</div>}
					{row.after}
				</li>
			))}
		</ul>
	);
}
