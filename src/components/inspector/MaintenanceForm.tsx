"use client";

import { useState } from "react";

import { Button } from "@/components/shared/Button";
import { priorityLabel, TECHNICIANS } from "@/lib/labels";
import { type MaintenanceDraft, selectSelectedParcel, useOperationsStore } from "@/state/useOperationsStore";
import type { Priority } from "@/types/domain";

import { EmptyInspector } from "./EmptyInspector";

const PRIORITIES: Priority[] = ["low", "medium", "high", "critical"];

export function MaintenanceForm() {
	const parcel = useOperationsStore(selectSelectedParcel);
	const saveMaintenance = useOperationsStore(s => s.saveMaintenance);
	const cancelEdit = useOperationsStore(s => s.cancelEdit);
	const formErrors = useOperationsStore(s => s.formErrors);

	const [draft, setDraft] = useState<MaintenanceDraft>(() => ({
		issueType: "",
		priority: "medium",
		assignedTechnician: parcel?.properties.assignedTechnician ?? TECHNICIANS[0],
		notes: ""
	}));

	if (!parcel) return <EmptyInspector />;

	const update = <K extends keyof MaintenanceDraft>(key: K, value: MaintenanceDraft[K]) =>
		setDraft(d => ({ ...d, [key]: value }));

	return (
		<div>
			<div style={{ padding: "14px 14px 0" }}>
				<div className="fo-kicker">New maintenance task</div>
				<h2 style={{ margin: "4px 0 0", fontSize: 16, fontWeight: 700 }}>{parcel.properties.name}</h2>
				<div className="fo-mono" style={{ fontSize: 11.5, color: "var(--text-3)", marginTop: 2 }}>
					{parcel.properties.parcelId}
				</div>
			</div>

			<div
				style={{
					padding: "12px 14px",
					display: "flex",
					flexDirection: "column",
					gap: 12
				}}>
				{/* Issue type */}
				<div>
					<label className="fo-label" htmlFor="mt-issue">
						Issue type <span className="fo-req">*</span>
					</label>
					<input
						id="mt-issue"
						type="text"
						className={`fo-input ${formErrors.issueType ? "fo-input--error" : ""}`}
						value={draft.issueType}
						onChange={e => update("issueType", e.target.value)}
						placeholder="e.g. Pump motor replacement"
					/>
					{formErrors.issueType && <div className="fo-error-text">{formErrors.issueType}</div>}
				</div>

				{/* Priority */}
				<div>
					<label className="fo-label" htmlFor="mt-priority">
						Priority
					</label>
					<select
						id="mt-priority"
						className="fo-select"
						value={draft.priority}
						onChange={e => update("priority", e.target.value as MaintenanceDraft["priority"])}>
						{PRIORITIES.map(p => (
							<option key={p} value={p}>
								{priorityLabel[p]}
							</option>
						))}
					</select>
				</div>

				{/* Assigned technician */}
				<div>
					<label className="fo-label" htmlFor="mt-tech">
						Assigned technician
					</label>
					<select
						id="mt-tech"
						className="fo-select"
						value={draft.assignedTechnician}
						onChange={e => update("assignedTechnician", e.target.value)}>
						{TECHNICIANS.map(t => (
							<option key={t} value={t}>
								{t}
							</option>
						))}
					</select>
				</div>

				{/* Notes */}
				<div>
					<label className="fo-label" htmlFor="mt-notes">
						Notes
					</label>
					<textarea
						id="mt-notes"
						className="fo-textarea"
						value={draft.notes}
						onChange={e => update("notes", e.target.value)}
						placeholder="Describe the issue…"
					/>
				</div>
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
				<Button variant="primary" onClick={() => saveMaintenance(draft)}>
					Create task
				</Button>
			</div>
		</div>
	);
}
