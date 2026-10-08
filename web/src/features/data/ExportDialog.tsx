"use client";

import { useState } from "react";

import { Button } from "@/components/contour/Button";
import { Checkbox } from "@/components/contour/Checkbox";
import { Dialog, DialogClose } from "@/components/contour/Dialog";
import { Note } from "@/components/contour/Note";
import { RadioRows } from "@/components/contour/RadioRows";
import { useToast } from "@/components/contour/Toast";
import type { Observation } from "@/fixtures";

import { type ExportFormat, exportRecords } from "./exportRows";
import { plural } from "./filters";
import type { MarkerPosition } from "./markers";

export type ExportDialogProps = {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	records: Observation[];
	positions: Record<string, MarkerPosition>;
	/** "14 observations · all zones · all rounds · all types": the dialog repeats the scope it exports. */
	scope: string;
	fileStem: string;
};

const FORMAT_LABEL: Record<ExportFormat, string> = { csv: "CSV", geojson: "GeoJSON" };

/**
 * Export (project-02): the filtered observations as CSV or GeoJSON, written in this browser by the
 * workspace's one export writer, with the codebook beside them. Nothing is requested from a server.
 */
export function ExportDialog({ open, onOpenChange, records, positions, scope, fileStem }: ExportDialogProps) {
	const { toast } = useToast();
	const [format, setFormat] = useState<ExportFormat>("csv");
	const [codebook, setCodebook] = useState(true);
	const [busy, setBusy] = useState(false);
	const empty = records.length === 0;

	function runExport() {
		setBusy(true);
		// Let "Preparing…" paint before the file is written; the work itself is immediate.
		requestAnimationFrame(() => {
			const rows = exportRecords({ records, positions, format, codebook, fileStem });
			setBusy(false);
			onOpenChange(false);
			toast({
				title: `OBS export ready · ${rows} ${plural(rows, "row")}`,
				description: codebook ? "Saved with its codebook." : undefined
			});
		});
	}

	return (
		<Dialog
			open={open}
			onOpenChange={next => {
				if (!busy) onOpenChange(next);
			}}
			title="Export observations"
			description={scope}
			footer={
				<>
					<DialogClose asChild>
						<Button variant="outline" disabled={busy}>
							Cancel
						</Button>
					</DialogClose>
					<Button
						icon="download"
						busy={busy}
						busyLabel="Preparing…"
						disabled={empty}
						disabledReason={
							empty ? "No observations match this view. Change the filters to export." : undefined
						}
						onClick={runExport}>
						Download {FORMAT_LABEL[format]}
					</Button>
				</>
			}>
			<div className="flex flex-col gap-5">
				<fieldset className="flex flex-col gap-3">
					<legend className="mb-2 type-small font-semibold text-ink">Format</legend>
					<RadioRows
						label="Format"
						value={format}
						onValueChange={value => setFormat(value as ExportFormat)}
						options={[
							{
								value: "csv",
								label: "CSV",
								description: "One row per observation, with longitude and latitude columns."
							},
							{
								value: "geojson",
								label: "GeoJSON",
								description: "Points with their answers, for QGIS and other GIS tools."
							}
						]}
					/>
				</fieldset>
				<Checkbox
					id="export-codebook"
					checked={codebook}
					onCheckedChange={setCodebook}
					description="A second file that explains every column.">
					Include the codebook
				</Checkbox>
				<Note>Records still on devices are not included.</Note>
			</div>
		</Dialog>
	);
}
