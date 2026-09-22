"use client";

import dynamic from "next/dynamic";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useMemo, useState } from "react";

import { Chip, EmptyState, LinkAction, PrimaryAction, SecondaryAction } from "@/components/nocturne/chrome";
import { OBSERVATIONS } from "@/data/observations";
import { applyFilters, describeFilters, EMPTY_FILTERS, type Filters, readFilters, writeFilters } from "@/lib/filters";
import { formatCount } from "@/lib/format";

import { ExportDialog } from "./ExportDialog";
import { FilterRail } from "./FilterRail";
import type { BaseName } from "./LeafletCanvas";
import { MapLegend } from "./MapLegend";
import { ObservationDetail } from "./ObservationDetail";
import { ObservationTable } from "./ObservationTable";

/**
 * Data review: one filter set, two coordinated views of it, and the record itself.
 *
 * The filters and the selected record live in the URL rather than in a store, so a filtered view
 * can be sent to a colleague, opened in a second tab, or come back to tomorrow — and so the back
 * button undoes a filter, which is what a reader expects it to do.
 */

// Leaflet touches `window` on import, so the canvas only ever renders in the browser.
const LeafletCanvas = dynamic(() => import("./LeafletCanvas"), {
	ssr: false,
	loading: () => <div className="size-full bg-map" />
});

export function ObservationsWorkspace() {
	const router = useRouter();
	const pathname = usePathname();
	const searchParams = useSearchParams();
	const [base, setBase] = useState<BaseName>("plan");
	const [exporting, setExporting] = useState(false);

	const filters = useMemo(() => readFilters(new URLSearchParams(searchParams.toString())), [searchParams]);
	const selectedId = searchParams.get("record");
	const records = useMemo(() => applyFilters(OBSERVATIONS, filters), [filters]);
	const selected = records.find(record => record.id === selectedId);

	// A new history entry, not a replacement: changing a filter or opening a record is something the
	// reader did, and Back has to undo it rather than leave the section.
	const push = useCallback(
		(next: Filters, record: string | null) => {
			const params = writeFilters(next, record);
			router.push(params.size === 0 ? pathname : `${pathname}?${params.toString()}`, { scroll: false });
		},
		[pathname, router]
	);

	const change = useCallback(
		<K extends keyof Filters>(key: K, value: Filters[K]) => {
			// A record that the new filter set no longer contains cannot stay selected.
			push({ ...filters, [key]: value }, null);
		},
		[filters, push]
	);

	const summary = describeFilters(filters);

	return (
		<>
			<div className="flex min-h-0 flex-1 flex-col xl:flex-row">
				<aside
					aria-label="Filters"
					className="max-h-[40vh] shrink-0 overflow-y-auto border-b border-edge bg-surface xl:max-h-none xl:w-[232px] xl:border-r xl:border-b-0">
					<FilterRail
						all={OBSERVATIONS}
						filters={filters}
						onChange={change}
						onClear={() => push(EMPTY_FILTERS, null)}
					/>
				</aside>

				<div className="flex min-h-0 min-w-0 flex-1 flex-col">
					<div className="flex shrink-0 flex-wrap items-center justify-between gap-snug border-b border-edge px-loose py-snug">
						<p className="min-w-0 text-detail text-neutral-400">
							Showing <span className="tnum text-text">{formatCount(records.length)}</span> of{" "}
							<span className="tnum">{formatCount(OBSERVATIONS.length)}</span> — {summary}
						</p>
						<div className="flex shrink-0 items-center gap-snug">
							<div className="flex items-center gap-hair rounded-md border border-rule p-[2px]">
								{(["plan", "streets"] as const).map(name => (
									<button
										key={name}
										type="button"
										onClick={() => setBase(name)}
										aria-pressed={base === name}
										className={`min-h-8 rounded-sm px-snug text-micro transition-colors duration-100 ${
											base === name
												? "bg-accent-800 text-accent-100"
												: "text-neutral-400 hover:bg-ink-tint"
										}`}>
										{name === "plan" ? "Plan" : "Streets"}
									</button>
								))}
							</div>
							<SecondaryAction onClick={() => setExporting(true)} className="min-h-9 px-base text-detail">
								Export…
							</SecondaryAction>
						</div>
					</div>

					<div className="relative min-h-[320px] flex-[3]">
						{records.length === 0 ? (
							<EmptyState
								title="No observations match"
								body={`Nothing in this site matches ${summary}. Clear a filter to widen the set — the map and the table always show the same records.`}
								action={
									<PrimaryAction onClick={() => push(EMPTY_FILTERS, null)}>
										Clear all filters
									</PrimaryAction>
								}
							/>
						) : (
							<>
								<LeafletCanvas
									records={records}
									selectedId={selectedId}
									onSelect={id => push(filters, id)}
									base={base}
								/>
								<div className="pointer-events-none absolute top-snug right-snug z-[600] max-w-[calc(100%-4rem)]">
									<MapLegend />
								</div>
								{base === "streets" && (
									<div className="pointer-events-none absolute bottom-snug left-snug z-[600]">
										<Chip tone="attention" glyph="⚠">
											Street tiles are fetched from the network
										</Chip>
									</div>
								)}
							</>
						)}
					</div>

					<div className="min-h-[180px] flex-[2] overflow-auto border-t border-edge">
						<ObservationTable
							records={records}
							selectedId={selectedId}
							onSelect={id => push(filters, id)}
						/>
					</div>
				</div>

				<aside
					aria-label="Observation detail"
					className="max-h-[50vh] shrink-0 overflow-y-auto border-t border-edge bg-surface xl:max-h-none xl:w-[372px] xl:border-t-0 xl:border-l">
					<ObservationDetail record={selected} />
					{selected !== undefined && (
						<div className="px-loose pb-loose">
							<LinkAction onClick={() => push(filters, null)} muted>
								Clear the selection
							</LinkAction>
						</div>
					)}
				</aside>
			</div>

			{exporting && <ExportDialog records={records} summary={summary} onClose={() => setExporting(false)} />}
		</>
	);
}
