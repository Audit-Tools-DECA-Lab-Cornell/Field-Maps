import type { ProjectImportRequest, ProjectImportResult } from "@/lib/api/types";
import { type LayerCollection, type LayerName, LayerReadError, matchSlot } from "@/lib/packages";

const MAX_IMPORT_BYTES = 16 * 1024 * 1024;

export async function importSubmission(files: readonly File[]): Promise<ProjectImportRequest> {
	if (files.length > 64 || files.reduce((sum, file) => sum + file.size, 0) > MAX_IMPORT_BYTES) {
		throw new LayerReadError(
			"Choose at most 64 files totalling 16 MB. Zip only the project and its vector layers."
		);
	}
	return {
		files: await Promise.all(
			files.map(async file => {
				const bytes = new Uint8Array(await file.arrayBuffer());
				let binary = "";
				for (let start = 0; start < bytes.length; start += 8192) {
					binary += String.fromCharCode(...bytes.subarray(start, start + 8192));
				}
				return { file_name: file.name, content: btoa(binary) };
			})
		)
	};
}

export function importedFiles(result: Pick<ProjectImportResult, "layers">, overrides: readonly File[]): File[] {
	const exports = overrides.filter(file => /\.(geojson|json)$/i.test(file.name));
	const claimed = new Set(exports.map(file => matchSlot(file.name)).filter(slot => slot !== null));
	return [
		...exports,
		...result.layers
			.filter(layer => {
				const slot = matchSlot(layer.name);
				return slot === null || !claimed.has(slot);
			})
			.map(
				layer =>
					new File([JSON.stringify(layer.collection)], `${layer.name.replace(/[\\/]/g, "-")}.geojson`, {
						type: "application/geo+json"
					})
			)
	];
}

export function importedProject(result: ProjectImportResult): File {
	return new File(
		[Uint8Array.from(atob(result.project_file.content), character => character.charCodeAt(0))],
		result.project_file.file_name
	);
}

export function normalizeImportedLayer(name: LayerName, collection: LayerCollection): LayerCollection {
	const feature = collection.features[0];
	if (
		name !== "ground" ||
		collection.features.length !== 1 ||
		!feature ||
		feature.properties.kind ||
		!feature.geometry ||
		!["Polygon", "MultiPolygon"].includes(feature.geometry.type)
	)
		return collection;
	return { ...collection, features: [{ ...feature, properties: { ...feature.properties, kind: "site" } }] };
}
