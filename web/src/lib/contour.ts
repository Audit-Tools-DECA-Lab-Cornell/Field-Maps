import contract from "../../../contracts/contour.json";

/**
 * Contour, as data. The same contract the collector reads, so a state word, an icon or a duration
 * changes in one place. Colours reach components as Tailwind utilities generated from it; this module
 * is for what code needs as values: the state vocabulary and motion timings.
 */
export const CONTOUR = contract;

export type ThemeName = keyof typeof contract.themes;
export const THEMES = Object.keys(contract.themes) as ThemeName[];
export const DEFAULT_THEME = contract.default as ThemeName;

export type StateTone = "saved" | "waiting" | "uploaded" | "attention" | "held" | "ink" | "accent";

export type StateDefinition = {
	label: string;
	icon: string;
	tone: StateTone;
	meaning?: string;
	allows?: string;
};

type StateGroups = typeof contract.states;
export type StateKind = Exclude<keyof StateGroups, "$comment">;
export type StateKey<K extends StateKind> = keyof StateGroups[K] & string;

/** Every state is a glyph, a word and a colour (Rule 02). Look one up by kind and key. */
export function stateOf<K extends StateKind>(kind: K, key: StateKey<K>): StateDefinition {
	const group = contract.states[kind] as Record<string, StateDefinition>;
	const state = group[key];
	if (!state) throw new Error(`Unknown ${kind} state "${key}"`);
	return state;
}

export const MOTION = contract.motion.duration;
