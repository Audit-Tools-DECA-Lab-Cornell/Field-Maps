"use client";

import { useId, useState } from "react";

import { Button, ButtonLink } from "@/components/contour/Button";
import { FactsList } from "@/components/contour/FactsList";
import { Field } from "@/components/contour/Field";
import { Island, IslandSection } from "@/components/contour/Island";
import { PageHeader } from "@/components/contour/PageHeader";
import { ProposalNote } from "@/components/contour/ProposalNote";
import { Select } from "@/components/contour/Select";
import { StateBadge } from "@/components/contour/StateBadge";
import { Table, TBody, Td, Th, THead, Tr } from "@/components/contour/Table";
import { TextLink } from "@/components/contour/TextLink";
import { ExportDialog } from "@/features/data/ExportDialog";
import type { MarkerPosition } from "@/features/data/markers";
import { useReviews } from "@/features/data/review";
import { activeRow, packageRows, sizeLabel } from "@/features/packages/model";
import { packagesStore } from "@/features/packages/store";
import { type PublicationScope, SCOPE_LABEL, useProjectSettings } from "@/features/project-settings/store";
import { projectHref } from "@/features/shell/navigation";
import { usePreview } from "@/features/shell/PreviewProvider";
import { PreviewStateView } from "@/features/shell/PreviewStateView";
import { useSessionStore } from "@/features/shell/useSessionStore";
import { StackedRows } from "@/features/team/StackedRows";
import {
	CODEBOOK,
	DEVICE_REPORTS,
	FIELD_TYPES,
	observationsFor,
	PROJECT_MEMBERSHIPS,
	type Site,
	sitesIn,
	SNAPSHOT_LABEL
} from "@/fixtures";

import { Eyebrow, FlowChips } from "./parts";
import { ReaderGrantsIsland } from "./ReaderGrantsIsland";

export type QgisScreenProps = {
	org: string;
	project: string;
	projectName: string;
	/** Each observation's place, for the export's coordinates. */
	positions: Record<string, MarkerPosition>;
	fileStem: string;
};

const STEPS = [
	{ title: "Upload", detail: "One QGIS export for one site." },
	{ title: "Inspect", detail: "Geometry, zones, form fit, offline assets." },
	{ title: "Activate", detail: "New sessions use it. Running sessions keep theirs." },
	{ title: "Verify on devices", detail: "Each device downloads it and confirms it." }
] as const;

/** Why Export is off in a previewed screen state, if it is. */
const STATE_REASON: Partial<Record<string, string>> = {
	loading: "The records are still loading.",
	error: "The records did not load. Try again first.",
	empty: "There are no accepted observations to export yet.",
	"no-access": "Your role cannot export this project."
};

/**
 * QGIS (project-05): the two directions between QGIS and FieldMaps. Map packages come in per site; accepted
 * observations go out as a typed, read-only layer whose scope this page previews. The export is the same
 * dialog and writer as Data's.
 */
export function QgisScreen({ org, project, projectName, positions, fileStem }: QgisScreenProps) {
	const { screenState, can } = usePreview();
	const { settings } = useProjectSettings(org, project);
	const reviews = useReviews();
	// The saved publishing mode until the reader picks one here; the store is read after hydration.
	const [chosen, setScope] = useState<PublicationScope | null>(null);
	const scope = chosen ?? settings.publicationScope;
	const [exportOpen, setExportOpen] = useState(false);
	const records = observationsFor(project);
	const approved = records.filter(record => reviews.reviewOf(record) === "approved");
	const visible = scope === "approved" ? approved : records;
	const exportReason = !can("export") ? "Your role cannot export this project." : STATE_REASON[screenState];

	return (
		<div className="flex flex-col gap-6">
			<PageHeader
				title="QGIS · maps in, evidence out"
				lead="Two directions. One set of versioned research records."
				actions={
					<Button
						icon="download"
						disabled={Boolean(exportReason)}
						disabledReason={exportReason}
						onClick={() => setExportOpen(true)}>
						Export current scope
					</Button>
				}
			/>
			<div className="grid gap-6 lg:grid-cols-2 lg:items-stretch">
				<InboundIsland org={org} project={project} />
				<OutboundIsland
					org={org}
					project={project}
					scope={scope}
					onScopeChange={setScope}
					total={records.length}
					approved={approved.length}
					formVersions={[...new Set(records.map(record => record.formVersion))]}
				/>
			</div>
			<ReaderGrantsIsland project={project} projectName={projectName} />
			<CodebookIsland />
			<ExportDialog
				open={exportOpen}
				onOpenChange={setExportOpen}
				records={visible}
				positions={positions}
				scope={`${visible.length} ${visible.length === 1 ? "observation" : "observations"} · ${scope === "approved" ? "approved only (proposal U5)" : "every accepted observation"} · all zones · all rounds`}
				fileStem={fileStem}
			/>
		</div>
	);
}

function InboundIsland({ org, project }: { org: string; project: string }) {
	const packages = useSessionStore(packagesStore);
	const sites = sitesIn(project);
	const observers = PROJECT_MEMBERSHIPS.filter(entry => entry.projectSlug === project && entry.collectsAs).length;
	const inspectSite = sites.find(site => !site.training && site.zoneSlugs.length > 0) ?? sites[0];
	const base = projectHref(org, project, "sites");

	function devicesFor(site: Site, bundled: boolean): string {
		if (bundled) return "Ships with the app";
		const reporting = DEVICE_REPORTS.filter(
			report => report.siteSlug === site.slug && report.mapPackage.state === "downloaded"
		).length;
		return reporting === 0 ? "None yet" : `${reporting} of ${observers} observers`;
	}

	return (
		<Island flush aria-label="Inbound map packages" className="relative flex flex-col">
			<IslandSection className="flex flex-col gap-3 pt-6 pb-5">
				<Eyebrow>Inbound · map packages</Eyebrow>
				<h2 className="type-section text-ink">Prepare the field map.</h2>
				<p className="type-body text-ink-2">
					Upload a package to its site, inspect the checks, activate a version, then verify downloads on
					devices.
				</p>
				<FlowChips
					label="Map packages travel from QGIS to the site package to the collector"
					steps={["QGIS", "Site package", "Collector"]}
					className="mt-1"
				/>
			</IslandSection>
			<PreviewStateView
				loadingLabel="Loading map packages…"
				rows={3}
				headingLevel={3}
				empty={{
					title: "No map package yet",
					body: "No site in this project has a map. Upload a QGIS package to give observers something to collect on.",
					actions: (
						<ButtonLink href={base} variant="outline" icon="map">
							Open sites
						</ButtonLink>
					)
				}}>
				<div className="hidden border-t border-rule sm:block">
					<Table caption="Active map package per site">
						<THead>
							<tr>
								<Th>Site</Th>
								<Th>Active</Th>
								<Th>Size</Th>
								<Th>Devices reporting it</Th>
							</tr>
						</THead>
						<TBody>
							{sites.map(site => {
								const active = activeRow(packageRows(site.slug, packages[site.slug] ?? {}));
								const bundled = active?.state === "bundled";
								return (
									<Tr key={site.slug}>
										<Td>
											{site.training ? (
												site.name
											) : (
												<TextLink tone="ink" href={`${base}/${site.slug}/packages`}>
													{site.name}
												</TextLink>
											)}
										</Td>
										<Td nowrap>
											{bundled ? (
												"Bundled"
											) : active ? (
												<span className="inline-flex items-baseline gap-3">
													<span className="type-mono-data">{active.version}</span>
													<StateBadge kind="package" state="active" size="sm" />
												</span>
											) : (
												<span className="text-ink-2">No package yet</span>
											)}
										</Td>
										<Td mono nowrap>
											{(active && sizeLabel(active)) ?? "n/a"}
										</Td>
										<Td>{devicesFor(site, bundled)}</Td>
									</Tr>
								);
							})}
						</TBody>
					</Table>
				</div>
				<StackedRows
					label="Active map package per site"
					rows={sites.map(site => {
						const active = activeRow(packageRows(site.slug, packages[site.slug] ?? {}));
						const bundled = active?.state === "bundled";
						return {
							key: site.slug,
							title: site.training ? (
								<span className="font-semibold text-ink">{site.name}</span>
							) : (
								<TextLink tone="ink" href={`${base}/${site.slug}/packages`}>
									{site.name}
								</TextLink>
							),
							fields: [
								{
									label: "Active",
									value: bundled ? (
										"Bundled"
									) : active ? (
										<span className="inline-flex items-baseline gap-3">
											<span className="type-mono-data">{active.version}</span>
											<StateBadge kind="package" state="active" size="sm" />
										</span>
									) : (
										"No package yet"
									)
								},
								{ label: "Size", value: (active && sizeLabel(active)) ?? "n/a", mono: true },
								{ label: "Devices reporting it", value: devicesFor(site, bundled) }
							]
						};
					})}
				/>
				<IslandSection rule className="flex flex-col gap-5 pt-5 pb-6">
					<ol className="grid gap-x-6 gap-y-4 sm:grid-cols-2">
						{STEPS.map((step, index) => (
							<li key={step.title} className="grid grid-cols-[1.25rem_minmax(0,1fr)] gap-x-1">
								<span className="type-mono-data font-semibold text-ink">{index + 1}</span>
								<span className="min-w-0">
									<span className="block font-semibold text-ink">{step.title}</span>
									<span className="block type-small text-ink-2">{step.detail}</span>
								</span>
							</li>
						))}
					</ol>
					{inspectSite && (
						<ButtonLink
							href={`${base}/${inspectSite.slug}/packages?step=inspect`}
							variant="outline"
							icon="layers"
							fullWidth>
							Inspect {inspectSite.name} packages
						</ButtonLink>
					)}
				</IslandSection>
			</PreviewStateView>
		</Island>
	);
}

function OutboundIsland({
	org,
	project,
	scope,
	onScopeChange,
	total,
	approved,
	formVersions
}: {
	org: string;
	project: string;
	scope: PublicationScope;
	onScopeChange: (scope: PublicationScope) => void;
	total: number;
	approved: number;
	formVersions: string[];
}) {
	const id = useId();
	const visible = scope === "approved" ? approved : total;
	const hint =
		scope === "approved"
			? `Approved only shows ${approved} of ${total} accepted records. Review the other ${total - approved} to include them.`
			: `With “Approved only”, ${approved} of ${total} records would be visible.`;

	return (
		<Island flush aria-label="Outbound analyst layers" className="flex flex-col">
			<IslandSection className="flex flex-col gap-3 pt-6 pb-5">
				<Eyebrow>Outbound · analyst layers</Eyebrow>
				<PreviewStateView
					loadingLabel="Counting visible records…"
					rows={2}
					headingLevel={3}
					empty={{
						icon: "inbox",
						title: "No accepted observations yet",
						body: "Records appear in the analyst layer once they are uploaded and accepted. Records on devices are never in it."
					}}>
					<div className="flex flex-col gap-3">
						<h2 className="type-section text-ink" aria-live="polite">
							{visible} {visible === 1 ? "record" : "records"} visible.
						</h2>
						<p className="type-body text-ink-2">
							QGIS refreshes a typed, read-only layer. There is no “send to QGIS” step.
						</p>
						<FlowChips
							label="Accepted observations become a read-only layer that QGIS reads"
							steps={["Accepted observations", "Read-only layer", "QGIS"]}
							className="mt-1"
						/>
						<Field label="Publication scope" htmlFor={`${id}-scope`} hint={hint} className="mt-4">
							<Select
								value={scope}
								onChange={event => onScopeChange(event.target.value as PublicationScope)}>
								<option value="accepted">{SCOPE_LABEL.accepted}</option>
								<option value="approved">{SCOPE_LABEL.approved}</option>
							</Select>
						</Field>
					</div>
				</PreviewStateView>
			</IslandSection>
			<IslandSection rule className="flex flex-1 flex-col gap-5 pt-5 pb-6">
				<FactsList
					labelWidth="minmax(7rem, 26%)"
					items={[
						{ label: "Form version", value: formVersions.join(" · ") || "None yet", mono: true },
						{ label: "Field types", value: FIELD_TYPES },
						{ label: "Freshness", value: `Snapshot ${SNAPSHOT_LABEL}` },
						{ label: "Device records", value: "Records still on devices are not in the server scope" }
					]}
				/>
				<ProposalNote code="U5">
					The Approved-only gate is optional and not decided. Every accepted observation stays the default.
				</ProposalNote>
				<ButtonLink
					href={`${projectHref(org, project, "data")}?review=notReviewed`}
					variant="outline"
					icon="eye"
					fullWidth
					className="mt-auto">
					Review records
				</ButtonLink>
			</IslandSection>
		</Island>
	);
}

function CodebookIsland() {
	return (
		<Island flush className="relative" title="Field definitions" meta="Shipped with every export as the codebook">
			<Table caption="Field definitions">
				<THead>
					<tr>
						<Th>Column</Th>
						<Th>Type</Th>
						<Th>Meaning</Th>
					</tr>
				</THead>
				<TBody>
					{CODEBOOK.map(field => (
						<Tr key={field.column}>
							<Td mono>{field.column}</Td>
							<Td mono>{field.type}</Td>
							<Td>{field.meaning}</Td>
						</Tr>
					))}
				</TBody>
			</Table>
		</Island>
	);
}
