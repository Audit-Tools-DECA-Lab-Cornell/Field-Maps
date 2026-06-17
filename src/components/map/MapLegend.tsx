"use client";

import { assetTypeLabel, parcelStatusLabel } from "@/lib/labels";
import { assetMarkerStyle, parcelStatusSwatch } from "@/lib/mapStyles";
import type { AssetType, ParcelStatus } from "@/types/domain";

const STATUSES: ParcelStatus[] = ["healthy", "inspection_due", "maintenance_required", "blocked", "inactive"];
const ASSET_TYPES: AssetType[] = ["pump_station", "irrigation_valve", "soil_sensor", "access_gate", "maintenance_flag"];

const SYNC_STATES: { label: string; color: string }[] = [
	{ label: "Pending sync", color: "var(--amber-fg)" },
	{ label: "Failed sync", color: "var(--red-fg)" },
	{ label: "Local draft", color: "var(--purple-fg)" },
	{ label: "Supervisor review", color: "var(--purple)" }
];

export function MapLegend() {
	return (
		<div
			className="fo-panel"
			style={{
				position: "absolute",
				bottom: 14,
				left: 12,
				zIndex: 1000,
				padding: "10px 12px",
				maxWidth: 220
			}}>
			<div className="fo-kicker" style={{ marginBottom: 6 }}>
				Parcel status
			</div>
			<div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "3px 10px" }}>
				{STATUSES.map(s => (
					<div key={s} style={{ display: "flex", alignItems: "center", gap: 6 }}>
						<span className="fo-dot" style={{ background: parcelStatusSwatch[s], width: 9, height: 9 }} />
						<span style={{ fontSize: 11, color: "var(--text-2)" }}>{parcelStatusLabel[s]}</span>
					</div>
				))}
			</div>

			<div
				className="fo-kicker"
				style={{ margin: "9px 0 6px", paddingTop: 8, borderTop: "1px solid var(--border)" }}>
				Layer health
			</div>
			<div style={{ display: "grid", gap: 3 }}>
				{SYNC_STATES.map(s => (
					<div key={s.label} style={{ display: "flex", alignItems: "center", gap: 6 }}>
						<span
							style={{
								width: 9,
								height: 9,
								borderRadius: 2,
								background: s.color,
								flex: "none"
							}}
						/>
						<span style={{ fontSize: 11, color: "var(--text-2)" }}>{s.label}</span>
					</div>
				))}
			</div>

			<div
				className="fo-kicker"
				style={{ margin: "9px 0 6px", paddingTop: 8, borderTop: "1px solid var(--border)" }}>
				Field assets
			</div>
			<div style={{ display: "grid", gap: 3 }}>
				{ASSET_TYPES.map(t => (
					<div key={t} style={{ display: "flex", alignItems: "center", gap: 6 }}>
						<span
							className={`fo-marker ${t === "maintenance_flag" ? "fo-marker--flag" : ""}`}
							style={{
								background: assetMarkerStyle[t].color,
								width: 14,
								height: 14,
								fontSize: 8,
								borderWidth: 1.5
							}}>
							{assetMarkerStyle[t].glyph}
						</span>
						<span style={{ fontSize: 11, color: "var(--text-2)" }}>{assetTypeLabel[t]}</span>
					</div>
				))}
			</div>
		</div>
	);
}
