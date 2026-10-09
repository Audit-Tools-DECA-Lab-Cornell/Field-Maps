"use client";

import { useState } from "react";

import { Button } from "@/components/contour/Button";
import { Dialog, DialogClose } from "@/components/contour/Dialog";
import { Note } from "@/components/contour/Note";
import { RadioRows } from "@/components/contour/RadioRows";
import { useToast } from "@/components/contour/Toast";
import { saveText } from "@/lib/download";
import { codebook, EMPTY_CELL_NOTE, exportFileName, toCsv, toGeoJson } from "@/lib/export/observations";
import { plural } from "@/lib/labels";
import type { Clock } from "@/lib/time";

import type { DataRecord } from "./view";

type Format = "csv" | "geojson" | "codebook";

const FORMATS: Record<Format, { word: string; extension: "csv" | "geojson"; mime: string }> = {
	csv: { word: "CSV", extension: "csv", mime: "text/csv" },
	geojson: { word: "GeoJSON", extension: "geojson", mime: "application/geo+json" },
	codebook: { word: "codebook", extension: "csv", mime: "text/csv" }
};

export type ExportObservationsProps = {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	/** The observations in view: what the table shows after every filter. */
	records: readonly DataRecord[];
	/** Each form version's definition, as it was when the version was published. */
	definitions: Readonly<Record<string, unknown>>;
	/** Form versions whose definition could not be read. */
	missingVersions: readonly string[];
	/** The list holds only the newest 500 observations. */
	limited: boolean;
	projectCode: string;
	clock: Clock;
};

/**
 * Export: the observations in view as a CSV or GeoJSON file, or the codebook that explains the columns.
 * The file is written in this browser from the rows on screen, with each row's own form version, so
 * answers keep the wording and option codes they were collected with.
 */
export function ExportObservations({
	open,
	onOpenChange,
	records,
	definitions,
	missingVersions,
	limited,
	projectCode,
	clock
}: ExportObservationsProps) {
	const { toast } = useToast();
	const [format, setFormat] = useState<Format>("csv");
	const empty = records.length === 0;
	// Only the form versions the rows in view were collected with: their questions are the file's columns.
	const inView = new Set(records.map(record => record.row.form_version));
	const versions = Object.fromEntries(Object.entries(definitions).filter(([code]) => inView.has(code)));

	function download() {
		const rows = records.map(record => record.row);
		const spec = FORMATS[format];
		const content =
			format === "csv"
				? toCsv(rows, versions)
				: format === "geojson"
					? toGeoJson(rows, versions)
					: codebook(versions, rows);
		const fileName = exportFileName(
			projectCode,
			format === "codebook" ? "codebook" : "observations",
			clock.dayKey(new Date().toISOString()),
			spec.extension
		);
		saveText(content, fileName, spec.mime);
		onOpenChange(false);
		toast({ title: `Download started: ${fileName}`, tone: "saved" });
	}

	const scope = `${plural(records.length, "observation")} in this view`;

	return (
		<Dialog
			open={open}
			onOpenChange={onOpenChange}
			title="Export observations"
			description={
				format === "codebook"
					? `A list of every column the files hold, from the ${plural(Object.keys(versions).length, "form version")} in view.`
					: `${scope}. Filters you set are applied.`
			}
			footer={
				<>
					<DialogClose asChild>
						<Button variant="outline">Cancel</Button>
					</DialogClose>
					<Button
						variant="primary"
						icon="download"
						disabled={empty}
						disabledReason={
							empty ? "No observations are in this view. Change the filters to export." : undefined
						}
						onClick={download}>
						Download {FORMATS[format].word}
					</Button>
				</>
			}>
			<div className="flex flex-col gap-5">
				<RadioRows
					label="File type"
					value={format}
					onValueChange={value => setFormat(value as Format)}
					options={[
						{
							value: "csv",
							label: "CSV",
							description: "One row per observation, with longitude and latitude columns, for Excel or R."
						},
						{
							value: "geojson",
							label: "GeoJSON",
							description: "One point per observation with its answers, for QGIS."
						},
						{
							value: "codebook",
							label: "Codebook",
							description: "What each column means and what its option codes stand for."
						}
					]}
				/>
				{limited && (
					<Note tone="neutral" title="Based on the newest 500 observations.">
						Older observations are not in this file.
					</Note>
				)}
				{missingVersions.length > 0 && (
					<Note tone="attention" title="Some questions could not be loaded.">
						Answers made with {missingVersions.join(", ")} are written under their question ids.
					</Note>
				)}
				{format === "csv" && <p className="type-small text-ink-2">{EMPTY_CELL_NOTE}</p>}
				<p className="type-small text-ink-2">Observations still on observers&apos; devices are not included.</p>
			</div>
		</Dialog>
	);
}
