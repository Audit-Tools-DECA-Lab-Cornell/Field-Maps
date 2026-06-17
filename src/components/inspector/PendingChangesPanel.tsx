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
					{events.map(e => (
						<div key={e.id} className="fo-panel" style={{ padding: 10, boxShadow: "none" }}>
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
									<div style={{ fontSize: 11, color: "var(--text-3)" }}>{timeAgo(e.createdAt)}</div>
								</div>
								<SyncBadge status={e.status} />
							</div>

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

							{e.status === "failed" && e.errorMessage && (
								<div
									style={{
										marginTop: 5,
										fontSize: 11.5,
										color: "var(--red-fg)"
									}}>
									{e.errorMessage}
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
					))}
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
