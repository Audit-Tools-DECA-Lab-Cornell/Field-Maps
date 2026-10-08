import { z } from "zod";

/**
 * What the FieldMaps API says about a project's sites, forms and packages, and what this device keeps of
 * them. Every body is parsed here before use, as the identity client does: a server answer is never
 * trusted unread.
 */

const finite = z.number().finite();
const position = z.tuple([finite, finite]);

/** A zone as the site's current package draws it: its id, its name and its box. */
export const manifestZoneSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  west: finite,
  south: finite,
  east: finite,
  north: finite,
});
export type ManifestZone = z.infer<typeof manifestZoneSchema>;

export const extentSchema = z.object({ west: finite, south: finite, east: finite, north: finite });

/** `manifest.json` inside a package archive (`backend/src/fieldmaps_api/domain/packages.py`). */
export const manifestSchema = z.object({
  format: z.number().int().min(1),
  site_code: z.string().min(1),
  form_version: z.string().min(1),
  extent: extentSchema,
  centre: position,
  zones: z.array(manifestZoneSchema).min(1),
});
export type Manifest = z.infer<typeof manifestSchema>;

const geometrySchema = z.object({ type: z.string().min(1), coordinates: z.unknown() });

export const featureCollectionSchema = z.object({
  type: z.literal("FeatureCollection"),
  features: z.array(
    z.object({
      type: z.literal("Feature"),
      geometry: geometrySchema,
      properties: z.record(z.string(), z.unknown()).nullish(),
    }),
  ),
});
export type LayerData = z.infer<typeof featureCollectionSchema>;

/** The layers an archive may carry. Ground and zones are required by the API before it prepares one. */
export const layersSchema = z.object({
  ground: featureCollectionSchema,
  zones: featureCollectionSchema,
  paths: featureCollectionSchema.optional(),
  trees: featureCollectionSchema.optional(),
});
export type PackageLayers = z.infer<typeof layersSchema>;

/** `GET /v1/projects/{project}/sites`: one site and its current package, if it has one. */
export const siteSchema = z.object({
  site_id: z.uuid(),
  code: z.string().min(1),
  name: z.string().min(1),
  description: z.string().nullable(),
  package: z
    .object({
      package_id: z.uuid(),
      version: z.number().int().min(1),
      form_version: z.string().nullable(),
      archive_bytes: z.number().int().min(0),
      archive_sha256: z.string().regex(/^[a-f0-9]{64}$/),
      prepared_at: z.string(),
    })
    .nullable(),
  zones: z.array(manifestZoneSchema),
  observation_count: z.number().int().min(0),
});
export type HostedSite = z.infer<typeof siteSchema>;
export const sitesSchema = z.array(siteSchema);

const versionStateSchema = z.enum(["draft", "published", "retired"]);

/** `GET /v1/projects/{project}/forms`: members see published and retired versions only. */
export const formSummarySchema = z.object({
  code: z.string().min(1),
  name: z.string().min(1),
  versions: z.array(
    z.object({ code: z.string().min(1), version: z.number().int(), state: versionStateSchema }),
  ),
});
export const formSummariesSchema = z.array(formSummarySchema);
export type FormSummary = z.infer<typeof formSummarySchema>;

/** `GET /v1/projects/{project}/form-versions/{code}`: the definition itself. */
export const formVersionSchema = z.object({
  code: z.string().min(1),
  state: versionStateSchema,
  form_code: z.string().min(1),
  definition: z.record(z.string(), z.unknown()),
});
export type FormVersion = z.infer<typeof formVersionSchema>;

/**
 * What this device keeps of a downloaded site: the archive's manifest and layers, the forms it is
 * collected with, and which project and site they belong to. The definitions are kept as the server sent
 * them and parsed again on every open, so a form the parser would refuse never reaches the field.
 */
export const storedPackageSchema = z.object({
  format: z.literal(1),
  projectId: z.uuid(),
  siteId: z.uuid(),
  siteCode: z.string().min(1),
  siteName: z.string().min(1),
  packageId: z.uuid(),
  packageVersion: z.number().int().min(1),
  archiveBytes: z.number().int().min(0),
  archiveSha256: z.string().regex(/^[a-f0-9]{64}$/),
  savedAt: z.iso.datetime(),
  manifest: manifestSchema,
  layers: layersSchema,
  forms: z.object({
    play: z.record(z.string(), z.unknown()),
    inventory: z.record(z.string(), z.unknown()).nullable(),
  }),
});
export type StoredPackage = z.infer<typeof storedPackageSchema>;
