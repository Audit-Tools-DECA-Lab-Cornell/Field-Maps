import type { SyncEvent } from "@/types/domain";

// Simulated sync. Outcomes are deterministic so the demo always behaves the
// same: most changes sync, the P-105 maintenance task and the P-106 boundary
// edit fail with realistic, fixable reasons.

export const SYNC_SYNCING_MS = 900; // pending -> syncing dwell
export const SYNC_RESOLVE_MS = 1600; // syncing -> synced/failed dwell

export interface SyncOutcome {
	status: "synced" | "failed";
	errorMessage?: string;
}

export function resolveSyncOutcome(event: SyncEvent): SyncOutcome {
	if (event.changeType === "maintenance_task_create" && event.entityId === "A-010") {
		return {
			status: "failed",
			errorMessage: "Assigned asset is missing required maintenance category."
		};
	}
	if (
		event.changeType === "geometry_update" &&
		(event.entityId === "P-106" || event.payloadPreview?.review === "supervisor_required")
	) {
		return {
			status: "failed",
			errorMessage: "Geometry overlaps Parcel P-104. Supervisor review required."
		};
	}
	return { status: "synced" };
}

/** Sync events that participate in a sync run. */
export const isSyncable = (e: SyncEvent): boolean =>
	e.status === "pending" || e.status === "failed" || e.status === "local_draft";
