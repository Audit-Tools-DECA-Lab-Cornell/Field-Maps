"use client";

import { useState } from "react";
import { useShallow } from "zustand/react/shallow";

import { SyncBadge } from "@/components/shared/Badge";
import { Button } from "@/components/shared/Button";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { Icon } from "@/components/shared/Icon";
import { Section } from "@/components/shared/Panel";
import { timeAgo } from "@/lib/dateFormat";
import { changeTypeLabel } from "@/lib/labels";
import { selectPendingForEntity, useOperationsStore } from "@/state/useOperationsStore";
import type { SyncEvent } from "@/types/domain";

function impactLabel(e: SyncEvent): { text: string; color: string; bg: string; bd: string } | null {
	if (e.status === "failed") {
		return {
			text: "Blocks central sync",
			color: "var(--red-fg)",
			bg: "var(--red-bg)",
			bd: "var(--red-bd)"
		};
	}
	if (e.status === "local_draft") {
		return {
			text: "Local only — supervisor review required",
			color: "var(--purple-fg)",
			bg: "var(--purple-bg)",
			bd: "var(--purple-bd)"
		};
	}
	if (e.status === "pending") {
		return {
			text: "Queued for next sync",
			color: "var(--amber-fg)",
			bg: "var(--amber-bg)",
			bd: "var(--amber-bd)"
		};
	}
	return null;
}

function whatToFix(e: SyncEvent): string | null {
	if (e.status === "failed") {
		if (e.changeType === "maintenance_task_create" && e.errorMessage?.toLowerCase().includes("category")) {
			return "Add a maintenance category to the task, then retry.";
		}
		if (e.changeType === "geometry_update") {
			return "Geometry validation failed — review boundary and resubmit.";
		}
		if (e.errorMessage) {
			return e.errorMessage;
		}
		return "Review error details and retry when resolved.";
	}
	if (e.status === "local_draft" && e.changeType === "geometry_update") {
		const delta = e.payloadPreview?.areaDeltaAcres;
		const deltaStr =
			typeof delta === "number" ? ` (area Δ ${delta >= 0 ? "+" : ""}${delta} ac)` : "";
		return `Boundary draft${deltaStr} pending supervisor approval before it can sync.`;
	}
	return null;
}

export function PendingChangesPanel({ entityId }: { entityId: string }) {
	const events = useOperationsStore(useShallow(s => selectPendingForEntity(s, entityId)));
	const retrySyncEvent = useOperationsStore(s => s.retrySyncEvent);
	const resolveSyncEvent = useOperationsStore(s => s.resolveSyncEvent);
	const discardSyncEvent = useOperationsStore(s => s.discardSyncEvent);

	const [discardId, setDiscardId] = useState<string | null>(null);

	return (
		<Section title={`Pending changes (${events.length})`}>
			{events.length === 0 ? (
				<div className="fo-empty">No pending changes for this entity.</div>
			) : (
				<div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
					{events.map(e => {
						const impact = impactLabel(e);
						const fix = whatToFix(e);
						return (
							<div
								key={e.id}
								className="fo-panel"
								style={{
									padding: 10,
									boxShadow: "none",
									borderColor:
										e.status === "failed"
											? "var(--red-bd)"
											: e.status === "local_draft"
												? "var(--purple-bd)"
												: undefined
								}}>
								<div
									style={{
										display: "flex",
										alignItems: "center",
										justifyContent: "space-between",
										gap: 8
									}}>
									<div style={{ minWidth: 0 }}>
										<div style={{ fontSize: 12.5, fontWeight: 650 }}>
											{changeTypeLabel[e.changeType]}
										</div>
										<div style={{ fontSize: 11, color: "var(--text-3)" }}>
											{timeAgo(e.createdAt)}
										</div>
									</div>
									<SyncBadge status={e.status} />
								</div>

								{impact && (
									<div
										style={{
											display: "inline-flex",
											alignItems: "center",
											gap: 4,
											marginTop: 6,
											padding: "2px 7px",
											borderRadius: 99,
											fontSize: 10.5,
											fontWeight: 700,
											background: impact.bg,
											border: `1px solid ${impact.bd}`,
											color: impact.color
										}}>
										{impact.text}
									</div>
								)}

								{e.summary && (
									<div
										style={{
											marginTop: 5,
											fontSize: 11.5,
											color: "var(--text-2)"
										}}>
										{e.summary}
									</div>
								)}

								{fix && (
									<div
										style={{
											marginTop: 5,
											fontSize: 11.5,
											color: e.status === "failed" ? "var(--red-fg)" : "var(--purple-fg)"
										}}>
										{e.status === "failed" ? "⊗ Fix: " : "ℹ "}
										{fix}
									</div>
								)}

								<div
									style={{
										display: "flex",
										flexWrap: "wrap",
										gap: 6,
										marginTop: 8
									}}>
									{e.status === "failed" && (
										<>
											<Button variant="subtle" size="sm" onClick={() => retrySyncEvent(e.id)}>
												<Icon name="retry" size={13} />
												Retry
											</Button>
											<Button variant="subtle" size="sm" onClick={() => resolveSyncEvent(e.id)}>
												<Icon name="check" size={13} />
												Resolve
											</Button>
										</>
									)}
									<Button variant="ghost" size="sm" onClick={() => setDiscardId(e.id)}>
										<Icon name="trash" size={13} />
										Discard
									</Button>
								</div>
							</div>
						);
					})}
				</div>
			)}

			<ConfirmDialog
				open={discardId !== null}
				danger
				title="Discard local change?"
				message="This pending change will be removed and will not be synced to the operations system. This cannot be undone."
				confirmLabel="Discard"
				onCancel={() => setDiscardId(null)}
				onConfirm={() => {
					if (discardId) discardSyncEvent(discardId);
					setDiscardId(null);
				}}
			/>
		</Section>
	);
}
