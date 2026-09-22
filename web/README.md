# FieldMaps web prototype

This folder owns the Next.js application, dependencies, assets, and build configuration. Run the commands below from `web/`, or use `pnpm web:dev`, `pnpm web:build`, and `pnpm web:check` at the product root. See [workspace operations](../docs/Workspace.md) for centralized commands and deployment setup.

The [native mobile collector](../mobile/README.md) has real authenticated uploads to PostGIS and verified QGIS readback. This web demonstration still simulates sync. Design references are in the [Claude Design brief](../docs/Claude-Design-Brief.md) and `../designs/`.

The confirmed product direction is our custom mobile app plus web management and a shared spatial backend. The older product comparisons below describe the original web prototype; the current recommendation is in [the architecture report](../docs/Production-Architecture-Recommendation.md).

A showcase-ready prototype for collecting mapped observations in the field, keeping them on the device when connectivity is unavailable, and handing the data to QGIS or ArcGIS.

The application has two connected demonstrations:

- **Operations console:** parcel status, asset layers, inspections, boundary editing, validation, and a sync queue.
- **Field collector:** tablet-friendly point capture, configurable form fields, local persistence, offline reference layers, QGIS exports, and an ArcGIS request preview.

## 90-second demo

1. Click **Open field collector**. On a tablet-sized screen, the collector opens automatically.
2. Switch **Online** to **Offline**. The remote tile basemap disappears, while the packaged parcel layers and saved points remain usable.
3. Click **Add point**, tap the map, complete the form, and click **Save offline**. The observation stays in the local queue across a reload.
4. Download **QGIS CSV** or **GeoJSON**, or open **ArcGIS payload** to show the Feature Service request shape.
5. Try syncing while offline, reconnect, and click **Sync changes**.

## What the prototype proves

- A point can be positioned by tapping a georeferenced map, without relying on the device GPS.
- Typed fields can combine required text, date/time, controlled choices, optional notes, and follow-up flags.
- Observations are stored in browser-local persistent storage before any network request.
- CSV exports include numeric `longitude` and `latitude` columns that QGIS can load as a delimited-text point layer.
- GeoJSON exports use longitude/latitude coordinates in EPSG:4326 and open directly as a vector layer.
- ArcGIS additions can be represented as point geometry plus attributes and sent to a writable Feature Service layer through `applyEdits`.

## Honest prototype boundaries

- The **Sync changes** action is simulated. The **ArcGIS payload** panel shows the real request structure, but no organization URL, layer schema, authentication, conflict resolution, or production writes are configured.
- OpenStreetMap tiles are used only while online. The demo never bulk downloads or pre-caches map tiles. Offline mode uses bundled vector reference data; a production deployment would package licensed raster/vector basemaps.
- QGIS Desktop is file-oriented, so the prototype exports interoperable CSV and GeoJSON. Automatic multi-user synchronization would normally use QField/QFieldSync, QFieldCloud, or an OGC transaction service.
- Local browser storage is suitable for a demo. Production field data needs a durable local database, migrations, encryption decisions, audit metadata, and tested conflict handling.

## Recommended production paths

### ArcGIS-first organization

Use ArcGIS Maps SDKs for Native Apps when offline basemap packages, editable local geodatabases, attachments, and two-way Feature Service synchronization are required. The web collector can remain useful as an administrative or lightweight connected client.

### QGIS-first organization

Use QGIS to author the project and QFieldSync to package offline layers and a basemap for QField. QField records changes in the field and QFieldSync or QFieldCloud synchronizes them back to the source project.

### Vendor-neutral custom application

Keep the local-first collection model, export GeoJSON/CSV for simple handoff, and add adapters for ArcGIS Feature Services or QGIS Server WFS transactions when automatic sync is justified.

## Public policy pages

`/privacy` and `/privacy/delete-data` are the privacy policy and data deletion pages for the native mobile collector, for its Google Play listing. They live in `src/app/(legal)/`, use the collector's Nocturne palette, and are prerendered as static pages. Every statement was checked against the mobile, backend and database code; update the pages before the app collects anything new.

Facts only the operator can supply live in `src/app/(legal)/policy.ts`: the operator (DECA Lab at Cornell University, led by Professor Janet Loebach), the privacy contact, and the developer. The server host, retention periods and deletion time are marked "Assumed" there and need confirming with the lab. Any field set back to `null` brings back a visible draft notice and an inline "to be confirmed" marker.

## Run locally

```bash
pnpm install
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

Quality checks:

```bash
pnpm lint
pnpm build
```

## Technical shape

- Next.js 16 App Router and TypeScript
- React Leaflet and local GeoJSON reference layers
- Zustand stores, including persisted field observations
- Progressive Web App manifest and same-origin offline shell cache
- Client-side CSV, GeoJSON, and ArcGIS request generation

No API key or account is required for the prototype.

## Research sources

- [ArcGIS FeatureLayer `applyEdits`](https://developers.arcgis.com/javascript/latest/references/core/layers/FeatureLayer/#applyEdits)
- [ArcGIS REST API: layer-level Apply Edits](https://developers.arcgis.com/rest/services-reference/enterprise/apply-edits-feature-service-layer/)
- [ArcGIS offline mapping apps](https://developers.arcgis.com/documentation/offline-mapping-apps/)
- [ArcGIS Field Maps overview](https://doc.arcgis.com/en/field-maps/get-started/get-started.htm)
- [QGIS delimited text and coordinate fields](https://docs.qgis.org/3.44/en/docs/user_manual/managing_data_source/supported_data.html#delimited-text-files)
- [QFieldSync offline packaging and synchronization](https://docs.qfield.org/get-started/tutorials/get-started-qfs/)
- [QGIS Server services and WFS transactions](https://docs.qgis.org/3.44/en/docs/server_manual/services.html)
- [OpenStreetMap tile usage policy](https://operations.osmfoundation.org/policies/tiles/)
