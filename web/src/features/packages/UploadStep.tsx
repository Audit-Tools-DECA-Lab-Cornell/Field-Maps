"use client";

import { type DragEvent, useId, useMemo, useState } from "react";

import { Button } from "@/components/contour/Button";
import { Field } from "@/components/contour/Field";
import { Icon } from "@/components/contour/Icon";
import { InnerPanel } from "@/components/contour/InnerPanel";
import { Island, IslandSection } from "@/components/contour/Island";
import { Note } from "@/components/contour/Note";
import { ScreenState } from "@/components/contour/ScreenState";
import { Select } from "@/components/contour/Select";
import { StateBadge } from "@/components/contour/StateBadge";
import { TextInput } from "@/components/contour/TextInput";
import { MapFrame } from "@/components/map/MapFrame";
import { usePreview } from "@/features/shell/PreviewProvider";
import { ApiError } from "@/lib/api/errors";
import { cx } from "@/lib/cx";
import {
	analyzeLayer,
	apiBaseUrl,
	type ClientCheck,
	EXPECTED_GEOMETRY,
	LAYER_NAMES,
	type LayerName,
	LayerReadError,
	type LayerSlotState,
	matchSlot,
	type PackageDetail,
	type PackageSubmission,
	type PreparationCheck,
	type ProjectSlotState,
	readLayer,
	readProjectFile,
	REQUIRED_LAYERS,
	resolveProjectId,
	runClientChecks,
	SLOT_LABELS,
	SLOT_ORDER,
	type SlotTarget,
	submitPackage,
	type UnassignedFile
} from "@/lib/packages";

import { previewPlan } from "./upload-preview";

/**
 * The Upload step (project-10): the real package upload. Files are read in this browser as soon as they are
 * chosen, matched to their slot by name, previewed on a plan and checked; the upload itself sends one JSON
 * submission to the FieldMaps API (`POST /v1/projects/{id}/packages`, lib/packages.ts), whose own checks
 * then decide whether the package is ready. This step is the only part of the sample workspace that calls
 * a server, and it says so.
 */

const ACCEPT = ".json,.geojson,application/json,application/geo+json,.qgz,.qgs";

const EMPTY_SLOTS: Record<LayerName, LayerSlotState> = {
	ground: { kind: "empty" },
	paths: { kind: "empty" },
	trees: { kind: "empty" },
	zones: { kind: "empty" }
};

/** The site and form codes the pilot database holds, as the earlier upload screen defaulted to. */
const DEFAULT_SITE_CODE = "sample-garden";
const DEFAULT_FORM_VERSION = "shell-v1";

const SERVER_STEP: Record<PreparationCheck["step"], string> = {
	"source-project": "QGIS project",
	"layer-sources": "Layer sources",
	"coordinate-reference": "Coordinate system",
	"imagery-licence": "Imagery licence",
	archive: "Package archive"
};

function formatBytes(bytes: number): string {
	if (bytes < 1024) return `${bytes} B`;
	if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
	return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function features(count: number): string {
	return `${count} ${count === 1 ? "feature" : "features"}`;
}

/** A check's state as the vocabulary words it: passes, fails, or a warning drawn with the fails glyph. */
function CheckBadge({ state }: { state: ClientCheck["state"] | PreparationCheck["state"] }) {
	if (state === "passed") return <StateBadge kind="check" state="passes" size="sm" />;
	if (state === "warning") return <StateBadge kind="check" state="fails" label="Warning" size="sm" />;
	if (state === "skipped") return <StateBadge kind="check" state="checking" label="Skipped" size="sm" />;
	return <StateBadge kind="check" state="fails" size="sm" />;
}

function SlotBadge({ name, slot }: { name: LayerName; slot: LayerSlotState }) {
	if (slot.kind === "empty") return <span className="type-small text-ink-2">Not chosen</span>;
	if (slot.kind === "reading") return <StateBadge kind="check" state="checking" label="Reading" size="sm" />;
	if (slot.kind === "error") return <StateBadge kind="check" state="fails" label="Unreadable" size="sm" />;
	const mismatched = slot.analysis.geometryTypes.some(type => type !== EXPECTED_GEOMETRY[name]);
	return mismatched ? (
		<StateBadge kind="check" state="fails" label="Wrong geometry" size="sm" />
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
	onFiles,
	children
}: {
	id: string;
	label: string;
	accept: string;
	multiple?: boolean;
	onFiles: (files: File[]) => void;
	children: string;
}) {
	return (
		<>
			<input
				id={id}
				type="file"
				multiple={multiple}
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
					"before:absolute before:inset-x-0 before:-inset-y-1",
					"peer-focus-visible:outline-(length:--ct-size-focus-ring) peer-focus-visible:outline-offset-(--ct-size-focus-gap) peer-focus-visible:outline-focus peer-focus-visible:outline-solid"
				)}>
				{children}
			</label>
		</>
	);
}

export function UploadStep({ siteName }: { siteName: string }) {
	const { can, offline } = usePreview();
	const baseUrl = apiBaseUrl();
	const projectId = resolveProjectId("");
	const fieldId = useId();

	const [siteCode, setSiteCode] = useState(DEFAULT_SITE_CODE);
	const [formVersion, setFormVersion] = useState(DEFAULT_FORM_VERSION);
	const [slots, setSlots] = useState<Record<LayerName, LayerSlotState>>(EMPTY_SLOTS);
	const [projectSlot, setProjectSlot] = useState<ProjectSlotState>({ kind: "empty" });
	const [unassigned, setUnassigned] = useState<readonly UnassignedFile[]>([]);
	const [token, setToken] = useState("");
	const [dragging, setDragging] = useState(false);
	const [busy, setBusy] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [notice, setNotice] = useState<string | null>(null);
	const [result, setResult] = useState<PackageDetail | null>(null);

	const clientChecks = useMemo(() => runClientChecks(slots), [slots]);
	const plan = useMemo(() => previewPlan(`${siteName} upload`, slots), [siteName, slots]);

	if (!can("uploadPackage"))
		return (
			<Island flush title="Upload a QGIS package">
				<ScreenState
					kind="no-access"
					body="Your current role can view map packages, but cannot upload them. Ask a project manager to review your access."
				/>
			</Island>
		);

	async function assignLayer(name: LayerName, file: File) {
		setSlots(current => ({ ...current, [name]: { kind: "reading", file } }));
		try {
			const collection = await readLayer(file);
			setSlots(current => ({
				...current,
				[name]: { kind: "ready", file, collection, analysis: analyzeLayer(collection) }
			}));
		} catch (raised) {
			const message = raised instanceof LayerReadError ? raised.message : `${file.name} could not be read.`;
			setSlots(current => ({ ...current, [name]: { kind: "error", file, message } }));
		}
	}

	/** A whole drop or selection at once: files whose name matches a free slot go there; the rest wait. */
	function ingestFiles(incoming: File[]) {
		if (incoming.length === 0) return;
		setResult(null);
		const claimedLayers = new Set<LayerName>(LAYER_NAMES.filter(name => slots[name].kind !== "empty"));
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
			parked.push({ id: crypto.randomUUID(), file, guess });
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
		ingestFiles(Array.from(event.dataTransfer.files));
	}

	const missing = REQUIRED_LAYERS.filter(name => slots[name].kind !== "ready");
	const blocked = clientChecks.some(check => check.state === "blocked");

	async function build(): Promise<PackageSubmission> {
		const layers: PackageSubmission["layers"] = {};
		for (const name of LAYER_NAMES) {
			const slot = slots[name];
			if (slot.kind === "ready") layers[name] = slot.collection;
		}
		return {
			site_code: siteCode.trim(),
			form_version: formVersion.trim(),
			layers,
			...(projectSlot.kind === "ready" ? { project_file: await readProjectFile(projectSlot.file) } : {})
		};
	}

	async function send() {
		setBusy(true);
		setError(null);
		setNotice(null);
		setResult(null);
		try {
			const submission = await build();
			if (baseUrl === null) {
				// No API is set for this deployment: hand over the exact document the endpoint takes instead.
				const url = URL.createObjectURL(
					new Blob([JSON.stringify(submission, null, 2)], { type: "application/json" })
				);
				const anchor = document.createElement("a");
				anchor.href = url;
				anchor.download = `${submission.site_code}-package-submission.json`;
				anchor.click();
				window.setTimeout(() => URL.revokeObjectURL(url), 30_000);
				setNotice(
					`Nothing was uploaded. ${anchor.download} is the submission this step would have sent; it is in your downloads.`
				);
				return;
			}
			setResult(await submitPackage(baseUrl, projectId.id, token.trim(), submission));
		} catch (raised) {
			setError(
				raised instanceof ApiError || raised instanceof LayerReadError
					? raised.message
					: "The FieldMaps API could not be reached. Check your connection and try again."
			);
		} finally {
			setBusy(false);
		}
	}

	const reason = offline
		? "You are offline. The package can be sent once the connection returns."
		: missing.length > 0
			? `The button turns on when ${missing.map(name => SLOT_LABELS[name].toLowerCase()).join(" and ")} ${missing.length === 1 ? "is" : "are"} chosen.`
			: blocked
				? "A check below blocks this package. Fix the export in QGIS and choose the file again."
				: !siteCode.trim() || !formVersion.trim()
					? "Enter the site code and the form version."
					: baseUrl !== null && !projectId.valid
						? "This deployment does not name its API project yet (NEXT_PUBLIC_FIELDMAPS_PROJECT_ID), so the API would refuse the upload."
						: baseUrl !== null && token.trim() === ""
							? "Paste a manager token under “Use a manager token” first."
							: null;

	return (
		<div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
			<Island flush divided title="Upload a QGIS package" meta="Ground and zones are required">
				<IslandSection className="grid gap-5 pt-5 sm:grid-cols-2">
					<Field
						label="Site code"
						htmlFor={`${fieldId}-site`}
						hint="The site’s code in the FieldMaps database. This preview cannot list them yet.">
						<TextInput
							value={siteCode}
							autoComplete="off"
							spellCheck={false}
							className="type-mono-data"
							onChange={event => setSiteCode(event.target.value)}
						/>
					</Field>
					<Field label="Form version" htmlFor={`${fieldId}-form`} hint="The published form this map is for.">
						<TextInput
							value={formVersion}
							autoComplete="off"
							spellCheck={false}
							className="type-mono-data"
							onChange={event => setFormVersion(event.target.value)}
						/>
					</Field>
				</IslandSection>

				<IslandSection className="pt-1 pb-5">
					<div
						onDragOver={event => {
							event.preventDefault();
							setDragging(true);
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
							<p className="type-body font-semibold text-ink">
								Drop the QGIS export here, or choose files
							</p>
							<p className="max-w-md type-small text-ink-2">
								Ground, zones, paths and trees as GeoJSON, and the .qgz project if you have it. Files
								are matched to their slot by name.
							</p>
							<FilePick
								id={`${fieldId}-files`}
								label="Choose files from the QGIS export"
								accept={ACCEPT}
								multiple
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
												? `${formatBytes(slot.file.size)} · ${features(slot.analysis.featureCount)} · ${slot.analysis.geometryTypes.join(", ") || "no geometry"}`
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
										onFiles={([file]) => file && void assignLayer(name, file)}>
										{slot.kind === "empty" ? "Choose" : "Replace"}
									</FilePick>
									{slot.kind !== "empty" && (
										<Button
											variant="ghost"
											size="sm"
											aria-label={`Remove the ${SLOT_LABELS[name]} file`}
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
									? "Without it, the source and licence checks are recorded as skipped."
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
								onFiles={([file]) => file && setProjectSlot({ kind: "ready", file })}>
								{projectSlot.kind === "empty" ? "Choose" : "Replace"}
							</FilePick>
							{projectSlot.kind !== "empty" && (
								<Button
									variant="ghost"
									size="sm"
									aria-label="Remove the QGIS project file"
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
					<details className="group rounded-panel border border-line">
						<summary className="flex min-h-control cursor-pointer list-none items-center justify-between gap-3 rounded-panel px-4 py-2 font-semibold text-ink hover:bg-well [&::-webkit-details-marker]:hidden">
							<span className="flex items-center gap-2">
								<Icon name="key-round" size={18} />
								Use a manager token
							</span>
							<Icon
								name="chevron-down"
								size={18}
								className="transition-transform group-open:rotate-180"
							/>
						</summary>
						<div className="flex flex-col gap-3 border-t border-rule px-4 pt-3 pb-4">
							<p className="type-small text-ink-2">
								The FieldMaps API accepts a package only from a manager of the project, identified by an
								access token. This workspace does not pass its sign-in to the upload yet, so paste a
								token issued to a project manager. It is sent with this upload only and is not kept.
							</p>
							<Field label="Access token" htmlFor={`${fieldId}-token`}>
								<TextInput
									type="password"
									autoComplete="off"
									spellCheck={false}
									value={token}
									placeholder="eyJhbGciOi…"
									onChange={event => setToken(event.target.value)}
								/>
							</Field>
						</div>
					</details>

					<div className="flex flex-col items-start gap-2">
						<Button
							icon={baseUrl === null ? "download" : "upload"}
							busy={busy}
							busyLabel={baseUrl === null ? "Preparing…" : "Uploading…"}
							disabled={reason !== null}
							disabledReason={reason ?? undefined}
							onClick={() => void send()}>
							{baseUrl === null ? "Download submission" : "Upload package"}
						</Button>
						<p className="type-small text-ink-2">
							{baseUrl === null
								? "No FieldMaps API is set for this deployment (NEXT_PUBLIC_FIELDMAPS_API_URL), so this step downloads the submission instead of sending it."
								: "Sends this package to the FieldMaps API."}
						</p>
					</div>

					{error && (
						<Note tone="attention" title="The package was not uploaded." live="assertive">
							{error} Your files are still chosen here.
						</Note>
					)}
					{notice && (
						<Note tone="waiting" icon="download" live="polite">
							{notice}
						</Note>
					)}
				</IslandSection>
			</Island>

			<div className="flex min-w-0 flex-col gap-6">
				{plan && (
					<section aria-label="Local preview" className="flex flex-col gap-3">
						<MapFrame
							site={plan}
							mapVersion="new"
							title="Chosen files · preview"
							subtitle="Read in this browser, not sent yet"
						/>
						<p className="type-small text-ink-2">
							A preview of the files you chose. Nothing is sent until you upload, and nothing on devices
							changes until a version is activated.
						</p>
					</section>
				)}

				<Island
					flush
					title="Checked in this browser"
					meta={clientChecks.length > 0 ? undefined : "Waiting for files"}>
					{clientChecks.length === 0 ? (
						<p className="px-island-pad pb-island-pad type-body text-ink-2">
							Checks appear once a layer is chosen. The server runs its own checks after the upload.
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

				{result && (
					<Island
						flush
						title="Checked by the server"
						meta={
							<StateBadge
								kind="check"
								state={result.state === "ready" ? "passes" : "fails"}
								label={result.state === "ready" ? "Ready" : "Blocked"}
							/>
						}
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
										<span className="block type-body font-semibold text-ink">
											{SERVER_STEP[check.step]}
										</span>
										<span className="block type-small break-words text-ink-2">{check.detail}</span>
									</span>
									<CheckBadge state={check.state} />
								</li>
							))}
						</ul>
						<IslandSection className="pb-island-pad">
							<Note tone={result.state === "ready" ? "saved" : "attention"}>
								{result.state === "ready"
									? `Version ${result.version} is prepared on the server and recorded with its checks.`
									: "The package is kept with its reasons and cannot be downloaded. Fix what blocked it and upload the next version."}
							</Note>
						</IslandSection>
					</Island>
				)}
			</div>
		</div>
	);
}
