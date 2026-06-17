"use client";

import { create } from "zustand";

import { activityLog as seedActivity } from "@/data/activityLog";
import { assets as seedAssets } from "@/data/assets";
import { inspections as seedInspections } from "@/data/inspections";
import { parcels as seedParcels } from "@/data/parcels";
import { syncEvents as seedSyncEvents } from "@/data/syncEvents";
import { addDays, stampFromSeq, TODAY } from "@/lib/dateFormat";
import type { QuickFilter } from "@/lib/filters";
import {
	areaDeltaAcres,
	coordsFromOpen,
	insertMidpoint,
	moveVertex,
	openRing,
	outerRing,
	removeVertex,
	type Vertex
} from "@/lib/geometry";
import { isSyncable, resolveSyncOutcome, SYNC_RESOLVE_MS, SYNC_SYNCING_MS } from "@/lib/syncSimulation";
import { DEFAULT_THEME, type ThemeName } from "@/lib/themes";
import {
	type FieldErrors,
	type InspectionDraft,
	type ParcelEditDraft,
	validateGeometry,
	validateInspection,
	validateParcelEdit
} from "@/lib/validation";
import type {
	ActivityLogItem,
	FieldMarkerAsset,
	InspectionRecord,
	ParcelAsset,
	ParcelStatus,
	SyncEvent,
	SyncStatus
} from "@/types/domain";
import type {
	ActiveFilters,
	BottomPanelTab,
	GeometryEditSession,
	InspectorMode,
	LayerVisibility,
	MapCommand,
	Toast,
	UISelectionState
} from "@/types/ui";

const emptyLayers: LayerVisibility = {
	parcels: true,
	irrigationAssets: true,
	soilSensors: true,
	accessGates: true,
	maintenanceFlags: true,
	inspectionHeatOverlay: false
};

const emptyFilters: ActiveFilters = {
	statuses: [],
	cropTypes: [],
	technicians: [],
	syncStatuses: [],
	visibleLayers: emptyLayers
};

const emptyGeometryEdit: GeometryEditSession = {
	parcelId: null,
	state: "none",
	selectedVertexIndex: null,
	areaDeltaAcres: 0,
	validationMessages: []
};

export interface MaintenanceDraft {
	issueType: string;
	priority: "low" | "medium" | "high" | "critical";
	assignedTechnician: string;
	notes: string;
}

export interface OperationsState {
	// data
	parcels: ParcelAsset[];
	assets: FieldMarkerAsset[];
	inspections: InspectionRecord[];
	syncEvents: SyncEvent[];
	activityLog: ActivityLogItem[];

	// ui
	selection: UISelectionState;
	filters: ActiveFilters;
	search: string;
	geometryEdit: GeometryEditSession;
	bottomPanelTab: BottomPanelTab;
	bottomPanelCollapsed: boolean;
	connectivity: "online" | "offline";
	theme: ThemeName;
	isSyncing: boolean;
	mapCommand: MapCommand;
	toasts: Toast[];
	formErrors: FieldErrors;

	// internal sequence for deterministic ids/timestamps
	seq: number;

	// selection actions
	selectParcel: (parcelId: string, opts?: { focus?: boolean }) => void;
	selectAsset: (assetId: string) => void;
	clearSelection: () => void;
	setInspectorMode: (mode: InspectorMode) => void;

	// filter actions
	toggleStatusFilter: (status: ParcelAsset["properties"]["status"]) => void;
	toggleCropFilter: (crop: ParcelAsset["properties"]["cropType"]) => void;
	toggleTechnicianFilter: (tech: string) => void;
	toggleSyncFilter: (sync: SyncStatus) => void;
	toggleLayer: (layer: keyof LayerVisibility) => void;
	clearFilters: () => void;
	applyQuickFilter: (q: QuickFilter) => void;
	applySavedView: (viewId: SavedViewId) => void;
	setSearch: (q: string) => void;

	// parcel edit
	startParcelEdit: () => void;
	saveParcelEdit: (draft: ParcelEditDraft) => boolean;
	cancelEdit: () => void;

	// inspection
	startInspection: () => void;
	saveInspection: (
		draft: InspectionDraft & {
			soilMoisture: InspectionRecord["soilMoisture"];
			pestPressure: InspectionRecord["pestPressure"];
			followUpRequired: boolean;
			notes: string;
			inspectionDate: string;
		}
	) => boolean;

	// maintenance
	startMaintenance: () => void;
	saveMaintenance: (draft: MaintenanceDraft) => boolean;

	// geometry
	startGeometryEdit: () => void;
	moveDraftVertex: (index: number, position: Vertex) => void;
	addDraftMidpoint: (edgeIndex: number) => void;
	removeDraftVertex: (index: number) => void;
	selectVertex: (index: number | null) => void;
	saveGeometry: () => boolean;
	cancelGeometryEdit: () => void;

	// sync
	syncAll: () => void;
	retrySyncEvent: (eventId: string) => void;
	resolveSyncEvent: (eventId: string) => void;
	discardSyncEvent: (eventId: string) => void;

	// map
	fitRegion: () => void;
	fitSelected: () => void;
	consumeMapCommand: () => void;

	// bottom panel
	setBottomPanelTab: (tab: BottomPanelTab) => void;
	toggleBottomPanel: () => void;

	// misc
	toggleConnectivity: () => void;
	setTheme: (theme: ThemeName) => void;
	pushToast: (message: string, tone?: Toast["tone"]) => void;
	dismissToast: (id: string) => void;
}

export type SavedViewId = "todays_inspections" | "irrigation_maintenance" | "unsynced_field_edits" | "high_risk";

const ACTOR = "Ops Coordinator";

function statusFromResult(result: InspectionRecord["result"]): ParcelStatus | null {
	switch (result) {
		case "passed":
			return "healthy";
		case "monitor":
			return "inspection_due";
		case "follow_up_required":
			return "maintenance_required";
		case "blocked":
			return "blocked";
		default:
			return null;
	}
}

export const useOperationsStore = create<OperationsState>((set, get) => {
	// ---- helpers that close over set/get ----
	const nextSeq = (): number => {
		const s = get().seq + 1;
		set({ seq: s });
		return s;
	};

	const logActivity = (
		item: Omit<ActivityLogItem, "id" | "timestamp" | "actor"> & Partial<Pick<ActivityLogItem, "actor">>
	) => {
		const s = nextSeq();
		const entry: ActivityLogItem = {
			id: `ACT-${1000 + s}`,
			timestamp: stampFromSeq(s),
			actor: item.actor ?? ACTOR,
			entityType: item.entityType,
			entityId: item.entityId,
			action: item.action,
			message: item.message,
			severity: item.severity
		};
		set(st => ({ activityLog: [...st.activityLog, entry] }));
	};

	const addSyncEvent = (
		e: Omit<SyncEvent, "id" | "createdAt" | "retryCount" | "status"> & {
			status?: SyncStatus;
		}
	): SyncEvent => {
		const s = nextSeq();
		const event: SyncEvent = {
			id: `SYNC-${1000 + s}`,
			createdAt: stampFromSeq(s),
			retryCount: 0,
			status: e.status ?? "pending",
			entityType: e.entityType,
			entityId: e.entityId,
			entityLabel: e.entityLabel,
			changeType: e.changeType,
			summary: e.summary,
			payloadPreview: e.payloadPreview
		};
		set(st => ({ syncEvents: [...st.syncEvents, event] }));
		return event;
	};

	const setEntitySync = (entityType: SyncEvent["entityType"], entityId: string, status: SyncStatus) => {
		if (entityType === "parcel") {
			set(st => ({
				parcels: st.parcels.map(p =>
					p.id === entityId ? { ...p, properties: { ...p.properties, syncStatus: status } } : p
				)
			}));
		} else if (entityType === "asset") {
			set(st => ({
				assets: st.assets.map(a =>
					a.id === entityId ? { ...a, properties: { ...a.properties, syncStatus: status } } : a
				)
			}));
		} else {
			set(st => ({
				inspections: st.inspections.map(i => (i.id === entityId ? { ...i, syncStatus: status } : i))
			}));
		}
	};

	const parcelLabel = (id: string): string => {
		const p = get().parcels.find(x => x.id === id);
		return p ? `${p.properties.parcelId} — ${p.properties.name}` : id;
	};

	const recomputeDraftMetrics = () => {
		const { geometryEdit } = get();
		if (!geometryEdit.draftCoordinates || !geometryEdit.originalCoordinates) return;
		const delta = areaDeltaAcres(geometryEdit.originalCoordinates, geometryEdit.draftCoordinates);
		const v = validateGeometry(geometryEdit.draftCoordinates, geometryEdit.parcelId ?? "");
		set(st => ({
			geometryEdit: {
				...st.geometryEdit,
				areaDeltaAcres: delta,
				validationMessages: [...v.errors, ...v.warnings],
				state: v.canSave ? "ready_to_save" : "invalid"
			}
		}));
	};

	const resolveEventsNow = (ids: string[]) => {
		ids.forEach((id, idx) => {
			window.setTimeout(
				() => {
					const event = get().syncEvents.find(e => e.id === id);
					if (!event) return;
					const outcome = resolveSyncOutcome(event);
					const s = nextSeq();
					const stamp = stampFromSeq(s);
					set(st => ({
						syncEvents: st.syncEvents.map(e =>
							e.id === id
								? {
										...e,
										status: outcome.status,
										completedAt: outcome.status === "synced" ? stamp : undefined,
										lastAttemptAt: stamp,
										errorMessage: outcome.status === "failed" ? outcome.errorMessage : undefined,
										retryCount: outcome.status === "failed" ? e.retryCount + 1 : e.retryCount
									}
								: e
						)
					}));
					setEntitySync(event.entityType, event.entityId, outcome.status);
					logActivity({
						entityType: event.entityType,
						entityId: event.entityId,
						action: outcome.status === "synced" ? "synced" : "sync_failed",
						severity: outcome.status === "synced" ? "success" : "error",
						message:
							outcome.status === "synced"
								? `${event.entityLabel}: ${event.summary} synced.`
								: `Sync failed for ${event.entityLabel}: ${outcome.errorMessage}`
					});
					// last one clears the syncing flag
					if (idx === ids.length - 1) {
						set({ isSyncing: false });
						const failures = get().syncEvents.filter(
							e => ids.includes(e.id) && e.status === "failed"
						).length;
						get().pushToast(
							failures > 0
								? `Sync complete — ${failures} change${failures === 1 ? "" : "s"} failed.`
								: "All changes synced.",
							failures > 0 ? "warning" : "success"
						);
					}
				},
				SYNC_SYNCING_MS + idx * SYNC_RESOLVE_MS
			);
		});
	};

	const runSync = (ids: string[]) => {
		if (ids.length === 0 || get().isSyncing) return;
		const s = nextSeq();
		const stamp = stampFromSeq(s);
		set(st => ({
			isSyncing: true,
			syncEvents: st.syncEvents.map(e =>
				ids.includes(e.id) ? { ...e, status: "syncing", lastAttemptAt: stamp } : e
			)
		}));
		logActivity({
			entityType: "parcel",
			entityId: get().selection.selectedParcelId ?? "—",
			action: "synced",
			severity: "info",
			message: `Sync started for ${ids.length} change${ids.length === 1 ? "" : "s"}.`
		});
		resolveEventsNow(ids);
	};

	return {
		parcels: seedParcels,
		assets: seedAssets,
		inspections: seedInspections,
		syncEvents: seedSyncEvents,
		activityLog: seedActivity,

		selection: {
			selectedEntityType: null,
			selectedEntityId: null,
			selectedParcelId: null,
			inspectorMode: "empty",
			mapMode: "review"
		},
		filters: emptyFilters,
		search: "",
		geometryEdit: emptyGeometryEdit,
		bottomPanelTab: "activity",
		bottomPanelCollapsed: false,
		connectivity: "online",
		theme: DEFAULT_THEME,
		isSyncing: false,
		mapCommand: null,
		toasts: [],
		formErrors: {},
		seq: 0,

		selectParcel: (parcelId, opts) => {
			const st = get();
			if (st.selection.mapMode === "edit_geometry") return; // locked during boundary edit
			const exists = st.parcels.some(p => p.id === parcelId);
			if (!exists) return;
			set({
				selection: {
					...st.selection,
					selectedEntityType: "parcel",
					selectedEntityId: parcelId,
					selectedParcelId: parcelId,
					inspectorMode: "parcel_view"
				},
				formErrors: {}
			});
			if (opts?.focus) get().fitSelected();
		},

		selectAsset: assetId => {
			const st = get();
			if (st.selection.mapMode === "edit_geometry") return;
			const asset = st.assets.find(a => a.id === assetId);
			if (!asset) return;
			set({
				selection: {
					...st.selection,
					selectedEntityType: "asset",
					selectedEntityId: assetId,
					selectedParcelId: asset.properties.linkedParcelId,
					inspectorMode: "asset_view"
				},
				formErrors: {}
			});
		},

		clearSelection: () => {
			const st = get();
			if (st.selection.mapMode === "edit_geometry") return;
			set({
				selection: {
					selectedEntityType: null,
					selectedEntityId: null,
					selectedParcelId: null,
					inspectorMode: "empty",
					mapMode: "review"
				},
				formErrors: {}
			});
		},

		setInspectorMode: mode =>
			set(st => ({
				selection: { ...st.selection, inspectorMode: mode },
				formErrors: {}
			})),

		toggleStatusFilter: status =>
			set(st => ({
				filters: {
					...st.filters,
					statuses: toggle(st.filters.statuses, status)
				}
			})),
		toggleCropFilter: crop =>
			set(st => ({
				filters: { ...st.filters, cropTypes: toggle(st.filters.cropTypes, crop) }
			})),
		toggleTechnicianFilter: tech =>
			set(st => ({
				filters: {
					...st.filters,
					technicians: toggle(st.filters.technicians, tech)
				}
			})),
		toggleSyncFilter: sync =>
			set(st => ({
				filters: {
					...st.filters,
					syncStatuses: toggle(st.filters.syncStatuses, sync)
				}
			})),
		toggleLayer: layer =>
			set(st => ({
				filters: {
					...st.filters,
					visibleLayers: {
						...st.filters.visibleLayers,
						[layer]: !st.filters.visibleLayers[layer]
					}
				}
			})),
		clearFilters: () => set({ filters: { ...emptyFilters, visibleLayers: { ...emptyLayers } }, search: "" }),

		applyQuickFilter: q => {
			const base: ActiveFilters = {
				statuses: [],
				cropTypes: [],
				technicians: [],
				syncStatuses: [],
				visibleLayers: { ...get().filters.visibleLayers }
			};
			if (q === "maintenance") base.statuses = ["maintenance_required"];
			else if (q === "critical") base.statuses = ["blocked"];
			else if (q === "due_today") base.statuses = ["inspection_due"];
			else if (q === "unsynced") base.syncStatuses = ["pending", "failed", "local_draft"];
			set({ filters: base });
		},

		applySavedView: viewId => {
			const base: ActiveFilters = {
				statuses: [],
				cropTypes: [],
				technicians: [],
				syncStatuses: [],
				visibleLayers: { ...get().filters.visibleLayers }
			};
			if (viewId === "todays_inspections") base.statuses = ["inspection_due"];
			else if (viewId === "irrigation_maintenance") base.statuses = ["maintenance_required", "blocked"];
			else if (viewId === "unsynced_field_edits") base.syncStatuses = ["pending", "failed", "local_draft"];
			else if (viewId === "high_risk") base.statuses = ["blocked"];
			set({ filters: base });
			get().pushToast("Saved view applied.", "info");
		},

		setSearch: q => set({ search: q }),

		startParcelEdit: () =>
			set(st => ({
				selection: { ...st.selection, inspectorMode: "parcel_edit" },
				formErrors: {}
			})),

		saveParcelEdit: draft => {
			const st = get();
			const id = st.selection.selectedParcelId;
			if (!id) return false;
			const errors = validateParcelEdit(draft);
			if (Object.keys(errors).length) {
				set({ formErrors: errors });
				return false;
			}
			const s = nextSeq();
			set(state => ({
				parcels: state.parcels.map(p =>
					p.id === id
						? {
								...p,
								properties: {
									...p.properties,
									status: draft.status,
									riskLevel: draft.riskLevel,
									assignedTechnician: draft.assignedTechnician,
									irrigationCondition: draft.irrigationCondition,
									priority: draft.priority as ParcelAsset["properties"]["priority"],
									notes: draft.notes,
									syncStatus: "pending",
									updatedAt: stampFromSeq(s)
								}
							}
						: p
				),
				formErrors: {},
				selection: { ...state.selection, inspectorMode: "parcel_view" }
			}));
			addSyncEvent({
				entityType: "parcel",
				entityId: id,
				entityLabel: parcelLabel(id),
				changeType: "attribute_update",
				summary: `Status → ${draft.status.replace(/_/g, " ")}; tech → ${draft.assignedTechnician}`,
				payloadPreview: {
					parcelId: id,
					status: draft.status,
					riskLevel: draft.riskLevel,
					assignedTechnician: draft.assignedTechnician,
					irrigationCondition: draft.irrigationCondition
				}
			});
			logActivity({
				entityType: "parcel",
				entityId: id,
				action: "updated",
				severity: "info",
				message: `${parcelLabel(id)} attributes updated — queued for sync.`
			});
			get().pushToast("Parcel changes saved locally.", "success");
			return true;
		},

		cancelEdit: () =>
			set(st => ({
				selection: {
					...st.selection,
					inspectorMode: st.selection.selectedEntityType === "asset" ? "asset_view" : "parcel_view"
				},
				formErrors: {}
			})),

		startInspection: () =>
			set(st => ({
				selection: { ...st.selection, inspectorMode: "inspection_create" },
				formErrors: {}
			})),

		saveInspection: draft => {
			const st = get();
			const id = st.selection.selectedParcelId;
			if (!id) return false;
			const errors = validateInspection(draft);
			if (Object.keys(errors).length) {
				set({ formErrors: errors });
				return false;
			}
			const s = nextSeq();
			const record: InspectionRecord = {
				id: `INS-${1000 + s}`,
				parcelId: id,
				inspectorName: draft.inspectorName,
				inspectionDate: draft.inspectionDate || TODAY,
				result: draft.result as InspectionRecord["result"],
				soilMoisture: draft.soilMoisture,
				irrigationCondition: draft.irrigationCondition as InspectionRecord["irrigationCondition"],
				pestPressure: draft.pestPressure,
				accessCondition: draft.accessCondition as InspectionRecord["accessCondition"],
				followUpRequired: draft.followUpRequired,
				notes: draft.notes,
				createdAt: stampFromSeq(s),
				syncStatus: "pending"
			};
			const newStatus = statusFromResult(record.result);
			set(state => ({
				inspections: [...state.inspections, record],
				parcels: state.parcels.map(p =>
					p.id === id
						? {
								...p,
								properties: {
									...p.properties,
									lastInspectionDate: record.inspectionDate,
									nextInspectionDue: addDays(record.inspectionDate, 30),
									status: newStatus ?? p.properties.status,
									syncStatus: "pending",
									updatedAt: stampFromSeq(s)
								}
							}
						: p
				),
				formErrors: {},
				selection: { ...state.selection, inspectorMode: "parcel_view" }
			}));
			addSyncEvent({
				entityType: "inspection",
				entityId: record.id,
				entityLabel: parcelLabel(id),
				changeType: "inspection_create",
				summary: `${record.result.replace(/_/g, " ")} inspection by ${record.inspectorName}`,
				payloadPreview: {
					parcelId: id,
					result: record.result,
					inspector: record.inspectorName,
					irrigationCondition: record.irrigationCondition
				}
			});
			logActivity({
				entityType: "inspection",
				entityId: record.id,
				action: "created",
				severity: record.followUpRequired ? "warning" : "success",
				message: `${record.inspectorName} completed inspection for ${parcelLabel(id)}.`
			});
			get().pushToast("Inspection saved locally.", "success");
			return true;
		},

		startMaintenance: () =>
			set(st => ({
				selection: { ...st.selection, inspectorMode: "maintenance_create" },
				formErrors: {}
			})),

		saveMaintenance: draft => {
			const st = get();
			const id = st.selection.selectedParcelId;
			if (!id) return false;
			if (!draft.issueType.trim()) {
				set({ formErrors: { issueType: "Issue type is required." } });
				return false;
			}
			const s = nextSeq();
			set(state => ({
				parcels: state.parcels.map(p =>
					p.id === id
						? {
								...p,
								properties: {
									...p.properties,
									openMaintenanceCount: p.properties.openMaintenanceCount + 1,
									updatedAt: stampFromSeq(s)
								}
							}
						: p
				),
				formErrors: {},
				selection: {
					...state.selection,
					inspectorMode: state.selection.selectedEntityType === "asset" ? "asset_view" : "parcel_view"
				}
			}));
			addSyncEvent({
				entityType: "parcel",
				entityId: id,
				entityLabel: parcelLabel(id),
				changeType: "maintenance_task_create",
				summary: `${draft.issueType} (${draft.priority}) → ${draft.assignedTechnician}`,
				payloadPreview: {
					parcelId: id,
					issueType: draft.issueType,
					priority: draft.priority,
					assignedTechnician: draft.assignedTechnician
				}
			});
			logActivity({
				entityType: "parcel",
				entityId: id,
				action: "created",
				severity: "warning",
				message: `Maintenance task "${draft.issueType}" created for ${parcelLabel(id)}.`
			});
			get().pushToast("Maintenance task created.", "success");
			return true;
		},

		startGeometryEdit: () => {
			const st = get();
			const id = st.selection.selectedParcelId;
			const parcel = st.parcels.find(p => p.id === id);
			if (!parcel) return;
			const original = parcel.geometry.coordinates;
			set({
				selection: {
					...st.selection,
					inspectorMode: "geometry_edit",
					mapMode: "edit_geometry"
				},
				geometryEdit: {
					parcelId: id,
					state: "editing",
					originalCoordinates: original,
					draftCoordinates: original,
					selectedVertexIndex: null,
					areaDeltaAcres: 0,
					validationMessages: []
				}
			});
		},

		moveDraftVertex: (index, position) => {
			const { geometryEdit } = get();
			if (!geometryEdit.draftCoordinates) return;
			const open = openRing(outerRing(geometryEdit.draftCoordinates));
			const next = moveVertex(open, index, position);
			set(st => ({
				geometryEdit: {
					...st.geometryEdit,
					draftCoordinates: coordsFromOpen(next),
					state: "dirty"
				}
			}));
			recomputeDraftMetrics();
		},

		addDraftMidpoint: edgeIndex => {
			const { geometryEdit } = get();
			if (!geometryEdit.draftCoordinates) return;
			const open = openRing(outerRing(geometryEdit.draftCoordinates));
			const next = insertMidpoint(open, edgeIndex);
			set(st => ({
				geometryEdit: {
					...st.geometryEdit,
					draftCoordinates: coordsFromOpen(next),
					selectedVertexIndex: edgeIndex + 1,
					state: "dirty"
				}
			}));
			recomputeDraftMetrics();
		},

		removeDraftVertex: index => {
			const { geometryEdit } = get();
			if (!geometryEdit.draftCoordinates) return;
			const open = openRing(outerRing(geometryEdit.draftCoordinates));
			if (open.length <= 3) {
				get().pushToast("A boundary needs at least 3 vertices.", "warning");
				return;
			}
			const next = removeVertex(open, index);
			set(st => ({
				geometryEdit: {
					...st.geometryEdit,
					draftCoordinates: coordsFromOpen(next),
					selectedVertexIndex: null,
					state: "dirty"
				}
			}));
			recomputeDraftMetrics();
		},

		selectVertex: index =>
			set(st => ({
				geometryEdit: { ...st.geometryEdit, selectedVertexIndex: index }
			})),

		saveGeometry: () => {
			const st = get();
			const id = st.geometryEdit.parcelId;
			const draft = st.geometryEdit.draftCoordinates;
			if (!id || !draft) return false;
			const v = validateGeometry(draft, id);
			if (!v.canSave) {
				set(state => ({
					geometryEdit: {
						...state.geometryEdit,
						state: "invalid",
						validationMessages: [...v.errors, ...v.warnings]
					}
				}));
				get().pushToast("Boundary has blocking validation errors.", "error");
				return false;
			}
			const supervisor = v.warnings.length > 0;
			// Keep acreage believable: adjust the authored acreage by the shoelace
			// area delta rather than replacing it with a raw projected area.
			const authoredAcreage = st.parcels.find(p => p.id === id)?.properties.acreage ?? 0;
			const newAcreage = Math.max(0, Math.round((authoredAcreage + st.geometryEdit.areaDeltaAcres) * 10) / 10);
			const s = nextSeq();
			set(state => ({
				parcels: state.parcels.map(p =>
					p.id === id
						? {
								...p,
								geometry: { type: "Polygon", coordinates: draft },
								properties: {
									...p.properties,
									acreage: newAcreage > 0 ? newAcreage : p.properties.acreage,
									syncStatus: supervisor ? "local_draft" : "pending",
									updatedAt: stampFromSeq(s)
								}
							}
						: p
				),
				selection: {
					...state.selection,
					inspectorMode: "parcel_view",
					mapMode: "review"
				},
				geometryEdit: emptyGeometryEdit
			}));
			addSyncEvent({
				entityType: "parcel",
				entityId: id,
				entityLabel: parcelLabel(id),
				changeType: "geometry_update",
				status: supervisor ? "local_draft" : "pending",
				summary: supervisor ? "Boundary redraw (supervisor review required)" : "Boundary redraw staged",
				payloadPreview: {
					parcelId: id,
					areaDeltaAcres: Math.round(st.geometryEdit.areaDeltaAcres * 100) / 100,
					review: supervisor ? "supervisor_required" : "auto"
				}
			});
			logActivity({
				entityType: "parcel",
				entityId: id,
				action: "edited_geometry",
				severity: supervisor ? "warning" : "info",
				message: supervisor
					? `Boundary edited for ${parcelLabel(id)} — supervisor review required.`
					: `Boundary edited for ${parcelLabel(id)}.`
			});
			get().pushToast(
				supervisor ? "Boundary saved — pending supervisor review." : "Boundary saved locally.",
				supervisor ? "warning" : "success"
			);
			return true;
		},

		cancelGeometryEdit: () =>
			set(st => ({
				selection: {
					...st.selection,
					inspectorMode: "parcel_view",
					mapMode: "review"
				},
				geometryEdit: emptyGeometryEdit
			})),

		syncAll: () => {
			const ids = get()
				.syncEvents.filter(isSyncable)
				.map(e => e.id);
			runSync(ids);
		},
		retrySyncEvent: eventId => runSync([eventId]),

		resolveSyncEvent: eventId => {
			const event = get().syncEvents.find(e => e.id === eventId);
			if (!event) return;
			const s = nextSeq();
			set(st => ({
				syncEvents: st.syncEvents.map(e =>
					e.id === eventId
						? { ...e, status: "synced", completedAt: stampFromSeq(s), errorMessage: undefined }
						: e
				)
			}));
			setEntitySync(event.entityType, event.entityId, "synced");
			logActivity({
				entityType: event.entityType,
				entityId: event.entityId,
				action: "resolved",
				severity: "success",
				message: `${event.entityLabel}: marked reviewed and resolved.`
			});
			get().pushToast("Change resolved as reviewed.", "success");
		},

		discardSyncEvent: eventId => {
			const event = get().syncEvents.find(e => e.id === eventId);
			if (!event) return;
			set(st => ({
				syncEvents: st.syncEvents.filter(e => e.id !== eventId)
			}));
			setEntitySync(event.entityType, event.entityId, "synced");
			logActivity({
				entityType: event.entityType,
				entityId: event.entityId,
				action: "discarded",
				severity: "warning",
				message: `Local change discarded for ${event.entityLabel}.`
			});
			get().pushToast("Local change discarded.", "info");
		},

		fitRegion: () => set(st => ({ mapCommand: { kind: "fit_region", token: st.seq + 1 }, seq: st.seq + 1 })),
		fitSelected: () => {
			const id = get().selection.selectedParcelId;
			if (!id) return;
			set(st => ({
				mapCommand: { kind: "fit_selected", token: st.seq + 1, parcelId: id },
				seq: st.seq + 1
			}));
		},
		consumeMapCommand: () => set({ mapCommand: null }),

		setBottomPanelTab: tab => set({ bottomPanelTab: tab, bottomPanelCollapsed: false }),
		toggleBottomPanel: () => set(st => ({ bottomPanelCollapsed: !st.bottomPanelCollapsed })),

		toggleConnectivity: () =>
			set(st => ({
				connectivity: st.connectivity === "online" ? "offline" : "online"
			})),

		setTheme: theme => set({ theme }),

		pushToast: (message, tone = "info") => {
			const s = nextSeq();
			const id = `T-${s}`;
			set(st => ({ toasts: [...st.toasts, { id, message, tone }] }));
			window.setTimeout(() => get().dismissToast(id), 3800);
		},
		dismissToast: id => set(st => ({ toasts: st.toasts.filter(t => t.id !== id) }))
	};
});

function toggle<T>(list: T[], value: T): T[] {
	return list.includes(value) ? list.filter(v => v !== value) : [...list, value];
}

// ---- selector helpers (use with useOperationsStore(selector)) ----
export const selectSelectedParcel = (s: OperationsState): ParcelAsset | undefined =>
	s.selection.selectedParcelId ? s.parcels.find(p => p.id === s.selection.selectedParcelId) : undefined;

export const selectSelectedAsset = (s: OperationsState): FieldMarkerAsset | undefined =>
	s.selection.selectedEntityType === "asset" && s.selection.selectedEntityId
		? s.assets.find(a => a.id === s.selection.selectedEntityId)
		: undefined;

export const selectInspectionsForParcel = (s: OperationsState, parcelId: string): InspectionRecord[] =>
	s.inspections.filter(i => i.parcelId === parcelId).sort((a, b) => (a.inspectionDate < b.inspectionDate ? 1 : -1));

export const selectAssetsForParcel = (s: OperationsState, parcelId: string): FieldMarkerAsset[] =>
	s.assets.filter(a => a.properties.linkedParcelId === parcelId);

export const selectPendingForEntity = (s: OperationsState, entityId: string): SyncEvent[] =>
	s.syncEvents.filter(e => e.entityId === entityId);
