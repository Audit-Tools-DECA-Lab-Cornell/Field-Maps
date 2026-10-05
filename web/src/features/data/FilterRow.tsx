"use client";

import type { Ref } from "react";

import { Button } from "@/components/contour/Button";
import { Field } from "@/components/contour/Field";
import { Select } from "@/components/contour/Select";
import { StateBadge } from "@/components/contour/StateBadge";
import { TextInput } from "@/components/contour/TextInput";

import { type DataFilters, hasFilters } from "./filters";

type Option = { value: string; label: string };

export type FilterRowProps = {
	filters: DataFilters;
	options: { zones: Option[]; rounds: Option[]; types: Option[] };
	onChange: (patch: Partial<DataFilters>) => void;
	onClear: () => void;
	firstFilterRef?: Ref<HTMLSelectElement>;
};

/**
 * The one filter row (project-02): zone, round and play type, a search over IDs, observers and answers,
 * and Clear filters. A review filter set from the Overview shows on its own line, so nothing narrows the
 * records unseen.
 */
export function FilterRow({ filters, options, onChange, onClear, firstFilterRef }: FilterRowProps) {
	const anySet = hasFilters(filters);
	return (
		<div className="flex flex-col gap-3 px-island-pad pt-5 pb-5">
			<div className="grid items-end gap-4 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-[repeat(3,minmax(0,1fr))_minmax(0,1.7fr)_auto]">
				<Field label="Zone" htmlFor="data-filter-zone">
					<Select
						ref={firstFilterRef}
						value={filters.zone ?? ""}
						onChange={event => onChange({ zone: event.target.value || null })}>
						<option value="">All zones</option>
						{options.zones.map(option => (
							<option key={option.value} value={option.value}>
								{option.label}
							</option>
						))}
					</Select>
				</Field>
				<Field label="Round" htmlFor="data-filter-round">
					<Select
						value={filters.round === null ? "" : String(filters.round)}
						onChange={event => onChange({ round: event.target.value ? Number(event.target.value) : null })}>
						<option value="">All rounds</option>
						{options.rounds.map(option => (
							<option key={option.value} value={option.value}>
								{option.label}
							</option>
						))}
					</Select>
				</Field>
				<Field label="Play type" htmlFor="data-filter-type">
					<Select
						value={filters.type ?? ""}
						onChange={event => onChange({ type: event.target.value || null })}>
						<option value="">All types</option>
						{options.types.map(option => (
							<option key={option.value} value={option.value}>
								{option.label}
							</option>
						))}
					</Select>
				</Field>
				<Field label="Search records" htmlFor="data-filter-search">
					<TextInput
						type="search"
						leadingIcon="search"
						placeholder="ID, observer or words in an answer"
						value={filters.q}
						onChange={event => onChange({ q: event.target.value })}
						data-shortcut-search=""
						aria-keyshortcuts="/"
						autoComplete="off"
						spellCheck={false}
					/>
				</Field>
				<Button
					variant="ghost"
					disabled={!anySet}
					disabledReason="No filters are set."
					onClick={onClear}
					className="justify-self-start xl:justify-self-end">
					Clear filters
				</Button>
			</div>
			{filters.review && (
				<div className="flex flex-wrap items-center gap-x-3 gap-y-1 type-small text-ink-2">
					<span>Also filtered by review:</span>
					<StateBadge kind="review" state={filters.review} size="sm" />
					<Button variant="ghost" size="sm" icon="x" onClick={() => onChange({ review: null })}>
						Remove review filter
					</Button>
				</div>
			)}
		</div>
	);
}
