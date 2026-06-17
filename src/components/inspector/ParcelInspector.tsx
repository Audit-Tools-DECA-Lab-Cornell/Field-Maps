"use client";

import { useShallow } from "zustand/react/shallow";

import { PriorityBadge, RiskBadge, StatusBadge, SyncBadge } from "@/components/shared/Badge";
import { Button } from "@/components/shared/Button";
import { FieldRow } from "@/components/shared/FieldRow";
import { Icon } from "@/components/shared/Icon";
import { Section } from "@/components/shared/Panel";
import { daysOverdue, formatDate } from "@/lib/dateFormat";
import { cropLabel, irrigationLabel } from "@/lib/labels";
import { deriveParcelWarnings } from "@/lib/validation";
import { selectAssetsForParcel, selectSelectedParcel, useOperationsStore } from "@/state/useOperationsStore";

import { EmptyInspector } from "./EmptyInspector";
import { InspectionHistory } from "./InspectionHistory";
import { LinkedAssetsList } from "./LinkedAssetsList";
import { PendingChangesPanel } from "./PendingChangesPanel";
import { ValidationWarnings } from "./ValidationWarnings";

export function ParcelInspector() {
	const parcel = useOperationsStore(selectSelectedParcel);
	const linkedAssets = useOperationsStore(useShallow(s => (parcel ? selectAssetsForParcel(s, parcel.id) : [])));
	const syncEvents = useOperationsStore(s => s.syncEvents);

	const startParcelEdit = useOperationsStore(s => s.startParcelEdit);
	const startInspection = useOperationsStore(s => s.startInspection);
	const startGeometryEdit = useOperationsStore(s => s.startGeometryEdit);
	const startMaintenance = useOperationsStore(s => s.startMaintenance);

	if (!parcel) return <EmptyInspector />;
	const p = parcel.properties;
	const overdue = daysOverdue(p.nextInspectionDue);
	const warnings = deriveParcelWarnings(parcel, linkedAssets, syncEvents);

	return (
		<div>
			{/* header */}
			<div style={{ padding: "14px 14px 12px" }}>
				<h2 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>{p.name}</h2>
				<div className="fo-mono" style={{ fontSize: 11.5, color: "var(--text-3)", marginTop: 2 }}>
					{p.parcelId}
				</div>
				<div
					style={{
						display: "flex",
						flexWrap: "wrap",
						gap: 6,
						marginTop: 10
					}}>
					<StatusBadge status={p.status} />
					<SyncBadge status={p.syncStatus} />
					<RiskBadge level={p.riskLevel} />
				</div>

				{/* actions */}
				<div
					style={{
						display: "flex",
						flexWrap: "wrap",
						gap: 6,
						marginTop: 12
					}}>
					<Button variant="subtle" size="sm" onClick={startParcelEdit}>
						<Icon name="edit" size={13} />
						Edit parcel
					</Button>
					<Button variant="primary" size="sm" onClick={startInspection}>
						<Icon name="plus" size={13} />
						Add inspection
					</Button>
					<Button variant="subtle" size="sm" onClick={startGeometryEdit}>
						<Icon name="boundary" size={13} />
						Edit boundary
					</Button>
					<Button variant="subtle" size="sm" onClick={startMaintenance}>
						<Icon name="warning" size={13} />
						Create task
					</Button>
				</div>
			</div>

			<ValidationWarnings warnings={warnings} />

			<Section title="Details">
				<div>
					<FieldRow label="Crop type">{cropLabel[p.cropType]}</FieldRow>
					<FieldRow label="Acreage">{p.acreage} ac</FieldRow>
					<FieldRow label="Owner / operator">{p.ownerOperator}</FieldRow>
					<FieldRow label="Assigned technician">{p.assignedTechnician}</FieldRow>
					<FieldRow label="Irrigation zone">{p.irrigationZone}</FieldRow>
					<FieldRow label="Irrigation condition">{irrigationLabel[p.irrigationCondition]}</FieldRow>
					<FieldRow label="Last inspection">{formatDate(p.lastInspectionDate)}</FieldRow>
					<FieldRow label="Next inspection due">
						<span>{formatDate(p.nextInspectionDue)}</span>
						{overdue > 0 && (
							<span
								style={{
									color: "var(--red-fg)",
									fontWeight: 650,
									fontSize: 11.5
								}}>
								{" "}
								· overdue {overdue}d
							</span>
						)}
					</FieldRow>
					<FieldRow label="Priority">
						<PriorityBadge priority={p.priority} />
					</FieldRow>
					<FieldRow label="Notes">{p.notes || "—"}</FieldRow>
				</div>
			</Section>

			<InspectionHistory parcelId={parcel.id} />
			<LinkedAssetsList parcelId={parcel.id} />
			<PendingChangesPanel entityId={parcel.id} />
		</div>
	);
}
