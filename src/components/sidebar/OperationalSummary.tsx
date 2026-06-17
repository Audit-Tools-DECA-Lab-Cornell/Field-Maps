"use client";

import { operationalSummary } from "@/lib/filters";
import { useOperationsStore } from "@/state/useOperationsStore";

interface StatTile {
	label: string;
	value: number;
	color: string;
}

function Tile({ label, value, color }: StatTile) {
	return (
		<div
			style={{
				border: "1px solid var(--border)",
				borderRadius: "var(--r-md)",
				background: "var(--surface-2)",
				padding: "8px 10px",
				display: "flex",
				flexDirection: "column",
				gap: 2
			}}>
			<span style={{ fontSize: 20, fontWeight: 700, lineHeight: 1.1, color }}>{value}</span>
			<span
				style={{
					fontSize: 10,
					fontWeight: 700,
					letterSpacing: "0.04em",
					textTransform: "uppercase",
					color: "var(--text-3)"
				}}>
				{label}
			</span>
		</div>
	);
}

export function OperationalSummary() {
	const parcels = useOperationsStore(s => s.parcels);
	const syncEvents = useOperationsStore(s => s.syncEvents);

	const summary = operationalSummary(parcels, syncEvents);

	return (
		<div
			style={{
				padding: "12px 14px",
				borderBottom: "1px solid var(--border)",
				display: "flex",
				flexDirection: "column",
				gap: 10
			}}>
			<div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
				<span className="fo-kicker">Operational summary</span>
				<span style={{ fontSize: 13, fontWeight: 700, color: "var(--text)" }}>Central Valley Demo Region</span>
			</div>
			<div
				style={{
					display: "grid",
					gridTemplateColumns: "1fr 1fr",
					gap: 8
				}}>
				<Tile label="Total parcels" value={summary.total} color="var(--text)" />
				<Tile label="Needs inspection" value={summary.needsInspection} color="var(--amber-fg)" />
				<Tile label="Maintenance required" value={summary.maintenance} color="var(--orange-fg)" />
				<Tile label="Critical / blocked" value={summary.critical} color="var(--red-fg)" />
				<Tile label="Unsynced edits" value={summary.unsynced} color="var(--purple-fg)" />
			</div>
		</div>
	);
}
