# Live FieldMaps observations in QGIS

The Supabase login `fieldmaps_qgis_training` is restricted to the fictional training project's `gis.sample_observations` view. It cannot read private application or Auth tables, edit observations, create objects in `public`, grant memberships, or bypass row policies. On the earlier development project, its pooler login was tested with TLS certificate and hostname verification and returned both uploaded WGS84 points. The connection below now points at the Field Maps GIS project, provisioned September 22, 2026; its QGIS login connects with verified TLS and is read-only. It has no observations yet.

This is a development reader for the practice project. Real research projects need their own scoped reader assignments and credential lifecycle.

## Connection

| Setting            | Value                                         |
| ------------------ | --------------------------------------------- |
| Host               | `aws-0-us-east-1.pooler.supabase.com`         |
| Port               | `5432` (session pooler)                       |
| Database           | `postgres`                                    |
| Username           | `fieldmaps_qgis_training.lezmqhuucfwqknspgcdy` |
| SSL                | Verify Full                                   |
| Certificate        | `../backend/certs/supabase-root-2021.crt`     |
| Schema / view      | `gis.sample_observations`                     |
| Unique feature key | `fid`                                         |
| Geometry / CRS     | `geom`, Point, EPSG:4326                      |

The generated GIS password is stored outside this repository in the private Docker volume `fieldmaps_qgis_secrets`, file `training-password`; read it with `docker run --rm -v fieldmaps_qgis_secrets:/s:ro fieldmaps-hosted-api cat /s/training-password`. It is separate from the administrator password and the mobile test-account password. Enter it through QGIS's normal connection prompt; do not save it in the project, the QGIS authentication manager without a master password, or a connection export. Do not use the Supabase administrator password for this reader or save plaintext credentials in project files.

`pg_service.conf` contains only public connection settings. Its certificate path is specific to this checkout; update it if the checkout moves. Launch QGIS with `PGSERVICEFILE` pointing to this file and choose service `fieldmaps_training`. Alternatively, configure the same connection in QGIS and supply the root certificate through its connection/authentication settings.

## Load and verify

1. On this Mac, double-click `open-training.command` to launch the installed QGIS 4.2.2 with the service file and saved `fieldmaps-training.qgs` project. The launcher contains no password and assumes the current QGIS installation path. Its shell syntax and paths were checked; a fresh-process launch has not been tested.
2. Supply the scoped GIS password if prompted. Select **FieldMaps observations (live)**. The duplicate `sample_observations` layer from the initial connection experiment is retained but hidden.
3. Press **F6** to open the attribute table. It contains the online and offline test records. Coordinates and form answers come directly from the hosted database. The saved project styles and labels the two points; it does not include a basemap.
4. After another mobile upload, refresh/reload the layer to see the new row. This connection reads live data; no file export is needed.

For manual setup, create a PostgreSQL connection using service `fieldmaps_training`, list schema `gis` (disable “Only look in public”), add `sample_observations`, and choose `fid` if prompted for its unique identifier. QField is a separate application.

Verified September 18, 2026 in QGIS Desktop 4.2.2: the PostgreSQL provider loaded two EPSG:4326 point features; the attribute table displayed **First sync test** and **Offline sync test** with editing disabled. QGIS's exported map canvas in `verified-observations.png` shows both styled points and labels. Both saved layer sources use the service without an inline password. The saved project and its adjacent attachments archive should stay together.

This slice is read-only in QGIS; edits made through other database accounts do not synchronize back to devices. QGIS refresh is explicit, not a push subscription. The mobile offline test was performed by the user; this verification confirms its persisted result is readable and rendered in QGIS.

References: [QGIS PostgreSQL and service connections](https://docs.qgis.org/3.44/en/docs/user_manual/managing_data_source/opening_data.html#connecting-to-postgresql), [QGIS official downloads](https://qgis.org/download/), [Supabase TLS](https://supabase.com/docs/guides/platform/ssl-enforcement).
