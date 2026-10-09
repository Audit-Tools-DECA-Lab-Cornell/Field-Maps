"use client";

import { useRouter } from "next/navigation";
import { useMemo, useOptimistic, useRef, useState, useTransition } from "react";

import { Button, ButtonLink } from "@/components/contour/Button";
import { Island } from "@/components/contour/Island";
import { Note } from "@/components/contour/Note";
import { PageHeader } from "@/components/contour/PageHeader";
import { ScreenState } from "@/components/contour/ScreenState";
import { TextLink } from "@/components/contour/TextLink";
import { useToast } from "@/components/contour/Toast";
import { MapFrame } from "@/components/map/MapFrame";
import type { PlanObservation, ZonePlanStyle } from "@/components/map/SitePlan";
import { projectHref } from "@/features/shell/navigation";
import type { ObservationRow, RawDefinition } from "@/lib/api/types";
import { formatCount, plural } from "@/lib/labels";
import type { ProjectedSite } from "@/lib/plan";
import { clock as makeClock } from "@/lib/time";

import { DataTable } from "./DataTable";
import { ExportObservations } from "./ExportObservations";
import { FilterBar } from "./FilterBar";
import {
	applyFilters,
	type ClientFilters,
	type DataRecord,
	EMPTY_CLIENT_FILTERS,
	EMPTY_SCOPE,
	exactTotal,
	filterOptions,
	hasClientFilters,
	NO_ZONE_KEY,
	prepareRecords,
	type ServerScope,
	type SiteZones,
	viewQuery
} from "./view";

export type DataSite = SiteZones & {
	/** The exact number of observations at the site. */
	readonly observationCount: number;
	/** Whether the site has a ready map package. */
	readonly hasPackage: boolean;
};

export type DataPlan = {
	site: ProjectedSite;
	siteCode: string;
	siteName: string;
	/** The version of the package the plan is drawn from. */
	version: number;
};

export type DataScreenProps = {
	org: string;
	project: string;
	timeZone: string;
	rows: ObservationRow[];
	/** The list holds exactly 500 rows, so older observations may be missing. */
	limited: boolean;
	/** The site and round type the rows were loaded for. */
	scope: ServerScope;
	/** The browser-side filters in the address when the page loaded. */
	initialFilters: ClientFilters;
	sites: DataSite[];
	/** Each form version in the rows, as it was published. */
	definitions: Record<string, RawDefinition>;
	missingVersions: string[];
	plan: DataPlan | null;
	/** Why there is no plan, when a plan was expected. */
	planNote: string | null;
};

/** A marker's accessible name. Inventory points are zone centres, not places where play happened. */
function markerLabel(record: DataRecord): string {
	const base = `${record.label}, ${record.zoneLabel}, ${record.roundName}`;
	return record.round === "inventory" ? `${base}, zone inventory` : base;
}

/**
 * Observation data: the observations observers uploaded, in one table that the map, the count and the
 * export all follow. Site and round type load a different list from FieldMaps; zone, observer, days and
 * search narrow the list that loaded. The address always holds the view, so a copied link opens it again.
 */
export function DataScreen({
	org,
	project,
	timeZone,
	rows,
	limited,
	scope: loadedScope,
	initialFilters,
	sites,
	definitions,
	missingVersions,
	plan,
	planNote
}: DataScreenProps) {
	const router = useRouter();
	const { toast } = useToast();
	const [pending, startTransition] = useTransition();
	const [scope, setScope] = useOptimistic(loadedScope);
	const [filters, setFilters] = useState(initialFilters);
	const [selectedId, setSelectedId] = useState<string | null>(null);
	const [exportOpen, setExportOpen] = useState(false);
	const firstFilterRef = useRef<HTMLSelectElement>(null);
	const listRef = useRef<HTMLDivElement>(null);

	const clock = useMemo(() => makeClock(timeZone), [timeZone]);
	const records = useMemo(() => prepareRecords(rows, definitions, sites, clock), [rows, definitions, sites, clock]);
	const shown = useMemo(() => applyFilters(records, filters), [records, filters]);
	const options = useMemo(() => filterOptions(records, filters, sites), [records, filters, sites]);
	const selected = shown.find(record => record.id === selectedId) ?? null;

	const base = projectHref(org, project, "data");
	const hrefOf = (record: DataRecord) => `${base}/${record.id}`;
	const canClear = Boolean(scope.site || scope.round) || hasClientFilters(filters);
	const noneYet = records.length === 0 && !canClear;

	/* ── The address ───────────────────────────────────────────────────── */

	function writeAddress(nextScope: ServerScope, nextFilters: ClientFilters) {
		const { pathname, hash } = window.location;
		window.history.replaceState(null, "", `${pathname}${viewQuery({ ...nextScope, ...nextFilters })}${hash}`);
	}

	/** Loads a different list: the page is asked for again, and the old rows stay until the new ones arrive. */
	function loadScope(nextScope: ServerScope, nextFilters: ClientFilters) {
		startTransition(() => {
			setScope(nextScope);
			router.replace(`${base}${viewQuery({ ...nextScope, ...nextFilters })}`, { scroll: false });
		});
	}

	function changeScope(patch: Partial<ServerScope>) {
		loadScope({ ...scope, ...patch }, filters);
	}

	function changeFilters(patch: Partial<ClientFilters>) {
		const next = { ...filters, ...patch };
		setFilters(next);
		writeAddress(scope, next);
	}

	function clearAll() {
		setFilters(EMPTY_CLIENT_FILTERS);
		if (scope.site || scope.round) loadScope(EMPTY_SCOPE, EMPTY_CLIENT_FILTERS);
		else writeAddress(EMPTY_SCOPE, EMPTY_CLIENT_FILTERS);
		firstFilterRef.current?.focus();
	}

	async function copyLink() {
		try {
			await navigator.clipboard.writeText(window.location.href);
			toast({ title: "Link to this view copied", tone: "saved" });
		} catch {
			toast({
				title: "Couldn't copy the link",
				description: "Copy it from the address bar instead.",
				tone: "attention"
			});
		}
	}

	/* ── Selection ─────────────────────────────────────────────────────── */

	function selectRow(id: string) {
		setSelectedId(id);
	}

	function selectMarker(id: string) {
		setSelectedId(id);
		const nodes = listRef.current?.querySelectorAll<HTMLElement>(`[data-record-id="${id}"]`) ?? [];
		[...nodes].find(node => node.offsetParent !== null)?.scrollIntoView({ block: "nearest" });
	}

	/* ── The plan ──────────────────────────────────────────────────────── */

	const markers: PlanObservation[] = plan
		? shown
				.filter(record => record.siteCode === plan.siteCode)
				.map(record => ({
					id: record.id,
					lng: record.row.coordinates[0],
					lat: record.row.coordinates[1],
					label: markerLabel(record)
				}))
		: [];
	const zoneStyles: Record<string, ZonePlanStyle> | undefined =
		plan && filters.zone && filters.zone !== NO_ZONE_KEY
			? Object.fromEntries(
					plan.site.zones.map(zone => [
						zone.id,
						{ emphasis: (zone.code ?? zone.id) === filters.zone ? "focus" : "dim" } as ZonePlanStyle
					])
				)
			: undefined;
	const hasInventory = shown.some(record => record.round === "inventory" && record.siteCode === plan?.siteCode);

	/* ── What the list says about itself ───────────────────────────────── */

	const total = exactTotal(sites, scope);
	const totalSite = scope.site ? (sites.find(site => site.code === scope.site)?.name ?? "This site") : "The project";
	const count = pending
		? "Loading observations…"
		: `${formatCount(shown.length)} of ${formatCount(records.length)} shown`;

	const limitedBody =
		total === null
			? "Older observations may not be listed or exported here. Choose a site or round type to narrow the list."
			: total > records.length
				? `Older observations are not listed or exported here. ${totalSite} has ${plural(total, "observation")} in all. Choose a site or round type to narrow the list.`
				: `${totalSite} has ${plural(total, "observation")} in all.`;

	const emptyBody = !sites.length
		? "This project has no sites. Add a site and upload its map package, then observers can start collecting."
		: !sites.some(site => site.hasPackage)
			? "No site has a map package yet. Upload one, then observers can start collecting."
			: "Observers upload observations from the FieldMaps app. Observations still on their devices are not listed here.";

	const body = noneYet ? (
		<ScreenState
			kind="empty"
			icon="list"
			headingLevel={3}
			title="No observations yet"
			body={emptyBody}
			actions={
				!sites.length || !sites.some(site => site.hasPackage) ? (
					<ButtonLink variant="outline" href={projectHref(org, project, "sites")}>
						Open sites
					</ButtonLink>
				) : undefined
			}
		/>
	) : (
		<>
			<FilterBar
				scope={scope}
				filters={filters}
				sites={sites.map(site => ({ value: site.code, label: site.name }))}
				zones={options.zones}
				observers={options.observers}
				timeZone={clock.timeZone}
				onScopeChange={changeScope}
				onFiltersChange={changeFilters}
				onClear={clearAll}
				canClear={canClear}
				firstFilterRef={firstFilterRef}
			/>
			{limited && (
				<div className="px-island-pad pb-5">
					<Note tone="neutral" title="Based on the newest 500 observations.">
						{limitedBody}
					</Note>
				</div>
			)}
			{shown.length === 0 ? (
				<ScreenState
					kind="filtered"
					icon="funnel"
					headingLevel={3}
					className="border-t border-rule"
					title="No observations match this view"
					body="Change the filters to see more. No observations were removed."
					actions={
						<Button variant="ink" icon="x" onClick={clearAll}>
							Clear filters
						</Button>
					}
				/>
			) : (
				<div ref={listRef} className="border-t border-rule">
					<DataTable records={shown} hrefOf={hrefOf} selectedId={selectedId} onSelect={selectRow} />
				</div>
			)}
		</>
	);

	return (
		<div className="flex flex-col gap-6">
			<PageHeader
				title="Observation data"
				lead="Filter what observers have uploaded, then copy a link to the view or export it."
				actions={
					<>
						<Button variant="outline" icon="link" onClick={copyLink}>
							Copy link to this view
						</Button>
						<Button
							variant="primary"
							icon="download"
							disabled={shown.length === 0}
							disabledReason={
								shown.length === 0
									? noneYet
										? "There is nothing to export yet."
										: "No observations are in this view."
									: undefined
							}
							onClick={() => setExportOpen(true)}>
							Export
						</Button>
					</>
				}
			/>

			{missingVersions.length > 0 && (
				<Note tone="attention" title="Some questions could not be loaded.">
					Answers made with {missingVersions.join(", ")} are shown and exported under their question ids.
				</Note>
			)}
			{planNote && <Note tone="neutral">{planNote}</Note>}

			<div
				className={plan ? "grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,28rem)] xl:items-start" : undefined}>
				<Island
					flush
					divided={false}
					title="Observations"
					meta={noneYet ? undefined : <span role="status">{count}</span>}
					aria-busy={pending}>
					{body}
				</Island>

				{plan && (
					<Island title="Site plan" meta={`${plan.siteName} · Map v${plan.version}`}>
						<div className="flex flex-col gap-4">
							<MapFrame
								site={plan.site}
								surface="panel"
								mapVersion={`v${plan.version}`}
								title={plan.siteName}
								subtitle={`${plural(markers.length, "observation")} placed`}
								observations={markers}
								zones={zoneStyles}
								selectedId={selected?.id ?? null}
								onSelectObservation={selectMarker}
							/>
							<div aria-live="polite" className="type-body">
								{selected ? (
									<p>
										<span className="type-mono-data font-semibold">{selected.label}</span> ·{" "}
										{selected.zoneLabel} · {selected.roundName} · {selected.when}{" "}
										<TextLink tone="ink" href={hrefOf(selected)}>
											Open observation
										</TextLink>
									</p>
								) : (
									<p className="text-ink-2">
										Select a marker or a row to see which observation it is.
									</p>
								)}
							</div>
							<p className="type-small text-ink-2">
								Drawn on the site&apos;s current map.
								{hasInventory &&
									" Zone inventory observations sit at the centre of their zone. They do not show where play happened."}
							</p>
						</div>
					</Island>
				)}
			</div>

			<ExportObservations
				open={exportOpen}
				onOpenChange={setExportOpen}
				records={shown}
				definitions={definitions}
				missingVersions={missingVersions}
				limited={limited}
				projectCode={project}
				clock={clock}
			/>
		</div>
	);
}
