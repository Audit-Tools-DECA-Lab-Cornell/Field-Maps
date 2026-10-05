"use client";

import { useRouter } from "next/navigation";

import { Button, ButtonLink } from "@/components/contour/Button";
import { Dialog, DialogClose } from "@/components/contour/Dialog";
import { FactsList } from "@/components/contour/FactsList";
import { Island, IslandSection } from "@/components/contour/Island";
import { Note } from "@/components/contour/Note";
import { PageHeader } from "@/components/contour/PageHeader";
import { ScreenState } from "@/components/contour/ScreenState";
import { StateBadge } from "@/components/contour/StateBadge";
import { StepBar } from "@/components/contour/StepBar";
import { TextLink } from "@/components/contour/TextLink";
import { useToast } from "@/components/contour/Toast";
import { projectHref } from "@/features/shell/navigation";
import { usePreview } from "@/features/shell/PreviewProvider";
import { PreviewStateView } from "@/features/shell/PreviewStateView";
import { DeviceReadiness } from "@/features/sites/DeviceReadiness";
import { MapArea } from "@/features/sites/parts";
import type { ProjectedSite } from "@/lib/plan";

import { withRings } from "./geometry";
import {
	activeRow,
	inspectingRow,
	PACKAGE_STEPS,
	type PackageRow,
	packageRows,
	type PackageStep,
	progressStep,
	sizeLabel
} from "./model";
import { packagesStore, type SitePackagePreview, updateSitePackages, useSitePackagePreview } from "./store";
import { UploadStep } from "./UploadStep";
import { VersionHistory } from "./VersionHistory";

/**
 * A site's map packages (project-10): QGIS → upload → inspect → activate → download, one step at a time
 * with the step in `?step=`, so Back works. Upload is the real upload to the FieldMaps API; inspecting and
 * activating are preview changes kept in this tab, which reset when it closes.
 */

const STEP_LABEL: Record<PackageStep, string> = {
	upload: "Upload",
	inspect: "Inspect",
	activate: "Activate",
	download: "Download"
};

export type PackagesScreenProps = {
	org: string;
	project: string;
	site: { slug: string; name: string };
	/** The site's plan, for the preview map. Null for a site made in this preview, which has no map yet. */
	plan: ProjectedSite | null;
	/** `?step=` when it names a step. */
	step: PackageStep | undefined;
};

export function PackagesScreen({ org, project, site, plan, step: requested }: PackagesScreenProps) {
	const preview = useSitePackagePreview(site.slug);
	const rows = packageRows(site.slug, preview);
	const progress = progressStep(rows);
	const step = requested ?? (rows.length === 0 ? "upload" : progress);
	const sitesHref = projectHref(org, project, "sites");
	const base = `${sitesHref}/${site.slug}/packages`;
	const href = (key: PackageStep) => `${base}?step=${key}`;

	const progressIndex = PACKAGE_STEPS.indexOf(progress);
	const done = new Set<PackageStep>(rows.length === 0 ? [] : PACKAGE_STEPS.slice(0, progressIndex));
	if (step === "activate") done.add("inspect");
	done.delete(step);

	const focus =
		inspectingRow(rows) ?? (preview.activated ? rows.find(row => row.version === preview.activated) : undefined);

	return (
		<div className="flex flex-col gap-6">
			<PageHeader
				breadcrumbs={[
					{ label: "Sites", href: sitesHref },
					{ label: site.name, href: `${sitesHref}/${site.slug}` },
					{ label: "Map packages" }
				]}
				title={`${site.name} map packages`}
				lead="QGIS → upload → inspect → activate → download."
				actions={
					step === "upload" ? undefined : (
						<ButtonLink href={href("upload")} variant="outline" icon="upload">
							Upload package
						</ButtonLink>
					)
				}
			/>
			<StepBar
				label="Map package steps"
				current={step}
				done={[...done]}
				steps={PACKAGE_STEPS.map(key => ({ key, label: STEP_LABEL[key], href: href(key) }))}
			/>

			{step === "upload" ? (
				<UploadStep siteName={site.name} />
			) : step === "download" ? (
				<DownloadStep siteSlug={site.slug} rows={rows} inspectHref={href("inspect")} />
			) : (
				<InspectStep
					site={site}
					plan={plan}
					rows={rows}
					preview={preview}
					confirming={step === "activate"}
					href={href}
				/>
			)}

			<VersionHistory
				rows={rows}
				selected={focus?.version ?? null}
				uploadHref={step === "upload" ? null : href("upload")}
			/>
		</div>
	);
}

function InspectStep({
	site,
	plan,
	rows,
	preview,
	confirming,
	href
}: {
	site: { slug: string; name: string };
	plan: ProjectedSite | null;
	rows: PackageRow[];
	preview: SitePackagePreview;
	confirming: boolean;
	href: (step: PackageStep) => string;
}) {
	const router = useRouter();
	const toast = useToast();
	const { can, offline } = usePreview();
	const waiting = inspectingRow(rows);
	const activated = preview.activated ? rows.find(row => row.version === preview.activated) : undefined;
	const row = waiting ?? activated;
	const current = activeRow(rows);

	if (!row)
		return (
			<Island flush title="Package inspection">
				<ScreenState
					kind="empty"
					icon="layers"
					title="No package waiting for inspection"
					body={`Upload a QGIS package to inspect it here. ${current ? `${current.version} stays active until you activate another version.` : "The site has no active map yet."}`}
				/>
			</Island>
		);

	const isActive = row.state === "active";
	const replaced = row.base ?? current?.version ?? "the active version";
	const failing = (row.checks ?? []).some(check => check.state === "fails");
	const reason = !can("uploadPackage")
		? "Only project managers can activate a map package."
		: offline
			? `You are offline. ${row.version} can be activated once the connection returns.`
			: failing
				? "A check fails. Fix the package in QGIS and upload it again."
				: null;

	function activate() {
		if (!row) return;
		const before = packagesStore.get()[site.slug] ?? {};
		updateSitePackages(site.slug, current => ({
			...current,
			activated: row.version,
			...(current.draft?.version === row.version ? { activatedZones: current.draft.zones } : {})
		}));
		router.replace(href("download"));
		toast({
			title: `${row.version} is active. Devices download it the next time they are online.`,
			action: {
				label: "Undo",
				onClick: () => {
					packagesStore.set(all => ({ ...all, [site.slug]: before }));
					router.replace(href("inspect"));
				}
			}
		});
	}

	const shownPlan = plan ? withRings(plan, row.draftZones) : null;
	const hatched = Object.fromEntries(row.changedZones.map(id => [id, { hatched: true, emphasis: "focus" as const }]));
	const facts = [
		...(row.file ? [{ label: "File", value: row.file, mono: !row.fromPreview || row.file.endsWith(".zip") }] : []),
		...(sizeLabel(row) ? [{ label: "Size", value: sizeLabel(row), mono: true }] : []),
		...(row.coordinateSystem ? [{ label: "Coordinate system", value: row.coordinateSystem, mono: true }] : []),
		...(row.layers ? [{ label: "Layers", value: row.layers }] : []),
		...(row.extent ? [{ label: "Extent", value: row.extent }] : [])
	];

	return (
		<div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
			{shownPlan ? (
				<figure className="flex min-w-0 flex-col gap-3">
					<MapArea
						site={shownPlan}
						mapVersion={row.version}
						title={`${row.file ?? row.version} · preview`}
						subtitle={
							row.changedZones.length > 0
								? `Hatched: boundary changed since ${replaced}`
								: `No boundary changed since ${replaced}`
						}
						zones={hatched}
					/>
					<figcaption className="px-2 type-small text-ink-2">
						{isActive
							? `${row.version} is active. Sessions already running keep ${replaced} until they end.`
							: "A preview of the uploaded package. Nothing on devices changes until you activate it."}
					</figcaption>
				</figure>
			) : (
				<div />
			)}

			<Island
				flush
				divided
				title="Package inspection"
				meta={<StateBadge kind="package" state={isActive ? "active" : "notActive"} />}>
				<PreviewStateView loadingLabel="Loading the inspection…" rows={5}>
					<IslandSection className="pt-4 pb-5">
						<FactsList items={facts} labelWidth="10.5rem" />
					</IslandSection>
					<ul aria-label="Checks" className="border-t border-rule">
						{(row.checks ?? []).map(check => (
							<li
								key={check.label}
								className="flex items-center justify-between gap-4 border-b border-rule px-island-pad py-3.5">
								<span className="min-w-0">
									<span className="block type-body font-semibold text-ink">{check.label}</span>
									<span className="block type-small text-ink-2">{check.detail}</span>
								</span>
								<StateBadge kind="check" state={check.state} size="sm" />
							</li>
						))}
					</ul>
					<IslandSection className="flex flex-col gap-4 pt-5 pb-island-pad">
						{isActive ? (
							<>
								<Note tone="saved">
									{row.version} is active in this preview. Each device downloads it the next time it
									is online, then verifies it.
								</Note>
								<TextLink href={href("download")}>See device readiness</TextLink>
							</>
						) : (
							<>
								<Note>
									Sessions already running keep {replaced} until they end. Each device downloads{" "}
									{row.version} the next time it is online, then verifies it.
								</Note>
								<Button
									icon="check"
									fullWidth
									disabled={reason !== null}
									disabledReason={reason ?? undefined}
									onClick={() => router.push(href("activate"))}>
									Activate {row.version}
								</Button>
							</>
						)}
					</IslandSection>
				</PreviewStateView>
			</Island>

			<Dialog
				open={confirming && !isActive && reason === null}
				onOpenChange={open => {
					if (!open) router.replace(href("inspect"));
				}}
				title={`Activate ${row.version}?`}
				description={`New sessions use ${row.version} once devices have downloaded it. Sessions in progress keep ${replaced}.`}
				footer={
					<>
						<DialogClose asChild>
							<Button variant="outline">Keep {replaced} active</Button>
						</DialogClose>
						<Button icon="check" onClick={activate}>
							Activate {row.version}
						</Button>
					</>
				}
			/>
		</div>
	);
}

function DownloadStep({ siteSlug, rows, inspectHref }: { siteSlug: string; rows: PackageRow[]; inspectHref: string }) {
	const waiting = inspectingRow(rows);
	const fresh = rows.find(row => row.state === "active" && row.fromPreview);
	const offered = fresh ?? waiting;

	if (!offered) {
		const current = activeRow(rows);
		return (
			<div className="flex flex-col gap-4">
				{current && current.state !== "bundled" && (
					<Note>
						{current.version} is the active map. Each device downloads it the next time it is online; the
						roster below shows only what each device last reported.
					</Note>
				)}
				<DeviceReadiness siteSlug={siteSlug} />
			</div>
		);
	}

	const offeredNow = offered.state === "active";
	return (
		<div className="flex flex-col gap-4">
			{offeredNow ? (
				<Note tone="waiting" title="Waiting for devices.">
					Each device downloads {offered.version} the next time it is online, then verifies it. Until a device
					reports back, its state stays as last reported.
				</Note>
			) : (
				<Note tone="waiting" title={`${offered.version} is not active yet, so no device is offered it.`}>
					Activate it on the{" "}
					<TextLink href={inspectHref} tone="ink">
						Inspect step
					</TextLink>{" "}
					first.
				</Note>
			)}
			<DeviceReadiness
				siteSlug={siteSlug}
				title={`Device readiness for ${offered.version}, as last reported`}
				extra={{
					label: offered.version,
					cell: () =>
						offeredNow ? (
							<StateBadge kind="readiness" state="waiting" label="Waiting for this device" />
						) : (
							<StateBadge kind="readiness" state="notDownloaded" label="Not offered yet" />
						)
				}}
				footnote={`An offline device cannot report its current state. A device shows ${offered.version} only after it has downloaded and verified it and reported back; this roster shows only each device’s last report.`}
			/>
		</div>
	);
}
