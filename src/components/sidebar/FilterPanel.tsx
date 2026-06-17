"use client";

import type { ReactNode } from "react";

import { Button } from "@/components/shared/Button";
import { Section } from "@/components/shared/Panel";
import { cropLabel, parcelStatusLabel, syncStatusLabel, TECHNICIANS } from "@/lib/labels";
import { parcelStatusSwatch } from "@/lib/mapStyles";
import { useOperationsStore } from "@/state/useOperationsStore";
import type { CropType, ParcelStatus, SyncStatus } from "@/types/domain";

const STATUS_VALUES: ParcelStatus[] = ["healthy", "inspection_due", "maintenance_required", "blocked", "inactive"];

const CROP_VALUES: CropType[] = ["almonds", "tomatoes", "grapes", "alfalfa"];

const SYNC_VALUES: SyncStatus[] = ["synced", "pending", "failed", "local_draft"];

function SubGroup({ label, children }: { label: string; children: ReactNode }) {
	return (
		<div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
			<span
				style={{
					fontSize: 11,
					fontWeight: 700,
					color: "var(--text-2)",
					padding: "0 6px",
					marginBottom: 2
				}}>
				{label}
			</span>
			{children}
		</div>
	);
}

function CheckRow({ checked, onChange, children }: { checked: boolean; onChange: () => void; children: ReactNode }) {
	return (
		<label className="fo-check">
			<input type="checkbox" checked={checked} onChange={onChange} />
			{children}
		</label>
	);
}

export function FilterPanel() {
	const filters = useOperationsStore(s => s.filters);
	const toggleStatusFilter = useOperationsStore(s => s.toggleStatusFilter);
	const toggleCropFilter = useOperationsStore(s => s.toggleCropFilter);
	const toggleTechnicianFilter = useOperationsStore(s => s.toggleTechnicianFilter);
	const toggleSyncFilter = useOperationsStore(s => s.toggleSyncFilter);
	const clearFilters = useOperationsStore(s => s.clearFilters);

	const activeCount =
		filters.statuses.length + filters.cropTypes.length + filters.technicians.length + filters.syncStatuses.length;

	return (
		<Section
			title="Filters"
			action={
				activeCount > 0 ? (
					<span style={{ color: "var(--accent-strong)", fontWeight: 700 }}>{activeCount} active</span>
				) : undefined
			}>
			<div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
				<SubGroup label="Status">
					{STATUS_VALUES.map(s => (
						<CheckRow key={s} checked={filters.statuses.includes(s)} onChange={() => toggleStatusFilter(s)}>
							<span className="fo-dot" style={{ background: parcelStatusSwatch[s] }} />
							{parcelStatusLabel[s]}
						</CheckRow>
					))}
				</SubGroup>

				<SubGroup label="Crop type">
					{CROP_VALUES.map(c => (
						<CheckRow key={c} checked={filters.cropTypes.includes(c)} onChange={() => toggleCropFilter(c)}>
							{cropLabel[c]}
						</CheckRow>
					))}
				</SubGroup>

				<SubGroup label="Technician">
					{[...TECHNICIANS].map(t => (
						<CheckRow
							key={t}
							checked={filters.technicians.includes(t)}
							onChange={() => toggleTechnicianFilter(t)}>
							{t}
						</CheckRow>
					))}
				</SubGroup>

				<SubGroup label="Sync state">
					{SYNC_VALUES.map(s => (
						<CheckRow
							key={s}
							checked={filters.syncStatuses.includes(s)}
							onChange={() => toggleSyncFilter(s)}>
							{syncStatusLabel[s]}
						</CheckRow>
					))}
				</SubGroup>

				<div>
					<Button variant="subtle" size="sm" onClick={() => clearFilters()}>
						Clear filters
					</Button>
				</div>
			</div>
		</Section>
	);
}
