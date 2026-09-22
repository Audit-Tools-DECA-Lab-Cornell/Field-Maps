"use client";

import { StatusBadge, SyncBadge } from "@/components/shared/Badge";
import { Section } from "@/components/shared/Panel";
import { formatDate } from "@/lib/dateFormat";
import { visibleParcels } from "@/lib/filters";
import { cropLabel } from "@/lib/labels";
import { useOperationsStore } from "@/state/useOperationsStore";

export function ParcelList() {
	const parcels = useOperationsStore(s => s.parcels);
	const filters = useOperationsStore(s => s.filters);
	const search = useOperationsStore(s => s.search);
	const syncEvents = useOperationsStore(s => s.syncEvents);
	const selectedParcelId = useOperationsStore(s => s.selection.selectedParcelId);
	const selectParcel = useOperationsStore(s => s.selectParcel);

	const visible = visibleParcels(parcels, filters, search);

	const selectedHidden = selectedParcelId !== null && !visible.some(p => p.id === selectedParcelId);

	const hasPendingChanges = (parcelId: string): boolean =>
		syncEvents.some(e => e.entityId === parcelId && e.status !== "synced");

	return (
		<Section title={`Parcels (${visible.length})`}>
			<div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
				{selectedHidden && (
					<div
						style={{
							display: "flex",
							alignItems: "center",
							gap: 6,
							padding: "6px 8px",
							marginBottom: 4,
							fontSize: 11.5,
							fontWeight: 600,
							color: "var(--amber-fg)",
							background: "var(--amber-bg)",
							border: "1px solid #fde68a",
							borderRadius: "var(--r-sm)"
						}}>
						Selected parcel is hidden by current filters.
					</div>
				)}

				{visible.length === 0 ? (
					<div className="fo-empty" style={{ padding: "8px 2px" }}>
						No parcels match the current filters.
					</div>
				) : (
					visible.map(parcel => {
						const p = parcel.properties;
						const isSelected = selectedParcelId === parcel.id;
						return (
							<div
								key={parcel.id}
								className={`fo-row ${isSelected ? "is-selected" : ""}`}
								onClick={() => selectParcel(parcel.id, { focus: true })}>
								<div
									style={{
										display: "flex",
										alignItems: "center",
										gap: 6,
										minWidth: 0
									}}>
									{hasPendingChanges(parcel.id) && (
										<span
											className="fo-dot"
											style={{ background: "var(--accent)" }}
											title="Pending changes"
										/>
									)}
									<span className="fo-mono" style={{ color: "var(--text-3)", fontSize: 11.5 }}>
										{p.parcelId}
									</span>
									<span
										style={{
											fontWeight: 600,
											color: "var(--text)",
											overflow: "hidden",
											textOverflow: "ellipsis",
											whiteSpace: "nowrap",
											minWidth: 0
										}}>
										{p.name}
									</span>
									<span
										style={{
											marginLeft: "auto",
											display: "flex",
											alignItems: "center",
											gap: 4,
											flex: "none"
										}}>
										<StatusBadge status={p.status} />
										<SyncBadge status={p.syncStatus} />
									</span>
								</div>
								<div style={{ color: "var(--text-3)", fontSize: 11.5 }}>
									{cropLabel[p.cropType]}
									{" · Last insp "}
									{formatDate(p.lastInspectionDate)}
								</div>
							</div>
						);
					})
				)}
			</div>
		</Section>
	);
}
