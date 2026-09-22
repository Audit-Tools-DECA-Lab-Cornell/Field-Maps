"use client";

import { Chip } from "@/components/nocturne/chrome";
import { formatTime } from "@/lib/format";
import { RECORD_STATES } from "@/lib/states";
import type { Observation } from "@/types/domain";

/**
 * The same records the map is showing, in the order they were collected. Clicking a row selects
 * the same record a marker would; the two never disagree, because they read one filtered set.
 */
export function ObservationTable({
	records,
	selectedId,
	onSelect
}: {
	readonly records: readonly Observation[];
	readonly selectedId: string | null;
	readonly onSelect: (id: string) => void;
}) {
	return (
		<table className="w-full border-collapse text-caption">
			<caption className="sr-only">Observations matching the current filters, most recent first</caption>
			<thead className="sticky top-0 z-10 bg-bg">
				<tr className="border-b border-rule text-left text-micro text-neutral-500">
					<Th className="w-[7.5rem]">Record</Th>
					<Th className="w-16">Time</Th>
					<Th className="w-14">Zone</Th>
					<Th className="w-16">Round</Th>
					<Th>Play type</Th>
					<Th className="w-20">Observer</Th>
					<Th className="w-32">State</Th>
				</tr>
			</thead>
			<tbody>
				{records.map(record => {
					const badge = RECORD_STATES[record.state];
					const selected = record.id === selectedId;
					return (
						<tr
							key={record.id}
							onClick={() => onSelect(record.id)}
							className={`border-b border-rule-faint [content-visibility:auto] [contain-intrinsic-size:auto_34px] ${
								selected ? "bg-accent-900/50" : "hover:bg-ink-tint"
							}`}>
							<td className="p-0">
								{/* The row's hit target is a real button, so the keyboard reaches every record. */}
								<button
									type="button"
									onClick={event => {
										event.stopPropagation();
										onSelect(record.id);
									}}
									aria-current={selected ? "true" : undefined}
									className={`tnum w-full border-l-2 px-base py-tight text-left ${
										selected
											? "border-l-accent text-accent-100"
											: "border-l-transparent text-neutral-200"
									}`}
									translate="no">
									{record.id}
								</button>
							</td>
							<Td className="tnum text-neutral-400">{formatTime(record.observedAt)}</Td>
							<Td className="text-neutral-400">{record.zoneId}</Td>
							<Td className="tnum text-neutral-400">{record.round}</Td>
							<Td className="text-neutral-200">
								<span className="block truncate">{record.playType}</span>
							</Td>
							<Td className="text-neutral-400">{record.observerCode}</Td>
							<Td>
								<Chip tone={badge.tone} glyph={badge.glyph}>
									{badge.label}
								</Chip>
							</Td>
						</tr>
					);
				})}
			</tbody>
		</table>
	);
}

function Th({ children, className = "" }: { readonly children: React.ReactNode; readonly className?: string }) {
	return (
		<th scope="col" className={`px-base py-tight font-normal ${className}`}>
			{children}
		</th>
	);
}

function Td({ children, className = "" }: { readonly children: React.ReactNode; readonly className?: string }) {
	return <td className={`min-w-0 px-base py-tight ${className}`}>{children}</td>;
}
