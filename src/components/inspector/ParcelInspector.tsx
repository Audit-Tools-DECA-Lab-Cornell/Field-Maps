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
import type { FieldMarkerAsset, ParcelAsset, SyncEvent } from "@/types/domain";

import { EmptyInspector } from "./EmptyInspector";
import { InspectionHistory } from "./InspectionHistory";
import { LinkedAssetsList } from "./LinkedAssetsList";
import { PendingChangesPanel } from "./PendingChangesPanel";
import { ValidationWarnings } from "./ValidationWarnings";

function deriveOperationalCase(
	parcel: ParcelAsset,
	overdue: number,
	linkedAssets: FieldMarkerAsset[],
	syncEvents: SyncEvent[]
) {
	const p = parcel.properties;
	const pid = p.parcelId;

	const relatedEvents = syncEvents.filter(
		e => e.entityId === parcel.id || e.entityLabel.startsWith(pid)
	);
	const failedEvent = relatedEvents.find(e => e.status === "failed");
	const draftEvent = relatedEvents.find(e => e.status === "local_draft");

	const assetExceptionCount = linkedAssets.filter(a => {
		const s = a.properties.status;
		return s === "offline" || s === "blocked" || s === "needs_attention";
	}).length;

	let recommendation: string | null = null;
	let blocker: string | null = null;
	let dueState: { label: string; tone: string } | null = null;

	if (p.syncStatus === "failed" || failedEvent) {
		const err = failedEvent?.errorMessage;
		const ctype = failedEvent?.changeType;
		if (ctype === "maintenance_task_create" && err?.toLowerCase().includes("category")) {
			recommendation = "Fix missing maintenance category, then retry sync.";
		} else if (err) {
			recommendation = `Fix sync error, then retry: ${err}`;
		} else {
			recommendation = "Review sync error in Pending Changes, then retry.";
		}
		blocker = err ?? "Sync failed — see Pending Changes for details.";
	} else if (p.syncStatus === "local_draft" || draftEvent) {
		const delta = draftEvent?.payloadPreview?.areaDeltaAcres;
		const deltaStr =
			typeof delta === "number" ? ` (area Δ ${delta >= 0 ? "+" : ""}${delta} ac)` : "";
		recommendation = `Boundary draft${deltaStr} requires supervisor review before sync.`;
		blocker = "Local draft — cannot auto-sync. Supervisor review required.";
	} else if (overdue > 0) {
		recommendation = `Inspection overdue ${overdue}d — schedule field visit and log report.`;
	} else if (p.status === "maintenance_required") {
		recommendation = "Open maintenance tasks require follow-up before next inspection.";
	}

	if (overdue > 0) {
		dueState = { label: `Overdue ${overdue}d`, tone: "var(--red-fg)" };
	} else {
		const today = new Date().toISOString().slice(0, 10);
		if (p.nextInspectionDue === today) {
			dueState = { label: "Due today", tone: "var(--amber-fg)" };
		} else if (p.nextInspectionDue > today) {
			dueState = { label: `Due ${formatDate(p.nextInspectionDue)}`, tone: "var(--text-3)" };
		}
	}

	return { recommendation, blocker, dueState, assetExceptionCount };
}

function OperationalCase({
	parcel,
	overdue,
	linkedAssets,
	syncEvents
}: {
	parcel: ParcelAsset;
	overdue: number;
	linkedAssets: FieldMarkerAsset[];
	syncEvents: SyncEvent[];
}) {
	const { recommendation, blocker, dueState, assetExceptionCount } = deriveOperationalCase(
		parcel,
		overdue,
		linkedAssets,
		syncEvents
	);

	if (!recommendation && !blocker && !dueState && assetExceptionCount === 0) return null;

	return (
		<div
			style={{
				margin: "0 14px 0",
				padding: "10px 12px",
				background: "var(--surface-2)",
				border: "1px solid var(--border)",
				borderRadius: "var(--r-md)"
			}}>
			<div className="fo-kicker" style={{ marginBottom: 8 }}>
				Operational case
			</div>

			{recommendation && (
				<div
					style={{
						fontSize: 12.5,
						fontWeight: 650,
						color: "var(--text)",
						marginBottom: blocker ? 8 : 0
					}}>
					→ {recommendation}
				</div>
			)}

			{blocker && (
				<div
					style={{
						padding: "5px 8px",
						background: "var(--red-bg)",
						border: "1px solid var(--red-bd)",
						borderRadius: "var(--r-sm)",
						fontSize: 11.5,
						color: "var(--red-fg)",
						marginBottom: 8
					}}>
					⊗ {blocker}
				</div>
			)}

			<div
				style={{
					display: "flex",
					flexWrap: "wrap",
					gap: "4px 14px",
					fontSize: 11.5,
					color: "var(--text-3)"
				}}>
				{dueState && (
					<span style={{ color: dueState.tone, fontWeight: 650 }}>{dueState.label}</span>
				)}
				{assetExceptionCount > 0 && (
					<span>
						{assetExceptionCount} asset exception{assetExceptionCount !== 1 ? "s" : ""}
					</span>
				)}
				<span>Tech: {parcel.properties.assignedTechnician}</span>
				<span>Priority: {parcel.properties.priority}</span>
			</div>
		</div>
	);
}

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

			{/* operational case */}
			<OperationalCase
				parcel={parcel}
				overdue={overdue}
				linkedAssets={linkedAssets}
				syncEvents={syncEvents}
			/>

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
