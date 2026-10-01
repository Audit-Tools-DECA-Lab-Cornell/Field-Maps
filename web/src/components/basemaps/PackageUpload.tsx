"use client";

import dynamic from "next/dynamic";
import { useId, useMemo, useState } from "react";

import { AttentionNote, Chip, Input, PrimaryAction, Prose, SectionLabel } from "@/components/nocturne/chrome";
import { PUBLISHED_VERSION } from "@/data/instrument";
import { PROJECT } from "@/data/project";
import { formatCount, plural } from "@/lib/format";
import {
	analyzeLayer,
	apiBaseUrl,
	approximateAreaSqMeters,
	type BBox,
	LAYER_NAMES,
	type LayerName,
	LayerReadError,
	type LayerSlotState,
	matchSlot,
	type PackageDetail,
	type PackageSubmission,
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
	type UnassignedFile,
	unionBbox
} from "@/lib/packages";
import { PREP_STATES } from "@/lib/states";
import type { PrepState } from "@/types/domain";

import { LayerDropZone } from "./LayerDropZone";

/**
 * Preparing a package from what QGIS wrote.
 *
 * Files are read here, as soon as they're dropped or chosen, well enough to preview them on a map
 * and run the checks a browser can run without a round trip. Nothing is decided here, though: the
 * server runs its own five checks after upload and this screen reports what came back, blocking
 * reasons included. A package that fails is still recorded, because the reason is the useful part.
 */

// Leaflet touches `window` on import, so the preview only ever renders in the browser.
const LayerPreviewMap = dynamic(() => import("./LayerPreviewMap"), {
	ssr: false,
	loading: () => <div className="h-72 w-full rounded-md bg-map" />
});

const CHECK_STATE: Record<string, PrepState> = {
	passed: "done",
	warning: "warning",
	blocked: "blocked",
	skipped: "waiting"
};

const EMPTY_SLOTS: Record<LayerName, LayerSlotState> = {
	ground: { kind: "empty" },
	paths: { kind: "empty" },
	trees: { kind: "empty" },
	zones: { kind: "empty" }
};

function formatBbox(bbox: BBox): string {
	const [west, south, east, north] = bbox;
	return `${west.toFixed(5)}, ${south.toFixed(5)} → ${east.toFixed(5)}, ${north.toFixed(5)}`;
}

function formatArea(sqMeters: number): string {
	const rounded = formatCount(Math.round(sqMeters));
	return sqMeters >= 10_000 ? `${(sqMeters / 10_000).toFixed(2)} ha (${rounded} m²)` : `${rounded} m²`;
}

export function PackageUpload() {
	const baseUrl = apiBaseUrl();
	const projectId = resolveProjectId(PROJECT.id);
	const fieldId = useId();

	const [site, setSite] = useState("sample-garden");
	const [formVersion, setFormVersion] = useState(PUBLISHED_VERSION.code);
	const [slots, setSlots] = useState<Record<LayerName, LayerSlotState>>(EMPTY_SLOTS);
	const [projectSlot, setProjectSlot] = useState<ProjectSlotState>({ kind: "empty" });
	const [unassigned, setUnassigned] = useState<readonly UnassignedFile[]>([]);
	const [token, setToken] = useState("");
	const [busy, setBusy] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [result, setResult] = useState<PackageDetail | null>(null);

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

	/** A whole drop or a whole file-picker selection at once: auto-place what a name confidently matches. */
	function ingestFiles(incoming: File[]) {
		if (incoming.length === 0) return;
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

	function removeUnassigned(id: string) {
		setUnassigned(current => current.filter(entry => entry.id !== id));
	}

	function assignUnassigned(id: string, target: SlotTarget) {
		const entry = unassigned.find(item => item.id === id);
		if (entry === undefined) return;
		setUnassigned(current => current.filter(item => item.id !== id));
		if (target === "project") setProjectSlot({ kind: "ready", file: entry.file });
		else void assignLayer(target, entry.file);
	}

	const requiredReady = REQUIRED_LAYERS.every(name => slots[name].kind === "ready");
	const missing = REQUIRED_LAYERS.filter(name => slots[name].kind !== "ready");
	const ready = requiredReady && site.trim() !== "" && formVersion.trim() !== "";

	const clientChecks = useMemo(() => runClientChecks(slots), [slots]);

	const overallBbox = useMemo(() => {
		const boxes: BBox[] = [];
		for (const name of LAYER_NAMES) {
			const slot = slots[name];
			if (slot.kind === "ready" && slot.analysis.bbox !== null) boxes.push(slot.analysis.bbox);
		}
		return boxes.length === 0 ? null : boxes.reduce((a, b) => unionBbox(a, b));
	}, [slots]);

	const groundSlot = slots.ground;
	const groundAreaSqMeters = groundSlot.kind === "ready" ? approximateAreaSqMeters(groundSlot.collection) : null;
	const hasAnyLayer = LAYER_NAMES.some(name => slots[name].kind === "ready");

	async function build(): Promise<PackageSubmission> {
		const collected: PackageSubmission["layers"] = {};
		for (const name of LAYER_NAMES) {
			const slot = slots[name];
			if (slot.kind === "ready") collected[name] = slot.collection;
		}
		return {
			site_code: site,
			form_version: formVersion,
			layers: collected,
			...(projectSlot.kind === "ready" ? { project_file: await readProjectFile(projectSlot.file) } : {})
		};
	}

	async function prepare() {
		setBusy(true);
		setError(null);
		setResult(null);
		try {
			const submission = await build();
			if (baseUrl === null) {
				// No API is configured for this deployment. Rather than pretend, hand the manager
				// the exact document the endpoint takes so the upload can be done by hand.
				const url = URL.createObjectURL(
					new Blob([JSON.stringify(submission, null, 2)], { type: "application/json" })
				);
				const anchor = document.createElement("a");
				anchor.href = url;
				anchor.download = `${site}-package-submission.json`;
				anchor.click();
				window.setTimeout(() => URL.revokeObjectURL(url), 30_000);
				setError(
					"No API is configured for this deployment, so nothing was uploaded. The submission this screen " +
						"would have sent has been downloaded instead."
				);
				return;
			}
			setResult(await submitPackage(baseUrl, projectId.id, token, submission));
		} catch (raised) {
			setError(raised instanceof LayerReadError ? raised.message : "The upload could not be completed.");
		} finally {
			setBusy(false);
		}
	}

	return (
		<section className="max-w-[70ch]">
			<SectionLabel>Prepare a package</SectionLabel>
			<h2 className="mt-tight mb-base text-heading text-text">From a QGIS export to a downloadable package</h2>
			<p className="mb-base text-micro text-neutral-600" translate="no">
				Project {projectId.id}
				{!projectId.valid &&
					" — this isn't shaped like a UUID. Set NEXT_PUBLIC_FIELDMAPS_PROJECT_ID to the one staging uses, or the server will refuse the upload."}
			</p>

			<div className="grid grid-cols-1 gap-base sm:grid-cols-2">
				<label className="block">
					<span className="mb-hair block text-micro text-neutral-500">Site code</span>
					<Input
						value={site}
						name="site-code"
						autoComplete="off"
						spellCheck={false}
						onChange={event => setSite(event.target.value)}
					/>
					<span className="mt-hair block text-micro text-neutral-600">Site lists arrive with WEB-08.</span>
				</label>
				<label className="block">
					<span className="mb-hair block text-micro text-neutral-500">Form version</span>
					<Input
						value={formVersion}
						name="form-version"
						autoComplete="off"
						spellCheck={false}
						onChange={event => setFormVersion(event.target.value)}
					/>
				</label>
			</div>

			<div className="mt-loose">
				<SectionLabel>Layers</SectionLabel>
				<div className="mt-tight">
					<LayerDropZone
						fieldId={fieldId}
						slots={slots}
						projectSlot={projectSlot}
						unassigned={unassigned}
						onFiles={ingestFiles}
						onReplace={(name, file) => void assignLayer(name, file)}
						onRemove={name => setSlots(current => ({ ...current, [name]: { kind: "empty" } }))}
						onReplaceProject={file => setProjectSlot({ kind: "ready", file })}
						onRemoveProject={() => setProjectSlot({ kind: "empty" })}
						onAssignUnassigned={assignUnassigned}
						onRemoveUnassigned={removeUnassigned}
					/>
				</div>
				<Prose tone="faint" className="mt-snug text-micro">
					Ground and zones are required. The <span className="text-neutral-400">.qgz</span> is optional, and
					it is what makes the source and licence checks possible — without it they are recorded as skipped
					rather than passed. For a real export to try this with:{" "}
					<span className="text-neutral-400" translate="no">
						mobile/src/maps/sites/fall-creek/surfaces.json
					</span>{" "}
					and{" "}
					<span className="text-neutral-400" translate="no">
						trees.json
					</span>{" "}
					are the Fall Creek Elementary playground package. They won’t sail straight through, though —
					surfaces mixes several kinds in one file and the trees there are canopy polygons, not points, so
					dropping them here is a good way to see the geometry checks below catch something real.
				</Prose>
			</div>

			{hasAnyLayer && (
				<div className="mt-loose">
					<SectionLabel>Preview</SectionLabel>
					<div className="mt-tight h-72 w-full overflow-hidden rounded-md border border-rule">
						<LayerPreviewMap
							ground={groundSlot.kind === "ready" ? groundSlot.collection : undefined}
							zones={slots.zones.kind === "ready" ? slots.zones.collection : undefined}
							paths={slots.paths.kind === "ready" ? slots.paths.collection : undefined}
							trees={slots.trees.kind === "ready" ? slots.trees.collection : undefined}
						/>
					</div>
					<div className="mt-tight flex flex-wrap gap-base text-micro text-neutral-500">
						{SLOT_ORDER.map(name => {
							const slot = slots[name];
							return (
								<span key={name}>
									{SLOT_LABELS[name]}:{" "}
									{slot.kind === "ready" ? plural(slot.analysis.featureCount, "feature") : "—"}
								</span>
							);
						})}
					</div>
					{overallBbox !== null && (
						<p className="tnum mt-hair text-micro text-neutral-600">Extent: {formatBbox(overallBbox)}</p>
					)}
					{groundAreaSqMeters !== null && (
						<p className="tnum mt-hair text-micro text-neutral-600">
							Ground area: about {formatArea(groundAreaSqMeters)}
						</p>
					)}
				</div>
			)}

			<div className="mt-loose">
				<SectionLabel>Checked in your browser</SectionLabel>
				{clientChecks.length === 0 ? (
					<Prose tone="faint" className="mt-tight">
						Checks appear once a layer is chosen.
					</Prose>
				) : (
					<ol className="m-0 mt-base list-none p-0">
						{clientChecks.map(check => {
							const badge = PREP_STATES[CHECK_STATE[check.state] ?? "waiting"];
							return (
								<li key={check.id} className="flex gap-snug border-b border-rule-faint py-snug">
									<span
										aria-hidden
										className={`mt-[2px] w-4 shrink-0 text-center text-caption ${
											check.state === "passed" ? "text-accent-400" : "text-attention"
										}`}>
										{badge.glyph}
									</span>
									<span className="min-w-0">
										<span className="block text-detail text-neutral-200">{check.label}</span>
										<span className="block text-micro text-neutral-500">{check.detail}</span>
										<span className="sr-only">{badge.label}</span>
									</span>
								</li>
							);
						})}
					</ol>
				)}
			</div>

			{baseUrl !== null && (
				<label className="mt-loose block">
					<span className="mb-hair block text-micro text-neutral-500">
						Access token — the workspace has no sign-in yet, so a manager’s token is pasted here
					</span>
					<Input
						type="password"
						name="api-token"
						autoComplete="off"
						spellCheck={false}
						value={token}
						onChange={event => setToken(event.target.value)}
						placeholder="eyJhbGciOi…"
					/>
				</label>
			)}

			<div className="mt-loose flex flex-wrap items-center gap-snug">
				<PrimaryAction onClick={() => void prepare()} disabled={!ready || busy}>
					{busy ? "Preparing…" : "Prepare package"}
				</PrimaryAction>
				{missing.length > 0 && (
					<span className="text-micro text-neutral-500">
						Still needs: {missing.map(name => SLOT_LABELS[name]).join(" and ")}
					</span>
				)}
			</div>

			{error !== null && (
				<div className="mt-loose">
					<AttentionNote title="The package was not prepared" body={error} alert />
				</div>
			)}

			{result !== null && (
				<div className="mt-wide" aria-live="polite">
					<SectionLabel>Checked by the server</SectionLabel>
					<div className="mt-tight flex flex-wrap items-baseline gap-snug">
						<h3 className="text-body font-medium text-text">
							{result.site_code} · version {result.version}
						</h3>
						<Chip
							tone={result.state === "ready" ? "accent" : "attention"}
							glyph={result.state === "ready" ? "✓" : "◼"}>
							{result.state === "ready" ? "Ready" : "Blocked"}
						</Chip>
						<span className="tnum text-micro text-neutral-600">
							{Math.round(result.archive_bytes / 1024)} KB
						</span>
					</div>
					<ol className="m-0 mt-base list-none p-0">
						{result.checks.map((check, index) => {
							const badge = PREP_STATES[CHECK_STATE[check.state] ?? "waiting"];
							return (
								<li key={index} className="flex gap-snug border-b border-rule-faint py-snug">
									<span
										aria-hidden
										className={`mt-[2px] w-4 shrink-0 text-center text-caption ${
											check.state === "passed"
												? "text-accent-400"
												: check.state === "skipped"
													? "text-neutral-600"
													: "text-attention"
										}`}>
										{badge.glyph}
									</span>
									<span className="min-w-0">
										<span className="block text-detail text-neutral-200">{check.step}</span>
										<span className="block text-micro text-neutral-500">{check.detail}</span>
										<span className="sr-only">{badge.label}</span>
									</span>
								</li>
							);
						})}
					</ol>
					{result.state === "blocked" && (
						<Prose tone="faint" className="mt-base text-micro">
							The package is kept with its reasons and cannot be downloaded. Fix what blocked it and
							prepare the next version.
						</Prose>
					)}
				</div>
			)}

			{baseUrl === null && (
				<div className="mt-wide">
					<AttentionNote
						title="This deployment is not pointed at an API"
						body="Set NEXT_PUBLIC_FIELDMAPS_API_URL to the API this workspace should prepare packages through. Until then the button assembles the submission and downloads it rather than claiming an upload that did not happen."
					/>
				</div>
			)}
		</section>
	);
}
