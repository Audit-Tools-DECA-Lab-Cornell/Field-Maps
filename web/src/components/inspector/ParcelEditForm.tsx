"use client";

import { useState } from "react";

import { Button } from "@/components/shared/Button";
import { FieldRow } from "@/components/shared/FieldRow";
import { formatDate } from "@/lib/dateFormat";
import { cropLabel, irrigationLabel, parcelStatusLabel, priorityLabel, riskLabel, TECHNICIANS } from "@/lib/labels";
import type { ParcelEditDraft } from "@/lib/validation";
import { selectSelectedParcel, useOperationsStore } from "@/state/useOperationsStore";
import type { IrrigationCondition, ParcelStatus, Priority, RiskLevel } from "@/types/domain";

import { EmptyInspector } from "./EmptyInspector";

const STATUSES: ParcelStatus[] = ["healthy", "inspection_due", "maintenance_required", "blocked", "inactive"];
const RISKS: RiskLevel[] = ["low", "medium", "high", "critical"];
const IRRIGATION: IrrigationCondition[] = ["normal", "low_pressure", "leak_detected", "offline", "not_applicable"];
const PRIORITIES: Priority[] = ["low", "medium", "high", "critical"];

export function ParcelEditForm() {
	const parcel = useOperationsStore(selectSelectedParcel);
	const saveParcelEdit = useOperationsStore(s => s.saveParcelEdit);
	const cancelEdit = useOperationsStore(s => s.cancelEdit);
	const formErrors = useOperationsStore(s => s.formErrors);

	const [draft, setDraft] = useState<ParcelEditDraft>(() => {
		const p = parcel?.properties;
		return {
			status: p?.status ?? "healthy",
			riskLevel: p?.riskLevel ?? "low",
			assignedTechnician: p?.assignedTechnician ?? "",
			irrigationCondition: p?.irrigationCondition ?? "normal",
			priority: p?.priority ?? "medium",
			notes: p?.notes ?? ""
		};
	});

	if (!parcel) return <EmptyInspector />;
	const p = parcel.properties;

	const update = <K extends keyof ParcelEditDraft>(key: K, value: ParcelEditDraft[K]) =>
		setDraft(d => ({ ...d, [key]: value }));

	return (
		<div>
			<div style={{ padding: "14px 14px 0" }}>
				<div className="fo-kicker">Attribute Edit Mode</div>
				<h2 style={{ margin: "4px 0 0", fontSize: 16, fontWeight: 700 }}>{p.name}</h2>
			</div>

			<div
				style={{
					padding: "12px 14px",
					display: "flex",
					flexDirection: "column",
					gap: 12
				}}>
				{/* Status */}
				<div>
					<label className="fo-label" htmlFor="pe-status">
						Status <span className="fo-req">*</span>
					</label>
					<select
						id="pe-status"
						className={`fo-select ${formErrors.status ? "fo-select--error" : ""}`}
						value={draft.status}
						onChange={e => update("status", e.target.value as ParcelStatus)}>
						{STATUSES.map(s => (
							<option key={s} value={s}>
								{parcelStatusLabel[s]}
							</option>
						))}
					</select>
					{formErrors.status && <div className="fo-error-text">{formErrors.status}</div>}
				</div>

				{/* Risk level */}
				<div>
					<label className="fo-label" htmlFor="pe-risk">
						Risk level
					</label>
					<select
						id="pe-risk"
						className="fo-select"
						value={draft.riskLevel}
						onChange={e => update("riskLevel", e.target.value as RiskLevel)}>
						{RISKS.map(r => (
							<option key={r} value={r}>
								{riskLabel[r]}
							</option>
						))}
					</select>
				</div>

				{/* Assigned technician */}
				<div>
					<label className="fo-label" htmlFor="pe-tech">
						Assigned technician <span className="fo-req">*</span>
					</label>
					<select
						id="pe-tech"
						className={`fo-select ${formErrors.assignedTechnician ? "fo-select--error" : ""}`}
						value={draft.assignedTechnician}
						onChange={e => update("assignedTechnician", e.target.value)}>
						<option value="">Select technician…</option>
						{TECHNICIANS.map(t => (
							<option key={t} value={t}>
								{t}
							</option>
						))}
					</select>
					{formErrors.assignedTechnician && (
						<div className="fo-error-text">{formErrors.assignedTechnician}</div>
					)}
				</div>

				{/* Irrigation condition */}
				<div>
					<label className="fo-label" htmlFor="pe-irrigation">
						Irrigation condition
					</label>
					<select
						id="pe-irrigation"
						className={`fo-select ${formErrors.irrigationCondition ? "fo-select--error" : ""}`}
						value={draft.irrigationCondition}
						onChange={e => update("irrigationCondition", e.target.value as IrrigationCondition)}>
						{IRRIGATION.map(i => (
							<option key={i} value={i}>
								{irrigationLabel[i]}
							</option>
						))}
					</select>
					{formErrors.irrigationCondition && (
						<div className="fo-error-text">{formErrors.irrigationCondition}</div>
					)}
				</div>

				{/* Priority */}
				<div>
					<label className="fo-label" htmlFor="pe-priority">
						Priority
					</label>
					<select
						id="pe-priority"
						className="fo-select"
						value={draft.priority}
						onChange={e => update("priority", e.target.value)}>
						{PRIORITIES.map(pr => (
							<option key={pr} value={pr}>
								{priorityLabel[pr]}
							</option>
						))}
					</select>
				</div>

				{/* Notes */}
				<div>
					<label className="fo-label" htmlFor="pe-notes">
						Notes
					</label>
					<textarea
						id="pe-notes"
						className={`fo-textarea ${formErrors.notes ? "fo-textarea--error" : ""}`}
						value={draft.notes}
						onChange={e => update("notes", e.target.value)}
						placeholder="Operational notes…"
					/>
					{formErrors.notes && <div className="fo-error-text">{formErrors.notes}</div>}
				</div>
			</div>

			{/* read-only context */}
			<div
				style={{
					padding: "0 14px 12px",
					borderTop: "1px solid var(--border)",
					paddingTop: 12
				}}>
				<div className="fo-kicker" style={{ marginBottom: 6 }}>
					Read-only context
				</div>
				<FieldRow label="Parcel ID" mono>
					{p.parcelId}
				</FieldRow>
				<FieldRow label="Crop type">{cropLabel[p.cropType]}</FieldRow>
				<FieldRow label="Acreage">{p.acreage} ac</FieldRow>
				<FieldRow label="Last inspection">{formatDate(p.lastInspectionDate)}</FieldRow>
			</div>

			{/* footer */}
			<div
				style={{
					display: "flex",
					justifyContent: "flex-end",
					gap: 8,
					padding: "12px 14px",
					borderTop: "1px solid var(--border)"
				}}>
				<Button variant="subtle" onClick={cancelEdit}>
					Cancel
				</Button>
				<Button variant="primary" onClick={() => saveParcelEdit(draft)}>
					Save changes
				</Button>
			</div>
		</div>
	);
}
