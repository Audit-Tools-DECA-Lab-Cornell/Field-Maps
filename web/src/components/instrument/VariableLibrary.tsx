"use client";

import { useMemo, useState } from "react";

import { Chip, EmptyState, Input, LinkAction, OptionButton, Prose, SectionLabel } from "@/components/nocturne/chrome";
import { VARIABLES } from "@/data/instrument";
import { formatCount } from "@/lib/format";
import type { VariableScope } from "@/types/domain";

const SCOPES: readonly { readonly id: VariableScope; readonly label: string; readonly note: string }[] = [
	{ id: "event", label: "Event", note: "Answered once per play event" },
	{ id: "round", label: "Round", note: "Answered once a round, inherited by its events" },
	{ id: "zone", label: "Zone", note: "Answered once per zone, per round" },
	{ id: "observer", label: "Observer", note: "Carried from the signed-in observer" }
];

/**
 * The variable library: every row the workbooks supply, with the export column it writes to and
 * the open question still on it. Scope is shown because it decides how often a question is asked,
 * and an export column is shown because two variables sharing one is a bug a reader has to see.
 */
export function VariableLibrary() {
	const [query, setQuery] = useState("");
	const [scope, setScope] = useState<VariableScope | null>(null);
	const [onlyFlagged, setOnlyFlagged] = useState(false);
	const [onlyIncluded, setOnlyIncluded] = useState(false);

	const rows = useMemo(() => {
		const needle = query.trim().toLowerCase();
		return VARIABLES.filter(variable => {
			if (scope !== null && variable.scope !== scope) return false;
			if (onlyFlagged && variable.flag === undefined) return false;
			if (onlyIncluded && !variable.included) return false;
			if (needle === "") return true;
			return (
				variable.code.toLowerCase().includes(needle) ||
				variable.exportColumn.toLowerCase().includes(needle) ||
				variable.label.toLowerCase().includes(needle)
			);
		});
	}, [query, scope, onlyFlagged, onlyIncluded]);

	const collisions = useMemo(() => {
		const counts = new Map<string, number>();
		for (const variable of VARIABLES)
			if (variable.exportColumn !== "")
				counts.set(variable.exportColumn, (counts.get(variable.exportColumn) ?? 0) + 1);
		return new Set([...counts].filter(([, count]) => count > 1).map(([column]) => column));
	}, []);

	const filtering = query !== "" || scope !== null || onlyFlagged || onlyIncluded;

	return (
		<section className="min-w-0">
			<div className="flex flex-wrap items-end justify-between gap-base">
				<div className="min-w-0">
					<SectionLabel>Variable library</SectionLabel>
					<h2 className="mt-tight text-heading text-text">
						{formatCount(VARIABLES.length)} variables read from the workbooks
					</h2>
				</div>
				<div className="w-full max-w-xs">
					<label htmlFor="variable-search" className="mb-hair block text-micro text-neutral-500">
						Search codes, columns and labels
					</label>
					<Input
						id="variable-search"
						type="search"
						name="variable-search"
						autoComplete="off"
						spellCheck={false}
						placeholder="Play_Type, LooseParts, shade…"
						value={query}
						onChange={event => setQuery(event.target.value)}
					/>
				</div>
			</div>

			<div className="mt-base flex flex-wrap items-center gap-tight">
				{SCOPES.map(entry => (
					<OptionButton
						key={entry.id}
						label={entry.label}
						selected={scope === entry.id}
						count={VARIABLES.filter(variable => variable.scope === entry.id).length}
						onClick={() => setScope(scope === entry.id ? null : entry.id)}
					/>
				))}
				<OptionButton
					label="In the draft"
					selected={onlyIncluded}
					count={VARIABLES.filter(variable => variable.included).length}
					onClick={() => setOnlyIncluded(!onlyIncluded)}
				/>
				<OptionButton
					label="⚠ Open question"
					selected={onlyFlagged}
					count={VARIABLES.filter(variable => variable.flag !== undefined).length}
					onClick={() => setOnlyFlagged(!onlyFlagged)}
				/>
				{filtering && (
					<LinkAction
						muted
						onClick={() => {
							setQuery("");
							setScope(null);
							setOnlyFlagged(false);
							setOnlyIncluded(false);
						}}>
						Clear
					</LinkAction>
				)}
			</div>

			{rows.length === 0 ? (
				<EmptyState
					title="No variables match"
					body={query === "" ? "Clear a filter to widen the set." : `Nothing matches “${query}”.`}
				/>
			) : (
				<div className="mt-base overflow-x-auto">
					<table className="w-full min-w-[46rem] border-collapse text-caption">
						<caption className="sr-only">
							Variables in the library, with their export columns and scopes
						</caption>
						<thead>
							<tr className="border-b border-rule text-left text-micro text-neutral-500">
								<th scope="col" className="w-36 py-tight pr-base font-normal">
									Code
								</th>
								<th scope="col" className="w-44 py-tight pr-base font-normal">
									Export column
								</th>
								<th scope="col" className="py-tight pr-base font-normal">
									Label and format
								</th>
								<th scope="col" className="w-20 py-tight pr-base font-normal">
									Scope
								</th>
								<th scope="col" className="w-24 py-tight font-normal">
									Draft
								</th>
							</tr>
						</thead>
						<tbody>
							{rows.map(variable => (
								<tr key={variable.code} className="border-b border-rule-faint align-top">
									<td className="py-snug pr-base text-neutral-300" translate="no">
										{variable.code}
									</td>
									<td className="py-snug pr-base" translate="no">
										{variable.exportColumn === "" ? (
											<span className="text-attention-text">⚠ none supplied</span>
										) : (
											<span
												className={
													collisions.has(variable.exportColumn)
														? "text-attention-text"
														: "text-neutral-400"
												}>
												{collisions.has(variable.exportColumn) && <span aria-hidden>⚠ </span>}
												{variable.exportColumn}
											</span>
										)}
									</td>
									<td className="min-w-0 py-snug pr-base">
										<span className="block text-neutral-200">{variable.label}</span>
										<span className="block text-micro text-neutral-600">{variable.format}</span>
										{variable.flag !== undefined && (
											<span className="mt-hair block border-l-2 border-attention pl-snug text-micro text-attention-text">
												{variable.flag}
											</span>
										)}
									</td>
									<td className="py-snug pr-base text-micro text-neutral-500">{variable.scope}</td>
									<td className="py-snug">
										{variable.included ? (
											<Chip tone="accent" glyph="✓">
												Included
											</Chip>
										) : (
											<Chip tone="muted" glyph="—">
												Left out
											</Chip>
										)}
									</td>
								</tr>
							))}
						</tbody>
					</table>
				</div>
			)}

			<Prose tone="faint" className="mt-base">
				Showing {formatCount(rows.length)} of {formatCount(VARIABLES.length)}. Two variables that share one
				export column are marked ⚠ on both rows — a collision is invisible until the export is written, and by
				then the data is already ambiguous.
			</Prose>
		</section>
	);
}
