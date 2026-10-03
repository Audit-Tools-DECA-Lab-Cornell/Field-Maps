import type { ReactNode } from "react";

import { type StateKey, type StateKind, stateOf } from "@/lib/contour";
import { cx } from "@/lib/cx";

import { Icon, isIconName } from "./Icon";
import { TONE_TEXT } from "./tone";

export type StateBadgeProps<K extends StateKind> = {
	/** The state family in contracts/contour.json: queue, review, form, package, coverage, role… */
	kind: K;
	/** A key in that family. An unknown key throws, since Contour does not invent states. */
	state: StateKey<K> | (string & Record<never, never>);
	/** Replace the word while keeping the glyph and colour: "Waiting · sent Sep 30", "v3 downloaded". */
	label?: ReactNode;
	/** md sits beside 16 px text, sm beside 14 px text. */
	size?: "md" | "sm";
	className?: string;
};

/**
 * A state as Rule 02 draws it: the state's glyph, its word and its colour together, never the colour
 * alone. Ink-toned states (Published, the roles) are words in ink.
 */
export function StateBadge<K extends StateKind>({ kind, state, label, size = "md", className }: StateBadgeProps<K>) {
	const definition = stateOf(kind, state as StateKey<K>);

	// The glyph stays out of baseline alignment, so the badge lines up with neighbouring text by its word.
	return (
		<span
			className={cx(
				"inline-flex items-baseline gap-1.5 font-semibold",
				size === "sm" ? "text-sm" : "text-base",
				TONE_TEXT[definition.tone],
				className
			)}>
			{isIconName(definition.icon) && (
				<Icon
					name={definition.icon}
					size={16}
					className={cx("shrink-0 self-start", size === "sm" ? "mt-0.5" : "mt-1")}
				/>
			)}
			<span className="min-w-0">{label ?? definition.label}</span>
		</span>
	);
}
