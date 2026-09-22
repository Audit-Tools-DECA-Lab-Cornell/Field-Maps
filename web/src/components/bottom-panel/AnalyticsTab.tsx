"use client";

import { TODAY } from "@/lib/dateFormat";
import { operationalSummary } from "@/lib/filters";
import { useOperationsStore } from "@/state/useOperationsStore";

interface Metric {
	label: string;
	value: string;
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

function ExceptionCard({ label, value, tone }: { label: string; value: number; tone: string }) {
	return (
		<div
			style={{
				padding: "8px 12px",
				background: value > 0 ? `color-mix(in srgb, ${tone} 10%, var(--surface-2))` : "var(--surface-2)",
				border:
					value > 0 ? `1px solid color-mix(in srgb, ${tone} 28%, var(--border))` : "1px solid var(--border)",
				borderRadius: "var(--r-md)",
				display: "flex",
				alignItems: "center",
				justifyContent: "space-between",
				gap: 8
			}}>
			<span style={{ fontSize: 11.5, color: "var(--text-2)" }}>{label}</span>
			<span
				className="fo-mono"
				style={{
					fontSize: 15,
					fontWeight: 700,
					color: value > 0 ? tone : "var(--text-3)"
				}}>
				{value}
			</span>
		</div>
	);
}

export function AnalyticsTab() {
	const parcels = useOperationsStore(s => s.parcels);
	const syncEvents = useOperationsStore(s => s.syncEvents);
	const assets = useOperationsStore(s => s.assets);

	const total = parcels.length;
	const healthy = parcels.filter(p => p.properties.status === "healthy").length;
	const inspectionsDue = parcels.filter(p => p.properties.status === "inspection_due").length;
	const openMaintenance = parcels.reduce((sum, p) => sum + p.properties.openMaintenanceCount, 0);
	const unsynced = operationalSummary(parcels, syncEvents).unsynced;
	const avgRisk = total > 0 ? Math.round(parcels.reduce((sum, p) => sum + p.properties.riskScore, 0) / total) : 0;

	const failedSyncs = syncEvents.filter(e => e.status === "failed").length;
	const localDrafts = syncEvents.filter(e => e.status === "local_draft").length;
	const offlineAssets = assets.filter(a => a.properties.status === "offline").length;
	const overdueInspections = parcels.filter(
		p => p.properties.nextInspectionDue < TODAY && p.properties.status !== "inactive"
	).length;

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
			<div className="fo-kicker" style={{ marginBottom: 8 }}>
				Exceptions
			</div>
			<div
				style={{
					display: "grid",
					gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
					gap: 6,
					marginBottom: 14
				}}>
				<ExceptionCard label="Failed syncs" value={failedSyncs} tone="var(--red-fg)" />
				<ExceptionCard label="Local drafts" value={localDrafts} tone="var(--purple-fg)" />
				<ExceptionCard label="Offline assets" value={offlineAssets} tone="var(--gray-fg)" />
				<ExceptionCard label="Overdue inspections" value={overdueInspections} tone="var(--amber-fg)" />
			</div>

			<div className="fo-kicker" style={{ marginBottom: 8 }}>
				Field metrics
			</div>
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
