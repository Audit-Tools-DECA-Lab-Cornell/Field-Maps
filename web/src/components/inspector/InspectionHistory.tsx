"use client";

import { useShallow } from "zustand/react/shallow";

import { Badge, type Tone } from "@/components/shared/Badge";
import { Section } from "@/components/shared/Panel";
import { formatDate } from "@/lib/dateFormat";
import {
	accessConditionLabel,
	inspectionResultLabel,
	irrigationLabel,
	pestPressureLabel,
	soilMoistureLabel
} from "@/lib/labels";
import { selectInspectionsForParcel, useOperationsStore } from "@/state/useOperationsStore";
import type { InspectionResult } from "@/types/domain";

const resultTone: Record<InspectionResult, Tone> = {
	passed: "green",
	monitor: "amber",
	follow_up_required: "orange",
	blocked: "red"
};

export function InspectionHistory({ parcelId }: { parcelId: string }) {
	const inspections = useOperationsStore(useShallow(s => selectInspectionsForParcel(s, parcelId)));

	return (
		<Section title={`Inspection history (${inspections.length})`}>
			{inspections.length === 0 ? (
				<div className="fo-empty">No inspections recorded yet.</div>
			) : (
				<div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
					{inspections.map(ins => (
						<div key={ins.id} className="fo-panel" style={{ padding: 10, boxShadow: "none" }}>
							<div
								style={{
									display: "flex",
									alignItems: "center",
									justifyContent: "space-between",
									gap: 8,
									marginBottom: 6
								}}>
								<div style={{ minWidth: 0 }}>
									<div style={{ fontSize: 12.5, fontWeight: 650 }}>
										{formatDate(ins.inspectionDate)}
									</div>
									<div style={{ fontSize: 11.5, color: "var(--text-3)" }}>{ins.inspectorName}</div>
								</div>
								<Badge tone={resultTone[ins.result]}>{inspectionResultLabel[ins.result]}</Badge>
							</div>

							<div
								style={{
									display: "grid",
									gridTemplateColumns: "1fr 1fr",
									gap: "2px 10px",
									fontSize: 11.5,
									color: "var(--text-2)"
								}}>
								<MiniRow label="Soil" value={soilMoistureLabel[ins.soilMoisture]} />
								<MiniRow label="Irrigation" value={irrigationLabel[ins.irrigationCondition]} />
								<MiniRow label="Pest" value={pestPressureLabel[ins.pestPressure]} />
								<MiniRow label="Access" value={accessConditionLabel[ins.accessCondition]} />
							</div>

							{ins.followUpRequired && (
								<div style={{ marginTop: 6 }}>
									<Badge tone="orange" square>
										Follow-up
									</Badge>
								</div>
							)}

							{ins.notes && (
								<div
									style={{
										marginTop: 6,
										fontSize: 11.5,
										color: "var(--text-2)",
										display: "-webkit-box",
										WebkitLineClamp: 2,
										WebkitBoxOrient: "vertical",
										overflow: "hidden"
									}}>
									{ins.notes}
								</div>
							)}
						</div>
					))}
				</div>
			)}
		</Section>
	);
}

function MiniRow({ label, value }: { label: string; value: string }) {
	return (
		<div style={{ display: "flex", gap: 6 }}>
			<span style={{ color: "var(--text-3)" }}>{label}</span>
			<span style={{ color: "var(--text)" }}>{value}</span>
		</div>
	);
}
