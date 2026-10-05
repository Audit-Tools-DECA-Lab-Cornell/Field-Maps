"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { Button, ButtonLink } from "@/components/contour/Button";
import { Dialog, DialogClose } from "@/components/contour/Dialog";
import { Icon } from "@/components/contour/Icon";
import { InnerPanel } from "@/components/contour/InnerPanel";
import { Island } from "@/components/contour/Island";
import { PageHeader } from "@/components/contour/PageHeader";
import { ScreenState } from "@/components/contour/ScreenState";
import { useToast } from "@/components/contour/Toast";
import { MapFrame } from "@/components/map/MapFrame";
import type { PlanObservation, ZonePlanStyle } from "@/components/map/SitePlan";
import { projectHref } from "@/features/shell/navigation";
import { usePreview } from "@/features/shell/PreviewProvider";
import { PreviewStateView } from "@/features/shell/PreviewStateView";
import { type Observation, observationsFor } from "@/fixtures";
import { MAP_PALETTES, useMapPalette } from "@/lib/map-palette";
import type { ProjectedSite } from "@/lib/plan";
import { isOverlayOpen, isTypingTarget } from "@/lib/shortcuts";

import { ExportDialog } from "./ExportDialog";
import { FilterRow } from "./FilterRow";
import {
	applyFilters,
	clearFilters,
	type DataFilters,
	filterOptions,
	plural,
	scopeParts,
	suggestedViewName
} from "./filters";
import { markerLabel, type MarkerPosition, zoneIdOf } from "./markers";
import { ObservationTable, type ObservationTableHandle } from "./ObservationTable";
import { REVIEW_VERB, reviewOf as reviewWith, reviewStore, useReviews } from "./review";
import { SaveViewDialog } from "./SaveViewDialog";
import { type ReviewAccess, SelectedRecord } from "./SelectedRecord";
import { useDataFilters, useMediaQuery } from "./useDataFilters";

export type DataScreenProps = {
	org: string;
	project: string;
	/** The site the observations sit on, projected for the map; null when the project has no site yet. */
	site: ProjectedSite | null;
	siteName: string;
	positions: Record<string, MarkerPosition>;
	/** The active map package version, "v3". */
	mapVersion: string;
	/** The export's file name without its extension. */
	fileStem: string;
};

type Decision = { record: Observation; previous: Observation["review"]; toastId: string };

const OFFLINE_REASON = "You are offline. Changes cannot be saved.";
const VIEWER_REASON = "Your role can read observations. A project manager approves or excludes them.";

/** Why the header actions are off in a previewed screen state, if they are. */
const STATE_REASON: Partial<Record<string, string>> = {
	loading: "Observations are still loading.",
	error: "The observations did not load. Try again first.",
	empty: "There are no observations to export or save yet.",
	"no-access": "Your role cannot open this data."
};

/**
 * Observation data (project-02): one filter set for the map, the table, the selected record and the export.
 * Selection is linked both ways between the map and the table, j / k / a / x review from the keyboard with
 * Undo, and every change is a session-only preview.
 */
export function DataScreen({ org, project, site, siteName, positions, mapVersion, fileStem }: DataScreenProps) {
	const router = useRouter();
	const { toast, dismiss } = useToast();
	const { screenState, setScreenState, offline, can } = usePreview();
	const [filters, setFilters] = useDataFilters();
	const reviews = useReviews();
	const [paletteName] = useMapPalette();
	const wide = useMediaQuery("(min-width: 1280px)");

	const records = useMemo(() => observationsFor(project), [project]);
	const shown = useMemo(() => applyFilters(records, filters, reviews.reviewOf), [records, filters, reviews.reviewOf]);
	const options = useMemo(() => filterOptions(records), [records]);
	const selected = shown.find(record => record.id === filters.record) ?? null;

	const [announcement, setAnnouncement] = useState("");
	const [panelOpen, setPanelOpen] = useState(false);
	const [saveOpen, setSaveOpen] = useState(false);
	const [exportOpen, setExportOpen] = useState(false);
	const tableRef = useRef<ObservationTableHandle>(null);
	const firstFilterRef = useRef<HTMLSelectElement>(null);
	const lastDecision = useRef<Decision | null>(null);

	const base = projectHref(org, project);
	const viewsHref = `${base}/reports/views`;
	const hrefOf = useCallback((id: string) => `${base}/data/${id}`, [base]);
	const access: ReviewAccess = offline
		? { allowed: false, reason: OFFLINE_REASON }
		: can("editProject")
			? { allowed: true }
			: { allowed: false, reason: VIEWER_REASON };

	// The latest values for handlers that outlive a render: the toast's Undo and the page keys.
	const latest = useRef({ filters, shown, selected });
	useEffect(() => {
		latest.current = { filters, shown, selected };
	});

	/* ── Filters and selection ─────────────────────────────────────────── */

	const updateFilters = useCallback(
		(patch: Partial<DataFilters>) => {
			const next = { ...latest.current.filters, ...patch };
			const nextShown = applyFilters(records, next, record => reviewWith(record, reviewStore.get()));
			const messages = [`${nextShown.length} of ${records.length} shown`];
			if (next.record && !nextShown.some(record => record.id === next.record)) {
				messages.push(`${next.record} is not in this view`);
				next.record = null;
			}
			setFilters(next);
			setAnnouncement(messages.join(". "));
		},
		[records, setFilters]
	);

	const clearAll = useCallback(() => {
		updateFilters(clearFilters(latest.current.filters));
		firstFilterRef.current?.focus();
	}, [updateFilters]);

	const select = useCallback(
		(id: string | null, via: "pointer" | "keyboard" | "map" = "keyboard") => {
			setFilters({ ...latest.current.filters, record: id });
			if (id && via !== "keyboard" && !window.matchMedia("(min-width: 1280px)").matches) setPanelOpen(true);
			if (id && via === "map") tableRef.current?.revealRow(id);
		},
		[setFilters]
	);

	// The first visit selects the first record in view, as the design opens; Esc clears it after that.
	const initialised = useRef(false);
	useEffect(() => {
		if (initialised.current) return;
		initialised.current = true;
		if (filters.record) return;
		const first = applyFilters(records, filters, record => reviewWith(record, reviewStore.get()))[0];
		if (first) setFilters({ ...filters, record: first.id });
	}, [filters, records, setFilters]);

	/* ── Review decisions ──────────────────────────────────────────────── */

	const undo = useCallback(() => {
		const last = lastDecision.current;
		if (!last) return;
		lastDecision.current = null;
		dismiss(last.toastId);
		reviews.setReview(last.record, last.previous);
		setFilters({ ...latest.current.filters, record: last.record.id });
		setAnnouncement(`${last.record.id} decision undone`);
	}, [dismiss, reviews, setFilters]);

	const decide = useCallback(
		(next: "approved" | "excluded", record: Observation | null = latest.current.selected) => {
			if (!record || !access.allowed) return;
			if (reviews.reviewOf(record) === next) return;
			const hadRowFocus = tableRef.current?.hasRowFocus() ?? false;
			const previous = reviews.setReview(record, next);
			const verb = REVIEW_VERB[next];
			const toastId = toast({
				title: `${record.id} ${verb}`,
				action: { label: "Undo", onClick: undo, altText: "Undo with Command Z or Control Z" }
			});
			lastDecision.current = { record, previous, toastId };

			// Then on to the next record still waiting for review, in the order on screen.
			const current = latest.current;
			const after = (entry: Observation) =>
				entry.id === record.id ? next : reviewWith(entry, reviewStore.get());
			const nextShown = applyFilters(records, current.filters, after);
			const from = current.shown.findIndex(entry => entry.id === record.id);
			const ordered = [...current.shown.slice(from + 1), ...current.shown.slice(0, Math.max(from, 0))];
			const following = ordered.find(
				entry => after(entry) === "notReviewed" && nextShown.some(shownEntry => shownEntry.id === entry.id)
			);
			if (following) {
				setFilters({ ...current.filters, record: following.id });
				setAnnouncement(`${record.id} ${verb}. Next: ${following.id}`);
				requestAnimationFrame(() => {
					if (hadRowFocus) tableRef.current?.focusRow(following.id);
					else tableRef.current?.revealRow(following.id);
				});
			} else if (!nextShown.some(entry => entry.id === record.id)) {
				setFilters({ ...current.filters, record: null });
				setAnnouncement(`${record.id} ${verb}. ${record.id} is not in this view`);
			} else {
				setAnnouncement(`${record.id} ${verb}`);
			}
		},
		[access.allowed, records, reviews, setFilters, toast, undo]
	);

	/* ── Page keys: j / k, a / x, Esc, Enter, ⌘Z ──────────────────────── */

	useEffect(() => {
		function onKeyDown(event: KeyboardEvent) {
			if (event.defaultPrevented || event.isComposing) return;
			if (isTypingTarget(event.target) || isOverlayOpen()) return;
			const mod = event.metaKey || event.ctrlKey;
			if (mod && !event.altKey && !event.shiftKey && event.key.toLowerCase() === "z") {
				if (!lastDecision.current) return;
				event.preventDefault();
				undo();
				return;
			}
			if (mod || event.altKey) return;
			const { shown: rows, selected: current } = latest.current;
			const index = current ? rows.findIndex(entry => entry.id === current.id) : -1;
			const move = (step: number) => {
				if (rows.length === 0) return;
				const target =
					rows[
						index < 0
							? step > 0
								? 0
								: rows.length - 1
							: Math.min(Math.max(index + step, 0), rows.length - 1)
					];
				if (!target) return;
				event.preventDefault();
				const hadFocus = tableRef.current?.hasRowFocus() ?? false;
				select(target.id, "keyboard");
				requestAnimationFrame(() => {
					if (hadFocus) tableRef.current?.focusRow(target.id);
					else tableRef.current?.revealRow(target.id);
				});
			};
			switch (event.key) {
				case "j":
					move(1);
					break;
				case "k":
					move(-1);
					break;
				case "a":
					if (!current) return;
					event.preventDefault();
					decide("approved");
					break;
				case "x":
					if (!current) return;
					event.preventDefault();
					decide("excluded");
					break;
				case "Escape":
					if (!current) return;
					select(null);
					setAnnouncement("Selection cleared");
					break;
				case "Enter":
					if (!current || event.target !== document.body) return;
					event.preventDefault();
					router.push(hrefOf(current.id));
					break;
				default:
			}
		}
		window.addEventListener("keydown", onKeyDown);
		return () => window.removeEventListener("keydown", onKeyDown);
	}, [decide, hrefOf, router, select, undo]);

	/* ── What the screen shows ─────────────────────────────────────────── */

	const scope = `${shown.length} ${plural(shown.length, "observation")} · ${scopeParts(records, filters).join(" · ")}`;
	const markers: PlanObservation[] = shown.flatMap(record => {
		const position = positions[record.id];
		return position ? [{ id: record.id, ...position, label: markerLabel(record) }] : [];
	});
	const focusZone = filters.zone && site ? zoneIdOf(records[0]?.siteSlug ?? "", filters.zone) : undefined;
	const zoneStyles: Record<string, ZonePlanStyle> | undefined =
		site && focusZone
			? Object.fromEntries(site.zones.map(zone => [zone.id, zone.id === focusZone ? {} : { emphasis: "dim" }]))
			: undefined;

	const live = screenState === "normal" || screenState === "offline";
	const headerReason = live ? undefined : STATE_REASON[screenState];
	const saveReason = headerReason ?? (offline ? OFFLINE_REASON : undefined);
	const noRecords = records.length === 0;

	const selectedPanel = selected ? (
		<SelectedRecord
			record={selected}
			review={reviews.reviewOf(selected)}
			siteName={siteName}
			access={access}
			onDecide={next => decide(next, selected)}
			detailHref={hrefOf(selected.id)}
		/>
	) : (
		<div className="flex items-start gap-3 p-5 type-body text-ink-2">
			<Icon name="crosshair" size={18} className="mt-0.75 shrink-0" />
			<p>Select an observation on the map or in the table to see its answers and review it.</p>
		</div>
	);

	const results =
		shown.length === 0 ? (
			<ScreenState
				kind="filtered"
				headingLevel={2}
				className="border-t border-rule"
				actions={
					<>
						<Button variant="ink" icon="x" onClick={clearAll}>
							Clear filters
						</Button>
						<ButtonLink variant="outline" href={viewsHref}>
							Open saved views
						</ButtonLink>
					</>
				}
			/>
		) : (
			<div className="grid gap-5 px-island-pad pb-island-pad xl:grid-cols-[minmax(0,46fr)_minmax(0,54fr)] xl:items-start">
				<div className="flex min-w-0 flex-col gap-5">
					{site && (
						<MapFrame
							site={site}
							surface="panel"
							mapVersion={mapVersion}
							title={`${markers.length} of ${records.length} shown`}
							subtitle={
								selected
									? `Selected: ${selected.id}`
									: `${siteName} · ${MAP_PALETTES[paletteName].label} plan`
							}
							observations={markers}
							zones={zoneStyles}
							selectedId={selected?.id ?? null}
							onSelectObservation={id => select(id, "map")}
						/>
					)}
					<InnerPanel flush className="hidden xl:block">
						{selectedPanel}
					</InnerPanel>
				</div>
				<InnerPanel flush className="overflow-hidden">
					<ObservationTable
						handleRef={tableRef}
						records={shown}
						reviewOf={reviews.reviewOf}
						selectedId={selected?.id ?? null}
						onSelect={(id, via) => select(id, via)}
						onOpen={id => router.push(hrefOf(id))}
						hrefOf={hrefOf}
						sort={filters.sort}
						onSortChange={sort => updateFilters({ sort })}
					/>
				</InnerPanel>
			</div>
		);

	return (
		<div className="flex flex-col gap-6">
			<PageHeader
				title="Observation data"
				lead="One filter set for the map, table and export."
				actions={
					<div className="flex flex-col items-start gap-2 md:items-end">
						<div className="flex flex-wrap items-center gap-3">
							<Button
								variant="outline"
								icon="plus"
								disabled={Boolean(saveReason)}
								aria-describedby={saveReason ? "data-header-reason" : undefined}
								onClick={() => setSaveOpen(true)}>
								Save view
							</Button>
							<Button
								icon="download"
								disabled={Boolean(headerReason)}
								aria-describedby={headerReason ? "data-header-reason" : undefined}
								onClick={() => setExportOpen(true)}>
								Export
							</Button>
						</div>
						{saveReason && (
							<p id="data-header-reason" className="type-small text-ink-2">
								{saveReason}
							</p>
						)}
					</div>
				}
			/>

			<p role="status" className="sr-only">
				{announcement}
			</p>

			<Island
				flush
				divided={false}
				aria-label="Observations"
				footnote={
					live && !noRecords && shown.length > 0
						? `${shown.length} matching ${plural(shown.length, "observation")} · ${markers.length} ${plural(markers.length, "marker")} shown · records still on devices are not included.`
						: undefined
				}>
				<PreviewStateView
					loadingLabel="Loading observations…"
					rows={6}
					headingLevel={2}
					empty={{
						icon: "list",
						title: "No observations yet",
						body: "Observations appear here once observers upload them from the app. Records still on devices are not included."
					}}
					filtered={{
						actions: (
							<>
								<Button
									variant="ink"
									icon="x"
									onClick={() => {
										setScreenState("normal");
										clearAll();
									}}>
									Clear filters
								</Button>
								<ButtonLink variant="outline" href={viewsHref}>
									Open saved views
								</ButtonLink>
							</>
						)
					}}>
					{noRecords ? (
						<ScreenState
							kind="empty"
							icon="list"
							headingLevel={2}
							title="No observations yet"
							body="Observations appear here once observers upload them from the app. Records still on devices are not included."
						/>
					) : (
						<>
							<FilterRow
								filters={filters}
								options={options}
								onChange={updateFilters}
								onClear={clearAll}
								firstFilterRef={firstFilterRef}
							/>
							{results}
						</>
					)}
				</PreviewStateView>
			</Island>

			<Dialog
				open={!wide && panelOpen && selected !== null}
				onOpenChange={setPanelOpen}
				title={selected ? `${selected.playTypeLabel} play` : "Selected observation"}
				footer={
					<DialogClose asChild>
						<Button variant="outline">Close</Button>
					</DialogClose>
				}>
				{selected && (
					<SelectedRecord
						inDialog
						record={selected}
						review={reviews.reviewOf(selected)}
						siteName={siteName}
						access={access}
						onDecide={next => decide(next, selected)}
						detailHref={hrefOf(selected.id)}
					/>
				)}
			</Dialog>

			<SaveViewDialog
				open={saveOpen}
				onOpenChange={setSaveOpen}
				filters={filters}
				suggestedName={suggestedViewName(records, filters)}
				scope={scope}
				viewsHref={viewsHref}
			/>
			<ExportDialog
				open={exportOpen}
				onOpenChange={setExportOpen}
				records={shown}
				positions={positions}
				scope={scope}
				fileStem={fileStem}
			/>
		</div>
	);
}
