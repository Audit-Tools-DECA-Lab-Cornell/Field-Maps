"use client";

import { Button } from "@/components/shared/Button";
import { Icon } from "@/components/shared/Icon";
import { pendingSyncCount } from "@/lib/filters";
import { isSyncable } from "@/lib/syncSimulation";
import { useOperationsStore } from "@/state/useOperationsStore";
import type { BottomPanelTab } from "@/types/ui";

import { ActivityLogTab } from "./ActivityLogTab";
import { AnalyticsTab } from "./AnalyticsTab";
import { SyncQueueTab } from "./SyncQueueTab";

const TABS: { id: BottomPanelTab; label: string }[] = [
	{ id: "activity", label: "Activity" },
	{ id: "sync_queue", label: "Sync Queue" },
	{ id: "analytics", label: "Region Health" }
];

export function BottomOperationsPanel() {
	const bottomPanelTab = useOperationsStore(s => s.bottomPanelTab);
	const bottomPanelCollapsed = useOperationsStore(s => s.bottomPanelCollapsed);
	const setBottomPanelTab = useOperationsStore(s => s.setBottomPanelTab);
	const toggleBottomPanel = useOperationsStore(s => s.toggleBottomPanel);
	const syncEvents = useOperationsStore(s => s.syncEvents);
	const isSyncing = useOperationsStore(s => s.isSyncing);
	const syncAll = useOperationsStore(s => s.syncAll);

	const pendingCount = pendingSyncCount(syncEvents);
	const hasSyncable = syncEvents.some(isSyncable);

	return (
		<div
			style={{
				width: "100%",
				height: "100%",
				display: "flex",
				flexDirection: "column",
				background: "var(--surface)",
				minHeight: 0
			}}>
			{/* header bar */}
			<div
				style={{
					height: 40,
					flex: "none",
					display: "flex",
					alignItems: "stretch",
					justifyContent: "space-between",
					gap: 12,
					padding: "0 10px",
					background: "var(--surface-2)",
					borderBottom: "1px solid var(--border)"
				}}>
				<div className="fo-tabs" role="tablist" aria-label="Operations panel">
					{TABS.map(tab => {
						const active = bottomPanelTab === tab.id;
						return (
							<button
								key={tab.id}
								type="button"
								role="tab"
								aria-selected={active}
								className={`fo-tab ${active ? "is-active" : ""}`}
								onClick={() => setBottomPanelTab(tab.id)}>
								{tab.label}
								{tab.id === "sync_queue" && pendingCount > 0 && (
									<span
										style={{
											marginLeft: 6,
											display: "inline-flex",
											alignItems: "center",
											justifyContent: "center",
											minWidth: 16,
											height: 16,
											padding: "0 5px",
											borderRadius: 99,
											fontSize: 10.5,
											fontWeight: 700,
											lineHeight: 1,
											background: active ? "var(--accent)" : "var(--surface-3)",
											color: active ? "var(--accent-contrast)" : "var(--text-2)"
										}}>
										{pendingCount}
									</span>
								)}
							</button>
						);
					})}
				</div>

				<div style={{ display: "flex", alignItems: "center", gap: 6 }}>
					<Button
						size="sm"
						variant="primary"
						onClick={syncAll}
						disabled={isSyncing || !hasSyncable}
						title={hasSyncable ? "Sync all pending and failed changes" : "No changes to sync"}>
						<Icon name="sync" size={14} className={isSyncing ? "fo-pulse" : ""} />
						{isSyncing ? "Syncing…" : "Sync changes"}
					</Button>
					<Button
						size="sm"
						variant="ghost"
						onClick={toggleBottomPanel}
						aria-expanded={!bottomPanelCollapsed}
						title={bottomPanelCollapsed ? "Expand panel" : "Collapse panel"}>
						<Icon name={bottomPanelCollapsed ? "chevron-up" : "chevron-down"} size={16} />
					</Button>
				</div>
			</div>

			{/* content */}
			{!bottomPanelCollapsed && (
				<div className="fo-scroll" role="tabpanel" style={{ flex: 1, minHeight: 0 }}>
					{bottomPanelTab === "activity" && <ActivityLogTab />}
					{bottomPanelTab === "sync_queue" && <SyncQueueTab />}
					{bottomPanelTab === "analytics" && <AnalyticsTab />}
				</div>
			)}
		</div>
	);
}
