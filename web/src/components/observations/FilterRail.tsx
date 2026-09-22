"use client";

import { Chip, FadeRule, LinkAction, OptionButton, Prose, SectionLabel } from "@/components/nocturne/chrome";
import { PLAY_TYPES, QUALITY_FLAGS } from "@/data/instrument";
import { ACTIVE_SITE } from "@/data/project";
import { activeCount, type Filters } from "@/lib/filters";
import { formatCount } from "@/lib/format";
import { RECORD_STATES } from "@/lib/states";
import type { Observation, RecordState } from "@/types/domain";

/**
 * One filter set, read by the map and the table alike. Counts are of the whole site, not of the
 * current selection, so a reader can see what widening a filter would bring back before they try it.
 */
export function FilterRail({
	all,
	filters,
	onChange,
	onClear
}: {
	readonly all: readonly Observation[];
	readonly filters: Filters;
	readonly onChange: <K extends keyof Filters>(key: K, value: Filters[K]) => void;
	readonly onClear: () => void;
}) {
	const count = (predicate: (record: Observation) => boolean) => all.filter(predicate).length;
	const active = activeCount(filters);

	return (
		<div
			className="grid grid-cols-2 gap-x-loose gap-y-base px-base py-base sm:grid-cols-3 xl:grid-cols-1"
			style={{ "--rule-fade": "16px" } as React.CSSProperties}>
			<div className="col-span-full flex items-center justify-between gap-snug">
				<SectionLabel>Filters</SectionLabel>
				{active > 0 && (
					<LinkAction onClick={onClear}>Clear {active === 1 ? "filter" : `all ${active}`}</LinkAction>
				)}
			</div>

			<Group label="Zone">
				{ACTIVE_SITE.zones.map(zone => (
					<OptionButton
						key={zone.id}
						label={zone.label}
						variant="quiet"
						selected={filters.zone === zone.id}
						count={count(record => record.zoneId === zone.id)}
						onClick={() => onChange("zone", filters.zone === zone.id ? null : zone.id)}
					/>
				))}
			</Group>

			<Group label="Round">
				{ACTIVE_SITE.rounds.map(round => (
					<OptionButton
						key={round}
						label={`Round ${round}`}
						variant="quiet"
						selected={filters.round === round}
						count={count(record => record.round === round)}
						onClick={() => onChange("round", filters.round === round ? null : round)}
					/>
				))}
			</Group>

			<Group label="Observer">
				{ACTIVE_SITE.observers.map(observer => (
					<OptionButton
						key={observer}
						label={observer}
						variant="quiet"
						selected={filters.observer === observer}
						count={count(record => record.observerCode === observer)}
						onClick={() => onChange("observer", filters.observer === observer ? null : observer)}
					/>
				))}
			</Group>

			<Group label="Play type">
				{PLAY_TYPES.map(type => (
					<OptionButton
						key={type}
						label={type}
						variant="quiet"
						selected={filters.type === type}
						count={count(record => record.playType === type)}
						onClick={() => onChange("type", filters.type === type ? null : type)}
					/>
				))}
			</Group>

			<Group label="Record state">
				{(Object.keys(RECORD_STATES) as RecordState[]).map(state => (
					<OptionButton
						key={state}
						label={`${RECORD_STATES[state].glyph} ${RECORD_STATES[state].label}`}
						variant="quiet"
						selected={filters.state === state}
						count={count(record => record.state === state)}
						onClick={() => onChange("state", filters.state === state ? null : state)}
					/>
				))}
			</Group>

			<FadeRule className="col-span-full" />

			<Group label="Data-quality flags">
				{QUALITY_FLAGS.map(flag => (
					<OptionButton
						key={flag.id}
						label={flag.label}
						variant="quiet"
						selected={filters.flag === flag.id}
						count={count(record => record.flagId === flag.id)}
						onClick={() => onChange("flag", filters.flag === flag.id ? null : flag.id)}
					/>
				))}
			</Group>

			<Prose tone="faint" className="col-span-full text-micro">
				Flags are computed checks, not judgements. Nothing is auto-corrected and no flagged record is hidden
				from an export.
			</Prose>

			<div className="col-span-full flex items-center gap-snug">
				<Chip tone="muted">{formatCount(all.length)} in this site</Chip>
			</div>
		</div>
	);
}

function Group({ label, children }: { readonly label: string; readonly children: React.ReactNode }) {
	return (
		<section>
			<h3 className="mb-tight text-micro font-normal text-neutral-500">{label}</h3>
			<div className="flex flex-col gap-hair">{children}</div>
		</section>
	);
}
