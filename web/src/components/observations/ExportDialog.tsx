"use client";

import { useEffect, useRef, useState } from "react";

import { PrimaryAction, Prose, SecondaryAction } from "@/components/nocturne/chrome";
import { download, type ExportOptions, toCodebook, toCsv, toGeoJson } from "@/lib/exports";
import { formatCount } from "@/lib/format";
import type { Observation } from "@/types/domain";

const FORMATS = [
	{ id: "csv", name: "CSV", note: "One row per event, explicit lon/lat columns, WGS 84" },
	{ id: "geojson", name: "GeoJSON", note: "RFC 7946 lon/lat order — opens in a browser or a web map" },
	{
		id: "gpkg",
		name: "GeoPackage",
		note: "Typed layers plus related answer tables. Generated server-side, so not available here",
		disabled: true
	}
] as const;

type FormatId = (typeof FORMATS)[number]["id"];

/** The current filter set carries into the export, so what downloads is what the reader is seeing. */
export function ExportDialog({
	records,
	summary,
	onClose
}: {
	readonly records: readonly Observation[];
	readonly summary: string;
	readonly onClose: () => void;
}) {
	const [format, setFormat] = useState<FormatId>("csv");
	const [options, setOptions] = useState<ExportOptions>({ codebook: true, includeFlagged: true });
	const dialogRef = useRef<HTMLDivElement>(null);

	/**
	 * `aria-modal` is a claim about behaviour, so the behaviour has to be here: focus moves into
	 * the dialog, Tab cycles inside it rather than reaching the obscured workspace behind, Escape
	 * closes, and focus returns to whatever opened it.
	 */
	useEffect(() => {
		const opener = document.activeElement as HTMLElement | null;
		const dialog = dialogRef.current;
		dialog?.focus();

		const focusable = () =>
			[...(dialog?.querySelectorAll<HTMLElement>("button, [href], input, select, textarea") ?? [])].filter(
				element => !element.hasAttribute("disabled") && element.tabIndex !== -1
			);

		const onKey = (event: KeyboardEvent) => {
			if (event.key === "Escape") {
				onClose();
				return;
			}
			if (event.key !== "Tab") return;
			const stops = focusable();
			const first = stops[0];
			const last = stops.at(-1);
			if (first === undefined || last === undefined) return;
			const active = document.activeElement;
			if (event.shiftKey && (active === first || active === dialog)) {
				event.preventDefault();
				last.focus();
			} else if (!event.shiftKey && active === last) {
				event.preventDefault();
				first.focus();
			}
		};

		document.addEventListener("keydown", onKey);
		return () => {
			document.removeEventListener("keydown", onKey);
			opener?.focus();
		};
	}, [onClose]);

	const excluded = options.includeFlagged ? 0 : records.filter(record => record.flagId !== null).length;
	const rows = records.length - excluded;

	function generate() {
		if (format === "csv") download("observations.csv", "text/csv;charset=utf-8", toCsv(records, options));
		if (format === "geojson") download("observations.geojson", "application/geo+json", toGeoJson(records, options));
		if (options.codebook) download("codebook.csv", "text/csv;charset=utf-8", toCodebook());
		onClose();
	}

	return (
		<div
			className="fixed inset-0 z-50 flex items-center justify-center bg-bg/80 p-loose backdrop-blur-sm"
			onClick={event => {
				if (event.target === event.currentTarget) onClose();
			}}>
			<div
				ref={dialogRef}
				role="dialog"
				aria-modal="true"
				aria-labelledby="export-title"
				tabIndex={-1}
				className="flex max-h-full w-full max-w-lg flex-col gap-base overflow-y-auto overscroll-contain rounded-lg border border-neutral-700 bg-raised p-loose shadow-lg">
				<div>
					<h2 id="export-title" className="text-question text-text">
						Export {formatCount(rows)} {rows === 1 ? "observation" : "observations"}
					</h2>
					<Prose tone="faint" className="mt-tight text-micro">
						Filtered to {summary}. Exports are for analysis, backup and interoperability — they are not the
						sync path, because QGIS already reads the live database.
					</Prose>
				</div>

				<fieldset className="m-0 border-0 p-0">
					<legend className="mb-tight text-micro text-neutral-500">Format</legend>
					<div className="flex flex-col gap-tight">
						{FORMATS.map(entry => {
							const disabled = "disabled" in entry && entry.disabled === true;
							return (
								<label
									key={entry.id}
									className={`flex min-h-11 cursor-pointer items-start gap-snug rounded-md border-l-2 px-snug py-tight ${
										format === entry.id
											? "border-l-accent-400 bg-accent-800"
											: "border-l-transparent bg-neutral-900 hover:bg-neutral-800"
									} ${disabled ? "cursor-not-allowed opacity-45" : ""}`}>
									<input
										type="radio"
										name="export-format"
										value={entry.id}
										checked={format === entry.id}
										disabled={disabled}
										onChange={() => setFormat(entry.id)}
										className="mt-[3px] size-[15px] shrink-0 accent-[var(--color-accent)]"
									/>
									<span className="min-w-0">
										<span className="block text-detail text-text">{entry.name}</span>
										<span className="block text-micro text-neutral-500">{entry.note}</span>
									</span>
								</label>
							);
						})}
					</div>
				</fieldset>

				<fieldset className="m-0 border-0 p-0">
					<legend className="mb-tight text-micro text-neutral-500">Include</legend>
					<div className="flex flex-col gap-tight">
						<Toggle
							label="Codebook"
							note="Variable codes, export columns, labels and the open questions still on each"
							checked={options.codebook}
							onChange={value => setOptions(current => ({ ...current, codebook: value }))}
						/>
						<Toggle
							label="Flagged records"
							note="Flags travel as a column; rows are never silently dropped"
							checked={options.includeFlagged}
							onChange={value => setOptions(current => ({ ...current, includeFlagged: value }))}
						/>
					</div>
				</fieldset>

				{excluded > 0 && (
					<p className="text-micro text-attention-text">
						⚠ {formatCount(excluded)} flagged {excluded === 1 ? "record is" : "records are"} being left out
						of this file.
					</p>
				)}

				<div className="flex flex-wrap items-center justify-end gap-snug">
					<SecondaryAction onClick={onClose}>Cancel</SecondaryAction>
					<PrimaryAction onClick={generate}>Generate {format === "csv" ? "CSV" : "GeoJSON"}</PrimaryAction>
				</div>
			</div>
		</div>
	);
}

function Toggle({
	label,
	note,
	checked,
	onChange
}: {
	readonly label: string;
	readonly note: string;
	readonly checked: boolean;
	readonly onChange: (value: boolean) => void;
}) {
	return (
		<label className="flex min-h-11 cursor-pointer items-start gap-snug rounded-md px-snug py-tight hover:bg-ink-tint">
			<input
				type="checkbox"
				checked={checked}
				onChange={event => onChange(event.target.checked)}
				className="mt-[3px] size-[15px] shrink-0 accent-[var(--color-accent)]"
			/>
			<span className="min-w-0">
				<span className="block text-detail text-text">{label}</span>
				<span className="block text-micro text-neutral-500">{note}</span>
			</span>
		</label>
	);
}
