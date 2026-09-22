# Product framing

Build a prototype called **FieldMaps Parcel Editor**.

This is a **visual and interaction prototype** for an internal GIS operations tool used by a field operations team to manage farm parcels, inspection records, and maintenance tasks. It simulates the kind of workflow complexity found in ArcGIS/QGIS-style operational editing software, but without production GIS infrastructure.

The MVP should make one thing clear: this category of software is not “a map with a form.” It is a coordination surface where spatial data, field status, inspection history, geometry edits, offline changes, validation rules, and sync queues all interact.

The app should simulate:

- Selecting mapped parcels and field assets.
- Reviewing parcel metadata, inspection history, and operational status.
- Editing inspection records.
- Making simple geometry changes to parcel boundaries.
- Seeing validation warnings.
- Saving changes locally.
- Simulating sync to an operations system.
- Tracking all changes in an activity log.

The MVP should **feel like a real internal operations tool** used by an agriculture operations company, municipality, utility contractor, or inspection team. It should not feel like a toy map demo.

# Why this MVP stack

Use **Next.js 16 + TypeScript + Leaflet + OpenStreetMap tiles + hard-coded GeoJSON**.

This is the right stack because the goal is to prototype workflow complexity, not to build real GIS infrastructure.

**Next.js + TypeScript** gives the coding agent a clean modern app structure, typed data models, reusable components, and fast UI iteration. The App Router is the current primary routing model in Next.js documentation, so the prototype can stay aligned with modern Next conventions without needing a backend. ([Next.js][1])

**Leaflet** is ideal because it is lightweight, open-source, browser-native, and designed for interactive web maps. It supports markers, polygons, popups, events, layers, and viewport controls without forcing the app into a vendor GIS ecosystem. ([Leaflet][2])

**OpenStreetMap tiles** are appropriate for a small prototype because they avoid API keys and vendor billing. The prototype should only load tiles the user actively views and should not bulk download, pre-cache, scrape, or generate offline tile archives, because the OSM tile policy prohibits bulk downloading and offline scraping behavior. ([OSMF Operations][3])

**Hard-coded GeoJSON** is the right data source because the MVP needs deterministic fake data, not data plumbing. The goal is to make selection, editing, validation, inspection, and sync workflows visible. A database would add complexity without improving the prototype’s learning value.

Do **not** use ArcGIS for this MVP. ArcGIS is powerful and closer to real enterprise GIS, but it introduces accounts, API keys, platform concepts, licensing decisions, hosted layers, and service configuration. Esri’s JavaScript SDK is designed to work deeply with the ArcGIS ecosystem, which is exactly what this prototype is intentionally avoiding. ([Esri Developer][4])

Do **not** use QGIS for this MVP. QGIS is excellent free and open-source desktop GIS software, but it is a desktop GIS application, not a quick web-app prototyping surface for internal product workflows. It is better as a reference for workflow concepts than as the implementation substrate. ([QGIS][5])

Do **not** use Google Maps for this MVP. Google Maps is strong for consumer map experiences, but its platform uses pay-as-you-go billing across Maps SKUs and is less suited for simulating GIS-style polygon editing, field inspection workflows, and internal operational state without extra vendor concerns. ([Google for Developers][6])

# Domain choice

Use the domain: **farm parcel operations and irrigation maintenance**.

This is the best MVP domain because it naturally demonstrates why GIS operations tools are more complex than a simple map.

The app should simulate a regional agriculture operations team managing multiple farm parcels. Each parcel has crop type, acreage, risk level, inspection status, irrigation condition, assigned field technician, and geometry boundaries. Inside and around the parcels are field assets such as pump stations, irrigation valves, soil sensors, access gates, and maintenance flags.

This domain works well because it includes:

- **Polygons**: field boundaries and parcel zones.
- **Markers**: pumps, gates, sensors, maintenance issues.
- **Inspections**: scheduled visits, observations, findings, photos simulated as placeholders.
- **Operational statuses**: active, needs inspection, blocked, maintenance required, synced, unsynced.
- **Geometry edits**: field boundaries can be corrected after field review.
- **Sync behavior**: field edits can be staged locally before being pushed to the central system.
- **Real workflow tension**: the user must understand location, status, priority, history, validation, and pending changes together.

The fake company context:

**Company:** Northstar Ag Operations **Region:** Central Valley demo region **User role:** Field Operations Coordinator **Primary job:** Review field conditions, correct parcel data, assign follow-up work, and sync updates from field inspections.

# Core workflow

1. **Open app**
    - User lands on the main operations workspace.
    - Map is centered on a fake agricultural region.
    - Left sidebar shows parcel list, filters, and operational counts.
    - Right inspector is empty until something is selected.
    - Bottom strip shows sync queue, latest activity, and region summary.

2. **Review region overview**
    - User sees all parcels as colored polygons.
    - Parcel colors reflect operational status:
        - Green: healthy / current.
        - Yellow: inspection due.
        - Orange: maintenance required.
        - Red: blocked / critical.
        - Gray: inactive.

    - Markers show field assets and open issues.

3. **Filter operational layer**
    - User can filter parcels by status, crop type, assigned technician, and sync state.
    - User can toggle marker layers:
        - Irrigation assets.
        - Soil sensors.
        - Access points.
        - Maintenance flags.

    - Filtering updates the visible polygons and list counts.

4. **Select parcel**
    - User clicks a polygon or parcel row.
    - Selected polygon gets a stronger outline.
    - Map pans/zooms to the parcel if selected from sidebar.
    - Right inspector opens parcel details.
    - Bottom activity log shows recent parcel-specific events.

5. **Review parcel details**
    - Inspector shows:
        - Parcel name.
        - Crop type.
        - Acreage.
        - Operational status.
        - Assigned technician.
        - Last inspection date.
        - Next inspection due.
        - Risk level.
        - Irrigation condition.
        - Sync state.
        - Validation warnings.

    - Inspector also shows inspection history and linked assets.

6. **Create or edit inspection**
    - User clicks “Add inspection.”
    - Inspector switches to inspection form mode.
    - User enters fake inspection values:
        - Soil moisture.
        - Irrigation status.
        - Pest pressure.
        - Access condition.
        - Notes.
        - Follow-up required.

    - User saves inspection.
    - App updates parcel status if needed.
    - New activity log item appears.
    - New sync event is added as “Pending.”

7. **Edit parcel attributes**
    - User clicks “Edit parcel.”
    - Fields become editable:
        - Assigned technician.
        - Status.
        - Priority.
        - Irrigation condition.
        - Notes.

    - User saves changes.
    - App validates required fields.
    - Unsynced change badge appears.

8. **Edit parcel geometry**
    - User clicks “Edit boundary.”
    - Map enters geometry edit mode.
    - Selected parcel shows draggable vertex handles.
    - User can:
        - Drag existing vertices.
        - Add a midpoint vertex.
        - Remove a selected vertex if polygon still has at least 4 coordinates including closure.
        - Cancel edits.
        - Save boundary.

    - Saving boundary creates a pending geometry sync event.
    - The app shows a warning: “Boundary edit pending supervisor review.”

9. **Review sync queue**
    - Bottom strip shows pending changes:
        - Attribute updates.
        - Inspection records.
        - Geometry edits.

    - User opens sync queue drawer or tab.
    - Each queued item shows entity, action, timestamp, status, and simulated payload summary.

10. **Simulate sync**

- User clicks “Sync changes.”
- Sync events move through:
    - Pending → Syncing → Synced.

- One fake event may fail if configured as a validation demo.
- Failed event shows reason, for example:
    - “Geometry overlaps Parcel P-104.”
    - “Inspection missing irrigation condition.”

- User can fix the issue or click “Resolve as reviewed” for the prototype.

11. **End state**

- Updated parcels show synced badges.
- Activity log records successful sync.
- Summary counts update.
- User understands the operational loop: map context → selection → inspection → edit → validation → sync → audit trail.

# Screens and layout

Use a single-page operations workspace.

The app should feel like a dense but clean internal tool. Avoid a landing page. The main app is the product.

## Top bar

Height: approximately 56px.

Left side:

- Product name: **FieldMaps Parcel Editor**
- Small environment badge: **Prototype**
- Region selector: **Central Valley Demo Region**
- Current mode badge:
    - Review Mode
    - Attribute Edit Mode
    - Boundary Edit Mode
    - Sync Review Mode

Center:

- Search input:
    - Placeholder: “Search parcels, assets, technicians…”
    - Search should match parcel name, parcel ID, crop type, technician, or marker name.

- Quick filters:
    - Due Today
    - Maintenance
    - Unsynced
    - Critical

Right side:

- Connectivity pill:
    - “Online”
    - “Offline simulation”

- Sync summary:
    - “3 pending”

- Button:
    - “Sync changes”

- User label:
    - “Ops Coordinator”

Top bar behavior:

- Clicking “Sync changes” starts simulated sync.
- If there are no pending events, button is disabled and says “All synced.”
- If boundary edit mode is active, top bar should show “Unsaved boundary edit” until saved or canceled.

## Left sidebar

Width: approximately 300–340px.

Purpose: operational navigation, filtering, and parcel list.

Sections:

1. **Operational summary**
    - Total parcels: 8
    - Needs inspection: 3
    - Maintenance required: 2
    - Critical/blocked: 1
    - Unsynced edits: 3

2. **Filters**
    - Status dropdown/checklist:
        - Healthy
        - Inspection due
        - Maintenance required
        - Blocked
        - Inactive

    - Crop type checklist:
        - Almonds
        - Tomatoes
        - Grapes
        - Alfalfa

    - Technician checklist:
        - Maya Chen
        - Luis Ortega
        - Priya Shah

    - Sync state checklist:
        - Synced
        - Pending
        - Failed
        - Local draft

3. **Layer toggles**
    - Parcels
    - Irrigation assets
    - Soil sensors
    - Access gates
    - Maintenance flags
    - Inspection heat overlay

4. **Parcel list**
    - Each row shows:
        - Parcel ID
        - Parcel name
        - Crop
        - Status badge
        - Sync badge
        - Last inspection date

    - Selected row is highlighted.
    - Rows with pending changes show a small dot or badge.

5. **Saved views**
    - “Today’s inspections”
    - “Irrigation maintenance”
    - “Unsynced field edits”
    - “High-risk parcels”

## Center map

Purpose: primary spatial workspace.

Map should use Leaflet with OSM tiles.

Map layers:

- Parcel polygons.
- Asset markers.
- Maintenance issue markers.
- Selected parcel outline.
- Geometry edit handles.
- Optional fake heat overlay.

Polygon visual rules:

- Healthy: green fill with medium opacity.
- Inspection due: yellow fill.
- Maintenance required: orange fill.
- Blocked: red fill.
- Inactive: gray fill.
- Selected parcel: bright outline, thicker stroke, slightly higher opacity.

Marker visual rules:

- Pump station: circular blue marker or water icon.
- Irrigation valve: small blue outlined marker.
- Soil sensor: purple marker.
- Gate/access point: dark gray marker.
- Maintenance flag: orange/red warning marker.

Map controls:

- Zoom controls.
- Fit to region button.
- Fit to selected button.
- Basemap label: “OpenStreetMap”
- Draw/edit toolbar visible only when boundary edit mode is active.

Map behavior:

- Clicking polygon selects parcel.
- Clicking marker selects asset.
- Clicking empty map clears selection unless edit mode is active.
- Hovering polygon shows a lightweight tooltip:
    - Parcel name.
    - Status.
    - Crop type.
    - Last inspection.

- Double-clicking a parcel opens inspector in edit mode.
- Boundary edit mode disables normal parcel switching until saved or canceled.

## Right inspector panel

Width: approximately 380–440px.

Purpose: selected entity details, forms, validation, and editing.

Empty state:

- Title: “No parcel selected”
- Text: “Select a parcel or field asset to review details, inspections, and pending changes.”
- Show a mini checklist of workflow steps:
    - Select parcel.
    - Review inspection history.
    - Edit attributes or boundary.
    - Save locally.
    - Sync changes.

Parcel selected state:

1. **Header**
    - Parcel name.
    - Parcel ID.
    - Status badge.
    - Sync badge.
    - Risk badge.

2. **Action buttons**
    - Edit parcel
    - Add inspection
    - Edit boundary
    - Create maintenance task
    - Cancel edit / Save changes when editing

3. **Parcel details**
    - Crop type.
    - Acreage.
    - Owner/operator.
    - Assigned technician.
    - Irrigation zone.
    - Last inspection.
    - Next inspection due.
    - Priority.
    - Notes.

4. **Validation warnings**
    - Examples:
        - “Inspection overdue by 4 days.”
        - “Boundary edit pending supervisor review.”
        - “Parcel has 2 unresolved maintenance issues.”
        - “Soil sensor offline for 18 hours.”

5. **Inspection history**
    - Recent inspection cards.
    - Each card shows:
        - Date.
        - Inspector.
        - Outcome.
        - Soil moisture.
        - Irrigation status.
        - Follow-up required.
        - Notes preview.

6. **Linked assets**
    - List of markers inside or associated with parcel.
    - Shows asset type, status, and last signal/check.

7. **Pending changes**
    - Shows staged changes related to selected parcel.
    - Each item has:
        - Change type.
        - Created time.
        - Sync status.
        - Retry or resolve action if failed.

Asset selected state:

- Asset name.
- Asset type.
- Linked parcel.
- Operational status.
- Last maintenance.
- Last signal/check.
- Notes.
- Button: “Create maintenance task.”
- Button: “View linked parcel.”

Inspection form state:

- Fields:
    - Inspection date.
    - Inspector.
    - Soil moisture estimate.
    - Irrigation condition.
    - Pest pressure.
    - Access condition.
    - Overall result.
    - Follow-up required.
    - Notes.

- Save creates local inspection and sync event.
- Cancel returns to parcel details.

Geometry edit state:

- Shows compact instructions:
    - “Drag vertices to adjust boundary.”
    - “Click midpoint handle to add vertex.”
    - “Select vertex and press remove to delete.”
    - “Save boundary to stage geometry update.”

- Shows geometry stats:
    - Vertex count.
    - Estimated acreage.
    - Area delta from original.

- Shows validation:
    - Minimum vertex count.
    - Self-intersection warning simulated.
    - Overlap warning simulated for one parcel.

## Bottom activity log / sync queue / analytics strip

Height: approximately 180–240px. Collapsible to 44px.

Use tabs:

1. **Activity**
    - Chronological operational log.
    - Example events:
        - “Maya Chen completed inspection for North Almond Block.”
        - “Boundary edited for Parcel P-103.”
        - “Sync failed for P-106 geometry: overlap detected.”
        - “Maintenance flag created for Pump Station 2.”

2. **Sync Queue**
    - Table columns:
        - Status
        - Entity
        - Change type
        - Created
        - Last attempt
        - Summary
        - Action

    - Actions:
        - Retry
        - View
        - Resolve
        - Discard local change

3. **Analytics**
    - Small operational metrics:
        - Parcels current: 5/8
        - Inspections due: 3
        - Open maintenance issues: 4
        - Unsynced changes: 3
        - Average risk score: 62

    - Simple horizontal bars are enough.
    - No charting library required unless already available.

# Data model

Use local TypeScript types. Keep the model realistic but not overbuilt.

```ts
type EntityType = "parcel" | "asset" | "inspection";

type ParcelStatus = "healthy" | "inspection_due" | "maintenance_required" | "blocked" | "inactive";

type SyncStatus = "synced" | "pending" | "syncing" | "failed" | "local_draft";

type RiskLevel = "low" | "medium" | "high" | "critical";

type CropType = "almonds" | "tomatoes" | "grapes" | "alfalfa";

type IrrigationCondition = "normal" | "low_pressure" | "leak_detected" | "offline" | "not_applicable";

type AssetType = "pump_station" | "irrigation_valve" | "soil_sensor" | "access_gate" | "maintenance_flag";

type AssetStatus = "operational" | "needs_attention" | "offline" | "blocked" | "resolved";

type GeometryEditState = "none" | "editing" | "dirty" | "validating" | "ready_to_save" | "saved_local" | "invalid";
```

```ts
interface ParcelAsset {
	id: string;
	type: "Feature";
	entityType: "parcel";
	properties: {
		parcelId: string;
		name: string;
		cropType: CropType;
		acreage: number;
		ownerOperator: string;
		assignedTechnician: string;
		irrigationZone: string;
		status: ParcelStatus;
		riskLevel: RiskLevel;
		riskScore: number;
		irrigationCondition: IrrigationCondition;
		lastInspectionDate: string;
		nextInspectionDue: string;
		openMaintenanceCount: number;
		notes: string;
		syncStatus: SyncStatus;
		updatedAt: string;
	};
	geometry: {
		type: "Polygon";
		coordinates: number[][][];
	};
}
```

```ts
interface FieldMarkerAsset {
	id: string;
	type: "Feature";
	entityType: "asset";
	properties: {
		assetId: string;
		name: string;
		assetType: AssetType;
		linkedParcelId: string;
		status: AssetStatus;
		priority: "low" | "medium" | "high" | "critical";
		lastCheckedAt: string;
		assignedTechnician: string;
		notes: string;
		syncStatus: SyncStatus;
	};
	geometry: {
		type: "Point";
		coordinates: [number, number];
	};
}
```

```ts
interface InspectionRecord {
	id: string;
	parcelId: string;
	inspectorName: string;
	inspectionDate: string;
	result: "passed" | "monitor" | "follow_up_required" | "blocked";
	soilMoisture: "low" | "normal" | "high" | "unknown";
	irrigationCondition: IrrigationCondition;
	pestPressure: "none" | "low" | "medium" | "high";
	accessCondition: "clear" | "limited" | "blocked";
	followUpRequired: boolean;
	notes: string;
	createdAt: string;
	syncStatus: SyncStatus;
}
```

```ts
interface SyncEvent {
	id: string;
	entityType: EntityType;
	entityId: string;
	changeType:
		| "attribute_update"
		| "geometry_update"
		| "inspection_create"
		| "maintenance_task_create"
		| "status_change";
	status: SyncStatus;
	createdAt: string;
	lastAttemptAt?: string;
	completedAt?: string;
	summary: string;
	payloadPreview: Record<string, unknown>;
	errorMessage?: string;
	retryCount: number;
}
```

```ts
interface ActivityLogItem {
	id: string;
	timestamp: string;
	actor: string;
	entityType: EntityType;
	entityId: string;
	action:
		| "selected"
		| "viewed"
		| "created"
		| "updated"
		| "edited_geometry"
		| "validated"
		| "synced"
		| "sync_failed"
		| "resolved"
		| "discarded";
	message: string;
	severity: "info" | "success" | "warning" | "error";
}
```

```ts
interface UISelectionState {
	selectedEntityType: EntityType | null;
	selectedEntityId: string | null;
	selectedParcelId: string | null;
	inspectorMode:
		| "empty"
		| "parcel_view"
		| "asset_view"
		| "parcel_edit"
		| "inspection_create"
		| "geometry_edit"
		| "sync_review";
	activeFilters: {
		statuses: ParcelStatus[];
		cropTypes: CropType[];
		technicians: string[];
		syncStatuses: SyncStatus[];
		visibleLayers: {
			parcels: boolean;
			irrigationAssets: boolean;
			soilSensors: boolean;
			accessGates: boolean;
			maintenanceFlags: boolean;
			inspectionHeatOverlay: boolean;
		};
	};
	mapMode: "review" | "select" | "edit_geometry";
	geometryEdit: {
		parcelId: string | null;
		state: GeometryEditState;
		originalCoordinates?: number[][][];
		draftCoordinates?: number[][][];
		selectedVertexIndex?: number | null;
		areaDeltaAcres?: number;
		validationMessages: string[];
	};
	syncPanelOpen: boolean;
	bottomPanelTab: "activity" | "sync_queue" | "analytics";
}
```

# Hard-coded sample data

The prototype should include exactly:

- **8 parcel polygons**
- **12 field markers**
- **15 inspection records**
- **6 initial sync events**
- **18 initial activity log items**

Use a fake region near California Central Valley coordinates. Exact geospatial accuracy does not matter, but polygons should appear close enough together to feel like a real operating region.

Recommended map center:

```ts
center: [36.735, -119.77];
zoom: 13;
```

## Parcel polygons

Create 8 hard-coded polygon features:

1. **P-101 — North Almond Block**
    - Crop: almonds
    - Acreage: 42.6
    - Status: healthy
    - Risk: low
    - Technician: Maya Chen
    - Sync: synced

2. **P-102 — East Tomato Row**
    - Crop: tomatoes
    - Acreage: 28.4
    - Status: inspection_due
    - Risk: medium
    - Technician: Luis Ortega
    - Sync: pending

3. **P-103 — Canal Grapes West**
    - Crop: grapes
    - Acreage: 35.2
    - Status: maintenance_required
    - Risk: high
    - Technician: Priya Shah
    - Sync: pending

4. **P-104 — South Alfalfa Strip**
    - Crop: alfalfa
    - Acreage: 51.8
    - Status: healthy
    - Risk: medium
    - Technician: Maya Chen
    - Sync: synced

5. **P-105 — Pump House Almonds**
    - Crop: almonds
    - Acreage: 19.7
    - Status: maintenance_required
    - Risk: high
    - Technician: Luis Ortega
    - Sync: failed

6. **P-106 — Old Vineyard Edge**
    - Crop: grapes
    - Acreage: 24.1
    - Status: blocked
    - Risk: critical
    - Technician: Priya Shah
    - Sync: local_draft

7. **P-107 — Trial Tomato Plot**
    - Crop: tomatoes
    - Acreage: 12.5
    - Status: inspection_due
    - Risk: medium
    - Technician: Maya Chen
    - Sync: synced

8. **P-108 — North Alfalfa Reserve**
    - Crop: alfalfa
    - Acreage: 47.3
    - Status: inactive
    - Risk: low
    - Technician: Luis Ortega
    - Sync: synced

## Marker assets

Create 12 markers:

1. Pump Station 1 — linked to P-101 — operational
2. Pump Station 2 — linked to P-105 — needs_attention
3. Valve A-12 — linked to P-102 — operational
4. Valve B-07 — linked to P-103 — needs_attention
5. Soil Sensor N-4 — linked to P-101 — operational
6. Soil Sensor E-9 — linked to P-102 — offline
7. Soil Sensor V-2 — linked to P-106 — offline
8. Access Gate North — linked to P-101 — operational
9. Access Gate Canal — linked to P-103 — blocked
10. Maintenance Flag Leak — linked to P-105 — critical
11. Maintenance Flag Fence — linked to P-106 — high
12. Irrigation Valve Reserve — linked to P-108 — operational

## Status categories

Parcel statuses:

- healthy
- inspection_due
- maintenance_required
- blocked
- inactive

Asset statuses:

- operational
- needs_attention
- offline
- blocked
- resolved

Risk levels:

- low
- medium
- high
- critical

## Sync categories

Use these sync statuses everywhere:

- synced
- pending
- syncing
- failed
- local_draft

Initial sync queue should include:

1. P-102 attribute update — pending
2. P-103 inspection create — pending
3. P-105 maintenance task create — failed
4. P-106 geometry update — local_draft
5. Soil Sensor E-9 status change — pending
6. P-107 inspection create — synced

## Example inspection records

Include 15 inspection records spread across parcels.

Each parcel should have at least one inspection. P-101, P-103, P-105, and P-106 should have multiple records.

Example values:

- P-101:
    - Result: passed
    - Soil moisture: normal
    - Irrigation condition: normal
    - Pest pressure: low
    - Access: clear

- P-103:
    - Result: follow_up_required
    - Soil moisture: low
    - Irrigation condition: low_pressure
    - Pest pressure: medium
    - Access: limited

- P-105:
    - Result: follow_up_required
    - Soil moisture: high
    - Irrigation condition: leak_detected
    - Pest pressure: low
    - Access: clear

- P-106:
    - Result: blocked
    - Soil moisture: unknown
    - Irrigation condition: offline
    - Pest pressure: unknown can be represented as medium for simplicity
    - Access: blocked

# Interaction design

## Selection

- Clicking a parcel polygon selects that parcel.
- Clicking a parcel row selects the same parcel and pans the map to it.
- Clicking a marker selects that asset and opens asset inspector.
- Clicking empty map clears selection only in review mode.
- Selection should update:
    - Map highlight.
    - Sidebar row highlight.
    - Right inspector.
    - Bottom activity context.

## Filtering

- Filters immediately update visible parcels and markers.
- Filter counts should update in the sidebar.
- If selected parcel becomes hidden by filters, keep it selected but show a warning:
    - “Selected parcel is hidden by current filters.”

- “Clear filters” restores all data.

## Attribute editing

- “Edit parcel” switches inspector to edit mode.
- Editable fields:
    - Status
    - Risk level
    - Assigned technician
    - Irrigation condition
    - Notes

- Non-editable fields:
    - Parcel ID
    - Acreage
    - Crop type
    - Last inspection date

- Saving:
    - Updates local parcel object.
    - Sets parcel syncStatus to pending.
    - Creates SyncEvent with changeType `attribute_update`.
    - Adds ActivityLogItem.

- Canceling:
    - Discards unsaved form state.
    - Returns to parcel view.

## Inspection creation

- “Add inspection” opens inspection form.
- Required fields:
    - Inspector
    - Result
    - Irrigation condition
    - Access condition

- Optional fields:
    - Soil moisture
    - Pest pressure
    - Notes

- Saving:
    - Creates new InspectionRecord.
    - Sets inspection syncStatus to pending.
    - Updates parcel lastInspectionDate to today.
    - Optionally updates parcel status:
        - If result is passed → healthy.
        - If result is monitor → inspection_due.
        - If result is follow_up_required → maintenance_required.
        - If result is blocked → blocked.

    - Creates SyncEvent with changeType `inspection_create`.
    - Adds ActivityLogItem.

## Maintenance task creation

- “Create maintenance task” should be visually simulated, not fully modeled.
- Clicking it opens a small modal or inspector section:
    - Issue type
    - Priority
    - Assigned technician
    - Notes

- Saving creates:
    - SyncEvent with changeType `maintenance_task_create`.
    - ActivityLogItem.

- No separate maintenance task model is required for MVP.

## Geometry editing

Geometry editing should feel believable but remain simple.

Recommended implementation:

- Only allow editing one selected parcel at a time.
- User clicks “Edit boundary.”
- App enters `mapMode: "edit_geometry"`.
- Store original coordinates in `geometryEdit.originalCoordinates`.
- Store editable copy in `geometryEdit.draftCoordinates`.

Visible behavior:

- Selected polygon becomes editable.
- Vertex handles appear at each polygon vertex.
- Midpoint handles appear between vertices.
- Dragging a vertex updates draft geometry.
- Clicking a midpoint handle inserts a new vertex.
- Selecting a vertex enables “Remove vertex.”
- Remove is disabled if polygon would have fewer than 4 coordinate points including the closing coordinate.
- Show area delta estimate:
    - “Estimated area change: +0.8 acres”
    - This can be a fake/simple calculation.

- Show validation messages:
    - Minimum 3 real vertices.
    - Boundary must stay inside region bounds.
    - Boundary cannot overlap neighboring parcel.

- For MVP, overlap detection can be faked:
    - If editing P-106 and user saves, show a simulated warning:
        - “Potential overlap with P-104. Supervisor review required.”

    - Still allow save as pending.

Geometry save behavior:

- Updates local parcel geometry.
- Sets parcel syncStatus to pending or local_draft.
- Creates SyncEvent with changeType `geometry_update`.
- Adds ActivityLogItem with action `edited_geometry`.
- Shows badge:
    - “Boundary pending sync”
    - “Supervisor review required”

Geometry cancel behavior:

- Restores original coordinates.
- Exits edit mode.
- Adds no sync event.

## Sync simulation

Clicking “Sync changes” should:

1. Find sync events with status pending, failed, or local_draft.
2. Move them to syncing.
3. After a short timeout, mark most as synced.
4. Keep one event failed for realism.

Suggested deterministic behavior:

- P-102 attribute update → synced
- P-103 inspection create → synced
- Soil Sensor E-9 status change → synced
- P-105 maintenance task create → failed with:
    - “Assigned asset is missing required maintenance category.”

- P-106 geometry update → failed if geometry warning exists, otherwise synced.

When sync succeeds:

- Related entity syncStatus becomes synced.
- Activity log gets success item.

When sync fails:

- Related entity syncStatus becomes failed.
- Activity log gets error item.
- Inspector shows error under pending changes.

## Activity log

Every meaningful action should create an activity item:

- Selecting parcel is optional; do not log every selection unless useful.
- Log:
    - Attribute saved.
    - Inspection created.
    - Boundary edited.
    - Sync started.
    - Sync completed.
    - Sync failed.
    - Failed item resolved.
    - Local change discarded.

## Validation

Validation should be visible but lightweight.

Parcel attribute validation:

- Status required.
- Technician required.
- Irrigation condition required if status is maintenance_required.
- Notes required if status is blocked.

Inspection validation:

- Inspector required.
- Result required.
- Access condition required.
- Irrigation condition required.

Geometry validation:

- At least 3 real vertices.
- Polygon closed.
- Region bounds warning.
- Fake overlap warning for P-106.

# Fake vs real

## Fully implemented

These should work as real frontend interactions:

- Leaflet map rendering.
- OSM tile display.
- Rendering hard-coded GeoJSON parcel polygons.
- Rendering hard-coded point markers.
- Selecting parcels and markers.
- Sidebar filters.
- Layer toggles.
- Right inspector panel states.
- Attribute edit form.
- Inspection create form.
- Local state updates.
- Activity log updates.
- Sync queue state transitions.
- Basic geometry draft state.
- Save/cancel behavior.
- Badges and validation messages.
- Search over hard-coded local data.

## Visually simulated

These should look real but not require real infrastructure:

- Sync to central GIS system.
- Supervisor review.
- Geometry overlap validation.
- Acreage recalculation.
- Inspection heat overlay.
- Maintenance task creation.
- Offline/online mode.
- User identity.
- Audit trail persistence.
- Conflict resolution.

## Stubbed or hard-coded

These should be hard-coded with deterministic fake behavior:

- All parcel data.
- All marker data.
- All inspection records.
- All initial sync events.
- All activity logs.
- “Today’s date” can be hard-coded or derived client-side.
- Sync success/failure outcomes.
- Geometry validation warnings.
- Saved views.
- Analytics values.
- Region selector.
- User account.
- Basemap choice.

Do not implement:

- Backend.
- Database.
- Authentication.
- Real ArcGIS integration.
- Real QGIS integration.
- Real Google Maps integration.
- Real offline storage.
- Real file upload.
- Real spatial indexing.
- Real topology engine.
- Real multi-user collaboration.
- Real permissions.
- Real deployment configuration.

# Component tree

Suggested Next.js structure:

```txt
src/
  app/
    page.tsx
    layout.tsx
    globals.css

  components/
    app-shell/
      OperationsWorkspace.tsx
      TopBar.tsx
      LeftSidebar.tsx
      MapWorkspace.tsx
      RightInspector.tsx
      BottomOperationsPanel.tsx

    map/
      LeafletMap.tsx
      ParcelLayer.tsx
      AssetMarkerLayer.tsx
      SelectedParcelOverlay.tsx
      GeometryEditLayer.tsx
      MapControls.tsx
      MapLegend.tsx

    sidebar/
      OperationalSummary.tsx
      FilterPanel.tsx
      LayerTogglePanel.tsx
      ParcelList.tsx
      SavedViews.tsx

    inspector/
      EmptyInspector.tsx
      ParcelInspector.tsx
      AssetInspector.tsx
      ParcelEditForm.tsx
      InspectionForm.tsx
      GeometryEditPanel.tsx
      PendingChangesPanel.tsx
      ValidationWarnings.tsx
      LinkedAssetsList.tsx
      InspectionHistory.tsx

    bottom-panel/
      ActivityLogTab.tsx
      SyncQueueTab.tsx
      AnalyticsTab.tsx

    shared/
      Badge.tsx
      Button.tsx
      Panel.tsx
      FieldRow.tsx
      StatusDot.tsx
      ConfirmDialog.tsx

  data/
    parcels.ts
    assets.ts
    inspections.ts
    syncEvents.ts
    activityLog.ts

  lib/
    filters.ts
    selection.ts
    syncSimulation.ts
    validation.ts
    geometry.ts
    mapStyles.ts
    dateFormat.ts

  types/
    domain.ts
    geojson.ts
    ui.ts

  state/
    useOperationsStore.ts
```

Recommended state approach:

- Use React state or Zustand.
- Zustand is acceptable if the coding agent wants cleaner shared state.
- No Redux needed.
- No server actions needed.
- No API routes needed.

Suggested main state slices:

```txt
parcels
assets
inspections
syncEvents
activityLog
uiSelection
filters
mapMode
```

Main page behavior:

```txt
app/page.tsx
  renders OperationsWorkspace

OperationsWorkspace
  owns or connects to app state
  lays out:
    TopBar
    LeftSidebar
    MapWorkspace
    RightInspector
    BottomOperationsPanel
```

# Acceptance criteria

A coding agent is done when all of the following are true:

- App runs as a Next.js + TypeScript single-page prototype.
- Main screen has top bar, left sidebar, center map, right inspector, and bottom operations panel.
- Leaflet map renders with OpenStreetMap tiles.
- 8 hard-coded parcel polygons render on the map.
- 12 hard-coded field markers render on the map.
- Parcel polygons are styled by operational status.
- Marker icons or marker styles differ by asset type.
- Clicking a parcel selects it and opens parcel inspector.
- Clicking a marker selects it and opens asset inspector.
- Clicking a parcel row selects the parcel and pans/zooms the map to it.
- Sidebar shows operational summary counts.
- Sidebar filters work for status, crop type, technician, and sync state.
- Layer toggles show/hide parcels and marker categories.
- Search filters parcels/assets by ID, name, crop, technician, or asset name.
- Right inspector has empty, parcel, asset, edit, inspection, and geometry edit states.
- Parcel edit form can update status, risk level, technician, irrigation condition, and notes.
- Saving parcel edits updates local state, creates pending sync event, and adds activity log item.
- Inspection form can create a new inspection record.
- Saving inspection updates local state, creates pending sync event, and adds activity log item.
- Geometry edit mode allows a believable boundary editing experience.
- Geometry edits can be saved or canceled.
- Saving geometry creates a geometry sync event and activity log item.
- Validation warnings appear for overdue inspections, blocked parcels, maintenance issues, and geometry review.
- Bottom panel has Activity, Sync Queue, and Analytics tabs.
- Sync queue shows pending, syncing, synced, failed, and local draft states.
- “Sync changes” simulates sync state transitions.
- At least one sync event deterministically fails with a visible error message.
- Successful sync updates related entity badges to synced.
- Failed sync updates related entity badges to failed.
- Activity log updates after edits, inspections, geometry saves, sync success, and sync failure.
- UI clearly communicates that this is a prototype, not production GIS.
- No backend is implemented.
- No database is implemented.
- No auth is implemented.
- No real ArcGIS, QGIS, or Google Maps integration is implemented.
- All data comes from local hard-coded files.
- The product feels like an internal operations tool a real company could use for field parcel workflows.

[1]: https://nextjs.org/docs/app?utm_source=chatgpt.com "Next.js Docs: App Router"
[2]: https://leafletjs.com/?utm_source=chatgpt.com "Leaflet - a JavaScript library for interactive maps"
[3]: https://operations.osmfoundation.org/policies/tiles/?utm_source=chatgpt.com "Tile Usage Policy"
[4]: https://developers.arcgis.com/javascript/latest/licensing/?utm_source=chatgpt.com "Licensing & Attribution | ArcGIS Maps SDK for JavaScript"
[5]: https://www.qgis.org/?utm_source=chatgpt.com "Spatial without Compromise · QGIS"
[6]: https://developers.google.com/maps/documentation/javascript/usage-and-billing?utm_source=chatgpt.com "Maps JavaScript API Usage and Billing"
