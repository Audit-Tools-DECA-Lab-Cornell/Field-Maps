"use client";

import type { ReactNode } from "react";

import { Table, TBody, Td, Th, THead, Tr } from "@/components/contour/Table";
import { cx } from "@/lib/cx";

/* Shared pieces of the Sites and Map packages screens. */

/** A mono eyebrow over a value: "MAP PACKAGE", "ZONES". */
export function Eyebrow({ children, className }: { children: ReactNode; className?: string }) {
	return <p className={cx("type-mono-label text-ink-2", className)}>{children}</p>;
}

export type Column<T> = {
	key: string;
	label: string;
	cell: (row: T) => ReactNode;
	mono?: boolean;
	numeric?: boolean;
	nowrap?: boolean;
	className?: string;
	/** Leave this column out of the stacked card, when the card's heading already says it. */
	hideInCard?: boolean;
};

export type RowsTableProps<T> = {
	caption: string;
	columns: Column<T>[];
	rows: T[];
	rowKey: (row: T) => string;
	/** The row drawn as selected: a well fill and the ink bar. */
	selectedKey?: string | null;
	/** Below 640 px each row becomes a card headed by this column. */
	cardTitle: (row: T) => ReactNode;
	className?: string;
};

/**
 * An island table that stacks below 640 px (DESIGN §4): each row becomes a card with its title on top
 * and the other columns as label and value lines. Put it in a flush Island.
 */
export function RowsTable<T>({ caption, columns, rows, rowKey, selectedKey, cardTitle, className }: RowsTableProps<T>) {
	return (
		<div className={className}>
			<div className="hidden sm:block">
				<Table caption={caption}>
					<THead>
						<tr>
							{columns.map(column => (
								<Th key={column.key} numeric={column.numeric} className={column.className}>
									{column.label}
								</Th>
							))}
						</tr>
					</THead>
					<TBody>
						{rows.map(row => (
							<Tr key={rowKey(row)} selected={selectedKey === rowKey(row)}>
								{columns.map(column => (
									<Td
										key={column.key}
										mono={column.mono}
										numeric={column.numeric}
										nowrap={column.nowrap}
										className={column.className}>
										{column.cell(row)}
									</Td>
								))}
							</Tr>
						))}
					</TBody>
				</Table>
			</div>
			<ul aria-label={caption} className="divide-y divide-rule sm:hidden">
				{rows.map(row => (
					<li
						key={rowKey(row)}
						className={cx(
							"flex flex-col gap-2 px-island-pad py-4",
							selectedKey === rowKey(row) && "bg-well selected-bar"
						)}>
						<div className="type-body font-semibold text-ink">{cardTitle(row)}</div>
						<dl className="grid grid-cols-[minmax(0,2fr)_minmax(0,3fr)] gap-x-4 gap-y-1">
							{columns
								.filter(column => !column.hideInCard)
								.map(column => (
									<div key={column.key} className="col-span-2 grid grid-cols-subgrid items-baseline">
										<dt className="type-mono-label text-ink-2">{column.label}</dt>
										<dd
											className={cx(
												"min-w-0 text-ink",
												column.mono ? "type-mono-data" : "type-body"
											)}>
											{column.cell(row)}
										</dd>
									</div>
								))}
						</dl>
					</li>
				))}
			</ul>
		</div>
	);
}
