import type { FeatureCollection } from "@/types/geojson";

/**
 * Assembling what the API's package endpoint takes, out of the files QGIS writes.
 *
 * The layers are GeoJSON, so they travel as JSON rather than as multipart: the whole submission
 * is one document, which is also what makes it reviewable before it is sent. The project file is
 * the one binary, base64 encoded — it is read for provenance and for the imagery-licence check,
 * neither of which a GeoJSON export can answer.
 */

export const LAYER_NAMES = ["ground", "paths", "trees", "zones"] as const;
export type LayerName = (typeof LAYER_NAMES)[number];

export const REQUIRED_LAYERS: readonly LayerName[] = ["ground", "zones"];

export interface PackageSubmission {
	readonly site_code: string;
	readonly form_version: string;
	readonly layers: Partial<Record<LayerName, FeatureCollection>>;
	readonly project_file?: { readonly file_name: string; readonly content: string };
}

export interface PreparationCheck {
	readonly step: "source-project" | "layer-sources" | "coordinate-reference" | "imagery-licence" | "archive";
	readonly state: "passed" | "warning" | "blocked" | "skipped";
	readonly detail: string;
}

export interface PackageDetail {
	readonly package_id: string;
	readonly site_code: string;
	readonly form_version: string;
	readonly version: number;
	readonly state: "ready" | "blocked";
	readonly archive_bytes: number;
	readonly archive_sha256: string;
	readonly prepared_at: string;
	readonly checks: readonly PreparationCheck[];
}

export class LayerReadError extends Error {}

/** Parse one exported layer, failing with the name of the file a manager actually chose. */
export async function readLayer(file: File): Promise<FeatureCollection> {
	let parsed: unknown;
	try {
		parsed = JSON.parse(await file.text());
	} catch {
		throw new LayerReadError(`${file.name} is not readable JSON. Export it as GeoJSON.`);
	}
	if (
		typeof parsed !== "object" ||
		parsed === null ||
		(parsed as { type?: unknown }).type !== "FeatureCollection" ||
		!Array.isArray((parsed as { features?: unknown }).features)
	)
		throw new LayerReadError(`${file.name} is not a GeoJSON FeatureCollection.`);
	return parsed as FeatureCollection;
}

/** Base64 without loading the file twice: the project file is the only binary in a submission. */
export async function readProjectFile(file: File): Promise<{ file_name: string; content: string }> {
	const bytes = new Uint8Array(await file.arrayBuffer());
	let binary = "";
	for (let index = 0; index < bytes.length; index += 1) binary += String.fromCharCode(bytes[index]!);
	return { file_name: file.name, content: btoa(binary) };
}

/** Where the API lives. Absent in a deployment that has not been pointed at one, and said so. */
export function apiBaseUrl(): string | null {
	const configured = process.env.NEXT_PUBLIC_FIELDMAPS_API_URL;
	return configured !== undefined && configured !== "" ? configured.replace(/\/$/, "") : null;
}

export async function submitPackage(
	baseUrl: string,
	projectId: string,
	token: string,
	submission: PackageSubmission
): Promise<PackageDetail> {
	const response = await fetch(`${baseUrl}/v1/projects/${projectId}/packages`, {
		method: "POST",
		headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
		body: JSON.stringify(submission)
	});
	if (response.status === 201) return (await response.json()) as PackageDetail;
	const detail = await response.text();
	if (response.status === 401 || response.status === 403)
		throw new LayerReadError("That token does not have manager access to this project.");
	throw new LayerReadError(
		response.status === 422
			? `The server refused the submission: ${detail}`
			: `The server answered ${response.status}. ${detail}`
	);
}
