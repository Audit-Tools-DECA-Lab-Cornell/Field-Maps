"use client";

import { useState } from "react";

import { Chip, type ChipTone, SectionLabel } from "@/components/nocturne/chrome";
import { plural } from "@/lib/format";
import {
	EXPECTED_GEOMETRY,
	type LayerName,
	type LayerSlotState,
	type ProjectSlotState,
	REQUIRED_LAYERS,
	SLOT_LABELS,
	SLOT_ORDER,
	type SlotTarget,
	type UnassignedFile
} from "@/lib/packages";

/**
 * Drag-and-drop (and click-to-browse) for every layer at once. A file is matched to a slot by its
 * name; whatever doesn't match waits in the unassigned list for a manager to place by hand. Every
 * slot also keeps a real file input under its "Replace" control, so nothing here needs a mouse —
 * the drop zone is one more way in, not the only way in.
 */

const ACCEPT = ".json,.geojson,application/json,application/geo+json,.qgz,.qgs";

function formatBytes(bytes: number): string {
	if (bytes < 1024) return `${bytes} B`;
	if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
	return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function slotRowStatus(
	name: LayerName,
	slot: LayerSlotState
): { readonly tone: ChipTone; readonly glyph: string; readonly label: string } {
	if (slot.kind === "empty") return { tone: "muted", glyph: "—", label: "Not chosen" };
	if (slot.kind === "reading") return { tone: "muted", glyph: "…", label: "Reading" };
	if (slot.kind === "error") return { tone: "attention", glyph: "◼", label: "Unreadable" };
	const expected = EXPECTED_GEOMETRY[name];
	const mismatched = slot.analysis.geometryTypes.some(type => type !== expected);
	return mismatched
		? { tone: "attention", glyph: "◼", label: "Wrong geometry" }
		: { tone: "accent", glyph: "✓", label: "Ready" };
}

const SMALL_CONTROL =
	"inline-flex min-h-11 cursor-pointer items-center justify-center rounded-md border px-snug text-micro transition-colors duration-100 [touch-action:manipulation]";

export function LayerDropZone({
	fieldId,
	slots,
	projectSlot,
	unassigned,
	onFiles,
	onReplace,
	onRemove,
	onReplaceProject,
	onRemoveProject,
	onAssignUnassigned,
	onRemoveUnassigned
}: {
	readonly fieldId: string;
	readonly slots: Record<LayerName, LayerSlotState>;
	readonly projectSlot: ProjectSlotState;
	readonly unassigned: readonly UnassignedFile[];
	readonly onFiles: (files: File[]) => void;
	readonly onReplace: (name: LayerName, file: File) => void;
	readonly onRemove: (name: LayerName) => void;
	readonly onReplaceProject: (file: File) => void;
	readonly onRemoveProject: () => void;
	readonly onAssignUnassigned: (id: string, target: SlotTarget) => void;
	readonly onRemoveUnassigned: (id: string) => void;
}) {
	const dropId = `${fieldId}-dropzone`;
	const [dragging, setDragging] = useState(false);

	return (
		<div>
			<div
				onDragOver={event => {
					event.preventDefault();
					setDragging(true);
				}}
				onDragLeave={() => setDragging(false)}
				onDrop={event => {
					event.preventDefault();
					setDragging(false);
					onFiles(Array.from(event.dataTransfer.files));
				}}
				className={`flex flex-col items-center gap-tight rounded-md border border-dashed px-loose py-wide text-center transition-colors duration-100 ${
					dragging ? "border-accent bg-accent-tint" : "border-rule"
				}`}>
				<p className="text-detail text-neutral-300">Drag ground, zones, paths, trees and the .qgz here</p>
				<p className="text-micro text-neutral-600">or</p>
				<input
					id={dropId}
					type="file"
					multiple
					accept={ACCEPT}
					onChange={event => {
						onFiles(Array.from(event.target.files ?? []));
						event.target.value = "";
					}}
					className="peer sr-only"
				/>
				<label
					htmlFor={dropId}
					className="inline-flex min-h-11 cursor-pointer items-center justify-center rounded-md border border-accent px-loose text-body font-medium text-accent-200 transition-colors duration-100 peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-accent hover:bg-accent-tint">
					Browse files
				</label>
				<p className="mt-tight text-micro text-neutral-600">
					Files are matched by name — ground, zones, paths, trees, or a .qgz/.qgs project.
				</p>
			</div>

			<div className="mt-loose flex flex-col gap-tight">
				{SLOT_ORDER.map(name => {
					const slot = slots[name];
					const status = slotRowStatus(name, slot);
					const replaceId = `${fieldId}-replace-${name}`;
					return (
						<div
							key={name}
							className="flex flex-wrap items-center gap-snug border-b border-rule-faint py-snug">
							<span className="w-24 shrink-0 text-detail text-neutral-300">
								{SLOT_LABELS[name]}
								{REQUIRED_LAYERS.includes(name) && <span className="text-attention-text"> ·</span>}
							</span>
							<span className="min-w-0 flex-1 truncate text-micro text-neutral-500" translate="no">
								{slot.kind === "empty" ? "—" : slot.file.name}
							</span>
							<span className="tnum w-16 shrink-0 text-right text-micro text-neutral-600">
								{slot.kind === "empty" ? "" : formatBytes(slot.file.size)}
							</span>
							<span className="w-20 shrink-0 text-right text-micro text-neutral-600">
								{slot.kind === "ready" ? plural(slot.analysis.featureCount, "feature") : "—"}
							</span>
							<span className="w-24 shrink-0 truncate text-micro text-neutral-600">
								{slot.kind === "ready" ? slot.analysis.geometryTypes.join(", ") || "—" : "—"}
							</span>
							<Chip tone={status.tone} glyph={status.glyph}>
								{status.label}
							</Chip>
							<span className="flex shrink-0 items-center gap-tight">
								<label
									htmlFor={replaceId}
									className={`${SMALL_CONTROL} border-rule text-neutral-300 hover:bg-ink-tint`}>
									{slot.kind === "empty" ? "Choose" : "Replace"}
								</label>
								<input
									id={replaceId}
									type="file"
									accept={ACCEPT}
									aria-label={`${slot.kind === "empty" ? "Choose" : "Replace"} the ${SLOT_LABELS[name]} file`}
									onChange={event => {
										const file = event.target.files?.[0];
										if (file !== undefined) onReplace(name, file);
										event.target.value = "";
									}}
									className="sr-only"
								/>
								{slot.kind !== "empty" && (
									<button
										type="button"
										onClick={() => onRemove(name)}
										className={`${SMALL_CONTROL} border-transparent text-neutral-500 hover:bg-neutral-900 hover:text-neutral-300`}>
										Remove
									</button>
								)}
							</span>
						</div>
					);
				})}

				<div className="flex flex-wrap items-center gap-snug border-b border-rule-faint py-snug">
					<span className="w-24 shrink-0 text-detail text-neutral-300">{SLOT_LABELS.project}</span>
					<span className="min-w-0 flex-1 truncate text-micro text-neutral-500" translate="no">
						{projectSlot.kind === "empty" ? "—" : projectSlot.file.name}
					</span>
					<span className="tnum w-16 shrink-0 text-right text-micro text-neutral-600">
						{projectSlot.kind === "empty" ? "" : formatBytes(projectSlot.file.size)}
					</span>
					<span className="w-20 shrink-0 text-right text-micro text-neutral-600">—</span>
					<span className="w-24 shrink-0 text-micro text-neutral-600">—</span>
					<Chip
						tone={projectSlot.kind === "ready" ? "accent" : "muted"}
						glyph={projectSlot.kind === "ready" ? "✓" : "—"}>
						{projectSlot.kind === "ready" ? "Ready" : "Not chosen"}
					</Chip>
					<span className="flex shrink-0 items-center gap-tight">
						<label
							htmlFor={`${fieldId}-replace-project`}
							className={`${SMALL_CONTROL} border-rule text-neutral-300 hover:bg-ink-tint`}>
							{projectSlot.kind === "empty" ? "Choose" : "Replace"}
						</label>
						<input
							id={`${fieldId}-replace-project`}
							type="file"
							accept=".qgz,.qgs"
							aria-label={`${projectSlot.kind === "empty" ? "Choose" : "Replace"} the QGIS project file`}
							onChange={event => {
								const file = event.target.files?.[0];
								if (file !== undefined) onReplaceProject(file);
								event.target.value = "";
							}}
							className="sr-only"
						/>
						{projectSlot.kind !== "empty" && (
							<button
								type="button"
								onClick={onRemoveProject}
								className={`${SMALL_CONTROL} border-transparent text-neutral-500 hover:bg-neutral-900 hover:text-neutral-300`}>
								Remove
							</button>
						)}
					</span>
				</div>
			</div>

			{unassigned.length > 0 && (
				<div className="mt-loose">
					<SectionLabel>Not matched by name</SectionLabel>
					<div className="mt-tight flex flex-col gap-tight">
						{unassigned.map(entry => (
							<div
								key={entry.id}
								className="flex flex-wrap items-center gap-snug border-b border-rule-faint py-snug">
								<span className="min-w-0 flex-1 truncate text-micro text-neutral-400" translate="no">
									{entry.file.name}
								</span>
								<span className="tnum w-16 shrink-0 text-right text-micro text-neutral-600">
									{formatBytes(entry.file.size)}
								</span>
								<select
									aria-label={`Slot for ${entry.file.name}`}
									defaultValue={entry.guess ?? ""}
									onChange={event => {
										const value = event.target.value;
										if (value !== "") onAssignUnassigned(entry.id, value as SlotTarget);
									}}
									className="min-h-11 rounded-md border border-rule bg-raised px-snug text-detail text-text">
									<option value="" disabled>
										Choose a slot…
									</option>
									{SLOT_ORDER.map(name => (
										<option key={name} value={name}>
											{SLOT_LABELS[name]}
										</option>
									))}
									<option value="project">{SLOT_LABELS.project}</option>
								</select>
								<button
									type="button"
									onClick={() => onRemoveUnassigned(entry.id)}
									className={`${SMALL_CONTROL} border-transparent text-neutral-500 hover:bg-neutral-900 hover:text-neutral-300`}>
									Discard
								</button>
							</div>
						))}
					</div>
				</div>
			)}
		</div>
	);
}
