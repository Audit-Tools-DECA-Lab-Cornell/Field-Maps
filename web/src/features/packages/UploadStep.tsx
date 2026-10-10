"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { type DragEvent, useId, useMemo, useRef, useState } from "react";

import { Button } from "@/components/contour/Button";
import { Field } from "@/components/contour/Field";
import { Icon } from "@/components/contour/Icon";
import { InnerPanel } from "@/components/contour/InnerPanel";
import { Island, IslandSection } from "@/components/contour/Island";
import { Note } from "@/components/contour/Note";
import { Select } from "@/components/contour/Select";
import { StateBadge } from "@/components/contour/StateBadge";
import { MapFrame } from "@/components/map/MapFrame";
import { preparePackage } from "@/lib/api/browser";
import { apiRequestError, wasRefused } from "@/lib/api/errors";
import type { PackageDetail, PackageSubmission, ProjectImportResult } from "@/lib/api/types";
import { cx } from "@/lib/cx";
import { formatBytes, plural } from "@/lib/labels";
import {
	analyzeLayer,
	canUpload,
	LAYER_NAMES,
	type LayerName,
	LayerReadError,
	type LayerSlotState,
	matchSlot,
	type ProjectSlotState,
	readLayer,
	readProjectFile,
	REQUIRED_LAYERS,
	runClientChecks,
	SLOT_LABELS,
	SLOT_ORDER,
	type SlotTarget,
	submissionLayers,
	type UnassignedFile,
	unexpectedGeometry
} from "@/lib/packages";

import { packageUploaded } from "./actions";
import { CheckBadge } from "./CheckBadge";
import { CHECK_STEP } from "./checks";
import type { PublishedVersion } from "./forms";
import { importedFiles, importedProject, normalizeImportedLayer } from "./project-import";
import { ProjectImport } from "./ProjectImport";
import { previewPlan } from "./upload-preview";

const ACCEPT = ".json,.geojson,application/json,application/geo+json,.qgz,.qgs";

const EMPTY_SLOTS: Record<LayerName, LayerSlotState> = {
	ground: { kind: "empty" },
	paths: { kind: "empty" },
	trees: { kind: "empty" },
	zones: { kind: "empty" }
};

function SlotBadge({ name, slot }: { name: LayerName; slot: LayerSlotState }) {
	if (slot.kind === "empty") return <span className="type-small text-ink-2">Not chosen</span>;
	if (slot.kind === "reading") return <StateBadge kind="check" state="checking" label="Reading" size="sm" />;
	if (slot.kind === "error") return <StateBadge kind="check" state="fails" label="Unreadable" size="sm" />;
	return unexpectedGeometry(name, slot.analysis).length > 0 || slot.analysis.withoutGeometry > 0 ? (
		<StateBadge kind="check" state="fails" label="Wrong shapes" size="sm" />
	) : (
		<StateBadge kind="check" state="passes" label="Ready" size="sm" />
	);
}

/** A file input dressed as a small outline button, so every slot can be filled without a mouse. */
function FilePick({
	id,
	label,
	accept,
	multiple = false,
	disabled = false,
	onFiles,
	children
}: {
	id: string;
	label: string;
	accept: string;
	multiple?: boolean;
	disabled?: boolean;
	onFiles: (files: File[]) => void;
	children: string;
}) {
	return (
		<>
			<input
				id={id}
				type="file"
				multiple={multiple}
				disabled={disabled}
				accept={accept}
				aria-label={label}
				className="peer sr-only"
				onChange={event => {
					onFiles(Array.from(event.target.files ?? []));
					event.target.value = "";
				}}
			/>
			<label
				htmlFor={id}
				className={cx(
					"relative inline-flex min-h-control-sm cursor-pointer items-center justify-center gap-2 rounded-pill border-2 border-ink bg-island px-4 py-1.5 text-sm font-semibold text-ink",
					"transition-[background-color] duration-(--ct-duration-quick) ease-standard hover:bg-well",
					"peer-disabled:cursor-not-allowed peer-disabled:border-transparent peer-disabled:bg-well peer-disabled:text-ink-2 peer-disabled:hover:bg-well",
					"before:absolute before:inset-x-0 before:-inset-y-1",
					"peer-focus-visible:outline-(length:--ct-size-focus-ring) peer-focus-visible:outline-offset-(--ct-size-focus-gap) peer-focus-visible:outline-focus peer-focus-visible:outline-solid"
				)}>
				{children}
			</label>
		</>
	);
}

const UNCONFIRMED_UPLOAD_COPY =
	"DECA Mark could not confirm the upload. Check the history below for a new version before you upload again.";

/**
 * Why the upload failed, in words: a file problem, or DECA Mark's reason (its own message for a rejected
 * package). With no answer from DECA Mark, or a failure on its side, the package may have arrived, and
 * `confirmed` is false so the screen does not say it was not uploaded.
 */
function uploadProblem(error: unknown): { message: string; confirmed: boolean; formVersion?: string } {
	if (error instanceof LayerReadError) return { message: error.message, confirmed: true };
	const failure = apiRequestError(error);
	if (!wasRefused(failure)) return { message: UNCONFIRMED_UPLOAD_COPY, confirmed: false };
	return {
		// A rejected package carries a message that names the layer and the problem; show it.
		message: failure.code === "validation_failed" ? (failure.detail ?? failure.message) : failure.message,
		confirmed: true,
		...(failure.fields.form_version ? { formVersion: failure.fields.form_version } : {})
	};
}

export function UploadStep({
	org,
	project,
	projectId,
	siteCode,
	siteName,
	forms,
	defaultFormVersion,
	packagesHref
}: {
	org: string;
	project: string;
	projectId: string;
	siteCode: string;
	siteName: string;
	/** Published form versions, the most recent first. */
	forms: PublishedVersion[];
	defaultFormVersion: string;
	/** The packages page, for the link to the version just prepared. */
	packagesHref: string;
}) {
	const router = useRouter();
	const fieldId = useId();
	const nextId = useRef(0);

	const [formVersion, setFormVersion] = useState(defaultFormVersion);
	const [slots, setSlots] = useState<Record<LayerName, LayerSlotState>>(EMPTY_SLOTS);
	const [projectSlot, setProjectSlot] = useState<ProjectSlotState>({ kind: "empty" });
	const [unassigned, setUnassigned] = useState<readonly UnassignedFile[]>([]);
	const [dragging, setDragging] = useState(false);
	const [uploading, setBusy] = useState(false);
	const [importing, setImporting] = useState(false);
	const [importReset, setImportReset] = useState(0);
	const busy = uploading || importing;
	const convertedFiles = useRef(new WeakSet<File>());
	const [error, setError] = useState<string | null>(null);
	const [uncertain, setUncertain] = useState(false);
	const [formVersionProblem, setFormVersionProblem] = useState<string | null>(null);
	const [result, setResult] = useState<PackageDetail | null>(null);

	const clientChecks = useMemo(() => runClientChecks(slots, projectSlot), [slots, projectSlot]);
	const plan = useMemo(() => previewPlan(siteName, slots), [siteName, slots]);

	async function assignLayer(name: LayerName, file: File) {
		setSlots(current => ({ ...current, [name]: { kind: "reading", file } }));
		try {
			const read = await readLayer(file);
			const collection = convertedFiles.current.has(file) ? normalizeImportedLayer(name, read) : read;
			setSlots(current => ({
				...current,
				[name]: { kind: "ready", file, collection, analysis: analyzeLayer(collection) }
			}));
		} catch (raised) {
			const message = raised instanceof LayerReadError ? raised.message : `${file.name} could not be read.`;
			setSlots(current => ({ ...current, [name]: { kind: "error", file, message } }));
		}
	}

	async function acceptImport(imported: ProjectImportResult, originals: readonly File[]) {
		const nextSlots = { ...slots };
		for (const name of LAYER_NAMES) {
			const slot = nextSlots[name];
			if (slot.kind !== "empty" && convertedFiles.current.has(slot.file)) nextSlots[name] = { kind: "empty" };
		}
		const parked = unassigned.filter(entry => !convertedFiles.current.has(entry.file));
		for (const file of importedFiles(imported, originals)) {
			const converted = !originals.includes(file);
			if (converted) convertedFiles.current.add(file);
			const name = matchSlot(file.name);
			if (name && name !== "project" && (nextSlots[name].kind === "empty" || !converted)) {
				const read = await readLayer(file);
				const collection = converted ? normalizeImportedLayer(name, read) : read;
				nextSlots[name] = { kind: "ready", file, collection, analysis: analyzeLayer(collection) };
			} else {
				nextId.current += 1;
				parked.push({ id: `file-${nextId.current}`, file, guess: name });
			}
		}
		setSlots(nextSlots);
		setUnassigned(parked);
		setProjectSlot({ kind: "ready", file: importedProject(imported) });
		setResult(null);
		setError(null);
	}

	/** A whole drop or selection at once: files whose name matches a free slot go there; the rest wait. */
	function ingestFiles(incoming: File[]) {
		if (incoming.length === 0 || busy) return;
		setResult(null);
		setError(null);
		const claimedLayers = new Set<LayerName>(
			LAYER_NAMES.filter(name => {
				const slot = slots[name];
				return slot.kind !== "empty" && !convertedFiles.current.has(slot.file);
			})
		);
		let claimedProject = projectSlot.kind !== "empty";
		const parked: UnassignedFile[] = [];
		for (const file of incoming) {
			const guess = matchSlot(file.name);
			if (guess === "project" && !claimedProject) {
				claimedProject = true;
				setProjectSlot({ kind: "ready", file });
				continue;
			}
			if (guess !== null && guess !== "project" && !claimedLayers.has(guess)) {
				claimedLayers.add(guess);
				void assignLayer(guess, file);
				continue;
			}
			nextId.current += 1;
			parked.push({ id: `file-${nextId.current}`, file, guess });
		}
		if (parked.length > 0) setUnassigned(current => [...current, ...parked]);
	}

	function assignUnassigned(id: string, target: SlotTarget) {
		const entry = unassigned.find(item => item.id === id);
		if (!entry) return;
		setUnassigned(current => current.filter(item => item.id !== id));
		if (target === "project") setProjectSlot({ kind: "ready", file: entry.file });
		else void assignLayer(target, entry.file);
	}

	function onDrop(event: DragEvent<HTMLDivElement>) {
		event.preventDefault();
		setDragging(false);
		// The files being uploaded are fixed until the upload ends; a drop is still caught so the browser does not open it.
		if (!busy) ingestFiles(Array.from(event.dataTransfer.files));
	}

	const missing = REQUIRED_LAYERS.filter(name => slots[name].kind !== "ready");
	const reading = LAYER_NAMES.some(name => slots[name].kind === "reading");
	const blocked = clientChecks.some(check => check.state === "blocked");
	const ready = canUpload(slots, clientChecks) && formVersion !== "";

	const reason = importing
		? "Wait for the project to finish reading."
		: ready
			? null
			: missing.length > 0
				? `The button turns on when ${missing.map(name => SLOT_LABELS[name].toLowerCase()).join(" and ")} ${missing.length === 1 ? "is" : "are"} chosen.`
				: reading
					? "The button turns on when your files have been read."
					: blocked
						? "A check below blocks this package. Fix the export in QGIS and choose the file again."
						: "Choose a form version.";

	async function send() {
		setBusy(true);
		setError(null);
		setUncertain(false);
		setFormVersionProblem(null);
		setResult(null);
		try {
			const submission: PackageSubmission = {
				site_code: siteCode,
				form_version: formVersion,
				layers: submissionLayers(slots),
				...(projectSlot.kind === "ready" ? { project_file: await readProjectFile(projectSlot.file) } : {})
			};
			const prepared = await preparePackage(projectId, submission);
			setResult(prepared);
			// The files are uploaded: clear them so one press cannot make the same version twice.
			setSlots(EMPTY_SLOTS);
			setProjectSlot({ kind: "empty" });
			setUnassigned([]);
			setImportReset(current => current + 1);
			// Everything that shows this site's current package refreshes, then this page does.
			await packageUploaded({ org, project }).catch(() => undefined);
			router.refresh();
		} catch (raised) {
			const problem = uploadProblem(raised);
			setError(problem.message);
			setUncertain(!problem.confirmed);
			if (problem.formVersion) setFormVersionProblem(problem.formVersion);
			if (!problem.confirmed) {
				// It may have arrived: show the history as it is now, keeping the chosen files.
				await packageUploaded({ org, project }).catch(() => undefined);
				router.refresh();
			}
		} finally {
			setBusy(false);
		}
	}

	return (
		<div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
			<Island flush divided title="Upload from QGIS" meta="Ground and zones are required">
				<IslandSection className="pt-5">
					<ProjectImport
						key={importReset}
						projectId={projectId}
						disabled={uploading}
						onImported={acceptImport}
						onBusy={setImporting}
					/>
				</IslandSection>
				<IslandSection className="pt-5">
					<Field
						label="Form version"
						htmlFor={`${fieldId}-form`}
						hint="The published form observers use with this map."
						error={formVersionProblem}>
						<Select value={formVersion} onChange={event => setFormVersion(event.target.value)}>
							{forms.map(version => (
								<option key={version.code} value={version.code}>
									{version.formName} · {version.code}
								</option>
							))}
						</Select>
					</Field>
				</IslandSection>

				<IslandSection className="pt-1 pb-5">
					<div
						onDragOver={event => {
							event.preventDefault();
							setDragging(!busy);
						}}
						onDragLeave={() => setDragging(false)}
						onDrop={onDrop}>
						<InnerPanel
							dashed={!dragging}
							className={cx(
								"flex flex-col items-center gap-3 px-6 py-8 text-center transition-[background-color,border-color] duration-(--ct-duration-quick) ease-standard",
								dragging && "border-2 border-ink bg-well"
							)}>
							<span className="grid size-12 place-items-center rounded-pill bg-well text-ink">
								<Icon name="upload" size={22} />
							</span>
							<p className="type-body font-semibold text-ink">Add or replace layers with GeoJSON</p>
							<p className="max-w-md type-small text-ink-2">
								Optional after reading a project. You can also upload ground and zones directly, with
								paths and trees if needed. Files are matched to their slot by name.
							</p>
							<FilePick
								id={`${fieldId}-files`}
								label="Choose files from the QGIS export"
								accept={ACCEPT}
								multiple
								disabled={busy}
								onFiles={ingestFiles}>
								Choose files
							</FilePick>
						</InnerPanel>
					</div>
				</IslandSection>

				<ul aria-label="Package files" className="border-t border-rule">
					{SLOT_ORDER.map(name => {
						const slot = slots[name];
						return (
							<li
								key={name}
								className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-rule px-island-pad py-3">
								<span className="w-28 shrink-0">
									<span className="block type-body font-semibold text-ink">{SLOT_LABELS[name]}</span>
									<span className="block type-small text-ink-2">
										{REQUIRED_LAYERS.includes(name) ? "Required" : "Optional"}
									</span>
								</span>
								<span className="min-w-0 flex-1 basis-40">
									<span className="block type-mono-data break-all text-ink" translate="no">
										{slot.kind === "empty" ? "—" : slot.file.name}
									</span>
									<span className="block type-small text-ink-2">
										{slot.kind === "empty"
											? "No file yet"
											: slot.kind === "ready"
												? `${formatBytes(slot.file.size)} · ${plural(slot.analysis.featureCount, "feature")} · ${slot.analysis.geometryTypes.join(", ") || "no shapes"}`
												: slot.kind === "error"
													? slot.message
													: formatBytes(slot.file.size)}
									</span>
								</span>
								<SlotBadge name={name} slot={slot} />
								<span className="flex shrink-0 items-center gap-2">
									<FilePick
										id={`${fieldId}-slot-${name}`}
										label={`${slot.kind === "empty" ? "Choose" : "Replace"} the ${SLOT_LABELS[name]} file`}
										accept={ACCEPT}
										disabled={busy}
										onFiles={([file]) => file && void assignLayer(name, file)}>
										{slot.kind === "empty" ? "Choose" : "Replace"}
									</FilePick>
									{slot.kind !== "empty" && (
										<Button
											variant="outline"
											size="sm"
											aria-label={`Remove the ${SLOT_LABELS[name]} file`}
											disabled={busy}
											onClick={() =>
												setSlots(current => ({ ...current, [name]: { kind: "empty" } }))
											}>
											Remove
										</Button>
									)}
								</span>
							</li>
						);
					})}
					<li className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-rule px-island-pad py-3">
						<span className="w-28 shrink-0">
							<span className="block type-body font-semibold text-ink">{SLOT_LABELS.project}</span>
							<span className="block type-small text-ink-2">Optional</span>
						</span>
						<span className="min-w-0 flex-1 basis-40">
							<span className="block type-mono-data break-all text-ink" translate="no">
								{projectSlot.kind === "empty" ? "—" : projectSlot.file.name}
							</span>
							<span className="block type-small text-ink-2">
								{projectSlot.kind === "empty"
									? "Without it, the project and imagery checks are skipped."
									: formatBytes(projectSlot.file.size)}
							</span>
						</span>
						{projectSlot.kind === "ready" ? (
							<StateBadge kind="check" state="passes" label="Ready" size="sm" />
						) : (
							<span className="type-small text-ink-2">Not chosen</span>
						)}
						<span className="flex shrink-0 items-center gap-2">
							<FilePick
								id={`${fieldId}-slot-project`}
								label={`${projectSlot.kind === "empty" ? "Choose" : "Replace"} the QGIS project file`}
								accept=".qgz,.qgs"
								disabled={busy}
								onFiles={([file]) => file && setProjectSlot({ kind: "ready", file })}>
								{projectSlot.kind === "empty" ? "Choose" : "Replace"}
							</FilePick>
							{projectSlot.kind !== "empty" && (
								<Button
									variant="outline"
									size="sm"
									aria-label="Remove the QGIS project file"
									disabled={busy}
									onClick={() => setProjectSlot({ kind: "empty" })}>
									Remove
								</Button>
							)}
						</span>
					</li>
				</ul>

				{unassigned.length > 0 && (
					<IslandSection className="flex flex-col gap-3 pt-5">
						<p className="type-mono-label text-ink-2">Not matched by name</p>
						{unassigned.map(entry => (
							<div key={entry.id} className="flex flex-wrap items-end gap-3">
								<Field
									label={<span className="type-mono-data break-all">{entry.file.name}</span>}
									htmlFor={`${fieldId}-unassigned-${entry.id}`}
									className="min-w-0 flex-1 basis-56">
									<Select
										defaultValue={entry.guess ?? ""}
										disabled={busy}
										onChange={event => {
											const value = event.target.value;
											if (value !== "") assignUnassigned(entry.id, value as SlotTarget);
										}}>
										<option value="" disabled>
											Choose its slot
										</option>
										{SLOT_ORDER.map(name => (
											<option key={name} value={name}>
												{SLOT_LABELS[name]}
											</option>
										))}
										<option value="project">{SLOT_LABELS.project}</option>
									</Select>
								</Field>
								<Button
									variant="outline"
									icon="x"
									disabled={busy}
									onClick={() =>
										setUnassigned(current => current.filter(item => item.id !== entry.id))
									}>
									Discard file
								</Button>
							</div>
						))}
					</IslandSection>
				)}

				<IslandSection className="flex flex-col gap-4 pt-5 pb-island-pad">
					<div className="flex flex-col items-start gap-2">
						<Button
							variant="primary"
							icon="upload"
							busy={uploading}
							busyLabel="Uploading…"
							disabled={reason !== null}
							disabledReason={reason ?? undefined}
							onClick={() => void send()}>
							Upload package
						</Button>
						<p className="type-small text-ink-2">
							The package is sent to DECA Mark as you. It becomes the site&rsquo;s current map once its
							checks pass.
						</p>
					</div>

					{error && (
						<Note
							tone="attention"
							title={
								uncertain ? "The package may not have been uploaded." : "The package was not uploaded."
							}
							live="assertive">
							{error} Your files are still chosen here.
						</Note>
					)}
				</IslandSection>
			</Island>

			<div className="flex min-w-0 flex-col gap-6">
				{result && <ServerResult result={result} packagesHref={packagesHref} />}

				{plan && (
					<section aria-label="Chosen files on a plan" className="flex flex-col gap-3">
						<MapFrame
							site={plan}
							mapVersion="to upload"
							title="Chosen files"
							subtitle="Read in this browser, not uploaded yet"
						/>
						<p className="type-small text-ink-2">
							A plan drawn from the chosen layers. The site changes only when you upload the package.
						</p>
					</section>
				)}

				<Island
					flush
					title="Checked in this browser"
					meta={clientChecks.length > 0 ? undefined : "Waiting for files"}>
					{clientChecks.length === 0 ? (
						<p className="px-island-pad pb-island-pad type-body text-ink-2">
							Checks appear once a layer is chosen. DECA Mark runs its own checks after the upload.
						</p>
					) : (
						<ul className="border-t border-rule">
							{clientChecks.map(check => (
								<li
									key={check.id}
									className="flex items-start justify-between gap-4 border-b border-rule px-island-pad py-3 last:border-b-0">
									<span className="min-w-0">
										<span className="block type-body font-semibold text-ink">{check.label}</span>
										<span className="block type-small break-words text-ink-2">{check.detail}</span>
									</span>
									<CheckBadge state={check.state} />
								</li>
							))}
						</ul>
					)}
				</Island>
			</div>
		</div>
	);
}

/** What DECA Mark found when it prepared the package. */
function ServerResult({ result, packagesHref }: { result: PackageDetail; packagesHref: string }) {
	const ready = result.state === "ready";
	return (
		<Island
			flush
			title="Checked by DECA Mark"
			meta={<StateBadge kind="check" state={ready ? "passes" : "fails"} label={ready ? "Ready" : "Blocked"} />}
			aria-live="polite">
			<p className="border-t border-rule px-island-pad py-3 type-mono-data text-ink">
				{result.site_code} · v{result.version} · {formatBytes(result.archive_bytes)}
			</p>
			<ul className="border-t border-rule">
				{result.checks.map((check, index) => (
					<li
						key={`${check.step}-${index}`}
						className="flex items-start justify-between gap-4 border-b border-rule px-island-pad py-3">
						<span className="min-w-0">
							<span className="block type-body font-semibold text-ink">{CHECK_STEP[check.step]}</span>
							<span className="block type-small break-words text-ink-2">{check.detail}</span>
						</span>
						<CheckBadge state={check.state} />
					</li>
				))}
			</ul>
			<IslandSection className="flex flex-col gap-3 pb-island-pad">
				<Note tone={ready ? "saved" : "attention"}>
					{ready
						? `Version ${result.version} is the site's current map. Observers get it the next time they make the site ready offline in the DECA Mark app.`
						: "DECA Mark kept this package with its reasons, but observers cannot download it. Fix what blocked it and upload the next version."}
				</Note>
				<Link
					href={`${packagesHref}?package=${result.package_id}`}
					className="font-semibold text-accent underline-offset-4 hover:underline">
					See the checks for version {result.version}
				</Link>
			</IslandSection>
		</Island>
	);
}
