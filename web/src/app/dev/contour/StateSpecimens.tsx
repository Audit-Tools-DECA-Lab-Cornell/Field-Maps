import { StateBadge } from "@/components/contour";
import { CONTOUR, type StateDefinition, type StateKind } from "@/lib/contour";

/** Section names from DESIGN.md §6. A kind the contract gains later shows under its key until named here. */
const KIND_TITLE: Partial<Record<StateKind, string>> = {
	queue: "Queue · always in this order",
	review: "Review",
	form: "Form version",
	package: "Map package",
	check: "Package check",
	coverage: "Coverage",
	readiness: "Readiness",
	project: "Project",
	invitation: "Invitation",
	connection: "Connection",
	proposal: "Proposal",
	role: "Role"
};

function stateKinds(): StateKind[] {
	return Object.keys(CONTOUR.states).filter(kind => kind !== "$comment") as StateKind[];
}

/**
 * Every state of every kind in contracts/contour.json, drawn through StateBadge: the glyph, the word and
 * the colour, with the key beside it. Nothing here is typed by hand, so a new state shows up on its own.
 */
export function StateSpecimens() {
	return (
		<div className="grid gap-x-10 gap-y-8 md:grid-cols-2 xl:grid-cols-3">
			{stateKinds().map(kind => {
				const states = Object.entries(CONTOUR.states[kind] as Record<string, StateDefinition>);
				return (
					<div key={kind} className="flex min-w-0 flex-col gap-3">
						<h3 className="type-mono-label text-ink-2">{KIND_TITLE[kind] ?? kind}</h3>
						<ul className="flex flex-col divide-y divide-rule">
							{states.map(([key, state]) => (
								<li
									key={key}
									className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 py-2">
									<StateBadge kind={kind} state={key} />
									<span className="type-mono-data text-ink-2">
										{kind}.{key}
									</span>
									{state.meaning && (
										<span className="basis-full type-small text-ink-2">{state.meaning}</span>
									)}
								</li>
							))}
						</ul>
					</div>
				);
			})}
		</div>
	);
}
