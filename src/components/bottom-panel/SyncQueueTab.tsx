"use client";

import { useState } from "react";

import { SyncBadge } from "@/components/shared/Badge";
import { Button } from "@/components/shared/Button";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { Icon } from "@/components/shared/Icon";
import { timeAgo } from "@/lib/dateFormat";
import { changeTypeLabel } from "@/lib/labels";
import { isSyncable } from "@/lib/syncSimulation";
import { useOperationsStore } from "@/state/useOperationsStore";
import type { SyncEvent } from "@/types/domain";

export function SyncQueueTab() {
	const syncEvents = useOperationsStore(s => s.syncEvents);
	const retrySyncEvent = useOperationsStore(s => s.retrySyncEvent);
	const resolveSyncEvent = useOperationsStore(s => s.resolveSyncEvent);
	const discardSyncEvent = useOperationsStore(s => s.discardSyncEvent);
	const isSyncing = useOperationsStore(s => s.isSyncing);

	const [expanded, setExpanded] = useState<Record<string, boolean>>({});
	const [discardTarget, setDiscardTarget] = useState<SyncEvent | null>(null);

	const toggleExpanded = (id: string) => setExpanded(prev => ({ ...prev, [id]: !prev[id] }));

	return (
		<div>
			<div
				style={{
					display: "flex",
					alignItems: "center",
					justifyContent: "space-between",
					padding: "8px 14px"
				}}>
				<span className="fo-kicker">Sync queue ({syncEvents.length})</span>
			</div>

			{syncEvents.length === 0 ? (
				<div className="fo-empty" style={{ padding: "8px 16px 16px" }}>
					The sync queue is empty — all changes are reconciled.
				</div>
			) : (
				<table className="fo-table">
					<thead>
						<tr>
							<th>Status</th>
							<th>Entity</th>
							<th>Change</th>
							<th>Created</th>
							<th>Last attempt</th>
							<th style={{ width: "30%" }}>Summary</th>
							<th style={{ textAlign: "right" }}>Action</th>
						</tr>
					</thead>
					<tbody>
						{syncEvents.map(e => {
							const isOpen = !!expanded[e.id];
							const isFailed = e.status === "failed";
							const canRetry = isSyncable(e);
							return (
								<EventRowGroup
									key={e.id}
									event={e}
									isOpen={isOpen}
									isFailed={isFailed}
									canRetry={canRetry}
									isSyncing={isSyncing}
									onToggle={() => toggleExpanded(e.id)}
									onRetry={() => retrySyncEvent(e.id)}
									onResolve={() => resolveSyncEvent(e.id)}
									onDiscard={() => setDiscardTarget(e)}
								/>
							);
						})}
					</tbody>
				</table>
			)}

			<ConfirmDialog
				open={discardTarget !== null}
				danger
				title="Discard local change?"
				message={
					discardTarget ? (
						<>
							This permanently drops the queued change for <b>{discardTarget.entityLabel}</b> (
							{discardTarget.summary}). The entity will be marked as reconciled. This cannot be undone.
						</>
					) : (
						""
					)
				}
				confirmLabel="Discard change"
				onConfirm={() => {
					if (discardTarget) discardSyncEvent(discardTarget.id);
					setDiscardTarget(null);
				}}
				onCancel={() => setDiscardTarget(null)}
			/>
		</div>
	);
}

function EventRowGroup({
	event,
	isOpen,
	isFailed,
	canRetry,
	isSyncing,
	onToggle,
	onRetry,
	onResolve,
	onDiscard
}: {
	event: SyncEvent;
	isOpen: boolean;
	isFailed: boolean;
	canRetry: boolean;
	isSyncing: boolean;
	onToggle: () => void;
	onRetry: () => void;
	onResolve: () => void;
	onDiscard: () => void;
}) {
	return (
		<>
			<tr>
				<td>
					<SyncBadge status={event.status} />
				</td>
				<td style={{ fontWeight: 600 }}>{event.entityLabel}</td>
				<td style={{ color: "var(--text-2)" }}>{changeTypeLabel[event.changeType]}</td>
				<td className="fo-mono" style={{ color: "var(--text-3)" }}>
					{timeAgo(event.createdAt)}
				</td>
				<td className="fo-mono" style={{ color: "var(--text-3)" }}>
					{event.lastAttemptAt ? timeAgo(event.lastAttemptAt) : "—"}
				</td>
				<td style={{ maxWidth: 0 }}>
					<div
						style={{
							color: "var(--text-2)",
							overflow: "hidden",
							textOverflow: "ellipsis",
							whiteSpace: "nowrap"
						}}
						title={event.summary}>
						{event.summary}
					</div>
					{isFailed && event.errorMessage && (
						<div
							style={{
								color: "var(--red-fg)",
								fontSize: 11,
								marginTop: 2,
								overflow: "hidden",
								textOverflow: "ellipsis",
								whiteSpace: "nowrap"
							}}
							title={event.errorMessage}>
							{event.errorMessage}
						</div>
					)}
				</td>
				<td>
					<div
						style={{
							display: "flex",
							gap: 4,
							justifyContent: "flex-end",
							flexWrap: "nowrap"
						}}>
						<Button
							size="sm"
							variant="ghost"
							onClick={onToggle}
							aria-expanded={isOpen}
							title={isOpen ? "Hide detail" : "View detail"}>
							<Icon name="eye" size={14} />
							{isOpen ? "Hide" : "View"}
						</Button>
						{canRetry && (
							<Button size="sm" onClick={onRetry} disabled={isSyncing} title="Retry sync">
								<Icon name="retry" size={14} />
								Retry
							</Button>
						)}
						{isFailed && (
							<Button size="sm" onClick={onResolve} title="Mark reviewed and resolved">
								<Icon name="check" size={14} />
								Resolve
							</Button>
						)}
						<Button size="sm" variant="ghost" onClick={onDiscard} title="Discard local change">
							<Icon name="trash" size={14} />
						</Button>
					</div>
				</td>
			</tr>
			{isOpen && (
				<tr>
					<td colSpan={7} style={{ background: "var(--surface-2)" }}>
						<div style={{ padding: "2px 0 6px" }}>
							<div className="fo-kicker" style={{ marginBottom: 6 }}>
								Payload preview
							</div>
							<pre
								className="fo-mono"
								style={{
									margin: 0,
									padding: "10px 12px",
									background: "var(--surface-inset)",
									border: "1px solid var(--border)",
									borderRadius: "var(--r-md)",
									fontSize: 11.5,
									color: "var(--text)",
									whiteSpace: "pre-wrap",
									wordBreak: "break-word",
									overflowX: "auto"
								}}>
								{JSON.stringify(event.payloadPreview, null, 2)}
							</pre>
							{event.errorMessage && (
								<div
									style={{
										marginTop: 8,
										color: "var(--red-fg)",
										fontSize: 12,
										display: "flex",
										alignItems: "flex-start",
										gap: 6
									}}>
									<span style={{ display: "inline-flex", paddingTop: 1 }}>
										<Icon name="error" size={14} />
									</span>
									<span>{event.errorMessage}</span>
								</div>
							)}
						</div>
					</td>
				</tr>
			)}
		</>
	);
}
