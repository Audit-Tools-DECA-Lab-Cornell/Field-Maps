"use client";

import type { Ref } from "react";

import { Button } from "@/components/contour/Button";
import { Field } from "@/components/contour/Field";
import { Select } from "@/components/contour/Select";
import { TextInput } from "@/components/contour/TextInput";
import { ROUND_TYPES, roundName } from "@/lib/labels";
import type { RoundType } from "@/lib/workspace/types";

import type { ClientFilters, Option, ServerScope } from "./view";

export type FilterBarProps = {
	scope: ServerScope;
	filters: ClientFilters;
	sites: readonly Option[];
	zones: readonly Option[];
	observers: readonly Option[];
	timeZone: string;
	/** Site and round type decide which observations load, so changing them asks for the list again. */
	onScopeChange: (patch: Partial<ServerScope>) => void;
	onFiltersChange: (patch: Partial<ClientFilters>) => void;
	onClear: () => void;
	canClear: boolean;
	firstFilterRef?: Ref<HTMLSelectElement>;
};

/**
 * The filters above the table. Site and round type load a different list; zone, observer, days and the
 * search narrow the list that loaded. Every control is labelled, and the address follows each change.
 */
export function FilterBar({
	scope,
	filters,
	sites,
	zones,
	observers,
	timeZone,
	onScopeChange,
	onFiltersChange,
	onClear,
	canClear,
	firstFilterRef
}: FilterBarProps) {
	return (
		<div className="flex flex-col gap-4 px-island-pad pb-5">
			<div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
				<Field label="Site" htmlFor="data-site">
					<Select
						id="data-site"
						ref={firstFilterRef}
						value={scope.site ?? ""}
						onChange={event => onScopeChange({ site: event.target.value || null })}>
						<option value="">All sites</option>
						{sites.map(option => (
							<option key={option.value} value={option.value}>
								{option.label}
							</option>
						))}
					</Select>
				</Field>
				<Field label="Round type" htmlFor="data-round">
					<Select
						id="data-round"
						value={scope.round ?? ""}
						onChange={event => onScopeChange({ round: (event.target.value || null) as RoundType | null })}>
						<option value="">All round types</option>
						{ROUND_TYPES.map(type => (
							<option key={type} value={type}>
								{roundName(type)}
							</option>
						))}
					</Select>
				</Field>
				<Field label="Zone" htmlFor="data-zone">
					<Select
						id="data-zone"
						value={filters.zone ?? ""}
						onChange={event => onFiltersChange({ zone: event.target.value || null })}>
						<option value="">All zones</option>
						{zones.map(option => (
							<option key={option.value} value={option.value}>
								{option.label}
							</option>
						))}
					</Select>
				</Field>
				<Field label="Observer" htmlFor="data-observer">
					<Select
						id="data-observer"
						value={filters.observer ?? ""}
						onChange={event => onFiltersChange({ observer: event.target.value || null })}>
						<option value="">All observers</option>
						{observers.map(option => (
							<option key={option.value} value={option.value}>
								{option.label}
							</option>
						))}
					</Select>
				</Field>
				<Field label="From" htmlFor="data-from" hint={`Days are in ${timeZone}.`}>
					<TextInput
						id="data-from"
						type="date"
						value={filters.from ?? ""}
						max={filters.to ?? undefined}
						onChange={event => onFiltersChange({ from: event.target.value || null })}
					/>
				</Field>
				<Field label="To" htmlFor="data-to">
					<TextInput
						id="data-to"
						type="date"
						value={filters.to ?? ""}
						min={filters.from ?? undefined}
						onChange={event => onFiltersChange({ to: event.target.value || null })}
					/>
				</Field>
				<Field label="Search" htmlFor="data-search" className="sm:col-span-2">
					<TextInput
						id="data-search"
						type="search"
						leadingIcon="search"
						placeholder="Label, observer, zone or words in an answer"
						value={filters.q}
						onChange={event => onFiltersChange({ q: event.target.value })}
						data-shortcut-search=""
						aria-keyshortcuts="/"
						autoComplete="off"
						spellCheck={false}
					/>
				</Field>
			</div>
			<div className="flex flex-wrap items-center gap-x-4 gap-y-2">
				{canClear && (
					<Button variant="outline" size="sm" icon="x" onClick={onClear}>
						Clear filters
					</Button>
				)}
				<p className="type-small text-ink-2">
					Site and round type choose which observations load. The other filters narrow what loaded.
				</p>
			</div>
		</div>
	);
}
