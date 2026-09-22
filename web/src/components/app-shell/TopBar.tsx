"use client";

import { Button } from "@/components/shared/Button";
import { Icon } from "@/components/shared/Icon";
import type { QuickFilter } from "@/lib/filters";
import { useCaptureStore } from "@/state/useCaptureStore";
import { useOperationsStore } from "@/state/useOperationsStore";
import type { SyncEvent } from "@/types/domain";

import { ThemeSwitcher } from "./ThemeSwitcher";

const QUICK_FILTERS: { key: QuickFilter; label: string }[] = [
	{ key: "due_today", label: "Due Today" },
	{ key: "maintenance", label: "Maintenance" },
	{ key: "unsynced", label: "Unsynced" },
	{ key: "critical", label: "Critical" }
];

function useAppMode() {
	const inspectorMode = useOperationsStore(s => s.selection.inspectorMode);
	const mapMode = useOperationsStore(s => s.selection.mapMode);
	const isSyncing = useOperationsStore(s => s.isSyncing);
	if (mapMode === "edit_geometry") return { label: "Boundary Edit Mode", tone: "var(--purple)" };
	if (
		inspectorMode === "parcel_edit" ||
		inspectorMode === "inspection_create" ||
		inspectorMode === "maintenance_create"
	)
		return { label: "Attribute Edit Mode", tone: "var(--amber)" };
	if (isSyncing) return { label: "Sync Review Mode", tone: "var(--blue)" };
	return { label: "Review Mode", tone: "var(--gray)" };
}

function SyncCountDisplay({
	syncEvents,
	connectivity
}: {
	syncEvents: SyncEvent[];
	connectivity: "online" | "offline";
}) {
	const pending = syncEvents.filter(e => e.status === "pending").length;
	const failed = syncEvents.filter(e => e.status === "failed").length;
	const draft = syncEvents.filter(e => e.status === "local_draft").length;
	const total = pending + failed + draft;

	if (total === 0) return null;

	return (
		<span
			style={{
				display: "flex",
				alignItems: "center",
				gap: 6,
				fontSize: 11.5,
				fontWeight: 600
			}}>
			{pending > 0 && <span style={{ color: "var(--amber-fg)" }}>{pending} pending</span>}
			{pending > 0 && (failed > 0 || draft > 0) && <span style={{ color: "var(--border-strong)" }}>·</span>}
			{failed > 0 && <span style={{ color: "var(--red-fg)" }}>{failed} failed</span>}
			{failed > 0 && draft > 0 && <span style={{ color: "var(--border-strong)" }}>·</span>}
			{draft > 0 && <span style={{ color: "var(--purple-fg)" }}>{draft} draft</span>}
			{connectivity === "offline" && (
				<span style={{ color: "var(--text-3)", fontSize: 10.5 }}>(queued offline)</span>
			)}
		</span>
	);
}

export function TopBar() {
	const openCaptureWorkspace = useCaptureStore(s => s.openWorkspace);
	const search = useOperationsStore(s => s.search);
	const setSearch = useOperationsStore(s => s.setSearch);
	const syncEvents = useOperationsStore(s => s.syncEvents);
	const isSyncing = useOperationsStore(s => s.isSyncing);
	const syncAll = useOperationsStore(s => s.syncAll);
	const applyQuickFilter = useOperationsStore(s => s.applyQuickFilter);
	const connectivity = useOperationsStore(s => s.connectivity);
	const toggleConnectivity = useOperationsStore(s => s.toggleConnectivity);
	const mapMode = useOperationsStore(s => s.selection.mapMode);
	const mode = useAppMode();

	const pendingCount = syncEvents.filter(e => e.status === "pending").length;
	const failedCount = syncEvents.filter(e => e.status === "failed").length;
	const draftCount = syncEvents.filter(e => e.status === "local_draft").length;
	const hasSyncable = (pendingCount > 0 || failedCount > 0) && connectivity === "online";

	const syncLabel =
		connectivity === "offline"
			? "Offline — queued"
			: isSyncing
				? "Syncing…"
				: pendingCount === 0 && failedCount === 0 && draftCount > 0
					? `${draftCount} draft${draftCount !== 1 ? "s" : ""} — review required`
					: pendingCount === 0 && failedCount === 0
						? "All synced"
						: "Sync changes";

	return (
		<header className="fo-topbar">
			{/* row 1 — identity + global actions */}
			<div className="fo-topbar-row">
				<div style={{ display: "flex", alignItems: "center", gap: 8 }}>
					<span
						style={{
							display: "grid",
							placeItems: "center",
							width: 28,
							height: 28,
							borderRadius: 7,
							background: "var(--accent)",
							color: "var(--accent-contrast)"
						}}>
						<Icon name="boundary" size={16} />
					</span>
					<span style={{ fontWeight: 750, fontSize: 14, letterSpacing: "-0.01em" }}>
						FieldOps Parcel Editor
					</span>
					<span className="fo-badge is-purple fo-badge--square">Prototype</span>
				</div>

				<span
					style={{
						display: "flex",
						alignItems: "center",
						gap: 6,
						fontSize: 12,
						color: "var(--text-2)",
						paddingLeft: 12,
						borderLeft: "1px solid var(--border)"
					}}>
					<Icon name="pin" size={13} />
					Central Valley Demo Region
					<Icon name="chevron-down" size={12} />
				</span>

				<span
					className="fo-badge"
					style={{
						background: "color-mix(in srgb, " + mode.tone + " 16%, var(--surface))",
						color: mode.tone,
						borderColor: "color-mix(in srgb, " + mode.tone + " 34%, var(--surface))"
					}}>
					{mode.label}
				</span>

				<div style={{ flex: 1 }} />

				{mapMode === "edit_geometry" && (
					<span className="fo-badge is-amber">
						<Icon name="warning" size={12} /> Unsaved boundary edit
					</span>
				)}
				<ThemeSwitcher />
				<span aria-hidden style={{ width: 1, height: 24, background: "var(--border)" }} />
				<span
					style={{
						display: "flex",
						alignItems: "center",
						gap: 7,
						paddingRight: 12,
						borderRight: "1px solid var(--border)"
					}}>
					<span
						style={{
							display: "grid",
							placeItems: "center",
							width: 28,
							height: 28,
							borderRadius: 99,
							background: "var(--surface-3)",
							color: "var(--text-2)"
						}}>
						<Icon name="user" size={15} />
					</span>
					<span style={{ fontSize: 12, lineHeight: 1.2 }}>
						<span style={{ fontWeight: 650, display: "block" }}>Ops Coordinator</span>
						<span style={{ color: "var(--text-3)", fontSize: 11 }}>Northstar Ag</span>
					</span>
				</span>
				<button
					type="button"
					className={`fo-chip ${connectivity === "online" ? "is-active" : ""}`}
					onClick={toggleConnectivity}
					title="Toggle simulated connectivity">
					<Icon name={connectivity === "online" ? "wifi" : "wifi-off"} size={13} />
					{connectivity === "online" ? "Online" : "Offline simulation"}
				</button>
			</div>

			{/* row 2 — search + quick filters + sync */}
			<div className="fo-topbar-row">
				<div style={{ position: "relative", flex: "0 1 380px", minWidth: 200 }}>
					<span
						style={{
							position: "absolute",
							left: 9,
							top: "50%",
							transform: "translateY(-50%)",
							color: "var(--text-3)",
							pointerEvents: "none"
						}}>
						<Icon name="search" size={14} />
					</span>
					<input
						className="fo-input"
						style={{ paddingLeft: 30, height: 32 }}
						placeholder="Search parcels, assets, technicians…"
						value={search}
						onChange={e => setSearch(e.target.value)}
					/>
				</div>

				<span className="fo-kicker" style={{ marginLeft: 4 }}>
					Quick filters
				</span>
				<div style={{ display: "flex", gap: 6 }}>
					{QUICK_FILTERS.map(q => (
						<button key={q.key} type="button" className="fo-chip" onClick={() => applyQuickFilter(q.key)}>
							{q.label}
						</button>
					))}
				</div>

				<div style={{ flex: 1 }} />

				<SyncCountDisplay syncEvents={syncEvents} connectivity={connectivity} />

				<Button variant="subtle" onClick={openCaptureWorkspace}>
					<Icon name="pin" size={14} />
					Open field collector
				</Button>

				<Button variant="primary" onClick={syncAll} disabled={!hasSyncable || isSyncing}>
					<Icon name="sync" size={14} className={isSyncing ? "fo-pulse" : ""} />
					{syncLabel}
				</Button>
			</div>
		</header>
	);
}
