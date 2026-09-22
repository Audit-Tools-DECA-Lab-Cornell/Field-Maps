import type {
	AccessCondition,
	FieldMarkerAsset,
	InspectionResult,
	IrrigationCondition,
	ParcelAsset,
	ParcelStatus,
	PolygonCoordinates,
	RiskLevel,
	SyncEvent
} from "@/types/domain";

import { daysOverdue, daysUntil } from "./dateFormat";
import { countRealVertices, hasSelfIntersection, withinRegionBounds } from "./geometry";

export type FieldErrors = Record<string, string>;

export interface ParcelEditDraft {
	status: ParcelStatus;
	riskLevel: RiskLevel;
	assignedTechnician: string;
	irrigationCondition: IrrigationCondition;
	priority: string;
	notes: string;
}

export function validateParcelEdit(draft: ParcelEditDraft): FieldErrors {
	const errors: FieldErrors = {};
	if (!draft.status) errors.status = "Status is required.";
	if (!draft.assignedTechnician.trim()) errors.assignedTechnician = "Assigned technician is required.";
	if (
		draft.status === "maintenance_required" &&
		(!draft.irrigationCondition || draft.irrigationCondition === "not_applicable")
	) {
		errors.irrigationCondition = "Irrigation condition is required for parcels needing maintenance.";
	}
	if (draft.status === "blocked" && !draft.notes.trim()) {
		errors.notes = "Notes are required when a parcel is blocked.";
	}
	return errors;
}

export interface InspectionDraft {
	inspectorName: string;
	result: InspectionResult | "";
	irrigationCondition: IrrigationCondition | "";
	accessCondition: AccessCondition | "";
}

export function validateInspection(draft: InspectionDraft): FieldErrors {
	const errors: FieldErrors = {};
	if (!draft.inspectorName.trim()) errors.inspectorName = "Inspector is required.";
	if (!draft.result) errors.result = "Overall result is required.";
	if (!draft.accessCondition) errors.accessCondition = "Access condition is required.";
	if (!draft.irrigationCondition) errors.irrigationCondition = "Irrigation condition is required.";
	return errors;
}

export interface GeometryValidation {
	errors: string[]; // block save
	warnings: string[]; // allow save (supervisor review)
	canSave: boolean;
}

export function validateGeometry(coords: PolygonCoordinates, parcelId: string): GeometryValidation {
	const errors: string[] = [];
	const warnings: string[] = [];

	const vertexCount = countRealVertices(coords);
	if (vertexCount < 3) {
		errors.push("A boundary needs at least 3 vertices.");
	}
	if (hasSelfIntersection(coords)) {
		errors.push("Boundary edges cross themselves (self-intersection).");
	}
	if (!withinRegionBounds(coords)) {
		warnings.push("Boundary extends outside the demo region bounds.");
	}
	// Simulated overlap detection for the disputed vineyard parcel.
	if (parcelId === "P-106") {
		warnings.push("Potential overlap with P-104. Supervisor review required.");
	}

	return { errors, warnings, canSave: errors.length === 0 };
}

/** Informational warnings shown on the parcel inspector (non-blocking). */
export function deriveParcelWarnings(
	parcel: ParcelAsset,
	linkedAssets: FieldMarkerAsset[],
	syncEvents: SyncEvent[]
): string[] {
	const warnings: string[] = [];
	const p = parcel.properties;

	if (p.status !== "inactive") {
		const overdue = daysOverdue(p.nextInspectionDue);
		if (overdue > 0) {
			warnings.push(`Inspection overdue by ${overdue} day${overdue === 1 ? "" : "s"}.`);
		} else {
			const until = daysUntil(p.nextInspectionDue);
			if (until <= 3) {
				warnings.push(
					until === 0 ? "Inspection due today." : `Inspection due in ${until} day${until === 1 ? "" : "s"}.`
				);
			}
		}
	}

	const hasPendingGeometry = syncEvents.some(
		e =>
			e.entityId === parcel.id &&
			e.changeType === "geometry_update" &&
			(e.status === "pending" || e.status === "local_draft" || e.status === "failed")
	);
	if (hasPendingGeometry) {
		warnings.push("Boundary edit pending supervisor review.");
	}

	if (p.openMaintenanceCount > 0) {
		warnings.push(
			`Parcel has ${p.openMaintenanceCount} unresolved maintenance issue${
				p.openMaintenanceCount === 1 ? "" : "s"
			}.`
		);
	}

	const offlineSensor = linkedAssets.find(
		a => a.properties.assetType === "soil_sensor" && a.properties.status === "offline"
	);
	if (offlineSensor) {
		warnings.push(`${offlineSensor.properties.name} offline — telemetry stale.`);
	}

	if (p.status === "blocked") {
		warnings.push("Parcel is blocked — operations on hold.");
	}

	return warnings;
}
