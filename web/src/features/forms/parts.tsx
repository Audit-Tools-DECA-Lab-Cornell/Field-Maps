import type { ReactNode } from "react";

import { Icon, isIconName } from "@/components/contour/Icon";
import { TONE_TEXT } from "@/components/contour/tone";
import { stateOf } from "@/lib/contour";
import { cx } from "@/lib/cx";

import { plural, type VersionState, type VersionView } from "./model";

/** A mono eyebrow over a value: QUESTIONS, ASSIGNED TO, IN USE. Typed in normal case, uppercase by style. */
export function Eyebrow({ children, className }: { children: ReactNode; className?: string }) {
	return <p className={cx("type-mono-label text-ink-2", className)}>{children}</p>;
}

/** The state word's qualifier: "2 changes", "protocol incomplete", "8 notes open". */
export function versionQualifier(
	version: Pick<VersionView, "state" | "protocolNotesOpen">,
	changes: number,
	style: "chip" | "row"
): string | undefined {
	if (version.state !== "draft") return undefined;
	if (version.protocolNotesOpen > 0)
		return style === "chip" ? "protocol incomplete" : `${version.protocolNotesOpen} notes open`;
	return changes > 0 ? plural(changes, "change") : undefined;
}

/** The state glyph and word for a form version, with an optional qualifier after " · ". */
export function VersionStateText({
	state,
	qualifier,
	label,
	className
}: {
	state: VersionState;
	qualifier?: string;
	/** Replaces the word, keeping the glyph and colour: "Changed" beside a draft's question. */
	label?: string;
	className?: string;
}) {
	const definition = stateOf("form", state);
	return (
		<span className={cx("inline-flex items-baseline gap-1.5 font-semibold", TONE_TEXT[definition.tone], className)}>
			{isIconName(definition.icon) && (
				<Icon name={definition.icon} size={16} className="mt-1 shrink-0 self-start" />
			)}
			<span className="min-w-0">
				{label ?? definition.label}
				{qualifier ? ` · ${qualifier}` : ""}
			</span>
		</span>
	);
}

/**
 * A version as a pill (project-11): the state's glyph, the mono id in ink, then the state word and its
 * qualifier in the state's colour. "demo-v1 Published", "demo-v2 Draft · 2 changes".
 */
export function VersionChip({ id, state, qualifier }: { id: string; state: VersionState; qualifier?: string }) {
	const definition = stateOf("form", state);
	return (
		<span className="inline-flex min-h-control-sm items-center gap-2 rounded-pill border border-line bg-island px-3 py-1 type-body">
			{isIconName(definition.icon) && (
				<Icon name={definition.icon} size={16} className={cx("shrink-0", TONE_TEXT[definition.tone])} />
			)}
			<span className="type-mono-data text-ink">{id}</span>
			<span className={cx("font-semibold", TONE_TEXT[definition.tone])}>
				{definition.label}
				{qualifier ? ` · ${qualifier}` : ""}
			</span>
		</span>
	);
}

/** A protocol note flag: the waiting flag glyph before a title. */
export function FlagGlyph({ className }: { className?: string }) {
	return <Icon name="flag" size={18} className={cx("shrink-0 text-waiting", className)} />;
}
