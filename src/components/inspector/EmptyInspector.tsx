"use client";

import { useOperationsStore } from "@/state/useOperationsStore";

interface BriefingSection {
	severity: "error" | "warning" | "info";
	title: string;
	items: {
		id: string;
		entityType: "parcel" | "asset";
		label: string;
		detail: string;
		action: string;
	}[];
}

const BRIEFING: BriefingSection[] = [
	{
		severity: "error",
		title: "Failed sync — blocks dispatch",
		items: [
			{
				id: "P-105",
				entityType: "parcel",
				label: "P-105 · Pump House Almonds",
				detail: "Maintenance task rejected — missing maintenance category",
				action: "Open parcel"
			}
		]
	},
	{
		severity: "warning",
		title: "Awaiting supervisor review",
		items: [
			{
				id: "P-106",
				entityType: "parcel",
				label: "P-106 · Old Vineyard Edge",
				detail: "Boundary draft (area Δ −0.70 ac) — possible overlap with P-104",
				action: "Review boundary"
			}
		]
	},
	{
		severity: "warning",
		title: "Overdue inspections",
		items: [
			{
				id: "P-102",
				entityType: "parcel",
				label: "P-102 · East Tomato Row",
				detail: "Overdue 5d — low-pressure condition unverified",
				action: "Inspect parcel"
			},
			{
				id: "P-106",
				entityType: "parcel",
				label: "P-106 · Old Vineyard Edge",
				detail: "Overdue 7d — parcel blocked, irrigation offline",
				action: "Open parcel"
			}
		]
	},
	{
		severity: "info",
		title: "Offline / blocked assets",
		items: [
			{
				id: "A-006",
				entityType: "asset",
				label: "A-006 · Soil Sensor E-9",
				detail: "No telemetry 18h — battery or radio fault · P-102",
				action: "Inspect asset"
			},
			{
				id: "A-009",
				entityType: "asset",
				label: "A-009 · Access Gate Canal",
				detail: "Blocked by storm debris — crew access denied · P-103",
				action: "Inspect asset"
			},
			{
				id: "A-007",
				entityType: "asset",
				label: "A-007 · Soil Sensor V-2",
				detail: "Offline since irrigation shutdown on blocked parcel · P-106",
				action: "Inspect asset"
			}
		]
	}
];

const SEVERITY_FG: Record<BriefingSection["severity"], string> = {
	error: "var(--red-fg)",
	warning: "var(--amber-fg)",
	info: "var(--text-3)"
};

const SEVERITY_BG: Record<BriefingSection["severity"], string> = {
	error: "var(--red-bg)",
	warning: "var(--amber-bg)",
	info: "var(--surface-2)"
};

const SEVERITY_BD: Record<BriefingSection["severity"], string> = {
	error: "var(--red-bd)",
	warning: "var(--amber-bd)",
	info: "var(--border)"
};

export function EmptyInspector() {
	const selectParcel = useOperationsStore(s => s.selectParcel);
	const selectAsset = useOperationsStore(s => s.selectAsset);

	const handleAction = (id: string, entityType: "parcel" | "asset") => {
		if (entityType === "parcel") selectParcel(id, { focus: true });
		else selectAsset(id);
	};

	return (
		<div style={{ padding: "14px 14px" }}>
			<div style={{ marginBottom: 14 }}>
				<div className="fo-kicker" style={{ marginBottom: 3 }}>
					Operations briefing
				</div>
				<div style={{ fontSize: 11.5, color: "var(--text-3)" }} suppressHydrationWarning>
					Central Valley · {new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
				</div>
			</div>

			<div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
				{BRIEFING.map(section => (
					<div key={section.title}>
						<div
							style={{
								display: "flex",
								alignItems: "center",
								gap: 6,
								marginBottom: 5
							}}>
							<span
								style={{
									width: 6,
									height: 6,
									borderRadius: 99,
									background: SEVERITY_FG[section.severity],
									flex: "none"
								}}
							/>
							<span
								style={{
									fontSize: 10.5,
									fontWeight: 700,
									textTransform: "uppercase",
									letterSpacing: "0.06em",
									color: SEVERITY_FG[section.severity]
								}}>
								{section.title}
							</span>
						</div>

						<div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
							{section.items.map((item, i) => (
								<div
									key={`${item.id}-${i}`}
									role="button"
									tabIndex={0}
									style={{
										display: "flex",
										alignItems: "center",
										justifyContent: "space-between",
										gap: 10,
										padding: "8px 10px",
										background: SEVERITY_BG[section.severity],
										border: `1px solid ${SEVERITY_BD[section.severity]}`,
										borderRadius: "var(--r-md)",
										cursor: "pointer"
									}}
									onClick={() => handleAction(item.id, item.entityType)}
									onKeyDown={e => e.key === "Enter" && handleAction(item.id, item.entityType)}>
									<div style={{ minWidth: 0 }}>
										<div
											className="fo-mono"
											style={{
												fontSize: 11.5,
												fontWeight: 700,
												color: "var(--text)",
												marginBottom: 2
											}}>
											{item.label}
										</div>
										<div
											style={{
												fontSize: 11,
												color: "var(--text-3)",
												overflow: "hidden",
												textOverflow: "ellipsis",
												whiteSpace: "nowrap"
											}}>
											{item.detail}
										</div>
									</div>
									<button
										type="button"
										className="fo-chip"
										style={{ flex: "none", fontSize: 10.5, whiteSpace: "nowrap" }}
										onClick={e => {
											e.stopPropagation();
											handleAction(item.id, item.entityType);
										}}>
										{item.action} →
									</button>
								</div>
							))}
						</div>
					</div>
				))}
			</div>
		</div>
	);
}
