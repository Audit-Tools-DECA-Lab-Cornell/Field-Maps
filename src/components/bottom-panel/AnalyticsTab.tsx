"use client";

import { operationalSummary } from "@/lib/filters";
import { useOperationsStore } from "@/state/useOperationsStore";

interface Metric {
	label: string;
	value: string;
	/** 0..1 fill fraction for the bar. */
	fraction: number;
	color: string;
}

function clamp01(n: number): number {
	if (Number.isNaN(n) || !Number.isFinite(n)) return 0;
	return Math.max(0, Math.min(1, n));
}

function riskColor(score: number): string {
	if (score >= 75) return "var(--red)";
	if (score >= 50) return "var(--orange)";
	return "var(--green)";
}

export function AnalyticsTab() {
	const parcels = useOperationsStore(s => s.parcels);
	const syncEvents = useOperationsStore(s => s.syncEvents);

	const total = parcels.length;
	const healthy = parcels.filter(p => p.properties.status === "healthy").length;
	const inspectionsDue = parcels.filter(p => p.properties.status === "inspection_due").length;
	const openMaintenance = parcels.reduce((sum, p) => sum + p.properties.openMaintenanceCount, 0);
	const unsynced = operationalSummary(parcels, syncEvents).unsynced;
	const avgRisk = total > 0 ? Math.round(parcels.reduce((sum, p) => sum + p.properties.riskScore, 0) / total) : 0;

	const MAINTENANCE_MAX = 6;

	const metrics: Metric[] = [
		{
			label: "Parcels current",
			value: `${healthy} / ${total}`,
			fraction: total > 0 ? healthy / total : 0,
			color: "var(--green)"
		},
		{
			label: "Inspections due",
			value: String(inspectionsDue),
			fraction: total > 0 ? inspectionsDue / total : 0,
			color: "var(--amber)"
		},
		{
			label: "Open maintenance issues",
			value: String(openMaintenance),
			fraction: openMaintenance / MAINTENANCE_MAX,
			color: "var(--orange)"
		},
		{
			label: "Unsynced changes",
			value: String(unsynced),
			fraction: syncEvents.length > 0 ? unsynced / syncEvents.length : 0,
			color: "var(--purple)"
		},
		{
			label: "Average risk score",
			value: String(avgRisk),
			fraction: avgRisk / 100,
			color: riskColor(avgRisk)
		}
	];

	return (
		<div style={{ padding: "12px 14px" }}>
			<div
				style={{
					display: "grid",
					gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
					gap: 10
				}}>
				{metrics.map(m => (
					<div
						key={m.label}
						style={{
							padding: "10px 12px",
							background: "var(--surface-2)",
							border: "1px solid var(--border)",
							borderRadius: "var(--r-md)"
						}}>
						<div
							style={{
								display: "flex",
								alignItems: "baseline",
								justifyContent: "space-between",
								gap: 8,
								marginBottom: 8
							}}>
							<span
								style={{
									fontSize: 11.5,
									fontWeight: 600,
									color: "var(--text-2)"
								}}>
								{m.label}
							</span>
							<span
								className="fo-mono"
								style={{
									fontSize: 14,
									fontWeight: 700,
									color: "var(--text)"
								}}>
								{m.value}
							</span>
						</div>
						<div className="fo-meter">
							<span
								style={{
									width: `${clamp01(m.fraction) * 100}%`,
									background: m.color
								}}
							/>
						</div>
					</div>
				))}
			</div>
			<div className="fo-kicker" style={{ marginTop: 12 }}>
				Prototype metrics — simulated
			</div>
		</div>
	);
}
