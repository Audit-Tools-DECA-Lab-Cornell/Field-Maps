"use client";

import { useId, useState } from "react";

import { AttentionNote, Chip, Input, PrimaryAction, Prose, SectionLabel } from "@/components/nocturne/chrome";
import { PUBLISHED_VERSION } from "@/data/instrument";
import { PROJECT, SITES } from "@/data/project";
import {
	apiBaseUrl,
	LAYER_NAMES,
	type LayerName,
	LayerReadError,
	type PackageDetail,
	type PackageSubmission,
	readLayer,
	readProjectFile,
	REQUIRED_LAYERS,
	submitPackage
} from "@/lib/packages";
import { PREP_STATES } from "@/lib/states";
import type { PrepState } from "@/types/domain";

/**
 * Preparing a package from what QGIS wrote.
 *
 * The files are read here and sent as one JSON document, but nothing is decided here: the server
 * runs the five checks and this screen reports what came back, blocking reasons included. A
 * package that fails is still recorded, because the reason is the useful part.
 */

const CHECK_STATE: Record<string, PrepState> = {
	passed: "done",
	warning: "warning",
	blocked: "blocked",
	skipped: "waiting"
};

type Chosen = Partial<Record<LayerName, File>>;

export function PackageUpload() {
	const baseUrl = apiBaseUrl();
	const fieldId = useId();
	const [site, setSite] = useState(SITES[0]?.code ?? "");
	const [formVersion, setFormVersion] = useState(PUBLISHED_VERSION.code);
	const [layers, setLayers] = useState<Chosen>({});
	const [project, setProject] = useState<File | null>(null);
	const [token, setToken] = useState("");
	const [busy, setBusy] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [result, setResult] = useState<PackageDetail | null>(null);

	const missing = REQUIRED_LAYERS.filter(name => layers[name] === undefined);
	const ready = missing.length === 0 && site !== "" && formVersion !== "";

	async function build(): Promise<PackageSubmission> {
		const collected: PackageSubmission["layers"] = {};
		for (const name of LAYER_NAMES) {
			const file = layers[name];
			if (file !== undefined) collected[name] = await readLayer(file);
		}
		return {
			site_code: site,
			form_version: formVersion,
			layers: collected,
			...(project === null ? {} : { project_file: await readProjectFile(project) })
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
			setResult(await submitPackage(baseUrl, PROJECT.id, token, submission));
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

			<div className="grid grid-cols-1 gap-base sm:grid-cols-2">
				<label className="block">
					<span className="mb-hair block text-micro text-neutral-500">Site</span>
					<select
						value={site}
						onChange={event => setSite(event.target.value)}
						className="min-h-9 w-full rounded-md border border-rule bg-raised px-snug py-tight text-detail text-text">
						{SITES.map(entry => (
							<option key={entry.id} value={entry.code}>
								{entry.name} ({entry.code})
							</option>
						))}
					</select>
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

			<div className="mt-loose flex flex-col gap-tight">
				{LAYER_NAMES.map(name => (
					<label
						key={name}
						className="flex flex-wrap items-center gap-snug border-b border-rule-faint py-snug">
						<span className="w-24 shrink-0 text-detail text-neutral-300">
							{name}
							{REQUIRED_LAYERS.includes(name) && <span className="text-attention-text"> ·</span>}
						</span>
						<input
							id={`${fieldId}-${name}`}
							type="file"
							accept=".json,.geojson,application/json,application/geo+json"
							onChange={event => setLayers(current => ({ ...current, [name]: event.target.files?.[0] }))}
							className="min-w-0 flex-1 text-micro text-neutral-500 file:mr-snug file:min-h-8 file:rounded-md file:border file:border-rule file:bg-transparent file:px-snug file:text-micro file:text-neutral-300"
						/>
					</label>
				))}
				<label className="flex flex-wrap items-center gap-snug border-b border-rule-faint py-snug">
					<span className="w-24 shrink-0 text-detail text-neutral-300">project</span>
					<input
						type="file"
						accept=".qgz,.qgs"
						onChange={event => setProject(event.target.files?.[0] ?? null)}
						className="min-w-0 flex-1 text-micro text-neutral-500 file:mr-snug file:min-h-8 file:rounded-md file:border file:border-rule file:bg-transparent file:px-snug file:text-micro file:text-neutral-300"
					/>
				</label>
			</div>

			<Prose tone="faint" className="mt-snug text-micro">
				Ground and zones are required. The <span className="text-neutral-400">.qgz</span> is optional, and it is
				what makes the source and licence checks possible — without it they are recorded as skipped rather than
				passed.
			</Prose>

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
					<span className="text-micro text-neutral-500">Still needs: {missing.join(" and ")}</span>
				)}
			</div>

			{error !== null && (
				<div className="mt-loose">
					<AttentionNote title="The package was not prepared" body={error} alert />
				</div>
			)}

			{result !== null && (
				<div className="mt-wide" aria-live="polite">
					<div className="flex flex-wrap items-baseline gap-snug">
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
