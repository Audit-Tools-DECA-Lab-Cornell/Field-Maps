"use client";

import { AssetStatusBadge, PriorityBadge, SyncBadge } from "@/components/shared/Badge";
import { Button } from "@/components/shared/Button";
import { FieldRow } from "@/components/shared/FieldRow";
import { Icon } from "@/components/shared/Icon";
import { Section } from "@/components/shared/Panel";
import { formatDateTime } from "@/lib/dateFormat";
import { assetTypeLabel } from "@/lib/labels";
import { selectSelectedAsset, useOperationsStore } from "@/state/useOperationsStore";

import { EmptyInspector } from "./EmptyInspector";
import { PendingChangesPanel } from "./PendingChangesPanel";

export function AssetInspector() {
	const asset = useOperationsStore(selectSelectedAsset);
	const startMaintenance = useOperationsStore(s => s.startMaintenance);
	const selectParcel = useOperationsStore(s => s.selectParcel);

	if (!asset) return <EmptyInspector />;
	const a = asset.properties;

	return (
		<div>
			{/* header */}
			<div style={{ padding: "14px 14px 12px" }}>
				<h2 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>{a.name}</h2>
				<div className="fo-mono" style={{ fontSize: 11.5, color: "var(--text-3)", marginTop: 2 }}>
					{a.assetId}
				</div>
				<div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 10 }}>
					<AssetStatusBadge status={a.status} />
					<SyncBadge status={a.syncStatus} />
					<PriorityBadge priority={a.priority} />
				</div>

				{/* actions */}
				<div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 12 }}>
					<Button variant="primary" size="sm" onClick={startMaintenance}>
						<Icon name="warning" size={13} />
						Create maintenance task
					</Button>
					<Button variant="subtle" size="sm" onClick={() => selectParcel(a.linkedParcelId, { focus: true })}>
						<Icon name="arrow-right" size={13} />
						View linked parcel
					</Button>
				</div>
			</div>

			<Section title="Asset details">
				<div>
					<FieldRow label="Asset type">{assetTypeLabel[a.assetType]}</FieldRow>
					<FieldRow label="Linked parcel">
						<button
							type="button"
							onClick={() => selectParcel(a.linkedParcelId, { focus: true })}
							className="fo-mono"
							style={{
								background: "none",
								border: "none",
								padding: 0,
								cursor: "pointer",
								color: "var(--accent)",
								fontWeight: 600,
								fontSize: 12.5
							}}>
							{a.linkedParcelId}
						</button>
					</FieldRow>
					<FieldRow label="Operational status">
						<AssetStatusBadge status={a.status} />
					</FieldRow>
					<FieldRow label="Priority">
						<PriorityBadge priority={a.priority} />
					</FieldRow>
					<FieldRow label="Assigned technician">{a.assignedTechnician}</FieldRow>
					<FieldRow label="Last checked">{formatDateTime(a.lastCheckedAt)}</FieldRow>
					<FieldRow label="Notes">{a.notes || "—"}</FieldRow>
				</div>
			</Section>

			<PendingChangesPanel entityId={asset.id} />
		</div>
	);
}
