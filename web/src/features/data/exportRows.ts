import { type Observation as FixtureObservation, ZONES } from "@/fixtures";
import { download, toCsv, toGeoJson } from "@/lib/exports";
import type { Observation as ExportObservation } from "@/types/domain";

import { answerColumns, codebookFor } from "./exportColumns";
import type { MarkerPosition } from "./markers";

/**
 * Turns the preview's observations into the shape `lib/exports.ts` writes, so Data's export uses the one
 * CSV and GeoJSON writer the workspace has. Only uploaded records are in the fixtures, so records still on
 * devices are never in an export.
 */

export type ExportFormat = "csv" | "geojson";

function toExportShape(record: FixtureObservation, position: MarkerPosition | undefined): ExportObservation {
	const zone = ZONES.find(entry => entry.siteSlug === record.siteSlug && entry.slug === record.zoneSlug);
	return {
		id: record.id,
		siteId: record.siteSlug,
		zoneId: zone?.code ?? record.zoneSlug,
		round: record.round,
		observerCode: record.observerInitials,
		observedAt: record.capturedAt,
		receivedAt: record.uploadedAt ?? "",
		formVersionCode: record.formVersion,
		revision: 1,
		longitude: position?.lng ?? 0,
		latitude: position?.lat ?? 0,
		playType: record.playType,
		answers: answerColumns(record.answers ?? []),
		flagId: null,
		state: "in-database",
		history: []
	};
}

/** Builds the file (and the codebook beside it) and hands it to the browser to save. Returns the row count. */
export function exportRecords({
	records,
	positions,
	format,
	codebook,
	fileStem
}: {
	records: readonly FixtureObservation[];
	positions: Record<string, MarkerPosition>;
	format: ExportFormat;
	codebook: boolean;
	fileStem: string;
}): number {
	const rows = records.map(record => toExportShape(record, positions[record.id]));
	const options = { codebook, includeFlagged: true };
	if (format === "csv") download(`${fileStem}.csv`, "text/csv;charset=utf-8", toCsv(rows, options));
	else download(`${fileStem}.geojson`, "application/geo+json", toGeoJson(rows, options));
	if (codebook) download(`${fileStem}-codebook.csv`, "text/csv;charset=utf-8", codebookFor(rows));
	return rows.length;
}
