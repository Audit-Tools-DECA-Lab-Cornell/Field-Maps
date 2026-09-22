**QGIS field collection feasibility and Janet’s variable library**

Research date: September 17, 2026. This is a documentation-based feasibility assessment and inspection of the supplied workbooks and current prototype. No QGIS, QField, ArcGIS, or physical-tablet round trip was executed.

**Decision**

Yes. An app can display a map prepared in QGIS, collect geographically positioned observations with custom attributes, work offline, and return those observations to QGIS. For this project, separate the background map, the site’s editable reference features, and the observation records. Janet’s questions belong to the observation records, with project and round context stored separately where appropriate.

Decision confirmed by the user on September 17, 2026: build our own custom app. Offline collection and automatic synchronization to our database and data accessible in QGIS are mandatory. File export alone does not satisfy this requirement. QField is an experimental reference: the user has installed it and created a project. Selecting QField or ArcGIS as the production collection app is no longer an open decision.

**Proposed architecture for the confirmed direction**

The recommended flow is custom app → durable local database and pending-change queue → authenticated sync API → authoritative spatial database → QGIS-connected layer. PostgreSQL/PostGIS is the proposed central store, subject to checking the actual database infrastructure. QGIS supports PostgreSQL data sources. This lets the app and QGIS use the same records rather than requiring independent uploads to two stores. QGIS must connect to that source and refresh its layer to display committed changes; an unrelated local GeoPackage will not update itself. [QGIS database connections](https://docs.qgis.org/3.44/en/docs/user_manual/managing_data_source/opening_data.html#database-related-tools)

The following are design requirements, not implemented behavior:

1. Download a versioned project package before fieldwork: permitted offline map imagery, site layers, variable definitions, choices, display rules, and zone/round reference data. The map, form logic, and manual point placement must work without internet or location permission.
2. Save observations and pending operations atomically to durable device storage before showing “Saved on device.” Generate stable UUIDs locally. Persist drafts, answers, coordinates, form version, and pending operations across app/device restarts, scoped to the correct account and project.
3. Automatically attempt synchronization when the app starts, resumes, or regains connectivity, and while running when unsent changes exist. Retry temporary failures with backoff; retain local work when authentication expires or the server rejects a record. Use operation IDs for duplicate-safe retries, and show “Synced” only after server acknowledgement of the corresponding revision.
4. Pull authorized changes using a server-managed revision/cursor. Preserve local unsent edits during downloads. Use explicit record versions to detect competing edits and surface conflicts for review; do not silently pick a winner based on device clocks. Initially expose QGIS layers as read-only unless desktop editing is explicitly included in the synchronization contract.
5. Verify the full path on the target tablets: offline capture, restart recovery, reconnect upload, server persistence, QGIS layer refresh, duplicate retry, partial failure, account isolation, and concurrent edits. No manual export/import should be required for routine synchronization.

Local storage technology is still an implementation decision: a native collector can use SQLite; a browser/PWA implementation needs transactional browser storage and explicit device lifecycle testing. “Automatic when the app is running or reopened” and “uploads while the app is closed” are separate capabilities. Browser background synchronization has limited availability, so closed-app synchronization cannot be promised across target browsers. Device/OS support must be established before choosing the collector runtime; even native background work is OS-scheduled. [Background Synchronization API](https://developer.mozilla.org/en-US/docs/Web/API/Background_Synchronization_API)

CSV, GeoJSON, and GeoPackage remain useful for analysis, backup, interoperability, and debugging. They are supplementary to automatic synchronization. The experimental QField project should be inspected for its actual layers, data sources, CRS, and forms before attempting to reuse it.

**What was examined**

| Local source | Finding |
| --- | --- |
| Behavior Mapping Variable Library.xlsx, Sheet1 | 112 variable rows: 100 visible and 12 hidden. There are 111 distinct variable codes because EnvZone3 is repeated. Counts exclude headings and answer-option continuation rows. |
| Variables to use for App testing.xlsx, Sheet1 | 90 variable rows: 74 visible and 16 hidden. All 90 variable codes are distinct. Hidden rows are not automatically excluded requirements; their intended status needs confirmation. |
| Field Maps Alternate Application Development notes.docx | Requests imagery with drawn polygons and symbols, labelled layers, manual georeferenced observation points, customizable forms, offline tablet use, and coordinate-bearing exports for QGIS. |
| Offline-GIS-Field-Collection-Options.docx | Earlier comparison and prototype description. Current claims below were checked against current documentation and source code rather than assumed from that note. |

**What “from QGIS and back to QGIS” means**

QGIS Desktop organizes, edits, and analyzes GIS data. A QGIS project normally references its underlying files or services. Sending a `.qgz` file alone does not ensure that all imagery and layer data travel with it. QGIS can also export a rendered map with georeferencing, which can work as a background but loses the independent editability of the shapes rendered into it. [QGIS project files and output](https://docs.qgis.org/3.44/en/docs/user_manual/introduction/project_files.html)

| Component | Example for Janet | Proposed treatment |
| --- | --- | --- |
| Background | Aerial imagery or a rendered site plan | Read-only context, packaged for offline viewing where permitted |
| Site features | Environmental zones, paths, play areas, trees | Separate polygon, line, or point layers with stable identifiers |
| Observations | A play event at a chosen position | A new point record with answers and project/round identifiers |

Users can place observations over imagery without changing the imagery itself. If the app also lets managers draw site polygons, those drawings should be exported as real spatial features. Retain georeferencing when exchanging background images; a plain screenshot is insufficient for reliable coordinate placement.

The API link supplied in the request describes QGIS’s native libraries, including core, GUI, analysis, and server components. It is not a hosted JavaScript map API or a generic upload endpoint. The page currently identifies itself as a master/development build; implementation should use documentation matching the installed QGIS version. The resource hub is a documentation/resource directory, not the application’s data backend. [QGIS API topics](https://api.qgis.org/api/topics.html), [QGIS resources](https://qgis.org/resources/hub/)

**Integration approaches considered during initial research**

| Approach | Data path | Best use | Work we still own |
| --- | --- | --- | --- |
| QGIS + QField | Package QGIS project, collect offline, synchronize through QFieldSync or QFieldCloud | Fastest QGIS-centered pilot | Form configuration, variable cleanup, workflow validation |
| Custom app + file exchange | Export site layers, collect observations, export GeoJSON/CSV or produce GeoPackage | Dedicated interface with a straightforward QGIS handoff | Project builder, forms, offline maps/storage, export mapping |
| Custom app + shared backend | App API writes to PostGIS or an editable GIS service; QGIS reads the same data | Many collectors and ongoing shared data | Authentication, schema management, synchronization and conflicts |

This comparison is retained as research background. The confirmed production direction is the custom app with automatic synchronization and a shared backend. File exchange is supplementary; QField and ArcGIS provide reference workflows rather than alternative production decisions.

**QField as an experimental reference**

QField’s documented manual workflow packages a QGIS project, copies it to a device, collects data, copies the modified package back, and applies changes to the original desktop project. Its offline-editing action tracks edits. The current cable workflow specifically says to synchronize only once per export and create a new package for later collection. A map theme can be rendered into a background raster. Do not assume the cloud packaging workflow automatically follows every cable-basemap setting. [QFieldSync packaging](https://docs.qfield.org/get-started/tutorials/get-started-qfs/)

QField supports manual point placement with a map crosshair; locking to a GNSS position is optional. This matches Janet’s requirement to record a child’s location rather than the tablet’s location. Internet connectivity and GPS availability are separate issues. [QField digitizing](https://docs.qfield.org/how-to/data-collection/digitize/)

Its forms support choices, text, date/time, defaults, constraints, relationships, conditional visibility, and remembering previous values. These are useful building blocks. Remembering the last value alone does not establish Janet’s required reset behavior by project, day, round, observer, and zone; that needs deliberate configuration and testing. [QField attribute forms](https://docs.qfield.org/how-to/project-setup/attributes-form/)

There is also an XLSForm Converter plugin that generates QGIS projects and GeoPackages from standardized spreadsheet forms, including question structures, choices, and logic. Janet’s single-sheet library is not already an XLSForm. A conversion step must first normalize identifiers, options, and explicit rules, then verify which constructs the converter preserves. This may help with experiments and interoperability, but the production manager and collector interfaces will belong to our custom app. [QField XLSForm Converter](https://docs.qfield.org/how-to/advanced-how-tos/xlsforms-plugin/)

For team synchronization, QFieldCloud documents a default last-wins conflict policy and an optional manual resolution policy. For research observations, prefer independent record creation and explicit review of conflicting edits. Use stable unique identifiers, and test two-device behavior rather than equating successful upload with correct merging. [QFieldCloud conflicts](https://docs.qfield.org/reference/qfieldcloud/jobs/#understanding-conflicts-delta_apply-jobs)

**A custom app can exchange standard data without embedding QGIS**

For initial project setup and supplementary file exchange, export the site’s vector layers from QGIS and show them with a web/mobile map renderer. Routine collection must use the automatic synchronization path described above. Capture each event as point geometry plus typed answers. On return, QGIS can load the observations as a new layer. CSV requires selecting the longitude and latitude fields and the correct coordinate reference system. [QGIS supported sources and CSV import](https://docs.qgis.org/3.44/en/docs/user_manual/managing_data_source/opening_data.html)

| Format | Recommended purpose | Boundary |
| --- | --- | --- |
| GeoJSON | Browser-friendly vector interchange and initial observation export | Does not transport the full QGIS project, its forms, or styling |
| CSV | Analysis-friendly table, one row per event with explicit coordinates | Needs coordinate/field typing instructions; does not describe a complete map |
| GeoPackage | Durable GIS handoff with typed layers and related tables | A custom browser app needs a library or server-side conversion; support is not automatic |
| Georeferenced imagery or raster tiles | Offline background | Supply bounds/CRS and use content permitted for this purpose |

GeoPackage is an open SQLite-based geospatial format. GDAL has a read/write GeoPackage driver, making backend conversion a practical option rather than requiring us to implement the file format. Keep a codebook and schema version with exports. [GeoPackage specification overview](https://www.geopackage.org/), [GDAL GeoPackage support](https://gdal.org/en/stable/drivers/vector/gpkg.html)

Use RFC 7946 GeoJSON longitude/latitude coordinates in WGS 84, in that order. Projected coordinates measured in meters must be transformed, not merely relabelled. Preserve the source CRS for site assets and compare known control locations after import. [GeoJSON specification](https://www.rfc-editor.org/rfc/rfc7946#section-4)

Avoid Shapefile as the primary delivery format: its core DBF field-name and type limitations are a poor fit for Janet’s long column names, timestamps, and 1,000-character summaries. Newer readers’ sidecar capabilities do not make it the strongest interoperability contract. [GDAL Shapefile limitations](https://gdal.org/en/stable/drivers/vector/shapefile.html#creation-issues)

Loading a new output layer is different from merging changes into an existing layer. File re-import does not inherently recognize duplicate observations or resolve competing edits. If “upload back” means updating existing records, specify identifier-based updates, deletions, and conflict handling before implementing that path.

For the required shared service, two viable designs are an application API backed by PostGIS, or a suitably configured QGIS Server WFS endpoint. QGIS Server documents WFS Transaction operations for insertion, update, and deletion. Its WMS supplies rendered maps, which is a different responsibility. Do not treat viewing a WMS map as evidence that its data is editable, or assume every OGC API Features endpoint supports writes. [QGIS WFS transactions](https://docs.qgis.org/3.44/en/docs/server_manual/services/wfs.html), [QGIS WMS](https://docs.qgis.org/3.44/en/docs/server_manual/services/wms.html)

The proposed shared architecture for the confirmed direction is app → authenticated application API → PostGIS, with QGIS reading approved spatial tables or views. Keep flexible questionnaire answers internally if useful, but expose analysis-ready typed columns rather than asking researchers to unpack an opaque JSON blob. QGIS Server becomes useful when publishing QGIS-rendered maps or standardized GIS services is itself a requirement.

**Janet’s variable library requires more than a map form**

The following is a proposed data design inferred from the workbooks, not a finalized protocol:

| Scope | Store here | Why it matters |
| --- | --- | --- |
| Project and form version | Site, selected variables, option lists, zones/subzones, TOPO mode, rules | Managers configure a reusable subset without changing prior collected data |
| Observer/session | Observer identifier and active assignment | Avoid repeated typing without sharing one observer’s identity across accounts |
| Round and zone context | Weather, wind, relevant shade context, zone inventory, effective time | Carry forward only within the intended scope; a new round/day/zone must not inherit unrelated values |
| Observation | UUID, location, time with timezone, round/zone IDs, play event answers | Independent events remain individually identifiable and exportable |
| Analysis export | One event per row plus resolved context and a codebook | Researchers can use conventional columns in QGIS and spreadsheets |

The full library places observer inheritance in H10, zone/subzone setup in H17:H23, round climate inheritance in H28:H36, and the two-play-type requirement in H121:H139. These are explicit reasons to model more than an isolated popup. For round context, retain a historical snapshot or versioned reference so later changes do not silently rewrite earlier events. Decide with Janet whether a weather change starts a new round or updates only future events.

Use distinct internal IDs, stable stored option codes, readable labels, and unique export column names. Keep variable selection separate from the source workbook’s formatting. Define whether hidden conditional answers are cleared, retained as draft-only values, or exported as not applicable. Distinguish a configured No from unanswered and not applicable. For multi-select variables, agree on a documented export representation, such as coded text plus analysis indicator columns or a related answer table.

**Specific workbook issues to resolve before generating forms**

All references below are to Sheet1. “Test” means Variables to use for App testing.xlsx; “Library” means Behavior Mapping Variable Library.xlsx. Suggested changes are proposals only; neither workbook was modified.

| Evidence | Consequence | Proposed resolution |
| --- | --- | --- |
| Test rows 33–40 and 180–187 are hidden; H169 refers to LooseParts14 and LooseParts16 in hidden rows | A naive import can activate excluded variables or leave rules targeting unavailable questions | Confirm whether hidden means excluded, optional, or unfinished; make inclusion explicit |
| Test E17 and E199 both contain `Shade` | Round climate shade and event-location shade can collide | Separate context and event columns, with names Janet approves |
| Test E168 and E169 both contain `Nat_LP_Intn_Binary` | Natural and manufactured loose-part answers collide | Give manufactured interaction a distinct field name |
| Test E176 and E177 both contain `Nat_LPs_Lrg` | A yes/no value and its checklist share one field | Give the checklist its own export name |
| Test E51 and Library E75 are blank for Gender1 | The export schema is incomplete | Assign an approved stable export name |
| Library B21 and B23 both contain `EnvZone3` | Different zone/subzone definitions share an identifier | Assign distinct IDs; preserve alternatives as mutually exclusive configuration choices |
| Test H19, H21, H23, H25, H27, H29, H31 say “if YES,” but G lists quantity bands | The condition cannot be evaluated as written; absence is also not clearly represented | Define a presence question or a quantity predicate and an explicit zero/none option if intended |
| Test H54, H70, H138 say “if YES,” but the questions offer categories/counts | Visibility predicates are underspecified | Confirm explicit category conditions; do not mechanically interpret these as booleans |
| Test rows 83 and 92 define Play Types 1 and 2, but rows 101–133 provide only one subtype set | The second play type cannot safely reuse the first type’s subtype fields | Use independent subtype storage for both slots, following Library H139 |
| Test H70 and H188 reveal “Other” descriptions with their parent group | It is unclear whether those descriptions should appear only after selecting Other | Confirm the two-stage rules separately from the broad parent-group visibility |
| Test G171, G173, G175, G177, G179 and other checklist rows say a list will be provided | Choice sets are incomplete | Obtain project lists or explicitly enable manager-authored lists |

Not every repeated column in the full library is erroneous: collapsed and expanded alternatives can intentionally share a final analysis field if only one is selectable. Validate collisions against the selected project configuration. Also review copied labels: Test C164 describes a natural feature under the designed/manufactured group.

The test sheet does not repeat every rule in the full library. For example, it omits several inheritance and subtype notes. Confirm whether omitted rules are inherited or intentionally disabled; absence of a note is not a safe execution rule.

**ArcGIS capabilities as research background**

ArcGIS Field Maps offers a map-centered collection interface and form visibility expressions. It could cover standard collection requirements if the institution already has the appropriate ArcGIS setup. The custom reusable variable-library workflow still needs configuration or an additional builder. [Field Maps forms](https://doc.arcgis.com/en/field-maps/latest/prepare-maps/configure-the-form.htm)

Offline collection uses properly configured web maps and editable layers. A view-only mobile map package or geospatial PDF is not equivalent to an editable offline collection map. [Field Maps download preparation](https://doc.arcgis.com/en/field-maps/latest/prepare-maps/prepare-maps-for-download.htm)

Collection requires an appropriate organizational user type and editing privileges. Verify the university’s actual entitlements rather than assuming free public map access includes field editing. No institutional licenses or costs were verified in this research. [Field Maps account requirements](https://doc.arcgis.com/en/field-maps/get-started/requirements.htm)

A custom app can send additions, updates, and deletions through a feature layer’s `applyEdits` operation, subject to its capabilities and permissions. This does not automatically provide an offline engine. ArcGIS separately documents `createReplica` and `synchronizeReplica` for synchronization with sync-enabled services. Inspect the actual service’s capabilities and schema before selecting a strategy. [Apply Edits](https://developers.arcgis.com/rest/services-reference/enterprise/apply-edits-feature-service-layer/), [ArcGIS sync overview](https://developers.arcgis.com/rest/services-reference/enterprise/sync-overview/)

Survey123 is also worth considering if the questionnaire dominates the interface. Its XLSForm format explicitly supports choices, relevance conditions, and calculations. Janet’s workbook would still need conversion into the required survey/choices structure. This is an alternative for evaluation, not evidence of drop-in compatibility. [Survey123 XLSForm essentials](https://doc.arcgis.com/en/survey123/desktop/create-surveys/xlsformessentials.htm)

**Offline imagery is a separate requirement**

Downloading the app and saving answers locally do not guarantee that a usable site map is available without a connection. Package the selected site extent and necessary zoom levels, confirm georeferencing and attribution, and verify that the full imagery remains available after restarting the device offline.

The notes mention Google Maps imagery. Google’s Map Tiles API policies restrict storage and offline use; do not assume that imagery visible in QGIS can be repackaged for a custom offline app. The standard OpenStreetMap tile server also prohibits bulk offline downloading. Use an institution-owned/openly licensed raster or a provider with explicit offline rights. [Google Map Tiles policies](https://developers.google.com/maps/documentation/tile/policies), [OpenStreetMap tile policy](https://operations.osmfoundation.org/policies/tiles/)

**What the current prototype actually establishes**

Source inspection found a Leaflet map-tap flow, localStorage-backed observations, CSV and GeoJSON exporters, and an ArcGIS request preview. The form currently uses fixed asset-oriented fields such as tree/irrigation, condition, and follow-up, rather than Janet’s configurable behavior library. The sync handler waits 850 milliseconds and marks records synced locally; it sends no GIS request. The background tile layer is rendered only while online, and the service worker only caches same-origin requests.

Relevant files now live under `web/`: `src/components/capture/CaptureMap.tsx`, `src/components/capture/FieldCaptureWorkspace.tsx` (sync handler at line 112), `src/types/capture.ts`, `src/state/useCaptureStore.ts`, `src/lib/fieldExports.ts`, and `public/sw.js`. These are code-inspection findings from the original feasibility research. They do not verify browser persistence after lifecycle events, actual exports opened in QGIS, or a live GIS connection; subsequent native upload and QGIS verification is recorded in [Supabase setup](Supabase-Setup.md).

**Recommended pilot and acceptance gate**

1. Confirm one real site map, permitted offline imagery, target tablet, active variables, and the ambiguous rules. Start with a representative 10–15-question slice covering both play types, wildlife/Other, zone choices, and round inheritance; expand to the confirmed test subset after the workflow passes.
2. Inspect the experimental QField project to understand its layers, data sources, CRS, and form interactions. Implement the representative slice in our custom app; use QField only as a reference for the experiment.
3. On the actual target tablet, download the project, disable connectivity and location permission, place observations manually, close/reopen the app, and confirm map and records persist. Change a parent answer and verify hidden-answer handling and required-field behavior.
4. Restore connectivity and verify automatic upload to our authoritative database, then refresh the connected QGIS layer. Compare point positions, IDs, record counts, field names, codes, timestamps, long text, and multi-select values. Verify both play subtypes independently. Repeat an upload after an interrupted response and verify it does not duplicate data. No manual file handoff is required for this acceptance test.
5. Test a new round, date, zone, and project for carry-forward isolation, then test two collectors, interrupted synchronization, expired authentication, and a conflicting edit. Validate the custom app against these requirements; its selection is already final.

The main feasibility risk is not whether QGIS can read the output. It is whether the form definitions, context inheritance, offline maps, and repeated imports preserve the intended research data. No source project/layer, real device test, hosted service configuration, or approved form interpretation was available to establish those outcomes in this research.

Next action: locate the experimental QField project and identify the target tablet platform.
