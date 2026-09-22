"use client";

import { useState } from "react";

import { Button } from "@/components/shared/Button";
import { TODAY } from "@/lib/dateFormat";
import {
	accessConditionLabel,
	inspectionResultLabel,
	irrigationLabel,
	pestPressureLabel,
	soilMoistureLabel,
	TECHNICIANS
} from "@/lib/labels";
import { selectSelectedParcel, useOperationsStore } from "@/state/useOperationsStore";
import type {
	AccessCondition,
	InspectionResult,
	IrrigationCondition,
	PestPressure,
	SoilMoisture
} from "@/types/domain";

import { EmptyInspector } from "./EmptyInspector";

const RESULTS: InspectionResult[] = ["passed", "monitor", "follow_up_required", "blocked"];
const IRRIGATION: IrrigationCondition[] = ["normal", "low_pressure", "leak_detected", "offline", "not_applicable"];
const ACCESS: AccessCondition[] = ["clear", "limited", "blocked"];
const SOIL: SoilMoisture[] = ["low", "normal", "high", "unknown"];
const PEST: PestPressure[] = ["none", "low", "medium", "high"];

interface InspectionFormState {
	inspectorName: string;
	result: InspectionResult | "";
	irrigationCondition: IrrigationCondition | "";
	accessCondition: AccessCondition | "";
	soilMoisture: SoilMoisture;
	pestPressure: PestPressure;
	followUpRequired: boolean;
	notes: string;
	inspectionDate: string;
}

interface ImpactPreview {
	text: string;
	tone: "green" | "amber" | "orange" | "red";
	detail?: string;
}

function getImpactPreview(result: InspectionResult | "", accessCondition: AccessCondition | ""): ImpactPreview | null {
	if (!result) return null;
	switch (result) {
		case "passed":
			return {
				tone: "green",
				text: "Parcel status → Healthy.",
				detail: "No follow-up required. Change queued for sync."
			};
		case "monitor":
			return {
				tone: "amber",
				text: "Parcel status → Inspection due.",
				detail: "A re-inspection reminder will be queued in 30 days."
			};
		case "follow_up_required":
			return {
				tone: "orange",
				text: "Parcel status → Maintenance required.",
				detail: "A maintenance follow-up task will be queued for the assigned technician."
			};
		case "blocked":
			return {
				tone: "red",
				text: "Parcel will be marked Blocked.",
				detail:
					!accessCondition || accessCondition === "clear"
						? "Access condition and notes are required before this can sync."
						: "Parcel locked for field entry. Coordinator review required before sync."
			};
		default:
			return null;
	}
}

const TONE_STYLES: Record<"green" | "amber" | "orange" | "red", { bg: string; bd: string; fg: string }> = {
	green: { bg: "var(--green-bg)", bd: "var(--green-bd)", fg: "var(--green-fg)" },
	amber: { bg: "var(--amber-bg)", bd: "var(--amber-bd)", fg: "var(--amber-fg)" },
	orange: { bg: "var(--orange-bg)", bd: "var(--orange-bd)", fg: "var(--orange-fg)" },
	red: { bg: "var(--red-bg)", bd: "var(--red-bd)", fg: "var(--red-fg)" }
};

export function InspectionForm() {
	const parcel = useOperationsStore(selectSelectedParcel);
	const saveInspection = useOperationsStore(s => s.saveInspection);
	const cancelEdit = useOperationsStore(s => s.cancelEdit);
	const formErrors = useOperationsStore(s => s.formErrors);

	const [draft, setDraft] = useState<InspectionFormState>(() => ({
		inspectorName: parcel?.properties.assignedTechnician ?? "",
		result: "",
		irrigationCondition: "",
		accessCondition: "",
		soilMoisture: "unknown",
		pestPressure: "none",
		followUpRequired: false,
		notes: "",
		inspectionDate: TODAY
	}));

	if (!parcel) return <EmptyInspector />;

	const update = <K extends keyof InspectionFormState>(key: K, value: InspectionFormState[K]) =>
		setDraft(d => ({ ...d, [key]: value }));

	const impact = getImpactPreview(draft.result, draft.accessCondition);
	const impactStyles = impact ? TONE_STYLES[impact.tone] : null;

	return (
		<div>
			<div style={{ padding: "14px 14px 0" }}>
				<div className="fo-kicker">New inspection</div>
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
				{/* Inspector */}
				<div>
					<label className="fo-label" htmlFor="in-inspector">
						Inspector <span className="fo-req">*</span>
					</label>
					<select
						id="in-inspector"
						className={`fo-select ${formErrors.inspectorName ? "fo-select--error" : ""}`}
						value={draft.inspectorName}
						onChange={e => update("inspectorName", e.target.value)}>
						<option value="">Select inspector…</option>
						{TECHNICIANS.map(t => (
							<option key={t} value={t}>
								{t}
							</option>
						))}
					</select>
					{formErrors.inspectorName && <div className="fo-error-text">{formErrors.inspectorName}</div>}
				</div>

				{/* Overall result */}
				<div>
					<label className="fo-label" htmlFor="in-result">
						Overall result <span className="fo-req">*</span>
					</label>
					<select
						id="in-result"
						className={`fo-select ${formErrors.result ? "fo-select--error" : ""}`}
						value={draft.result}
						onChange={e => update("result", e.target.value as InspectionResult | "")}>
						<option value="">Select result…</option>
						{RESULTS.map(r => (
							<option key={r} value={r}>
								{inspectionResultLabel[r]}
							</option>
						))}
					</select>
					{formErrors.result && <div className="fo-error-text">{formErrors.result}</div>}
				</div>

				{/* Irrigation condition */}
				<div>
					<label className="fo-label" htmlFor="in-irrigation">
						Irrigation condition <span className="fo-req">*</span>
					</label>
					<select
						id="in-irrigation"
						className={`fo-select ${formErrors.irrigationCondition ? "fo-select--error" : ""}`}
						value={draft.irrigationCondition}
						onChange={e => update("irrigationCondition", e.target.value as IrrigationCondition | "")}>
						<option value="">Select condition…</option>
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

				{/* Access condition */}
				<div>
					<label className="fo-label" htmlFor="in-access">
						Access condition <span className="fo-req">*</span>
					</label>
					<select
						id="in-access"
						className={`fo-select ${formErrors.accessCondition ? "fo-select--error" : ""}`}
						value={draft.accessCondition}
						onChange={e => update("accessCondition", e.target.value as AccessCondition | "")}>
						<option value="">Select access…</option>
						{ACCESS.map(a => (
							<option key={a} value={a}>
								{accessConditionLabel[a]}
							</option>
						))}
					</select>
					{formErrors.accessCondition && <div className="fo-error-text">{formErrors.accessCondition}</div>}
				</div>

				{/* Soil moisture */}
				<div>
					<label className="fo-label" htmlFor="in-soil">
						Soil moisture
					</label>
					<select
						id="in-soil"
						className="fo-select"
						value={draft.soilMoisture}
						onChange={e => update("soilMoisture", e.target.value as SoilMoisture)}>
						{SOIL.map(s => (
							<option key={s} value={s}>
								{soilMoistureLabel[s]}
							</option>
						))}
					</select>
				</div>

				{/* Pest pressure */}
				<div>
					<label className="fo-label" htmlFor="in-pest">
						Pest pressure
					</label>
					<select
						id="in-pest"
						className="fo-select"
						value={draft.pestPressure}
						onChange={e => update("pestPressure", e.target.value as PestPressure)}>
						{PEST.map(pp => (
							<option key={pp} value={pp}>
								{pestPressureLabel[pp]}
							</option>
						))}
					</select>
				</div>

				{/* Follow-up required */}
				<label className="fo-check" style={{ padding: "2px 0" }}>
					<input
						type="checkbox"
						checked={draft.followUpRequired}
						onChange={e => update("followUpRequired", e.target.checked)}
					/>
					Follow-up required
				</label>

				{/* Notes */}
				<div>
					<label className="fo-label" htmlFor="in-notes">
						Notes
					</label>
					<textarea
						id="in-notes"
						className="fo-textarea"
						value={draft.notes}
						onChange={e => update("notes", e.target.value)}
						placeholder="Field observations…"
					/>
				</div>

				{/* Inspection date */}
				<div>
					<label className="fo-label" htmlFor="in-date">
						Inspection date
					</label>
					<input
						id="in-date"
						type="date"
						className="fo-input"
						value={draft.inspectionDate}
						onChange={e => update("inspectionDate", e.target.value)}
					/>
				</div>
			</div>

			{/* impact preview */}
			{impact && impactStyles && (
				<div
					style={{
						margin: "0 14px 12px",
						padding: "8px 10px",
						background: impactStyles.bg,
						border: `1px solid ${impactStyles.bd}`,
						borderRadius: "var(--r-md)"
					}}>
					<div className="fo-kicker" style={{ marginBottom: 4 }}>
						Impact preview
					</div>
					<div style={{ fontSize: 12.5, fontWeight: 650, color: impactStyles.fg }}>{impact.text}</div>
					{impact.detail && (
						<div style={{ fontSize: 11.5, color: "var(--text-2)", marginTop: 3 }}>{impact.detail}</div>
					)}
				</div>
			)}

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
				<Button variant="primary" onClick={() => saveInspection(draft)}>
					Save inspection
				</Button>
			</div>
		</div>
	);
}
