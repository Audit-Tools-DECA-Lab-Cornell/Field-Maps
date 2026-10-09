/**
 * The manifest a map package carries (`Manifest` in backend/src/fieldmaps_api/domain/packages.py), read
 * leniently for the Inspect view: the API sends it as free-form data, and a field this page does not
 * understand is left out rather than turned into an error.
 */

export type ManifestView = {
	formVersion: string | null;
	zones: { id: string; label: string }[];
	layers: { name: string; features: number }[];
	/** The QGIS project the layers came from, when one was supplied. */
	project: {
		fileName: string;
		title: string | null;
		crs: string | null;
		vectorLayers: number;
		rasterLayers: number;
	} | null;
};

function record(value: unknown): Record<string, unknown> | null {
	return typeof value === "object" && value !== null && !Array.isArray(value)
		? (value as Record<string, unknown>)
		: null;
}

function text(value: unknown): string | null {
	return typeof value === "string" && value.trim() !== "" ? value.trim() : null;
}

function count(value: unknown): number | null {
	return typeof value === "number" && Number.isFinite(value) ? value : null;
}

export function readManifest(value: unknown): ManifestView | null {
	const manifest = record(value);
	if (!manifest) return null;

	const zones = (Array.isArray(manifest.zones) ? manifest.zones : []).flatMap(entry => {
		const zone = record(entry);
		const id = text(zone?.id);
		return id ? [{ id, label: text(zone?.label) ?? id }] : [];
	});

	const layers = (Array.isArray(manifest.layers) ? manifest.layers : []).flatMap(entry => {
		const layer = record(entry);
		const name = text(layer?.name);
		const features = count(layer?.features);
		return name && features !== null ? [{ name, features }] : [];
	});

	const source = record(manifest.source_project);
	const fileName = text(source?.file_name);
	const project =
		source && fileName
			? {
					fileName,
					title: text(source.title),
					crs: text(source.crs),
					vectorLayers: Array.isArray(source.vector_layers) ? source.vector_layers.length : 0,
					rasterLayers: Array.isArray(source.raster_layers) ? source.raster_layers.length : 0
				}
			: null;

	return { formVersion: text(manifest.form_version), zones, layers, project };
}
