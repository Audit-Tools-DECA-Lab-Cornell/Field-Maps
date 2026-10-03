import type { ReactNode } from "react";

import { cx } from "@/lib/cx";

import { Icon, type IconName } from "./Icon";
import { type Tone, TONE_SOFT, TONE_TEXT } from "./tone";

export type NoteTone = Tone | "neutral";

/** The glyph a note carries when the caller names none. */
export const NOTE_ICON: Record<NoteTone, IconName> = {
	saved: "check",
	waiting: "clock",
	uploaded: "upload",
	attention: "triangle-alert",
	held: "held",
	ink: "info",
	accent: "info",
	neutral: "info"
};

export type NoteProps = {
	/** The state the message is about. neutral is a plain well note for context ("The target is illustrative"). */
	tone?: NoteTone;
	icon?: IconName;
	/** A bold lead-in, run into the text: "**5 records are waiting on this device.** They upload…" */
	title?: ReactNode;
	children?: ReactNode;
	/**
	 * Announce changes to the note. The note must already be on screen when its words change; polite
	 * waits for a pause, assertive interrupts and is for errors only.
	 */
	live?: "polite" | "assertive";
	className?: string;
};

/** A message in a soft fill of its state's colour, with the state's glyph (system-05). */
export function Note({ tone = "neutral", icon, title, children, live, className }: NoteProps) {
	const neutral = tone === "neutral";
	const role = live === "assertive" ? "alert" : live === "polite" ? "status" : undefined;

	return (
		<div
			role={role}
			className={cx(
				"flex items-start gap-3 rounded-note px-4 py-3 type-body text-ink",
				neutral ? "bg-well" : TONE_SOFT[tone],
				className
			)}>
			<Icon
				name={icon ?? NOTE_ICON[tone]}
				size={18}
				className={cx("mt-0.75 shrink-0", neutral ? "text-ink-2" : TONE_TEXT[tone])}
			/>
			<div className="min-w-0 flex-1">
				{title != null && <strong className="font-semibold">{title}</strong>}
				{title != null && children != null && " "}
				{children}
			</div>
		</div>
	);
}
